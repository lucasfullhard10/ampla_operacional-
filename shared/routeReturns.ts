export type ReturnRecord = {
  id: string;
  rotaId?: string;
  status?: string;
  geraDevolucao?: boolean;
  resolvido?: string | boolean;
  resolvidoBoolean?: boolean;
  deliveryOrder?: string;
  clienteCodigo?: string;
  clienteNomeSnapshot?: string;
  clienteNome?: string;
  clienteNomeFantasia?: string;
  clienteRazaoSocial?: string;
  numeroNF?: string;
  valorNF?: number;
  motivoCodigo?: string;
  motivoDescricao?: string;
  statusTratativa?: string;
};

export function getRouteReturnSummary(records: ReturnRecord[], routeId: string) {
  const linked = records.filter((record) => record.rotaId === routeId && record.status !== "Cancelada");
  const efetivas = linked.filter((record) => record.geraDevolucao === true || (record.geraDevolucao === undefined && record.resolvido !== "SIM"));
  const resolvidas = linked.filter((record) => record.geraDevolucao === false && (record.resolvidoBoolean === true || record.resolvido === "SIM" || record.resolvido === true));
  return { efetivas, resolvidas, quantidade: efetivas.length, valorTotal: efetivas.reduce((sum, record) => sum + Number(record.valorNF || 0), 0) };
}

export function buildReturnSnapshot(record: ReturnRecord) {
  return {
    devolucaoId: record.id,
    deliveryOrder: record.deliveryOrder,
    clienteCodigo: record.clienteCodigo,
    clienteNome: record.clienteNomeSnapshot || record.clienteNome || record.clienteNomeFantasia || record.clienteRazaoSocial,
    numeroNF: record.numeroNF,
    valorNF: Number(record.valorNF || 0),
    motivoCodigo: record.motivoCodigo,
    motivoDescricao: record.motivoDescricao,
    statusTratativa: record.statusTratativa,
  };
}

export function canAccessOperationalUnit(authorizedUnits: string[], unitId: string): boolean {
  return authorizedUnits.includes("Todas") || authorizedUnits.includes(unitId);
}
