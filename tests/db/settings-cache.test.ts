import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let dir : string;

beforeEach(() => {
    vi.resetModules();
    dir = mkdtempSync(join(tmpdir(), "silo-settings-"));
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

describe("Settings facade", () => {
    it("round-trips typed values through JSON", async () => {
        const { Settings } = await import("../../src/server/settings");
        const { Database } = await import("../../src/server/database");
        Database.connect(dir);

        await Settings.set("keepDataPeriodDays", 14, "general");
        expect(await Settings.get("keepDataPeriodDays")).toBe(14);

        await Settings.set("disableAuth", true, "general");
        expect(await Settings.get("disableAuth")).toBe(true);
    });

    it("caches reads and invalidates on write", async () => {
        const { Settings } = await import("../../src/server/settings");
        const { Database } = await import("../../src/server/database");
        Database.connect(dir);

        await Settings.set("primaryHostname", "first", "general");
        expect(await Settings.get("primaryHostname")).toBe("first");

        // A write must invalidate the cached read, otherwise the UI would show
        // a stale hostname until the cache cleaner eventually expires it.
        await Settings.set("primaryHostname", "second", "general");
        expect(await Settings.get("primaryHostname")).toBe("second");
    });

    it("returns all settings of a type as parsed values", async () => {
        const { Settings } = await import("../../src/server/settings");
        const { Database } = await import("../../src/server/database");
        Database.connect(dir);

        await Settings.setSettings("general", {
            disableAuth: false,
            keepDataPeriodDays: 30,
        });

        expect(await Settings.getSettings("general")).toEqual({
            disableAuth: false,
            keepDataPeriodDays: 30,
        });
    });

    it("only overwrites keys that already belong to the same type", async () => {
        const { Settings } = await import("../../src/server/settings");
        const { Database } = await import("../../src/server/database");
        Database.connect(dir);

        await Settings.set("jwtSecret", "sec", null);
        // setSettings scoped to "general" must not hijack the untagged secret row.
        await Settings.setSettings("general", { jwtSecret: "hijacked" });

        expect(await Settings.get("jwtSecret")).toBe("sec");
    });

    it("returns undefined for unknown keys", async () => {
        const { Settings } = await import("../../src/server/settings");
        const { Database } = await import("../../src/server/database");
        Database.connect(dir);

        expect(await Settings.get("primaryHostname")).toBeUndefined();
    });
});
