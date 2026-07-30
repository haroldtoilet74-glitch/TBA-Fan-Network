const test = require("node:test");
const assert = require("node:assert/strict");
const net = require("node:net");

const { startServer } = require("./server");

test("falls back to a different port when the requested port is busy", async () => {
  const blocker = net.createServer();
  await new Promise((resolve) => blocker.listen(0, "127.0.0.1", resolve));
  const { port } = blocker.address();

  const server = startServer(port, 3);
  await new Promise((resolve) => setTimeout(resolve, 150));

  assert.equal(server.listening, true);
  const address = server.address();
  assert.ok(address && typeof address.port === "number");
  assert.notEqual(address.port, port);

  await new Promise((resolve) => server.close(resolve));
  await new Promise((resolve) => blocker.close(resolve));
});
