import assert from "node:assert/strict";
import { test } from "node:test";
import { stockholmLocalToIso, toStockholmQueryTime } from "../src/time.ts";

for (const [instant, local] of [
  ["2026-01-17T08:00:00Z", "2026-01-17T09:00"],
  ["2026-07-17T08:00:00Z", "2026-07-17T10:00"],
  ["2026-03-29T00:30:00Z", "2026-03-29T01:30"],
  ["2026-03-29T01:30:00Z", "2026-03-29T03:30"],
  ["2026-10-25T00:30:00Z", "2026-10-25T02:30"],
  ["2026-10-25T01:30:00Z", "2026-10-25T02:30"],
  ["2026-09-17T23:30:00Z", "2026-09-18T01:30"],
]) {
  test(`converts ${instant} to Stockholm query time`, () => {
    assert.equal(toStockholmQueryTime(instant!).dateTime, local);
  });
}
test("converts unambiguous local times and honors explicit offsets at the DST overlap", () => {
  assert.equal(stockholmLocalToIso("2026-01-17T09:00:00"), "2026-01-17T08:00:00.000Z");
  assert.equal(stockholmLocalToIso("2026-07-17T10:00:00"), "2026-07-17T08:00:00.000Z");
  assert.equal(stockholmLocalToIso("2026-10-25T02:30:00+02:00"), "2026-10-25T00:30:00.000Z");
  assert.equal(stockholmLocalToIso("2026-10-25T02:30:00+01:00"), "2026-10-25T01:30:00.000Z");
  assert.throws(() => toStockholmQueryTime("invalid"));
  assert.throws(() => stockholmLocalToIso("invalid"));
});
