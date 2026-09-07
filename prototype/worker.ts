import {
  createMcpHonoApp,
  hostHeaderValidation,
  localhostHostValidation,
  localhostOriginValidation,
  originValidation,
} from "@modelcontextprotocol/hono";
import { createMcpHandler } from "@modelcontextprotocol/server";

import { LiveTimetableProvider } from "./live-provider.ts";
import { createLuleaBusMcpServer } from "./mcp-server.ts";
import { MockTimetableProvider } from "./mock-provider.ts";
import type { TimetableProvider } from "./provider.ts";
import { TimetableService } from "./service.ts";

type Bindings = {
  DATA_MODE?: string;
  TRAFIKLAB_API_KEY?: string;
  RESROBOT_API_KEY?: string;
  MCP_PUBLIC_URL?: string;
};

const app = createMcpHonoApp({
  host: "0.0.0.0",
});

app.use("*", async (context, next) => {
  const validation = publicUrlValidation(context.env as Bindings);
  if (!validation.ok) {
    return context.json(
      {
        error: "MCP_PUBLIC_URL must be an HTTPS URL, or an HTTP localhost URL.",
      },
      403,
    );
  }

  const validateHost = validation.hostname
    ? hostHeaderValidation([validation.hostname])
    : localhostHostValidation();
  const validateOrigin = validation.hostname
    ? originValidation([validation.hostname])
    : localhostOriginValidation();

  const hostResponse = await validateHost(context, async () => {});
  if (hostResponse) {
    return hostResponse;
  }

  return validateOrigin(context, next);
});

app.get("/", (context) => {
  const status = providerStatus(context.env as Bindings);
  return context.json({
    name: "HK Luleå bus MCP prototype",
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
  const handler = createMcpHandler(() => createLuleaBusMcpServer(service));
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

function publicUrlValidation(
  env: Bindings,
): { ok: true; hostname?: string } | { ok: false } {
  if (env.MCP_PUBLIC_URL === undefined) {
    return { ok: true };
  }

  try {
    const publicUrl = new URL(env.MCP_PUBLIC_URL);
    const hostname = publicUrl.hostname;
    const isLocalhost = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(hostname);
    const isSupportedProtocol = publicUrl.protocol === "https:" ||
      (publicUrl.protocol === "http:" && isLocalhost);

    if (
      !hostname ||
      !isSupportedProtocol ||
      publicUrl.username ||
      publicUrl.password
    ) {
      return { ok: false };
    }

    return { ok: true, hostname };
  } catch {
    return { ok: false };
  }
}
