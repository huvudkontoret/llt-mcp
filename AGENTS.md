# Agent notes: hk-llt

Part of the Huvudkontoret workspace. Start with `hk context hk-llt`, then read
[CONTEXT.md](CONTEXT.md) for domain language and [README.md](README.md) for setup.

## Commands

- `hk status hk-llt`: project state.
- `hk dev hk-llt`: local Wrangler development server.
- `hk build hk-llt`: Worker bundle dry-run, with no deployment.
- `hk test hk-llt`: named offline tests and local Worker protocol checks.
- `hk verify hk-llt`: build, tests, then type and formatting checks.
- `hk sync hk-llt --check`: inspect workspace-default differences without writing.

Use pnpm, matching `package.json` and `pnpm-lock.yaml`. Command overrides and
project-owned files are declared in `hk.json`. The local workspace uses an umbrella layout with `main/` and sibling feature
worktrees. Use `hk verify hk-llt --worktree <name>` for a feature worktree,
and run pnpm scripts from that worktree for local development.

## Conventions

Write code, comments, documentation, commits, PRs, and issues in English.
Product content follows the language needed by its users. Use conventional
commit messages and preserve unrelated local changes.

Keep planned timetable data distinct from realtime information and mark mock
data as synthetic. Preserve operator filtering and host/origin validation.
Never put API keys or exact user coordinates in source, logs, or shared output.

Deployment is separate from local verification. The deployment workflow runs
on pushes to `main` and manual dispatch; see
[deployment setup](docs/runbooks/deployment.md).
