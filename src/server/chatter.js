/**
 * Represents a single chatting user
 */
class Chatter {
  /**
   * Initializes the chatter attached to the socket
   * @param socket {WebSocket}
   */
  constructor(socket) {
    /**
     * The socket connection of the user
     * @type {WebSocket}
     */
    this.socket = socket;

    /**
     * The current chat room
     * @type {Room}
     */
    this.currentRoom = undefined;

    /**
     * User ID that will be issued by the server
     * @type {number}
     */
    this.id = 0;

    /**
     * User name
     * @type {string}
     */
    this.name = "";
  }

  terminate() {
    if (this.currentRoom) {
      this.currentRoom.removeChatter(this);
      this.currentRoom = undefined;
    }

    this.socket.setUser(undefined);

    return this.socket.terminate();
  }
}

export default Chatter;
