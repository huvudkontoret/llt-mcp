# Luleå bus MCP

A Huvudkontoret service that helps AI assistants find bus stops, planned
departures, and journeys in the Luleå area. Four read-only MCP tools run on
Cloudflare Workers using Trafiklab and ResRobot data.

## Start locally

Use Node.js 24 and pnpm 11.1.2. From a checkout or feature worktree:

```sh
pnpm install --frozen-lockfile
pnpm dev:mock
```

Connect an MCP client to `http://localhost:8787/mcp`. Mock mode needs no API
keys and marks responses with `sampleData: true`. `pnpm demo` runs the synthetic
terminal example; `pnpm prototype` remains an alias.

For live data, follow the [development runbook](docs/runbooks/development.md).

## Verify a change

```sh
pnpm build
pnpm test
pnpm lint
```

Build is a Wrangler dry-run and does not deploy. Tests exercise domain rules,
provider mappings and failures, and the MCP protocol in a local Workers runtime.
They use synthetic data and blocked or substituted upstream requests. Lint runs
TypeScript checking and Prettier checks. `pnpm format` applies formatting.

## Huvudkontoret workspace

The local workspace uses the umbrella layout: `hk-llt/main` is the trunk and
feature worktrees are siblings. The repository's GitHub layout remains ordinary.

```sh
hk context hk-llt
hk status hk-llt
hk dev hk-llt
hk verify hk-llt
hk worktree hk-llt my-change
hk verify hk-llt --worktree my-change
```

`hk dev` runs live development on the trunk. In a feature worktree, use the
pnpm scripts from that worktree. `hk verify --worktree` reads that worktree's
configuration. `hk sync hk-llt --check` reviews trunk workspace defaults.
Project-specific configuration is protected by `hk.json` ownership entries.

## Read more

- [Domain context](CONTEXT.md) and [agent instructions](AGENTS.md).
- [Architecture decision](docs/adr/0001-maintained-worker.md).
- [Development](docs/runbooks/development.md), [deployment](docs/runbooks/deployment.md),
  and [rollback](docs/runbooks/rollback.md).
- [Codex plugin](plugins/lulea-reseplanerare/skills/planera-lulea-resa/SKILL.md).

Verified commits on `main` deploy automatically. Local verification does not
prove a deployment succeeded. The existing Worker identity and public endpoint
remain stable for connected clients.
