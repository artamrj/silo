import { Socket } from "socket.io";
import { Terminal } from "../terminal";
import { log } from "../log";
import { ERROR_TYPE_VALIDATION } from "../../shared/utils";
import { R } from "redbean-node";
import { verifyPassword } from "../password-hash";
import fs from "fs";
import { z } from "zod";
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

export function validate<T>(schema: z.ZodType<T>, value: unknown): T {
    const result = schema.safeParse(value);
    if (!result.success) {
        throw new ValidationError(result.error.issues[0]?.message ?? "Invalid input");
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

export async function doubleCheckPassword(socket : SiloSocket, currentPassword : unknown) {
    if (typeof currentPassword !== "string") {
        throw new Error("Wrong data type?");
    }

    let user = await R.findOne("user", " id = ? AND active = 1 ", [
        socket.userID,
    ]);

    if (!user || !verifyPassword(currentPassword, user.password)) {
        throw new Error("Incorrect current password");
    }

    return user;
}

export function fileExists(file : string) {
    return fs.promises.access(file, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);
}
