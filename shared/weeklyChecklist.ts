export const CHECKLIST_MODULE_KEY = "checklist-semanal";

export type ChecklistCriticality = "NORMAL" | "CRITICA";
export type ChecklistAnswerValue = "CONFORME" | "NAO_CONFORME" | "NAO_APLICA";
export type ChecklistStatus =
  | "PENDENTE"
  | "EM_ANDAMENTO"
  | "AGUARDANDO_ASSINATURA_MOTORISTA"
  | "AGUARDANDO_ASSINATURA_AJUDANTE"
  | "CONFORME"
  | "COM_PENDENCIAS"
  | "BLOQUEADO"
  | "AGUARDANDO_MANUTENCAO"
  | "AGUARDANDO_REINSPECAO"
  | "LIBERADO"
  | "CANCELADO";
export type ChecklistResult = "CONFORME" | "COM_PENDENCIAS" | "BLOQUEADO";
export type ChecklistFrequency = "SEMANAL";
export type VehicleBlockStatus = "ATIVO" | "LIBERADO" | "CANCELADO";
export type ChecklistParticipantType = "MOTORISTA" | "AJUDANTE" | "INSPETOR" | "OUTRO";
export type ChecklistSignatureStatus = "PENDENTE" | "ASSINADO";

export const CHECKLIST_SIGNATURE_DECLARATION =
  "Declaro que conferi as informações registradas neste checklist e confirmo que correspondem às condições observadas no veículo no momento da inspeção.";

export interface ChecklistItemTemplate {
  id: string;
  codigo: string;
  categoria: string;
  descricao: string;
  ordem: number;
  ativo: boolean;
  obrigatorio: boolean;
  criticidade: ChecklistCriticality;
  permiteNA: boolean;
  exigeObservacaoNaoConforme: boolean;
  exigeFotoNaoConforme: boolean;
  exigeAcaoCorretivaNaoConforme: boolean;
  bloqueiaVeiculo: boolean;
  unidadeId?: string;
  versaoChecklist: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistResposta {
  id: string;
  checklistId: string;
  itemTemplateId: string;
  codigoSnapshot: string;
  categoriaSnapshot: string;
  descricaoSnapshot: string;
  ordemSnapshot: number;
  obrigatorioSnapshot: boolean;
  criticidadeSnapshot: ChecklistCriticality;
  permiteNASnapshot: boolean;
  exigeObservacaoSnapshot: boolean;
  exigeFotoSnapshot: boolean;
  exigeAcaoCorretivaSnapshot: boolean;
  bloqueiaVeiculoSnapshot: boolean;
  resposta?: ChecklistAnswerValue;
  observacao?: string;
  acaoCorretiva?: string;
  fotoAnexoId?: string;
  manutencaoId?: string;
  respondidoPor?: string;
  respondidoEm?: string;
}

export type ChecklistVehicleSide = "DIREITA" | "ESQUERDA" | "FRENTE" | "TRASEIRA";
export const CHECKLIST_VEHICLE_SIDES: ChecklistVehicleSide[] = ["DIREITA", "ESQUERDA", "FRENTE", "TRASEIRA"];
export type ChecklistAttachmentType = "FOTO_NAO_CONFORMIDADE" | "ASSINATURA" | "FOTO_REINSPECAO" | "FOTO_VEICULO" | "FOTO_OBSERVACAO";

export interface ChecklistObservacao {
  id: string;
  texto: string;
  autorId: string;
  autorNome: string;
  criadoEm: string;
  fotoAnexoId?: string;
}

export interface ChecklistAnexo {
  id: string;
  checklistId: string;
  respostaId?: string;
  participanteId?: string;
  posicaoVeiculo?: ChecklistVehicleSide;
  observacaoId?: string;
  tipo: ChecklistAttachmentType;
  nome: string;
  mimeType: string;
  dataUrl?: string;
  criadoEm: string;
  criadoPor: string;
  unidadeId: string;
}

export interface ChecklistParticipante {
  id: string;
  checklistId: string;
  pessoaId?: string;
  userId?: string;
  tipoParticipante: ChecklistParticipantType;
  nomeSnapshot: string;
  cpfSnapshot?: string;
  assinaturaAnexoId?: string;
  dataAssinatura?: string;
  statusAssinatura: ChecklistSignatureStatus;
  declaracaoAceita?: boolean;
  assinaturaIp?: string;
  assinaturaUserAgent?: string;
}

export interface ChecklistVeiculo {
  id: string;
  protocolo?: string;
  veiculoId: string;
  unidadeId: string;
  motoristaId?: string;
  usuarioMotoristaId?: string;
  motoristaNomeSnapshot?: string;
  motoristaCpfSnapshot?: string;
  ajudanteIdsSnapshot?: string[];
  ajudanteNomesSnapshot?: string[];
  placaSnapshot: string;
  veiculoModeloSnapshot?: string;
  unidadeNomeSnapshot?: string;
  origemMotorista: "ROTA_ATIVA" | "VINCULO_OFICIAL" | "SEM_MOTORISTA";
  dataChecklist: string;
  dataInicioSemana: string;
  dataFimSemana: string;
  ano: number;
  identificadorSemana: string;
  versaoChecklist: string;
  rotaId?: string;
  dtId?: string;
  rotaSnapshot?: string;
  km?: number;
  status: ChecklistStatus;
  resultado?: ChecklistResult;
  possuiNaoConformidade: boolean;
  possuiNaoConformidadeCritica: boolean;
  bloqueouVeiculo: boolean;
  assinaturaAnexoId?: string;
  declaracaoAceita?: boolean;
  dataAssinatura?: string;
  assinaturaMotoristaNomeSnapshot?: string;
  assinaturaMotoristaCpfSnapshot?: string;
  assinaturaUsuarioNomeSnapshot?: string;
  assinaturaUsuarioTipoSnapshot?: "MOTORISTA" | "AJUDANTE" | "ADMINISTRATIVO";
  assinaturaUserId?: string;
  assinaturaIp?: string;
  assinaturaUserAgent?: string;
  responsavelId: string;
  responsavelNomeSnapshot: string;
  pdfUrl?: string;
  documentId?: string;
  checklistOriginalId?: string;
  numeroReinspecao?: number;
  observacaoReinspecao?: string;
  observacoes?: ChecklistObservacao[];
  criadoEm: string;
  atualizadoEm: string;
  finalizadoEm?: string;
  inspecaoConcluidaEm?: string;
  canceladoEm?: string;
  canceladoPor?: string;
  motivoCancelamento?: string;
}

export interface VeiculoBloqueio {
  id: string;
  veiculoId: string;
  checklistId: string;
  itemId: string;
  motivo: string;
  dataHoraBloqueio: string;
  unidadeId: string;
  status: VehicleBlockStatus;
  usuarioResponsavel: string;
  liberadoEm?: string;
  liberadoPor?: string;
  justificativaLiberacao?: string;
  manutencaoId?: string;
  reinspecaoId?: string;
}

export interface ChecklistConfiguracao {
  id: string;
  unidadeId?: string;
  diaInicialSemana: number;
  prazoDiaSemana: number;
  prazoHorario: string;
  toleranciaMinutos: number;
  frequencia: ChecklistFrequency;
  versaoChecklistAtiva: string;
  ativo: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface ChecklistProtocolCounter {
  id: string;
  ano: number;
  ultimoNumero: number;
  updatedAt: string;
}

export interface ChecklistWeekPeriod {
  start: string;
  end: string;
  year: number;
  identifier: string;
}

export interface OperationalVehicle {
  id: string;
  motoristaId?: string;
  unidadeId: string;
}

export interface OperationalDriver {
  id: string;
  nome: string;
  cpf?: string;
  unidadeId: string;
}

export interface OperationalRoute {
  id: string;
  dt?: string;
  data: string;
  veiculoId: string;
  motoristaId: string;
  ajudantesIds?: string[];
  unidadeId: string;
  status?: string;
  status_viagem?: string;
}

export interface OperationalDriverResolution {
  driver?: OperationalDriver;
  source: ChecklistVeiculo["origemMotorista"];
  route?: OperationalRoute;
  message: string;
}

export const DEFAULT_CHECKLIST_CONFIG: ChecklistConfiguracao = {
  id: "checklist-config-global",
  diaInicialSemana: 1,
  prazoDiaSemana: 1,
  prazoHorario: "12:00",
  toleranciaMinutos: 0,
  frequencia: "SEMANAL",
  versaoChecklistAtiva: "AMPLA-CONFIGURAVEL-v1",
  ativo: true,
  updatedAt: "2026-08-31T00:00:00.000Z",
  updatedBy: "Sistema",
};

// Modelo operacional inicial e editável. Ele NÃO representa nem afirma ser o
// checklist oficial da Heineken; a operação deve substituir/validar os itens
// quando receber a versão oficial controlada.
const INITIAL_TEMPLATE_DATE = "2026-08-31T00:00:00.000Z";
const template = (
  id: string,
  codigo: string,
  categoria: string,
  descricao: string,
  ordem: number,
  options: Partial<Pick<
    ChecklistItemTemplate,
    "criticidade" | "permiteNA" | "exigeObservacaoNaoConforme" | "exigeFotoNaoConforme" |
    "exigeAcaoCorretivaNaoConforme" | "bloqueiaVeiculo"
  >> = {},
): ChecklistItemTemplate => ({
  id,
  codigo,
  categoria,
  descricao,
  ordem,
  ativo: true,
  obrigatorio: true,
  criticidade: options.criticidade || "NORMAL",
  permiteNA: options.permiteNA ?? false,
  exigeObservacaoNaoConforme: options.exigeObservacaoNaoConforme ?? true,
  exigeFotoNaoConforme: options.exigeFotoNaoConforme ?? false,
  exigeAcaoCorretivaNaoConforme: options.exigeAcaoCorretivaNaoConforme ?? true,
  bloqueiaVeiculo: options.bloqueiaVeiculo ?? false,
  versaoChecklist: DEFAULT_CHECKLIST_CONFIG.versaoChecklistAtiva,
  createdAt: INITIAL_TEMPLATE_DATE,
  updatedAt: INITIAL_TEMPLATE_DATE,
});

const blockingOptions = {
  criticidade: "CRITICA" as const,
  exigeFotoNaoConforme: true,
  bloqueiaVeiculo: true,
};

export const DEFAULT_CHECKLIST_TEMPLATES: ChecklistItemTemplate[] = [
  template("chk-tpl-doc", "DOC-01", "Documentação", "Documentos obrigatórios do veículo disponíveis e válidos", 10),
  template("chk-tpl-pneus", "PNR-01", "Pneus e rodas", "Pneus e rodas sem condição insegura aparente", 20, blockingOptions),
  template("chk-tpl-luzes", "ILU-01", "Iluminação", "Faróis, lanternas e luzes de sinalização funcionando", 30, blockingOptions),
  template("chk-tpl-freios", "FRE-01", "Freios", "Sistema de freios sem indício de falha", 40, blockingOptions),
  template("chk-tpl-parabrisa", "VIS-01", "Para-brisa", "Para-brisa e visibilidade em condição segura", 50),
  template("chk-tpl-limpadores", "VIS-02", "Limpadores", "Limpadores e lavador do para-brisa funcionando", 60),
  template("chk-tpl-retrovisores", "VIS-03", "Retrovisores", "Retrovisores íntegros e ajustáveis", 70),
  template("chk-tpl-cinto", "SEG-01", "Segurança", "Cinto de segurança em condição de uso", 80, blockingOptions),
  template("chk-tpl-equipamentos", "SEG-02", "Extintor/equipamentos", "Equipamentos obrigatórios presentes e em condição de uso", 90, blockingOptions),
  template("chk-tpl-vazamentos", "MEC-01", "Vazamentos", "Sem vazamento aparente de combustível, óleo ou fluido", 100, blockingOptions),
  template("chk-tpl-painel", "MEC-02", "Painel", "Sem alerta crítico ativo no painel", 110, blockingOptions),
  template("chk-tpl-buzina", "SEG-03", "Buzina", "Buzina funcionando", 120),
  template("chk-tpl-conservacao", "CON-01", "Conservação", "Cabine e carroceria em condição operacional", 130, { permiteNA: true }),
  template("chk-tpl-limpeza", "CON-02", "Limpeza", "Veículo em condição adequada de limpeza", 140, { permiteNA: true }),
];

const pad = (value: number) => String(value).padStart(2, "0");

export const formatLocalIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const parseLocalIsoDate = (value: string): Date => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Data operacional inválida: ${value}`);
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
  if (formatLocalIsoDate(parsed) !== value) throw new Error(`Data operacional inválida: ${value}`);
  return parsed;
};

export function getChecklistWeek(reference: Date | string, weekStartsOn = 1): ChecklistWeekPeriod {
  if (!Number.isInteger(weekStartsOn) || weekStartsOn < 0 || weekStartsOn > 6) {
    throw new Error("O dia inicial da semana deve estar entre 0 e 6.");
  }
  const date = typeof reference === "string" ? parseLocalIsoDate(reference) : new Date(reference);
  date.setHours(12, 0, 0, 0);
  const diff = (date.getDay() - weekStartsOn + 7) % 7;
  const start = new Date(date);
  start.setDate(start.getDate() - diff);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startIso = formatLocalIsoDate(start);
  const endIso = formatLocalIsoDate(end);
  return {
    start: startIso,
    end: endIso,
    year: start.getFullYear(),
    identifier: `${startIso}_${endIso}`,
  };
}

export function getChecklistDeadline(period: ChecklistWeekPeriod, config: ChecklistConfiguracao): Date {
  const start = parseLocalIsoDate(period.start);
  const offset = (config.prazoDiaSemana - config.diaInicialSemana + 7) % 7;
  start.setDate(start.getDate() + offset);
  const [hours, minutes] = config.prazoHorario.split(":").map(Number);
  start.setHours(hours || 0, minutes || 0, 0, 0);
  start.setMinutes(start.getMinutes() + Math.max(0, config.toleranciaMinutos || 0));
  return start;
}

const normalizeStatus = (value?: string) =>
  (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

export function isRouteOperationallyActive(route: OperationalRoute, operationalDate: string): boolean {
  if (route.data !== operationalDate) return false;
  const status = normalizeStatus(route.status_viagem || route.status);
  return !["finalizada", "cancelada", "veiculo quebrado", "retorno base"].includes(status);
}

const routePriority = (route: OperationalRoute): number => {
  const status = normalizeStatus(route.status_viagem || route.status);
  if (status === "em rota") return 4;
  if (status === "em descarga" || status === "ag.descarga" || status === "aguardando descarga") return 3;
  if (status === "em carregamento") return 2;
  return 1;
};

export function resolveOperationalDriver(
  vehicle: OperationalVehicle,
  operationalDate: string,
  routes: OperationalRoute[],
  drivers: OperationalDriver[],
): OperationalDriverResolution {
  const activeRoute = routes
    .filter((route) =>
      route.veiculoId === vehicle.id &&
      route.unidadeId === vehicle.unidadeId &&
      isRouteOperationallyActive(route, operationalDate),
    )
    .sort((left, right) => routePriority(right) - routePriority(left) || left.id.localeCompare(right.id))[0];

  if (activeRoute) {
    const routeDriver = drivers.find((driver) =>
      driver.id === activeRoute.motoristaId && driver.unidadeId === vehicle.unidadeId,
    );
    if (routeDriver) {
      return {
        driver: routeDriver,
        source: "ROTA_ATIVA",
        route: activeRoute,
        message: routeDriver.nome,
      };
    }
    return {
      source: "SEM_MOTORISTA",
      route: activeRoute,
      message: "A operação ativa aponta para um motorista inválido. Procure um administrador.",
    };
  }

  if (vehicle.motoristaId) {
    const linkedDriver = drivers.find((driver) =>
      driver.id === vehicle.motoristaId && driver.unidadeId === vehicle.unidadeId,
    );
    if (linkedDriver) {
      return { driver: linkedDriver, source: "VINCULO_OFICIAL", message: linkedDriver.nome };
    }
  }

  return {
    source: "SEM_MOTORISTA",
    message: "Nenhum motorista vinculado a este veículo.",
  };
}

export function isChecklistFinal(status: ChecklistStatus): boolean {
  return [
    "CONFORME",
    "COM_PENDENCIAS",
    "BLOQUEADO",
    "AGUARDANDO_MANUTENCAO",
    "AGUARDANDO_REINSPECAO",
    "LIBERADO",
    "CANCELADO",
  ].includes(status);
}

export function getChecklistStatusAfterSignatures(
  result: ChecklistResult,
  participants: ChecklistParticipante[],
): ChecklistStatus {
  const driver = participants.find((participant) => participant.tipoParticipante === "MOTORISTA");
  if (driver && driver.statusAssinatura !== "ASSINADO") return "AGUARDANDO_ASSINATURA_MOTORISTA";
  const pendingHelper = participants.some((participant) =>
    participant.tipoParticipante === "AJUDANTE" && participant.statusAssinatura !== "ASSINADO",
  );
  return pendingHelper ? "AGUARDANDO_ASSINATURA_AJUDANTE" : result;
}

export function canFieldUserAccessParticipants(input: {
  userId: string;
  pessoaId?: string;
  type: "MOTORISTA" | "AJUDANTE";
  participants: ChecklistParticipante[];
}): boolean {
  if (!input.pessoaId) return false;
  return input.participants.some((participant) =>
    participant.tipoParticipante === input.type &&
    participant.pessoaId === input.pessoaId &&
    (!participant.userId || participant.userId === input.userId),
  );
}

export function isBlockingResponse(response: ChecklistResposta): boolean {
  return response.resposta === "NAO_CONFORME" && response.bloqueiaVeiculoSnapshot;
}

export function findActiveVehicleBlock(blocks: VeiculoBloqueio[], vehicleId: string): VeiculoBloqueio | undefined {
  return blocks.find((block) => block.veiculoId === vehicleId && block.status === "ATIVO");
}

export function canDriverAccessChecklist(driverId: string | undefined, userId: string, checklist: ChecklistVeiculo): boolean {
  return Boolean(driverId) && checklist.motoristaId === driverId &&
    (!checklist.usuarioMotoristaId || checklist.usuarioMotoristaId === userId);
}

export function canHelperAccessChecklist(helperId: string | undefined, checklist: ChecklistVeiculo): boolean {
  return Boolean(helperId) && checklist.ajudanteIdsSnapshot?.includes(helperId!) === true;
}

export function validateVehicleRelease(input: {
  actorIsDriver: boolean;
  maintenanceResolved: boolean;
  reinspectionFinal: boolean;
  reinspectionConforming: boolean;
  justification?: string;
}): string[] {
  const errors: string[] = [];
  if (input.actorIsDriver) errors.push("Motorista não pode liberar o próprio veículo.");
  if (!input.maintenanceResolved) errors.push("A manutenção vinculada precisa estar corrigida.");
  if (!input.reinspectionFinal || !input.reinspectionConforming) errors.push("É necessária uma reinspeção finalizada e conforme.");
  if (!input.justification?.trim()) errors.push("Justificativa de liberação é obrigatória.");
  return errors;
}

export function validateChecklistResponses(responses: ChecklistResposta[]): string[] {
  const errors: string[] = [];
  for (const response of responses) {
    if (response.obrigatorioSnapshot && !response.resposta) {
      errors.push(`${response.codigoSnapshot}: resposta obrigatória.`);
      continue;
    }
    if (response.resposta === "NAO_APLICA" && !response.permiteNASnapshot) {
      errors.push(`${response.codigoSnapshot}: Não se Aplica não é permitido.`);
    }
    if (response.resposta === "NAO_CONFORME") {
      if (response.exigeObservacaoSnapshot && !response.observacao?.trim()) {
        errors.push(`${response.codigoSnapshot}: observação obrigatória para item não conforme.`);
      }
      if (response.exigeAcaoCorretivaSnapshot && !response.acaoCorretiva?.trim()) {
        errors.push(`${response.codigoSnapshot}: ação corretiva obrigatória para item não conforme.`);
      }
      if (response.exigeFotoSnapshot && !response.fotoAnexoId) {
        errors.push(`${response.codigoSnapshot}: foto obrigatória para item não conforme.`);
      }
    }
  }
  return errors;
}

export function getChecklistResult(responses: ChecklistResposta[]): ChecklistResult {
  if (responses.some(isBlockingResponse)) return "BLOQUEADO";
  if (responses.some((response) => response.resposta === "NAO_CONFORME")) return "COM_PENDENCIAS";
  return "CONFORME";
}
