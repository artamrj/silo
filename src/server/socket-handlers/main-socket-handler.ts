// @ts-ignore
import composerize from "composerize";
import { SocketHandler } from "../socket-handler.js";
import { SiloServer } from "../silo-server";
import { log } from "../log";
import { R } from "redbean-node";
import { loginRateLimiter } from "../rate-limiter";
import { generatePasswordHash, needRehashPassword, shake256, SHAKE256_LENGTH, verifyPassword } from "../password-hash";
import { User } from "../models/user";
import {
    callbackError,
    callbackResult,
    checkLogin,
    SiloSocket,
    doubleCheckPassword,
    JWTDecoded,
    ValidationError
} from "../utils/socket";
import { isPasswordTooWeak } from "../utils/password-strength";
import jwt from "jsonwebtoken";
import { Settings } from "../settings";
import fs, { promises as fsAsync } from "fs";
import path from "path";
import { loginSchema, setupSchema, tokenSchema, changePasswordSchema, settingsSchema, composerizeSchema } from "../../shared/schemas";
import { validate } from "../utils/socket";

const PASSWORD_TOO_WEAK_MESSAGE = "Password is too weak. It must be at least 8 characters long and use at least two of: lowercase letters, uppercase letters, digits, symbols.";

export class MainSocketHandler extends SocketHandler {
    create(socket : SiloSocket, server : SiloServer) {

        // ***************************
        // Public Socket API
        // ***************************

        // Report whether the first-run setup is still pending
        socket.on("needSetup", async (callback) => {
            callbackResult(server.needSetup, callback);
        });

        // Setup
        socket.on("setup", async (username, password, callback) => {
            try {
                const input = validate(setupSchema, { username,
                    password });

                if (isPasswordTooWeak(input.password)) {
                    throw new ValidationError(PASSWORD_TOO_WEAK_MESSAGE);
                }

                if ((await R.knex("user").count("id as count").first()).count !== 0) {
                    throw new Error("Silo has been initialized. If you want to run setup again, please delete the database.");
                }

                const user = R.dispense("user");
                user.username = input.username;
                user.password = generatePasswordHash(input.password);
                await R.store(user);

                server.needSetup = false;

                callback({
                    ok: true,
                    msg: "successAdded",
                    msgi18n: true,
                });

            } catch (e) {
                if (e instanceof Error) {
                    callback({
                        ok: false,
                        msg: e.message,
                    });
                }
            }
        });

        // Login by token
        socket.on("loginByToken", async (rawToken, callback) => {
            const clientIP = await server.getClientIP(socket);

            log.info("auth", `Login by token. IP=${clientIP}`);

            try {
                const token = validate(tokenSchema, rawToken);
                const decoded = jwt.verify(token, server.jwtSecret) as JWTDecoded;

                log.info("auth", "Username from JWT: " + decoded.username);

                const user = await R.findOne("user", " username = ? AND active = 1 ", [
                    decoded.username,
                ]) as User;

                if (user) {
                    // Check if the password changed
                    if (decoded.h !== shake256(user.password, SHAKE256_LENGTH)) {
                        throw new Error("The token is invalid due to password change or old token");
                    }

                    if (decoded.exp && decoded.exp * 1000 - Date.now() < 60 * 60 * 1000) {
                        callback({
                            ok: true,
                            token: User.createJWT(user, server.jwtSecret),
                        });
                        return;
                    }

                    log.debug("auth", "afterLogin");
                    await server.afterLogin(socket, user);
                    log.debug("auth", "afterLogin ok");

                    log.info("auth", `Successfully logged in user ${decoded.username}. IP=${clientIP}`);

                    callback({
                        ok: true,
                    });
                } else {

                    log.info("auth", `Inactive or deleted user ${decoded.username}. IP=${clientIP}`);

                    callback({
                        ok: false,
                        msg: "authUserInactiveOrDeleted",
                        msgi18n: true,
                    });
                }
            } catch (error) {
                if (!(error instanceof Error)) {
                    console.error("Unknown error:", error);
                    return;
                }
                log.error("auth", `Invalid token. IP=${clientIP}`);
                if (error.message) {
                    log.error("auth", error.message + ` IP=${clientIP}`);
                }
                callback({
                    ok: false,
                    msg: "authInvalidToken",
                    msgi18n: true,
                });
            }

        });

        socket.on("refreshToken", async (rawToken, callback) => {
            try {
                const token = validate(tokenSchema, rawToken);
                const decoded = jwt.verify(token, server.jwtSecret) as JWTDecoded;
                const user = await R.findOne("user", " username = ? AND active = 1 ", [ decoded.username ]) as User;
                if (!user || decoded.h !== shake256(user.password, SHAKE256_LENGTH)) {
                    throw new Error("The token is invalid due to password change or old token");
                }
                callback({
                    ok: true,
                    token: User.createJWT(user, server.jwtSecret),
                });
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // Login
        socket.on("login", async (data, callback) => {
            const clientIP = await server.getClientIP(socket);

            log.info("auth", `Login by username + password. IP=${clientIP}`);

            // Checking
            if (typeof callback !== "function") {
                return;
            }

            try {
                data = validate(loginSchema, data);
            } catch (error) {
                callbackError(error, callback);
                return;
            }

            // Login Rate Limit
            if (!await loginRateLimiter.pass(callback)) {
                log.info("auth", `Too many failed requests for user ${data.username}. IP=${clientIP}`);
                return;
            }

            const user = await this.login(data.username, data.password);

            if (user) {
                server.afterLogin(socket, user);

                log.info("auth", `Successfully logged in user ${data.username}. IP=${clientIP}`);

                callback({
                    ok: true,
                    token: User.createJWT(user, server.jwtSecret),
                });
            } else {

                log.warn("auth", `Incorrect username or password for user ${data.username}. IP=${clientIP}`);

                callback({
                    ok: false,
                    msg: "authIncorrectCreds",
                    msgi18n: true,
                });
            }

        });

        // Change Password
        socket.on("changePassword", async (rawPassword, callback) => {
            try {
                checkLogin(socket);

                const password = validate(changePasswordSchema, rawPassword);

                if (isPasswordTooWeak(password.newPassword)) {
                    throw new ValidationError(PASSWORD_TOO_WEAK_MESSAGE);
                }

                let user = await doubleCheckPassword(socket, password.currentPassword);
                await user.resetPassword(password.newPassword);

                server.disconnectAllSocketClients(user.id, socket.id);

                callback({
                    ok: true,
                    msg: "Password has been updated successfully.",
                });

            } catch (e) {
                if (e instanceof Error) {
                    callback({
                        ok: false,
                        msg: e.message,
                    });
                }
            }
        });

        socket.on("getSettings", async (callback) => {
            try {
                checkLogin(socket);
                const data = await Settings.getSettings("general");

                if (fs.existsSync(path.join(server.stacksDir, "global.env"))) {
                    data.globalENV = fs.readFileSync(path.join(server.stacksDir, "global.env"), "utf-8");
                } else {
                    data.globalENV = "# VARIABLE=value #comment";
                }

                callback({
                    ok: true,
                    data: data,
                });

            } catch (e) {
                if (e instanceof Error) {
                    callback({
                        ok: false,
                        msg: e.message,
                    });
                }
            }
        });

        socket.on("setSettings", async (rawData, currentPassword, callback) => {
            try {
                checkLogin(socket);

                const data = validate(settingsSchema, rawData);

                // If currently is disabled auth, don't need to check
                // Disabled Auth + Want to Disable Auth => No Check
                // Disabled Auth + Want to Enable Auth => No Check
                // Enabled Auth + Want to Disable Auth => Check!!
                // Enabled Auth + Want to Enable Auth => No Check
                const currentDisabledAuth = await Settings.get("disableAuth");
                if (!currentDisabledAuth && data.disableAuth) {
                    await doubleCheckPassword(socket, currentPassword);
                }
                // Handle global.env
                if (data.globalENV && data.globalENV != "# VARIABLE=value #comment") {
                    await fsAsync.writeFile(path.join(server.stacksDir, "global.env"), data.globalENV);
                } else {
                    await fsAsync.rm(path.join(server.stacksDir, "global.env"), {
                        recursive: true,
                        force: true
                    });
                }
                delete data.globalENV;

                await Settings.setSettings("general", data);

                callback({
                    ok: true,
                    msg: "Saved"
                });

                server.sendInfo(socket);

            } catch (e) {
                if (e instanceof Error) {
                    callback({
                        ok: false,
                        msg: e.message,
                    });
                }
            }
        });

        // Disconnect all other socket clients of the user
        socket.on("disconnectOtherSocketClients", async () => {
            try {
                checkLogin(socket);
                server.disconnectAllSocketClients(socket.userID, socket.id);
            } catch (e) {
                if (e instanceof Error) {
                    log.warn("disconnectOtherSocketClients", e.message);
                }
            }
        });

        // composerize
        socket.on("composerize", async (dockerRunCommand : unknown, callback) => {
            try {
                checkLogin(socket);

                const command = validate(composerizeSchema, dockerRunCommand);

                // Option: 'latest' | 'v2x' | 'v3x'
                let composeTemplate = composerize(command, "", "latest");

                // Remove the first line "name: <your project name>"
                composeTemplate = composeTemplate.split("\n").slice(1).join("\n");

                callback({
                    ok: true,
                    composeTemplate,
                });
            } catch (e) {
                callbackError(e, callback);
            }
        });
    }

    async login(username : string, password : string) : Promise<User | null> {
        if (typeof username !== "string" || typeof password !== "string") {
            return null;
        }

        const user = await R.findOne("user", " username = ? AND active = 1 ", [
            username,
        ]) as User;

        if (user && verifyPassword(password, user.password)) {
            // Upgrade the hash to bcrypt
            if (needRehashPassword(user.password)) {
                await R.exec("UPDATE `user` SET password = ? WHERE id = ? ", [
                    generatePasswordHash(password),
                    user.id,
                ]);
            }
            return user;
        }

        return null;
    }
}
