import { SocketHandler } from "../../socket-handler";
import { SiloServer } from "../../silo-server";
import { callbackError, callbackResult, checkLogin, SiloSocket, ValidationError } from "../../utils/socket";
import { Stack } from "../../stack";
import { stackDeleteSchema, stackRollbackSchema, stackSaveSchema } from "../../../shared/schemas";
import { R } from "redbean-node";
import { validate } from "../../utils/socket";

export class DockerSocketHandler extends SocketHandler {
    create(socket : SiloSocket, server : SiloServer) {

        socket.on("deployStack", async (name : unknown, composeYAML : unknown, composeENV : unknown, isAdd : unknown, callback) => {
            try {
                checkLogin(socket);
                const stack = await this.saveStack(server, name, composeYAML, composeENV, isAdd);
                await stack.deploy(socket, await this.getUsername(socket));
                server.sendStackList();
                callbackResult({
                    ok: true,
                    msg: "Deployed",
                    msgi18n: true,
                }, callback);
                stack.joinCombinedTerminal(socket);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        socket.on("saveStack", async (name : unknown, composeYAML : unknown, composeENV : unknown, isAdd : unknown, callback) => {
            try {
                checkLogin(socket);
                await this.saveStack(server, name, composeYAML, composeENV, isAdd);
                callbackResult({
                    ok: true,
                    msg: "Saved",
                    msgi18n: true,
                }, callback);
                server.sendStackList();
            } catch (e) {
                callbackError(e, callback);
            }
        });

        socket.on("deleteStack", async (name : unknown, optionsOrCallback : unknown, maybeCallback?: unknown) => {
            const callback = typeof optionsOrCallback === "function" ? optionsOrCallback : maybeCallback;
            try {
                checkLogin(socket);
                const options = typeof optionsOrCallback === "function" ? { name } : { name,
                    ...(typeof optionsOrCallback === "object" && optionsOrCallback ? optionsOrCallback : {}) };
                const input = validate(stackDeleteSchema, options);

                if (input.deleteData && input.confirmation !== `DELETE ${input.name}`) {
                    throw new ValidationError(`Type DELETE ${input.name} to confirm stack data deletion`);
                }

                const stack = await Stack.getStack(server, input.name);

                try {
                    await stack.delete(socket, input.deleteData);
                } catch (e) {
                    server.sendStackList();
                    throw e;
                }

                server.sendStackList();
                callbackResult({
                    ok: true,
                    msg: input.deleteData ? "Deleted stack and data" : "Stopped stack. Data was preserved.",
                    msgi18n: false,
                }, callback);

            } catch (e) {
                callbackError(e, callback);
            }
        });

        socket.on("exportStack", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                const stack = await Stack.getStack(server, stackName);
                callbackResult({
                    ok: true,
                    data: stack.exportFiles(),
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        socket.on("getStack", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                const stack = await Stack.getStack(server, stackName);

                if (stack.isManagedBySilo) {
                    stack.joinCombinedTerminal(socket);
                }

                callbackResult({
                    ok: true,
                    stack: await stack.toJSON(""),
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        socket.on("getStackRevisions", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);
                if (typeof stackName !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }
                const stack = await Stack.getStack(server, stackName);
                callbackResult({
                    ok: true,
                    revisions: await stack.listRevisions(),
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        socket.on("rollbackStack", async (name : unknown, revisionId : unknown, confirmation : unknown, callback) => {
            try {
                checkLogin(socket);
                const input = validate(stackRollbackSchema, { name,
                    revisionId,
                    confirmation });
                if (input.confirmation !== `ROLLBACK ${input.name}`) {
                    throw new ValidationError(`Type ROLLBACK ${input.name} to confirm rollback`);
                }
                const stack = await Stack.getStack(server, input.name);
                await stack.rollback(socket, input.revisionId, await this.getUsername(socket));
                server.sendStackList();
                callbackResult({ ok: true,
                    msg: "Rolled back",
                    msgi18n: false }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // requestStackList
        socket.on("requestStackList", async (callback) => {
            try {
                checkLogin(socket);
                server.sendStackList();
                callbackResult({
                    ok: true,
                    msg: "Updated",
                    msgi18n: true,
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // startStack
        socket.on("startStack", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                const stack = await Stack.getStack(server, stackName);
                await stack.start(socket);
                callbackResult({
                    ok: true,
                    msg: "Started",
                    msgi18n: true,
                }, callback);
                server.sendStackList();

                stack.joinCombinedTerminal(socket);

            } catch (e) {
                callbackError(e, callback);
            }
        });

        // stopStack
        socket.on("stopStack", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                const stack = await Stack.getStack(server, stackName);
                await stack.stop(socket);
                callbackResult({
                    ok: true,
                    msg: "Stopped",
                    msgi18n: true,
                }, callback);
                server.sendStackList();

                stack.leaveCombinedTerminal(socket);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // restartStack
        socket.on("restartStack", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                const stack = await Stack.getStack(server, stackName);
                await stack.restart(socket);
                callbackResult({
                    ok: true,
                    msg: "Restarted",
                    msgi18n: true,
                }, callback);
                server.sendStackList();
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // updateStack
        socket.on("updateStack", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                const stack = await Stack.getStack(server, stackName);
                await stack.update(socket);
                callbackResult({
                    ok: true,
                    msg: "Updated",
                    msgi18n: true,
                }, callback);
                server.sendStackList();
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // down stack
        socket.on("downStack", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                const stack = await Stack.getStack(server, stackName);
                await stack.down(socket);
                callbackResult({
                    ok: true,
                    msg: "Downed",
                    msgi18n: true,
                }, callback);
                server.sendStackList();
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // Services status
        socket.on("serviceStatusList", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                const stack = await Stack.getStack(server, stackName, true);
                const serviceStatusList = Object.fromEntries(await stack.getServiceStatusList());
                callbackResult({
                    ok: true,
                    serviceStatusList,
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // Docker stats
        socket.on("dockerStats", async (callback) => {
            try {
                checkLogin(socket);

                const dockerStats = Object.fromEntries(await server.getDockerStats());
                callbackResult({
                    ok: true,
                    dockerStats,
                }, callback);
                server.sendStackList();
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // Start a service
        socket.on("startService", async (stackName: unknown, serviceName: unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof (stackName) !== "string" || typeof (serviceName) !== "string") {
                    throw new ValidationError("Stack name and service name must be strings");
                }

                const stack = await Stack.getStack(server, stackName);
                await stack.startService(socket, serviceName);
                stack.joinCombinedTerminal(socket); // Ensure the combined terminal is joined
                callbackResult({
                    ok: true,
                    msg: "Service " + serviceName + " started"
                }, callback);
                server.sendStackList();
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // Stop a service
        socket.on("stopService", async (stackName: unknown, serviceName: unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof (stackName) !== "string" || typeof (serviceName) !== "string") {
                    throw new ValidationError("Stack name and service name must be strings");
                }

                const stack = await Stack.getStack(server, stackName);
                await stack.stopService(socket, serviceName);
                callbackResult({
                    ok: true,
                    msg: "Service " + serviceName + " stopped"
                }, callback);
                server.sendStackList();
            } catch (e) {
                callbackError(e, callback);
            }
        });

        socket.on("restartService", async (stackName: unknown, serviceName: unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof stackName !== "string" || typeof serviceName !== "string") {
                    throw new Error("Invalid stackName or serviceName");
                }

                const stack = await Stack.getStack(server, stackName, true);
                await stack.restartService(socket, serviceName);
                callbackResult({
                    ok: true,
                    msg: "Service " + serviceName + " restarted"
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // getExternalNetworkList
        socket.on("getDockerNetworkList", async (callback) => {
            try {
                checkLogin(socket);
                const dockerNetworkList = await server.getDockerNetworkList();
                callbackResult({
                    ok: true,
                    dockerNetworkList,
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });
    }

    async getUsername(socket: SiloSocket) : Promise<string> {
        const user = await R.findOne("user", " id = ? ", [ socket.userID ]) as { username?: string } | null;
        return user?.username ?? `user:${socket.userID}`;
    }

    async saveStack(server : SiloServer, name : unknown, composeYAML : unknown, composeENV : unknown, isAdd : unknown) : Promise<Stack> {
        // Check types
        const input = validate(stackSaveSchema, { name,
            composeYAML,
            composeENV,
            isAdd });

        const stack = new Stack(server, input.name, input.composeYAML, input.composeENV, false);
        await stack.save(input.isAdd);
        return stack;
    }

}
