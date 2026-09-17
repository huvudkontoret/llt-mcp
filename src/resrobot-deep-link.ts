import type { Place } from "./schemas.ts";
import { toStockholmQueryTime } from "./time.ts";

const deepLinkUrl = "https://reseplanerare.resrobot.se/bin/query.exe/sn";

export function createResRobotDeepLink(input: {
  origin: Place;
  destination: Place;
  at: string;
  arriveBy: boolean;
}): string {
  const url = new URL(deepLinkUrl);
  addPlace(url.searchParams, "origin", input.origin);
  addPlace(url.searchParams, "destination", input.destination);

  const queryTime = toStockholmQueryTime(input.at);
  url.searchParams.set("date", queryTime.date);
  url.searchParams.set("time", queryTime.time);
  url.searchParams.set("timesel", input.arriveBy ? "arrive" : "depart");
  url.searchParams.set("start", "1");
  return url.toString();
}

function addPlace(
  parameters: URLSearchParams,
  endpoint: "origin" | "destination",
  place: Place,
): void {
  if (place.kind === "stop") {
    parameters.set(endpoint === "origin" ? "S" : "Z", place.stopId);
    return;
  }

  const tripleId = `A=16@X=${coordinate(place.longitude)}@Y=${coordinate(place.latitude)}@O=${endpoint === "origin" ? "Origin" : "Destination"}`;
  parameters.set(endpoint === "origin" ? "SID" : "ZID", tripleId);
}

function coordinate(value: number): string {
  return String(Math.round(value * 1_000_000));
}
