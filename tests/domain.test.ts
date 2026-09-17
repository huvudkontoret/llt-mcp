import assert from "node:assert/strict";
import { test } from "node:test";
import { selectSupportedJourneys } from "../src/domain.ts";
import { MockTimetableProvider } from "../src/mock-provider.ts";
import { planJourneyInputSchema } from "../src/schemas.ts";
import { TimetableService } from "../src/service.ts";
import { LiveTimetableProvider } from "../src/live-provider.ts";

const input = planJourneyInputSchema.parse({
  origin: { kind: "stop", stopId: "sample:kronan" },
  destination: { kind: "stop", stopId: "sample:sunderby" },
  time: { mode: "departAt", at: "2026-09-17T08:00:00Z" },
});

test("journey selection enforces walking, transfer and result limits at their boundaries", async () => {
  const provider = new MockTimetableProvider();
  const source = await provider.journeyOptions({ ...input, at: input.time!.at, arriveBy: false });
  const base = source.find((journey) => journey.legs.some((leg) => leg.mode === "walk"))!;
  const journeys = [
    { ...base, id: "walking-over", walkingDistanceMeters: 1_001, transfers: 1 },
    { ...base, id: "transfers-over", walkingDistanceMeters: 1_000, transfers: 2 },
    { ...base, id: "boundary", walkingDistanceMeters: 1_000, transfers: 1 },
  ];
  const selected = selectSupportedJourneys(journeys, { ...input, maxTransfers: 1, maxResults: 1 });
  assert.deepEqual(
    selected.map((journey) => journey.id),
    ["boundary"],
  );
  assert.ok(
    selected[0]!.legs.every((leg) => leg.mode === "walk" || leg.intermediateStops === undefined),
  );
  const detailed = selectSupportedJourneys([base], { ...input, includeIntermediateStops: true });
  assert.ok(detailed[0]!.legs.some((leg) => leg.mode === "bus" && leg.intermediateStops?.length));
  assert.deepEqual(selectSupportedJourneys([], input), []);
});

test("service orders journeys by planned arrival and preserves synthetic attribution", async () => {
  const result = await new TimetableService(new MockTimetableProvider()).planJourney(input);
  assert.equal(result.sampleData, true);
  assert.equal(result.scheduleKind, "planned");
  assert.equal(result.timeZone, "Europe/Stockholm");
  assert.ok(result.attribution);
  const arrivals = result.journeys.map((journey) => Date.parse(journey.plannedArrival));
  assert.deepEqual(
    arrivals,
    [...arrivals].sort((a, b) => a - b),
  );
  assert.ok(result.journeys.length > 0 && result.journeys.length <= 3);
});

test("live departures include only the fixed 60 minute window, ignoring realtime values", async () => {
  const from = "2026-09-17T08:00:00Z";
  const provider = new LiveTimetableProvider({
    trafiklabApiKey: "test-key",
    fetcher: async () =>
      Response.json({
        departures: [-1, 0, 60, 61].map((minutes) => ({
          scheduled: new Date(Date.parse(from) + minutes * 60_000).toISOString(),
          realtime: "2099-01-01T00:00:00Z",
          route: { designation: String(minutes), direction: "Centrum", transport_mode: "BUS" },
          agency: { name: "Luleå Lokaltrafik AB" },
          stop: { id: "stop", name: "Kronan", lat: 65.5775, lon: 22.1905 },
        })),
      }),
  });
  assert.deepEqual(
    (await provider.departures({ stopId: "stop", from })).map((departure) => departure.line),
    ["0", "60"],
  );
});
