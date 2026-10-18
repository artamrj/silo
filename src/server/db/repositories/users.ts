import type { DatabaseSync } from "node:sqlite";

/**
 * A row of the `user` table.
 *
 * `active` stays a `0 | 1` integer because that is what SQLite stores and what
 * the login query filters on; callers that need a boolean can cast it.
 */
export interface UserRow {
    id : number;
    username : string;
    password : string | null;
    active : number;
    timezone : string | null;
}

interface UserRowWithBoolean extends Omit<UserRow, "active"> {
    active : boolean;
}

/** Columns selected by every read, kept in one place so types and SQL cannot drift. */
const COLUMNS = "id, username, password, active, timezone";

function toRow(row : UserRowWithBoolean) : UserRow {
    return { ...row,
        active: row.active ? 1 : 0 };
}

/**
 * How many users exist? Drives first-run setup detection.
 * @param db Connected database handle
 * @returns Number of user rows
 */
export function countUsers(db : DatabaseSync) : number {
    const row = db.prepare("SELECT COUNT(*) AS count FROM \"user\"").get() as { count : number };
    return row.count;
}

/**
 * @param db Connected database handle
 * @returns The first user in insertion order, or undefined when none exists
 */
export function findFirstUser(db : DatabaseSync) : UserRow | undefined {
    const row = db.prepare(`SELECT ${COLUMNS} FROM "user" ORDER BY id LIMIT 1`).get() as UserRowWithBoolean | undefined;
    return row ? toRow(row) : undefined;
}

/**
 * @param db Connected database handle
 * @param id User id
 * @returns The user, or undefined when missing
 */
export function findUserById(db : DatabaseSync, id : number) : UserRow | undefined {
    const row = db.prepare(`SELECT ${COLUMNS} FROM "user" WHERE id = ?`).get(id) as UserRowWithBoolean | undefined;
    return row ? toRow(row) : undefined;
}

/**
 * Look up a user eligible to log in. Inactive users are never returned, which
 * is the behaviour the previous RedBean query encoded in its `active = 1` filter.
 * @param db Connected database handle
 * @param username Username to match
 * @returns The active user, or undefined
 */
export function findActiveUserByUsername(db : DatabaseSync, username : string) : UserRow | undefined {
    const row = db.prepare(`SELECT ${COLUMNS} FROM "user" WHERE username = ? AND active = 1`).get(username) as UserRowWithBoolean | undefined;
    return row ? toRow(row) : undefined;
}

/**
 * @param db Connected database handle
 * @returns Every user in insertion order
 */
export function listUsers(db : DatabaseSync) : UserRow[] {
    const rows = db.prepare(`SELECT ${COLUMNS} FROM "user" ORDER BY id`).all() as unknown as UserRowWithBoolean[];
    return rows.map(toRow);
}

export interface CreateUserInput {
    username : string;
    password : string;
    active? : boolean;
    timezone? : string | null;
}

/**
 * Insert a user and return the stored row.
 * @param db Connected database handle
 * @param input Column values
 * @returns The inserted user, including the generated id
 */
export function createUser(db : DatabaseSync, input : CreateUserInput) : UserRow {
    const result = db.prepare("INSERT INTO \"user\" (username, password, active, timezone) VALUES (?, ?, ?, ?)")
        .run(input.username, input.password, input.active === false ? 0 : 1, input.timezone ?? null);

    return findUserById(db, Number(result.lastInsertRowid)) as UserRow;
}

/**
 * @param db Connected database handle
 * @param id User id
 * @param password New password hash
 */
export function updateUserPassword(db : DatabaseSync, id : number, password : string) : void {
    db.prepare("UPDATE \"user\" SET password = ? WHERE id = ?").run(password, id);
}

/**
 * @param db Connected database handle
 * @param id User id
 * @param active New active flag
 */
export function setUserActive(db : DatabaseSync, id : number, active : boolean) : void {
    db.prepare("UPDATE \"user\" SET active = ? WHERE id = ?").run(active ? 1 : 0, id);
}
