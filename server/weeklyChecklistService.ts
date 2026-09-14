import crypto from "crypto";
import {
  DEFAULT_CHECKLIST_CONFIG,
  getChecklistWeek,
  findActiveVehicleBlock,
  isChecklistFinal,
  resolveOperationalDriver,
  type ChecklistAnexo,
  type ChecklistConfiguracao,
  type ChecklistItemTemplate,
  type ChecklistParticipante,
  type ChecklistResposta,
  type ChecklistVeiculo,
  type OperationalDriverResolution,
  type VeiculoBloqueio,
} from "../shared/weeklyChecklist.ts";
import {
  FileDatabase,
  type Manutencao,
  type Motorista,
  type Rota,
  type Unidade,
  type Usuario,
  type Veiculo,
} from "./database.ts";

export interface ChecklistDetail {
  checklist: ChecklistVeiculo;
  participantes: ChecklistParticipante[];
  respostas: ChecklistResposta[];
  anexos: ChecklistAnexo[];
  bloqueios: VeiculoBloqueio[];
  manutencoes: Manutencao[];
  reinspecoes: ChecklistVeiculo[];
}

export interface WeeklyFleetRow {
  veiculo: Veiculo;
  motorista?: Motorista;
  motoristaOrigem: OperationalDriverResolution["source"];
  motoristaMensagem: string;
  rota?: Rota;
  checklist?: ChecklistVeiculo;
  bloqueios: VeiculoBloqueio[];
  semana: ReturnType<typeof getChecklistWeek>;
}

export interface WeeklyFleetSummary {
  semana: ReturnType<typeof getChecklistWeek>;
  configuracao: ChecklistConfiguracao;
  rows: WeeklyFleetRow[];
  indicadores: {
    totalVeiculosAtivos: number;
    realizados: number;
    pendentes: number;
    naoConformes: number;
    conformes: number;
    bloqueados: number;
    conformidadePercentual: number;
    conclusaoPercentual: number;
  };
}

const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export function getChecklistConfiguration(unitId: string): ChecklistConfiguracao {
  const configurations = FileDatabase.get("checklist_configuracoes") || [];
  return configurations.find((configuration) => configuration.ativo && configuration.unidadeId === unitId)
    || configurations.find((configuration) => configuration.ativo && !configuration.unidadeId)
    || DEFAULT_CHECKLIST_CONFIG;
}

export function getChecklistTemplates(unitId: string, version?: string): ChecklistItemTemplate[] {
  const activeVersion = version || getChecklistConfiguration(unitId).versaoChecklistAtiva;
  const templates = (FileDatabase.get("checklist_item_templates") || [])
    .filter((item) => item.ativo && item.versaoChecklist === activeVersion && (!item.unidadeId || item.unidadeId === unitId))
    .sort((left, right) => left.ordem - right.ordem);

  const byCode = new Map<string, ChecklistItemTemplate>();
  templates.filter((item) => !item.unidadeId).forEach((item) => byCode.set(item.codigo, item));
  templates.filter((item) => item.unidadeId === unitId).forEach((item) => byCode.set(item.codigo, item));
  return Array.from(byCode.values()).sort((left, right) => left.ordem - right.ordem);
}

export function resolveChecklistDriver(vehicle: Veiculo, date: string): OperationalDriverResolution {
  return resolveOperationalDriver(
    vehicle,
    date,
    FileDatabase.get("rotas") as Rota[],
    FileDatabase.get("motoristas") as Motorista[],
  );
}

export function getActiveVehicleBlocks(vehicleId: string): VeiculoBloqueio[] {
  return (FileDatabase.get("veiculos_bloqueios") || []).filter(
    (block) => block.veiculoId === vehicleId && block.status === "ATIVO",
  );
}

export function getVehicleOperationBlock(vehicleId: string): {
  blocked: boolean;
  message?: string;
  checklist?: ChecklistVeiculo;
  block?: VeiculoBloqueio;
} {
  const block = findActiveVehicleBlock(FileDatabase.get("veiculos_bloqueios") || [], vehicleId);
  if (!block) return { blocked: false };
  const checklist = (FileDatabase.get("checklists_veiculos") || []).find((item) => item.id === block.checklistId);
  return {
    blocked: true,
    block,
    checklist,
    message: `Saída não permitida. O veículo possui uma não conformidade crítica aberta. Protocolo: ${checklist?.protocolo || "em emissão"}. Motivo: ${block.motivo}`,
  };
}

const buildResponseFromTemplate = (checklistId: string, item: ChecklistItemTemplate): ChecklistResposta => ({
  id: newId("chr"),
  checklistId,
  itemTemplateId: item.id,
  codigoSnapshot: item.codigo,
  categoriaSnapshot: item.categoria,
  descricaoSnapshot: item.descricao,
  ordemSnapshot: item.ordem,
  obrigatorioSnapshot: item.obrigatorio,
  criticidadeSnapshot: item.criticidade,
  permiteNASnapshot: item.permiteNA,
  exigeObservacaoSnapshot: item.exigeObservacaoNaoConforme,
  exigeFotoSnapshot: item.exigeFotoNaoConforme,
  exigeAcaoCorretivaSnapshot: item.exigeAcaoCorretivaNaoConforme,
  bloqueiaVeiculoSnapshot: item.bloqueiaVeiculo,
});

const buildResponseFromSnapshot = (checklistId: string, item: ChecklistResposta): ChecklistResposta => ({
  id: newId("chr"),
  checklistId,
  itemTemplateId: item.itemTemplateId,
  codigoSnapshot: item.codigoSnapshot,
  categoriaSnapshot: item.categoriaSnapshot,
  descricaoSnapshot: item.descricaoSnapshot,
  ordemSnapshot: item.ordemSnapshot,
  obrigatorioSnapshot: item.obrigatorioSnapshot,
  criticidadeSnapshot: item.criticidadeSnapshot,
  permiteNASnapshot: item.permiteNASnapshot,
  exigeObservacaoSnapshot: item.exigeObservacaoSnapshot,
  exigeFotoSnapshot: item.exigeFotoSnapshot,
  exigeAcaoCorretivaSnapshot: item.exigeAcaoCorretivaSnapshot,
  bloqueiaVeiculoSnapshot: item.bloqueiaVeiculoSnapshot,
});

export function createChecklist(params: {
  vehicle: Veiculo;
  user: Usuario;
  operationalDate: string;
  km?: number;
  original?: ChecklistVeiculo;
  reinspectionReason?: string;
}): ChecklistDetail {
  const { vehicle, user, operationalDate, original } = params;
  const config = getChecklistConfiguration(vehicle.unidadeId);
  const week = getChecklistWeek(operationalDate, config.diaInicialSemana);
  const resolution = resolveChecklistDriver(vehicle, operationalDate);
  const units = FileDatabase.get("unidades") as Unidade[];
  const unit = units.find((candidate) => candidate.id === vehicle.unidadeId);
  const checklistId = newId("chk");
  const now = new Date().toISOString();
  const users = FileDatabase.get("usuarios") as Usuario[];
  const driverUser = resolution.driver
    ? users.find((candidate) => candidate.status === "ativo" && candidate.tipo_usuario === "MOTORISTA" && candidate.motoristaId === resolution.driver?.id)
    : undefined;
  const helperIds = resolution.route?.ajudantesIds || [];
  const helpers = (FileDatabase.get("motoristas") as Motorista[]).filter((candidate) =>
    helperIds.includes(candidate.id) &&
    candidate.unidadeId === vehicle.unidadeId &&
    (candidate.tipo === "Ajudante Fixo" || candidate.tipo === "Ajudante Geral"),
  );
  const participants: ChecklistParticipante[] = [
    ...(resolution.driver ? [{
      id: newId("chp"),
      checklistId,
      pessoaId: resolution.driver.id,
      userId: driverUser?.id,
      tipoParticipante: "MOTORISTA" as const,
      nomeSnapshot: resolution.driver.nome,
      cpfSnapshot: resolution.driver.cpf,
      statusAssinatura: "PENDENTE" as const,
    }] : []),
    ...helpers.map((helper) => {
      const helperUser = users.find((candidate) =>
        candidate.status === "ativo" && candidate.tipo_usuario === "AJUDANTE" && candidate.ajudanteId === helper.id,
      );
      return {
        id: newId("chp"),
        checklistId,
        pessoaId: helper.id,
        userId: helperUser?.id,
        tipoParticipante: "AJUDANTE" as const,
        nomeSnapshot: helper.nome,
        cpfSnapshot: helper.cpf,
        statusAssinatura: "PENDENTE" as const,
      };
    }),
  ];

  const sourceResponses = original
    ? (FileDatabase.get("checklist_respostas") || []).filter((response) => response.checklistId === original.id)
    : [];
  const templates = original ? [] : getChecklistTemplates(vehicle.unidadeId, config.versaoChecklistAtiva);
  if (!original && templates.length === 0) {
    throw new Error("Nenhum item ativo foi configurado para a versão de checklist desta unidade.");
  }
  if (original && sourceResponses.length === 0) {
    throw new Error("O checklist original não possui itens preservados para reinspeção.");
  }

  const previousOdometers = [
    ...(FileDatabase.get("abastecimentos") || []).filter((item) => item.veiculoId === vehicle.id).map((item) => item.odometro),
    ...FileDatabase.get("manutencoes").filter((item) => item.veiculoId === vehicle.id).map((item) => item.quilometragemAtual || 0),
  ].filter((value) => Number.isFinite(value) && value > 0);
  const km = params.km ?? (previousOdometers.length ? Math.max(...previousOdometers) : undefined);
  const checklist: ChecklistVeiculo = {
    id: checklistId,
    veiculoId: vehicle.id,
    unidadeId: vehicle.unidadeId,
    motoristaId: resolution.driver?.id,
    usuarioMotoristaId: driverUser?.id,
    motoristaNomeSnapshot: resolution.driver?.nome,
    motoristaCpfSnapshot: resolution.driver?.cpf,
    ajudanteIdsSnapshot: helpers.map((helper) => helper.id),
    ajudanteNomesSnapshot: helpers.map((helper) => helper.nome),
    placaSnapshot: vehicle.placa,
    veiculoModeloSnapshot: vehicle.modelo,
    unidadeNomeSnapshot: unit?.nome,
    origemMotorista: resolution.source,
    dataChecklist: operationalDate,
    dataInicioSemana: week.start,
    dataFimSemana: week.end,
    ano: week.year,
    identificadorSemana: week.identifier,
    versaoChecklist: original?.versaoChecklist || config.versaoChecklistAtiva,
    rotaId: resolution.route?.id,
    dtId: resolution.route?.dt,
    rotaSnapshot: resolution.route ? `${resolution.route.dt || resolution.route.id} — ${resolution.route.status_viagem || resolution.route.status || "Ativa"}` : undefined,
    km,
    status: "PENDENTE",
    possuiNaoConformidade: false,
    possuiNaoConformidadeCritica: false,
    bloqueouVeiculo: false,
    responsavelId: user.id,
    responsavelNomeSnapshot: user.nome,
    checklistOriginalId: original?.id,
    numeroReinspecao: original
      ? (FileDatabase.get("checklists_veiculos") || []).filter((item) => item.checklistOriginalId === original.id).length + 1
      : undefined,
    observacaoReinspecao: params.reinspectionReason?.trim() || undefined,
    criadoEm: now,
    atualizadoEm: now,
  };

  FileDatabase.add("checklists_veiculos", checklist, user.email);
  FileDatabase.set("checklist_participantes", [
    ...(FileDatabase.get("checklist_participantes") || []),
    ...participants,
  ]);
  const responses = original
    ? sourceResponses.map((item) => buildResponseFromSnapshot(checklistId, item))
    : templates.map((item) => buildResponseFromTemplate(checklistId, item));
  const allResponses = FileDatabase.get("checklist_respostas") || [];
  FileDatabase.set("checklist_respostas", [...allResponses, ...responses]);
  return getChecklistDetail(checklistId)!;
}

export function getChecklistDetail(checklistId: string): ChecklistDetail | null {
  const checklist = (FileDatabase.get("checklists_veiculos") || []).find((item) => item.id === checklistId);
  if (!checklist) return null;
  const storedParticipants = (FileDatabase.get("checklist_participantes") || [])
    .filter((participant) => participant.checklistId === checklistId);
  const users = FileDatabase.get("usuarios") as Usuario[];
  const people = FileDatabase.get("motoristas") as Motorista[];
  const legacyParticipants: ChecklistParticipante[] = storedParticipants.length > 0 ? [] : [
    ...(checklist.motoristaId ? [{
      id: `chp-legacy-motorista-${checklist.id}`,
      checklistId: checklist.id,
      pessoaId: checklist.motoristaId,
      userId: checklist.usuarioMotoristaId || (checklist.assinaturaUsuarioTipoSnapshot === "MOTORISTA" ? checklist.assinaturaUserId : undefined),
      tipoParticipante: "MOTORISTA" as const,
      nomeSnapshot: checklist.motoristaNomeSnapshot || "Motorista não identificado",
      cpfSnapshot: checklist.motoristaCpfSnapshot,
      assinaturaAnexoId: checklist.assinaturaUsuarioTipoSnapshot === "MOTORISTA" ? checklist.assinaturaAnexoId : undefined,
      dataAssinatura: checklist.assinaturaUsuarioTipoSnapshot === "MOTORISTA" ? checklist.dataAssinatura : undefined,
      statusAssinatura: checklist.assinaturaUsuarioTipoSnapshot === "MOTORISTA" && checklist.dataAssinatura ? "ASSINADO" as const : "PENDENTE" as const,
    }] : []),
    ...(checklist.ajudanteIdsSnapshot || []).map((helperId, index) => {
      const helper = people.find((candidate) => candidate.id === helperId);
      const helperUser = users.find((candidate) =>
        candidate.id === checklist.assinaturaUserId && candidate.tipo_usuario === "AJUDANTE" && candidate.ajudanteId === helperId,
      );
      const signed = checklist.assinaturaUsuarioTipoSnapshot === "AJUDANTE" && Boolean(helperUser);
      return {
        id: `chp-legacy-ajudante-${checklist.id}-${helperId}`,
        checklistId: checklist.id,
        pessoaId: helperId,
        userId: signed ? helperUser?.id : undefined,
        tipoParticipante: "AJUDANTE" as const,
        nomeSnapshot: checklist.ajudanteNomesSnapshot?.[index] || helper?.nome || "Ajudante não identificado",
        cpfSnapshot: helper?.cpf,
        assinaturaAnexoId: signed ? checklist.assinaturaAnexoId : undefined,
        dataAssinatura: signed ? checklist.dataAssinatura : undefined,
        statusAssinatura: signed && checklist.dataAssinatura ? "ASSINADO" as const : "PENDENTE" as const,
      };
    }),
  ];
  return {
    checklist,
    participantes: storedParticipants.length > 0 ? storedParticipants : legacyParticipants,
    respostas: (FileDatabase.get("checklist_respostas") || [])
      .filter((response) => response.checklistId === checklistId)
      .sort((left, right) => left.ordemSnapshot - right.ordemSnapshot),
    anexos: (FileDatabase.get("checklist_anexos") || []).filter((attachment) => attachment.checklistId === checklistId),
    bloqueios: (FileDatabase.get("veiculos_bloqueios") || []).filter((block) => block.checklistId === checklistId),
    manutencoes: FileDatabase.get("manutencoes").filter((maintenance) => maintenance.checklistId === checklistId),
    reinspecoes: (FileDatabase.get("checklists_veiculos") || []).filter((item) => item.checklistOriginalId === checklistId),
  };
}

export function generateChecklistProtocol(year: number): string {
  const counters = FileDatabase.get("checklist_protocolos") || [];
  const checklists = FileDatabase.get("checklists_veiculos") || [];
  const counter = counters.find((item) => item.ano === year);
  const usedNumbers = checklists
    .map((item) => item.protocolo?.match(new RegExp(`^CHK-${year}-(\\d+)(?:-[A-F0-9]{8})?$`))?.[1])
    .filter((value): value is string => Boolean(value))
    .map(Number);
  let next = Math.max(counter?.ultimoNumero || 0, ...usedNumbers, 0) + 1;
  const collisionToken = () => crypto.randomBytes(4).toString("hex").toUpperCase();
  let protocol = `CHK-${year}-${String(next).padStart(6, "0")}-${collisionToken()}`;
  while (checklists.some((item) => item.protocolo === protocol)) {
    next += 1;
    protocol = `CHK-${year}-${String(next).padStart(6, "0")}-${collisionToken()}`;
  }
  const updatedCounter = { id: `chk-protocol-${year}`, ano: year, ultimoNumero: next, updatedAt: new Date().toISOString() };
  if (counter) {
    FileDatabase.update("checklist_protocolos", counter.id, updatedCounter, "Sistema");
  } else {
    FileDatabase.add("checklist_protocolos", updatedCounter, "Sistema");
  }
  return protocol;
}

export function getWeeklyFleetSummary(unitId: string, referenceDate: string): WeeklyFleetSummary {
  const config = getChecklistConfiguration(unitId);
  const week = getChecklistWeek(referenceDate, config.diaInicialSemana);
  const vehicles = FileDatabase.get("veiculos").filter((vehicle) =>
    vehicle.status !== "Bloqueado" && (unitId === "Todas" || vehicle.unidadeId === unitId),
  );
  const checklists = FileDatabase.get("checklists_veiculos") || [];
  const rows: WeeklyFleetRow[] = vehicles.map((vehicle) => {
    const vehicleConfig = unitId === "Todas" ? getChecklistConfiguration(vehicle.unidadeId) : config;
    const vehicleWeek = getChecklistWeek(referenceDate, vehicleConfig.diaInicialSemana);
    const resolution = resolveChecklistDriver(vehicle, referenceDate);
    const checklist = checklists
      .filter((candidate) =>
        candidate.veiculoId === vehicle.id &&
        candidate.unidadeId === vehicle.unidadeId &&
        candidate.identificadorSemana === vehicleWeek.identifier &&
        !candidate.checklistOriginalId &&
        candidate.status !== "CANCELADO",
      )
      .sort((left, right) => right.criadoEm.localeCompare(left.criadoEm))[0];
    return {
      veiculo: vehicle,
      motorista: resolution.driver as Motorista | undefined,
      motoristaOrigem: resolution.source,
      motoristaMensagem: resolution.message,
      rota: resolution.route as Rota | undefined,
      checklist,
      bloqueios: getActiveVehicleBlocks(vehicle.id),
      semana: vehicleWeek,
    };
  });
  const realized = rows.filter((row) => row.checklist && isChecklistFinal(row.checklist.status)).length;
  const conforming = rows.filter((row) => row.checklist?.resultado === "CONFORME").length;
  const nonConforming = rows.filter((row) => row.checklist?.resultado && row.checklist.resultado !== "CONFORME").length;
  return {
    semana: week,
    configuracao: config,
    rows,
    indicadores: {
      totalVeiculosAtivos: rows.length,
      realizados: realized,
      pendentes: Math.max(0, rows.length - realized),
      naoConformes: nonConforming,
      conformes: conforming,
      bloqueados: rows.filter((row) => row.bloqueios.length > 0).length,
      conformidadePercentual: realized > 0 ? Math.round((conforming / realized) * 100) : 0,
      conclusaoPercentual: rows.length > 0 ? Math.round((realized / rows.length) * 100) : 0,
    },
  };
}

export function replaceChecklistAttachment(params: {
  checklistId: string;
  responseId?: string;
  participantId?: string;
  type: ChecklistAnexo["tipo"];
  dataUrl: string;
  mimeType: string;
  name: string;
  user: Usuario;
  unitId: string;
}): ChecklistAnexo {
  const attachments = FileDatabase.get("checklist_anexos") || [];
  const remaining = attachments.filter((attachment) => !(
    attachment.checklistId === params.checklistId &&
    attachment.respostaId === params.responseId &&
    attachment.participanteId === params.participantId &&
    attachment.tipo === params.type
  ));
  const attachment: ChecklistAnexo = {
    id: newId("cha"),
    checklistId: params.checklistId,
    respostaId: params.responseId,
    participanteId: params.participantId,
    tipo: params.type,
    nome: params.name,
    mimeType: params.mimeType,
    dataUrl: params.dataUrl,
    criadoEm: new Date().toISOString(),
    criadoPor: params.user.id,
    unidadeId: params.unitId,
  };
  FileDatabase.set("checklist_anexos", [...remaining, attachment]);
  return attachment;
}
