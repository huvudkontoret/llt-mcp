import assert from "node:assert/strict";

import app from "./worker.ts";

const publicHostHealth = await app.request("https://worker.example.com/health", {}, {});
assert.equal(publicHostHealth.status, 403);

const localhostHealth = await app.request("http://localhost/health", {
  headers: { Host: "localhost" },
}, {});
assert.equal(localhostHealth.status, 503);

const rejectedPublicBrowserOrigin = await app.request("https://worker.example.com/health", {
  headers: { Origin: "https://unapproved.example.com" },
}, {});
assert.equal(rejectedPublicBrowserOrigin.status, 403);

const publicUrl = { MCP_PUBLIC_URL: "https://worker.example.com/base?ignored=true#ignored" };
const acceptedPublicHost = await app.request("https://worker.example.com/health", {
  headers: { Host: "worker.example.com" },
}, publicUrl);
assert.equal(acceptedPublicHost.status, 503);

const acceptedSameHostOrigin = await app.request("https://worker.example.com/health", {
  headers: { Host: "worker.example.com", Origin: "https://worker.example.com" },
}, publicUrl);
assert.equal(acceptedSameHostOrigin.status, 503);

const rejectedMismatchedHost = await app.request("https://other.example.com/health", {
  headers: { Host: "other.example.com" },
}, publicUrl);
assert.equal(rejectedMismatchedHost.status, 403);

const rejectedMismatchedOrigin = await app.request("https://worker.example.com/health", {
  headers: { Host: "worker.example.com", Origin: "https://other.example.com" },
}, publicUrl);
assert.equal(rejectedMismatchedOrigin.status, 403);

const changedPublicHost = await app.request("https://preview.example.com/health", {
  headers: { Host: "preview.example.com" },
}, {
  MCP_PUBLIC_URL: "https://preview.example.com",
});
assert.equal(changedPublicHost.status, 503);

const rejectedMalformedPublicUrl = await app.request("https://worker.example.com/health", {}, {
  MCP_PUBLIC_URL: "not a URL",
});
assert.equal(rejectedMalformedPublicUrl.status, 403);

const rejectedNonLocalHttpUrl = await app.request("https://worker.example.com/health", {}, {
  MCP_PUBLIC_URL: "http://worker.example.com",
});
assert.equal(rejectedNonLocalHttpUrl.status, 403);

const missingKeysHealth = await app.request("http://localhost/health", {
  headers: { Host: "localhost" },
}, {
  TRAFIKLAB_API_KEY: "",
  RESROBOT_API_KEY: "",
});
assert.equal(missingKeysHealth.status, 503);

const configuredHealth = await app.request("http://localhost/health", {
  headers: { Host: "localhost" },
}, {
  TRAFIKLAB_API_KEY: "trafiklab-key",
  RESROBOT_API_KEY: "resrobot-key",
});
assert.equal(configuredHealth.status, 200);

console.log("Worker smoke check passed.");
