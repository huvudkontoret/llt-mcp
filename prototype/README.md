# Luleå bus MCP logic prototype

> PROTOTYPE — throw this away or absorb the validated parts before production.

The question is whether four small MCP tools and their structured responses are
enough for an AI agent to answer practical Luleå bus questions without storing data:
stop search, nearby stops, planned departures, and journey planning with walking
and transfers.

The MCP endpoint now defaults to live mode:

- Trafiklab Stop Lookup for stop-name search
- ResRobot Nearby stops for coordinate search
- Trafiklab Timetables for planned departures
- ResRobot Route planner for journeys

Actual departures and every bus leg are filtered to Luleå Lokaltrafik or
Länstrafiken Norrbotten. A journey can contain both supported operators; an
optional single `operator` input on journey and departure queries selects one
provider and excludes mixed-provider journeys. Stop candidates are restricted
geographically and to local-bus stops, but carry neutral `serviceVerification:
"unverified"` until a departure or journey query proves the operator. Realtime
fields are deliberately ignored.

## Local configuration

Create two API keys in Trafiklab: one for the Trafiklab Realtime APIs and one
for ResRobot v2.1. Then copy the example without committing the resulting file:

```sh
cp .env.example .env
```

Fill `TRAFIKLAB_API_KEY` and `RESROBOT_API_KEY` in `.env`, then start the
Worker:

```sh
pnpm dev
```

Wrangler reads `.env` natively during local development and exposes its values
through the Worker's `env` bindings; the Node-only `dotenv` runtime package is
therefore neither needed nor imported into the Worker bundle.

Set the optional, non-secret `MCP_PUBLIC_URL` to the public Worker base URL,
for example `https://worker.example.com`. It selects the one accepted Host and
browser Origin at request time; its path, query, and fragment are ignored.
`wrangler dev` reads it from `.env`; deployed Workers receive the same variable
from Wrangler or Cloudflare environment configuration. HTTPS is required except
for localhost development URLs. API keys remain separate secrets.

Do not paste API keys into chat, source control, logs, or command arguments.
`GET /health` reports only whether the required variables exist, never their
values. Exact user coordinates are forwarded over HTTPS only for the requested
nearby-stop or journey query and are not stored or logged by this application.

To run the server with explicit synthetic data instead, set `DATA_MODE=mock`.
Synthetic responses always contain `sampleData: true`.

Run the interactive prototype:

```sh
pnpm prototype
```

Without `MCP_PUBLIC_URL`, the prototype accepts only localhost host/origin
headers. A configured public hostname does not implicitly allow localhost,
preview, or custom domains.

Verify the tolerant API-response mappings without making network calls:

```sh
pnpm verify:live-mapping
pnpm verify:mcp-contract
```

## Deployment

Pull requests run `lint`, `test`, and a non-mutating Wrangler dry-run without
Cloudflare credentials. Pushes to `main` (or a manual `workflow_dispatch`) run
the same verification first, then deploy and require the production health
endpoint to return HTTP 200: `main -> verify -> deploy -> health`.

Configure these GitHub Actions secrets for deployment:

- `CLOUDFLARE_API_TOKEN` — scoped to the target account with only the Worker
  script deployment permissions required by this repository.
- `CLOUDFLARE_ACCOUNT_ID` — the target Cloudflare account ID.
- `TRAFIKLAB_API_KEY` — the Trafiklab Realtime APIs key.
- `RESROBOT_API_KEY` — the ResRobot v2.1 key.

Set the non-secret repository variable `CLOUDFLARE_WORKER_URL` to the public
Worker URL, without a trailing `/health` path. During deployment, the workflow
uploads `TRAFIKLAB_API_KEY` and `RESROBOT_API_KEY` from GitHub Actions to
Cloudflare as encrypted Worker runtime secrets. Their values are not committed,
logged, or compiled into the Worker bundle.

See Cloudflare's [GitHub Actions authentication guidance](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
and [Worker secrets guidance](https://developers.cloudflare.com/workers/configuration/secrets/).

The terminal UI always uses deliberately small synthetic scenarios. Use the
keyboard controls to vary walking distance, transfers, and intermediate-stop
detail, then inspect the full structured result after every action.

The replacement MCP tools are `search_lulea_bus_stops`,
`find_nearby_lulea_bus_stops`, `plan_lulea_bus_journey`, and
`get_lulea_bus_departures`. Exact user coordinates are still used only for the
requested call and are never stored or logged.
