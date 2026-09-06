import { createMcpHonoApp } from "@modelcontextprotocol/hono";
import { createMcpHandler } from "@modelcontextprotocol/server";

import { LiveTimetableProvider } from "./live-provider.ts";
import { createLltMcpServer } from "./mcp-server.ts";
import { MockTimetableProvider } from "./mock-provider.ts";
import type { TimetableProvider } from "./provider.ts";
import { TimetableService } from "./service.ts";

type Bindings = {
  DATA_MODE?: string;
  TRAFIKLAB_API_KEY?: string;
  RESROBOT_API_KEY?: string;
  RESROBOT_LLT_OPERATOR_ID?: string;
};

const app = createMcpHonoApp({
  host: "0.0.0.0",
  // Browser clients are not supported until an explicit origin allowlist exists.
  // Requests without Origin continue to support non-browser MCP clients.
  allowedOrigins: [],
});

app.get("/", (context) => {
  const status = providerStatus(context.env as Bindings);
  return context.json({
    name: "HK LLT MCP prototype",
    mode: status.mode,
    sampleData: status.mode === "mock",
    configured: status.configured,
    mcpEndpoint: "/mcp",
  });
});

app.get("/health", (context) => {
  const provider = providerStatus(context.env as Bindings);
  return context.json(
    {
      status: provider.configured ? "ok" : "needs-configuration",
      mode: provider.mode,
      sampleData: provider.mode === "mock",
      configured: provider.configured,
      missing: provider.missing,
    },
    provider.configured ? 200 : 503,
  );
});

app.all("/mcp", (context) => {
  const provider = createProvider(context.env as Bindings);
  const service = new TimetableService(provider);
  const handler = createMcpHandler(() => createLltMcpServer(service));
  const parsedBody = (context.var as Record<string, unknown>).parsedBody;
  return handler.fetch(context.req.raw, { parsedBody });
});

export default app;

function createProvider(env: Bindings): TimetableProvider {
  const mode = dataMode(env);
  if (mode === "mock") {
    return new MockTimetableProvider();
  }

  return new LiveTimetableProvider({
    trafiklabApiKey: env.TRAFIKLAB_API_KEY,
    resRobotApiKey: env.RESROBOT_API_KEY,
    resRobotLltOperatorId: env.RESROBOT_LLT_OPERATOR_ID,
  });
}

function providerStatus(env: Bindings): {
  mode: "live" | "mock";
  configured: boolean;
  missing: string[];
} {
  const mode = dataMode(env);
  const missing =
    mode === "mock"
      ? []
      : [
          ...(env.TRAFIKLAB_API_KEY?.trim() ? [] : ["TRAFIKLAB_API_KEY"]),
          ...(env.RESROBOT_API_KEY?.trim() ? [] : ["RESROBOT_API_KEY"]),
        ];

  return { mode, configured: missing.length === 0, missing };
}

function dataMode(env: Bindings): "live" | "mock" {
  return env.DATA_MODE?.trim().toLowerCase() === "mock" ? "mock" : "live";
}
