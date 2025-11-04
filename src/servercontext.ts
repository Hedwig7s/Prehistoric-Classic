/*
    Type definitions for the server context, which is a collection of services and other objects that are used by the server
    Also provides a helper function for getting the server context
*/

import Config from "/data/config/config.ts";
import { DEFAULT_CONFIGS, PROTOCOLS } from "/data/configs/constants.ts";
import World from "/data/worlds/world.ts";
import WorldRegistry from "/data/worlds/worldregistry.ts";
import pathlib from "node:path";
import HWorldParser from "/data/worlds/parsers/hworld.ts";
import Vector3 from "/datatypes/vector3.ts";
import EntityPosition from "/datatypes/entityposition.ts";
import Server from "/networking/server.ts";
import { EntityRegistry } from "/entities/entityregistry.ts";
import type { Protocol } from "/networking/protocol/protocol.ts";
import { ServiceRegistry } from "/utility/serviceregistry.ts";
import { Chatroom } from "/chat/chatroom.ts";
import { PlayerRegistry } from "/player/playerregistry.ts";
import { Heartbeat } from "/networking/heartbeat.ts";
import { getSalt } from "/data/salt.ts";
import { CommandRegistry } from "/commands/commandregistry.ts";

/**
 * The configuration record, which contains all of the server's configuration objects
 */
export interface ConfigRecord {
  server: Config<typeof DEFAULT_CONFIGS.server>;
}

/**
 * The server context, which is a collection of services and other objects that are used by the server
 */
export interface ServerContext {
  worldRegistry: WorldRegistry;
  config: ConfigRecord;
  server: Server;
  entityRegistry: EntityRegistry;
  playerRegistry: PlayerRegistry;
  globalChatroom: Chatroom;
  protocols: Record<number, Protocol>;
  serviceRegistry: ServiceRegistry<ServiceMap>;
  commandRegistry: CommandRegistry;
  heartbeat: Heartbeat;
}

export type ServiceMap = Omit<ServerContext, "serviceRegistry">;

/**
 * Get the default configuration record containing the default server configuration
 * @returns The default configuration record
 */
export function getConfigRecord(): ConfigRecord {
  return {
    server: new Config({
      defaultConfig: DEFAULT_CONFIGS.server,
      name: "server",
      version: 1,
      autosave: true,
    }),
  };
}

/**
 * Get a default server context
 * @returns The server context
 */
export async function getServerContext(): Promise<ServerContext> {
  const serviceRegistry = new ServiceRegistry<ServiceMap>();
  const configRecord: ConfigRecord = getConfigRecord();
  for (const config of Object.values(configRecord)) {
    await config.load();
  }
  serviceRegistry.register("config", configRecord);
  const worldRegistry = new WorldRegistry({ autosave: true });
  serviceRegistry.register("worldRegistry", worldRegistry);
  const defaultWorld = await World.fromFileWithDefault(
    {
      filePath: pathlib.join(
        configRecord.server.data.worlds.worldDir,
        configRecord.server.data.worlds.defaultWorld + ".hworld",
      ),
      parserClass: HWorldParser,
      serverConfig: configRecord.server,
    },
    {
      name: configRecord.server.data.worlds.defaultWorld,
      size: new Vector3(100, 100, 100),
      spawn: new EntityPosition(0, 0, 0, 0, 0),
      serverConfig: configRecord.server,
    },
  );
  worldRegistry.setDefaultWorld(defaultWorld);

  const server = new Server(PROTOCOLS, serviceRegistry);
  serviceRegistry.register("server", server);
  const entityRegistry = new EntityRegistry();
  serviceRegistry.register("entityRegistry", entityRegistry);
  const globalChatroom = new Chatroom("Global");
  serviceRegistry.register("globalChatroom", globalChatroom);
  const playerRegistry = new PlayerRegistry();
  serviceRegistry.register("playerRegistry", playerRegistry);
  const heartbeat = new Heartbeat(
    await getSalt(32),
    serviceRegistry as ServiceRegistry, // FIXME: Shouldn't need to cast
    configRecord.server,
    configRecord.server.data.heartbeat.url,
  );
  serviceRegistry.register("heartbeat", heartbeat);
  serviceRegistry.register("protocols", PROTOCOLS);
  const commandRegistry = new CommandRegistry(serviceRegistry);
  serviceRegistry.register("commandRegistry", commandRegistry);

  const serverContext: ServerContext = {
    worldRegistry,
    config: configRecord,
    server,
    entityRegistry,
    protocols: PROTOCOLS,
    serviceRegistry,
    globalChatroom,
    playerRegistry,
    heartbeat,
    commandRegistry,
  };
  return serverContext;
}
