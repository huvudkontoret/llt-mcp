import { McpServer } from "@modelcontextprotocol/server";

import type { TimetableService } from "./service.ts";
import {
  departuresInputSchema,
  departuresOutputSchema,
  journeyOutputSchema,
  nearbyStopsInputSchema,
  planJourneyInputSchema,
  stopCandidatesOutputSchema,
  stopSearchInputSchema,
} from "./schemas.ts";

export function createLuleaBusMcpServer(service: TimetableService): McpServer {
  const server = new McpServer({
    name: "hk-llt-mcp-prototype",
    version: "0.0.0",
  });

  server.registerTool(
    "search_lulea_bus_stops",
    {
      title: "Search Luleå bus stop candidates",
      description:
        "Searches geographically relevant Luleå-area bus stop candidates by name. Candidates are not operator-verified until a timetable query is made.",
      inputSchema: stopSearchInputSchema,
      outputSchema: stopCandidatesOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ query, maxResults }) => toolResult(await service.searchStops(query, maxResults)),
  );

  server.registerTool(
    "find_nearby_lulea_bus_stops",
    {
      title: "Find nearby Luleå bus stops",
      description:
        "Finds nearby Luleå-area bus stop candidates from WGS84 coordinates. The coordinates are used only for this query and are not stored.",
      inputSchema: nearbyStopsInputSchema,
      outputSchema: stopCandidatesOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ latitude, longitude, radiusMeters, maxResults }) =>
      toolResult(
        await service.nearbyStops(latitude, longitude, radiusMeters, maxResults),
      ),
  );

  server.registerTool(
    "plan_lulea_bus_journey",
    {
      title: "Plan a Luleå bus journey",
      description:
        "Plans up to three Luleå-area alternatives using Luleå Lokaltrafik and Länstrafiken Norrbotten, ordered by earliest planned arrival. Optionally select exactly one provider; mixed-provider journeys are then excluded. Live journey options include a verificationUrl that clients can offer as an independent ResRobot check; reopening it reruns the search and can produce updated or differently ordered results. Accepts exact stop IDs or coordinates, never free text.",
      inputSchema: planJourneyInputSchema,
      outputSchema: journeyOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async (input) => toolResult(await service.planJourney(input)),
  );

  server.registerTool(
    "get_lulea_bus_departures",
    {
      title: "Get planned Luleå bus departures",
      description:
        "Returns at most ten planned Luleå-area departures from Luleå Lokaltrafik and Länstrafiken Norrbotten during a fixed 60-minute window. Optionally select exactly one provider. This is not live data.",
      inputSchema: departuresInputSchema,
      outputSchema: departuresOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async (input) => toolResult(await service.departures(input)),
  );

  return server;
}

function toolResult<T extends Record<string, unknown>>(value: T) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
    structuredContent: value,
  };
}
