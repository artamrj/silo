import { computed, reactive, ref } from "vue";
import { io, type Socket } from "socket.io-client";
import type { Terminal } from "@xterm/xterm";
import { i18n } from "../i18n";
import { useToast } from "./useToast";
import type { DeploymentEvent, ServerInfo, StackMeta } from "./types";
import type { ClientToServerEvents, ServerToClientEvents, SocketResult } from "../../../shared/socket-events";

/**
 * Decode a JWT payload without verifying it. Only used to read the username for
 * display; the server remains the source of truth for authentication.
 * @param token The JWT string
 * @returns The decoded payload, or undefined when the token is malformed
 */
function jwtDecode(token : string) : { username? : string } | undefined {
    try {
        const payload = token.split(".")[1];
        if (!payload) {
            return undefined;
        }
        const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
        return JSON.parse(decoded);
    } catch {
        return undefined;
    }
}

// Module-level state: every caller of `useSocket()` shares one socket, one
// terminal registry and one copy of the auth/connection state — the same
// behaviour the old root mixin provided, without the component-instance coupling.
let socket : Socket<ServerToClientEvents, ClientToServerEvents> | undefined;
const terminalMap : Map<string, Terminal> = new Map();

const socketIO = reactive({
    token: null as string | null,
    firstConnect: true,
    connected: false,
    connectCount: 0,
    initedSocketIO: false,
    connectionErrorMsg: "",
    showReverseProxyGuide: true,
    connecting: false,
});

const info = ref<ServerInfo>({});
const remember = ref(localStorage.getItem("remember") !== "0");
const loggedIn = ref(false);
const allowLoginDialog = ref(false);
const username = ref<string | null>(null);
const composeTemplate = ref("");
const envTemplate = ref("");
const stackList = ref<Record<string, StackMeta>>({});
const stackListLoaded = ref(false);

/**
 * Rolling log of `deploymentEvent` pushes, newest first. Lives here (not in a
 * page) so the activity feed keeps history across route changes.
 */
const deploymentEvents = ref<DeploymentEvent[]>([]);
const DEPLOYMENT_EVENT_LIMIT = 50;

// Keep the refusal message in sync with the active locale.
socketIO.connectionErrorMsg = `${i18n.global.t("Cannot connect to the socket server.")} ${i18n.global.t("Reconnecting...")}`;

const completeStackList = computed(() => stackList.value);

const usernameFirstChar = computed(() => {
    if (typeof username.value == "string" && username.value.length >= 1) {
        return username.value.charAt(0).toUpperCase();
    }
    return "🐬";
});

const frontendVersion = computed(() => FRONTEND_VERSION);

const isFrontendBackendVersionMatched = computed(() => {
    if (!info.value.version) {
        return true;
    }
    return info.value.version === frontendVersion.value;
});

/**
 * Shared socket/auth/stack state. Backed by module-level refs so it behaves like
 * a singleton store; call it from any component or composable.
 */
export function useSocket() {
    const { toastRes } = useToast();

    /**
     * The storage currently in use (local vs session, based on "remember").
     * @returns Current storage
     */
    function storage() : Storage {
        return remember.value ? localStorage : sessionStorage;
    }

    /**
     * Get payload of the stored JWT token.
     * @returns JWT payload, or undefined when unavailable
     */
    function getJWTPayload() : { username? : string } | undefined {
        const jwtToken = storage().getItem("token");

        if (jwtToken && jwtToken !== "autoLogin") {
            return jwtDecode(jwtToken);
        }
        return undefined;
    }

    function getSocket() : Socket<ServerToClientEvents, ClientToServerEvents> {
        if (!socket) {
            throw new Error("Socket not initialized");
        }
        return socket;
    }

    function emitServer(eventName : string, ...args : unknown[]) : void {
        // The typed emit signature is not expressible with a dynamic event name.
        (getSocket().emit as (event : string, ...rest : unknown[]) => void)(eventName, ...args);
    }

    /** Hook for subclasses to reset transient state; intentionally empty. */
    function clearData() : void {
        // no-op extension point
    }

    /** Hook run right after a successful login; intentionally empty. */
    function afterLogin() : void {
        // no-op extension point
    }

    /**
     * Log out of the web application.
     * @returns {void}
     */
    function logout() : void {
        storage().removeItem("token");
        socketIO.token = null;
        loggedIn.value = false;
        username.value = null;
        clearData();
    }

    /**
     * Send request to log the user in.
     * @param user Username to log in with
     * @param password Password to log in with
     * @param token Two-factor token
     * @param callback Callback to call with the result
     * @returns {void}
     */
    function login(
        user : string,
        password : string,
        token : string,
        callback : (res : SocketResult & { token?: string; tokenRequired?: boolean }) => void
    ) : void {
        getSocket().emit("login", { username: user,
            password,
            token }, (res) => {
            if (res.tokenRequired) {
                callback(res);
            }

            if (res.ok) {
                storage().setItem("token", res.token ?? "");
                socketIO.token = res.token ?? null;
                loggedIn.value = true;
                username.value = getJWTPayload()?.username ?? null;

                afterLogin();

                // Trigger Chrome Save Password
                history.pushState({}, "", "");
            }

            callback(res);
        });
    }

    /**
     * Log in using a token.
     * @param token Token to log in with
     * @returns {void}
     */
    function loginByToken(token : string) : void {
        getSocket().emit("loginByToken", token, (res) => {
            allowLoginDialog.value = true;

            if (!res.ok) {
                logout();
            } else {
                loggedIn.value = true;
                username.value = getJWTPayload()?.username ?? null;
                afterLogin();
            }
        });
    }

    /**
     * Register a terminal so `terminalWrite` events can find it.
     * @param terminalName Server-side terminal name
     * @param terminal The xterm instance
     * @returns {void}
     */
    function bindTerminal(terminalName : string, terminal : Terminal) : void {
        // Load terminal, get terminal screen
        emitServer("terminalJoin", terminalName, (res : SocketResult & { buffer?: string }) => {
            if (res.ok) {
                terminal.write(res.buffer ?? "");
                terminalMap.set(terminalName, terminal);
            } else {
                toastRes(res);
            }
        });
    }

    /**
     * Drop a terminal from the registry.
     * @param terminalName Server-side terminal name
     * @returns {void}
     */
    function unbindTerminal(terminalName : string) : void {
        terminalMap.delete(terminalName);
    }

    /**
     * Initialize connection to the socket server. Idempotent.
     * @returns {void}
     */
    function initSocketIO() : void {
        // No need to re-init
        if (socketIO.initedSocketIO) {
            return;
        }

        socketIO.initedSocketIO = true;
        const connectingMsgTimeout = setTimeout(() => {
            socketIO.connecting = true;
        }, 1500);

        // Always use the page origin. Vite proxies /socket.io in development,
        // and production serves the client and Socket.IO from one server.
        socket = io();

        socket.on("connect", () => {
            console.log("Connected to the socket server");

            clearTimeout(connectingMsgTimeout);
            socketIO.connecting = false;

            socketIO.connectCount++;
            socketIO.connected = true;
            socketIO.showReverseProxyGuide = false;
            const token = storage().getItem("token");

            if (token) {
                if (token !== "autoLogin") {
                    console.log("Logging in by token");
                    loginByToken(token);
                } else {
                    // Timeout if it is not actually auto login
                    setTimeout(() => {
                        if (!loggedIn.value) {
                            allowLoginDialog.value = true;
                            storage().removeItem("token");
                        }
                    }, 5000);
                }
            } else {
                allowLoginDialog.value = true;
            }

            socketIO.firstConnect = false;
        });

        socket.on("disconnect", () => {
            console.log("disconnect");
            socketIO.connectionErrorMsg = i18n.global.t("Lost connection to the socket server. Reconnecting...");
            socketIO.connected = false;
        });

        socket.on("connect_error", (err) => {
            console.error(`Failed to connect to the backend. Socket.io connect_error: ${err.message}`);
            socketIO.connectionErrorMsg = `${i18n.global.t("Cannot connect to the socket server.")} [${err}] ${i18n.global.t("reconnecting...")}`;
            socketIO.showReverseProxyGuide = true;
            socketIO.connected = false;
            socketIO.firstConnect = false;
            socketIO.connecting = false;
        });

        // Custom Events

        socket.on("info", (newInfo) => {
            info.value = newInfo;
        });

        socket.on("autoLogin", () => {
            loggedIn.value = true;
            storage().setItem("token", "autoLogin");
            socketIO.token = "autoLogin";
            allowLoginDialog.value = false;
            afterLogin();
        });

        socket.on("setup", () => {
            console.log("setup");
            // Lazy import avoids a static cycle between the composable and the router.
            void import("../router").then(({ router }) => router.push("/setup"));
        });

        socket.on("terminalWrite", (terminalName, data) => {
            const terminal = terminalMap.get(terminalName);
            if (!terminal) {
                return;
            }
            terminal.write(data);
        });

        socket.on("stackList", (res) => {
            if (res.ok) {
                stackList.value = res.stackList as Record<string, StackMeta>;
            }
            stackListLoaded.value = true;
        });

        socket.on("deploymentEvent", (event) => {
            deploymentEvents.value = [ event, ...deploymentEvents.value ].slice(0, DEPLOYMENT_EVENT_LIMIT);
        });

        socket.on("refresh", () => {
            location.reload();
        });
    }

    return {
        // state
        socketIO,
        info,
        remember,
        loggedIn,
        allowLoginDialog,
        username,
        composeTemplate,
        envTemplate,
        stackList,
        stackListLoaded,
        deploymentEvents,
        // computed
        completeStackList,
        usernameFirstChar,
        frontendVersion,
        isFrontendBackendVersionMatched,
        // methods
        initSocketIO,
        storage,
        getSocket,
        emitServer,
        getJWTPayload,
        login,
        loginByToken,
        logout,
        clearData,
        afterLogin,
        bindTerminal,
        unbindTerminal,
    };
}
