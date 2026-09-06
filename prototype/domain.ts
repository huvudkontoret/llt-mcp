import type { ProviderJourneyOption } from "./provider.ts";
import type { Departure, JourneyLeg, JourneyOption } from "./schemas.ts";

export const lltOperator = "Luleå Lokaltrafik" as const;

type JourneySelection = {
  maxWalkingMeters: number;
  maxTransfers: number;
  maxResults: number;
  includeIntermediateStops: boolean;
};

type DepartureSelection = {
  line?: string;
  direction?: string;
  maxResults: number;
};

export function selectLltJourneys(
  journeys: ProviderJourneyOption[],
  selection: JourneySelection,
): JourneyOption[] {
  return journeys
    .filter(hasOnlyLltBusLegs)
    .filter((journey) => journey.walkingDistanceMeters <= selection.maxWalkingMeters)
    .filter((journey) => journey.transfers <= selection.maxTransfers)
    .sort((left, right) => Date.parse(left.plannedArrival) - Date.parse(right.plannedArrival))
    .slice(0, selection.maxResults)
    .map((journey) => ({
      ...journey,
      legs: journey.legs.map((leg) =>
        compactLeg(normalizeLltLeg(leg), selection.includeIntermediateStops),
      ),
    }));
}

export function selectLltDepartures(
  departures: Array<Departure & { operator: string }>,
  selection: DepartureSelection,
): Departure[] {
  const wantedLine = selection.line?.toLocaleLowerCase("sv-SE");
  const wantedDirection = selection.direction?.toLocaleLowerCase("sv-SE");

  return departures
    .filter((departure) => isLltOperator(departure.operator))
    .filter((departure) => !wantedLine || departure.line.toLocaleLowerCase("sv-SE") === wantedLine)
    .filter(
      (departure) =>
        !wantedDirection ||
        departure.direction.toLocaleLowerCase("sv-SE").includes(wantedDirection),
    )
    .sort(
      (left, right) =>
        Date.parse(left.plannedDeparture) - Date.parse(right.plannedDeparture),
    )
    .slice(0, selection.maxResults)
    .map(({ operator: _operator, ...departure }) => departure);
}

function hasOnlyLltBusLegs(journey: ProviderJourneyOption): journey is JourneyOption {
  const busLegs = journey.legs.filter(
    (leg): leg is Extract<JourneyLeg, { mode: "bus" }> => leg.mode === "bus",
  );

  return busLegs.length > 0 && busLegs.every((leg) => isLltOperator(leg.operator));
}

export function isLltOperator(operator: string): boolean {
  const normalized = operator
    .trim()
    .toLocaleLowerCase("sv-SE")
    .replace(/\s+/g, " ");

  return (
    normalized === "llt" ||
    normalized === "luleå lokaltrafik" ||
    normalized === "luleå lokaltrafik ab"
  );
}

function normalizeLltLeg(leg: ProviderJourneyOption["legs"][number]): JourneyLeg {
  if (leg.mode === "walk") {
    return leg;
  }

  return { ...leg, operator: lltOperator };
}

function compactLeg(leg: JourneyLeg, includeIntermediateStops: boolean): JourneyLeg {
  if (leg.mode === "walk" || includeIntermediateStops) {
    return leg;
  }

  const { intermediateStops: _intermediateStops, ...compact } = leg;
  return compact;
}
