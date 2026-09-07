# Prototype verdict

## Current live boundary

- Stop IDs from Trafiklab stop groups are the national IDs accepted by
  ResRobot; the prototype does not maintain a local ID mapping table.
- Operator validation is deferred for stop candidates and strict for actual
  departure and journey results. The supported operators are Luleå Lokaltrafik
  and Länstrafiken Norrbotten; mixed journeys are permitted unless the caller
  chooses one provider.
- ResRobot is intentionally over-fetched without an LLT-only upstream operator
  filter. Mandatory local normalization and filtering prevents one provider
  from crowding supported results out before validation.
- No realtime value, cancellation, delay, profile, coordinate, or query is
  persisted.

Fill this in after trying the prototype:

- What felt useful?
- What was missing?
- Which fields were unnecessary or confusing?
- Should the prototype be deleted or absorbed into production code?
