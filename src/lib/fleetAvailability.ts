export interface FleetAvailabilityRecord {
  id?: string;
  data: string;
  unidadeId?: string;
  unidade?: string;
  veiculoId: string;
  created_at?: string;
  updated_at?: string;
}

export interface FleetRouteRecord {
  data: string;
  unidadeId?: string;
  veiculoId: string;
  status?: string;
  status_viagem?: string;
}

export interface FleetAvailabilityMetrics {
  disponibilizados: number;
  roteirizados: number;
  ociosos: number;
  aproveitamento: number;
}

const getUnitId = (record: FleetAvailabilityRecord) => record.unidadeId || record.unidade || "";

/** A cancelled or invalidated DT must not consume a declared vehicle. */
export const isValidRouteForAvailability = (route: FleetRouteRecord) => {
  const status = `${route.status_viagem || ""} ${route.status || ""}`.trim().toLocaleLowerCase("pt-BR");
  return !status.includes("cancel") && !status.includes("invalid");
};

/**
 * Keeps the latest declaration when legacy or imported data contains more than
 * one availability row for the same vehicle, unit and operational date.
 */
export const deduplicateAvailabilityRecords = <T extends FleetAvailabilityRecord>(records: T[]): T[] => {
  const byVehicleDay = new Map<string, T>();
  for (const record of records) {
    if (!record.veiculoId || !record.data) continue;
    const key = `${getUnitId(record)}|${record.data}|${record.veiculoId}`;
    const current = byVehicleDay.get(key);
    const recordStamp = record.updated_at || record.created_at || "";
    const currentStamp = current?.updated_at || current?.created_at || "";
    if (!current || recordStamp >= currentStamp) byVehicleDay.set(key, record);
  }
  return [...byVehicleDay.values()];
};

/**
 * KPI contract: an offered/routed vehicle is counted once in the selected
 * operational scope, even if it has several declarations or DTs in it.
 */
export const calculateFleetAvailabilityMetrics = (
  availability: FleetAvailabilityRecord[],
  routes: FleetRouteRecord[],
): FleetAvailabilityMetrics => {
  const declarations = deduplicateAvailabilityRecords(availability);
  const offeredVehicles = new Set(declarations.map(d => d.veiculoId));
  const routedVehicles = new Set<string>();

  for (const declaration of declarations) {
    const declarationUnit = getUnitId(declaration);
    const isRouted = routes.some(route =>
      isValidRouteForAvailability(route) &&
      route.veiculoId === declaration.veiculoId &&
      route.data === declaration.data &&
      (!route.unidadeId || !declarationUnit || route.unidadeId === declarationUnit),
    );
    if (isRouted) routedVehicles.add(declaration.veiculoId);
  }

  const disponibilizados = offeredVehicles.size;
  const roteirizados = routedVehicles.size;
  return {
    disponibilizados,
    roteirizados,
    ociosos: Math.max(0, disponibilizados - roteirizados),
    aproveitamento: disponibilizados === 0 ? 0 : Math.round((roteirizados / disponibilizados) * 100),
  };
};
