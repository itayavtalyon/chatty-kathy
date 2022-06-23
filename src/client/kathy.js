import Socket from "./socket.js";
import MainScreen from "./ui-screens.js";

const SOCKET_PORT = 3000;
const SOCKET_URI = `ws://localhost:${SOCKET_PORT}/chat`;

const kathy = {
  socket: undefined,
  screen: undefined,
  internalMessageId: 0,

  /**
   * Shamelessly stealing the UI state concept. Allowing other parts of the application change the UI state which
   * will cause the registered active screen element to possibly rerender.
   */
  state: {
    socketState: "loading",

    user: {
      name: "",
      id: 0,
    },

    room: {
      name: "",
      participants: [],
      messageHistory: [],
      pendingMessages: [],
      id: 0,
    },

    roomHistory: [],

    pendingText: "",
  },

  /**
   * Changes the current state of the application and triggers rendering if necessary
   * @param newState {object} The desired modifications
   */
  alterApplicationState(newState) {
    const oldState = this.state;

    this.state = {
      ...this.state,
      ...newState,
    };
    this.screen.render(this.state, oldState, this.alterApplicationState);
    this.performStateBasedActions(this.state, oldState);
  },

  performStateBasedActions(currentState, oldState) {
    if (currentState.user.name !== oldState.user.name) {
      // Registering a new user
      this.handleUserIntroduction();
    }

    if (currentState.room.id !== oldState.room.id) {
      // Enter a new room
      this.handleChangingRoom(currentState.room.name);
    }

    if (currentState.pendingText.length > 0) {
      this.handleSendingMessage(currentState.pendingText);
    }
  },

  /**
   * Handles the setting up of the application, which includes creating and updating UI as well as making the connection
   * to the chat server.
   */
  boot() {
    // ui -> update to loading
    this.socket = new Socket(SOCKET_URI);
    this.screen = new MainScreen();

    // Register the application hook callbacks.
    this.socket.registerHookCallback("_ERROR_", this.handleSocketError);
    this.socket.registerHookCallback("_CLOSE_", this.handleSocketClosed);
    this.socket.registerHookCallback("_OPEN_", this.handleSocketOpen);
    this.socket.registerHookCallback("hello", this.handleServerHello);
    this.socket.registerHookCallback("room", this.handleEnteringRoom);
    this.socket.registerHookCallback("message", this.handleMessageReceived);

    this.socket.connectToSocket();
  },

  handleSocketError() {
    this.alterApplicationState({
      socketState: "error",
    });
    this.socket.connectToSocket();
  },

  handleSocketOpen() {
    this.alterApplicationState({
      socketState: "ready",
    });

    // If the socket is open, but we already have a user name and id
    // we are probably recovering from an error, reintroduce the user to the server
    this.handleUserIntroduction();
  },

  handleSocketClosed() {
    this.alterApplicationState({
      socketState: "closed",
    });
  },

  handleUserIntroduction() {
    // ui -> update to connection
    const message = {
      type: this.user.id > 0 ? "reintroduce" : "introduce",

      body: {
        user: this.state.user,
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
      this.alterApplicationState({
        user: { id: message.body.user.id, name: this.state.user.name, },
      });
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
    if (message.body.success && message.body.room) {
      const { roomHistory } = this.state;

      roomHistory.push({
        id: message.body.room.id,
        name: message.body.room.name,
      });
      this.alterApplicationState({ room: message.body.room, roomHistory, });
    }
  },

  handleSendingMessage(text) {
    this.internalMessageId += 1;

    const message = {
      type: "message",

      body: {
        user: this.state.user,
        text,
        internalId: this.internalMessageId,
      },
    };

    this.socket.sendJsonObject(message);

    // Add to pending messages
    const currentRoom = this.state.room;

    currentRoom.pendingMessages.push(message.body);
    this.alterApplicationState({ room: currentRoom, pendingText: "", });
  },

  handleMessageReceived(message) {
    const currentRoom = this.state.room;

    if (
      message.body.user.id === this.state.user.id &&
      message.body.user.name === this.state.user.name
    ) {
      // Remove the message from pending
      currentRoom.pendingMessages = [];
      for (const pendingMessage of currentRoom.pendingMessages) {
        if (pendingMessage.internalId !== message.body.internalId) {
          currentRoom.pendingMessages.push(pendingMessage);
        }
      }
    }

    currentRoom.messageHistory.push(message.body);
    this.alterApplicationState({ room: currentRoom, });
  },
};

kathy.boot();
