import assert from "node:assert/strict";

import { selectLltDepartures, selectLltJourneys } from "./domain.ts";
import {
  LiveTimetableProvider,
  mapResRobotJourneyResponse,
  mapResRobotNearbyResponse,
  mapTrafiklabDeparturesResponse,
  mapTrafiklabStopResponse,
} from "./live-provider.ts";
import {
  departureSchema,
  journeyOptionSchema,
  stopCandidateSchema,
} from "./schemas.ts";

const trafiklabStops = mapTrafiklabStopResponse({
  stopGroups: [
    {
      id: "740000101",
      name: "Kronan",
      group_type: "META_STOP",
      transport_modes: ["BUS"],
      stops: [
        { id: "101", name: "Kronan", lat: 65.5775, lon: 22.1905 },
        { id: "102", name: "Kronan", lat: 65.5777, lon: 22.1907 },
      ],
    },
    {
      id: "740000999",
      name: "Stockholm",
      group_type: "META_STOP",
      transport_modes: ["BUS"],
      stops: [{ id: "999", name: "Stockholm", lat: 59.3293, lon: 18.0686 }],
    },
  ],
});
assert.equal(trafiklabStops.length, 1);
assert.equal(trafiklabStops[0]?.stopId, "740000101");
stopCandidateSchema.array().parse(trafiklabStops);

const nearbyStops = mapResRobotNearbyResponse(
  {
    stopLocationOrCoordLocation: [
      {
        StopLocation: {
          extId: "740000101",
          name: "Kronan",
          lat: 65.5775,
          lon: 22.1905,
          dist: 120,
          products: 128,
        },
      },
      {
        StopLocation: {
          extId: "740000102",
          name: "Endast tåg",
          lat: 65.578,
          lon: 22.19,
          dist: 140,
          products: 4,
        },
      },
    ],
  },
  65.577,
  22.19,
  1_000,
);
assert.deepEqual(
  nearbyStops.map((stop) => stop.stopId),
  ["740000101"],
);
stopCandidateSchema.array().parse(nearbyStops);

const journeys = mapResRobotJourneyResponse({
  Trip: [
    tripFixture("llt", "Luleå Lokaltrafik AB"),
    tripFixture("mixed", "Länstrafiken Norrbotten"),
  ],
});
const selectedJourneys = selectLltJourneys(journeys, {
  maxWalkingMeters: 1_000,
  maxTransfers: 2,
  maxResults: 3,
  includeIntermediateStops: true,
});
assert.equal(selectedJourneys.length, 1);
assert.equal(selectedJourneys[0]?.id, "llt");
assert.equal(selectedJourneys[0]?.legs[1]?.mode, "bus");
if (selectedJourneys[0]?.legs[1]?.mode === "bus") {
  assert.equal(selectedJourneys[0].legs[1].operator, "Luleå Lokaltrafik");
}
journeyOptionSchema.array().parse(selectedJourneys);

const departures = mapTrafiklabDeparturesResponse(
  {
    departures: [
      departureFixture("Luleå Lokaltrafik AB", "1", "Smedjegatan"),
      departureFixture("Länstrafiken Norrbotten", "100", "Boden"),
    ],
  },
  "740000101",
);
const selectedDepartures = selectLltDepartures(departures, { maxResults: 10 });
assert.equal(selectedDepartures.length, 1);
assert.equal(selectedDepartures[0]?.plannedDeparture, "2026-09-06T06:10:00.000Z");
departureSchema.array().parse(selectedDepartures);

const nearbyProvider = new LiveTimetableProvider({
  resRobotApiKey: "test-key",
  fetcher: async (input) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    assert.equal(url.searchParams.get("originCoordLong"), "22.1905");
    assert.equal(url.searchParams.has("originCoordLon"), false);
    return Response.json({ StopLocation: [] });
  },
});
await nearbyProvider.nearbyStops(65.5775, 22.1905, 1_000, 5);

console.log("Live-provider mappings smoke check passed.");

function tripFixture(id: string, operator: string) {
  return {
    tripId: id,
    duration: "PT25M",
    Origin: endpoint("Kronan", "740000101", 65.5775, 22.1905, "08:00:00"),
    Destination: endpoint(
      "Smedjegatan",
      "740000201",
      65.5845,
      22.154,
      "08:25:00",
    ),
    LegList: {
      Leg: [
        {
          type: "WALK",
          duration: "PT4M",
          dist: 300,
          Origin: endpoint("Delad position", "coord:start", 65.576, 22.191, "08:00:00"),
          Destination: endpoint("Kronan", "740000101", 65.5775, 22.1905, "08:04:00"),
          Product: [],
        },
        {
          type: "JNY",
          direction: "Smedjegatan",
          duration: "PT21M",
          Origin: endpoint("Kronan", "740000101", 65.5775, 22.1905, "08:04:00"),
          Destination: endpoint(
            "Smedjegatan",
            "740000201",
            65.5845,
            22.154,
            "08:25:00",
          ),
          Product: [
            {
              name: "Lokalbuss 1",
              displayNumber: "1",
              cls: "128",
              operator,
            },
          ],
          Stops: {
            Stop: [
              {
                extId: "740000150",
                name: "Kronandalen",
                lat: 65.58,
                lon: 22.18,
              },
            ],
          },
        },
      ],
    },
  };
}

function endpoint(
  name: string,
  extId: string,
  lat: number,
  lon: number,
  time: string,
) {
  return { name, extId, lat, lon, date: "2026-09-06", time };
}

function departureFixture(operator: string, designation: string, direction: string) {
  return {
    scheduled: "2026-09-06T08:10:00",
    route: { designation, direction, transport_mode: "BUS" },
    agency: { name: operator, operator: "Underleverantör" },
    stop: { id: "platform:1", name: "Kronan", lat: 65.5775, lon: 22.1905 },
  };
}
