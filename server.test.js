const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const net = require("node:net");

const { startServer } = require("./server");

test("persists posted state and serves it back through the shared API", async () => {
  const server = startServer(0, 1);
  await new Promise((resolve) => setTimeout(resolve, 150));

  const address = server.address();
  assert.ok(address && typeof address.port === "number");

  const payload = {
    coaches: [{ id: "coach-1", name: "Test Coach", role: "Head Coach", team: "Lakers" }],
    coachProfiles: [{ id: "profile-1", name: "Test Coach", team: "Lakers", role: "Head Coach", record: "10-2", accolades: "Title", legacy: "5", seasons: "8" }],
    teamInfo: {
      Lakers: { coach: "Test Coach", assistant: "TBD", record: "10-2", division: "Pacific", conference: "Western" },
    },
  };

  const postResponse = await new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: address.port,
        path: "/api/state",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({ statusCode: res.statusCode, body });
        });
      }
    );
    req.on("error", reject);
    req.write(JSON.stringify(payload));
    req.end();
  });

  assert.equal(postResponse.statusCode, 200);

  const getResponse = await new Promise((resolve, reject) => {
    const req = http.get({ hostname: "127.0.0.1", port: address.port, path: "/api/state" }, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        resolve({ statusCode: res.statusCode, body });
      });
    });
    req.on("error", reject);
  });

  assert.equal(getResponse.statusCode, 200);
  const parsed = JSON.parse(getResponse.body);
  assert.equal(parsed.coaches[0].name, "Test Coach");
  assert.equal(parsed.teamInfo.Lakers.coach, "Test Coach");

  await new Promise((resolve) => server.close(resolve));
});

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
