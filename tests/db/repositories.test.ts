import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "../../src/server/db/driver";
import { migrate } from "../../src/server/db/migrations";
import {
    countUsers,
    createUser,
    findActiveUserByUsername,
    findFirstUser,
    findUserById,
    listUsers,
    setUserActive,
    updateUserPassword,
} from "../../src/server/db/repositories/users";
import {
    deleteSettingsByType,
    getSetting,
    getSettingsByType,
    setSetting,
    setSettingsByType,
} from "../../src/server/db/repositories/settings";

let dir : string;
let db : ReturnType<typeof openDatabase>;

beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "silo-repo-"));
    db = openDatabase(join(dir, "silo.db"));
    migrate(db);
});

afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true,
        force: true });
});

describe("user repository", () => {
    it("starts empty and counts inserted users", () => {
        expect(countUsers(db)).toBe(0);
        createUser(db, { username: "alice",
            password: "hash-a" });
        expect(countUsers(db)).toBe(1);
        createUser(db, { username: "bob",
            password: "hash-b" });
        expect(countUsers(db)).toBe(2);
    });

    it("returns created users with defaults applied", () => {
        const alice = createUser(db, { username: "alice",
            password: "hash-a" });

        expect(alice.id).toBeGreaterThan(0);
        expect(alice.username).toBe("alice");
        expect(alice.password).toBe("hash-a");
        expect(alice.active).toBe(1);
        expect(alice.timezone).toBeNull();
    });

    it("finds users by id and by active username", () => {
        const alice = createUser(db, { username: "alice",
            password: "hash-a" });
        createUser(db, { username: "carol",
            password: "hash-c",
            active: false });

        expect(findUserById(db, alice.id)?.username).toBe("alice");
        expect(findUserById(db, 9999)).toBeUndefined();

        expect(findActiveUserByUsername(db, "alice")?.id).toBe(alice.id);
        // Inactive users are invisible to the login path.
        expect(findActiveUserByUsername(db, "carol")).toBeUndefined();
        expect(findActiveUserByUsername(db, "nobody")).toBeUndefined();
    });

    it("finds the first user for the disabled-auth auto login shortcut", () => {
        expect(findFirstUser(db)).toBeUndefined();
        createUser(db, { username: "alice",
            password: "hash-a" });
        createUser(db, { username: "bob",
            password: "hash-b" });

        expect(findFirstUser(db)?.username).toBe("alice");
    });

    it("lists users in insertion order", () => {
        createUser(db, { username: "alice",
            password: "a" });
        createUser(db, { username: "bob",
            password: "b" });

        expect(listUsers(db).map((user) => user.username)).toEqual([ "alice", "bob" ]);
    });

    it("updates a password and toggles active", () => {
        const alice = createUser(db, { username: "alice",
            password: "old" });

        updateUserPassword(db, alice.id, "new");
        expect(findUserById(db, alice.id)?.password).toBe("new");

        setUserActive(db, alice.id, false);
        expect(findActiveUserByUsername(db, "alice")).toBeUndefined();
        expect(findUserById(db, alice.id)?.active).toBe(0);
    });

    it("enforces the unique username constraint", () => {
        createUser(db, { username: "alice",
            password: "a" });
        expect(() => createUser(db, { username: "alice",
            password: "b" })).toThrow();
    });
});

describe("settings repository", () => {
    it("returns undefined for missing keys", () => {
        expect(getSetting(db, "jwtSecret")).toBeUndefined();
    });

    it("stores and reads raw values", () => {
        setSetting(db, "jwtSecret", "abc", null);
        expect(getSetting(db, "jwtSecret")).toBe("abc");
    });

    it("upserts on repeated writes instead of duplicating rows", () => {
        setSetting(db, "primaryHostname", "a", "general");
        setSetting(db, "primaryHostname", "b", "general");

        const rows = getSettingsByType(db, "general");
        expect(rows).toHaveLength(1);
        expect(rows[0].value).toBe("b");
        expect(getSetting(db, "primaryHostname")).toBe("b");
    });

    it("filters by type", () => {
        setSetting(db, "disableAuth", "true", "general");
        setSetting(db, "jwtSecret", "abc", null);

        expect(getSettingsByType(db, "general").map((row) => row.key)).toEqual([ "disableAuth" ]);
    });

    it("bulk-writes settings for a type", () => {
        setSettingsByType(db, "general", [
            { key: "disableAuth",
                value: "false" },
            { key: "trustProxy",
                value: "true" },
        ]);

        expect(getSettingsByType(db, "general").map((row) => row.key).sort()).toEqual([ "disableAuth", "trustProxy" ]);
    });

    it("deletes settings by type", () => {
        setSetting(db, "disableAuth", "true", "general");
        deleteSettingsByType(db, "general");

        expect(getSettingsByType(db, "general")).toEqual([]);
    });
});
