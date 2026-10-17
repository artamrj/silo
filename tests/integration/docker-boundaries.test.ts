import { describe, expect, it } from "vitest";
import {
    changePasswordSchema,
    composerizeSchema,
    dbConfigSchema,
    loginSchema,
    nonEmptyString,
    serviceActionSchema,
    serviceNameSchema,
    settingsSchema,
    setupSchema,
    stackDeleteSchema,
    stackNameSchema,
    stackSaveSchema,
    startupConfigSchema,
    terminalInputSchema,
    terminalResizeSchema,
    tokenSchema,
} from "../../src/shared/schemas";

describe("Docker operation boundaries", () => {
    it("accepts a bounded stack save request", () => {
        expect(stackSaveSchema.parse({
            name: "web-stack",
            composeYAML: "services:\n  web:\n    image: nginx",
            composeENV: "PORT=8080",
            isAdd: true,
        }).name).toBe("web-stack");
    });

    it.each([ "../escape", "/absolute", "bad name", "" ])("rejects unsafe stack name \"%s\"", (name) => {
        expect(() => stackNameSchema.parse(name)).toThrow();
    });

    it("bounds terminal input and dimensions", () => {
        expect(() => terminalInputSchema.parse({ terminalName: "console",
            command: "x".repeat(64_001) })).toThrow();
        expect(() => terminalResizeSchema.parse({ terminalName: "console",
            rows: 0,
            columns: 80 })).toThrow();
        expect(terminalResizeSchema.parse({ terminalName: "console",
            rows: 24,
            columns: 80 })).toMatchObject({ rows: 24,
            columns: 80 });
    });

    it("rejects service names that would escape the stack directory", () => {
        expect(() => serviceActionSchema.parse({ stackName: "web",
            serviceName: "../../etc" })).toThrow();
        expect(serviceActionSchema.parse({ stackName: "web",
            serviceName: "db-1" }).serviceName).toBe("db-1");
    });
});

describe("Auth request boundaries", () => {
    it("validates setup payloads", () => {
        expect(setupSchema.parse({ username: "admin",
            password: "s3cret-pw" }).username).toBe("admin");
        expect(() => setupSchema.parse({ username: "",
            password: "s3cret-pw" })).toThrow();
        expect(() => setupSchema.parse({ username: "admin",
            password: "x".repeat(1025) })).toThrow();
        expect(() => setupSchema.parse({ username: "admin" })).toThrow();
    });

    it("rejects login payloads with unknown keys", () => {
        expect(() => loginSchema.parse({ username: "admin",
            password: "pw",
            extra: true })).toThrow();
        expect(loginSchema.parse({ username: "admin",
            password: "pw" }).username).toBe("admin");
    });

    it("requires an object for password changes", () => {
        expect(() => changePasswordSchema.parse("not-an-object")).toThrow();
        expect(() => changePasswordSchema.parse({ currentPassword: "old" })).toThrow();
        expect(changePasswordSchema.parse({ currentPassword: "old",
            newPassword: "new-pw" }).newPassword).toBe("new-pw");
    });

    it("bounds auth tokens", () => {
        expect(() => tokenSchema.parse("")).toThrow();
        expect(() => tokenSchema.parse("a".repeat(4097))).toThrow();
        expect(tokenSchema.parse("a.b.c")).toBe("a.b.c");
    });

    it("bounds the composerize input", () => {
        expect(() => composerizeSchema.parse("")).toThrow();
        expect(() => composerizeSchema.parse("x".repeat(100_001))).toThrow();
        expect(composerizeSchema.parse("docker run nginx")).toBe("docker run nginx");
    });
});

describe("Settings boundaries", () => {
    it("accepts typed known keys", () => {
        const parsed = settingsSchema.parse({
            disableAuth: true,
            primaryHostname: "silo.example.com",
            keepDataPeriodDays: 30,
            trustProxy: false,
        });
        expect(parsed.disableAuth).toBe(true);
        expect(parsed.keepDataPeriodDays).toBe(30);
    });

    it("rejects wrong types for known keys", () => {
        expect(() => settingsSchema.parse({ disableAuth: "yes" })).toThrow();
        expect(() => settingsSchema.parse({ keepDataPeriodDays: -1 })).toThrow();
        expect(() => settingsSchema.parse({ keepDataPeriodDays: 1.5 })).toThrow();
        expect(() => settingsSchema.parse({ primaryHostname: "x".repeat(256) })).toThrow();
    });

    it("bounds globalENV and strips unknown keys", () => {
        expect(() => settingsSchema.parse({ globalENV: "x".repeat(1_000_001) })).toThrow();
        expect(settingsSchema.parse({ custom: "value" })).not.toHaveProperty("custom");
    });
});

describe("Startup and database configuration", () => {
    it("accepts a valid startup configuration", () => {
        expect(startupConfigSchema.parse({
            port: 5001,
            dataDir: "./data",
            stacksDir: "/opt/stacks",
            enableConsole: false,
        }).port).toBe(5001);
    });

    it("rejects out-of-range and missing required startup values", () => {
        expect(() => startupConfigSchema.parse({
            port: 70000,
            dataDir: "./data",
            stacksDir: "/opt/stacks",
            enableConsole: false,
        })).toThrow();
        expect(() => startupConfigSchema.parse({
            port: 5001,
            stacksDir: "/opt/stacks",
            enableConsole: false,
        })).toThrow();
    });

    it("only supports the sqlite database type", () => {
        expect(dbConfigSchema.parse({ type: "sqlite" }).type).toBe("sqlite");
        expect(() => dbConfigSchema.parse({ type: "postgres" })).toThrow();
        expect(() => dbConfigSchema.parse({ type: "sqlite",
            extra: true })).toThrow();
    });
});

describe("Primitive helpers", () => {
    it("trims and bounds non-empty strings", () => {
        expect(nonEmptyString.parse("  hi  ")).toBe("hi");
        expect(() => nonEmptyString.parse("   ")).toThrow();
    });

    it("enforces the service name pattern", () => {
        expect(() => serviceNameSchema.parse("bad name")).toThrow();
        expect(serviceNameSchema.parse("good_name-1")).toBe("good_name-1");
    });

    it("defaults deleteData to false", () => {
        expect(stackDeleteSchema.parse({ name: "web" }).deleteData).toBe(false);
    });
});
