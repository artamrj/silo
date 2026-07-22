export interface SocketResult<T = undefined> {
    ok?: boolean;
    msg?: string;
    msgi18n?: boolean;
    type?: string;
    data?: T;
}

export type SocketCallback<T extends object = object> = (result: SocketResult & T) => void;

export interface ServerToClientEvents {
    // Socket.IO requires a catch-all signature while legacy events are migrated.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [event: string]: (...args: any[]) => void;
    info: (info: {
        version?: string;
        isContainer?: boolean;
        primaryHostname?: string | null;
    }) => void;
    setup: () => void;
    autoLogin: () => void;
    refresh: () => void;
    terminalWrite: (terminalName: string, data: string) => void;
    terminalExit: (terminalName: string, exitCode: number) => void;
    stackList: (result: SocketResult & { stackList: Record<string, unknown> }) => void;
    stackStatusList: (result: SocketResult & { stackStatusList: Record<string, unknown> }) => void;
    deploymentEvent: (event: { stackName: string; operation: string; status: string; message: string; at: string }) => void;
}

/**
 * Socket.IO is retained for streaming and push events. Request/response APIs are
 * moving to tRPC; this map documents the events that remain on the socket.
 */
export interface ClientToServerEvents {
    // Socket.IO requires a catch-all signature while legacy events are migrated.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [event: string]: (...args: any[]) => void;
    login: (data: { username: string; password: string; token?: string }, callback: (result: SocketResult & { token?: string; tokenRequired?: boolean }) => void) => void;
    loginByToken: (token: string, callback: SocketCallback<{ token?: string }>) => void;
    terminalInput: (terminalName: string, command: string, callback?: SocketCallback) => void;
    terminalResize: (terminalName: string, rows: number, columns: number) => void;
    terminalJoin: (terminalName: string, callback: SocketCallback<{ buffer?: string }>) => void;
    requestStackList: (callback: SocketCallback) => void;
}
