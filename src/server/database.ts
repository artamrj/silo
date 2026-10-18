import type { DatabaseSync } from "node:sqlite";
import { log } from "./log";
import fs from "fs";
import path from "path";
import { checkpoint, openDatabase } from "./db/driver";
import { migrate } from "./db/migrations";
import { dbConfigSchema, formatSchemaError, type DbConfig } from "../shared/schemas";

/**
 * Owns the single SQLite connection.
 *
 * The previous implementation wrapped Knex + RedBean and deferred the real work
 * to models that autoloaded themselves from disk. Silo only ever needs one
 * connection to two small tables, so the whole layer is now a synchronous
 * handle plus a handful of helpers.
 */
export class Database {
    /**
     * SQLite file path (development default: ./.local/data/silo.db)
     */
    static sqlitePath : string;

    static dbConfig? : DbConfig;

    private static dataDir : string;

    private static db? : DatabaseSync;

    /**
     * Connect to the database using the server's configured data directory.
     * @param server Server whose `config.dataDir` holds `silo.db`
     */
    static async init(server : { config : { dataDir : string } }) {
        log.debug("server", "Connecting to the database");
        Database.connect(server.config.dataDir);
        log.info("server", "Connected to the database");
    }

    /**
     * Open the database, adopting whatever schema is already on disk.
     *
     * Safe to call once per process. Reopening closes the previous handle so
     * tests can point a fresh `dataDir` at an already loaded module.
     * @param dataDir Directory holding `silo.db`; falls back to the previous
     * value, then `SILO_DATA_DIR`, then `./data`
     * @returns The connected handle
     */
    static connect(dataDir? : string) : DatabaseSync {
        if (dataDir) {
            Database.dataDir = dataDir;
        } else if (!Database.dataDir) {
            Database.dataDir = process.env.SILO_DATA_DIR ?? "./data";
        }

        if (Database.db) {
            Database.close();
        }

        fs.mkdirSync(Database.dataDir, { recursive: true });

        Database.dbConfig = Database.loadDBConfig();

        Database.sqlitePath = path.join(Database.dataDir, "silo.db");

        // Silo used to be called Dockge; adopt the old file when it is the only one present.
        const legacySQLitePath = path.join(Database.dataDir, "dockge.db");
        if (!fs.existsSync(Database.sqlitePath) && fs.existsSync(legacySQLitePath)) {
            fs.renameSync(legacySQLitePath, Database.sqlitePath);
            log.info("db", "Migrated the legacy database file to silo.db");
        }

        const db = openDatabase(Database.sqlitePath);

        const result = migrate(db, {
            backupPath: path.join(Database.dataDir, "silo.pre-migrate.db"),
        });

        if (result.applied.length > 0 && result.from > 0) {
            log.info("db", "Your existing database was upgraded. A pre-upgrade copy is at silo.pre-migrate.db");
        }

        Database.db = db;

        log.debug("db", "SQLite version: " + (db.prepare("SELECT sqlite_version() AS version").get() as { version : string }).version);

        return db;
    }

    /**
     * Read and validate `db-config.json`, creating a default one when absent.
     * @returns Parsed database config
     * @throws {Error} If the file exists but is malformed or unsupported
     */
    static loadDBConfig() : DbConfig {
        const configPath = path.join(Database.dataDir, "db-config.json");

        let raw : unknown;
        try {
            raw = JSON.parse(fs.readFileSync(configPath).toString("utf-8"));
        } catch (err) {
            if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
                log.warn("db", "No db-config.json found, creating a default SQLite configuration");
                const defaultConfig : DbConfig = { type: "sqlite" };
                Database.writeDBConfig(defaultConfig);
                return defaultConfig;
            }
            if (err instanceof SyntaxError) {
                throw new Error("Invalid db-config.json: not valid JSON", { cause: err });
            }
            throw err;
        }

        const result = dbConfigSchema.safeParse(raw);
        if (!result.success) {
            throw new Error("Invalid db-config.json: " + formatSchemaError(result.error) + " (only sqlite is supported)");
        }

        log.info("db", `Database Type: ${result.data.type}`);
        return result.data;
    }

    /**
     * @param dbConfig Database configuration to persist
     */
    static writeDBConfig(dbConfig : DbConfig) {
        fs.writeFileSync(path.join(Database.dataDir, "db-config.json"), JSON.stringify(dbConfig, null, 4));
    }

    /**
     * @returns The connected handle
     * @throws {Error} If `connect` has not been called yet
     */
    static getDb() : DatabaseSync {
        if (!Database.db) {
            throw new Error("Database is not connected. Call Database.connect() first.");
        }
        return Database.db;
    }

    /**
     * @returns Whether a connection is currently open
     */
    static isConnected() : boolean {
        return Database.db !== undefined;
    }

    /**
     * Flush the write-ahead log and release the connection.
     */
    static close() {
        if (!Database.db) {
            return;
        }

        log.info("db", "Closing the database");

        try {
            checkpoint(Database.db);
        } finally {
            Database.db.close();
            Database.db = undefined;
        }

        log.info("db", "Database closed");
    }

    /**
     * @returns Size of the database file in bytes
     */
    static getSize() : number {
        const stats = fs.statSync(Database.sqlitePath);
        return stats.size;
    }

    /**
     * Reclaim free pages without a full rewrite.
     */
    static shrink() {
        Database.getDb().exec("PRAGMA incremental_vacuum");
    }
}
