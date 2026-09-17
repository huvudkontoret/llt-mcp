import assert from "node:assert/strict";
import { test } from "node:test";
import { LiveTimetableProvider } from "../src/live-provider.ts";

for (const scenario of [
  {
    name: "network failure",
    category: "network",
    status: null,
    fetcher: async () => {
      throw new Error("secret-key private-query 65.5775 https://private.invalid");
    },
  },
  {
    name: "HTTP rate limit",
    category: "http",
    status: 429,
    fetcher: async () => new Response("private response", { status: 429 }),
  },
  {
    name: "upstream server failure",
    category: "http",
    status: 503,
    fetcher: async () => new Response("private response", { status: 503 }),
  },
  {
    name: "malformed JSON",
    category: "invalid_json",
    status: 200,
    fetcher: async () => new Response("private response"),
  },
]) {
  test(`sanitizes ${scenario.name} and emits only safe diagnostics`, async (t) => {
    const log = t.mock.method(console, "error", () => {});
    const provider = new LiveTimetableProvider({
      trafiklabApiKey: "secret-key",
      fetcher: scenario.fetcher,
    });
    await assert.rejects(provider.searchStops("private-query", 5), (error: Error) => {
      assert.doesNotMatch(error.message, /secret-key|private|65\.5775|https:/);
      return true;
    });
    assert.equal(log.mock.calls.length, 1);
    const line = log.mock.calls[0]!.arguments[0] as string;
    assert.doesNotMatch(line, /secret-key|private|65\.5775|https:/);
    const diagnostic = JSON.parse(line);
    assert.deepEqual(Object.keys(diagnostic).sort(), [
      "category",
      "durationMs",
      "operation",
      "provider",
      "status",
    ]);
    assert.equal(diagnostic.category, scenario.category);
    assert.equal(diagnostic.status, scenario.status);
    assert.equal(diagnostic.operation, "search_lulea_bus_stops");
    assert.equal(diagnostic.provider, "Trafiklab");
    assert.ok(diagnostic.durationMs >= 0);
  });
}

test("aborts provider requests after the configured timeout without logging the request", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  const timeout = t.mock.method(AbortSignal, "timeout", (milliseconds: number) => {
    assert.equal(milliseconds, 10_000);
    return AbortSignal.abort(new DOMException("private-request", "TimeoutError"));
  });
  const provider = new LiveTimetableProvider({
    resRobotApiKey: "secret-key",
    fetcher: async (_input, init) => {
      assert.equal(init?.signal?.aborted, true);
      throw init!.signal!.reason;
    },
  });
  await assert.rejects(provider.nearbyStops(65.5775, 22.1905, 1_000, 5), /ResRobot kunde inte nås/);
  assert.equal(timeout.mock.calls.length, 1);
  const diagnostic = JSON.parse(log.mock.calls[0]!.arguments[0] as string);
  assert.equal(diagnostic.category, "timeout");
  assert.equal(diagnostic.operation, "find_nearby_lulea_bus_stops");
});

test("sanitizes ResRobot application errors, including arbitrary error codes", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  const provider = new LiveTimetableProvider({
    resRobotApiKey: "secret-key",
    fetcher: async () =>
      Response.json({
        errorCode: "https://secret-key.invalid/private",
        errorText: "private-query",
      }),
  });
  await assert.rejects(provider.nearbyStops(65.5775, 22.1905, 1_000, 5), {
    message: "ResRobot kunde inte besvara frågan.",
  });
  assert.equal(JSON.parse(log.mock.calls[0]!.arguments[0] as string).category, "provider_error");
});

test("missing provider configuration fails before any network call", async () => {
  const provider = new LiveTimetableProvider({
    fetcher: async () => {
      assert.fail("Unexpected fetch");
    },
  });
  await assert.rejects(provider.searchStops("Kronan", 5), /TRAFIKLAB_API_KEY/);
  await assert.rejects(provider.nearbyStops(65.5, 22, 1_000, 5), /RESROBOT_API_KEY/);
});
