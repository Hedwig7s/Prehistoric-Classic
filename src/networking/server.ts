/*
    Handles opening connections
*/
import type { Protocol } from "networking/protocol/protocol";
import { getSimpleLogger } from "utility/logger";
import { ServiceRegistry } from "utility/serviceregistry";
import type { ServiceMap } from "servercontext";
import type TypedEventEmitter from "typed-emitter";
import EventEmitter from "events";
import { Connection } from "networking/connection";
import { Server as TCPServer } from "net";
import * as net from "net";

/** Events emitted by the server */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type ServerEvents = {
    close: () => void;
};

/**
 * A TCP server that handles accepting connections and creating Connection instances
 */
export class Server {
    server?: TCPServer;
    public host?: string;
    public port?: number;
    public connectionCount = 0;
    public closed = false;
    public readonly logger = getSimpleLogger("Server");
    public readonly emitter =
        new EventEmitter() as TypedEventEmitter<ServerEvents>;

    public connections = new Map<number, Connection>();

    constructor(
        public readonly protocols: Record<number, Protocol>,
        public readonly serviceRegistry: ServiceRegistry<ServiceMap>
    ) { }

    /**
     * Starts the server
     * @param host The host address to bind to
     * @param port The port to bind to
     */
    start(host: string, port: number) {
        this.host = host;
        this.port = port;

        this.server = net.createServer((socket) => {
            try {
                const id = this.connectionCount++;
                const connection = new Connection(
                    socket,
                    id,
                    this.protocols,
                    this.serviceRegistry
                );

                this.connections.set(id, connection);
                connection.emitter.on("close", () => {
                    this.connections.delete(id);
                });
                socket.on("data", (data) => {
                    try {
                        if (typeof data == "string") {
                            data = Buffer.from(data);
                        }
                        connection.bufferIncoming(
                            data
                        );
                        if (connection)
                            connection.packetCooldown.count++;
                    } catch {
                        socket.end();
                    }

                });
                socket.on("error", (error) => {
                    this.logger.warn(`Socket error: ${error}`);
                });
                socket.on("drain", () => {
                    try {
                        connection.processOutgoing();
                    } catch (error) {
                        this.logger.error(error);
                        socket.end();
                    }
                });
                socket.on("close", () => {
                    try {
                        this.logger.info(
                            `Socket ${connection.id} closed`
                        );
                        connection.close();
                    } catch (error) {
                        this.logger.error(error);
                    }

                });
                this.logger.info("Socket connected");
            } catch (error) {
                this.logger.error(error);
                socket.end();
            }
        });
        this.server.listen(this.port, this.host);

        this.logger.info(`Server started at ${this.host}:${this.port}`);
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
