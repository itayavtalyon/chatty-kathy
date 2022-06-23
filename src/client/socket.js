/**
 * Represents the web socket connection from the client side to the server.
 * A wrapper for the WebSocket native class
 */
class Socket {
  constructor(uri) {
    this.isOpen = false;
    this.messageQueue = [];
    this.hooks = new Map();
    this.uri = uri;
    this.connectToSocket();
  }

  registerHookCallback(messageType, callback) {
    if (this.hooks.has(messageType)) {
      this.hooks.get(messageType).push(callback);
    } else {
      this.hooks.set(messageType, [callback]);
    }
  }

  fireHookCallbacks(message) {
    if (this.hooks.has(message.type)) {
      this.hooks.get(message.type).forEach((callback) => {
        callback(message);
      });
    }
  }

  connectToSocket() {
    this.socket = new WebSocket(this.uri);
    this.socket.addEventListener("open", () => {
      this.isOpen = true;

      if (this.messageQueue.length > 0) {
        this.messageQueue.forEach((entry) => {
          this.sendRawMessage(entry);
        });
      }

      this.fireHookCallbacks({
        type: "_OPEN_",
      });
    });
    this.socket.addEventListener("close", () => {
      this.isOpen = false;
      this.fireHookCallbacks({
        type: "_CLOSE_",
      });
    });
    this.socket.addEventListener("error", (event) => {
      this.isOpen = false;
      // eslint-disable-next-line no-console
      console.log("WebSocket error:", event);
      this.fireHookCallbacks({
        type: "_ERROR_",
        event,
      });
    });
    this.socket.addEventListener("message", this.handleRawMessage.bind(this));
  }

  handleRawMessage(event) {
    const rawMessage = event.data;
    const message = JSON.parse(rawMessage);
    
    this.fireHookCallbacks(message);
  }

  sendRawMessage(rawMessage) {
    if (!this.isOpen) {
      this.messageQueue.push(rawMessage);

      return;
    }

    this.socket.send(rawMessage);
  }

  sendJsonObject(object) {
    this.sendRawMessage(JSON.stringify(object));
  }

  closeConnection() {
    this.socket.close();
  }


}

export default Socket;
