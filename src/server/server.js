/**
 * Handles the server setup
 */
import http from "node:http";

import { WebSocketServer } from "ws";

import Chatter from "./chatter.js";

const Server = {
  httpServer: undefined,
  socketServer: undefined,
  userCounter: 0,
  rooms: new Map(),
  pingInterval: undefined,

  createHttpServer(engine, port) {
    this.httpServer = engine.createServer();
    this.httpServer.listen(port);
  },

  createSocketServer(SocketEngine) {
    const CLIENT_PING_INTERVAL = 30_000;

    this.webSocketServer = new SocketEngine({ server: this.httpServer });
    this.webSocketServer.on("connection", this.handleConnection);
    this.webSocketServer.on("close", () => {
      clearInterval(this.pingInterval);
    });
    this.pingInterval = setInterval(this.pingClients, CLIENT_PING_INTERVAL);
  },

  /**
   * Send the ping message to client sockets to prune out those whose connection was lost
   */
  pingClients() {
    this.webSocketServer.clients.forEach((client) => {
      if (client.isAlive) {
        // eslint-disable-next-line no-param-reassign
        client.isAlive = false;
        client.ping();
      } else {
        client.getUser().terminate();
      }
    });
  },

  /**
   * Handles the mechanics of sending a message to the client via the open socket
   * @param message {Object} The message to send
   * @param socket {WebSocket} The socket so send the message on
   */
  sendMessageToSocket(message, socket) {
    if (socket.readyState === WebSocket.OPEN) {
      const rawMessage = JSON.stringify(message);

      socket.send(rawMessage);
    }
  },

  /**
   * Handles a connection after the handshake is complete
   * @param socket {WebSocket}
   * @param request {http.IncomingMessage}
   */
  handleConnection(socket, request) {
    socket.on("message", this.handleIncomingMessage);
    // eslint-disable-next-line no-param-reassign
    socket.isAlive = true;
    socket.on("pong", () => {
      this.isAlive = true;
    });
    socket.on("close", () => {
      this.getUser().terminate();
    });

    const user = new Chatter(socket);

    socket.setUser(user);
  },

  /**
   * Called when a message is received on the socket
   * @param data {Buffer|ArrayBuffer|Buffer[]} Content
   * @param isBinary {Boolean} Is the message in binary format
   */
  handleIncomingMessage(data, isBinary) {
    if (!isBinary) {
      const message = JSON.parse(data.toString());

      switch (message.type) {
      }
    }
  },

  /**
   * Get the chat server started
   */
  boot(httpServerFactory, socketEngine, port) {
    this.createHttpServer(httpServerFactory, port);
    this.createSocketServer(socketEngine);
  },
};

/**
 * Lets is attach user information to the socket
 * @param user {Chatter} The user data object being attached
 */
WebSocket.prototype.setUser = function setUser(user) {
  this.chatter = user;
};

/**
 * Returns the user associated with the socket
 * @returns {Chatter}
 */
WebSocket.prototype.getUser = function getUser() {
  return this.chatter;
};

/**
 * An indicator whether the client is still alive
 * @type {boolean}
 */
WebSocket.prototype.isAlive = false;

export default Server;
