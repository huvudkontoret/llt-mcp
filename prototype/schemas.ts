import { z } from "zod";

export const timeZone = "Europe/Stockholm" as const;

const dateTimeSchema = z.iso.datetime({ offset: true });

export const placeSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("stop"),
    stopId: z.string().min(1),
  }),
  z.object({
    kind: z.literal("coordinates"),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
]);

export const stopReferenceSchema = z.object({
  stopId: z.string(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

export const stopCandidateSchema = stopReferenceSchema.extend({
  distanceMeters: z.number().int().nonnegative().optional(),
  lltService: z.literal("unverified"),
});

export const stopSearchInputSchema = z.object({
  query: z.string().trim().min(1).max(100),
  maxResults: z.number().int().min(1).max(10).default(5),
});

export const nearbyStopsInputSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().int().min(100).max(5_000).default(1_000),
  maxResults: z.number().int().min(1).max(10).default(5),
});

export const stopCandidatesOutputSchema = z.object({
  candidates: z.array(stopCandidateSchema),
  operatorVerification: z.literal("deferred-until-timetable-query"),
  sampleData: z.boolean(),
  attribution: z.string(),
});

export const journeyTimeSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("departAt"), at: dateTimeSchema }),
  z.object({ mode: z.literal("arriveBy"), at: dateTimeSchema }),
]);

export const planJourneyInputSchema = z.object({
  origin: placeSchema,
  destination: placeSchema,
  time: journeyTimeSchema.optional(),
  maxWalkingMeters: z.number().int().min(0).max(5_000).default(1_000),
  maxTransfers: z.number().int().min(0).max(2).default(2),
  maxResults: z.number().int().min(1).max(3).default(3),
  includeIntermediateStops: z.boolean().default(false),
});

const walkLegSchema = z.object({
  mode: z.literal("walk"),
  from: z.string(),
  to: z.string(),
  distanceMeters: z.number().int().nonnegative(),
  durationMinutes: z.number().int().nonnegative(),
});

const busLegSchema = z.object({
  mode: z.literal("bus"),
  operator: z.literal("Luleå Lokaltrafik"),
  line: z.string(),
  direction: z.string(),
  fromStop: stopReferenceSchema,
  toStop: stopReferenceSchema,
  plannedDeparture: dateTimeSchema,
  plannedArrival: dateTimeSchema,
  intermediateStops: z.array(stopReferenceSchema).optional(),
});

export const journeyLegSchema = z.discriminatedUnion("mode", [
  walkLegSchema,
  busLegSchema,
]);

export const journeyOptionSchema = z.object({
  id: z.string(),
  plannedDeparture: dateTimeSchema,
  plannedArrival: dateTimeSchema,
  durationMinutes: z.number().int().nonnegative(),
  transfers: z.number().int().nonnegative(),
  walkingDistanceMeters: z.number().int().nonnegative(),
  legs: z.array(journeyLegSchema),
});

export const journeyOutputSchema = z.object({
  scheduleKind: z.literal("planned"),
  timeZone: z.literal(timeZone),
  journeys: z.array(journeyOptionSchema),
  sampleData: z.boolean(),
  attribution: z.string(),
});

export const departuresInputSchema = z.object({
  stopId: z.string().min(1),
  from: dateTimeSchema.optional(),
  line: z.string().trim().min(1).optional(),
  direction: z.string().trim().min(1).optional(),
  maxResults: z.number().int().min(1).max(10).default(10),
});

export const departureSchema = z.object({
  line: z.string(),
  direction: z.string(),
  stop: stopReferenceSchema,
  plannedDeparture: dateTimeSchema,
});

export const departuresOutputSchema = z.object({
  scheduleKind: z.literal("planned"),
  timeZone: z.literal(timeZone),
  windowMinutes: z.literal(60),
  departures: z.array(departureSchema),
  sampleData: z.boolean(),
  attribution: z.string(),
});

export type Place = z.infer<typeof placeSchema>;
export type StopReference = z.infer<typeof stopReferenceSchema>;
export type StopCandidate = z.infer<typeof stopCandidateSchema>;
export type JourneyLeg = z.infer<typeof journeyLegSchema>;
export type JourneyOption = z.infer<typeof journeyOptionSchema>;
export type Departure = z.infer<typeof departureSchema>;
export type PlanJourneyInput = z.infer<typeof planJourneyInputSchema>;
export type DeparturesInput = z.infer<typeof departuresInputSchema>;
