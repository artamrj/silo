import fs, { promises as fsAsync } from "fs";
import path from "path";
import { Cron } from "croner";
import { Settings } from "./settings";
import { Stack } from "./stack";
import type { SiloServer } from "./silo-server";
import { log } from "./log";

export type NotificationProvider = "ntfy" | "gotify" | "telegram" | "discord" | "webhook";

export interface NotificationTarget {
    provider: NotificationProvider;
    url?: string;
    token?: string;
    chatId?: string;
    enabled?: boolean;
}

export interface MaintenanceSettings {
    updateSchedule?: string;
    maintenanceWindow?: {
        enabled: boolean;
        start: string;
        end: string;
    };
    notifications?: NotificationTarget[];
    backup?: {
        beforeUpdate?: string;
        afterUpdate?: string;
        beforeRestore?: string;
        afterRestore?: string;
    };
}

export interface StackMetadata {
    tags: Array<{ name: string; value?: string }>;
    template?: string;
    lastUpdateCheck?: string;
    updatesAvailable?: string[];
}

export interface TemplateCatalogItem {
    id: string;
    name: string;
    description: string;
    tags: string[];
    composeYAML: string;
    composeENV: string;
}

const DEFAULT_MAINTENANCE: MaintenanceSettings = {
    maintenanceWindow: {
        enabled: false,
        start: "02:00",
        end: "04:00",
    },
    notifications: [],
    backup: {},
};

export class MaintenanceManager {
    private server: SiloServer;
    private updateJob?: Cron;

    constructor(server: SiloServer) {
        this.server = server;
    }

    async start() {
        await this.reloadSchedule();
    }

    async reloadSchedule() {
        this.updateJob?.stop();
        this.updateJob = undefined;
        const settings = await this.getSettings();
        if (!settings.updateSchedule) {
            return;
        }
        this.updateJob = new Cron(settings.updateSchedule, { protect: true }, async () => {
            try {
                if (!this.isInsideMaintenanceWindow(settings)) {
                    log.info("maintenance", "Skipped scheduled update outside maintenance window");
                    return;
                }
                const stackList = await Stack.getStackList(this.server);
                for (const stack of stackList.values()) {
                    if (stack.isManagedBySilo) {
                        await stack.checkImageUpdates();
                    }
                }
                this.server.sendStackList(true);
                await this.notify("Silo update scan complete", "Scheduled image update detection finished.");
            } catch (error) {
                log.error("maintenance", error);
                await this.notify("Silo update scan failed", error instanceof Error ? error.message : "Unknown error");
            }
        });
    }

    async getSettings(): Promise<MaintenanceSettings> {
        const raw = await Settings.get("maintenance");
        if (!raw) {
            return DEFAULT_MAINTENANCE;
        }
        return {
            ...DEFAULT_MAINTENANCE,
            ...JSON.parse(raw),
        };
    }

    async saveSettings(settings: MaintenanceSettings) {
        await Settings.set("maintenance", JSON.stringify(settings), "json");
        await this.reloadSchedule();
    }

    isInsideMaintenanceWindow(settings: MaintenanceSettings) {
        const window = settings.maintenanceWindow;
        if (!window?.enabled) {
            return true;
        }
        const minutes = (value: string) => {
            const [ hours, mins ] = value.split(":").map(Number);
            return hours * 60 + mins;
        };
        const now = new Date();
        const current = now.getHours() * 60 + now.getMinutes();
        const start = minutes(window.start);
        const end = minutes(window.end);
        return start <= end ? current >= start && current <= end : current >= start || current <= end;
    }

    async notify(title: string, message: string) {
        const settings = await this.getSettings();
        for (const target of settings.notifications ?? []) {
            if (target.enabled === false) {
                continue;
            }
            try {
                await this.sendNotification(target, title, message);
            } catch (error) {
                log.warn("notification", error instanceof Error ? error.message : String(error));
            }
        }
    }

    private async sendNotification(target: NotificationTarget, title: string, message: string) {
        if (target.provider === "telegram") {
            await fetch(`https://api.telegram.org/bot${target.token}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: target.chatId,
                    text: `*${title}*\n${message}`,
                    parse_mode: "Markdown" }),
            });
            return;
        }
        if (target.provider === "discord") {
            await fetch(target.url ?? "", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: `**${title}**\n${message}` }),
            });
            return;
        }
        if (target.provider === "gotify") {
            await fetch(`${target.url}/message?token=${target.token}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title,
                    message,
                    priority: 5 }),
            });
            return;
        }
        if (target.provider === "ntfy") {
            await fetch(target.url ?? "", {
                method: "POST",
                headers: { Title: title,
                    ...(target.token ? { Authorization: `Bearer ${target.token}` } : {}) },
                body: message,
            });
            return;
        }
        await fetch(target.url ?? "", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title,
                message }),
        });
    }

    async runBackupHook(name: keyof NonNullable<MaintenanceSettings["backup"]>, stack: Stack) {
        const settings = await this.getSettings();
        const command = settings.backup?.[name];
        if (!command) {
            return;
        }
        const { spawn } = await import("promisify-child-process");
        await spawn(command, [], { shell: true,
            cwd: stack.path,
            encoding: "utf-8" });
    }

    async exportStack(stackName: string) {
        const stack = await Stack.getStack(this.server, stackName);
        return {
            name: stack.name,
            ...stack.exportFiles(),
            metadata: await stack.getMetadata(),
        };
    }

    async templates(): Promise<TemplateCatalogItem[]> {
        const catalogPath = path.join(this.server.config.dataDir, "templates.json");
        if (fs.existsSync(catalogPath)) {
            return JSON.parse(await fsAsync.readFile(catalogPath, "utf-8"));
        }
        return [
            {
                id: "nginx",
                name: "Nginx",
                description: "Small web server starter stack.",
                tags: [ "web", "starter" ],
                composeYAML: "services:\n  nginx:\n    image: nginx:alpine\n    ports:\n      - \"8080:80\"\n",
                composeENV: "",
            },
        ];
    }
}
