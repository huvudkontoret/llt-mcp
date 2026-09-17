# Deployment

## Delivery flow

Pull requests run a bundle dry-run, offline tests, type checking, and formatting
checks. Pushes to `main` run the same gate before deployment. Manual dispatch is
restricted to `main`. Production jobs are serialized, with a ten-minute timeout.

The deployed Worker remains `hk-llt-mcp-prototype`, and its MCP endpoint remains:

`https://hk-llt-mcp-prototype.huvudkontoret-io.workers.dev/mcp`

Keep this identity and URL until a separate client migration is planned. The MCP
server identity remains unchanged; the private package version is independent.

## Configuration

GitHub Actions requires these repository secrets:

- `CLOUDFLARE_API_TOKEN`: Worker deployment permissions for the target account.
- `CLOUDFLARE_ACCOUNT_ID`.
- `TRAFIKLAB_API_KEY`.
- `RESROBOT_API_KEY`.

Set repository variable `CLOUDFLARE_WORKER_URL` to the HTTPS Worker base URL.
It must match production `MCP_PUBLIC_URL` in Wrangler configuration. The workflow
writes provider keys into a restricted temporary file, uploads them as encrypted
runtime secrets, and removes the file on exit. Builds and pull requests require
none of these credentials.

## Verification

After deploying the checked revision, the workflow records its commit and Worker
version in the run summary and runs `pnpm verify:deployed`. This checks:

1. `/health` reports configured live mode.
2. MCP initialization and the exact four-tool list, schemas, and annotations.
3. A fixed public stop search for Smedjegatan through Trafiklab.
4. A nearby lookup through ResRobot using the returned public stop coordinates.

The checks require schema-valid live results, report only a pass or the failing
phase, and never print tool payloads. They do not depend on buses departing at a
particular time. They consume two provider queries per run. The deployed check
is intentionally separate from offline tests and can also be run manually with
`CLOUDFLARE_WORKER_URL` set. It verifies connectivity, not every travel scenario.

A failed post-deployment check fails the workflow even though the new Worker may
already be serving traffic. Inspect the phase and provider diagnostics before
considering [rollback](rollback.md). There is no automatic rollback on provider
outages and no scheduled monitoring in this phase.

## Diagnostics

Application logs for provider request failures contain only operation name, provider name, elapsed
milliseconds, HTTP status when available, and a fixed error category: `network`,
`timeout`, `http`, `invalid_json`, or `provider_error`. These application logs
exclude API keys, coordinates, queries, upstream URLs, and response bodies.

Cloudflare logs and traces are enabled with full sampling and persistence.
Invocation logs remain disabled, and query-string redaction is disabled. These
platform settings are separate from the sanitized application failure logs.
A missing key is a configuration failure visible through `/health`.

Inspect these diagnostics in Cloudflare Worker logs. HTTP 429 points to upstream
rate limiting; network/timeouts can indicate an upstream outage. The service
retains its ten-second provider timeout and does not add retries. Existing
unauthenticated access remains; new access controls and usage limits are deferred.
