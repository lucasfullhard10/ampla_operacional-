import React, { useEffect, useRef, useState } from "react";
import {
  AlertOctagon,
  Camera,
  CheckCircle2,
  FileText,
  PenTool,
  RefreshCw,
  Save,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";
import {
  ChecklistAnexo,
  ChecklistResposta,
  ChecklistVeiculo,
  Manutencao,
  Usuario,
  VeiculoBloqueio,
} from "../types";
import { isChecklistFinal } from "../../shared/weeklyChecklist";
import { openDocumentOrNotify } from "../lib/documents";
import { NotificationModal, NotificationType } from "./NotificationModal";

export interface ChecklistDetailPayload {
  checklist: ChecklistVeiculo;
  respostas: ChecklistResposta[];
  anexos: ChecklistAnexo[];
  bloqueios: VeiculoBloqueio[];
  manutencoes: Manutencao[];
  reinspecoes: ChecklistVeiculo[];
}

interface EditableResponse extends ChecklistResposta {
  pendingPhotoDataUrl?: string;
  pendingPhotoName?: string;
}

interface SignaturePadHandle {
  clear: () => void;
  getDataUrl: () => string | null;
}

const SignaturePad = React.forwardRef<SignaturePadHandle>(function SignaturePad(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const touchedRef = useRef(false);

  const position = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  React.useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      context?.clearRect(0, 0, canvas.width, canvas.height);
      touchedRef.current = false;
    },
    getDataUrl: () => touchedRef.current ? canvasRef.current?.toDataURL("image/png") || null : null,
  }));

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={720}
        height={220}
        className="h-36 w-full touch-none rounded-xl border border-slate-700 bg-white"
        onPointerDown={(event) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          canvas.setPointerCapture(event.pointerId);
          const context = canvas.getContext("2d");
          const point = position(event);
          context?.beginPath();
          context?.moveTo(point.x, point.y);
          drawingRef.current = true;
          touchedRef.current = true;
        }}
        onPointerMove={(event) => {
          if (!drawingRef.current) return;
          const context = canvasRef.current?.getContext("2d");
          const point = position(event);
          if (context) {
            context.strokeStyle = "#0f172a";
            context.lineWidth = 3;
            context.lineCap = "round";
            context.lineTo(point.x, point.y);
            context.stroke();
          }
        }}
        onPointerUp={() => { drawingRef.current = false; }}
        onPointerCancel={() => { drawingRef.current = false; }}
      />
      <button type="button" onClick={() => ref && typeof ref !== "function" && ref.current?.clear()} className="text-xs font-semibold text-slate-400 hover:text-white">
        Limpar assinatura
      </button>
    </div>
  );
});

const statusClass = (status: string) => {
  if (["BLOQUEADO", "AGUARDANDO_MANUTENCAO"].includes(status)) return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  if (["CONFORME", "LIBERADO"].includes(status)) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  return "border-amber-500/30 bg-amber-500/10 text-amber-300";
};

export default function ChecklistEditor({
  detail,
  currentUser,
  selectedUnit,
  onClose,
  onChanged,
  embedded = false,
}: {
  detail: ChecklistDetailPayload;
  currentUser: Usuario;
  selectedUnit: string;
  onClose?: () => void;
  onChanged: (detail?: ChecklistDetailPayload) => void;
  embedded?: boolean;
}) {
  const [responses, setResponses] = useState<EditableResponse[]>(detail.respostas);
  const [km, setKm] = useState(detail.checklist.km ? String(detail.checklist.km) : "");
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [reinspectionReason, setReinspectionReason] = useState("");
  const [releaseReason, setReleaseReason] = useState("");
  const [releaseMaintenanceId, setReleaseMaintenanceId] = useState("");
  const [releaseReinspectionId, setReleaseReinspectionId] = useState("");
  const signatureRef = useRef<SignaturePadHandle>(null);
  const finalized = isChecklistFinal(detail.checklist.status);
  const signatoryRoleLabel = currentUser.tipo_usuario === "AJUDANTE" ? "ajudante" : currentUser.tipo_usuario === "MOTORISTA" ? "motorista" : "responsável";
  const canManage = currentUser.tipo_usuario !== "MOTORISTA" && currentUser.tipo_usuario !== "AJUDANTE";

  useEffect(() => {
    setResponses(detail.respostas);
    setKm(detail.checklist.km ? String(detail.checklist.km) : "");
  }, [detail]);

  const headers = { "Content-Type": "application/json", "x-selected-unit": selectedUnit };
  const parseApi = async (response: Response) => {
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || payload.message || "Operação rejeitada.");
    return payload as { detail?: ChecklistDetailPayload };
  };

  const saveDraft = async (notifyAwaitingSignature = true) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/checklists/${detail.checklist.id}/respostas`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          km: km ? Number(km) : undefined,
          notifyAwaitingSignature,
          respostas: responses.map((item) => ({
            id: item.id,
            resposta: item.resposta,
            observacao: item.observacao,
            acaoCorretiva: item.acaoCorretiva,
            fotoDataUrl: item.pendingPhotoDataUrl,
            fotoNome: item.pendingPhotoName,
          })),
        }),
      });
      const payload = await parseApi(response);
      if (payload.detail) {
        setResponses(payload.detail.respostas);
        onChanged(payload.detail);
      }
      return payload.detail;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      await saveDraft(true);
      setNotification({ type: "success", message: "Rascunho salvo no servidor." });
    } catch (error) {
      setNotification({ type: "error", message: error instanceof Error ? error.message : "Não foi possível salvar." });
    }
  };

  const handleFinalize = async () => {
    const signatureDataUrl = signatureRef.current?.getDataUrl();
    if (!declarationAccepted || !signatureDataUrl) {
      setNotification({ type: "error", message: "Aceite a declaração e assine no campo indicado antes de finalizar." });
      return;
    }
    setSaving(true);
    try {
      await saveDraft(false);
      const response = await fetch(`/api/checklists/${detail.checklist.id}/finalizar`, {
        method: "POST",
        headers,
        body: JSON.stringify({ declaracaoAceita: true, assinaturaDataUrl: signatureDataUrl }),
      });
      const payload = await parseApi(response);
      onChanged(payload.detail);
      setNotification({
        type: "success",
        message: payload.detail?.checklist.bloqueouVeiculo
          ? "Checklist finalizado. VEÍCULO BLOQUEADO por não conformidade crítica."
          : "Checklist assinado e finalizado com sucesso.",
      });
    } catch (error) {
      setNotification({ type: "error", message: error instanceof Error ? error.message : "Não foi possível finalizar." });
    } finally {
      setSaving(false);
    }
  };

  const action = async (url: string, body: object, success: string) => {
    setSaving(true);
    try {
      const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
      const payload = await parseApi(response);
      onChanged(payload.detail);
      setNotification({ type: "success", message: success });
    } catch (error) {
      setNotification({ type: "error", message: error instanceof Error ? error.message : "Operação rejeitada." });
    } finally {
      setSaving(false);
    }
  };

  const body = (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-400">Checklist semanal</p>
          <h2 className="mt-1 text-xl font-black text-white">{detail.checklist.placaSnapshot}</h2>
          <p className="text-xs text-slate-400">{detail.checklist.veiculoModeloSnapshot || "Veículo"} · {detail.checklist.motoristaNomeSnapshot || "Nenhum motorista vinculado"}</p>
          <p className="mt-1 text-[10px] text-slate-500">Semana {detail.checklist.dataInicioSemana.split("-").reverse().join("/")} a {detail.checklist.dataFimSemana.split("-").reverse().join("/")} · origem do motorista: {detail.checklist.origemMotorista.replaceAll("_", " ")}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-lg border px-3 py-2 font-mono text-[10px] font-black ${statusClass(detail.checklist.status)}`}>{detail.checklist.status.replaceAll("_", " ")}</span>
          {onClose && <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>}
        </div>
      </div>

      {detail.bloqueios.some((block) => block.status === "ATIVO") && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-100">
          <div className="flex items-center gap-2 text-sm font-black"><AlertOctagon className="h-5 w-5" /> VEÍCULO BLOQUEADO</div>
          <p className="mt-2 text-xs">Foi identificada uma não conformidade crítica. Este veículo não está liberado para operação.</p>
          <p className="mt-1 text-[10px] text-rose-300">{detail.bloqueios.find((block) => block.status === "ATIVO")?.motivo}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 md:grid-cols-4">
        <div><span className="text-[9px] uppercase text-slate-500">Unidade</span><p className="text-xs font-semibold text-white">{detail.checklist.unidadeNomeSnapshot || detail.checklist.unidadeId}</p></div>
        <div><span className="text-[9px] uppercase text-slate-500">Rota / DT</span><p className="text-xs font-semibold text-white">{detail.checklist.rotaSnapshot || "Sem rota ativa"}</p></div>
        <div><span className="text-[9px] uppercase text-slate-500">CPF</span><p className="text-xs font-semibold text-white">{detail.checklist.motoristaCpfSnapshot || "—"}</p></div>
        <label><span className="text-[9px] uppercase text-slate-500">Quilometragem</span><input disabled={finalized} type="number" min="0" value={km} onChange={(event) => setKm(event.target.value)} className="mt-1 w-full rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-white disabled:opacity-70" /></label>
      </div>

      <div className="space-y-3">
        {responses.map((response, index) => {
          const hasPhoto = Boolean(response.fotoAnexoId || response.pendingPhotoDataUrl);
          return (
            <article key={response.id} className={`rounded-xl border p-4 ${response.resposta === "NAO_CONFORME" ? "border-rose-500/30 bg-rose-500/5" : "border-slate-800 bg-slate-900"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{index + 1}/{responses.length} · {response.categoriaSnapshot} · {response.codigoSnapshot}</p>
                  <h3 className="mt-1 text-sm font-semibold text-white">{response.descricaoSnapshot}</h3>
                </div>
                {response.bloqueiaVeiculoSnapshot && <span className="shrink-0 rounded bg-rose-500/10 px-2 py-1 text-[8px] font-black text-rose-400">BLOQUEADOR</span>}
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {(["CONFORME", "NAO_CONFORME", "NAO_APLICA"] as const).map((answer) => (
                  <button
                    key={answer}
                    type="button"
                    disabled={finalized || (answer === "NAO_APLICA" && !response.permiteNASnapshot)}
                    onClick={() => setResponses((items) => items.map((item) => item.id === response.id ? { ...item, resposta: answer } : item))}
                    className={`min-h-12 rounded-lg border px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-30 ${response.resposta === answer ? (answer === "NAO_CONFORME" ? "border-rose-400 bg-rose-500/20 text-rose-200" : "border-emerald-400 bg-emerald-500/20 text-emerald-200") : "border-slate-700 bg-slate-950 text-slate-400"}`}
                  >
                    {answer === "CONFORME" ? "Conforme" : answer === "NAO_CONFORME" ? "Não Conforme" : "Não se Aplica"}
                  </button>
                ))}
              </div>
              {response.resposta === "NAO_CONFORME" && (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <textarea disabled={finalized} value={response.observacao || ""} onChange={(event) => setResponses((items) => items.map((item) => item.id === response.id ? { ...item, observacao: event.target.value } : item))} placeholder={`Observação${response.exigeObservacaoSnapshot ? " obrigatória" : ""}`} className="min-h-20 rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-white" />
                  <textarea disabled={finalized} value={response.acaoCorretiva || ""} onChange={(event) => setResponses((items) => items.map((item) => item.id === response.id ? { ...item, acaoCorretiva: event.target.value } : item))} placeholder={`Ação corretiva${response.exigeAcaoCorretivaSnapshot ? " obrigatória" : ""}`} className="min-h-20 rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-white" />
                  {!finalized && (
                    <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-sky-500">
                      <Camera className="h-4 w-4" /> {hasPhoto ? "Substituir foto" : `Adicionar foto${response.exigeFotoSnapshot ? " *" : ""}`}
                      <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        if (file.size > 3 * 1024 * 1024) {
                          setNotification({ type: "error", message: "A foto excede o limite de 3 MB." });
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => setResponses((items) => items.map((item) => item.id === response.id ? { ...item, pendingPhotoDataUrl: String(reader.result), pendingPhotoName: file.name } : item));
                        reader.readAsDataURL(file);
                      }} />
                    </label>
                  )}
                  {hasPhoto && <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400"><CheckCircle2 className="h-4 w-4" /> Evidência fotográfica registrada</div>}
                  {finalized && canManage && !response.manutencaoId && (
                    <button type="button" disabled={saving} onClick={() => action(`/api/checklists/${detail.checklist.id}/gerar-manutencao`, { respostaId: response.id }, "Solicitação de manutenção criada e vinculada.")} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-600 px-3 text-xs font-black text-white hover:bg-amber-500"><Wrench className="h-4 w-4" /> GERAR SOLICITAÇÃO DE MANUTENÇÃO</button>
                  )}
                  {response.manutencaoId && <p className="text-[10px] font-mono text-amber-300">Manutenção vinculada: {response.manutencaoId}</p>}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {!finalized && (
        <div className="space-y-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2"><PenTool className="h-5 w-5 text-emerald-400" /><h3 className="text-sm font-black text-white">Assinatura do {signatoryRoleLabel}</h3></div>
          <p className="text-xs text-slate-300">Assine usando o dedo ou a caneta na área abaixo.</p>
          <SignaturePad ref={signatureRef} />
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200">
            <input type="checkbox" checked={declarationAccepted} onChange={(event) => setDeclarationAccepted(event.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-500" />
            <span>Declaro que realizei a inspeção do veículo e que as informações registradas neste checklist são verdadeiras.</span>
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={saving} onClick={handleSave} className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 text-xs font-black text-white"><Save className="h-4 w-4" /> SALVAR RASCUNHO</button>
            <button type="button" disabled={saving} onClick={handleFinalize} className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-600 text-xs font-black text-white hover:bg-emerald-500"><ShieldCheck className="h-4 w-4" /> ASSINAR E FINALIZAR</button>
          </div>
        </div>
      )}

      {finalized && (
        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-[9px] uppercase text-slate-500">Protocolo</p><p className="font-mono text-sm font-black text-white">{detail.checklist.protocolo || "Não emitido"}</p></div>
            <button type="button" onClick={() => openDocumentOrNotify(detail.checklist.pdfUrl)} className="flex min-h-11 items-center gap-2 rounded-lg bg-sky-600 px-4 text-xs font-black text-white"><FileText className="h-4 w-4" /> VER PDF</button>
          </div>
          <p className="text-xs text-slate-400">Assinado por {detail.checklist.assinaturaUsuarioNomeSnapshot || detail.checklist.assinaturaMotoristaNomeSnapshot} em {detail.checklist.dataAssinatura ? new Date(detail.checklist.dataAssinatura).toLocaleString("pt-BR") : "—"}.</p>
        </div>
      )}

      {canManage && detail.manutencoes.filter((maintenance) => maintenance.statusResolucao === "PENDENTE").map((maintenance) => (
        <div key={maintenance.id} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <h3 className="text-sm font-black text-white">Concluir manutenção {maintenance.id}</h3>
          <p className="mt-1 text-xs text-slate-400">{maintenance.observacao}</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input value={resolutionNotes[maintenance.id] || ""} onChange={(event) => setResolutionNotes((notes) => ({ ...notes, [maintenance.id]: event.target.value }))} placeholder="Descreva a correção executada" className="min-h-11 flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white" />
            <button type="button" disabled={saving} onClick={() => action(`/api/checklists/${detail.checklist.id}/manutencoes/${maintenance.id}/resolver`, { resolucao: resolutionNotes[maintenance.id] }, "Correção registrada. O fluxo seguirá para reinspeção quando todas as pendências críticas forem resolvidas.")} className="rounded-lg bg-amber-600 px-4 text-xs font-black text-white">REGISTRAR CORREÇÃO</button>
          </div>
        </div>
      ))}

      {canManage && !detail.checklist.checklistOriginalId && detail.checklist.status === "AGUARDANDO_REINSPECAO" && (
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
          <h3 className="text-sm font-black text-white">Iniciar reinspeção controlada</h3>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input value={reinspectionReason} onChange={(event) => setReinspectionReason(event.target.value)} placeholder="Informe o que foi corrigido" className="min-h-11 flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white" />
            <button type="button" disabled={saving} onClick={() => action(`/api/checklists/${detail.checklist.id}/reinspecao`, { justificativa: reinspectionReason, km: km ? Number(km) : undefined }, "Reinspeção criada sem apagar o checklist original.")} className="flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-xs font-black text-white"><RefreshCw className="h-4 w-4" /> INICIAR REINSPEÇÃO</button>
          </div>
        </div>
      )}

      {canManage && !detail.checklist.checklistOriginalId && detail.bloqueios.some((block) => block.status === "ATIVO") && detail.reinspecoes.some((item) => item.resultado === "CONFORME") && (
        <div className="space-y-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
          <h3 className="text-sm font-black text-white">Liberação operacional</h3>
          <p className="text-xs text-slate-400">Exige manutenção corrigida, reinspeção conforme e justificativa auditável.</p>
          <div className="grid gap-2 md:grid-cols-2">
            <select value={releaseMaintenanceId} onChange={(event) => setReleaseMaintenanceId(event.target.value)} className="min-h-11 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white"><option value="">Manutenção corrigida...</option>{detail.manutencoes.filter((item) => item.statusResolucao === "CORRIGIDA").map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}</select>
            <select value={releaseReinspectionId} onChange={(event) => setReleaseReinspectionId(event.target.value)} className="min-h-11 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white"><option value="">Reinspeção conforme...</option>{detail.reinspecoes.filter((item) => item.resultado === "CONFORME").map((item) => <option key={item.id} value={item.id}>{item.protocolo || item.id}</option>)}</select>
          </div>
          <textarea value={releaseReason} onChange={(event) => setReleaseReason(event.target.value)} placeholder="Justificativa de liberação" className="min-h-20 w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-white" />
          <button type="button" disabled={saving} onClick={() => action(`/api/checklists/${detail.checklist.id}/liberar-veiculo`, { justificativa: releaseReason, manutencaoId: releaseMaintenanceId, reinspecaoId: releaseReinspectionId }, "Veículo liberado com trilha completa de auditoria.")} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-xs font-black text-white"><ShieldCheck className="h-4 w-4" /> LIBERAR VEÍCULO</button>
        </div>
      )}

      {saving && <div className="flex items-center justify-center gap-2 text-xs text-slate-400"><RefreshCw className="h-4 w-4 animate-spin" /> Processando no servidor...</div>}
    </div>
  );

  return (
    <>
      {embedded ? body : <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/90 p-3 backdrop-blur-sm md:p-8"><div className="mx-auto max-w-5xl rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-2xl md:p-6">{body}</div></div>}
      <NotificationModal notification={notification} onClose={() => setNotification(null)} />
    </>
  );
}
