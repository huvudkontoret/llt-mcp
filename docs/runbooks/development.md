# Development

Use Node.js 24 (`.node-version`) and the pnpm version pinned in `package.json`.
Run `pnpm install --frozen-lockfile` in each worktree. No global TypeScript or
Wrangler installation is required.

## Synthetic and live data

`pnpm dev:mock` starts a local Worker with synthetic data and no API keys.
`pnpm dev` starts live mode. Both accept `http://localhost:8787`; neither modifies
production. The named `local` and `mock` Wrangler environments are for local use,
not staging deployments. Mock mode uses an explicit empty environment file so
existing local API keys and mode/host overrides are not loaded.

For live mode, copy `.env.example` to `.env` only if `.env` does not already
exist. Fill in `TRAFIKLAB_API_KEY` (Trafiklab Realtime APIs) and `RESROBOT_API_KEY`
(ResRobot v2.1). Wrangler supplies secrets through Worker bindings. Keep `.env`
local. If an older `.env` contains `DATA_MODE` or `MCP_PUBLIC_URL`, remove those
non-secret overrides so they do not override the local Wrangler configuration.
Explicit local configuration selects the accepted hostname; if you change
the development address, update the matching local configuration too.

The Worker exposes `/mcp`, a service description at `/`, and `/health`.
Health reports configuration presence, not upstream availability. A public
`MCP_PUBLIC_URL` does not implicitly allow localhost or preview domains.

## Checks

- `pnpm test`: named Node tests plus a bundled Worker in Wrangler's test harness.
- `pnpm typecheck`: type-check source, tests, scripts, and the terminal example.
- `pnpm format:check`: check formatting without changing files.
- `pnpm lint`: type checking and formatting checks together.
- `pnpm build`: bundle with Wrangler's deployment dry-run.
- `pnpm demo`: synthetic terminal demonstration; exits after examples without a TTY.

The `verify:live-mapping`, `verify:mcp-contract`, and `verify:worker` scripts remain
available for focused checks. Despite its name, `verify:live-mapping` uses fixtures.
The complete gate is `hk verify hk-llt` on trunk, or
`hk verify hk-llt --worktree <name>` for a feature worktree.

Test provider calls inject responses. The bundled test entrypoint disables
outbound fetch entirely and supplies explicit mock configuration. Tests do not
need live API keys. Keep new provider tests offline. Do not inspect private SDK
fields: verify MCP contracts through the client protocol.

## Workspace defaults

The editor settings, Prettier configuration, identity hook, and optional `/goal`
skill come from `hk sync`. The hook respects the developer's existing identity
configuration; no identity is hard-coded in this project. The `/goal` workflow
runs only when explicitly invoked and is separate from normal development.

The project owns its ignore rules, TypeScript configuration, and agent entrypoints.
Do not force-overwrite them with workspace defaults. Commit messages and developer
documentation are English; travel-facing language follows the product.
