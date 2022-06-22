import Socket from "./socket.js";

const SOCKET_PORT = 3000;
const SOCKET_URI = `ws://localhost:${SOCKET_PORT}`;

const kathy = {
  socket: undefined,

  user: {
    name: "",
    id: 0,
  },

  room: {
    name: "",
    participants: [],
  },

  /**
   * Handles the setting up of the application, which includes creating and updating UI as well as making the connection
   * to the chat server.
   */
  boot() {
    // ui -> update to loading
    this.socket = new Socket(SOCKET_URI);

    // Register the application hook callbacks.
    this.socket.registerHookCallback("_ERROR_", this.handleSocketError);
    this.socket.registerHookCallback("_CLOSE_", this.handleSocketClosed);
    this.socket.registerHookCallback("_OPEN_", this.handleSocketOpen);
    this.socket.registerHookCallback("hello", this.handleServerHello);
    this.socket.registerHookCallback("room", this.handleEnteringRoom);
    this.socket.registerHookCallback("message", this.handleMessageReceived);
  },

  handleSocketError() {
    // ui -> update to connection problem

    this.socket.connectToSocket();
  },

  handleSocketOpen() {},

  handleSocketClosed() {},

  handleUserIntroduction() {
    // ui -> update to connection
    const message = {
      type: this.user.id > 0 ? "reintroduce" : "introduce",

      body: {
        user: this.user,
      },
    };

    this.socket.sendJsonObject(message);
  },

  /**
   * Handles the Hello message from the server containing the user id after successfully registering the user to the
   * chat system
   * @param message The received message object
   */
  handleServerHello(message) {
    if (message.body.success) {
      // ui -> update to connected mode
      this.user.id = message.body.user.id;

      // ui -> type room
    }
  },

  handleChangingRoom(room) {
    const message = {
      type: "room",

      body: {
        room,
      },
    };

    this.socket.sendJsonObject(message);
  },

  handleEnteringRoom(message) {
    if (message.body.success) {
      this.room.name = message.body.room.name;
      this.room.participants = message.body.room.participants;
    }
  },

  handleSendingMessage(text, internalId) {
    const message = {
      type: "message",

      body: {
        user: this.user,
        text,
        internalId,
      },
    };

    this.socket.sendJsonObject(message);
  },

  handleMessageReceived(message) {},
};

kathy.boot();
