/**
 * Represents reusable UI elements
 */

/**
 * Clears a node of any child nodes it might have
 * @param node {HTMLElement}
 */
function clearNode(node) {
  while (node.children.length > 0) {
    node.children[0].remove();
  }
}

/**
 * Creates an HTML element with the provided text and style class
 * @param tag {string} The tag name of the element being created
 * @param content {string} The text inside the element
 * @param style {string} The style class of the element
 * @returns HTMLElement
 * @private
 */
function elementWithTextAndStyle(tag, content, style) {
  const element = document.createElement(tag);
  const text = document.createTextNode(content);

  element.append(text);
  element.classList.add(style);

  return element;
}

// BASIC HTML ELEMENTS
/**
 * Creates a header
 * @param level {int} Header level from 1 to 6
 * @param content {string} The header text
 * @param style {string} Style of the header
 * @returns {HTMLHeadingElement}
 */
function header(level, content, style) {
  const tag = `h${level}`;

  return elementWithTextAndStyle(tag, content, style);
}

/**
 * Creates a paragraph
 * @param content {string} The text content of the paragraph
 * @param style {string} CSS style of the paragraph
 * @returns {HTMLParagraphElement}
 */
function paragraph(content, style) {
  return elementWithTextAndStyle("p", content, style);
}

/**
 *
 * @param hint {string} Placeholder text
 * @param isMultiline {Boolean} Whether multi-line input is allowed
 * @param style {string} CSS style of the input field
 * @param value {string} Value of the field
 * @returns {HTMLInputElement}
 */
function textInput(hint, isMultiline, style, value = "") {
  const tag = isMultiline ? "textarea" : "input";
  const element = document.createElement(tag);

  if (!isMultiline) {
    element.setAttribute("type", "text");
  }

  if (value.length > 0) {
    if (isMultiline) {
      const text = document.createTextNode(value);

      element.append(text);
    } else {
      element.setAttribute("value", value);
    }
  }

  element.setAttribute("placeholder", hint);
  element.classList.add(style);

  return element;
}

/**
 * Creates a button
 * @param caption {string} Button text
 * @param style {string} Style class
 * @param callback {function} Click callback
 * @returns {HTMLElement}
 */
function button(caption, style, callback) {
  const element = elementWithTextAndStyle("button", caption, style);

  element.addEventListener("click", callback);

  return element;
}

/**
 * Creates a Div element
 * @param style {string} The style class of the div
 * @returns {HTMLDivElement}
 */
function div(style) {
  const element = document.createElement("div");

  element.classList.add(style);

  return element;
}

// APPLICATION SPECIFIC ELEMENTS
/**
 * The user name inputy element
 * @param value {string} Current value of the user name
 * @param isEnabled {Boolean} Whether the input should be enabled
 * @return {HTMLDivElement}
 */
function userNameInput(value, isEnabled) {
  const container = div("container-user-name");
  const label = elementWithTextAndStyle(
    "label",
    "How should we call you?",
    "fancy"
  );
  const input = textInput(
    "e.g. Peter Parker, Clark Kent, The Hulk",
    false,
    "fancy",
    value
  );

  label.setAttribute("for", "username");
  input.setAttribute("id", "username");
  container.append(label, input);

  if (!isEnabled) {
    input.setAttribute("disabled", "disabled");
  }

  container.value = () => input.value;

  return container;
}

/**
 * Creates the room name input abd button
 * @param stateChanger {Function} The state altering function
 * @returns {HTMLDivElement}
 */
function roomNameInput(stateChanger) {
  const container = div("room-input");
  const editor = textInput(
    "Chat room name, e.g. general, D&D, star-wars",
    false,
    "room-input-name"
  );
  const goButton = button("GO", "room-input-button", () => {
    stateChanger({ room: { id: 0, name: editor.value } });
  });

  container.append(editor, goButton);

  return container;
}

/**
 * Creates a list of the rooms the user visited in this session with the option to change to one of those rooms
 * @param state {Object} The current state of the application
 * @param stateChanger {Function} The function to alter the state
 * @return {HTMLUListElement}
 */
function roomHistory(state, stateChanger) {
  const list = document.createElement("ul");

  list.classList.add("room-list");

  for (const room of state.roomHistory) {
    const item = document.createElement("li");
    const text = document.createTextNode(room.name);

    item.append(text);
    item.addEventListener("click", () => {
      stateChanger({ room: { id: 0, name: room.name, }, });
    });
    list.append(item);
  }

  return list;
}

/**
 * Creates a display of a single message
 * @param text {string} The message text
 * @param author {string} The author of the message
 * @param isMine {Boolean} Whether the author is the current user or someone else
 * @param isPending {Boolean} Indicator for if the message has not been sent yet
 * @returns {HTMLDivElement}
 */
function chatMessage(text, author, isMine, isPending) {
  const message = div("message-item");
  const messageText = elementWithTextAndStyle("div", text, "message-text");
  const messageAuthor = elementWithTextAndStyle(
    "div",
    author,
    "message-author"
  );

  if (isMine) {
    message.classList.add("message-mine");
  }
  if (isPending) {
    message.classList.add("message-pending");
  }

  message.append(messageAuthor);
  message.append(messageText);

  return message;
}

/**
 * The message text editor
 * @param stateChanger {Function} The function to alter the state of the app
 * @returns {HTMLDivElement}
 */
function chatMessageInput(stateChanger) {
  const container = div("message-editor");
  const editor = textInput(
    "Your message goes here...",
    true,
    "message-text-editor"
  );
  const saveButton = button("Send ", "message-send", () => {
    stateChanger({ pendingText: editor.value, });
  });

  container.append(editor, saveButton);

  return container;
}

/**
 * Creates a list display of message objects
 * @param state {Object} The current state
 * @returns {HTMLDivElement}
 */
function chatHistory(state) {
  const container = div("message-list");

  for (const message of state.room.messageHistory) {
    const isMine =
      message.user.name === state.user.name &&
      message.user.id === state.user.id;
    const item = chatMessage(message.text, message.user.name, isMine, true);

    container.append(item);
  }

  for (const message of state.room.pendingMessages) {
    const item = chatMessage(message.text, message.user.name, true, true);

    container.append(item);
  }

  return container;
}

/**
 * Creates a spinner element
 * @return {HTMLDivElement}
 */
function spinner() {
  return div("spinner");
}

export {
  clearNode,
  header,
  paragraph,
  button,
  div,
  userNameInput,
  roomNameInput,
  roomHistory,
  chatMessage,
  chatMessageInput,
  chatHistory,
  spinner,
};
