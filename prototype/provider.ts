import type {
  Departure,
  DeparturesInput,
  JourneyLeg,
  JourneyOption,
  Place,
  StopCandidate,
} from "./schemas.ts";

type ProviderBusLeg = Omit<Extract<JourneyLeg, { mode: "bus" }>, "operator"> & {
  operator: string;
};

export type ProviderJourneyOption = Omit<JourneyOption, "legs"> & {
  legs: Array<Exclude<JourneyLeg, { mode: "bus" }> | ProviderBusLeg>;
};

export interface TimetableProvider {
  readonly sampleData: boolean;
  readonly attribution: string;

  searchStops(query: string, maxResults: number): Promise<StopCandidate[]>;

  nearbyStops(
    latitude: number,
    longitude: number,
    radiusMeters: number,
    maxResults: number,
  ): Promise<StopCandidate[]>;

  journeyOptions(input: {
    origin: Place;
    destination: Place;
    at: string;
    arriveBy: boolean;
    maxWalkingMeters: number;
    maxTransfers: number;
    maxResults: number;
    includeIntermediateStops: boolean;
  }): Promise<ProviderJourneyOption[]>;

  departures(input: Pick<DeparturesInput, "stopId" | "from">): Promise<
    Array<Departure & { operator: string }>
  >;
}
