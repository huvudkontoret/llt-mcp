# Prototype verdict

## Current live boundary

- Stop IDs from Trafiklab stop groups are the national IDs accepted by
  ResRobot; the prototype does not maintain a local ID mapping table.
- LLT operator validation is deferred for stop candidates and strict for actual
  departure and journey results.
- The optional ResRobot operator ID is only an upstream optimisation. Local
  post-filtering by the LLT agency/operator remains mandatory.
- No realtime value, cancellation, delay, profile, coordinate, or query is
  persisted.

Fill this in after trying the prototype:

- What felt useful?
- What was missing?
- Which fields were unnecessary or confusing?
- Should the prototype be deleted or absorbed into production code?
