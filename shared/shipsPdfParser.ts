import {
  countUniqueShipsCustomers,
  normalizeShipsDt,
  normalizeShipsDtKey,
  normalizeShipsVehicleNumber,
  sanitizeShipsDeliveries,
  type ShipsDeliveryOrder,
  type ShipsParsedTrip,
} from "./ships.ts";

export interface ShipsPdfTextLine {
  text: string;
  page?: number;
}

type ShipsPdfPageText = {
  page: number;
  lines: string[];
  normalizedText: string;
};

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

export function normalizeShipsExtractedText(value: unknown): string {
  return String(value ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u00AD\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/\s*:\s*/g, ":")
    .replace(/\s+/g, " ")
    .trim();
}

function compactSpaces(value: unknown): string {
  return normalizeShipsExtractedText(value);
}

function normalizeHeader(value: unknown): string {
  return compactSpaces(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getFieldValue(lines: string[], label: RegExp): string {
  for (let index = 0; index < lines.length; index++) {
    const line = compactSpaces(lines[index]);
    const inline = line.match(label);
    if (!inline) continue;
    if (inline[1] && compactSpaces(inline[1])) return compactSpaces(inline[1]);

    for (let next = index + 1; next < Math.min(lines.length, index + 4); next++) {
      const candidate = compactSpaces(lines[next]);
      if (candidate) return candidate;
    }
  }
  return "";
}

function buildPageTexts(sourceLines: ShipsPdfTextLine[] | string[]): ShipsPdfPageText[] {
  const pages = new Map<number, string[]>();

  for (const sourceLine of sourceLines) {
    const page = typeof sourceLine === "string" ? 1 : Number(sourceLine.page || 1);
    const line = compactSpaces(typeof sourceLine === "string" ? sourceLine : sourceLine.text);
    if (!line) continue;
    const pageLines = pages.get(page) || [];
    pageLines.push(line);
    pages.set(page, pageLines);
  }

  return Array.from(pages.entries())
    .sort(([firstPage], [secondPage]) => firstPage - secondPage)
    .map(([page, pageLines]) => ({
      page,
      lines: pageLines,
      normalizedText: normalizeShipsExtractedText(pageLines.join(" ")),
    }));
}

function findMatchByPage(pageTexts: ShipsPdfPageText[], pattern: RegExp): string {
  for (const pageText of pageTexts) {
    const match = pageText.normalizedText.match(pattern);
    if (match?.[1]) return compactSpaces(match[1]);
  }
  return "";
}

function findValueAfterSplitLabel(
  pageTexts: ShipsPdfPageText[],
  labelPattern: RegExp,
  valuePattern: RegExp,
  isValid: (candidate: string) => boolean = Boolean,
): string {
  for (const pageText of pageTexts) {
    for (let start = 0; start < pageText.lines.length; start++) {
      for (let end = start; end < Math.min(pageText.lines.length, start + 6); end++) {
        const windowText = normalizeShipsExtractedText(pageText.lines.slice(start, end + 1).join(" "));
        const labelMatch = windowText.match(labelPattern);
        if (!labelMatch || labelMatch.index === undefined) continue;

        const afterLabel = windowText.slice(labelMatch.index + labelMatch[0].length).replace(/^[\s:.-]+/, "");
        const valueMatch = afterLabel.match(valuePattern);
        const candidate = compactSpaces(valueMatch?.[0]);
        if (candidate && isValid(candidate)) return candidate;
      }
    }
  }
  return "";
}

const TRIP_NUMBER_PATTERN = /\bTrip\s*(?:No|Number)\.?\s*:?\s*(\d+)/i;
const VEHICLE_NUMBER_PATTERN = /\bVehicle\s*Number\s*:?\s*([A-Z0-9-]+)/i;
const TRIP_DATE_VALUE_PATTERN = /(?:(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*)?[A-Za-z]+\s+\d{1,2},\s*\d{4}(?:\s+\d{1,2}:\d{2}\s*(?:AM|PM))?/i;
const TRIP_DATE_PATTERN = new RegExp(`\\bTrip\\s*Date\\s*:?\\s*(${TRIP_DATE_VALUE_PATTERN.source})`, "i");

export function parseShipsTripDate(value: unknown): { date: string; time: string } | null {
  const text = compactSpaces(value).replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*/i, "");
  const match = text.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})(?:\s+(\d{1,2}):(\d{2})(?:\s*([AP]M))?)?/i);
  if (!match) return null;

  const month = MONTHS[match[1].toLowerCase()];
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (!month || day < 1 || day > 31) return null;
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year
    || calendarDate.getUTCMonth() !== month - 1
    || calendarDate.getUTCDate() !== day
  ) return null;

  let hour = Number(match[4] || 0);
  const minute = Number(match[5] || 0);
  const period = String(match[6] || "").toUpperCase();
  if (period === "PM" && hour < 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;

  return {
    date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

function extractCustomerName(line: string, customerId: string): string | undefined {
  const customerIndex = line.indexOf(customerId);
  if (customerIndex < 0) return undefined;
  const remainder = compactSpaces(line.slice(customerIndex + customerId.length));
  return remainder || undefined;
}

function parseTableLine(line: string): ShipsDeliveryOrder | null {
  const cleanLine = compactSpaces(line);
  if (!cleanLine) return null;
  const header = normalizeHeader(cleanLine);
  if (header.includes("deliveryorder") || header.includes("customerid") || header.includes("secondarytripno")) return null;

  const longNumbers = cleanLine.match(/\b\d{6,}\b/g) || [];
  if (longNumbers.length < 2) return null;

  let deliveryOrder = "";
  let customerId = "";
  if (longNumbers.length >= 3) {
    // Ships rows normally contain Secondary Trip No., Delivery Order and Customer ID.
    deliveryOrder = longNumbers[1];
    customerId = longNumbers[2];
  } else {
    deliveryOrder = longNumbers[0];
    customerId = longNumbers[1];
  }

  if (!/^\d{6,}$/.test(deliveryOrder) || !/^\d{6,}$/.test(customerId)) return null;
  const sequenceMatch = cleanLine.match(/^\s*(\d{1,4})\b/);

  return {
    sequencia: sequenceMatch ? Number(sequenceMatch[1]) : 0,
    deliveryOrder,
    customerId,
    customerName: extractCustomerName(cleanLine, customerId),
  };
}

function extractDeliveries(lines: string[]): { deliveries: ShipsDeliveryOrder[]; duplicateCount: number } {
  const parsedRows: ShipsDeliveryOrder[] = [];
  let tableSeen = false;

  for (let index = 0; index < lines.length; index++) {
    const line = compactSpaces(lines[index]);
    const normalized = normalizeHeader(line);
    if (normalized.includes("deliveryorder") || (normalized.includes("customerid") && normalized.includes("srno"))) {
      tableSeen = true;
      continue;
    }

    if (!tableSeen) continue;
    const row = parseTableLine(line);
    if (row) parsedRows.push(row);
  }

  // Fallback for extracted PDFs that lose the table header but keep complete rows.
  if (parsedRows.length === 0) {
    for (const line of lines) {
      const row = parseTableLine(line);
      if (row) parsedRows.push(row);
    }
  }

  const sanitized = sanitizeShipsDeliveries(parsedRows);
  return { deliveries: sanitized, duplicateCount: parsedRows.length - sanitized.length };
}

export function parseShipsPdfLines(sourceLines: ShipsPdfTextLine[] | string[]): ShipsParsedTrip {
  const pageTexts = buildPageTexts(sourceLines);
  const lines = pageTexts.flatMap((pageText) => pageText.lines);

  // Header values use continuous normalized page text. PDF.js may split a
  // visually continuous label/value into multiple positioned text items.
  const tripNoRaw = findMatchByPage(pageTexts, TRIP_NUMBER_PATTERN)
    || findValueAfterSplitLabel(pageTexts, /\bTrip\s*(?:No|Number)\.?\s*:?/i, /\d+/, (candidate) => /^\d+$/.test(candidate));
  const vehicleRaw = findMatchByPage(pageTexts, VEHICLE_NUMBER_PATTERN)
    || findValueAfterSplitLabel(
      pageTexts,
      /\bVehicle\s*Number\s*:?/i,
      /[A-Z0-9-]+/i,
      (candidate) => /^[A-Z0-9-]+$/i.test(candidate),
    );
  const tripDateRaw = findMatchByPage(pageTexts, TRIP_DATE_PATTERN)
    || findValueAfterSplitLabel(
      pageTexts,
      /\bTrip\s*Date\s*:?/i,
      TRIP_DATE_VALUE_PATTERN,
      (candidate) => Boolean(parseShipsTripDate(candidate)),
    );
  const parsedDate = parseShipsTripDate(tripDateRaw);
  const { deliveries, duplicateCount } = extractDeliveries(lines);
  const warnings: string[] = [];

  if (!tripNoRaw) throw new Error("Trip No não foi localizado no PDF do Ships.");
  if (!vehicleRaw) throw new Error("Vehicle Number não foi localizado no PDF do Ships.");
  if (!parsedDate) throw new Error("Trip Date não foi localizado ou possui formato inválido.");
  if (deliveries.length === 0) throw new Error("Nenhum Delivery Order válido foi localizado no PDF do Ships.");
  if (duplicateCount > 0) warnings.push(`${duplicateCount} Delivery Order repetido(s) foi(ram) ignorado(s).`);

  const tripNo = normalizeShipsDt(tripNoRaw);
  return {
    tripNo,
    tripNoNormalized: normalizeShipsDtKey(tripNo),
    vehicleNumber: normalizeShipsVehicleNumber(vehicleRaw),
    tripDate: parsedDate.date,
    tripTime: parsedDate.time,
    vendor: getFieldValue(lines, /^\s*Vendor\s*:?\s*(.*)?$/i) || undefined,
    tripType: getFieldValue(lines, /^\s*Trip\s*Type\s*:?\s*(.*)?$/i) || undefined,
    vehicleType: getFieldValue(lines, /^\s*Vehicle\s*Type\s*:?\s*(.*)?$/i) || undefined,
    vehicleMake: getFieldValue(lines, /^\s*Vehicle\s*Make\s*:?\s*(.*)?$/i) || undefined,
    deliveries,
    uniqueCustomerCount: countUniqueShipsCustomers(deliveries),
    warnings,
  };
}

export function parseShipsPdfText(text: string): ShipsParsedTrip {
  return parseShipsPdfLines(String(text || "").split(/\r?\n/));
}
