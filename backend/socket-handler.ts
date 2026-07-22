import { SiloServer } from "./silo-server";
import { SiloSocket } from "./util-server";

export abstract class SocketHandler {
    abstract create(socket : SiloSocket, server : SiloServer): void;
}
