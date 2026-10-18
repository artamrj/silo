import type { DatabaseSync } from "node:sqlite";
import { log } from "../log";
import { backupDatabase, withTransaction } from "./driver";

/**
 * A single, ordered schema change.
 *
 * `up` runs inside its own transaction together with the `user_version` bump,
 * so a failure leaves the database exactly at the previous version.
 */
export interface Migration {
    /** Monotonic version. Becomes the value of `PRAGMA user_version` after a successful run. */
    version : number;
    /** Short human readable label used in logs. */
    name : string;
    /** Apply the schema change. */
    up : (db : DatabaseSync) => void;
}

/**
 * Baseline schema.
 *
 * This is deliberately written as the *final* two-table schema using
 * `IF NOT EXISTS` rather than replaying the historical Knex migrations. It
 * therefore adopts three starting points in one step:
 *
 * 1. an empty file (fresh install),
 * 2. a database created by the old RedBean + Knex stack (data preserved, the
 *    `knex_migrations` bookkeeping tables are removed), and
 * 3. a database already at this version (no-op).
 */
const baseline : Migration = {
    version: 1,
    name: "baseline-schema",
    up: (db) => {
        db.exec(`
            CREATE TABLE IF NOT EXISTS "setting" (
                "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
                "key" varchar(200) NOT NULL,
                "value" text,
                "type" varchar(20)
            );
            CREATE UNIQUE INDEX IF NOT EXISTS "setting_key_unique" ON "setting" ("key");
        `);

        db.exec(`
            CREATE TABLE IF NOT EXISTS "user" (
                "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
                "username" varchar(255) NOT NULL,
                "password" varchar(255),
                "active" boolean NOT NULL DEFAULT '1',
                "timezone" varchar(150)
            );
            CREATE UNIQUE INDEX IF NOT EXISTS "user_username_unique" ON "user" ("username");
        `);

        // Retire the Knex migration bookkeeping. The schema it tracked now lives
        // in `user_version` and the `migrations` array below.
        db.exec(`
            DROP TABLE IF EXISTS "knex_migrations";
            DROP TABLE IF EXISTS "knex_migrations_lock";
        `);
    },
};

/**
 * All migrations in ascending order. Append new entries; never edit a released
 * one, because existing installs have already recorded its version.
 */
export const migrations : Migration[] = [
    baseline,
];

export const LATEST_SCHEMA_VERSION = migrations.reduce((max, migration) => Math.max(max, migration.version), 0);

export interface MigrateOptions {
    /** Absolute path to write a pre-migration snapshot to. */
    backupPath? : string;
    /** Override the migration list. Used by tests to exercise failure handling. */
    migrations? : Migration[];
}

export interface MigrateResult {
    from : number;
    to : number;
    applied : Migration[];
}

function getUserVersion(db : DatabaseSync) : number {
    const row = db.prepare("PRAGMA user_version").get() as { user_version? : number } | undefined;
    return row?.user_version ?? 0;
}

/**
 * Does this file carry the schema written by the legacy RedBean + Knex stack?
 * @param db Connected database handle
 * @returns True when the Knex bookkeeping table is present
 */
export function hasLegacyKnexSchema(db : DatabaseSync) : boolean {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'knex_migrations'").get();
    return row !== undefined;
}

/**
 * Bring the database up to `LATEST_SCHEMA_VERSION`.
 *
 * Each migration commits independently, so a failure in migration N leaves the
 * database at N-1 rather than half-applied. When upgrading a legacy RedBean +
 * Knex database a snapshot is written first (see `backupPath`), which is the
 * rollback path: stop Silo, restore the snapshot over `silo.db`.
 * @param db Connected database handle
 * @param options Migration options
 * @returns Summary of what was applied
 */
export function migrate(db : DatabaseSync, options : MigrateOptions = {}) : MigrateResult {
    const list = (options.migrations ?? migrations).slice().sort((a, b) => a.version - b.version);
    const from = getUserVersion(db);
    const target = list.reduce((max, migration) => Math.max(max, migration.version), 0);

    if (from > LATEST_SCHEMA_VERSION && !options.migrations) {
        throw new Error(
            `Database schema version ${from} is newer than this Silo build supports (${LATEST_SCHEMA_VERSION}). `
            + "Downgrade is not supported; restore a backup or upgrade Silo."
        );
    }

    const pending = list.filter((migration) => migration.version > from);
    if (pending.length === 0) {
        log.debug("db", `Schema is up to date at version ${from}`);
        return {
            from,
            to: from,
            applied: [],
        };
    }

    // Snapshot before the first write when adopting a legacy database, so an
    // operator always has a byte-for-byte rollback target.
    if (options.backupPath && hasLegacyKnexSchema(db)) {
        backupDatabase(db, options.backupPath);
        log.info("db", `Wrote pre-migration backup to ${options.backupPath}`);
    }

    const applied : Migration[] = [];

    for (const migration of pending) {
        log.info("db", `Applying migration ${migration.version} (${migration.name})`);
        withTransaction(db, () => {
            migration.up(db);
            db.exec(`PRAGMA user_version = ${migration.version}`);
        });
        applied.push(migration);
    }

    log.info("db", `Schema migrated from version ${from} to ${target}`);
    return {
        from,
        to: target,
        applied,
    };
}
