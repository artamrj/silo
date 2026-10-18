import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { backupDatabase, openDatabase, withTransaction } from "../../src/server/db/driver";

let dir : string;

beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "silo-driver-"));
});

afterEach(() => {
    rmSync(dir, { recursive: true,
        force: true });
});

describe("node:sqlite driver wrapper", () => {
    it("opens a file database and enables the production pragmas", () => {
        const db = openDatabase(join(dir, "silo.db"));

        expect(db.prepare("PRAGMA journal_mode").get()).toMatchObject({ journal_mode: "wal" });
        expect(db.prepare("PRAGMA foreign_keys").get()).toMatchObject({ foreign_keys: 1 });
        expect(db.prepare("PRAGMA synchronous").get()).toMatchObject({ synchronous: 1 });

        db.close();
        expect(existsSync(join(dir, "silo.db"))).toBe(true);
    });

    it("commits a transaction", () => {
        const db = openDatabase(join(dir, "silo.db"));
        db.exec("CREATE TABLE t (a INTEGER)");

        withTransaction(db, () => {
            db.prepare("INSERT INTO t VALUES (?)").run(1);
        });

        expect(db.prepare("SELECT COUNT(*) AS c FROM t").get()).toMatchObject({ c: 1 });
        db.close();
    });

    it("rolls back a transaction when the callback throws", () => {
        const db = openDatabase(join(dir, "silo.db"));
        db.exec("CREATE TABLE t (a INTEGER)");

        expect(() => withTransaction(db, () => {
            db.prepare("INSERT INTO t VALUES (?)").run(1);
            throw new Error("boom");
        })).toThrow("boom");

        expect(db.prepare("SELECT COUNT(*) AS c FROM t").get()).toMatchObject({ c: 0 });
        db.close();
    });

    it("backs up the database to another file", () => {
        const db = openDatabase(join(dir, "silo.db"));
        db.exec("CREATE TABLE t (a INTEGER)");
        db.prepare("INSERT INTO t VALUES (?)").run(42);

        const target = join(dir, "backup.db");
        backupDatabase(db, target);
        db.close();

        expect(existsSync(target)).toBe(true);

        const restored = openDatabase(target, { readOnly: true });
        expect(restored.prepare("SELECT a FROM t").get()).toMatchObject({ a: 42 });
        restored.close();
    });

    it("replaces an existing backup instead of failing on it", () => {
        const db = openDatabase(join(dir, "silo.db"));
        db.exec("CREATE TABLE t (a INTEGER)");
        db.prepare("INSERT INTO t VALUES (?)").run(1);

        const target = join(dir, "backup.db");
        backupDatabase(db, target);
        // A second attempt must not throw: startup retries the snapshot whenever
        // the previous run left a legacy database behind.
        expect(() => backupDatabase(db, target)).not.toThrow();
        db.close();

        const restored = openDatabase(target, { readOnly: true });
        expect(restored.prepare("SELECT COUNT(*) AS c FROM t").get()).toMatchObject({ c: 1 });
        restored.close();
    });

    it("rejects writes on a read-only connection", () => {
        const db = openDatabase(join(dir, "silo.db"));
        db.exec("CREATE TABLE t (a INTEGER)");
        db.close();

        const ro = openDatabase(join(dir, "silo.db"), { readOnly: true });
        expect(() => ro.exec("CREATE TABLE other (a INTEGER)")).toThrow();
        ro.close();
    });
});
