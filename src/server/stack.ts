import { SiloServer } from "./silo-server";
import fs, { promises as fsAsync } from "fs";
import { log } from "./log";
import yaml from "yaml";
import { SiloSocket, fileExists, ValidationError } from "./utils/socket";
import path from "path";
import {
    acceptedComposeFileNames,
    COMBINED_TERMINAL_COLS,
    COMBINED_TERMINAL_ROWS,
    CREATED_FILE,
    CREATED_STACK,
    EXITED, getCombinedTerminalName,
    getComposeTerminalName, getContainerExecTerminalName,
    PROGRESS_TERMINAL_ROWS,
    RUNNING, TERMINAL_ROWS,
    UNKNOWN
} from "../shared/utils";
import { InteractiveTerminal, Terminal } from "./terminal";
import * as childProcessAsync from "promisify-child-process";
import { Settings } from "./settings";

export class Stack {

    name: string;
    protected _status: number = UNKNOWN;
    protected _composeYAML?: string;
    protected _composeENV?: string;
    protected _configFilePath?: string;
    protected _composeFileName: string = "compose.yaml";
    protected server: SiloServer;

    protected combinedTerminal? : Terminal;

    protected static managedStackList: Map<string, Stack> = new Map();
    protected static deploymentLocks: Set<string> = new Set();

    constructor(server : SiloServer, name : string, composeYAML? : string, composeENV? : string, skipFSOperations = false) {
        this.name = name;
        this.server = server;
        this._composeYAML = composeYAML;
        this._composeENV = composeENV;

        if (!skipFSOperations) {
            // Check if compose file name is different from compose.yaml
            for (const filename of acceptedComposeFileNames) {
                if (fs.existsSync(path.join(this.path, filename))) {
                    this._composeFileName = filename;
                    break;
                }
            }
        }
    }

    async toJSON(endpoint : string) : Promise<object> {

        // Use the configured primary hostname when one is available.
        let primaryHostname = await Settings.get("primaryHostname");
        if (!primaryHostname) {
            if (!endpoint) {
                primaryHostname = "localhost";
            } else {
                // Use the endpoint as the primary hostname
                try {
                    primaryHostname = (new URL("https://" + endpoint).hostname);
                } catch (e) {
                    // Just in case if the endpoint is in a incorrect format
                    primaryHostname = "localhost";
                }
            }
        }

        let obj = this.toSimpleJSON(endpoint);
        return {
            ...obj,
            composeYAML: this.composeYAML,
            composeENV: this.composeENV,
            primaryHostname,
        };
    }

    toSimpleJSON(endpoint : string) : object {
        return {
            name: this.name,
            status: this._status,
            tags: [],
            isManagedBySilo: this.isManagedBySilo,
            composeFileName: this._composeFileName,
            endpoint,
        };
    }

    /**
     * Get the status of the stack from `docker compose ps --format json`
     */
    async ps() : Promise<object> {
        let res = await childProcessAsync.spawn("docker", this.getComposeOptions("ps", "--format", "json"), {
            cwd: this.path,
            encoding: "utf-8",
        });
        if (!res.stdout) {
            return {};
        }
        return JSON.parse(res.stdout.toString());
    }

    get isManagedBySilo() : boolean {
        return fs.existsSync(this.path) && fs.statSync(this.path).isDirectory();
    }

    get status() : number {
        return this._status;
    }

    validate() {
        // Check name, allows [a-z][0-9] _ - only
        if (!this.name.match(/^[a-z0-9_-]+$/)) {
            throw new ValidationError("Stack name can only contain [a-z][0-9] _ - only");
        }

        this.validateComposeSecurity();

        let lines = this.composeENV.split("\n");

        // Check if the .env is able to pass docker-compose
        // Prevent "setenv: The parameter is incorrect"
        // It only happens when there is one line and it doesn't contain "="
        if (lines.length === 1 && !lines[0].includes("=") && lines[0].length > 0) {
            throw new ValidationError("Invalid .env format");
        }
    }

    validateComposeSecurity() {
        let doc;
        try {
            doc = yaml.parse(this.composeYAML);
        } catch (e) {
            throw new ValidationError(e instanceof Error ? `Invalid compose YAML: ${e.message}` : "Invalid compose YAML");
        }

        if (!doc || typeof doc !== "object" || !doc.services || typeof doc.services !== "object") {
            throw new ValidationError("Compose file must define services");
        }

        const dangerousCaps = new Set([ "ALL", "SYS_ADMIN", "NET_ADMIN", "SYS_MODULE", "SYS_PTRACE", "DAC_READ_SEARCH", "DAC_OVERRIDE" ]);
        for (const [ serviceName, service ] of Object.entries(doc.services as Record<string, Record<string, unknown>>)) {
            if (!service || typeof service !== "object") {
                continue;
            }
            if (service.privileged === true) {
                throw new ValidationError(`Service ${serviceName} enables privileged mode`);
            }
            for (const field of [ "network_mode", "pid", "ipc" ]) {
                if (service[field] === "host") {
                    throw new ValidationError(`Service ${serviceName} uses host ${field.replace("_mode", " networking")}`);
                }
            }
            const capAdd = Array.isArray(service.cap_add) ? service.cap_add : service.cap_add ? [ service.cap_add ] : [];
            for (const cap of capAdd) {
                if (dangerousCaps.has(String(cap).toUpperCase())) {
                    throw new ValidationError(`Service ${serviceName} adds dangerous capability ${cap}`);
                }
            }
            const volumes = Array.isArray(service.volumes) ? service.volumes : [];
            for (const volume of volumes) {
                const source = typeof volume === "string" ? volume.split(":")[0] : volume?.source;
                if (source === "/var/run/docker.sock" || source === "/run/docker.sock") {
                    throw new ValidationError(`Service ${serviceName} mounts the Docker socket`);
                }
            }
            const ports = Array.isArray(service.ports) ? service.ports : [];
            const image = String(service.image ?? "").toLowerCase();
            if (/(postgres|mysql|mariadb|mongo|redis|clickhouse|couchdb|influxdb)/.test(image)) {
                for (const port of ports) {
                    const published = typeof port === "string" ? port : port?.published;
                    if (published) {
                        throw new ValidationError(`Database service ${serviceName} exposes host port ${published}`);
                    }
                }
            }
        }
    }

    get composeYAML() : string {
        if (this._composeYAML === undefined) {
            try {
                this._composeYAML = fs.readFileSync(path.join(this.path, this._composeFileName), "utf-8");
            } catch (e) {
                this._composeYAML = "";
            }
        }
        return this._composeYAML;
    }

    get composeENV() : string {
        if (this._composeENV === undefined) {
            try {
                this._composeENV = fs.readFileSync(path.join(this.path, ".env"), "utf-8");
            } catch (e) {
                this._composeENV = "";
            }
        }
        return this._composeENV;
    }

    get path() : string {
        return path.join(this.server.stacksDir, this.name);
    }

    get fullPath() : string {
        let dir = this.path;

        // Compose up via node-pty
        let fullPathDir;

        // if dir is relative, make it absolute
        if (!path.isAbsolute(dir)) {
            fullPathDir = path.join(process.cwd(), dir);
        } else {
            fullPathDir = dir;
        }
        return fullPathDir;
    }

    /**
     * Save the stack to the disk
     * @param isAdd
     */
    async save(isAdd : boolean) {
        await this.withDeploymentLock("save", async () => {
            this.validate();

            let dir = this.path;
            let createdDir = false;

            // Check if the name is used if isAdd
            if (isAdd) {
                if (await fileExists(dir)) {
                    throw new ValidationError("Stack name already exists");
                }

                // Create the stack folder
                await fsAsync.mkdir(dir);
                createdDir = true;
            } else {
                if (!await fileExists(dir)) {
                    throw new ValidationError("Stack not found");
                }
            }

            try {
                // Write or overwrite the compose.yaml and .env before Docker validates interpolation.
                fs.writeFileSync(path.join(dir, this._composeFileName), this.composeYAML);
                fs.writeFileSync(path.join(dir, ".env"), this.composeENV);

                if (process.env.PUID && process.env.PGID) {
                    const uid = Number(process.env.PUID);
                    const gid = Number(process.env.PGID);
                    fs.lchownSync(dir, uid, gid);
                    fs.chownSync(path.join(dir, this._composeFileName), uid, gid);
                    fs.chownSync(path.join(dir, ".env"), uid, gid);
                }

                await this.validateComposeConfig();
            } catch (e) {
                if (createdDir) {
                    await fsAsync.rm(dir, {
                        recursive: true,
                        force: true,
                    });
                }
                throw e;
            }
        });
    }

    async validateComposeConfig() {
        try {
            await childProcessAsync.spawn("docker", this.getComposeOptions("config"), {
                cwd: this.path,
                encoding: "utf-8",
            });
        } catch (e) {
            const processError = e as { stderr?: { toString: () => string }; stdout?: { toString: () => string } };
            const stderr = processError.stderr?.toString() ?? "";
            const stdout = processError.stdout?.toString() ?? "";
            throw new ValidationError(`docker compose config failed: ${stderr || stdout || (e instanceof Error ? e.message : "unknown error")}`.trim());
        }
    }

    emitDeploymentEvent(operation: string, status: string, message: string) {
        this.server.io.emit("deploymentEvent", {
            stackName: this.name,
            operation,
            status,
            message,
            at: new Date().toISOString(),
        });
    }

    async withDeploymentLock<T>(operation: string, fn: () => Promise<T>): Promise<T> {
        if (Stack.deploymentLocks.has(this.name)) {
            throw new ValidationError(`Stack ${this.name} already has an operation in progress`);
        }
        Stack.deploymentLocks.add(this.name);
        this.emitDeploymentEvent(operation, "started", `${operation} started`);
        try {
            const result = await fn();
            this.emitDeploymentEvent(operation, "completed", `${operation} completed`);
            return result;
        } catch (e) {
            this.emitDeploymentEvent(operation, "failed", e instanceof Error ? e.message : `${operation} failed`);
            throw e;
        } finally {
            Stack.deploymentLocks.delete(this.name);
        }
    }

    exportFiles() {
        return {
            composeFileName: this._composeFileName,
            composeYAML: this.composeYAML,
            composeENV: this.composeENV,
        };
    }

    async deploy(socket : SiloSocket) : Promise<number> {
        return this.withDeploymentLock("deploy", async () => {
            await this.validateComposeConfig();
            const terminalName = getComposeTerminalName("", this.name);
            let exitCode = await Terminal.exec(this.server, socket, terminalName, "docker", this.getComposeOptions("up", "-d", "--remove-orphans"), this.path);
            if (exitCode !== 0) {
                throw new Error("Failed to deploy, please check the terminal output for more information.");
            }
            return exitCode;
        });
    }

    async delete(socket: SiloSocket, deleteData = false) : Promise<number> {
        return this.withDeploymentLock("delete", async () => {
            const terminalName = getComposeTerminalName("", this.name);
            const downOptions = deleteData ? this.getComposeOptions("down", "--remove-orphans", "--volumes") : this.getComposeOptions("down", "--remove-orphans");
            let exitCode = await Terminal.exec(this.server, socket, terminalName, "docker", downOptions, this.path);
            if (exitCode !== 0) {
                throw new Error("Failed to delete, please check the terminal output for more information.");
            }

            // Remove the stack folder only after explicit confirmation.
            if (deleteData) {
                await fsAsync.rm(this.path, {
                    recursive: true,
                    force: true
                });
            }

            return exitCode;
        });
    }

    async updateStatus() {
        let statusList = await Stack.getStatusList();
        let status = statusList.get(this.name);

        if (status) {
            this._status = status;
        } else {
            this._status = UNKNOWN;
        }
    }

    /**
     * Checks if a compose file exists in the specified directory.
     * @async
     * @static
     * @param {string} stacksDir - The directory of the stack.
     * @param {string} filename - The name of the directory to check for the compose file.
     * @returns {Promise<boolean>} A promise that resolves to a boolean indicating whether any compose file exists.
     */
    static async composeFileExists(stacksDir : string, filename : string) : Promise<boolean> {
        let filenamePath = path.join(stacksDir, filename);
        // Check if any compose file exists
        for (const filename of acceptedComposeFileNames) {
            let composeFile = path.join(filenamePath, filename);
            if (await fileExists(composeFile)) {
                return true;
            }
        }
        return false;
    }

    static async getStackList(server : SiloServer, useCacheForManaged = false) : Promise<Map<string, Stack>> {
        let stacksDir = server.stacksDir;
        let stackList : Map<string, Stack>;

        // Use cached stack list?
        if (useCacheForManaged && this.managedStackList.size > 0) {
            stackList = this.managedStackList;
        } else {
            stackList = new Map<string, Stack>();

            // Scan the stacks directory, and get the stack list
            let filenameList = await fsAsync.readdir(stacksDir);

            for (let filename of filenameList) {
                try {
                    // Check if it is a directory
                    let stat = await fsAsync.stat(path.join(stacksDir, filename));
                    if (!stat.isDirectory()) {
                        continue;
                    }
                    // If no compose file exists, skip it
                    if (!await Stack.composeFileExists(stacksDir, filename)) {
                        continue;
                    }
                    let stack = await this.getStack(server, filename);
                    stack._status = CREATED_FILE;
                    stackList.set(filename, stack);
                } catch (e) {
                    if (e instanceof Error) {
                        log.warn("getStackList", `Failed to get stack ${filename}, error: ${e.message}`);
                    }
                }
            }

            // Cache by copying
            this.managedStackList = new Map(stackList);
        }

        // Get status from docker compose ls
        let res = await childProcessAsync.spawn("docker", [ "compose", "ls", "--all", "--format", "json" ], {
            encoding: "utf-8",
        });

        if (!res.stdout) {
            return stackList;
        }

        let composeList = JSON.parse(res.stdout.toString());

        for (let composeStack of composeList) {
            let stack = stackList.get(composeStack.Name);

            // This stack probably is not managed by Silo, but we still want to show it
            if (!stack) {
                // Skip the silo stack if it is not managed by Silo
                if (composeStack.Name === "silo") {
                    continue;
                }
                stack = new Stack(server, composeStack.Name);
                stackList.set(composeStack.Name, stack);
            }

            stack._status = this.statusConvert(composeStack.Status);
            stack._configFilePath = composeStack.ConfigFiles;
        }

        return stackList;
    }

    /**
     * Get the status list, it will be used to update the status of the stacks
     * Not all status will be returned, only the stack that is deployed or created to `docker compose` will be returned
     */
    static async getStatusList() : Promise<Map<string, number>> {
        let statusList = new Map<string, number>();

        let res = await childProcessAsync.spawn("docker", [ "compose", "ls", "--all", "--format", "json" ], {
            encoding: "utf-8",
        });

        if (!res.stdout) {
            return statusList;
        }

        let composeList = JSON.parse(res.stdout.toString());

        for (let composeStack of composeList) {
            statusList.set(composeStack.Name, this.statusConvert(composeStack.Status));
        }

        return statusList;
    }

    /**
     * Convert the status string from `docker compose ls` to the status number
     * Input Example: "exited(1), running(1)"
     * @param status
     */
    static statusConvert(status : string) : number {
        if (status.startsWith("created")) {
            return CREATED_STACK;
        } else if (status.includes("exited")) {
            // If one of the service is exited, we consider the stack is exited
            return EXITED;
        } else if (status.startsWith("running")) {
            // If there is no exited services, there should be only running services
            return RUNNING;
        } else {
            return UNKNOWN;
        }
    }

    static async getStack(server: SiloServer, stackName: string, skipFSOperations = false) : Promise<Stack> {
        let dir = path.join(server.stacksDir, stackName);

        if (!skipFSOperations) {
            if (!await fileExists(dir) || !(await fsAsync.stat(dir)).isDirectory()) {
                // Maybe it is a stack managed by docker compose directly
                let stackList = await this.getStackList(server, true);
                let stack = stackList.get(stackName);

                if (stack) {
                    return stack;
                } else {
                    // Really not found
                    throw new ValidationError("Stack not found");
                }
            }
        } else {
            //log.debug("getStack", "Skip FS operations");
        }

        let stack : Stack;

        if (!skipFSOperations) {
            stack = new Stack(server, stackName);
        } else {
            stack = new Stack(server, stackName, undefined, undefined, true);
        }

        stack._status = UNKNOWN;
        stack._configFilePath = path.resolve(dir);
        return stack;
    }

    getComposeOptions(command : string, ...extraOptions : string[]) {
        //--env-file ./../global.env --env-file .env
        let options = [ "compose", command, ...extraOptions ];
        if (fs.existsSync(path.join(this.server.stacksDir, "global.env"))) {
            if (fs.existsSync(path.join(this.path, ".env"))) {
                options.splice(1, 0, "--env-file", "./.env");
            }
            options.splice(1, 0, "--env-file", "../global.env");
        }
        return options;
    }

    async start(socket: SiloSocket) {
        const terminalName = getComposeTerminalName("", this.name);
        let exitCode = await Terminal.exec(this.server, socket, terminalName, "docker", this.getComposeOptions("up", "-d", "--remove-orphans"), this.path);
        if (exitCode !== 0) {
            throw new Error("Failed to start, please check the terminal output for more information.");
        }
        return exitCode;
    }

    async stop(socket: SiloSocket) : Promise<number> {
        const terminalName = getComposeTerminalName("", this.name);
        let exitCode = await Terminal.exec(this.server, socket, terminalName, "docker", this.getComposeOptions("stop"), this.path);
        if (exitCode !== 0) {
            throw new Error("Failed to stop, please check the terminal output for more information.");
        }
        return exitCode;
    }

    async restart(socket: SiloSocket) : Promise<number> {
        const terminalName = getComposeTerminalName("", this.name);
        let exitCode = await Terminal.exec(this.server, socket, terminalName, "docker", this.getComposeOptions("restart"), this.path);
        if (exitCode !== 0) {
            throw new Error("Failed to restart, please check the terminal output for more information.");
        }
        return exitCode;
    }

    async down(socket: SiloSocket) : Promise<number> {
        const terminalName = getComposeTerminalName("", this.name);
        let exitCode = await Terminal.exec(this.server, socket, terminalName, "docker", this.getComposeOptions("down"), this.path);
        if (exitCode !== 0) {
            throw new Error("Failed to down, please check the terminal output for more information.");
        }
        return exitCode;
    }

    async update(socket: SiloSocket) {
        const terminalName = getComposeTerminalName("", this.name);
        let exitCode = await Terminal.exec(this.server, socket, terminalName, "docker", this.getComposeOptions("pull"), this.path);
        if (exitCode !== 0) {
            throw new Error("Failed to pull, please check the terminal output for more information.");
        }

        // If the stack is not running, we don't need to restart it
        await this.updateStatus();
        log.debug("update", "Status: " + this.status);
        if (this.status !== RUNNING) {
            return exitCode;
        }

        exitCode = await Terminal.exec(this.server, socket, terminalName, "docker", this.getComposeOptions("up", "-d", "--remove-orphans"), this.path);
        if (exitCode !== 0) {
            throw new Error("Failed to restart, please check the terminal output for more information.");
        }
        return exitCode;
    }

    async joinCombinedTerminal(socket: SiloSocket) {
        const terminalName = getCombinedTerminalName("", this.name);
        const terminal = Terminal.getOrCreateTerminal(this.server, terminalName, "docker", this.getComposeOptions("logs", "-f", "--tail", "100"), this.path);
        terminal.enableKeepAlive = true;
        terminal.rows = COMBINED_TERMINAL_ROWS;
        terminal.cols = COMBINED_TERMINAL_COLS;
        terminal.join(socket);
        terminal.start();
    }

    async leaveCombinedTerminal(socket: SiloSocket) {
        const terminalName = getCombinedTerminalName("", this.name);
        const terminal = Terminal.getTerminal(terminalName);
        if (terminal) {
            terminal.leave(socket);
        }
    }

    async joinContainerTerminal(socket: SiloSocket, serviceName: string, shell : string = "sh", index: number = 0) {
        const terminalName = getContainerExecTerminalName("", this.name, serviceName, index);
        let terminal = Terminal.getTerminal(terminalName);

        if (!terminal) {
            terminal = new InteractiveTerminal(this.server, terminalName, "docker", this.getComposeOptions("exec", serviceName, shell), this.path);
            terminal.rows = TERMINAL_ROWS;
            log.debug("joinContainerTerminal", "Terminal created");
        }

        terminal.join(socket);
        terminal.start();
    }

    async getServiceStatusList() {
        let statusList = new Map<string, Array<object>>();

        try {
            let res = await childProcessAsync.spawn("docker", this.getComposeOptions("ps", "--format", "json"), {
                cwd: this.path,
                encoding: "utf-8",
            });

            if (!res.stdout) {
                return statusList;
            }

            let lines = res.stdout?.toString().split("\n");

            const addLine = (obj: { Service: string, State: string, Name: string, Health: string }) => {
                if (!statusList.has(obj.Service)) {
                    statusList.set(obj.Service, []);
                }
                statusList.get(obj.Service)?.push({
                    status: obj.Health || obj.State,
                    name: obj.Name
                });
            };

            for (let line of lines) {
                try {
                    let obj = JSON.parse(line);
                    if (obj instanceof Array) {
                        obj.forEach(addLine);
                    } else {
                        addLine(obj);
                    }
                } catch (e) {
                }
            }

            return statusList;
        } catch (e) {
            log.error("getServiceStatusList", e);
            return statusList;
        }
    }

    async startService(socket: SiloSocket, serviceName: string) {
        const terminalName = getComposeTerminalName("", this.name);
        const exitCode = await Terminal.exec(this.server, socket, terminalName, "docker", [ "compose", "up", "-d", serviceName ], this.path);
        if (exitCode !== 0) {
            throw new Error(`Failed to start service ${serviceName}, please check logs for more information.`);
        }

        return exitCode;
    }

    async stopService(socket: SiloSocket, serviceName: string): Promise<number> {
        const terminalName = getComposeTerminalName("", this.name);
        const exitCode = await Terminal.exec(this.server, socket, terminalName, "docker", [ "compose", "stop", serviceName ], this.path);
        if (exitCode !== 0) {
            throw new Error(`Failed to stop service ${serviceName}, please check logs for more information.`);
        }

        return exitCode;
    }

    async restartService(socket: SiloSocket, serviceName: string): Promise<number> {
        const terminalName = getComposeTerminalName("", this.name);
        const exitCode = await Terminal.exec(this.server, socket, terminalName, "docker", [ "compose", "restart", serviceName ], this.path);
        if (exitCode !== 0) {
            throw new Error(`Failed to restart service ${serviceName}, please check logs for more information.`);
        }

        return exitCode;
    }
}
