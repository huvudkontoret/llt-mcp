import type { ProviderJourneyOption, TimetableProvider } from "./provider.ts";
import type {
  Departure,
  DeparturesInput,
  JourneyLeg,
  Place,
  StopCandidate,
  StopReference,
} from "./schemas.ts";
import {
  combineStockholmDateTime,
  isoDurationMinutes,
  stockholmLocalToIso,
  toStockholmQueryTime,
} from "./time.ts";

const trafiklabBaseUrl = "https://realtime-api.trafiklab.se/v1";
const resRobotBaseUrl = "https://api.resrobot.se/v2.1";
const luleaCenter = { latitude: 65.5848, longitude: 22.1567 };
const lltAreaRadiusMeters = 50_000;
const localBusProduct = 128;

type Fetcher = typeof globalThis.fetch;

export type LiveTimetableProviderOptions = {
  trafiklabApiKey?: string;
  resRobotApiKey?: string;
  fetcher?: Fetcher;
};

type JourneyQuery = {
  origin: Place;
  destination: Place;
  at: string;
  arriveBy: boolean;
  maxWalkingMeters: number;
  maxTransfers: number;
  maxResults: number;
  includeIntermediateStops: boolean;
};

export class LiveTimetableProvider implements TimetableProvider {
  readonly sampleData = false;
  readonly attribution =
    "Trafiklab Realtime APIs (CC BY 4.0) and ResRobot v2.1";

  private readonly trafiklabApiKey?: string;
  private readonly resRobotApiKey?: string;
  private readonly fetcher: Fetcher;

  constructor(options: LiveTimetableProviderOptions) {
    this.trafiklabApiKey = present(options.trafiklabApiKey);
    this.resRobotApiKey = present(options.resRobotApiKey);
    this.fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  }

  async searchStops(query: string, maxResults: number): Promise<StopCandidate[]> {
    const response = await getJson(
      this.fetcher,
      "Trafiklab",
      trafiklabBaseUrl,
      `/stops/name/${encodeURIComponent(query)}`,
      { key: requireKey(this.trafiklabApiKey, "TRAFIKLAB_API_KEY") },
    );

    return mapTrafiklabStopResponse(response).slice(0, maxResults);
  }

  async nearbyStops(
    latitude: number,
    longitude: number,
    radiusMeters: number,
    maxResults: number,
  ): Promise<StopCandidate[]> {
    const response = await getJson(
      this.fetcher,
      "ResRobot",
      resRobotBaseUrl,
      "/location.nearbystops",
      {
        accessId: requireKey(this.resRobotApiKey, "RESROBOT_API_KEY"),
        originCoordLat: latitude,
        originCoordLong: longitude,
        r: radiusMeters,
        maxNo: Math.min(1_000, Math.max(maxResults * 4, 20)),
        lang: "sv",
        format: "json",
      },
    );

    return mapResRobotNearbyResponse(
      response,
      latitude,
      longitude,
      radiusMeters,
    ).slice(0, maxResults);
  }

  async journeyOptions(input: JourneyQuery): Promise<ProviderJourneyOption[]> {
    const queryTime = toStockholmQueryTime(input.at);
    const walk =
      input.maxWalkingMeters === 0
        ? "0"
        : `1,0,${input.maxWalkingMeters}`;
    const parameters: Record<string, string | number | boolean> = {
      accessId: requireKey(this.resRobotApiKey, "RESROBOT_API_KEY"),
      date: queryTime.date,
      time: queryTime.time,
      searchForArrival: input.arriveBy ? 1 : 0,
      numF: Math.min(6, Math.max(input.maxResults * 3, 1)),
      numB: 0,
      maxChange: Math.max(1, input.maxTransfers),
      products: localBusProduct,
      passlist: input.includeIntermediateStops ? 1 : 0,
      originWalk: walk,
      destWalk: walk,
      unsharp: input.maxWalkingMeters > 0 ? 1 : 0,
      lang: "sv",
      format: "json",
    };

    addPlace(parameters, "origin", input.origin);
    addPlace(parameters, "dest", input.destination);

    const response = await getJson(
      this.fetcher,
      "ResRobot",
      resRobotBaseUrl,
      "/trip",
      parameters,
    );

    return mapResRobotJourneyResponse(response);
  }

  async departures(
    input: Pick<DeparturesInput, "stopId" | "from">,
  ): Promise<Array<Departure & { operator: string }>> {
    const anchor = input.from ? new Date(input.from) : new Date();
    const queryTime = toStockholmQueryTime(anchor);
    const response = await getJson(
      this.fetcher,
      "Trafiklab",
      trafiklabBaseUrl,
      `/departures/${encodeURIComponent(input.stopId)}/${queryTime.dateTime}`,
      { key: requireKey(this.trafiklabApiKey, "TRAFIKLAB_API_KEY") },
    );

    const windowEnd = anchor.getTime() + 60 * 60_000;
    return mapTrafiklabDeparturesResponse(response, input.stopId).filter(
      (departure) => {
        const planned = Date.parse(departure.plannedDeparture);
        return planned >= anchor.getTime() && planned <= windowEnd;
      },
    );
  }
}

export function mapTrafiklabStopResponse(value: unknown): StopCandidate[] {
  const response = record(value);
  const rawGroups = array(response?.stopGroups ?? response?.stop_groups);

  return rawGroups
    .map((rawGroup) => mapTrafiklabStopGroup(rawGroup))
    .filter((stop): stop is StopCandidate => stop !== undefined)
    .filter((stop) => isInLltArea(stop.latitude, stop.longitude));
}

export function mapResRobotNearbyResponse(
  value: unknown,
  latitude: number,
  longitude: number,
  radiusMeters: number,
): StopCandidate[] {
  const response = record(value);
  const container = response?.stopLocationOrCoordLocation ?? response?.StopLocation;
  const entries = Array.isArray(container)
    ? container
    : array(record(container)?.StopLocation);

  return entries
    .map((entry) => record(record(entry)?.StopLocation ?? entry))
    .filter((entry): entry is Record<string, unknown> => entry !== undefined)
    .filter(isLocalBusStop)
    .flatMap((entry): StopCandidate[] => {
      const stop = stopReference(entry);
      if (!stop) return [];

      const suppliedDistance = finiteNumber(entry.dist);
      const distance = Math.round(
        suppliedDistance ??
          distanceMeters(latitude, longitude, stop.latitude, stop.longitude),
      );

      return [
        {
          ...stop,
          distanceMeters: distance,
          serviceVerification: "unverified",
        },
      ];
    })
    .filter(
      (stop) =>
        stop.distanceMeters !== undefined &&
        stop.distanceMeters <= radiusMeters &&
        isInLltArea(stop.latitude, stop.longitude),
    )
    .sort(
      (left, right) =>
        (left.distanceMeters ?? Number.MAX_SAFE_INTEGER) -
        (right.distanceMeters ?? Number.MAX_SAFE_INTEGER),
    );
}

export function mapResRobotJourneyResponse(value: unknown): ProviderJourneyOption[] {
  throwForResRobotError(value);
  const response = record(value);

  return array(response?.Trip)
    .map((trip) => mapResRobotTrip(trip))
    .filter((trip): trip is ProviderJourneyOption => trip !== undefined);
}

export function mapTrafiklabDeparturesResponse(
  value: unknown,
  queriedStopId: string,
): Array<Departure & { operator: string }> {
  const response = record(value);

  return array(response?.departures)
    .map((rawDeparture) => {
      const departure = record(rawDeparture);
      const route = record(departure?.route);
      const agency = record(departure?.agency);
      const stop = record(departure?.stop);
      const scheduled = text(departure?.scheduled);
      const latitude = finiteNumber(stop?.lat);
      const longitude = finiteNumber(stop?.lon);
      const name = text(stop?.name);
      const line = text(route?.designation) ?? text(route?.name);
      const direction =
        text(route?.direction) ?? text(record(route?.destination)?.name);

      if (
        text(route?.transport_mode)?.toUpperCase() !== "BUS" ||
        !scheduled ||
        latitude === undefined ||
        longitude === undefined ||
        !name ||
        !line ||
        !direction
      ) {
        return undefined;
      }

      const plannedDeparture = safeStockholmLocalToIso(scheduled);
      if (!plannedDeparture) return undefined;

      return {
        operator: text(agency?.name) ?? "",
        line,
        direction,
        stop: { stopId: queriedStopId, name, latitude, longitude },
        plannedDeparture,
      };
    })
    .filter(
      (departure): departure is Departure & { operator: string } =>
        departure !== undefined,
    );
}

function mapTrafiklabStopGroup(value: unknown): StopCandidate | undefined {
  const group = record(value);
  const stopId = identifier(group?.id);
  const name = text(group?.name);
  const modes = array(group?.transport_modes)
    .map(text)
    .filter(isPresent)
    .map((mode) => mode.toUpperCase());
  const stops = array(group?.stops).map(record).filter(isPresent);
  const coordinates = stops
    .map((stop) => ({ latitude: finiteNumber(stop.lat), longitude: finiteNumber(stop.lon) }))
    .filter(
      (coordinate): coordinate is { latitude: number; longitude: number } =>
        coordinate.latitude !== undefined && coordinate.longitude !== undefined,
    );

  if (!stopId || !name || !modes.includes("BUS") || coordinates.length === 0) {
    return undefined;
  }

  return {
    stopId,
    name,
    latitude:
      coordinates.reduce((sum, coordinate) => sum + coordinate.latitude, 0) /
      coordinates.length,
    longitude:
      coordinates.reduce((sum, coordinate) => sum + coordinate.longitude, 0) /
      coordinates.length,
    serviceVerification: "unverified",
  };
}

function mapResRobotTrip(value: unknown): ProviderJourneyOption | undefined {
  const trip = record(value);
  const rawLegs = array(record(trip?.LegList)?.Leg);
  const legs: ProviderJourneyOption["legs"] = [];

  for (const rawLeg of rawLegs) {
    const mapped = mapResRobotLeg(rawLeg);
    if (!mapped) return undefined;
    legs.push(mapped);
  }

  const origin = record(trip?.Origin);
  const destination = record(trip?.Destination);
  const plannedDeparture = endpointTime(origin);
  const plannedArrival = endpointTime(destination);
  if (!plannedDeparture || !plannedArrival || legs.length === 0) {
    return undefined;
  }

  const busLegCount = legs.filter((leg) => leg.mode === "bus").length;
  const durationFromResponse = isoDurationMinutes(text(trip?.duration));

  return {
    id: text(trip?.tripId) ?? `resrobot:${text(trip?.idx) ?? plannedDeparture}`,
    plannedDeparture,
    plannedArrival,
    durationMinutes:
      durationFromResponse ??
      Math.max(0, Math.round((Date.parse(plannedArrival) - Date.parse(plannedDeparture)) / 60_000)),
    transfers: Math.max(0, busLegCount - 1),
    walkingDistanceMeters: legs
      .filter((leg): leg is Extract<JourneyLeg, { mode: "walk" }> => leg.mode === "walk")
      .reduce((sum, leg) => sum + leg.distanceMeters, 0),
    legs,
  };
}

function mapResRobotLeg(
  value: unknown,
): ProviderJourneyOption["legs"][number] | undefined {
  const leg = record(value);
  const products = array(leg?.Product).map(record).filter(isPresent);
  const origin = record(leg?.Origin);
  const destination = record(leg?.Destination);
  const type = text(leg?.type)?.toUpperCase();

  if (!leg || !origin || !destination) return undefined;

  if (type !== "JNY") {
    const from = text(origin.name);
    const to = text(destination.name);
    if (!from || !to) return undefined;

    const distance = Math.max(0, Math.round(finiteNumber(leg?.dist) ?? 0));
    return {
      mode: "walk",
      from,
      to,
      distanceMeters: distance,
      durationMinutes: isoDurationMinutes(text(leg?.duration)) ?? 0,
    };
  }

  const product = products.find(
    (candidate) => Number(text(candidate.cls)) === localBusProduct,
  );
  if (!product) return undefined;

  const fromStop = stopReference(origin);
  const toStop = stopReference(destination);
  const plannedDeparture = endpointTime(origin);
  const plannedArrival = endpointTime(destination);
  const line =
    text(product.displayNumber) ??
    text(product.line) ??
    text(product.num) ??
    text(leg?.transportNumber) ??
    text(leg?.name);
  const direction = text(leg?.direction) ?? toStop?.name;

  if (
    !fromStop ||
    !toStop ||
    !plannedDeparture ||
    !plannedArrival ||
    !line ||
    !direction
  ) {
    return undefined;
  }

  const intermediateStops = resRobotIntermediateStops(leg).filter(
    (stop) => stop.stopId !== fromStop.stopId && stop.stopId !== toStop.stopId,
  );

  return {
    mode: "bus",
    operator: text(product.operator) ?? "",
    line,
    direction,
    fromStop,
    toStop,
    plannedDeparture,
    plannedArrival,
    ...(intermediateStops.length > 0 ? { intermediateStops } : {}),
  };
}

function resRobotIntermediateStops(leg: Record<string, unknown>): StopReference[] {
  const rawStops = leg.Stops;
  const entries = Array.isArray(rawStops)
    ? rawStops
    : array(record(rawStops)?.Stop);

  return entries.map(stopReference).filter(isPresent);
}

function endpointTime(endpoint: Record<string, unknown> | undefined): string | undefined {
  const date = text(endpoint?.date);
  const time = text(endpoint?.time);
  if (!date || !time) return undefined;

  try {
    return combineStockholmDateTime(date, time);
  } catch {
    return undefined;
  }
}

function stopReference(value: unknown): StopReference | undefined {
  const stop = record(value);
  const stopId = identifier(stop?.extId) ?? identifier(stop?.id);
  const name = text(stop?.name);
  const latitude = finiteNumber(stop?.lat);
  const longitude = finiteNumber(stop?.lon);
  if (!stopId || !name || latitude === undefined || longitude === undefined) {
    return undefined;
  }

  return { stopId, name, latitude, longitude };
}

function isLocalBusStop(stop: Record<string, unknown>): boolean {
  const products = finiteNumber(stop.products);
  if (products !== undefined && (Math.trunc(products) & localBusProduct) !== 0) {
    return true;
  }

  return array(stop.productAtStop)
    .map(record)
    .filter(isPresent)
    .some((product) => Number(text(product.cls)) === localBusProduct);
}

function addPlace(
  parameters: Record<string, string | number | boolean>,
  prefix: "origin" | "dest",
  place: Place,
): void {
  if (place.kind === "stop") {
    parameters[`${prefix}Id`] = place.stopId;
    return;
  }

  parameters[`${prefix}CoordLat`] = place.latitude;
  parameters[`${prefix}CoordLong`] = place.longitude;
}

async function getJson(
  fetcher: Fetcher,
  provider: "Trafiklab" | "ResRobot",
  baseUrl: string,
  path: string,
  parameters: Record<string, string | number | boolean>,
): Promise<unknown> {
  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(parameters)) {
    url.searchParams.set(key, String(value));
  }

  let response: Response;
  try {
    response = await fetcher(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error(`${provider} kunde inte nås.`);
  }

  if (!response.ok) {
    throw new Error(`${provider} svarade med HTTP ${response.status}.`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(`${provider} returnerade ett ogiltigt JSON-svar.`);
  }

  if (provider === "ResRobot") {
    throwForResRobotError(body);
  }

  return body;
}

function throwForResRobotError(value: unknown): void {
  const errorCode = text(record(value)?.errorCode);
  if (!errorCode) return;

  const safeCode = /^[A-Za-z0-9_-]+$/.test(errorCode) ? ` (${errorCode})` : "";
  throw new Error(`ResRobot kunde inte besvara frågan${safeCode}.`);
}

function requireKey(value: string | undefined, name: string): string {
  if (value) return value;
  throw new Error(`Live-data saknar konfigurationen ${name}.`);
}

function present(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isInLltArea(latitude: number, longitude: number): boolean {
  return (
    distanceMeters(
      luleaCenter.latitude,
      luleaCenter.longitude,
      latitude,
      longitude,
    ) <= lltAreaRadiusMeters
  );
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

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function identifier(value: unknown): string | undefined {
  if (typeof value === "string") return text(value);
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  return undefined;
}

function safeStockholmLocalToIso(value: string): string | undefined {
  try {
    return stockholmLocalToIso(value);
  } catch {
    return undefined;
  }
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isPresent<T>(value: T | undefined): value is T {
  return value !== undefined;
}
