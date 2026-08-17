import assert from "node:assert/strict";
import test from "node:test";
import { FileDatabase } from "./database.ts";

const referenceDate = new Date("2026-08-16T15:00:00.000Z");

function createDatabase() {
  return {
    motoristas: [
      {
        id: "mot-test",
        nome: "Motorista Teste",
        cpf: "00000000000",
        telefone: "",
        unidadeId: "un-go",
        tipo: "Motorista",
        cnhVencimento: "2026-09-15",
        asoVencimento: "2026-09-05",
        integracaoVencimento: "2026-09-05",
        toxicologicoVencimento: "2026-09-25",
        moppVencimento: "2026-09-26",
        integracao: "Feito",
        pesquisa: "Feito",
        aso: "Feito",
        fichaEpi: "Feito",
        statusFinal: "LIBERADO",
      },
    ],
    veiculos: [
      {
        id: "vei-test",
        placa: "ABC1D23",
        modelo: "Teste",
        unidadeId: "un-go",
        licenciamentoVencimento: "2027-08-16",
        seguroVencimento: "2027-08-16",
        anttVencimento: "2026-08-11",
      },
    ],
    manutencoes: [],
    alertas: [],
  } as any;
}

test("motor global inclui todos os documentos na janela de 40 dias", () => {
  const database = createDatabase();
  FileDatabase.recalculateAlerts(database, referenceDate);

  const documentTypes = new Set(database.alertas.map((alert: any) => alert.tipo));
  assert.ok(documentTypes.has("CNH"));
  assert.ok(documentTypes.has("ASO"));
  assert.ok(documentTypes.has("Integração"));
  assert.ok(documentTypes.has("Toxicológico"));
  assert.ok(!documentTypes.has("MOPP"));
  assert.ok(documentTypes.has("ANTT"));
  assert.equal(database.alertas.find((alert: any) => alert.tipo === "ANTT")?.classificacao, "VENCIDO");
});

test("renovação remove alerta obsoleto e não duplica identidades", () => {
  const database = createDatabase();
  FileDatabase.recalculateAlerts(database, referenceDate);
  const originalCount = database.alertas.length;

  database.motoristas[0].asoVencimento = "2027-09-05";
  FileDatabase.recalculateAlerts(database, referenceDate);

  assert.equal(database.alertas.some((alert: any) => alert.tipo === "ASO"), false);
  assert.equal(database.alertas.length, originalCount - 1);
  assert.equal(new Set(database.alertas.map((alert: any) => alert.id)).size, database.alertas.length);
});
