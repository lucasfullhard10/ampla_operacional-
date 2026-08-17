import assert from "node:assert/strict";
import { calculateFleetAvailabilityMetrics } from "./fleetAvailability.ts";

const availability = (count: number) => Array.from({ length: count }, (_, index) => ({
  data: "2026-08-13", unidadeId: "go", veiculoId: `v-${index}`,
}));
const routes = (count: number) => Array.from({ length: count }, (_, index) => ({
  data: "2026-08-13", unidadeId: "go", veiculoId: `v-${index}`, status: "Em rota",
}));

assert.deepEqual(calculateFleetAvailabilityMetrics(availability(100), routes(50)), { disponibilizados: 100, roteirizados: 50, ociosos: 50, aproveitamento: 50 });
assert.deepEqual(calculateFleetAvailabilityMetrics(availability(100), routes(100)), { disponibilizados: 100, roteirizados: 100, ociosos: 0, aproveitamento: 100 });
assert.deepEqual(calculateFleetAvailabilityMetrics(availability(100), []), { disponibilizados: 100, roteirizados: 0, ociosos: 100, aproveitamento: 0 });
assert.deepEqual(calculateFleetAvailabilityMetrics([], []), { disponibilizados: 0, roteirizados: 0, ociosos: 0, aproveitamento: 0 });
assert.equal(calculateFleetAvailabilityMetrics(availability(142), routes(32)).aproveitamento, 23);
assert.deepEqual(calculateFleetAvailabilityMetrics([
  { data: "2026-08-13", unidadeId: "go", veiculoId: "same" },
  { data: "2026-08-14", unidadeId: "go", veiculoId: "same" },
], [
  { data: "2026-08-13", unidadeId: "go", veiculoId: "same", status: "Em rota" },
  { data: "2026-08-14", unidadeId: "go", veiculoId: "same", status: "Em rota" },
]), { disponibilizados: 1, roteirizados: 1, ociosos: 0, aproveitamento: 100 });
assert.equal(calculateFleetAvailabilityMetrics(availability(1), [{ data: "2026-08-13", unidadeId: "go", veiculoId: "v-0", status: "Cancelada" }]).roteirizados, 0);

console.log("fleetAvailability tests passed");
