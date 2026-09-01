import type { ProcessoNotificacao, Usuario, UsuarioUnidadePermissao } from "./database";
import type { ChecklistVeiculo } from "../shared/weeklyChecklist";

export type ChecklistNotificationType =
  | "CHECKLIST_CONCLUIDO"
  | "CHECKLIST_COM_PENDENCIA"
  | "CHECKLIST_CRITICO"
  | "VEICULO_BLOQUEADO"
  | "CHECKLIST_AGUARDANDO_ASSINATURA"
  | "CHECKLIST_REINSPECAO_CONCLUIDA";

export interface ChecklistNotification extends ProcessoNotificacao {
  tipo: ChecklistNotificationType;
  severidade: "INFORMATIVA" | "OPERACIONAL" | "URGENTE";
  recipientUserId: string;
  checklistId: string;
  protocolo?: string;
  motorista?: string;
  ajudantes: string[];
  veiculo: string;
  placa: string;
  unidadeId: string;
  unidade: string;
  resultado: string;
  link: string;
  destino: "checklist-semanal";
  idempotencyKey: string;
}

const isMaster = (user: Usuario) => user.perfil === "admin_master" || user.tipo_usuario === "MASTER";

const isOperationalSuperior = (user: Usuario) =>
  isMaster(user) ||
  user.perfil === "admin_unidade" ||
  ["SUPERVISOR", "ADMINISTRATIVO", "GESTOR_OPERACIONAL"].includes(user.tipo_usuario || "");

const canViewChecklists = (user: Usuario) => {
  if (isMaster(user)) return true;
  const permission = user.permissions?.["checklist-semanal"] as Record<string, boolean> | undefined;
  return permission?.visualizar !== false && permission?.view !== false;
};

export function selectChecklistNotificationRecipients(
  users: Usuario[],
  unitPermissions: UsuarioUnidadePermissao[],
  unitId: string,
  actorUserId?: string,
): Usuario[] {
  return users.filter((user) => {
    if (user.id === actorUserId || user.status !== "ativo" || user.bloqueado) return false;
    if (!isOperationalSuperior(user) || !canViewChecklists(user)) return false;
    if (isMaster(user) || user.unidadeId === "Todas" || user.unidade_id === "Todas") return true;
    if (user.unidadeId === unitId || user.unidade_id === unitId) return true;
    return unitPermissions.some((permission) =>
      permission.usuario_id === user.id && permission.unidade_id === unitId && permission.ativo,
    );
  });
}

export function getChecklistFinalNotificationTypes(checklist: ChecklistVeiculo): ChecklistNotificationType[] {
  if (checklist.checklistOriginalId) {
    if (checklist.resultado === "BLOQUEADO") return ["CHECKLIST_REINSPECAO_CONCLUIDA", "CHECKLIST_CRITICO", "VEICULO_BLOQUEADO"];
    if (checklist.possuiNaoConformidadeCritica) return ["CHECKLIST_REINSPECAO_CONCLUIDA", "CHECKLIST_CRITICO"];
    if (checklist.resultado === "COM_PENDENCIAS") return ["CHECKLIST_REINSPECAO_CONCLUIDA", "CHECKLIST_COM_PENDENCIA"];
    return ["CHECKLIST_REINSPECAO_CONCLUIDA"];
  }
  if (checklist.resultado === "BLOQUEADO") return ["CHECKLIST_CRITICO", "VEICULO_BLOQUEADO"];
  if (checklist.possuiNaoConformidadeCritica) return ["CHECKLIST_CRITICO"];
  if (checklist.resultado === "COM_PENDENCIAS") return ["CHECKLIST_COM_PENDENCIA"];
  return ["CHECKLIST_CONCLUIDO"];
}

const notificationCopy = (type: ChecklistNotificationType) => {
  switch (type) {
    case "CHECKLIST_COM_PENDENCIA":
      return { title: "Checklist com pendência", severity: "OPERACIONAL" as const };
    case "CHECKLIST_CRITICO":
      return { title: "Checklist crítico", severity: "URGENTE" as const };
    case "VEICULO_BLOQUEADO":
      return { title: "Veículo bloqueado", severity: "URGENTE" as const };
    case "CHECKLIST_AGUARDANDO_ASSINATURA":
      return { title: "Checklist aguardando assinatura", severity: "OPERACIONAL" as const };
    case "CHECKLIST_REINSPECAO_CONCLUIDA":
      return { title: "Reinspeção concluída", severity: "INFORMATIVA" as const };
    default:
      return { title: "Checklist concluído", severity: "INFORMATIVA" as const };
  }
};

export function buildChecklistNotifications(input: {
  checklist: ChecklistVeiculo;
  recipients: Usuario[];
  types: ChecklistNotificationType[];
  actorName: string;
  eventAt: string;
}): ChecklistNotification[] {
  const { checklist, recipients, actorName, eventAt } = input;
  const helpers = checklist.ajudanteNomesSnapshot || [];
  return input.types.flatMap((type) => {
    const copy = notificationCopy(type);
    const result = checklist.resultado || (type === "CHECKLIST_AGUARDANDO_ASSINATURA" ? "AGUARDANDO_ASSINATURA" : checklist.status);
    const helperText = helpers.length ? ` Ajudante(s): ${helpers.join(", ")}.` : "";
    const message = `${actorName} ${type === "CHECKLIST_AGUARDANDO_ASSINATURA" ? "preencheu" : "finalizou"} o checklist do veículo ${checklist.placaSnapshot}. Motorista: ${checklist.motoristaNomeSnapshot || "não vinculado"}.${helperText} Resultado: ${result}. Protocolo: ${checklist.protocolo || "em emissão"}.`;
    return recipients.map((recipient) => {
      const idempotencyKey = `checklist:${checklist.id}:${type}:${recipient.id}`;
      return {
        id: `ntf-${Buffer.from(idempotencyKey).toString("base64url")}`,
        usuarioId: recipient.email,
        recipientUserId: recipient.id,
        titulo: copy.title,
        mensagem: message,
        lida: false,
        data: eventAt,
        tipo: type,
        severidade: copy.severity,
        checklistId: checklist.id,
        protocolo: checklist.protocolo,
        motorista: checklist.motoristaNomeSnapshot,
        ajudantes: helpers,
        veiculo: checklist.veiculoModeloSnapshot || checklist.placaSnapshot,
        placa: checklist.placaSnapshot,
        unidadeId: checklist.unidadeId,
        unidade: checklist.unidadeNomeSnapshot || checklist.unidadeId,
        resultado: result,
        link: `/checklist-semanal?checklistId=${encodeURIComponent(checklist.id)}`,
        destino: "checklist-semanal",
        idempotencyKey,
      };
    });
  });
}

export function mergeChecklistNotifications(
  current: ProcessoNotificacao[],
  generated: ChecklistNotification[],
): ProcessoNotificacao[] {
  const existingKeys = new Set(current.map((item) => item.idempotencyKey || item.id));
  return [...current, ...generated.filter((item) => !existingKeys.has(item.idempotencyKey))];
}
