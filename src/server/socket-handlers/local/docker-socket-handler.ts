import { SocketHandler } from "../../socket-handler";
import { SiloServer } from "../../silo-server";
import { callbackError, callbackResult, checkLogin, SiloSocket, ValidationError } from "../../utils/socket";
import { Stack } from "../../stack";
import { maintenanceSettingsSchema, selectedServiceUpdateSchema, stackDeleteSchema, stackMetadataSchema, stackSaveSchema } from "../../../shared/schemas";
import { validate } from "../../utils/socket";

export class DockerSocketHandler extends SocketHandler {
    create(socket : SiloSocket, server : SiloServer) {

        socket.on("deployStack", async (name : unknown, composeYAML : unknown, composeENV : unknown, isAdd : unknown, callback) => {
            try {
                checkLogin(socket);
                const stack = await this.saveStack(server, name, composeYAML, composeENV, isAdd);
                await stack.deploy(socket);
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

                callbackResult({
                    ok: true,
                    data: await server.maintenance.exportStack(stackName),
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

        socket.on("checkStackUpdates", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);
                if (typeof stackName !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }
                const stack = await Stack.getStack(server, stackName);
                const updatesAvailable = await stack.checkImageUpdates();
                callbackResult({ ok: true,
                    updatesAvailable }, callback);
                server.sendStackList();
            } catch (e) {
                callbackError(e, callback);
            }
        });

        socket.on("updateSelectedServices", async (data : unknown, callback) => {
            try {
                checkLogin(socket);
                const input = validate(selectedServiceUpdateSchema, data);
                const stack = await Stack.getStack(server, input.name);
                await stack.updateServices(socket, input.services);
                callbackResult({ ok: true,
                    msg: "Updated selected services" }, callback);
                server.sendStackList();
            } catch (e) {
                callbackError(e, callback);
            }
        });

        socket.on("saveStackMetadata", async (data : unknown, callback) => {
            try {
                checkLogin(socket);
                const input = validate(stackMetadataSchema, data);
                const stack = await Stack.getStack(server, input.name);
                const metadata = await stack.getMetadata();
                await stack.saveMetadata({ ...metadata,
                    tags: input.tags,
                    template: input.template });
                callbackResult({ ok: true,
                    msg: "Saved stack metadata" }, callback);
                server.sendStackList();
            } catch (e) {
                callbackError(e, callback);
            }
        });

        socket.on("getMaintenanceSettings", async (callback) => {
            try {
                checkLogin(socket);
                callbackResult({ ok: true,
                    settings: await server.maintenance.getSettings() }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        socket.on("saveMaintenanceSettings", async (data : unknown, callback) => {
            try {
                checkLogin(socket);
                const settings = validate(maintenanceSettingsSchema, data);
                await server.maintenance.saveSettings(settings);
                callbackResult({ ok: true,
                    msg: "Saved maintenance settings" }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        socket.on("templateCatalog", async (callback) => {
            try {
                checkLogin(socket);
                callbackResult({ ok: true,
                    templates: await server.maintenance.templates() }, callback);
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
