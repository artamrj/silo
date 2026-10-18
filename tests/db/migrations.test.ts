import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "../../src/server/db/driver";
import { LATEST_SCHEMA_VERSION, migrate } from "../../src/server/db/migrations";

let dir : string;

/** Build a database with the exact schema the legacy RedBean + Knex stack produced. */
function createLegacyDatabase(path : string) {
    const db = openDatabase(path);
    db.exec(`
        CREATE TABLE "knex_migrations" ("id" integer not null primary key autoincrement, "name" varchar(255), "batch" integer, "migration_time" datetime);
        CREATE TABLE "knex_migrations_lock" ("index" integer not null primary key autoincrement, "is_locked" integer);
        CREATE TABLE "setting" ("id" integer not null primary key autoincrement, "key" varchar(200) not null, "value" text, "type" varchar(20));
        CREATE UNIQUE INDEX "setting_key_unique" on "setting" ("key");
        CREATE TABLE "user" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "username" varchar(255) NOT NULL, "password" varchar(255), "active" boolean NOT NULL DEFAULT '1', "timezone" varchar(150));
        CREATE UNIQUE INDEX "user_username_unique" on "user" ("username");
    `);

    const insertSetting = db.prepare("INSERT INTO setting (\"key\", \"value\", \"type\") VALUES (?, ?, ?)");
    insertSetting.run("jwtSecret", JSON.stringify("legacy-secret"), null);

    db.prepare("INSERT INTO user (\"username\", \"password\", \"active\", \"timezone\") VALUES (?, ?, ?, ?)")
        .run("alice", "$2a$10$abcdefghijklmnopqrstuv", 1, "Europe/Berlin");
    db.prepare("INSERT INTO user (\"username\", \"password\", \"active\", \"timezone\") VALUES (?, ?, ?, ?)")
        .run("bob", "$2a$10$zyxwvutsrqponmlkjihgfe", 0, null);

    return db;
}

beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "silo-migrate-"));
});

afterEach(() => {
    rmSync(dir, { recursive: true,
        force: true });
});

describe("versioned migrations", () => {
    it("initialises a fresh database to the latest version", () => {
        const db = openDatabase(join(dir, "silo.db"));
        migrate(db);

        expect(db.prepare("PRAGMA user_version").get()).toMatchObject({ user_version: LATEST_SCHEMA_VERSION });
        expect(migrate(db)).toMatchObject({ from: LATEST_SCHEMA_VERSION,
            to: LATEST_SCHEMA_VERSION,
            applied: [] });
        db.close();
    });

    it("adopts a legacy RedBean/Knex database without losing rows", () => {
        const path = join(dir, "silo.db");
        const db = createLegacyDatabase(path);

        const result = migrate(db);
        expect(result.from).toBe(0);
        expect(result.to).toBe(LATEST_SCHEMA_VERSION);
        expect(result.applied.length).toBeGreaterThan(0);

        expect(db.prepare("SELECT COUNT(*) AS c FROM user").get()).toMatchObject({ c: 2 });
        expect(db.prepare("SELECT username, active, timezone FROM user ORDER BY id").all()).toEqual([
            { username: "alice",
                active: 1,
                timezone: "Europe/Berlin" },
            { username: "bob",
                active: 0,
                timezone: null },
        ]);
        expect(db.prepare("SELECT value FROM setting WHERE \"key\" = ?").get("jwtSecret"))
            .toMatchObject({ value: JSON.stringify("legacy-secret") });

        // The Knex bookkeeping tables must be gone once the legacy schema is adopted.
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name);
        expect(tables).not.toContain("knex_migrations");
        expect(tables).not.toContain("knex_migrations_lock");

        db.close();
    });

    it("is idempotent when run against a legacy database twice", () => {
        const db = createLegacyDatabase(join(dir, "silo.db"));

        migrate(db);
        const second = migrate(db);

        expect(second.applied).toEqual([]);
        expect(db.prepare("SELECT COUNT(*) AS c FROM user").get()).toMatchObject({ c: 2 });
        db.close();
    });

    it("creates a backup before touching a legacy database", () => {
        const db = createLegacyDatabase(join(dir, "silo.db"));
        const backupPath = join(dir, "pre-migrate.db");

        migrate(db, { backupPath });

        expect(existsSync(backupPath)).toBe(true);
        db.close();

        const backup = openDatabase(backupPath, { readOnly: true });
        // The backup captures the pre-migration state, so Knex bookkeeping is intact.
        const tables = backup.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name);
        expect(tables).toContain("knex_migrations");
        expect(backup.prepare("SELECT COUNT(*) AS c FROM user").get()).toMatchObject({ c: 2 });
        backup.close();
    });

    it("rolls back the whole migration when a statement fails", () => {
        const db = createLegacyDatabase(join(dir, "silo.db"));

        expect(() => migrate(db, {
            migrations: [
                {
                    version: 1,
                    name: "ok",
                    up: (database) => {
                        database.exec("CREATE TABLE added (a INTEGER)");
                        database.exec("PRAGMA user_version = 1");
                    },
                },
                {
                    version: 2,
                    name: "broken",
                    up: () => {
                        throw new Error("nope");
                    },
                },
            ],
        })).toThrow("nope");

        // Version 1 committed, version 2 never ran, and the version stayed behind it.
        expect(db.prepare("PRAGMA user_version").get()).toMatchObject({ user_version: 1 });
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name);
        expect(tables).toContain("added");
        db.close();
    });

    it("refuses to run when the database is newer than this build", () => {
        const db = openDatabase(join(dir, "silo.db"));
        db.exec(`PRAGMA user_version = ${LATEST_SCHEMA_VERSION + 5}`);

        expect(() => migrate(db)).toThrow(/newer/i);
        db.close();
    });
});
