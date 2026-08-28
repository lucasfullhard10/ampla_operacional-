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

export interface ShipsPdfPositionedTextItem {
  text: string;
  page: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  hasEOL?: boolean;
}

export interface ShipsPdfHeaderInspection {
  tripNoRaw: string;
  vehicleRaw: string;
  tripDateRaw: string;
  vehicleSearch: {
    regex: string;
    normalizedTextCandidate: string | null;
    splitTokenCandidate: string | null;
    coordinateCandidate: string | null;
    selectedStrategy: "normalized-text" | "split-tokens" | "coordinates" | "not-found";
  };
  tripDateSearch: {
    regex: string;
    normalizedTextCandidate: string | null;
    splitTokenCandidate: string | null;
    coordinateCandidate: string | null;
    selectedStrategy: "normalized-text" | "split-tokens" | "coordinates" | "not-found";
  };
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
    .replace(/\p{Cf}/gu, "")
    .replace(/\s*:\s*/g, ":")
    .replace(/\s+/g, " ")
    .trim();
}

export function isShipsPdfFileDescriptor(file: { name?: string; type?: string } | null | undefined): boolean {
  if (!file) return false;
  return String(file.type || "").toLowerCase().includes("pdf")
    || String(file.name || "").toLowerCase().endsWith(".pdf");
}

function joinPositionedRow(items: ShipsPdfPositionedTextItem[]): string {
  const sorted = [...items].sort((first, second) => first.x - second.x);
  let result = "";
  let previous: ShipsPdfPositionedTextItem | undefined;

  for (const item of sorted) {
    const text = String(item.text || "");
    if (!text) continue;

    if (previous && result && !/\s$/.test(result) && !/^\s/.test(text)) {
      const previousWidth = Number(previous.width || 0);
      const previousRight = previous.x + previousWidth;
      const gap = item.x - previousRight;
      const previousCharacterWidth = previousWidth > 0 && previous.text.length > 0
        ? previousWidth / previous.text.length
        : 0;
      const currentCharacterWidth = Number(item.width || 0) > 0 && item.text.length > 0
        ? Number(item.width) / item.text.length
        : 0;
      const characterWidth = Math.max(previousCharacterWidth, currentCharacterWidth);
      const spacingThreshold = characterWidth > 0 ? Math.max(0.8, Math.min(3, characterWidth * 0.4)) : 0;
      const shouldInsertSpace = previousWidth <= 0 || gap > spacingThreshold;
      if (shouldInsertSpace) result += " ";
    }

    result += text;
    previous = item;
  }

  return normalizeShipsExtractedText(result);
}

export function groupShipsPdfPageItems(
  items: ShipsPdfPositionedTextItem[],
  page: number,
): ShipsPdfTextLine[] {
  const rows: Array<{ y: number; items: ShipsPdfPositionedTextItem[] }> = [];

  for (const item of [...items].sort((first, second) => second.y - first.y || first.x - second.x)) {
    const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= 2.5);
    if (row) row.items.push(item);
    else rows.push({ y: item.y, items: [item] });
  }

  return rows
    .sort((first, second) => second.y - first.y)
    .map((row) => ({ page, text: joinPositionedRow(row.items) }))
    .filter((line) => line.text);
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

function normalizeVehicleForDisplay(value: unknown): string {
  return normalizeShipsExtractedText(value).toUpperCase().replace(/\s+/g, "");
}

function isCoordinateVehicleCandidate(value: string): boolean {
  const comparable = normalizeShipsVehicleNumber(value);
  return comparable.length >= 2
    && comparable.length <= 20
    && /\d/.test(comparable)
    && /^[A-Z0-9]+$/.test(comparable);
}

function extractVehicleFromPositionedItems(items: ShipsPdfPositionedTextItem[]): string {
  const pages = Array.from(new Set(items.map((item) => item.page))).sort((first, second) => first - second);

  for (const page of pages) {
    const pageItems = items
      .filter((item) => item.page === page && compactSpaces(item.text))
      .map((item, index) => ({ ...item, index, normalized: compactSpaces(item.text) }));

    const labelGroups: Array<typeof pageItems> = [];
    for (const item of pageItems) {
      if (/vehicle\s*number\s*:?/i.test(item.normalized)) labelGroups.push([item]);
    }

    const vehicleTokens = pageItems.filter((item) => /\bvehicle\b/i.test(item.normalized));
    const numberTokens = pageItems.filter((item) => /\bnumber\b/i.test(item.normalized));
    for (const vehicleToken of vehicleTokens) {
      const nearbyNumber = numberTokens
        .filter((numberToken) => numberToken.index !== vehicleToken.index)
        .map((numberToken) => {
          const yDistance = Math.abs(numberToken.y - vehicleToken.y);
          const horizontalOrder = numberToken.x >= vehicleToken.x - 8;
          const sameRow = yDistance <= Math.max(10, vehicleToken.height || 0, numberToken.height || 0);
          const stacked = yDistance <= 35 && Math.abs(numberToken.x - vehicleToken.x) <= 100;
          return {
            item: numberToken,
            valid: horizontalOrder && (sameRow || stacked),
            score: yDistance * 10 + Math.abs(numberToken.x - vehicleToken.x),
          };
        })
        .filter((candidate) => candidate.valid)
        .sort((first, second) => first.score - second.score)[0]?.item;
      if (nearbyNumber) labelGroups.push([vehicleToken, nearbyNumber]);
    }

    for (const labelItems of labelGroups) {
      const labelIndexes = new Set(labelItems.map((item) => item.index));
      const labelLeft = Math.min(...labelItems.map((item) => item.x));
      const labelRight = Math.max(...labelItems.map((item) => item.x + (item.width || item.normalized.length * 5)));
      const labelY = labelItems.reduce((total, item) => total + item.y, 0) / labelItems.length;
      const rowTolerance = Math.max(12, ...labelItems.map((item) => (item.height || 0) * 1.75));

      const candidates = pageItems
        .filter((item) => !labelIndexes.has(item.index))
        .map((item) => {
          const value = item.normalized.replace(/^:+|:+$/g, "");
          const yDistance = Math.abs(item.y - labelY);
          const isRight = item.x >= labelRight - 4 && yDistance <= rowTolerance;
          const verticalDistance = labelY - item.y;
          const isBelow = verticalDistance > 0
            && verticalDistance <= 40
            && item.x >= labelLeft - 20
            && item.x <= labelRight + 220;
          return {
            value,
            valid: isCoordinateVehicleCandidate(value) && (isRight || isBelow),
            score: isRight
              ? yDistance * 100 + Math.max(0, item.x - labelRight)
              : 100_000 + verticalDistance * 100 + Math.abs(item.x - labelLeft),
          };
        })
        .filter((candidate) => candidate.valid)
        .sort((first, second) => first.score - second.score);

      if (candidates[0]) return normalizeVehicleForDisplay(candidates[0].value);
    }
  }

  return "";
}

function extractTripDateFromPositionedItems(items: ShipsPdfPositionedTextItem[]): string {
  const pages = Array.from(new Set(items.map((item) => item.page))).sort((first, second) => first - second);

  for (const page of pages) {
    const pageItems = items
      .filter((item) => item.page === page && compactSpaces(item.text))
      .map((item, index) => ({ ...item, index, normalized: compactSpaces(item.text) }));
    const tripTokens = pageItems.filter((item) => /^trip$/i.test(item.normalized));
    const dateTokens = pageItems.filter((item) => /^date:?$/i.test(item.normalized));

    for (const tripToken of tripTokens) {
      const nearbyDates = dateTokens
        .map((dateToken) => {
          const yDistance = Math.abs(dateToken.y - tripToken.y);
          const sameColumn = Math.abs(dateToken.x - tripToken.x) <= 100;
          return {
            item: dateToken,
            valid: sameColumn && yDistance <= 35,
            score: yDistance * 10 + Math.abs(dateToken.x - tripToken.x),
          };
        })
        .filter((candidate) => candidate.valid)
        .sort((first, second) => first.score - second.score);

      for (const nearbyDate of nearbyDates) {
        const labelItems = [tripToken, nearbyDate.item];
        const labelIndexes = new Set(labelItems.map((item) => item.index));
        const labelRight = Math.max(...labelItems.map((item) => item.x + (item.width || item.normalized.length * 5)));
        const labelY = labelItems.reduce((total, item) => total + item.y, 0) / labelItems.length;
        const rowTolerance = Math.max(16, ...labelItems.map((item) => (item.height || 0) * 2));

        const candidates = pageItems
          .filter((item) => !labelIndexes.has(item.index))
          .map((item) => {
            const dateMatch = item.normalized.match(TRIP_DATE_VALUE_PATTERN);
            const dateValue = dateMatch ? item.normalized.slice(dateMatch.index || 0) : "";
            const yDistance = Math.abs(item.y - labelY);
            const isRight = item.x >= labelRight - 4 && yDistance <= rowTolerance;
            return {
              item,
              value: dateValue,
              valid: Boolean(dateValue) && isRight && Boolean(parseShipsTripDate(dateValue)),
              score: yDistance * 100 + Math.max(0, item.x - labelRight),
            };
          })
          .filter((candidate) => candidate.valid)
          .sort((first, second) => first.score - second.score);

        const selected = candidates[0];
        if (!selected) continue;
        let value = selected.value;
        if (!/\b(?:AM|PM)\b/i.test(value)) {
          const period = pageItems
            .filter((item) => /^(?:AM|PM)$/i.test(item.normalized))
            .map((item) => ({
              value: item.normalized.toUpperCase(),
              score: Math.abs(item.x - selected.item.x) + Math.abs(item.y - selected.item.y) * 10,
              valid: Math.abs(item.x - selected.item.x) <= 100 && Math.abs(item.y - selected.item.y) <= 30,
            }))
            .filter((candidate) => candidate.valid)
            .sort((first, second) => first.score - second.score)[0]?.value;
          if (period) value = `${value} ${period}`;
        }
        if (parseShipsTripDate(value)) return value;
      }
    }
  }

  return "";
}

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

function parseTableLine(line: string, tripNo?: string): ShipsDeliveryOrder | null {
  const cleanLine = compactSpaces(line);
  if (!cleanLine) return null;
  const header = normalizeHeader(cleanLine);
  if (header.includes("deliveryorder") || header.includes("customerid") || header.includes("secondarytripno")) return null;

  const longNumbers = cleanLine.match(/\b\d{6,}\b/g) || [];
  if (longNumbers.length < 2) return null;

  let deliveryOrder = "";
  let customerId = "";
  const firstNumberIsSecondaryTrip = Boolean(tripNo)
    && normalizeShipsDtKey(longNumbers[0]) === normalizeShipsDtKey(tripNo);
  if (longNumbers.length >= 3 && firstNumberIsSecondaryTrip) {
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

function extractDeliveries(lines: string[], tripNo?: string): { deliveries: ShipsDeliveryOrder[]; duplicateCount: number } {
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
    const row = parseTableLine(line, tripNo);
    if (row) parsedRows.push(row);
  }

  // Fallback for extracted PDFs that lose the table header but keep complete rows.
  if (parsedRows.length === 0) {
    for (const line of lines) {
      const row = parseTableLine(line, tripNo);
      if (row) parsedRows.push(row);
    }
  }

  const sanitized = sanitizeShipsDeliveries(parsedRows);
  return { deliveries: sanitized, duplicateCount: parsedRows.length - sanitized.length };
}

export function parseShipsPdfLines(
  sourceLines: ShipsPdfTextLine[] | string[],
  positionedItems: ShipsPdfPositionedTextItem[] = [],
): ShipsParsedTrip {
  const inspection = inspectShipsPdfHeader(sourceLines, positionedItems);
  const { tripNoRaw, vehicleRaw, tripDateRaw } = inspection;
  const pageTexts = buildPageTexts(sourceLines);
  const lines = pageTexts.flatMap((pageText) => pageText.lines);
  const parsedDate = parseShipsTripDate(tripDateRaw);
  const { deliveries, duplicateCount } = extractDeliveries(lines, tripNoRaw);
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
    vehicleNumber: normalizeVehicleForDisplay(vehicleRaw),
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

export function inspectShipsPdfHeader(
  sourceLines: ShipsPdfTextLine[] | string[],
  positionedItems: ShipsPdfPositionedTextItem[] = [],
): ShipsPdfHeaderInspection {
  const pageTexts = buildPageTexts(sourceLines);

  // Header values use continuous normalized page text. PDF.js may split a
  // visually continuous label/value into multiple positioned text items.
  const tripNoRaw = findMatchByPage(pageTexts, TRIP_NUMBER_PATTERN)
    || findValueAfterSplitLabel(pageTexts, /\bTrip\s*(?:No|Number)\.?\s*:?/i, /\d+/, (candidate) => /^\d+$/.test(candidate));
  const normalizedTextCandidate = findMatchByPage(pageTexts, VEHICLE_NUMBER_PATTERN);
  const splitTokenCandidate = normalizedTextCandidate ? "" : findValueAfterSplitLabel(
      pageTexts,
      /\bVehicle\s*Number\s*:?/i,
      /[A-Z0-9-]+/i,
      (candidate) => /^[A-Z0-9-]+$/i.test(candidate),
    );
  const coordinateCandidate = normalizedTextCandidate || splitTokenCandidate
    ? ""
    : extractVehicleFromPositionedItems(positionedItems);
  const vehicleRaw = normalizedTextCandidate || splitTokenCandidate || coordinateCandidate;
  const normalizedTripDateCandidate = findMatchByPage(pageTexts, TRIP_DATE_PATTERN);
  const splitTripDateCandidate = normalizedTripDateCandidate ? "" : findValueAfterSplitLabel(
      pageTexts,
      /\bTrip\s*Date\s*:?/i,
      TRIP_DATE_VALUE_PATTERN,
      (candidate) => Boolean(parseShipsTripDate(candidate)),
    );
  const coordinateTripDateCandidate = normalizedTripDateCandidate || splitTripDateCandidate
    ? ""
    : extractTripDateFromPositionedItems(positionedItems);
  const tripDateRaw = normalizedTripDateCandidate || splitTripDateCandidate || coordinateTripDateCandidate;

  return {
    tripNoRaw,
    vehicleRaw,
    tripDateRaw,
    vehicleSearch: {
      regex: VEHICLE_NUMBER_PATTERN.source,
      normalizedTextCandidate: normalizedTextCandidate || null,
      splitTokenCandidate: splitTokenCandidate || null,
      coordinateCandidate: coordinateCandidate || null,
      selectedStrategy: normalizedTextCandidate
        ? "normalized-text"
        : splitTokenCandidate
          ? "split-tokens"
          : coordinateCandidate
            ? "coordinates"
            : "not-found",
    },
    tripDateSearch: {
      regex: TRIP_DATE_PATTERN.source,
      normalizedTextCandidate: normalizedTripDateCandidate || null,
      splitTokenCandidate: splitTripDateCandidate || null,
      coordinateCandidate: coordinateTripDateCandidate || null,
      selectedStrategy: normalizedTripDateCandidate
        ? "normalized-text"
        : splitTripDateCandidate
          ? "split-tokens"
          : coordinateTripDateCandidate
            ? "coordinates"
            : "not-found",
    },
  };
}

export function parseShipsPdfText(text: string): ShipsParsedTrip {
  return parseShipsPdfLines(String(text || "").split(/\r?\n/));
}
