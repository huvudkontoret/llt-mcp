# Luleå bus MCP: domain context

This Huvudkontoret service uses four read-only MCP tools to answer
practical bus travel questions without storing user data. The implementation
lives in `src/` and runs as a Cloudflare Worker.

## Domain language

- **Stop candidate:** a geographically filtered local-bus stop returned by name
  or coordinate search. Its `serviceVerification` is `unverified` until a
  departure or journey query establishes the operator.
- **Supported operator:** Luleå Lokaltrafik or Länstrafiken Norrbotten. Departures
  and bus legs must belong to a supported operator.
- **Planned departure:** a timetable departure, not a realtime prediction.
  Realtime fields from providers are deliberately ignored.
- **Journey:** a sequence of walking and bus legs, constrained by walking
  distance and transfers. It may combine both supported operators. An explicit
  operator filter excludes journeys using the other operator.
- **Synthetic data:** mock responses marked with `sampleData: true`. The Worker
  defaults to live data; `DATA_MODE=mock` selects the synthetic provider.
- **Verification URL:** a ResRobot search link for independently checking a
  journey. It is not an immutable trip record and can contain user coordinates.

## Tools and providers

| MCP tool                      | Live data source       |
| ----------------------------- | ---------------------- |
| `search_lulea_bus_stops`      | Trafiklab Stop Lookup  |
| `find_nearby_lulea_bus_stops` | ResRobot Nearby stops  |
| `get_lulea_bus_departures`    | Trafiklab Timetables   |
| `plan_lulea_bus_journey`      | ResRobot Route planner |

Exact coordinates are sent to the relevant provider only for the requested
lookup. The application does not store or log them. API keys are runtime
secrets. `MCP_PUBLIC_URL` is non-secret configuration that selects the accepted
host and browser origin. `/health` checks configuration presence, not upstream
provider availability.

## Source map

- `src/schemas.ts` and `src/domain.ts`: response contracts and
  operator, walking, and transfer rules.
- `src/service.ts` and `src/provider.ts`: use cases and provider interface.
- `src/live-provider.ts` and `src/mock-provider.ts`: provider implementations.
- `src/mcp-server.ts`: MCP tool definitions.
- `src/worker.ts`: HTTP routes, runtime bindings, and host/origin validation.
- `tests/*.test.ts`: offline mapping, contract, and Worker checks.
- `.github/workflows/`: verification and deployment workflows.

See [README.md](README.md) for commands and
[development](docs/runbooks/development.md) and [deployment](docs/runbooks/deployment.md) for operations.
