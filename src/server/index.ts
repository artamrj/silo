import { SiloServer } from "./silo-server";
import { log } from "./log";

log.info("server", "Welcome to silo!");
const server = new SiloServer();
await server.serve();
import "../shared/dayjs";
