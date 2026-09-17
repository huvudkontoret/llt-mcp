# 0001: Maintain the existing MCP as a single Worker

Status: accepted for the first maintained Huvudkontoret release.

## Decision

Keep TypeScript, Hono, the MCP SDK, Trafiklab, ResRobot, and Cloudflare Workers.
Use one package with application modules in `src`, named tests in `tests`, a
terminal example, and operational scripts. Preserve the existing separation
between schemas/domain rules, service, provider interface and implementations,
MCP registration, and HTTP/runtime configuration.

The first audience is Huvudkontoret and existing clients. Preserve four read-only
tools, their contracts and annotations, operator filters, planned timetable
semantics, attribution, and synthetic-data labels. Keep the public endpoint,
Worker identity, and MCP server identity. Package versioning is independent.

## Prototype findings retained

- Trafiklab stop-group national IDs are accepted by ResRobot, so no local ID map
  is needed.
- Stop candidates are geographically filtered but operator verification remains
  deferred until a departure or journey query.
- Departures and journeys strictly filter to Luleå Lokaltrafik and Länstrafiken
  Norrbotten. Mixed journeys are allowed unless a caller selects one operator.
- Bounded ResRobot overfetch followed by local normalization/filtering avoids
  excluding supported options prematurely through an upstream operator filter.
- ResRobot verification links rerun an independent search. They are not immutable
  trip records and may contain coordinates, so they must not be logged.
- Timetable data is planned; realtime fields, cancellations, and delays are not
  represented. Queries, profiles, and coordinates are not persisted.

## Verification and delivery

Node's built-in runner reports named tests and failures. Wrangler's existing
`createTestHarness` exercises a bundled Worker through public MCP operations.
Fixture-backed provider tests and a blocked outbound test Worker keep CI offline.
Production verification separately checks both upstream providers.

Retain automatic verified-main deployment, serialized production jobs, sanitized
provider diagnostics, and manual rollback. Local workspace migration enables
`hk worktree`; it does not change the GitHub repository layout.

## Deferred

Authentication, new rate limits, staging, scheduled monitoring, custom domains,
realtime data, broader coverage, persistent storage, and ChatGPT app submission.
Keep the existing submission draft outside this change.
