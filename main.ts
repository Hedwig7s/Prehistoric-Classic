/*
    Main entry point for the server
*/

import { exists } from "@std/fs/exists";
import { getServerContext } from "/servercontext.ts";

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
  if (!(await exists("commands"))) {
    await Deno.mkdir("commands");
  }
  serverContext.commandRegistry.scanFolder("commands");
  server.start(host, port);
  if (configRecord.server.data.heartbeat.enabled) {
    serverContext.heartbeat.start();
  }
}
if (import.meta.main) {
  main();
}
