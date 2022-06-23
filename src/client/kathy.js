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
    const oldState = kathy.state;

    kathy.state = {
      ...kathy.state,
      ...newState,
    };
    kathy.screen.render(kathy.state, oldState, kathy.alterApplicationState);
    kathy.performStateBasedActions(kathy.state, oldState);
  },

  performStateBasedActions(currentState, oldState) {
    if (currentState.user.name !== oldState.user.name) {
      // Registering a new user
      kathy.handleUserIntroduction();
    }

    if (
      currentState.room.id !== oldState.room.id ||
      (currentState.room.name.length > 0 &&
        currentState.room.name !== oldState.room.name)
    ) {
      // Enter a new room
      kathy.handleChangingRoom(currentState.room.name);
    }

    if (currentState.pendingText.length > 0) {
      kathy.handleSendingMessage(currentState.pendingText);
    }
  },

  /**
   * Handles the setting up of the application, which includes creating and updating UI as well as making the connection
   * to the chat server.
   */
  boot() {
    // ui -> update to loading
    kathy.socket = new Socket(SOCKET_URI);
    kathy.screen = new MainScreen();

    // Register the application hook callbacks.
    kathy.socket.registerHookCallback("_ERROR_", kathy.handleSocketError);
    kathy.socket.registerHookCallback("_CLOSE_", kathy.handleSocketClosed);
    kathy.socket.registerHookCallback("_OPEN_", kathy.handleSocketOpen);
    kathy.socket.registerHookCallback("hello", kathy.handleServerHello);
    kathy.socket.registerHookCallback("room", kathy.handleEnteringRoom);
    kathy.socket.registerHookCallback("message", kathy.handleMessageReceived);

    kathy.socket.connectToSocket();
  },

  handleSocketError() {
    kathy.alterApplicationState({
      socketState: "error",
    });
    kathy.socket.connectToSocket();
  },

  handleSocketOpen() {
    kathy.alterApplicationState({
      socketState: "ready",
    });

    // If the socket is open, but we already have a user name and id
    // we are probably recovering from an error, reintroduce the user to the server
    kathy.handleUserIntroduction();
  },

  handleSocketClosed() {
    kathy.alterApplicationState({
      socketState: "closed",
    });
  },

  handleUserIntroduction() {
    // ui -> update to connection
    const message = {
      type: kathy.state.user.id > 0 ? "reintroduce" : "introduce",

      body: {
        user: kathy.state.user,
      },
    };

    kathy.socket.sendJsonObject(message);
  },

  /**
   * Handles the Hello message from the server containing the user id after successfully registering the user to the
   * chat system
   * @param message The received message object
   */
  handleServerHello(message) {
    if (message.body.success) {
      kathy.alterApplicationState({
        user: { id: message.body.user.id, name: kathy.state.user.name, },
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

    kathy.socket.sendJsonObject(message);
  },

  handleEnteringRoom(message) {
    if (message.body.success && message.body.room) {
      const { roomHistory } = kathy.state;

      roomHistory.push({
        id: message.body.room.id,
        name: message.body.room.name,
      });
      kathy.alterApplicationState({ room: message.body.room, roomHistory, });
    }
  },

  handleSendingMessage(text) {
    kathy.internalMessageId += 1;

    const message = {
      type: "message",

      body: {
        user: kathy.state.user,
        text,
        internalId: kathy.internalMessageId,
      },
    };

    kathy.socket.sendJsonObject(message);

    // Add to pending messages
    const currentRoom = kathy.state.room;

    currentRoom.pendingMessages.push(message.body);
    kathy.alterApplicationState({ room: currentRoom, pendingText: "", });
  },

  handleMessageReceived(message) {
    const currentRoom = kathy.state.room;

    if (
      message.body.user.id === kathy.state.user.id &&
      message.body.user.name === kathy.state.user.name
    ) {
      const pendingMessages = [];

      for (const pendingMessage of currentRoom.pendingMessages) {
        if (pendingMessage.internalId !== message.body.internalId) {
          pendingMessages.push(pendingMessage);
        }
      }

      currentRoom.pendingMessages = pendingMessages;
    }

    currentRoom.messageHistory.push(message.body);

    kathy.alterApplicationState({ room: currentRoom, });
  },
};

kathy.boot();
