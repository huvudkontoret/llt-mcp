import { selectSupportedDepartures, selectSupportedJourneys } from "./domain.ts";
import type { TimetableProvider } from "./provider.ts";
import {
  type DeparturesInput,
  type PlanJourneyInput,
  timeZone,
} from "./schemas.ts";

export class TimetableService {
  private readonly provider: TimetableProvider;

  constructor(provider: TimetableProvider) {
    this.provider = provider;
  }

  async searchStops(query: string, maxResults = 5) {
    return {
      candidates: await this.provider.searchStops(query, maxResults),
      operatorVerification: "deferred-until-timetable-query" as const,
      sampleData: this.provider.sampleData,
      attribution: this.provider.attribution,
    };
  }

  async nearbyStops(
    latitude: number,
    longitude: number,
    radiusMeters = 1_000,
    maxResults = 5,
  ) {
    return {
      candidates: await this.provider.nearbyStops(
        latitude,
        longitude,
        radiusMeters,
        maxResults,
      ),
      operatorVerification: "deferred-until-timetable-query" as const,
      sampleData: this.provider.sampleData,
      attribution: this.provider.attribution,
    };
  }

  async planJourney(input: PlanJourneyInput) {
    const at = input.time?.at ?? new Date().toISOString();
    const rawJourneys = await this.provider.journeyOptions({
      origin: input.origin,
      destination: input.destination,
      at,
      arriveBy: input.time?.mode === "arriveBy",
      maxWalkingMeters: input.maxWalkingMeters,
      maxTransfers: input.maxTransfers,
      maxResults: input.maxResults,
      includeIntermediateStops: input.includeIntermediateStops,
    });

    return {
      scheduleKind: "planned" as const,
      timeZone,
      journeys: selectSupportedJourneys(rawJourneys, input),
      sampleData: this.provider.sampleData,
      attribution: this.provider.attribution,
    };
  }

  async departures(input: DeparturesInput) {
    const rawDepartures = await this.provider.departures(input);

    return {
      scheduleKind: "planned" as const,
      timeZone,
      windowMinutes: 60 as const,
      departures: selectSupportedDepartures(rawDepartures, input),
      sampleData: this.provider.sampleData,
      attribution: this.provider.attribution,
    };
  }
}
