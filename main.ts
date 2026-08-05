/*
    Main entry point for the server
*/

import { mkdir } from "node:fs/promises";
import { getServerContext } from "servercontext";

/**
 * Main entry point for the server
 */
export async function main() {
    const serverContext = await getServerContext();
    const server = serverContext.server;
    const configRecord = serverContext.config;
    const host = configRecord.server.data.server.host;
    const port = configRecord.server.data.server.port;
    serverContext.commandRegistry.scanFolder("src/commands/builtin");
    await mkdir("commands", { recursive: true });
    serverContext.commandRegistry.scanFolder("commands");
    server.start(host, port);
    if (configRecord.server.data.heartbeat.enabled) {
        serverContext.heartbeat.start();
    }
}
if (import.meta.main) {
    main();
}
