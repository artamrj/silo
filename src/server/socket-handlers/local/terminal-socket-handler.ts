import { SiloServer } from "../../silo-server";
import { callbackError, callbackResult, checkLogin, SiloSocket, ValidationError } from "../../utils/socket";
import { log } from "../../log";
import { InteractiveTerminal, MainTerminal, Terminal } from "../../terminal";
import { Stack } from "../../stack";
import { SocketHandler } from "../../socket-handler";
import { terminalInputSchema, terminalResizeSchema, interactiveTerminalSchema, nonEmptyString, stackNameSchema } from "../../../shared/schemas";
import { validate } from "../../utils/socket";

export class TerminalSocketHandler extends SocketHandler {
    create(socket : SiloSocket, server : SiloServer) {

        socket.on("terminalInput", async (terminalName : unknown, cmd : unknown, callback) => {
            try {
                checkLogin(socket);

                const input = validate(terminalInputSchema, { terminalName,
                    command: cmd });

                let terminal = Terminal.getTerminal(input.terminalName);
                if (terminal instanceof InteractiveTerminal) {
                    //log.debug("terminalInput", "Terminal found, writing to terminal.");
                    terminal.write(input.command);
                    callbackResult({
                        ok: true,
                    }, callback);
                } else {
                    throw new Error("Terminal not found or it is not a Interactive Terminal.");
                }
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // Main Terminal
        socket.on("mainTerminal", async (_terminalName : unknown, callback) => {
            try {
                checkLogin(socket);

                // Throw an error if console is not enabled
                if (!server.config.enableConsole) {
                    throw new ValidationError("Console is not enabled.");
                }

                // TODO: Reset the name here, force one main terminal for now
                const terminalName = "console";

                log.debug("mainTerminal", "Terminal name: " + terminalName);

                let terminal = Terminal.getTerminal(terminalName);

                if (!terminal) {
                    terminal = new MainTerminal(server, terminalName);
                    terminal.rows = 50;
                    log.debug("mainTerminal", "Terminal created");
                }

                terminal.join(socket);
                terminal.start();

                callbackResult({
                    ok: true,
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // Check if MainTerminal is enabled
        socket.on("checkMainTerminal", async (callback) => {
            try {
                checkLogin(socket);
                callbackResult({
                    ok: server.config.enableConsole,
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // Interactive Terminal for containers
        socket.on("interactiveTerminal", async (stackName : unknown, serviceName : unknown, shell : unknown, callback) => {
            try {
                checkLogin(socket);

                const input = validate(interactiveTerminalSchema, {
                    stackName,
                    serviceName,
                    shell,
                });

                log.debug("interactiveTerminal", "Stack name: " + input.stackName);
                log.debug("interactiveTerminal", "Service name: " + input.serviceName);

                // Get stack
                const stack = await Stack.getStack(server, input.stackName);
                stack.joinContainerTerminal(socket, input.serviceName, input.shell);

                callbackResult({
                    ok: true,
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // Join Output Terminal
        socket.on("terminalJoin", async (terminalName : unknown, callback) => {
            if (typeof(callback) !== "function") {
                log.debug("console", "Callback is not a function.");
                return;
            }

            try {
                checkLogin(socket);
                const validatedName = validate(nonEmptyString, terminalName);

                let buffer : string = Terminal.getTerminal(validatedName)?.getBuffer() ?? "";

                if (!buffer) {
                    log.debug("console", "No buffer found.");
                }

                callback({
                    ok: true,
                    buffer,
                });
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // Leave Combined Terminal
        socket.on("leaveCombinedTerminal", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);

                const validatedName = validate(stackNameSchema, stackName);

                log.debug("leaveCombinedTerminal", "Stack name: " + validatedName);

                const stack = await Stack.getStack(server, validatedName);
                await stack.leaveCombinedTerminal(socket);

                callbackResult({
                    ok: true,
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // Resize Terminal
        socket.on("terminalResize", async (terminalName: unknown, rows: unknown, cols: unknown) => {
            log.info("terminalResize", `Terminal: ${terminalName}`);
            try {
                checkLogin(socket);
                const input = validate(terminalResizeSchema, { terminalName,
                    rows,
                    columns: cols });

                let terminal = Terminal.getTerminal(input.terminalName);

                // log.info("terminal", terminal);
                if (terminal instanceof Terminal) {
                    //log.debug("terminalInput", "Terminal found, writing to terminal.");
                    terminal.rows = input.rows;
                    terminal.cols = input.columns;
                } else {
                    throw new Error(`${terminalName} Terminal not found.`);
                }
            } catch (e) {
                log.debug("terminalResize",
                        // Added to prevent the lint error when adding the type
                        // and ts type checker saying type is unknown.
                        // @ts-ignore
                        `Error on ${terminalName}: ${e.message}`
                );
            }
        });
    }
}
