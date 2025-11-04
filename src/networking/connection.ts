/*
    Handles traffic between the server and the client
*/

import type { Protocol } from "/networking/protocol/protocol.ts";
import {
  type Packet,
  PacketIds,
  type ReceivablePacket,
} from "/networking/packet/packet.ts";
import type { Player } from "/player/player.ts";
import type pino from "pino";
import { getSimpleLogger } from "/utility/logger.ts";
import { ServiceRegistry } from "/utility/serviceregistry.ts";
import type { ServiceMap } from "/servercontext.ts";
import { EventEmitter } from "@denosaurs/event";
import { Buffer } from "@std/io";

/** An object defining how many of x has been seen since last checked */
interface Cooldown {
  count: number;
}

/** Events emitted by connections */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type ConnectionEvents = {
  close: [];
};

/**
 * Represents a connection to a client
 */
export class Connection {
  public closed = false;
  public protocol?: Protocol;
  public player?: Player;
  public readonly logger: pino.Logger;
  /** Incoming data */
  protected receivedBuffer: Buffer;
  /** Outgoing data */
  public packetCooldown: Cooldown = { count: 0 };
  public lastDataReceived = Date.now();
  public readonly emitter = new EventEmitter<ConnectionEvents>();
  /**
   * Creates a new connection
   * @param socket The Bun TCP socket to the client
   param id The unique identifier for this connection
   * @param protocols The available protocols
   * @param serviceRegistry Registry of services
   */
  constructor(
    public readonly socket: Deno.TcpConn,
    public readonly id: number,
    public readonly protocols: Record<number, Protocol>,
    public readonly serviceRegistry: ServiceRegistry<ServiceMap>,
  ) {
    this.logger = getSimpleLogger(`Connection ${id}`);

    this.receivedBuffer = new Buffer();

    setTimeout(() => {
      if (!this.protocol && !this.closed) {
        this.logger.warn("Handshake timeout");
        this.close();
      }
    }, 10000);
    const checkCooldown = setInterval(() => {
      if (this.closed) clearInterval(checkCooldown);
      if (this.packetCooldown.count > 50) {
        this.logger.warn("Packet flood detected");
        this.disconnectWithReason("Too much data!", 100);
      }
      this.packetCooldown.count = 0;
    }, 1000);

    const readBuffer = new Uint8Array(512);
    const readInterval = setInterval(async () => {
      if (this.closed) clearInterval(readInterval);
      this.checkSocket();
      const read = await this.socket.read(readBuffer).catch(
        (reason: Error) => {
          if (reason.message !== "operation canceled") {
            this.onError(reason);
          }
          clearInterval(readInterval);
          return 0;
        },
      );
      if (!read) {
        this.close();
        return;
      }
      if (read === 0) return;
      this.bufferIncoming(readBuffer.subarray(0, read));
      readBuffer.fill(0);
    }, 10);
  }

  /** Ensure the socket is still valid */
  checkSocket() {
    // FIXME: Check unknown
    if (Date.now() - this.lastDataReceived > 10000) {
      this.logger.warn("Connection timeout");
      this.disconnectWithReason("Connection timeout");
      return;
    }
  }

  /** Write data to the client */
  async write(data: Uint8Array) {
    if (this.closed) throw new Error("Connection was closed");
    await this.socket.write(data);
  }

  protected processingIncoming = false;

  /** Buffer incoming data from the client */
  bufferIncoming(data: Uint8Array) {
    this.lastDataReceived = Date.now();
    this.receivedBuffer.write(data);
    this.processIncoming().catch(this.onError.bind(this));
  }

  /** Process incoming data from the client */
  async processIncoming() {
    if (this.processingIncoming) return;
    this.processingIncoming = true;
    const requeue = (data: Uint8Array, retry = false) => {
      const flushed = this.receivedBuffer.bytes();
      this.receivedBuffer = new Buffer();
      if (flushed.length === 0) {
        if (retry) {
          this.processingIncoming = false;
          this.bufferIncoming(data);
        } else {
          this.receivedBuffer.write(data);
        }
        this.processingIncoming = false;
        return;
      }
      this.receivedBuffer.write(data);
      if (retry) {
        this.processingIncoming = false;
        this.bufferIncoming(flushed);
      } else {
        this.processingIncoming = false;
        this.receivedBuffer.write(flushed);
      }
    };
    const data = this.receivedBuffer.bytes();
    this.receivedBuffer = new Buffer();
    if (this.closed || data.byteLength === 0) {
      requeue(data);
      return;
    }

    const id = data[0];
    // Find protocol
    if (id === 0x00 && !this.protocol) {
      this.protocol = Object.values(this.protocols).find((p) =>
        p.checkIdentifier(data)
      );
      if (!this.protocol) throw new Error("Protocol not found");
    }

    if (!this.protocol) {
      requeue(data);
      return;
    }
    // Process packet
    const packet = this.protocol.packets[id as PacketIds] as Packet<any>;
    if (!packet?.receive) throw new Error(`Invalid packet ${id}: ${data}`);

    const receivablePacket = packet as ReceivablePacket<any>;
    const size = receivablePacket.size;

    if (data.byteLength < size) {
      requeue(data, data.byteLength + this.receivedBuffer.length >= size);
      return;
    }
    this.packetCooldown.count++;
    await receivablePacket.receive(this, data).catch(
      this.onError.bind(this),
    );

    // Handle remaining data
    if (data.byteLength > size) {
      requeue(data.subarray(size), true);
    } else {
      this.processingIncoming = false;
    }
  }

  /** Handle an error */
  onError(error: Error) {
    this.logger.error(error);
    this.disconnectWithReason("Internal error");
  }
  /**
   * Disconnect the client with a reason, if possible
   * @param reason The reason for the disconnection
   * @param timeout The time to wait before closing the connection
   */
  disconnectWithReason(reason = "Disconnected", timeout = 1000) {
    const packet = this.protocol?.packets[PacketIds.DisconnectPlayer];
    if (packet) {
      packet.send(this, { reason }).catch(this.close.bind(this));
    }
    setTimeout(() => {
      if (!this.closed) this.close();
    }, timeout);
  }
  /** Close the connection */
  close() {
    if (this.closed) return;
    this.closed = true;
    this.emitter.emit("close");
    try {
      this.player?.destroy();
      this.socket.close(); // TODO: Check if this is correct
    } catch (error) {
      this.logger.error(error);
    }
  }
}
