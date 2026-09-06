import { timeZone } from "./schemas.ts";

const stockholmFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function toStockholmQueryTime(value: string | Date): {
  date: string;
  time: string;
  dateTime: string;
} {
  const instant = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(instant.getTime())) {
    throw new Error("Ogiltig tidpunkt för tidtabellsfrågan.");
  }

  const parts = dateParts(instant);
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const time = `${parts.hour}:${parts.minute}`;

  return { date, time, dateTime: `${date}T${time}` };
}

export function stockholmLocalToIso(value: string): string {
  if (/([zZ]|[+-]\d{2}:\d{2})$/.test(value)) {
    const instant = new Date(value);
    if (Number.isNaN(instant.getTime())) {
      throw new Error("Datakällan returnerade en ogiltig tidpunkt.");
    }
    return instant.toISOString();
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(
    value,
  );
  if (!match) {
    throw new Error("Datakällan returnerade en ogiltig lokal tidpunkt.");
  }

  const [, year, month, day, hour, minute, second = "00"] = match;
  const localAsUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );

  let instant = localAsUtc - stockholmOffsetMilliseconds(new Date(localAsUtc));
  instant = localAsUtc - stockholmOffsetMilliseconds(new Date(instant));

  return new Date(instant).toISOString();
}

export function combineStockholmDateTime(date: string, time: string): string {
  return stockholmLocalToIso(`${date}T${time}`);
}

export function isoDurationMinutes(value: string | undefined): number | undefined {
  if (!value) return undefined;

  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(
    value,
  );
  if (!match) return undefined;

  const [, days = "0", hours = "0", minutes = "0", seconds = "0"] = match;
  return Math.max(
    0,
    Math.round(
      Number(days) * 24 * 60 +
        Number(hours) * 60 +
        Number(minutes) +
        Number(seconds) / 60,
    ),
  );
}

function stockholmOffsetMilliseconds(instant: Date): number {
  const parts = dateParts(instant);
  const representedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return representedAsUtc - instant.getTime();
}

function dateParts(instant: Date): Record<"year" | "month" | "day" | "hour" | "minute" | "second", string> {
  const result = Object.fromEntries(
    stockholmFormatter
      .formatToParts(instant)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return result as Record<
    "year" | "month" | "day" | "hour" | "minute" | "second",
    string
  >;
}
