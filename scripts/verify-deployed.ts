import { checkLiveProviders, checkTools, connectMcp } from "./mcp-check.ts";

let phase = "configuration";
try {
  const base = new URL(process.env.CLOUDFLARE_WORKER_URL ?? "");
  if (
    base.protocol !== "https:" ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    base.pathname !== "/"
  ) {
    throw new Error("Expected a public HTTPS base URL");
  }
  phase = "health";
  const response = await fetch(new URL("/health", base), { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error("Health check failed");
  const health = (await response.json()) as Record<string, unknown>;
  if (
    health.status !== "ok" ||
    health.configured !== true ||
    health.mode !== "live" ||
    health.sampleData !== false
  ) {
    throw new Error("Expected configured live mode");
  }
  phase = "MCP initialization";
  const client = await connectMcp(new URL("/mcp", base));
  try {
    phase = "MCP tool discovery";
    await checkTools(client);
    phase = "live provider checks";
    await checkLiveProviders(client);
  } finally {
    await client.close();
  }
  console.log("Production verification passed: health, MCP contracts, Trafiklab and ResRobot.");
} catch {
  // Never print SDK errors or validation payloads: they may contain travel data.
  console.error(
    `Production verification failed during ${phase}. Check sanitized Worker diagnostics.`,
  );
  process.exitCode = 1;
}
