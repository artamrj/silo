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
    deploymentEvent: (event: { stackName: string; operation: string; status: string; message: string; at: string }) => void;
}

/**
 * Socket.IO carries all client/server communication: streaming output, push
 * events and request/response calls.
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
    needSetup: (callback: (needSetup: boolean) => void) => void;
    composerize: (command: string, callback: (result: SocketResult & { composeTemplate?: string }) => void) => void;
}
