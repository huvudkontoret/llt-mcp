import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { resolve } from "node:path";
import { createTestHarness, unstable_readConfig } from "wrangler";
import { checkTools, connectMcp } from "../scripts/mcp-check.ts";
import {
  departuresOutputSchema,
  journeyOutputSchema,
  stopCandidatesOutputSchema,
} from "../src/schemas.ts";

const production = unstable_readConfig({ config: "wrangler.jsonc" });
const harness = createTestHarness({
  root: resolve("tests/fixtures"),
  workers: [
    {
      config: {
        name: "hk-llt-test",
        main: resolve("tests/fixtures/offline-worker.ts"),
        compatibility_date: production.compatibility_date,
        vars: {
          DATA_MODE: "mock",
          MCP_PUBLIC_URL: "http://localhost",
          TRAFIKLAB_API_KEY: "",
          RESROBOT_API_KEY: "",
        },
      },
    },
  ],
});
let endpoint: URL;
before(async () => {
  const { url } = await harness.listen();
  endpoint = new URL("/mcp", url);
  endpoint.hostname = "localhost";
});
after(async () => {
  await harness.close();
});

test("bundled Worker initializes MCP and advertises all four public contracts", async () => {
  const client = await connectMcp(endpoint);
  try {
    await checkTools(client);
  } finally {
    await client.close();
  }
});

test("all four tools return schema-valid synthetic results through HTTP", async () => {
  const client = await connectMcp(endpoint);
  try {
    const calls = [
      {
        name: "search_lulea_bus_stops",
        arguments: { query: "Kronan" },
        schema: stopCandidatesOutputSchema,
      },
      {
        name: "find_nearby_lulea_bus_stops",
        arguments: { latitude: 65.5775, longitude: 22.1905 },
        schema: stopCandidatesOutputSchema,
      },
      {
        name: "get_lulea_bus_departures",
        arguments: { stopId: "sample:kronan" },
        schema: departuresOutputSchema,
      },
      {
        name: "plan_lulea_bus_journey",
        arguments: {
          origin: { kind: "stop", stopId: "sample:kronan" },
          destination: { kind: "stop", stopId: "sample:sunderby" },
        },
        schema: journeyOutputSchema,
      },
    ];
    for (const { name, arguments: args, schema } of calls) {
      const result = await client.callTool({ name, arguments: args });
      assert.notEqual(result.isError, true, name);
      assert.equal(schema.parse(result.structuredContent).sampleData, true);
    }
    const empty = await client.callTool({
      name: "search_lulea_bus_stops",
      arguments: { query: "nonexistent-stop" },
    });
    assert.deepEqual(stopCandidatesOutputSchema.parse(empty.structuredContent).candidates, []);
  } finally {
    await client.close();
  }
});

test("HTTP MCP rejects invalid coordinates and free-text journey places", async () => {
  const client = await connectMcp(endpoint);
  try {
    for (const request of [
      { name: "find_nearby_lulea_bus_stops", arguments: { latitude: 91, longitude: 22 } },
      { name: "plan_lulea_bus_journey", arguments: { origin: "Kronan", destination: "Centrum" } },
    ]) {
      const result = await client.callTool(request);
      assert.equal(result.isError, true);
    }
  } finally {
    await client.close();
  }
});

test("bundled Worker enforces host and browser origin validation", async () => {
  assert.equal((await harness.fetch("https://unapproved.example/health")).status, 403);
  assert.equal(
    (
      await harness.fetch("http://localhost/health", {
        headers: { Origin: "https://unapproved.example" },
      })
    ).status,
    403,
  );
  const response = await harness.fetch("http://localhost/health");
  assert.equal(response.status, 200);
  assert.equal(((await response.json()) as { sampleData: boolean }).sampleData, true);
});
