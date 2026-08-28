import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRouteId,
  findConflictingRoute,
  getDtKey,
  getRouteSubmissionKey,
  normalizeDt,
  reconcileRouteRecords,
} from "./routeIdentity.ts";

test("normaliza aliases do mesmo número de DT", () => {
  assert.equal(normalizeDt(" DT-12683734 "), "12683734");
  assert.equal(normalizeDt("#12683734"), "12683734");
  assert.equal(getDtKey("dt: AB 123"), "AB123");
  assert.equal(getDtKey("00012683734"), "12683734");
  assert.equal(getDtKey("0000"), "0");
});

test("bloqueia uma segunda viagem principal para a mesma DT", () => {
  const routes = [{ id: "DT-123", dt: "123", tipo: "Entrega", data: "2026-08-26" }];
  const duplicate = { dt: " DT-123 ", tipo: "Entrega", data: "2026-08-27" };

  assert.equal(findConflictingRoute(routes, duplicate)?.id, "DT-123");
});

test("bloqueia a mesma DT quando o Ships adiciona zeros à esquerda", () => {
  const routes = [{ id: "DT-12688623", dt: "12688623", tipo: "Entrega" }];
  assert.equal(findConflictingRoute(routes, { dt: "0012688623", tipo: "Entrega" })?.id, "DT-12688623");
});

test("permite reentrega distinta e bloqueia reenvio idêntico", () => {
  const existing = {
    id: "DT-123-REENTREGA-a",
    dt: "123",
    tipo: "Reentrega",
    data: "2026-08-27",
    veiculoId: "vei-1",
    motoristaId: "mot-1",
  };

  assert.equal(findConflictingRoute([existing], { ...existing, id: undefined })?.id, existing.id);
  assert.equal(findConflictingRoute([existing], { ...existing, id: undefined, data: "2026-08-28" }), undefined);
  assert.equal(getRouteSubmissionKey(existing), "123|reentrega|2026-08-27|vei-1|mot-1");
});

test("gera IDs diferentes para viagem principal e reentrega", () => {
  assert.equal(buildRouteId({ dt: "DT-123", tipo: "Entrega" }), "DT-123");
  assert.equal(buildRouteId({ dt: "123", tipo: "Reentrega" }, "req-1"), "DT-123-REENTREGA-req-1");
});

test("consolida duplicatas antigas sem descartar histórico e separa a reentrega", () => {
  const result = reconcileRouteRecords([
    {
      id: "DT-123",
      dt: "123",
      tipo: "Entrega",
      data: "2026-08-26",
      entregues: 0,
      historico_status: [{ status: "Em Rota" }],
    },
    {
      id: "DT-123",
      dt: "DT-123",
      tipo: "Entrega",
      data: "2026-08-27",
      entregues: 1,
      status: "Finalizada",
      historico_status: [{ status: "Finalizada" }],
    },
    {
      id: "DT-123",
      dt: "123",
      tipo: "Reentrega",
      data: "2026-08-27",
    },
  ]);

  assert.equal(result.changed, true);
  assert.equal(result.consolidated, 1);
  assert.equal(result.routes.length, 2);
  assert.equal(result.routes[0].id, "DT-123");
  assert.equal(result.routes[0].status, "Finalizada");
  assert.equal(result.routes[0].entregues, 1);
  assert.equal(result.routes[0].historico_status.length, 2);
  assert.equal((result.routes[0] as any).registros_duplicados_consolidados.length, 1);
  assert.equal(result.routes[1].id, "DT-123-REENTREGA-MIGRADA-1");
});
