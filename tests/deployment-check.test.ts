import assert from "node:assert/strict";
import { test } from "node:test";
import type { Client } from "@modelcontextprotocol/client";
import { checkLiveProviders } from "../scripts/mcp-check.ts";

function result(overrides: Record<string, unknown> = {}) {
  return {
    content: [],
    structuredContent: {
      candidates: [
        {
          stopId: "public-stop",
          name: "Public stop",
          latitude: 65.58,
          longitude: 22.15,
          serviceVerification: "unverified",
        },
      ],
      sampleData: false,
      attribution: "Fixture provider",
      operatorVerification: "deferred-until-timetable-query",
      ...overrides,
    },
  };
}

test("production probe checks Trafiklab then ResRobot using the discovered public stop", async () => {
  const calls: unknown[] = [];
  const client: Pick<Client, "callTool"> = {
    callTool: async (request) => {
      calls.push(request);
      return result();
    },
  };
  await checkLiveProviders(client);
  assert.deepEqual(calls, [
    { name: "search_lulea_bus_stops", arguments: { query: "Smedjegatan", maxResults: 1 } },
    {
      name: "find_nearby_lulea_bus_stops",
      arguments: { latitude: 65.58, longitude: 22.15, radiusMeters: 1_000, maxResults: 1 },
    },
  ]);
});

for (const phase of [1, 2]) {
  for (const [name, response] of [
    ["synthetic data", result({ sampleData: true })],
    ["empty results", result({ candidates: [] })],
    ["malformed results", result({ candidates: [{ latitude: "invalid" }] })],
    ["MCP failure", { content: [], isError: true }],
  ] satisfies Array<[string, Awaited<ReturnType<Client["callTool"]>>]>) {
    test(`production probe fails on ${name} from provider ${phase}`, async () => {
      let calls = 0;
      const client: Pick<Client, "callTool"> = {
        callTool: async () => (++calls === phase ? response : result()),
      };
      await assert.rejects(checkLiveProviders(client));
      assert.equal(calls, phase);
    });
  }
}
