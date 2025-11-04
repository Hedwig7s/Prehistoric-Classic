/*
    Handles opening connections
*/
import type { Protocol } from "/networking/protocol/protocol.ts";
import { getSimpleLogger } from "/utility/logger.ts";
import { ServiceRegistry } from "/utility/serviceregistry.ts";
import type { ServiceMap } from "/servercontext.ts";
import { EventEmitter } from "@denosaurs/event";
import { Connection } from "/networking/connection.ts";

/** Events emitted by the server */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type ServerEvents = {
  close: [];
};

/**
 * A TCP server that handles accepting connections and creating Connection instances
 */
export class Server {
  server?: Deno.TcpListener;
  public host?: string;
  public port?: number;
  public connectionCount = 0;
  public closed = false;
  public readonly logger = getSimpleLogger("Server");
  public readonly emitter = new EventEmitter<ServerEvents>();

  public connections = new Map<number, Connection>();

  constructor(
    public readonly protocols: Record<number, Protocol>,
    public readonly serviceRegistry: ServiceRegistry<ServiceMap>,
  ) {}
  handleConnection(conn: Deno.TcpConn) {
    const connection = new Connection(
      conn,
      this.connectionCount++,
      this.protocols,
      this.serviceRegistry,
    );
    this.connections.set(connection.id, connection);
    connection.emitter.on("close", () => {
      this.connections.delete(connection.id);
    });
    this.logger.info("Socket connected");
  }
  async handleConnections() {
    if (!this.server) return;
    for await (const conn of this.server) {
      if (this.closed) break;
      this.handleConnection(conn);
    }
  }
  /**
   * Starts the server
   * @param host The host address to bind to
   * @param port The port to bind to
   */
  start(host: string, port: number) {
    this.host = host;
    this.port = port;

    this.server = Deno.listen({
      hostname: this.host,
      port: this.port,
      transport: "tcp",
    });

    this.logger.info(`Server started at ${this.host}:${this.port}`);
    this.handleConnections();
  }

  /**
   * Closes the server
   */
  close() {
    if (this.closed) return;
    this.emitter.emit("close");
    this.server?.close();
    this.closed = true;
    this.logger.info("Server stopped");
  }
}

export default Server;
