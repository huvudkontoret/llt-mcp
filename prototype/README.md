# LLT MCP logic prototype

> PROTOTYPE — throw this away or absorb the validated parts before production.

The question is whether four small MCP tools and their structured responses are
enough for an AI agent to answer practical LLT questions without storing data:
stop search, nearby stops, planned departures, and journey planning with walking
and transfers.

The MCP endpoint now defaults to live mode:

- Trafiklab Stop Lookup for stop-name search
- ResRobot Nearby stops for coordinate search
- Trafiklab Timetables for planned departures
- ResRobot Route planner for journeys

Actual departures and every bus leg are filtered to Luleå Lokaltrafik. Stop
candidates are restricted geographically and to local-bus stops, but remain
marked as unverified until a departure or journey query proves the operator.
Realtime fields are deliberately ignored.

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

The prototype intentionally accepts only localhost host/origin headers. Before
deploying it to Workers, configure the final public hostname in Hono's MCP host
and origin validation.

Verify the tolerant API-response mappings without making network calls:

```sh
pnpm verify:live-mapping
```

The terminal UI always uses deliberately small synthetic scenarios. Use the
keyboard controls to vary walking distance, transfers, and intermediate-stop
detail, then inspect the full structured result after every action.
