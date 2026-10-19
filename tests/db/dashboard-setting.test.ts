import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_DASHBOARD, mergeDashboard } from "../../src/shared/dashboard";

let dir : string;

beforeEach(() => {
    vi.resetModules();
    dir = mkdtempSync(join(tmpdir(), "silo-dashboard-"));
    process.env.SILO_DATA_DIR = dir;
});

afterEach(async () => {
    const { Database } = await import("../../src/server/database");
    try {
        Database.close();
    } catch {
        // already closed
    }
    delete process.env.SILO_DATA_DIR;
    rmSync(dir, { recursive: true,
        force: true });
});

describe("dashboard setting", () => {
    it("round-trips a dashboard config through the settings store", async () => {
        const { Settings } = await import("../../src/server/settings");
        const { Database } = await import("../../src/server/database");
        Database.connect(dir);

        const config = {
            layout: {
                lg: [{ id: "vitals",
                    type: "vitals" as const,
                    x: 0,
                    y: 0,
                    w: 12,
                    h: 2 }],
                md: [],
                sm: [],
            },
            shortcuts: [{ id: "p",
                name: "Portainer",
                url: "https://portainer.lan" }],
        };

        await Settings.set("dashboard", config, "dashboard");
        const stored = await Settings.get("dashboard");

        expect(stored).toEqual(config);
        expect(stored?.shortcuts[0].name).toBe("Portainer");
    });

    it("returns undefined when nothing has been stored yet", async () => {
        const { Settings } = await import("../../src/server/settings");
        const { Database } = await import("../../src/server/database");
        Database.connect(dir);

        expect(await Settings.get("dashboard")).toBeUndefined();

        // The handler relies on this: an absent row normalizes to the defaults.
        expect(mergeDashboard(await Settings.get("dashboard")).layout.lg)
            .toEqual(DEFAULT_DASHBOARD.layout.lg);
    });

    it("survives a corrupt row without throwing", async () => {
        const { Settings } = await import("../../src/server/settings");
        const { Database } = await import("../../src/server/database");
        const { setSetting } = await import("../../src/server/db/repositories/settings");
        Database.connect(dir);

        // Simulate a hand-edited/garbled row: valid JSON, wrong shape.
        setSetting(Database.getDb(), "dashboard", JSON.stringify({ layout: "nope" }), "dashboard");

        const merged = mergeDashboard(await Settings.get("dashboard"));
        expect(merged.layout.lg).toEqual(DEFAULT_DASHBOARD.layout.lg);
        expect(merged.shortcuts).toEqual([]);
    });
});
