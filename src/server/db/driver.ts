import { rmSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

/**
 * Pragmas applied to every writable connection.
 *
 * - `journal_mode = WAL` keeps readers from blocking the single writer and
 *   survives an OS crash without corrupting the database.
 * - `synchronous = NORMAL` is the documented safe pairing with WAL: durable
 *   across process crashes, only at risk on power loss.
 * - `foreign_keys = ON` is required because SQLite defaults it to off.
 * - `auto_vacuum = INCREMENTAL` lets `Database.shrink()` reclaim space without
 *   the full-file rewrite `VACUUM` performs.
 */
const WRITABLE_PRAGMAS = [
    "PRAGMA journal_mode = WAL",
    "PRAGMA synchronous = NORMAL",
    "PRAGMA foreign_keys = ON",
    "PRAGMA cache_size = -12000",
    "PRAGMA busy_timeout = 5000",
    "PRAGMA auto_vacuum = INCREMENTAL",
];

export interface OpenOptions {
    /** Open without write access. Read-only connections skip the pragmas that require a lock. */
    readOnly? : boolean;
}

/**
 * Open a SQLite database through Node's built-in driver.
 *
 * `node:sqlite` is synchronous, which matches SQLite's single-writer model and
 * removes the native addon that `sqlite3` required. Silo runs queries on the
 * event loop, but they are tiny (two tables) so the blocking cost is negligible
 * compared to the Docker and PTY work happening on other paths.
 * @param filename Path to the database file, or `:memory:`
 * @param options Connection options
 * @returns Connected database handle
 */
export function openDatabase(filename : string, options : OpenOptions = {}) : DatabaseSync {
    const db = new DatabaseSync(filename, {
        readOnly: options.readOnly ?? false,
    });

    if (!options.readOnly) {
        for (const pragma of WRITABLE_PRAGMAS) {
            db.exec(pragma);
        }
    }

    return db;
}

/**
 * Run `fn` inside a transaction, rolling back if it throws.
 * @param db Connected database handle
 * @param fn Work to perform inside the transaction
 * @returns Whatever `fn` returned
 */
export function withTransaction<T>(db : DatabaseSync, fn : () => T) : T {
    db.exec("BEGIN");
    try {
        const result = fn();
        db.exec("COMMIT");
        return result;
    } catch (error) {
        try {
            db.exec("ROLLBACK");
        } catch {
            // A failed rollback must not hide the original error.
        }
        throw error;
    }
}

/**
 * Copy the live database to `target` using `VACUUM INTO`, which produces a
 * consistent snapshot (WAL content included) without closing the connection.
 *
 * `VACUUM INTO` refuses to write over an existing file, and startup retries the
 * snapshot whenever a legacy database is still present (for example after a
 * migration that failed), so any stale target is removed first.
 * @param db Connected database handle
 * @param target Absolute path of the file to write
 */
export function backupDatabase(db : DatabaseSync, target : string) {
    rmSync(target, { force: true });
    db.prepare("VACUUM INTO ?").run(target);
}

/**
 * Flush the write-ahead log into the main database file. Called on shutdown so
 * the on-disk `.db` is self-contained when the process exits.
 * @param db Connected database handle
 */
export function checkpoint(db : DatabaseSync) {
    db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
}
