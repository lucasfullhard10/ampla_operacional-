type RouteIdentityInput = {
  id?: unknown;
  dt?: unknown;
  tipo?: unknown;
  data?: unknown;
  veiculoId?: unknown;
  motoristaId?: unknown;
};

/**
 * Stores DTs in one canonical format so aliases such as "DT-123", "#123"
 * and " 123 " cannot bypass duplicate checks.
 */
export function normalizeDt(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/^dt\s*[-:#]?\s*/i, "")
    .replace(/^#\s*/, "")
    .trim()
    .toUpperCase();
}

export function getDtKey(value: unknown): string {
  const key = normalizeDt(value).replace(/\s+/g, "");
  return /^\d+$/.test(key) ? key.replace(/^0+(?=\d)/, "") : key;
}

export function isReentregaRoute(route: RouteIdentityInput): boolean {
  return String(route.tipo ?? "").trim().toLowerCase().includes("reentrega");
}

function normalizeIdentityPart(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

/** A retry/double-click of the same re-delivery must not create another row. */
export function getRouteSubmissionKey(route: RouteIdentityInput): string {
  return [
    getDtKey(route.dt),
    normalizeIdentityPart(route.tipo),
    normalizeIdentityPart(route.data),
    normalizeIdentityPart(route.veiculoId),
    normalizeIdentityPart(route.motoristaId),
  ].join("|");
}

export function findConflictingRoute<T extends RouteIdentityInput>(
  routes: T[],
  candidate: RouteIdentityInput,
  ignoredId?: string,
): T | undefined {
  const candidateDt = getDtKey(candidate.dt);
  const candidateIsReentrega = isReentregaRoute(candidate);
  const submissionKey = getRouteSubmissionKey(candidate);

  return routes.find((route) => {
    if (ignoredId && String(route.id) === ignoredId) return false;
    if (getDtKey(route.dt) !== candidateDt) return false;

    // A DT has one principal trip. Re-deliveries are separate operations, but
    // an identical re-delivery submission is still a duplicate.
    if (!candidateIsReentrega) return true;
    return isReentregaRoute(route) && getRouteSubmissionKey(route) === submissionKey;
  });
}

function toIdSegment(value: unknown): string {
  return normalizeDt(value).replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "SEM-NUMERO";
}

export function buildRouteId(route: RouteIdentityInput, uniqueSuffix?: string): string {
  const baseId = `DT-${toIdSegment(route.dt)}`;
  if (!isReentregaRoute(route)) return baseId;

  const suffix = String(uniqueSuffix ?? Date.now()).replace(/[^A-Za-z0-9-]/g, "");
  return `${baseId}-REENTREGA-${suffix}`;
}

function mergeUniqueEntries(first: unknown, second: unknown): unknown[] {
  const result: unknown[] = [];
  const fingerprints = new Set<string>();

  for (const entry of [...(Array.isArray(first) ? first : []), ...(Array.isArray(second) ? second : [])]) {
    const fingerprint = JSON.stringify(entry);
    if (fingerprints.has(fingerprint)) continue;
    fingerprints.add(fingerprint);
    result.push(entry);
  }
  return result;
}

/**
 * Repairs records created before route IDs became unique. Principal-trip
 * duplicates are consolidated into the first record while their complete
 * snapshots remain attached for audit/recovery. Re-deliveries remain separate.
 */
export function reconcileRouteRecords<T extends RouteIdentityInput & Record<string, any>>(
  source: T[],
): { routes: T[]; changed: boolean; consolidated: number } {
  const routes: T[] = [];
  const principalByDt = new Map<string, T>();
  const usedIds = new Set<string>();
  const reentregaSequence = new Map<string, number>();
  let changed = false;
  let consolidated = 0;

  for (const sourceRoute of source || []) {
    const canonicalDt = normalizeDt(sourceRoute.dt);
    const dtKey = getDtKey(canonicalDt);
    const route = { ...sourceRoute, dt: canonicalDt, dt_normalizada: dtKey } as T;
    if (canonicalDt !== String(sourceRoute.dt ?? "")) changed = true;
    if (String(sourceRoute.dt_normalizada ?? "") !== dtKey) changed = true;
    if (!dtKey) {
      routes.push(route);
      if (route.id) usedIds.add(String(route.id));
      continue;
    }

    if (!isReentregaRoute(route)) {
      const principal = principalByDt.get(dtKey);
      if (!principal) {
        principalByDt.set(dtKey, route);
        routes.push(route);
        if (route.id) usedIds.add(String(route.id));
        continue;
      }

      // Preserve operational progress from either copy while keeping the first
      // registration's identity, date, vehicle and driver as the source of truth.
      const principalRecord = principal as Record<string, any>;
      const duplicateRecord = route as Record<string, any>;
      for (const field of ["totalEntregas", "entregues", "devolucoes", "recusadas"] as const) {
        principalRecord[field] = Math.max(Number(principalRecord[field] || 0), Number(duplicateRecord[field] || 0));
      }
      principalRecord.historico_status = mergeUniqueEntries(principalRecord.historico_status, duplicateRecord.historico_status);
      principalRecord.log_alteracoes = mergeUniqueEntries(principalRecord.log_alteracoes, duplicateRecord.log_alteracoes);
      principalRecord.ocorrencias = mergeUniqueEntries(principalRecord.ocorrencias, duplicateRecord.ocorrencias);
      principalRecord.registros_duplicados_consolidados = [
        ...(Array.isArray(principalRecord.registros_duplicados_consolidados) ? principalRecord.registros_duplicados_consolidados : []),
        sourceRoute,
      ];

      const duplicateWasFinalized = String(duplicateRecord.status || "").toLowerCase() === "finalizada"
        || String(duplicateRecord.status_viagem || "").toLowerCase() === "finalizada";
      if (duplicateWasFinalized) {
        principalRecord.status = "Finalizada";
        principalRecord.status_viagem = "Finalizada";
      }

      changed = true;
      consolidated++;
      continue;
    }

    const baseId = buildRouteId({ dt: canonicalDt, tipo: "Entrega" });
    let routeId = String(route.id || "");
    if (!routeId || routeId === baseId || usedIds.has(routeId)) {
      let sequence = (reentregaSequence.get(dtKey) || 0) + 1;
      let migratedId = buildRouteId(route, `MIGRADA-${sequence}`);
      while (usedIds.has(migratedId)) {
        sequence++;
        migratedId = buildRouteId(route, `MIGRADA-${sequence}`);
      }
      reentregaSequence.set(dtKey, sequence);
      routeId = migratedId;
      route.id = routeId;
      changed = true;
    }
    usedIds.add(routeId);
    routes.push(route);
  }

  return { routes, changed, consolidated };
}
