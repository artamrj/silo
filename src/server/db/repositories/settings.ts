import type { DatabaseSync } from "node:sqlite";

/**
 * A row of the `setting` table.
 *
 * `type` is `null` for untagged settings such as `jwtSecret`, which must stay
 * out of the `general` bucket that the settings UI writes to.
 */
export interface SettingRow {
    id : number;
    key : string;
    value : string | null;
    type : string | null;
}

/** Columns selected by every read, kept in one place so types and SQL cannot drift. */
const COLUMNS = "id, \"key\", value, type";

/**
 * @param db Connected database handle
 * @param key Setting key
 * @returns The stored row, or undefined when missing
 */
export function findSetting(db : DatabaseSync, key : string) : SettingRow | undefined {
    return db.prepare(`SELECT ${COLUMNS} FROM "setting" WHERE "key" = ?`).get(key) as SettingRow | undefined;
}

/**
 * Read a raw setting value. Values are stored JSON-encoded, so callers that
 * want the parsed form should go through the `Settings` facade.
 * @param db Connected database handle
 * @param key Setting key
 * @returns The raw value, or undefined when missing
 */
export function getSetting(db : DatabaseSync, key : string) : string | undefined {
    const row = db.prepare("SELECT value FROM \"setting\" WHERE \"key\" = ?").get(key) as { value : string | null } | undefined;
    return row?.value ?? undefined;
}

/**
 * Insert or update a setting. A single row per key is guaranteed by the
 * `setting_key_unique` index, so the same key can be written repeatedly without
 * duplicating rows.
 * @param db Connected database handle
 * @param key Setting key
 * @param value Raw (JSON-encoded) value, or null to clear
 * @param type Owning type, or null for an untagged setting
 */
export function setSetting(db : DatabaseSync, key : string, value : string | null, type : string | null) : void {
    db.prepare(`
        INSERT INTO "setting" ("key", value, type) VALUES (?, ?, ?)
        ON CONFLICT("key") DO UPDATE SET value = excluded.value, type = excluded.type
    `).run(key, value, type);
}

export interface SettingEntry {
    key : string;
    value : string | null;
}

/**
 * @param db Connected database handle
 * @param type Owning type
 * @returns Every setting of that type, in insertion order
 */
export function getSettingsByType(db : DatabaseSync, type : string) : SettingEntry[] {
    return db.prepare("SELECT \"key\", value FROM \"setting\" WHERE type = ? ORDER BY id").all(type) as unknown as SettingEntry[];
}

/**
 * Write several settings of the same type in one transaction, so a partial
 * update cannot leave the UI half-saved.
 * @param db Connected database handle
 * @param type Owning type
 * @param entries Key/value pairs to store
 */
export function setSettingsByType(db : DatabaseSync, type : string, entries : SettingEntry[]) : void {
    const statement = db.prepare(`
        INSERT INTO "setting" ("key", value, type) VALUES (?, ?, ?)
        ON CONFLICT("key") DO UPDATE SET value = excluded.value, type = excluded.type
    `);

    db.exec("BEGIN");
    try {
        for (const entry of entries) {
            statement.run(entry.key, entry.value, type);
        }
        db.exec("COMMIT");
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
 * @param db Connected database handle
 * @param type Owning type
 */
export function deleteSettingsByType(db : DatabaseSync, type : string) : void {
    db.prepare("DELETE FROM \"setting\" WHERE type = ?").run(type);
}
