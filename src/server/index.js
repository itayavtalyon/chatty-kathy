/**
 * The starting point of the chat server
 */

import http from "node:http";

import { WebSocketServer } from "ws";

import Server from "./server.js";

const SOCKET_PORT = 3000;

Server.boot(http, undefined, SOCKET_PORT);
