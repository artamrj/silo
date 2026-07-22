import { SiloServer } from "./silo-server";
import { SiloSocket } from "./utils/socket";

export abstract class SocketHandler {
    abstract create(socket : SiloSocket, server : SiloServer): void;
}
