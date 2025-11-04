import Player from "/player/player.ts";
import type { Connection } from "/networking/connection.ts";
import type { PacketData } from "./packetdata.ts";
import type World from "/data/worlds/world.ts";
import Entity from "/entities/entity.ts";
export const criterias = {
  sameWorld: (source: Entity | World) => {
    return (target: Connection): boolean => {
      if (source instanceof Entity) {
        return new Boolean(
          source.world &&
            target.player?.entity?.world &&
            target.player?.entity?.world === source.world,
        ).valueOf();
      }
      return target.player?.entity?.world === source;
    };
  },
  notSelf: (source?: Connection) => {
    return (target: Connection) => {
      return new Boolean(target && source && target !== source).valueOf();
    };
  },
};

/**
 * Combine multiple criteria into a single criteria
 * @param criteria The criteria to combine
 * @returns The combined criteria
 */
export function combineCriteria(
  ...criteria: ((target: Connection) => boolean)[]
): (target: Connection) => boolean {
  return (target: Connection) => {
    for (const crit of criteria) {
      if (!crit(target)) {
        return false;
      }
    }
    return true;
  };
}

export const modifiers = {
  selfId: <T extends { entityId: number }>(source: Player) => {
    return (data: Omit<T, "id">, target: Connection) => {
      if (target.player && source && target.player === source) {
        return { ...data, entityId: -1 };
      }
      return data;
    };
  },
};

/**
 * Apply multiple modifiers to a packet data
 * @param modifiers The modifiers to apply
 * @returns The combined modifier
 */
export function combineModifiers<T extends PacketData>(
  ...modifiers: ((data: T, target: Connection) => T)[]
): (data: T, target: Connection) => T {
  return (data: T, target: Connection) => {
    for (const mod of modifiers) {
      data = mod(data, target);
    }
    return data;
  };
}
