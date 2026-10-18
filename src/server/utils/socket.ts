import { Socket } from "socket.io";
import { Terminal } from "../terminal";
import { log } from "../log";
import { ERROR_TYPE_VALIDATION } from "../../shared/utils";
import { Database } from "../database";
import { findUserById } from "../db/repositories/users";
import { User } from "../models/user";
import { verifyPassword } from "../password-hash";
import fs from "fs";
import { formatSchemaError, type Schema } from "../../shared/schemas";
import type { ClientToServerEvents, ServerToClientEvents } from "../../shared/socket-events";

export interface JWTDecoded {
    username : string;
    h? : string;
    exp? : number;
}

export interface SiloSocket extends Socket<ClientToServerEvents, ServerToClientEvents> {
    userID: number;
    consoleTerminal? : Terminal;
}

// For command line arguments, so they are nullable
export interface Arguments {
    sslKey? : string;
    sslCert? : string;
    sslKeyPassphrase? : string;
    port? : number;
    hostname? : string;
    dataDir? : string;
    stacksDir? : string;
    enableConsole? : boolean;
}

// Some config values are required
export interface Config extends Arguments {
    dataDir : string;
    stacksDir : string;
}

export function checkLogin(socket : SiloSocket) {
    if (!socket.userID) {
        throw new Error("You are not logged in.");
    }
}

export class ValidationError extends Error {
    constructor(message : string) {
        super(message);
    }
}

export function validate<T>(schema: Schema<T>, value: unknown): T {
    const result = schema.safeParse(value);
    if (!result.success) {
        throw new ValidationError(formatSchemaError(result.error));
    }
    return result.data;
}

export function callbackError(error : unknown, callback : unknown) {
    if (typeof(callback) !== "function") {
        log.error("console", "Callback is not a function");
        return;
    }

    if (error instanceof ValidationError) {
        callback({
            ok: false,
            type: ERROR_TYPE_VALIDATION,
            msg: error.message,
            msgi18n: false,
        });
    } else if (error instanceof Error) {
        callback({
            ok: false,
            msg: error.message,
            msgi18n: false,
        });
    } else {
        const message = typeof error === "string" ? error : "An unexpected server error occurred.";
        log.error("console", "Unknown error: " + String(error));
        callback({
            ok: false,
            msg: message,
            msgi18n: false,
        });
    }
}

export function callbackResult(result : unknown, callback : unknown) {
    if (typeof(callback) !== "function") {
        log.error("console", "Callback is not a function");
        return;
    }
    callback(result);
}

export async function doubleCheckPassword(socket : SiloSocket, currentPassword : unknown) : Promise<User> {
    if (typeof currentPassword !== "string") {
        throw new Error("Wrong data type?");
    }

    const row = findUserById(Database.getDb(), socket.userID);

    if (!row || row.active !== 1 || !verifyPassword(currentPassword, row.password ?? "")) {
        throw new Error("Incorrect current password");
    }

    return new User(row);
}

export function fileExists(file : string) {
    return fs.promises.access(file, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);
}
