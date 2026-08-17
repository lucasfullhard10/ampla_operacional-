export const EXPIRATION_ALERT_WINDOW_DAYS = 40;
export const OPERATIONAL_TIME_ZONE = "America/Sao_Paulo";

export type ExpirationClassification = "VENCIDO" | "VENCE_HOJE" | "VENCIMENTO_PROXIMO" | "REGULAR";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function parseCalendarDate(value: unknown): { year: number; month: number; day: number } | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const normalized = new Date(Date.UTC(year, month - 1, day));

  if (
    normalized.getUTCFullYear() !== year ||
    normalized.getUTCMonth() !== month - 1 ||
    normalized.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function getOperationalCalendarDate(referenceDate: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(referenceDate);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

export function getOperationalDateString(
  referenceDate = new Date(),
  timeZone = OPERATIONAL_TIME_ZONE,
): string {
  const date = getOperationalCalendarDate(referenceDate, timeZone);
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

export function differenceInOperationalCalendarDays(
  expirationDate: unknown,
  referenceDate = new Date(),
  timeZone = OPERATIONAL_TIME_ZONE,
): number | null {
  const expiration = parseCalendarDate(expirationDate);
  if (!expiration) return null;

  const today = getOperationalCalendarDate(referenceDate, timeZone);
  const expirationUtc = Date.UTC(expiration.year, expiration.month - 1, expiration.day);
  const todayUtc = Date.UTC(today.year, today.month - 1, today.day);
  return Math.round((expirationUtc - todayUtc) / DAY_IN_MS);
}

export function classifyExpirationDays(daysRemaining: number): ExpirationClassification {
  if (daysRemaining < 0) return "VENCIDO";
  if (daysRemaining === 0) return "VENCE_HOJE";
  if (daysRemaining <= EXPIRATION_ALERT_WINDOW_DAYS) return "VENCIMENTO_PROXIMO";
  return "REGULAR";
}

export function formatCalendarDateBr(value: unknown): string {
  const date = parseCalendarDate(value);
  if (!date) return typeof value === "string" ? value : "";
  return `${String(date.day).padStart(2, "0")}/${String(date.month).padStart(2, "0")}/${date.year}`;
}
