import type { ProviderJourneyOption } from "./provider.ts";
import type { Departure, JourneyLeg, JourneyOption, SupportedOperator } from "./schemas.ts";

export const lltOperator = "Luleå Lokaltrafik" as const;
export const norrbottenOperator = "Länstrafiken Norrbotten" as const;
export const supportedOperators = [lltOperator, norrbottenOperator] as const;

type JourneySelection = {
  maxWalkingMeters: number;
  maxTransfers: number;
  maxResults: number;
  includeIntermediateStops: boolean;
  operator?: SupportedOperator;
};

type DepartureSelection = {
  line?: string;
  direction?: string;
  maxResults: number;
  operator?: SupportedOperator;
};

export function selectSupportedJourneys(
  journeys: ProviderJourneyOption[],
  selection: JourneySelection,
): JourneyOption[] {
  return journeys
    .filter(hasOnlySupportedBusLegs)
    .filter((journey) => !selection.operator || journeyHasOnlyOperator(journey, selection.operator))
    .filter((journey) => journey.walkingDistanceMeters <= selection.maxWalkingMeters)
    .filter((journey) => journey.transfers <= selection.maxTransfers)
    .sort((left, right) => Date.parse(left.plannedArrival) - Date.parse(right.plannedArrival))
    .slice(0, selection.maxResults)
    .map((journey) => ({
      ...journey,
      legs: journey.legs.map((leg) =>
        compactLeg(normalizeSupportedLeg(leg), selection.includeIntermediateStops),
      ),
    }));
}

export function selectSupportedDepartures(
  departures: Array<Departure & { operator: string }>,
  selection: DepartureSelection,
): Departure[] {
  const wantedLine = selection.line?.toLocaleLowerCase("sv-SE");
  const wantedDirection = selection.direction?.toLocaleLowerCase("sv-SE");

  return departures
    .flatMap((departure) => {
      const operator = canonicalizeOperator(departure.operator);
      return operator ? [{ ...departure, operator }] : [];
    })
    .filter((departure) => !selection.operator || departure.operator === selection.operator)
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
    .slice(0, selection.maxResults);
}

export function canonicalizeOperator(operator: string): SupportedOperator | undefined {
  const normalized = operator
    .trim()
    .toLocaleLowerCase("sv-SE")
    .replace(/\s+/g, " ");

  if (
    normalized === "llt" ||
    normalized === "luleå lokaltrafik" ||
    normalized === "luleå lokaltrafik ab"
  ) {
    return lltOperator;
  }

  if (
    normalized === "länstrafiken norrbotten" ||
    normalized === "lanstrafiken norrbotten" ||
    normalized === "länstrafiken norrbotten ab"
  ) {
    return norrbottenOperator;
  }

  return undefined;
}

function hasOnlySupportedBusLegs(journey: ProviderJourneyOption): journey is JourneyOption {
  const busLegs = journey.legs.filter(
    (leg): leg is Extract<JourneyLeg, { mode: "bus" }> & { operator: string } => leg.mode === "bus",
  );

  return busLegs.length > 0 && busLegs.every((leg) => canonicalizeOperator(leg.operator));
}

function journeyHasOnlyOperator(journey: ProviderJourneyOption, operator: SupportedOperator): boolean {
  return journey.legs
    .filter((leg): leg is Extract<JourneyLeg, { mode: "bus" }> & { operator: string } => leg.mode === "bus")
    .every((leg) => canonicalizeOperator(leg.operator) === operator);
}

function normalizeSupportedLeg(leg: ProviderJourneyOption["legs"][number]): JourneyLeg {
  if (leg.mode === "walk") return leg;

  const operator = canonicalizeOperator(leg.operator);
  if (!operator) {
    throw new Error("Unsupported bus operator reached output normalization.");
  }
  return { ...leg, operator };
}

function compactLeg(leg: JourneyLeg, includeIntermediateStops: boolean): JourneyLeg {
  if (leg.mode === "walk" || includeIntermediateStops) return leg;

  const { intermediateStops: _intermediateStops, ...compact } = leg;
  return compact;
}
