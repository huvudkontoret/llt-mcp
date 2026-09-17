# Rollback

Use rollback when a deployed application change causes a regression. First
separate application failures from missing configuration, expired credentials,
and provider outages. Those problems may persist across Worker versions.

1. Check the failed workflow summary for its commit, Worker version, and failing
   verification phase. Compare with the last successfully verified deployment.
2. In the Cloudflare dashboard or `pnpm exec wrangler deployments list`, locate
   the known working version. Coordinate with ongoing deployment jobs so a new
   automatic deployment does not immediately replace the rollback.
3. With authorization to change production, run:

   ```sh
   pnpm exec wrangler rollback <known-working-version-id> --message "Restore last verified release"
   ```

4. Set `CLOUDFLARE_WORKER_URL` to the production base URL and run
   `pnpm verify:deployed`. Record the version and verification outcome in the
   incident or change record. Do not record response payloads or credentials.
5. Correct or revert the faulty code through a PR before the next main deployment.
   A runtime rollback does not revert Git history.

No database or persisted user state needs migrating in this version. Review
configuration and secret changes separately when selecting the target version.
See [Cloudflare rollback guidance](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/).
