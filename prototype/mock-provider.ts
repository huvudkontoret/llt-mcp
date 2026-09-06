import { lltOperator } from "./domain.ts";
import type { ProviderJourneyOption, TimetableProvider } from "./provider.ts";
import type {
  Departure,
  Place,
  StopCandidate,
  StopReference,
} from "./schemas.ts";

const kronan: StopReference = {
  stopId: "sample:kronan",
  name: "Kronan (provhållplats)",
  latitude: 65.5775,
  longitude: 22.1905,
};

const kronandalen: StopReference = {
  stopId: "sample:kronandalen",
  name: "Kronandalen (provhållplats)",
  latitude: 65.5791,
  longitude: 22.184,
};

const centrum: StopReference = {
  stopId: "sample:centrum",
  name: "Luleå centrum (provhållplats)",
  latitude: 65.5848,
  longitude: 22.1567,
};

const gammelstad: StopReference = {
  stopId: "sample:gammelstad",
  name: "Gammelstad (provhållplats)",
  latitude: 65.6407,
  longitude: 22.0112,
};

const sunderby: StopReference = {
  stopId: "sample:sunderby",
  name: "Sunderby sjukhus (provhållplats)",
  latitude: 65.673,
  longitude: 21.936,
};

const stops = [kronan, kronandalen, centrum, gammelstad, sunderby];

export class MockTimetableProvider implements TimetableProvider {
  readonly sampleData = true;
  readonly attribution = "Synthetic prototype data";

  async searchStops(query: string, maxResults: number): Promise<StopCandidate[]> {
    const normalized = query.toLocaleLowerCase("sv-SE");

    return stops
      .filter((stop) => stop.name.toLocaleLowerCase("sv-SE").includes(normalized))
      .slice(0, maxResults)
      .map((stop) => ({ ...stop, lltService: "unverified" }));
  }

  async nearbyStops(
    latitude: number,
    longitude: number,
    radiusMeters: number,
    maxResults: number,
  ): Promise<StopCandidate[]> {
    return stops
      .map((stop) => ({
        ...stop,
        distanceMeters: Math.round(distanceMeters(latitude, longitude, stop.latitude, stop.longitude)),
        lltService: "unverified" as const,
      }))
      .filter((stop) => stop.distanceMeters <= radiusMeters)
      .sort((left, right) => left.distanceMeters - right.distanceMeters)
      .slice(0, maxResults);
  }

  async journeyOptions(input: {
    origin: Place;
    destination: Place;
    at: string;
    arriveBy: boolean;
    maxWalkingMeters: number;
    maxTransfers: number;
    maxResults: number;
    includeIntermediateStops: boolean;
  }): Promise<ProviderJourneyOption[]> {
    const anchor = Date.parse(input.at);
    const start = Number.isNaN(anchor) ? Date.now() : anchor;
    const at = (minutes: number) => new Date(start + minutes * 60_000).toISOString();

    return [
      {
        id: "sample-invalid-other-operator",
        plannedDeparture: at(2),
        plannedArrival: at(28),
        durationMinutes: 26,
        transfers: 0,
        walkingDistanceMeters: 200,
        legs: [
          {
            mode: "bus",
            operator: "Luleå Lokaltrafik",
            line: "PROV",
            direction: "Ej LLT hela vägen",
            fromStop: kronan,
            toStop: centrum,
            plannedDeparture: at(2),
            plannedArrival: at(12),
          },
          {
            mode: "bus",
            operator: "Länstrafiken Norrbotten",
            line: "PROV-X",
            direction: sunderby.name,
            fromStop: centrum,
            toStop: sunderby,
            plannedDeparture: at(14),
            plannedArrival: at(28),
          },
        ],
      },
      {
        id: "sample-fastest",
        plannedDeparture: at(5),
        plannedArrival: at(40),
        durationMinutes: 35,
        transfers: 1,
        walkingDistanceMeters: 450,
        legs: [
          {
            mode: "walk",
            from: "Delad position",
            to: kronan.name,
            distanceMeters: 450,
            durationMinutes: 6,
          },
          {
            mode: "bus",
            operator: lltOperator,
            line: "PROV-A",
            direction: centrum.name,
            fromStop: kronan,
            toStop: centrum,
            plannedDeparture: at(11),
            plannedArrival: at(21),
            intermediateStops: [kronandalen],
          },
          {
            mode: "bus",
            operator: lltOperator,
            line: "PROV-B",
            direction: sunderby.name,
            fromStop: centrum,
            toStop: sunderby,
            plannedDeparture: at(25),
            plannedArrival: at(40),
            intermediateStops: [gammelstad],
          },
        ],
      },
      {
        id: "sample-direct",
        plannedDeparture: at(3),
        plannedArrival: at(45),
        durationMinutes: 42,
        transfers: 0,
        walkingDistanceMeters: 900,
        legs: [
          {
            mode: "walk",
            from: "Delad position",
            to: kronandalen.name,
            distanceMeters: 900,
            durationMinutes: 12,
          },
          {
            mode: "bus",
            operator: lltOperator,
            line: "PROV-C",
            direction: sunderby.name,
            fromStop: kronandalen,
            toStop: sunderby,
            plannedDeparture: at(15),
            plannedArrival: at(45),
            intermediateStops: [centrum, gammelstad],
          },
        ],
      },
      {
        id: "sample-short-walk",
        plannedDeparture: at(1),
        plannedArrival: at(50),
        durationMinutes: 49,
        transfers: 2,
        walkingDistanceMeters: 180,
        legs: [
          {
            mode: "walk",
            from: "Delad position",
            to: kronan.name,
            distanceMeters: 180,
            durationMinutes: 3,
          },
          {
            mode: "bus",
            operator: lltOperator,
            line: "PROV-D",
            direction: centrum.name,
            fromStop: kronan,
            toStop: centrum,
            plannedDeparture: at(4),
            plannedArrival: at(15),
          },
          {
            mode: "bus",
            operator: lltOperator,
            line: "PROV-E",
            direction: gammelstad.name,
            fromStop: centrum,
            toStop: gammelstad,
            plannedDeparture: at(20),
            plannedArrival: at(34),
          },
          {
            mode: "bus",
            operator: lltOperator,
            line: "PROV-F",
            direction: sunderby.name,
            fromStop: gammelstad,
            toStop: sunderby,
            plannedDeparture: at(38),
            plannedArrival: at(50),
          },
        ],
      },
    ];
  }

  async departures(input: { stopId: string; from?: string }): Promise<
    Array<Departure & { operator: string }>
  > {
    const anchor = input.from ? Date.parse(input.from) : Date.now();
    const start = Number.isNaN(anchor) ? Date.now() : anchor;
    const at = (minutes: number) => new Date(start + minutes * 60_000).toISOString();

    return [
      {
        operator: lltOperator,
        line: "PROV-A",
        direction: centrum.name,
        stop: kronan,
        plannedDeparture: at(8),
      },
      {
        operator: "Länstrafiken Norrbotten",
        line: "PROV-X",
        direction: sunderby.name,
        stop: kronan,
        plannedDeparture: at(5),
      },
      {
        operator: lltOperator,
        line: "PROV-C",
        direction: sunderby.name,
        stop: kronan,
        plannedDeparture: at(22),
      },
      {
        operator: lltOperator,
        line: "PROV-A",
        direction: centrum.name,
        stop: kronan,
        plannedDeparture: at(48),
      },
    ];
  }
}

function distanceMeters(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
): number {
  const earthRadiusMeters = 6_371_000;
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(toLatitude - fromLatitude);
  const longitudeDelta = radians(toLongitude - fromLongitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(fromLatitude)) *
      Math.cos(radians(toLatitude)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
