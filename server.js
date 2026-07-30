const http = require("http");
const fs = require("fs");
const path = require("path");

const DEFAULT_PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = __dirname;
const STATE_FILE = path.join(ROOT_DIR, "state.json");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function getDefaultState() {
  return {
    coaches: [],
    coachProfiles: [],
    standings: [],
    powerRankings: [],
    teamInfo: {},
    championships: [
      {
        id: "s1-finals",
        title: "S1 Finals",
        desc: "San Antonio Spurs defeat Milwaukee Bucks, 119-114",
      },
    ],
  };
}

function readState() {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      fs.writeFileSync(STATE_FILE, JSON.stringify(getDefaultState(), null, 2));
      return getDefaultState();
    }

    const raw = fs.readFileSync(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...getDefaultState(),
      ...parsed,
      coaches: Array.isArray(parsed.coaches) ? parsed.coaches : [],
      coachProfiles: Array.isArray(parsed.coachProfiles) ? parsed.coachProfiles : [],
      standings: Array.isArray(parsed.standings) ? parsed.standings : [],
      powerRankings: Array.isArray(parsed.powerRankings) ? parsed.powerRankings : [],
      teamInfo: parsed.teamInfo && typeof parsed.teamInfo === "object" ? parsed.teamInfo : {},
      championships: Array.isArray(parsed.championships) ? parsed.championships : [],
    };
  } catch (error) {
    console.error("Unable to read state file:", error);
    return getDefaultState();
  }
}

function writeState(payload) {
  const state = {
    ...getDefaultState(),
    ...payload,
    coaches: Array.isArray(payload.coaches) ? payload.coaches : [],
    coachProfiles: Array.isArray(payload.coachProfiles) ? payload.coachProfiles : [],
    standings: Array.isArray(payload.standings) ? payload.standings : [],
    powerRankings: Array.isArray(payload.powerRankings) ? payload.powerRankings : [],
    teamInfo: payload.teamInfo && typeof payload.teamInfo === "object" ? payload.teamInfo : {},
    championships: Array.isArray(payload.championships) ? payload.championships : [],
  };

  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  return state;
}

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

function createApp() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === "/api/state") {
      if (req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(readState()));
        return;
      }

      if (req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            const state = writeState(parsed);
            res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify(state));
          } catch (error) {
            res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ error: "Invalid JSON body" }));
          }
        });
        return;
      }
    }

    let requestedPath = pathname;
    if (requestedPath === "/") {
      requestedPath = "/index.html";
    }

    const safePath = path.normalize(requestedPath).replace(/^\/+/, "");
    const absolutePath = path.join(ROOT_DIR, safePath);

    if (!absolutePath.startsWith(ROOT_DIR)) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory()) {
      serveFile(path.join(absolutePath, "index.html"), res);
      return;
    }

    serveFile(absolutePath, res);
  });
}

function startServer(port = DEFAULT_PORT, attempts = 10) {
  const server = createApp();

  const tryListen = (currentPort, remainingAttempts) => {
    return new Promise((resolve, reject) => {
      const onError = (error) => {
        server.removeListener("error", onError);
        if (error.code === "EADDRINUSE" && remainingAttempts > 0) {
          resolve(tryListen(currentPort + 1, remainingAttempts - 1));
          return;
        }
        reject(error);
      };

      const onListening = () => {
        server.removeListener("error", onError);
        resolve();
      };

      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(currentPort, "0.0.0.0");
    });
  };

  tryListen(port, attempts)
    .then(() => {
      const address = server.address();
      if (address && typeof address.port === "number") {
        console.log(`TBA Fan Network server running on http://localhost:${address.port}`);
      }
    })
    .catch((error) => {
      console.error("Unable to start server:", error);
    });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
