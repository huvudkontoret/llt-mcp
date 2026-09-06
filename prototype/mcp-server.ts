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

export function createLltMcpServer(service: TimetableService): McpServer {
  const server = new McpServer({
    name: "hk-llt-mcp-prototype",
    version: "0.0.0",
  });

  server.registerTool(
    "search_llt_stops",
    {
      title: "Search stop candidates in the LLT area",
      description:
        "Searches geographically relevant stop candidates by name. Candidates are not operator-verified until a timetable query is made.",
      inputSchema: stopSearchInputSchema,
      outputSchema: stopCandidatesOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ query, maxResults }) => toolResult(await service.searchStops(query, maxResults)),
  );

  server.registerTool(
    "find_nearby_llt_stops",
    {
      title: "Find nearby stop candidates in the LLT area",
      description:
        "Finds nearby stop candidates from WGS84 coordinates. The coordinates are used only for this query and are not stored.",
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
    "plan_llt_journey",
    {
      title: "Plan an LLT-only journey",
      description:
        "Plans up to three LLT-only alternatives, ordered by earliest planned arrival. Accepts exact stop IDs or coordinates, never free text.",
      inputSchema: planJourneyInputSchema,
      outputSchema: journeyOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async (input) => toolResult(await service.planJourney(input)),
  );

  server.registerTool(
    "get_llt_departures",
    {
      title: "Get planned LLT departures",
      description:
        "Returns at most ten planned LLT departures from an exact stop during a fixed 60-minute window. This is not live data.",
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
