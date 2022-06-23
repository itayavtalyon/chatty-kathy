/**
 * Handles the server setup
 */

import {WebSocket, WebSocketServer} from "ws";
import Chatter from './chatter.js';
import Room from './room.js';
import * as fs from "fs";
import * as path from "path";

const Server = {
  httpServer: undefined,
  webSocketServer: undefined,
  userCounter: 0,
  rooms: new Map(),
  pingInterval: undefined,

  serveStaticContent(request, response) {
    let requestedResource = "src/client" + request.url; // todo: tighten security
    if (requestedResource === "src/client/") {
      requestedResource += "index.html"; //
    }

    const extension = path.extname(requestedResource);
    let mimeType = "application/javascript";
    if (extension === ".html") {
      mimeType = "text/html";
    } else if (extension === ".css") {
      mimeType = "text/css";
    }

    fs.readFile(requestedResource, (error, data) => {
      if (error) {
        console.log(error);
        response.writeHead(404);
        response.end("Not found", "utf-8");
      } else {
        response.writeHead(200, {"Content-Type": mimeType, });
        response.end(data, "utf-8");
      }
    });
  },

  createHttpServer(engine, port) {
    Server.httpServer = engine.createServer(Server.serveStaticContent);

    // Hand over the connection to the Websocket server
    Server.httpServer.on("upgrade", (request, socket, head) => {
      Server.webSocketServer.handleUpgrade(request, socket, head, (websocket) => {
        Server.webSocketServer.emit("connection", websocket, request);
      })
    })
    Server.httpServer.listen(port);
  },

  createSocketServer(SocketEngine) {
    const CLIENT_PING_INTERVAL = 30000;

    if (!SocketEngine) {
      SocketEngine = WebSocketServer;
    }

    Server.webSocketServer = new SocketEngine({
      //server: Server.httpServer
      noServer: true,
      clientTracking: true,
    });
    Server.webSocketServer.on('connection', Server.handleConnection);
    Server.webSocketServer.on('close', () => {
      clearInterval(Server.pingInterval);
    });
    Server.pingInterval = setInterval(Server.pingClients, CLIENT_PING_INTERVAL);
  },

  /**
   * Send the ping message to client sockets to prune out those whose
   * connection was lost
   */
  pingClients() {
    if (Server.webSocketServer && Server.webSocketServer.clients) {
      Server.webSocketServer.clients.forEach(client => {
        if (client.isAlive) {
          // eslint-disable-next-line no-param-reassign
          client.isAlive = false;
          client.ping();
        } else {
          client.getUser().terminate();
        }
      });
    }
  },

  /**
   * Handles the mechanics of sending a message to the client via the open
   * socket
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
    socket.on('message', (data, isBinary) => {
      Server.handleIncomingMessage(data, isBinary, socket);
    });
    // eslint-disable-next-line no-param-reassign
    socket.isAlive = true;
    socket.on('pong', () => {
      socket.isAlive = true;
    });
    socket.on('close', () => {
      socket.getUser().terminate();
    });

    const user = new Chatter(socket);

    socket.setUser(user);
  },

  /**
   * Called when a message is received on the socket
   * @param data {Buffer|ArrayBuffer|Buffer[]} Content
   * @param isBinary {Boolean} Is the message in binary format
   * @param socket {WebSocket} The connection socket
   */
  handleIncomingMessage(data, isBinary, socket) {
    if (!isBinary) {
      const message = JSON.parse(data.toString());
      const chatter = socket.getUser();
      let userName;
      let userId;
      let roomName;
      let text;

      switch (message.type) {
      /**
       * Handles the user "signing up"
       */
      case 'introduce':
        userName = '';
        if (message.body?.user?.name) {
          userName = message.body.user.name;
        }

        if (0 < userName.length) {
          chatter.name = userName;
          Server.userCounter++;
          chatter.id = Server.userCounter;

          const response = {
            type: 'hello',

            body: {
              success: true,

              user: {
                id: chatter.id,
                name: chatter.name
              }
            }
          };

          Server.sendMessageToSocket(response, socket);
        } else {
          const response = {
            type: 'hello',

            body: {
              success: true
            }
          };

          Server.sendMessageToSocket(response, socket);
        }
        break;
      /**
       * Handles when the user already signed up and was issued id and now logs in again (because of an error)
       */
      case 'reintroduce':
        userName = '';
        if (message.body?.user?.name) {
          userName = message.body.user.name;
        }
        userId = 0;
        if (message.body?.user?.id) {
          userId = message.body.user.id;
        }
        if (0 < userName.length && 0 < userId) {
          chatter.name = userName;
          chatter.id = userId;

          const response = {
            type: 'hello',

            body: {
              success: true,

              user: {
                id: chatter.id,
                name: chatter.name
              }
            }
          };

          Server.sendMessageToSocket(response, socket);
        } else {
          const response = {
            type: 'hello',

            body: {
              success: true
            }
          };

          Server.sendMessageToSocket(response, socket);
        }
        break;
      /**
       * Handles the request to join a chat room
       */
      case 'room':
        roomName = '';
        if (message.body?.room) {
          roomName = message.body.room;
        }
        if (0 < roomName.length) {
          if (!Server.rooms.has(roomName)) {
            Server.rooms.set(roomName, new Room(roomName));
          }

          let room = Server.rooms.get(roomName);
          chatter.currentRoom = room;
          room.addChatter(chatter);

          const response = {
            type: 'room',

            body: {
              success: true,

              room: {
                name: room.name,
                participants: room.getParticipants(),
                // Future: The message history of the room from the database
                messageHistory: [],
                // A unique id for the room
                id: 1,
                // User messages that were not sent yet
                pendingMessages: [],
              }
            }
          };

          Server.sendMessageToSocket(response, socket);
        } else {
          const response = {
            type: 'room',

            body: {
              success: false
            }
          };

          Server.sendMessageToSocket(response, socket);
        }
        break;
      /**
       * Handles a chat message being sent
       */
      case 'message':
        text = '';
        if (message.body?.text) {
          text = message.body.text;
        }
        if (chatter.currentRoom && 0 < text.length) {
          chatter.currentRoom.sendTextToRoom(message.body.text, chatter, message.body.internalId);
        }
        break;
      }
    }
  },

  /**
   * Get the chat server started
   * @param httpServerFactory The HTTP server factory to create an HTTP server
   * @param socketEngine The class of the websocket server engine to instantiate
   * @param port {int} The port to have the server listen to
   */
  boot(httpServerFactory, socketEngine, port) {
    Server.createHttpServer(httpServerFactory, port);
    Server.createSocketServer(socketEngine);
  }
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

