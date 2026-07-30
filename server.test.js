const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
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

test("serves state responses without caching", async () => {
  const server = startServer(0, 1);
  await new Promise((resolve) => setTimeout(resolve, 150));

  const address = server.address();
  assert.ok(address && typeof address.port === "number");

  const response = await new Promise((resolve, reject) => {
    const req = http.get({ hostname: "127.0.0.1", port: address.port, path: "/api/state" }, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body });
      });
    });
    req.on("error", reject);
  });

  assert.equal(response.statusCode, 200);
  assert.match(response.headers["cache-control"] || "", /no-store/i);
  assert.equal(response.headers["pragma"], "no-cache");

  await new Promise((resolve) => server.close(resolve));
});
