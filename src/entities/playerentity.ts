/*
    Wrapper around entity for handling specific player entity logic
*/
import type World from "/data/worlds/world.ts";
import type EntityPosition from "/datatypes/entityposition.ts";
import Entity, { type EntityOptions } from "/entities/entity.ts";
import { Broadcaster } from "/networking/packet/broadcaster.ts";
import {
  combineCriteria,
  criterias,
} from "/networking/packet/broadcasterutil.ts";
import { PacketIds } from "/networking/packet/packet.ts";
import type {
  DespawnPlayerPacketData,
  PositionAndOrientationPacketData,
} from "/networking/packet/packetdata.ts";
import Player from "/player/player.ts";

/**
 * Options for creating a player entity
 */
export interface PlayerEntityOptions extends EntityOptions {
  /** The player associated with this entity */
  player: Player;
}

/**
 * Wrapper around entity for handling specific player entity logic
 */
export class PlayerEntity extends Entity {
  /** The player associated with this entity */
  public readonly player: Player;
  constructor(options: PlayerEntityOptions) {
    super(options);
    this.player = options.player;
  }
  public override async spawn(world: World): Promise<void> {
    super.spawn(world);
    if (!this.player.connection) return;
    await this.player.spawn();
  }
  public override move(
    position: EntityPosition,
    broadcast = true,
    replicatedMovement = false,
  ) {
    super.move(position, this.player.connection == undefined && broadcast);
    if (!broadcast || !this.player.connection || !this.server) return;
    if (!this.world) return;
    let criteria;
    if (replicatedMovement) {
      criteria = combineCriteria(
        criterias.sameWorld(this),
        criterias.notSelf(this.player.connection),
      );
    } else criteria = criterias.sameWorld(this);
    const broadcaster = new Broadcaster<PositionAndOrientationPacketData>({
      criteria: criteria,
      packetId: PacketIds.PositionAndOrientation,
      server: this.server,
    });
    const { x, y, z, yaw, pitch } = this.position;
    broadcaster.broadcast({
      entityId: this.worldEntityId,
      x,
      y,
      z,
      yaw,
      pitch,
    });
  }
  public override despawn(broadcast = true) {
    if (broadcast && this.world && this.server) {
      const broadcaster = new Broadcaster<DespawnPlayerPacketData>({
        server: this.server,
        packetId: PacketIds.DespawnPlayer,
        criteria: combineCriteria(
          criterias.sameWorld(this),
          criterias.notSelf(this.player.connection),
        ),
      });
      broadcaster.broadcast({ entityId: this.worldEntityId });
    }
    super.despawn(false);
  }
}
export default PlayerEntity;
