import assert from "node:assert/strict";

import { selectSupportedDepartures, selectSupportedJourneys } from "./domain.ts";
import {
  LiveTimetableProvider,
  mapResRobotJourneyResponse,
  mapResRobotNearbyResponse,
  mapTrafiklabDeparturesResponse,
  mapTrafiklabStopResponse,
} from "./live-provider.ts";
import { departureSchema, journeyOptionSchema, stopCandidateSchema } from "./schemas.ts";

const trafiklabStops = mapTrafiklabStopResponse({
  stopGroups: [
    { id: "740000101", name: "Kronan", group_type: "META_STOP", transport_modes: ["BUS"], stops: [{ id: "101", name: "Kronan", lat: 65.5775, lon: 22.1905 }] },
    { id: "740000999", name: "Stockholm", group_type: "META_STOP", transport_modes: ["BUS"], stops: [{ id: "999", name: "Stockholm", lat: 59.3293, lon: 18.0686 }] },
  ],
});
assert.deepEqual(trafiklabStops.map((stop) => stop.stopId), ["740000101"]);
stopCandidateSchema.array().parse(trafiklabStops);

const nearbyStops = mapResRobotNearbyResponse({
  stopLocationOrCoordLocation: [
    { StopLocation: { extId: "740000101", name: "Kronan", lat: 65.5775, lon: 22.1905, dist: 120, products: 128 } },
    { StopLocation: { extId: "740000102", name: "Endast tåg", lat: 65.578, lon: 22.19, dist: 140, products: 4 } },
  ],
}, 65.577, 22.19, 1_000);
assert.deepEqual(nearbyStops.map((stop) => stop.stopId), ["740000101"]);
stopCandidateSchema.array().parse(nearbyStops);

const journeys = mapResRobotJourneyResponse({
  Trip: [
    tripFixture("llt", ["Luleå Lokaltrafik AB"]),
    tripFixture("norrbotten", ["Länstrafiken Norrbotten"]),
    tripFixture("mixed", ["LLT", "Länstrafiken Norrbotten AB"]),
    tripFixture("unsupported", ["Okänd trafik"]),
  ],
});
const selectedJourneys = selectSupportedJourneys(journeys, {
  maxWalkingMeters: 1_000, maxTransfers: 2, maxResults: 4, includeIntermediateStops: true,
});
assert.deepEqual(selectedJourneys.map((journey) => journey.id), ["llt", "norrbotten", "mixed"]);
assert.equal(selectedJourneys[1]?.legs[1]?.mode, "bus");
if (selectedJourneys[1]?.legs[1]?.mode === "bus") {
  assert.equal(selectedJourneys[1].legs[1].operator, "Länstrafiken Norrbotten");
}
journeyOptionSchema.array().parse(selectedJourneys);
const lltJourneys = selectSupportedJourneys(journeys, {
  maxWalkingMeters: 1_000, maxTransfers: 2, maxResults: 4, includeIntermediateStops: true,
  operator: "Luleå Lokaltrafik",
});
assert.deepEqual(lltJourneys.map((journey) => journey.id), ["llt"]);

const departures = mapTrafiklabDeparturesResponse({
  departures: [
    departureFixture("Luleå Lokaltrafik AB", "1", "Smedjegatan"),
    departureFixture("Länstrafiken Norrbotten", "100", "Boden"),
    departureFixture("Okänd trafik", "X", "Ingenstans"),
  ],
}, "740000101");
const selectedDepartures = selectSupportedDepartures(departures, { maxResults: 10 });
assert.deepEqual(selectedDepartures.map((departure) => departure.operator), ["Luleå Lokaltrafik", "Länstrafiken Norrbotten"]);
departureSchema.array().parse(selectedDepartures);
assert.deepEqual(selectSupportedDepartures(departures, {
  maxResults: 10, operator: "Luleå Lokaltrafik",
}).map((departure) => departure.operator), ["Luleå Lokaltrafik"]);

const nearbyProvider = new LiveTimetableProvider({
  resRobotApiKey: "test-key",
  fetcher: async (input) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    assert.equal(url.searchParams.get("originCoordLong"), "22.1905");
    assert.equal(url.searchParams.has("originCoordLon"), false);
    return Response.json({ StopLocation: [] });
  },
});
await nearbyProvider.nearbyStops(65.5775, 22.1905, 1_000, 5);

const journeyProvider = new LiveTimetableProvider({
  resRobotApiKey: "test-key",
  fetcher: async (input) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    assert.equal(url.searchParams.get("operators"), null);
    assert.equal(url.searchParams.get("numF"), "9");
    return Response.json({ Trip: [] });
  },
});
await journeyProvider.journeyOptions({
  origin: { kind: "stop", stopId: "a" }, destination: { kind: "stop", stopId: "b" },
  at: "2026-09-06T06:00:00.000Z", arriveBy: false, maxWalkingMeters: 1_000,
  maxTransfers: 2, maxResults: 3, includeIntermediateStops: false,
});

console.log("Live-provider mappings smoke check passed.");

function tripFixture(id: string, operators: string[]) {
  const legs = operators.map((operator, index) => ({
    type: "JNY", direction: "Smedjegatan", duration: "PT10M",
    Origin: endpoint(index === 0 ? "Kronan" : "Centrum", `74000010${index}`, 65.5775, 22.1905, index === 0 ? "08:04:00" : "08:16:00"),
    Destination: endpoint(index === operators.length - 1 ? "Smedjegatan" : "Centrum", `74000020${index}`, 65.5845, 22.154, index === operators.length - 1 ? "08:25:00" : "08:14:00"),
    Product: [{ name: "Lokalbuss 1", displayNumber: "1", cls: "128", operator }],
  }));
  return {
    tripId: id, duration: "PT25M",
    Origin: endpoint("Kronan", "740000101", 65.5775, 22.1905, "08:00:00"),
    Destination: endpoint("Smedjegatan", "740000201", 65.5845, 22.154, "08:25:00"),
    LegList: { Leg: [{
      type: "WALK", duration: "PT4M", dist: 300,
      Origin: endpoint("Delad position", "coord:start", 65.576, 22.191, "08:00:00"),
      Destination: endpoint("Kronan", "740000101", 65.5775, 22.1905, "08:04:00"), Product: [],
    }, ...legs] },
  };
}

function endpoint(name: string, extId: string, lat: number, lon: number, time: string) {
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
