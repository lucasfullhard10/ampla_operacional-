import assert from "node:assert/strict";
import test from "node:test";
import { buildShipsComplementPreview, getOperationalRouteTotals, mapShipsComplementRow, parseShipsCsv, upsertShipsComplements } from "./shipsComplement";

test("CSV Ships aceita separador, aspas e mapeia reference_number", () => {
  const rows = parseShipsCsv('reference_number;customer_name;status;cod_amount\n8080734183;"R & A, Alimentos";delivered;33.918,08');
  assert.equal(rows.length, 1);
  const mapped = mapShipsComplementRow(rows[0]);
  assert.equal(mapped.referenceNumber, "8080734183");
  assert.equal(mapped.customerName, "R & A, Alimentos");
  assert.equal(mapped.shipsStatus, "delivered");
  assert.equal(mapped.codAmount, 33918.08);
});

test("status delivered do CSV não participa dos totais operacionais", () => {
  const route = { totalEntregas: 20, entregues: 10, devolucoes: 0, recusadas: 0 };
  const before = getOperationalRouteTotals(route);
  mapShipsComplementRow({ reference_number: "1", status: "delivered" });
  const after = getOperationalRouteTotals(route);
  assert.deepEqual(after, before);
  assert.equal(after.entregues, 10);
});

test("progresso operacional considera baixas manuais e mantém pendências", () => {
  assert.deepEqual(getOperationalRouteTotals({ totalEntregas: 20, entregues: 18, devolucoes: 1, recusadas: 1 }), {
    total: 20,
    entregues: 18,
    devolucoes: 1,
    recusadas: 1,
    pendentes: 0,
    concluidas: 20,
    percentual: 90,
  });
});

test("preview cruza reference_number, ignora desconhecido e upsert não duplica", () => {
  const deliveries = [{ id: "ship-1", deliveryOrder: "8080734183", customerId: "2203432", customerName: "Cliente A" }];
  const rows = [
    { reference_number: "8080734183", status: "delivered" },
    { reference_number: "999999", status: "delivered" },
  ];
  const preview = buildShipsComplementPreview({ rotaId: "rota-1", dt: "001", fileName: "ships.csv", rows, deliveries, existing: [] });
  assert.equal(preview.matched, 1);
  assert.equal(preview.ignored, 1);
  assert.deepEqual(preview.unknownReferences, ["999999"]);

  const once = upsertShipsComplements({ rotaId: "rota-1", rows, deliveries, existing: [], importedAt: "2026-09-09T10:00:00Z", importedBy: "u" });
  const twice = upsertShipsComplements({ rotaId: "rota-1", rows: [{ reference_number: "8080734183", receiver_name: "Maria" }], deliveries, existing: once, importedAt: "2026-09-09T12:00:00Z", importedBy: "u" });
  assert.equal(twice.length, 1);
  assert.equal(twice[0].receiverName, "Maria");
  assert.equal(twice[0].deliveryOrder, "8080734183");
});
