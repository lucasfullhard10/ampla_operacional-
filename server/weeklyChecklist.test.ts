import assert from "node:assert/strict";
import test from "node:test";
import type { DatabaseSchema } from "./database.ts";
import { FileDatabase } from "./database.ts";
import {
  DEFAULT_CHECKLIST_CONFIG,
  canDriverAccessChecklist,
  findActiveVehicleBlock,
  getChecklistResult,
  getChecklistWeek,
  resolveOperationalDriver,
  validateChecklistResponses,
  validateVehicleRelease,
  type ChecklistResposta,
  type ChecklistVeiculo,
  type VeiculoBloqueio,
} from "../shared/weeklyChecklist.ts";

const drivers = [
  { id: "mot-joao", nome: "João", cpf: "111", unidadeId: "un-1" },
  { id: "mot-carlos", nome: "Carlos", cpf: "222", unidadeId: "un-1" },
  { id: "mot-renato", nome: "Renato", cpf: "333", unidadeId: "un-1" },
];
const vehicle = { id: "vei-1", unidadeId: "un-1", motoristaId: "mot-carlos" };

const response = (changes: Partial<ChecklistResposta> = {}): ChecklistResposta => ({
  id: "res-1",
  checklistId: "chk-1",
  itemTemplateId: "tpl-1",
  codigoSnapshot: "FRE-01",
  categoriaSnapshot: "Freios",
  descricaoSnapshot: "Freios em condição segura",
  ordemSnapshot: 1,
  obrigatorioSnapshot: true,
  criticidadeSnapshot: "CRITICA",
  permiteNASnapshot: false,
  exigeObservacaoSnapshot: true,
  exigeFotoSnapshot: true,
  exigeAcaoCorretivaSnapshot: true,
  bloqueiaVeiculoSnapshot: true,
  ...changes,
});

const checklist = (changes: Partial<ChecklistVeiculo> = {}): ChecklistVeiculo => ({
  id: "chk-1",
  veiculoId: "vei-1",
  unidadeId: "un-1",
  motoristaId: "mot-renato",
  usuarioMotoristaId: "usr-renato",
  motoristaNomeSnapshot: "Renato",
  motoristaCpfSnapshot: "333",
  placaSnapshot: "ABC1D23",
  origemMotorista: "VINCULO_OFICIAL",
  dataChecklist: "2026-08-31",
  dataInicioSemana: "2026-08-31",
  dataFimSemana: "2026-09-06",
  ano: 2026,
  identificadorSemana: "2026-08-31_2026-09-06",
  versaoChecklist: "v1",
  status: "PENDENTE",
  possuiNaoConformidade: false,
  possuiNaoConformidadeCritica: false,
  bloqueouVeiculo: false,
  responsavelId: "usr-renato",
  responsavelNomeSnapshot: "Renato",
  criadoEm: "2026-08-31T10:00:00.000Z",
  atualizadoEm: "2026-08-31T10:00:00.000Z",
  ...changes,
});

test("rota ativa do dia tem prioridade sobre o vínculo permanente", () => {
  const resolution = resolveOperationalDriver(vehicle, "2026-08-31", [{
    id: "DT-1", dt: "1", data: "2026-08-31", veiculoId: "vei-1", motoristaId: "mot-joao", unidadeId: "un-1", status: "Em rota",
  }], drivers);
  assert.equal(resolution.driver?.id, "mot-joao");
  assert.equal(resolution.source, "ROTA_ATIVA");
  assert.equal(vehicle.motoristaId, "mot-carlos");
});

test("sem rota ativa usa exclusivamente motoristaId oficial", () => {
  const resolution = resolveOperationalDriver(vehicle, "2026-08-31", [{
    id: "DT-ANTIGA", data: "2026-08-30", veiculoId: "vei-1", motoristaId: "mot-joao", unidadeId: "un-1", status: "Finalizada",
  }], drivers);
  assert.equal(resolution.driver?.id, "mot-carlos");
  assert.equal(resolution.source, "VINCULO_OFICIAL");
});

test("sem rota e sem vínculo não reutiliza motorista histórico", () => {
  const resolution = resolveOperationalDriver({ ...vehicle, motoristaId: undefined }, "2026-08-31", [{
    id: "DT-ANTIGA", data: "2026-08-20", veiculoId: "vei-1", motoristaId: "mot-joao", unidadeId: "un-1", status: "Finalizada",
  }], drivers);
  assert.equal(resolution.driver, undefined);
  assert.equal(resolution.message, "Nenhum motorista vinculado a este veículo.");
});

test("item crítico bloqueador não conforme bloqueia e exige evidências", () => {
  const incomplete = response({ resposta: "NAO_CONFORME" });
  assert.equal(getChecklistResult([incomplete]), "BLOQUEADO");
  assert.equal(validateChecklistResponses([incomplete]).length, 3);
  assert.deepEqual(validateChecklistResponses([response({ resposta: "NAO_CONFORME", observacao: "Falha", acaoCorretiva: "Reparar", fotoAnexoId: "foto-1" })]), []);
});

test("bloqueio ativo impede nova operação e bloco liberado não impede", () => {
  const active: VeiculoBloqueio = { id: "b1", veiculoId: "vei-1", checklistId: "chk-1", itemId: "tpl-1", motivo: "Freios", dataHoraBloqueio: "2026-08-31T12:00:00Z", unidadeId: "un-1", status: "ATIVO", usuarioResponsavel: "usr-1" };
  assert.equal(findActiveVehicleBlock([active], "vei-1")?.id, "b1");
  assert.equal(findActiveVehicleBlock([{ ...active, status: "LIBERADO" }], "vei-1"), undefined);
});

test("motorista não pode liberar e supervisor só libera após correção e reinspeção", () => {
  assert.ok(validateVehicleRelease({ actorIsDriver: true, maintenanceResolved: true, reinspectionFinal: true, reinspectionConforming: true, justification: "Corrigido" }).length > 0);
  assert.deepEqual(validateVehicleRelease({ actorIsDriver: false, maintenanceResolved: true, reinspectionFinal: true, reinspectionConforming: true, justification: "Correção validada" }), []);
  assert.ok(validateVehicleRelease({ actorIsDriver: false, maintenanceResolved: false, reinspectionFinal: true, reinspectionConforming: true, justification: "Correção validada" }).length > 0);
});

test("snapshot histórico não muda quando o veículo troca de motorista", () => {
  const oldChecklist = checklist();
  const currentVehicle = { ...vehicle, motoristaId: "mot-joao" };
  assert.equal(oldChecklist.motoristaNomeSnapshot, "Renato");
  assert.equal(oldChecklist.motoristaId, "mot-renato");
  assert.equal(currentVehicle.motoristaId, "mot-joao");
});

test("motorista A não acessa checklist do motorista B por ID", () => {
  const target = checklist();
  assert.equal(canDriverAccessChecklist("mot-joao", "usr-joao", target), false);
  assert.equal(canDriverAccessChecklist("mot-renato", "usr-renato", target), true);
  assert.equal(canDriverAccessChecklist("mot-renato", "usr-outro", target), false);
});

test("sem checklist no prazo cria alerta e checklist concluído remove o alerta", () => {
  const week = getChecklistWeek("2026-08-31", 1);
  const database = {
    motoristas: [],
    veiculos: [{ id: "vei-1", placa: "ABC1D23", modelo: "Teste", unidadeId: "un-1", status: "Liberado", licenciamentoVencimento: "2027-01-01", seguroVencimento: "2027-01-01" }],
    manutencoes: [],
    alertas: [],
    checklist_configuracoes: [{ ...DEFAULT_CHECKLIST_CONFIG, unidadeId: "un-1", prazoHorario: "00:00" }],
    checklists_veiculos: [],
    veiculos_bloqueios: [],
  } as unknown as DatabaseSchema;
  FileDatabase.recalculateAlerts(database, new Date("2026-09-01T15:00:00"));
  assert.equal(database.alertas.some((alert) => alert.tipo === "Checklist semanal atrasado"), true);
  database.checklists_veiculos = [checklist({ status: "CONFORME", resultado: "CONFORME", protocolo: "CHK-2026-000001", identificadorSemana: week.identifier })];
  FileDatabase.recalculateAlerts(database, new Date("2026-09-01T15:00:00"));
  assert.equal(database.alertas.some((alert) => alert.tipo.includes("Checklist semanal")), false);
});

