import assert from "node:assert/strict";

import { createLuleaBusMcpServer } from "./mcp-server.ts";
import { MockTimetableProvider } from "./mock-provider.ts";
import { TimetableService } from "./service.ts";
import {
  departuresInputSchema,
  departureSchema,
  journeyOptionSchema,
  planJourneyInputSchema,
  stopCandidateSchema,
} from "./schemas.ts";

const server = createLuleaBusMcpServer(new TimetableService(new MockTimetableProvider()));
const tools = (server as unknown as { _registeredTools: Record<string, { description?: string }> })
  ._registeredTools;
const toolNames = Object.keys(tools).sort();

assert.deepEqual(toolNames, [
  "find_nearby_lulea_bus_stops",
  "get_lulea_bus_departures",
  "plan_lulea_bus_journey",
  "search_lulea_bus_stops",
]);
for (const name of toolNames) {
  assert.match(tools[name]?.description ?? "", /Luleå Lokaltrafik|operator-verified|Luleå-area/);
}

assert.equal(planJourneyInputSchema.parse({
  origin: { kind: "stop", stopId: "a" },
  destination: { kind: "stop", stopId: "b" },
}).operator, undefined);
assert.equal(departuresInputSchema.parse({ stopId: "a" }).operator, undefined);
assert.equal(planJourneyInputSchema.parse({
  origin: { kind: "stop", stopId: "a" },
  destination: { kind: "stop", stopId: "b" },
  operator: "Luleå Lokaltrafik",
}).operator, "Luleå Lokaltrafik");
assert.throws(() => departuresInputSchema.parse({ stopId: "a", operator: "Both" }));

stopCandidateSchema.parse({
  stopId: "a", name: "A", latitude: 65.5, longitude: 22.1, serviceVerification: "unverified",
});
for (const operator of ["Luleå Lokaltrafik", "Länstrafiken Norrbotten"] as const) {
  departureSchema.parse({
    operator, line: "1", direction: "A", stop: { stopId: "a", name: "A", latitude: 65.5, longitude: 22.1 },
    plannedDeparture: "2026-09-06T06:10:00.000Z",
  });
  journeyOptionSchema.parse({
    id: operator, plannedDeparture: "2026-09-06T06:00:00.000Z", plannedArrival: "2026-09-06T06:10:00.000Z",
    durationMinutes: 10, transfers: 0, walkingDistanceMeters: 0,
    legs: [{
      mode: "bus", operator, line: "1", direction: "A",
      fromStop: { stopId: "a", name: "A", latitude: 65.5, longitude: 22.1 },
      toStop: { stopId: "b", name: "B", latitude: 65.6, longitude: 22.2 },
      plannedDeparture: "2026-09-06T06:00:00.000Z", plannedArrival: "2026-09-06T06:10:00.000Z",
    }],
  });
}

console.log("MCP server contract smoke check passed.");
