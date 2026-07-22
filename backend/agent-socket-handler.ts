import { SiloServer } from "./silo-server";
import { AgentSocket } from "../common/agent-socket";
import { SiloSocket } from "./util-server";

export abstract class AgentSocketHandler {
    abstract create(socket : SiloSocket, server : SiloServer, agentSocket : AgentSocket): void;
}
