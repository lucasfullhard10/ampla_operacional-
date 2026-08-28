export interface ShipsDeliveryOrder {
  id?: string;
  sequencia: number;
  deliveryOrder: string;
  customerId: string;
  customerName?: string;
  createdAt?: string;
}

export interface ShipsParsedTrip {
  tripNo: string;
  tripNoNormalized: string;
  vehicleNumber: string;
  tripDate: string;
  tripTime: string;
  vendor?: string;
  tripType?: string;
  vehicleType?: string;
  vehicleMake?: string;
  deliveries: ShipsDeliveryOrder[];
  uniqueCustomerCount: number;
  warnings: string[];
}

export function normalizeShipsDt(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/^dt\s*[-:#]?\s*/i, "")
    .replace(/^#\s*/, "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

export function normalizeShipsDtKey(value: unknown): string {
  const normalized = normalizeShipsDt(value);
  if (/^\d+$/.test(normalized)) {
    return normalized.replace(/^0+(?=\d)/, "");
  }
  return normalized;
}

export function normalizeShipsVehicleNumber(value: unknown): string {
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function sanitizeShipsDeliveries(deliveries: unknown): ShipsDeliveryOrder[] {
  if (!Array.isArray(deliveries)) return [];

  const seenOrders = new Set<string>();
  const result: ShipsDeliveryOrder[] = [];

  for (const raw of deliveries) {
    const deliveryOrder = String(raw?.deliveryOrder ?? "").replace(/\D/g, "");
    const customerId = String(raw?.customerId ?? "").replace(/\D/g, "");
    if (!deliveryOrder || !customerId || seenOrders.has(deliveryOrder)) continue;

    seenOrders.add(deliveryOrder);
    result.push({
      sequencia: result.length + 1,
      deliveryOrder,
      customerId,
      customerName: String(raw?.customerName ?? "").trim() || undefined,
    });
  }

  return result;
}

export function countUniqueShipsCustomers(deliveries: ShipsDeliveryOrder[]): number {
  return new Set(deliveries.map((delivery) => delivery.customerId)).size;
}
