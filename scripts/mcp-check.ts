import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { stopCandidatesOutputSchema } from "../src/schemas.ts";

export const toolNames = [
  "find_nearby_lulea_bus_stops",
  "get_lulea_bus_departures",
  "plan_lulea_bus_journey",
  "search_lulea_bus_stops",
];

export async function connectMcp(url: URL) {
  const client = new Client({ name: "hk-llt-verification", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(url, {
    fetch: (input, init) =>
      fetch(input, {
        ...init,
        signal: AbortSignal.any([
          AbortSignal.timeout(15_000),
          ...(init?.signal ? [init.signal] : []),
        ]),
      }),
  });
  try {
    await client.connect(transport, { timeout: 15_000 });
    return client;
  } catch (error) {
    await transport.close();
    throw error;
  }
}

export async function checkTools(client: Client) {
  const { tools } = await client.listTools();
  if (JSON.stringify(tools.map((tool) => tool.name).sort()) !== JSON.stringify(toolNames)) {
    throw new Error("Unexpected MCP tool list");
  }
  for (const tool of tools) {
    if (
      !tool.inputSchema ||
      !tool.outputSchema ||
      tool.annotations?.readOnlyHint !== true ||
      tool.annotations?.idempotentHint !== true ||
      tool.annotations?.destructiveHint !== false ||
      tool.annotations?.openWorldHint !== false
    ) {
      throw new Error("MCP tool contract is incomplete");
    }
  }
  return tools;
}

export async function checkLiveProviders(client: Pick<Client, "callTool">) {
  const search = await client.callTool({
    name: "search_lulea_bus_stops",
    arguments: { query: "Smedjegatan", maxResults: 1 },
  });
  if (search.isError) throw new Error("Stop search failed");
  const stops = stopCandidatesOutputSchema.parse(search.structuredContent);
  if (stops.sampleData || !stops.candidates.length)
    throw new Error("Live stop search returned no candidates");
  const stop = stops.candidates[0]!;
  const nearby = await client.callTool({
    name: "find_nearby_lulea_bus_stops",
    arguments: {
      latitude: stop.latitude,
      longitude: stop.longitude,
      radiusMeters: 1_000,
      maxResults: 1,
    },
  });
  if (nearby.isError) throw new Error("Nearby lookup failed");
  const neighbours = stopCandidatesOutputSchema.parse(nearby.structuredContent);
  if (neighbours.sampleData || !neighbours.candidates.length)
    throw new Error("Live nearby lookup returned no candidates");
}
