import assert from "node:assert/strict";
import test from "node:test";
import { buildReturnSnapshot, canAccessOperationalUnit, getRouteReturnSummary } from "./routeReturns";

const records = [
  { id: "dev-1", rotaId: "rota-1", geraDevolucao: true, resolvido: "NÃO", clienteCodigo: "1", clienteNomeSnapshot: "Cliente A", numeroNF: "10", valorNF: 100, motivoCodigo: "Y40", motivoDescricao: "PDV Fechado" },
  { id: "dev-2", rotaId: "rota-1", geraDevolucao: true, resolvido: "NÃO", clienteCodigo: "2", clienteNomeSnapshot: "Cliente B", numeroNF: "20", valorNF: 250 },
  { id: "occ-1", rotaId: "rota-1", geraDevolucao: false, resolvido: "SIM", resolvidoBoolean: true, valorNF: 999 },
  { id: "other", rotaId: "rota-2", geraDevolucao: true, valorNF: 500 },
];

test("resolvido SIM fica no histórico e não entra em DEV", () => {
  const result = getRouteReturnSummary(records, "rota-1");
  assert.equal(result.resolvidas.length, 1);
  assert.equal(result.quantidade, 2);
  assert.equal(result.valorTotal, 350);
});

test("resolvido NÃO gera devolução efetiva vinculada somente à rota", () => {
  const result = getRouteReturnSummary(records, "rota-1");
  assert.deepEqual(result.efetivas.map((item) => item.id), ["dev-1", "dev-2"]);
});

test("snapshot do fechamento não muda após alteração da devolução", () => {
  const mutable = { ...records[0] };
  const snapshot = buildReturnSnapshot(mutable);
  mutable.valorNF = 9999;
  mutable.clienteNomeSnapshot = "Nome alterado";
  assert.equal(snapshot.valorNF, 100);
  assert.equal(snapshot.clienteNome, "Cliente A");
});

test("isolamento por unidade nega usuário de outra unidade", () => {
  assert.equal(canAccessOperationalUnit(["un-go"], "un-sp"), false);
  assert.equal(canAccessOperationalUnit(["Todas", "un-go"], "un-sp"), true);
});
