import Server from "./server.js";

/**
 * Represents a chat room
 */
class Room {
  /**
   * Initializes a new chat room
   * @param name {string} Name of the room
   */
  constructor(name) {
    this.name = name;
    this.chatters = new Set();
  }

  /**
   * Adds a new chatter to the room
   * @param chatter {Chatter}
   */
  addChatter(chatter) {
    this.chatters.add(chatter);
  }

  /**
   * Removes a chatter from the room
   * @param chatter {Chatter} user to remove
   */
  removeChatter(chatter) {
    this.chatters.delete(chatter);
  }

  /**
   * Sends a text message to all chatters in  the room.
   * @param text {string} The test being sent
   * @param sender {Chatter} The chatter that sent the message
   * @param internalId {int} The chatter's internal id identifiying the message
   */
  sendTextToRoom(text, sender, internalId) {
    this.chatters.forEach((chatter) => {
      const message = {
        type: "message",

        body: {
          user: {
            name: sender.name,
            id: sender.id,
          },

          text,

          internalId,
        },
      };

      Server.sendMessageToSocket(message, chatter.socket);
    });
  }

  getParticipants() {
    // eslint-disable-next-line compat/compat
    return Array.from(this.chatters);
  }
}

export default Room;
