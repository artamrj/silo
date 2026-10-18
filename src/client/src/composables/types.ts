/**
 * Shape of a stack as sent by the server's `toSimpleJSON()` (`src/server/stack.ts`).
 * Only the fields the client reads are declared.
 */
export interface StackMeta {
    name: string;
    status: number;
    isManagedBySilo: boolean;
    composeFileName?: string;
}

/** Payload of the `info` socket event. */
export interface ServerInfo {
    version?: string;
    isContainer?: boolean;
    primaryHostname?: string | null;
}

/** One `docker stats` row for a running container. */
export interface DockerStatEntry {
    Name : string;
    CPUPerc : string;
    MemUsage : string;
    MemPerc : string;
    NetIO : string;
    BlockIO : string;
}

/** One container status row inside a stack's `serviceStatusList` payload. */
export interface ServiceStatus {
    name : string;
    status : string;
}
