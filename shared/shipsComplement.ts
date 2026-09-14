export type CsvRow = Record<string, string>;

export interface ShipsDeliveryComplement {
  id: string;
  rotaId: string;
  shipsDeliveryId?: string;
  deliveryOrder: string;
  referenceNumber: string;
  customerCode?: string;
  customerName?: string;
  shipsStatus?: string;
  currentConsignmentStatus?: string;
  completionTime?: string;
  receiverName?: string;
  receiverRelation?: string;
  receiverPhone?: string;
  workerName?: string;
  workerCode?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressCity?: string;
  addressState?: string;
  postalCode?: string;
  phone?: string;
  completionLat?: number;
  completionLng?: number;
  pocImage?: string;
  signatureImage?: string;
  attemptCount?: number;
  isPartialDelivery?: boolean;
  isCod?: boolean;
  codAmount?: number;
  codCollectionMode?: string;
  taskType?: string;
  syncedAt?: string;
  rawMetadata: CsvRow;
  importedAt: string;
  importedBy: string;
}

export interface ShipsCsvImportHistory {
  id: string;
  rotaId: string;
  dt: string;
  unidadeId: string;
  fileName: string;
  records: number;
  matched: number;
  ignored: number;
  existing: number;
  importedAt: string;
  importedBy: string;
}

export interface ShipsComplementPreview {
  rotaId: string;
  dt: string;
  fileName: string;
  records: number;
  matched: number;
  ignored: number;
  existing: number;
  newData: number;
  unknownReferences: string[];
  matchedRows: Array<{
    referenceNumber: string;
    deliveryOrder: string;
    customerCode?: string;
    customerName?: string;
    alreadyExists: boolean;
  }>;
}

type RouteDelivery = { id?: string; deliveryOrder: string; customerId?: string; customerName?: string };

export function buildShipsComplementPreview(input: {
  rotaId: string;
  dt: string;
  fileName: string;
  rows: CsvRow[];
  deliveries: RouteDelivery[];
  existing: ShipsDeliveryComplement[];
}): ShipsComplementPreview {
  const deliveries = new Map(input.deliveries.map((delivery) => [normalizeReferenceNumber(delivery.deliveryOrder), delivery]));
  const existing = new Set(input.existing.filter((item) => item.rotaId === input.rotaId).map((item) => normalizeReferenceNumber(item.referenceNumber)));
  const matchedRows: ShipsComplementPreview["matchedRows"] = [];
  const unknownReferences: string[] = [];
  const seen = new Set<string>();

  for (const row of input.rows) {
    const mapped = mapShipsComplementRow(row);
    const referenceNumber = mapped.referenceNumber;
    if (!referenceNumber || seen.has(referenceNumber)) continue;
    seen.add(referenceNumber);
    const delivery = deliveries.get(referenceNumber);
    if (!delivery) {
      unknownReferences.push(referenceNumber || "(sem referência)");
      continue;
    }
    matchedRows.push({
      referenceNumber,
      deliveryOrder: delivery.deliveryOrder,
      customerCode: delivery.customerId || mapped.customerCode,
      customerName: delivery.customerName || mapped.customerName,
      alreadyExists: existing.has(referenceNumber),
    });
  }

  const existingCount = matchedRows.filter((item) => item.alreadyExists).length;
  return {
    rotaId: input.rotaId,
    dt: input.dt,
    fileName: input.fileName,
    records: input.rows.length,
    matched: matchedRows.length,
    ignored: input.rows.length - matchedRows.length,
    existing: existingCount,
    newData: matchedRows.length - existingCount,
    unknownReferences,
    matchedRows,
  };
}

export function upsertShipsComplements(input: {
  rotaId: string;
  rows: CsvRow[];
  deliveries: RouteDelivery[];
  existing: ShipsDeliveryComplement[];
  importedAt: string;
  importedBy: string;
}): ShipsDeliveryComplement[] {
  const deliveryMap = new Map(input.deliveries.map((delivery) => [normalizeReferenceNumber(delivery.deliveryOrder), delivery]));
  const result = [...input.existing];
  for (const row of input.rows) {
    const mapped = mapShipsComplementRow(row);
    const delivery = deliveryMap.get(mapped.referenceNumber);
    if (!delivery) continue;
    const id = `SHIPSC-${input.rotaId}-${mapped.referenceNumber}`;
    const next: ShipsDeliveryComplement = {
      ...mapped,
      id,
      rotaId: input.rotaId,
      shipsDeliveryId: delivery.id,
      deliveryOrder: delivery.deliveryOrder,
      customerCode: delivery.customerId || mapped.customerCode,
      customerName: delivery.customerName || mapped.customerName,
      importedAt: input.importedAt,
      importedBy: input.importedBy,
    };
    const index = result.findIndex((item) => item.rotaId === input.rotaId && normalizeReferenceNumber(item.referenceNumber) === mapped.referenceNumber);
    if (index === -1) result.push(next);
    else result[index] = { ...result[index], ...next, id: result[index].id || id };
  }
  return result;
}

const FIELD_ALIASES: Record<string, string[]> = {
  referenceNumber: ["reference_number", "reference number", "reference", "delivery_order", "delivery order"],
  customerCode: ["customer_code", "customer code", "customer_id", "customer id"],
  customerName: ["customer_name", "customer name"],
  shipsStatus: ["status"],
  currentConsignmentStatus: ["current_consignment_status", "current consignment status"],
  completionTime: ["completion_time", "completion time"],
  receiverName: ["receiver_name", "receiver name"],
  receiverRelation: ["receiver_relation", "receiver relation", "relationship"],
  receiverPhone: ["receiver_phone", "receiver phone"],
  workerName: ["worker_name", "worker name"],
  workerCode: ["worker_code", "worker code"],
  addressLine1: ["address_line_1", "address line 1"],
  addressLine2: ["address_line_2", "address line 2"],
  addressCity: ["address_city", "address city", "city"],
  addressState: ["address_state", "address state", "state"],
  postalCode: ["postal_code", "postal code", "cep"],
  phone: ["phone", "customer_phone", "customer phone"],
  completionLat: ["completion_lat", "completion lat", "latitude"],
  completionLng: ["completion_lng", "completion lng", "longitude"],
  pocImage: ["poc_image", "poc image", "proof_of_completion"],
  signatureImage: ["signature_image", "signature image"],
  attemptCount: ["attempt_count", "attempt count"],
  isPartialDelivery: ["is_partial_delivery", "is partial delivery"],
  isCod: ["is_cod", "is cod"],
  codAmount: ["cod_amount", "cod amount"],
  codCollectionMode: ["cod_collection_mode", "cod collection mode"],
  taskType: ["task_type", "task type", "service_type", "service type"],
  syncedAt: ["synced_at", "synced at"],
};

export function normalizeCsvHeader(value: unknown): string {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-.]+/g, "_")
    .replace(/\s+/g, " ");
}

export function normalizeReferenceNumber(value: unknown): string {
  const text = String(value ?? "").trim();
  const digits = text.replace(/\D/g, "");
  return digits || text.toUpperCase().replace(/\s+/g, "");
}

function detectDelimiter(line: string): string {
  const options = [",", ";", "\t"];
  return options.reduce((best, candidate) => {
    const count = line.split(candidate).length;
    return count > best.count ? { value: candidate, count } : best;
  }, { value: ",", count: 0 }).value;
}

export function parseShipsCsv(text: string): CsvRow[] {
  const source = String(text || "").replace(/^\uFEFF/, "");
  const firstLine = source.split(/\r?\n/, 1)[0] || "";
  const delimiter = detectDelimiter(firstLine);
  const matrix: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) matrix.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) matrix.push(row);
  if (matrix.length < 2) return [];

  const headers = matrix[0].map(normalizeCsvHeader);
  return matrix.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

function valueFrom(row: CsvRow, field: keyof typeof FIELD_ALIASES): string {
  const normalized = new Map(Object.entries(row).map(([key, value]) => [normalizeCsvHeader(key), String(value ?? "").trim()]));
  for (const alias of FIELD_ALIASES[field]) {
    const value = normalized.get(normalizeCsvHeader(alias));
    if (value !== undefined && value !== "") return value;
  }
  return "";
}

function optionalNumber(value: string): number | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : undefined;
}

function optionalBoolean(value: string): boolean | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "sim", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "nao", "não", "n"].includes(normalized)) return false;
  return undefined;
}

export function mapShipsComplementRow(row: CsvRow): Omit<ShipsDeliveryComplement, "id" | "rotaId" | "deliveryOrder" | "shipsDeliveryId" | "importedAt" | "importedBy"> {
  return {
    referenceNumber: normalizeReferenceNumber(valueFrom(row, "referenceNumber")),
    customerCode: valueFrom(row, "customerCode") || undefined,
    customerName: valueFrom(row, "customerName") || undefined,
    shipsStatus: valueFrom(row, "shipsStatus") || undefined,
    currentConsignmentStatus: valueFrom(row, "currentConsignmentStatus") || undefined,
    completionTime: valueFrom(row, "completionTime") || undefined,
    receiverName: valueFrom(row, "receiverName") || undefined,
    receiverRelation: valueFrom(row, "receiverRelation") || undefined,
    receiverPhone: valueFrom(row, "receiverPhone") || undefined,
    workerName: valueFrom(row, "workerName") || undefined,
    workerCode: valueFrom(row, "workerCode") || undefined,
    addressLine1: valueFrom(row, "addressLine1") || undefined,
    addressLine2: valueFrom(row, "addressLine2") || undefined,
    addressCity: valueFrom(row, "addressCity") || undefined,
    addressState: valueFrom(row, "addressState") || undefined,
    postalCode: valueFrom(row, "postalCode") || undefined,
    phone: valueFrom(row, "phone") || undefined,
    completionLat: optionalNumber(valueFrom(row, "completionLat")),
    completionLng: optionalNumber(valueFrom(row, "completionLng")),
    pocImage: valueFrom(row, "pocImage") || undefined,
    signatureImage: valueFrom(row, "signatureImage") || undefined,
    attemptCount: optionalNumber(valueFrom(row, "attemptCount")),
    isPartialDelivery: optionalBoolean(valueFrom(row, "isPartialDelivery")),
    isCod: optionalBoolean(valueFrom(row, "isCod")),
    codAmount: optionalNumber(valueFrom(row, "codAmount")),
    codCollectionMode: valueFrom(row, "codCollectionMode") || undefined,
    taskType: valueFrom(row, "taskType") || undefined,
    syncedAt: valueFrom(row, "syncedAt") || undefined,
    rawMetadata: Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeCsvHeader(key), String(value ?? "").trim()])),
  };
}

export function getOperationalRouteTotals(route: { totalEntregas?: number; entregues?: number; devolucoes?: number; recusadas?: number }) {
  const total = Math.max(0, Number(route.totalEntregas || 0));
  const entregues = Math.max(0, Number(route.entregues || 0));
  const devolucoes = Math.max(0, Number(route.devolucoes || 0));
  const recusadas = Math.max(0, Number(route.recusadas || 0));
  const pendentes = Math.max(0, total - entregues - devolucoes - recusadas);
  const concluidas = Math.min(total, entregues + devolucoes + recusadas);
  return {
    total,
    entregues,
    devolucoes,
    recusadas,
    pendentes,
    concluidas,
    // Preserva a regra histórica do Monitoramento: progresso representa
    // entregas concluídas, enquanto devoluções/recusas apenas reduzem pendências.
    percentual: total > 0 ? Math.round((Math.min(total, entregues) / total) * 100) : 0,
  };
}
