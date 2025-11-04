/*
    Simple logger factory
*/

import pino from "pino";
import pinoCaller from "pino-caller";
import PinoPretty from "pino-pretty";
import * as pathLib from "node:path";

/**
 * Create a simple logger
 * @param name The name of the logger
 * @returns The logger
 */
export function getSimpleLogger(name?: string) {
  const level = Deno.env.get("LOG_LEVEL")?.toLowerCase() || "info";
  const debugEnv = Deno.env.get("DEBUG");
  const debug = debugEnv !== undefined &&
    debugEnv.toLowerCase() !== "false" &&
    debugEnv !== "0" &&
    debugEnv !== "";
  if (!(level in pino.levels.values)) {
    throw new Error(`Invalid log level: ${level}`);
  }
  const pinoLogger = pino.pino(
    {
      name,
      level: level,
    },
    pino.multistream([
      {
        stream: PinoPretty({
          sync: false,
          colorize: true,
          destination: 2,
        }),
        level: level,
      },
    ]),
  );
  const logger = debug
    ? pinoCaller.pinoCaller(pinoLogger, {
      relativeTo: pathLib.dirname(Deno.mainModule.replace("file://", "")),
    })
    : pinoLogger;
  return logger;
}
