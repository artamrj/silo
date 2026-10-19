import { describe, expect, it } from "vitest";
import {
    changePasswordSchema,
    composerizeSchema,
    dbConfigSchema,
    imageIdSchema,
    imageIdsSchema,
    imagePruneSchema,
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
            trustProxy: false,
        });
        expect(parsed.disableAuth).toBe(true);
        expect(parsed.primaryHostname).toBe("silo.example.com");
    });

    it("rejects wrong types for known keys", () => {
        expect(() => settingsSchema.parse({ disableAuth: "yes" })).toThrow();
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

describe("Image operation boundaries", () => {
    it("accepts full and short image ids", () => {
        expect(imageIdSchema.parse("sha256:" + "a".repeat(64))).toBe("sha256:" + "a".repeat(64));
        expect(imageIdSchema.parse("a1b2c3d4e5f6")).toBe("a1b2c3d4e5f6");
    });

    it("rejects unsafe or malformed image ids", () => {
        expect(() => imageIdSchema.parse("nginx:latest")).toThrow();
        expect(() => imageIdSchema.parse("sha256:xyz")).toThrow();
        expect(() => imageIdSchema.parse("a".repeat(65))).toThrow();
    });

    it("requires a bounded, non-empty id list", () => {
        expect(imageIdsSchema.parse({ ids: [ "a1b2c3d4e5f6" ] }).ids).toHaveLength(1);
        expect(() => imageIdsSchema.parse({ ids: [] })).toThrow();
        expect(() => imageIdsSchema.parse({ ids: Array.from({ length: 501 }, () => "a1b2c3d4e5f6") })).toThrow();
        expect(() => imageIdsSchema.parse({ ids: [ "not an id" ] })).toThrow();
    });

    it("defaults the prune scope to dangling only", () => {
        expect(imagePruneSchema.parse({}).all).toBe(false);
        expect(imagePruneSchema.parse({ all: true }).all).toBe(true);
        expect(() => imagePruneSchema.parse({ all: true,
            extra: 1 })).toThrow();
    });
});
