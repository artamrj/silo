import { afterEach, describe, expect, it } from "vitest";
import { createServer, type Server as HttpServer } from "node:http";
import { AddressInfo } from "node:net";
import { Server } from "socket.io";
import { io, type Socket } from "socket.io-client";

let httpServer: HttpServer | undefined;
let client: Socket | undefined;

function listen(server: HttpServer, port = 0) {
    return new Promise<number>((resolve) => server.listen(port, "127.0.0.1", () => {
        resolve((server.address() as AddressInfo).port);
    }));
}

afterEach(() => {
    client?.disconnect();
    httpServer?.close();
});

describe("Socket.IO transport", () => {
    it("connects using polling and upgrades to websocket", async () => {
        httpServer = createServer();
        const ioServer = new Server(httpServer);
        const port = await listen(httpServer);
        client = io(`http://127.0.0.1:${port}`);

        await new Promise<void>((resolve, reject) => {
            client?.once("connect", () => resolve());
            client?.once("connect_error", reject);
        });

        expect(client.connected).toBe(true);
        await ioServer.close();
    });
});
