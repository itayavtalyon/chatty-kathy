/**
 * Represents the individual screens of the application
 */

import {
  clearNode,
  header,
  div,
  userNameInput,
  roomNameInput,
  roomHistory,
  chatMessageInput,
  chatHistory,
  spinner,
  paragraph,
  button,
} from "./ui-blocks.js";

class MainScreen {
  constructor() {
    this.body = document.querySelector("body");
    clearNode(this.body);
  }

  render(currentState, oldState, stateChanger) {
    if (currentState.socketState === "ready") {
      if (currentState.user.id > 0 && currentState.room.id > 0) {
        // Render chat room
        this.renderChatRoom(currentState, oldState, stateChanger);
      } else if (currentState.user.id > 0) {
        // Render choose room / switching room
        this.renderWaitingRoom(currentState, oldState, stateChanger);
      } else {
        // render welcome screen
        this.renderWelcomeScreen(currentState, oldState, stateChanger);
      }
    } else {
      this.renderCriticalErrorPage(currentState, oldState, stateChanger);
    }
  }

  renderWelcomeScreen(currentState, oldState, stateChanger) {
    const container = div("middle");
    const welcome = header(1, "Welcome!", "fancy");
    const explanationOne = paragraph(
      "<em>Chatty Kathy</em> is one of the coolest chat room applications around.",
      "fancy"
    );

    clearNode(this.body);
    this.body.append(container);
    container.append(welcome, explanationOne);

    if (oldState.user.name === currentState.user.name) {
      // Displau the form
      const explanationTwo = paragraph(
        "To get started, please introduce yourself.",
        "fancy"
      );
      const userNameField = userNameInput(oldState.user.name, true);
      const sendButton = button("Get Talking", "big", () => {
        stateChanger({
          user: {
            name: userNameField.value(),
            id: 0,
          },
        });
      });

      container.append(explanationTwo);
      container.append(userNameField);
      container.append(sendButton);
    } else {
      // Registering new name
      const loader = spinner();
      const waiting = paragraph("Getting you setup...", "spinner-reason");

      container.append(loader);
      container.append(waiting);
    }
  }

  renderWaitingRoom(currentState, oldState, stateChanger) {
    const container = div("wide");
    const leftSide = div("column-left");
    const rightSide = div("column-right");

    const title = header(1, "Waiting Room", "fancy");
    const subtitle = paragraph(
        "👈 Please type a chat room name to get started",
        "bold"
    );

    const roomInput = roomNameInput(stateChanger);

    clearNode(this.body);
    this.body.append(container);
    container.append(leftSide, rightSide);
    rightSide.append(title, subtitle);
    leftSide.append(roomInput);
  }

  renderChatRoom(currentState, oldState, stateChanger) {
    const container = div("wide");
    const leftSide = div("column-left");
    const rightSide = div("column-right");

    const title = header(1, currentState.room.name, "fancy");
    const participants = currentState.room.participants.reduce(
        (previous, current) => {
          if (previous.length > 0) {
            previous += ", ";
          }
          previous += current.name;
          return previous;
        }, "");
    const subtitle = paragraph(
        participants,
        "regular"
    );
    const messageList = chatHistory(currentState);
    const messageInput = chatMessageInput(stateChanger);

    const roomInput = roomNameInput(stateChanger);
    const roomList = roomHistory(currentState, stateChanger);

    clearNode(this.body);
    this.body.append(container);
    container.append(leftSide, rightSide);
    rightSide.append(title, participants, messageList, messageInput);
    leftSide.append(roomInput, roomList);
  }

  renderCriticalErrorPage(currentState, oldState, stateChanger) {
    const container = div("middle");
    const welcome = header(1, "Sorry about that!", "fancy");
    const explanationOne = paragraph(
        "This is embarrassing... We are trying to reconnect to the chat servers.",
        "fancy"
    );
    const explanationTwo = paragraph(
        "If it doesn't work, please try again by refreshing the page. Sorry for the inconvenience.",
        "regular"
    );
    const loader = spinner();

    clearNode(this.body);
    this.body.append(container);
    container.append(welcome, explanationOne, explanationTwo, loader);
  }
}

export default MainScreen;
