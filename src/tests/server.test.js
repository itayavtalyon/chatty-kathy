import Server from "../server/server.js";

test("Creates a server and starts listening", () => {
  const MockEngine = {
    createServer: () => {
      MockEngine.server = true;

      return {
        listen: (port) => {
          MockEngine.port = port;
          MockEngine.listening = true;
        },
      };
    },
  };
  const port = 3000;

  Server.createHttpServer(MockEngine, port);
  expect(MockEngine.server).toBe(true);
  expect(MockEngine.port).toBe(port);
  expect(MockEngine.listening).toBe(true);
});

test("Creates a web socket server", () => {});

test("Attaches event listeners", () => {});
