import assert from "node:assert/strict";

import app from "./worker.ts";

const publicHostHealth = await app.request("https://worker.example.com/health", {}, {});
assert.equal(publicHostHealth.status, 503);

const rejectedBrowserOrigin = await app.request("https://worker.example.com/health", {
  headers: { Origin: "https://unapproved.example.com" },
}, {});
assert.equal(rejectedBrowserOrigin.status, 403);

const missingKeysHealth = await app.request("https://worker.example.com/health", {}, {
  TRAFIKLAB_API_KEY: "",
  RESROBOT_API_KEY: "",
});
assert.equal(missingKeysHealth.status, 503);

const configuredHealth = await app.request("https://worker.example.com/health", {}, {
  TRAFIKLAB_API_KEY: "trafiklab-key",
  RESROBOT_API_KEY: "resrobot-key",
});
assert.equal(configuredHealth.status, 200);

console.log("Worker smoke check passed.");
