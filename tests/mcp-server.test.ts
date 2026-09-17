import { test } from "node:test";
import assert from "node:assert/strict";

import { MockTimetableProvider } from "../src/mock-provider.ts";
import { TimetableService } from "../src/service.ts";
import {
  departuresInputSchema,
  departureSchema,
  journeyOptionSchema,
  planJourneyInputSchema,
  stopCandidateSchema,
} from "../src/schemas.ts";

test("preserves operator defaults, schema contracts and synthetic journey labeling", async () => {
  const mockService = new TimetableService(new MockTimetableProvider());
  assert.equal(
    planJourneyInputSchema.parse({
      origin: { kind: "stop", stopId: "a" },
      destination: { kind: "stop", stopId: "b" },
    }).operator,
    undefined,
  );
  assert.equal(departuresInputSchema.parse({ stopId: "a" }).operator, undefined);
  assert.equal(
    planJourneyInputSchema.parse({
      origin: { kind: "stop", stopId: "a" },
      destination: { kind: "stop", stopId: "b" },
      operator: "Luleå Lokaltrafik",
    }).operator,
    "Luleå Lokaltrafik",
  );
  assert.throws(() => departuresInputSchema.parse({ stopId: "a", operator: "Both" }));
  assert.equal(
    (
      await mockService.planJourney({
        origin: { kind: "stop", stopId: "a" },
        destination: { kind: "stop", stopId: "b" },
        maxWalkingMeters: 1_000,
        maxTransfers: 2,
        maxResults: 3,
        includeIntermediateStops: false,
      })
    ).journeys.every((journey) => journey.verificationUrl === undefined),
    true,
  );

  stopCandidateSchema.parse({
    stopId: "a",
    name: "A",
    latitude: 65.5,
    longitude: 22.1,
    serviceVerification: "unverified",
  });
  for (const operator of ["Luleå Lokaltrafik", "Länstrafiken Norrbotten"] as const) {
    departureSchema.parse({
      operator,
      line: "1",
      direction: "A",
      stop: { stopId: "a", name: "A", latitude: 65.5, longitude: 22.1 },
      plannedDeparture: "2026-09-06T06:10:00.000Z",
    });
    journeyOptionSchema.parse({
      id: operator,
      plannedDeparture: "2026-09-06T06:00:00.000Z",
      plannedArrival: "2026-09-06T06:10:00.000Z",
      ...(operator === "Luleå Lokaltrafik"
        ? { verificationUrl: "https://reseplanerare.resrobot.se/bin/query.exe/sn?start=1" }
        : {}),
      durationMinutes: 10,
      transfers: 0,
      walkingDistanceMeters: 0,
      legs: [
        {
          mode: "bus",
          operator,
          line: "1",
          direction: "A",
          fromStop: { stopId: "a", name: "A", latitude: 65.5, longitude: 22.1 },
          toStop: { stopId: "b", name: "B", latitude: 65.6, longitude: 22.2 },
          plannedDeparture: "2026-09-06T06:00:00.000Z",
          plannedArrival: "2026-09-06T06:10:00.000Z",
        },
      ],
    });
  }
});
