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
  ChecklistParticipante,
  ChecklistResposta,
  ChecklistVeiculo,
  Manutencao,
  Usuario,
  VeiculoBloqueio,
} from "../types";
import { CHECKLIST_MODULE_KEY, CHECKLIST_SIGNATURE_DECLARATION, CHECKLIST_VEHICLE_SIDES, isChecklistFinal } from "../../shared/weeklyChecklist";
import { NotificationModal, NotificationType } from "./NotificationModal";

export interface ChecklistDetailPayload {
  checklist: ChecklistVeiculo;
  participantes: ChecklistParticipante[];
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
        aria-label="Campo para desenhar a assinatura"
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
  const [observationText, setObservationText] = useState("");
  const [observationPhoto, setObservationPhoto] = useState<string | null>(null);
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
  const inspectionComplete = Boolean(detail.checklist.inspecaoConcluidaEm || detail.checklist.finalizadoEm);
  const signatoryRoleLabel = currentUser.tipo_usuario === "AJUDANTE" ? "ajudante" : currentUser.tipo_usuario === "MOTORISTA" ? "motorista" : "responsável";
  const canManage = currentUser.tipo_usuario !== "MOTORISTA" && currentUser.tipo_usuario !== "AJUDANTE";
  const checklistPermissions = currentUser.permissions?.[CHECKLIST_MODULE_KEY];
  const canAddEvidence = currentUser.tipo_usuario === "MOTORISTA" || currentUser.perfil === "admin_master" || currentUser.perfil === "admin_unidade" ||
    ["MASTER", "SUPERVISOR", "MANUTENCAO"].includes(currentUser.tipo_usuario || "") || checklistPermissions?.editar === true || checklistPermissions?.edit === true;
  const currentParticipant = detail.participantes.find((participant) =>
    participant.tipoParticipante === currentUser.tipo_usuario &&
    (!participant.userId || participant.userId === currentUser.id) &&
    (currentUser.tipo_usuario === "MOTORISTA"
      ? participant.pessoaId === currentUser.motoristaId
      : currentUser.tipo_usuario === "AJUDANTE"
        ? participant.pessoaId === currentUser.ajudanteId
        : false),
  );
  const responsesLocked = finalized || inspectionComplete || currentUser.tipo_usuario === "AJUDANTE";
  const canFinalizeInspection = !inspectionComplete && !finalized && currentUser.tipo_usuario !== "AJUDANTE";
  const canSignPending = inspectionComplete && currentParticipant?.statusAssinatura === "PENDENTE";
  const answeredCount = responses.filter((response) => Boolean(response.resposta)).length;
  const progressPercent = responses.length > 0 ? Math.round((answeredCount / responses.length) * 100) : 0;

  useEffect(() => {
    setResponses(detail.respostas);
    setKm(detail.checklist.km ? String(detail.checklist.km) : "");
    setDeclarationAccepted(false);
    signatureRef.current?.clear();
  }, [detail.checklist.id]);

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
      const resultingStatus = payload.detail?.checklist.status;
      const pendingSignature = resultingStatus?.startsWith("AGUARDANDO_ASSINATURA_");
      setNotification({
        type: "success",
        message: pendingSignature
          ? `Inspeção concluída e sua assinatura registrada. Baixe e salve o PDF agora: as imagens temporárias serão apagadas após a geração. Aguardando assinatura do ${resultingStatus === "AGUARDANDO_ASSINATURA_AJUDANTE" ? "ajudante" : "motorista"}.${payload.detail?.checklist.bloqueouVeiculo ? " O veículo está bloqueado por não conformidade crítica." : ""}`
          : payload.detail?.checklist.bloqueouVeiculo
          ? "Checklist finalizado. Baixe e salve o PDF agora: as imagens temporárias serão apagadas após a geração. VEÍCULO BLOQUEADO por não conformidade crítica."
          : "Checklist assinado e finalizado. Baixe e salve o PDF agora: as imagens temporárias serão apagadas após a geração.",
      });
    } catch (error) {
      setNotification({ type: "error", message: error instanceof Error ? error.message : "Não foi possível finalizar." });
    } finally {
      setSaving(false);
    }
  };

  const downloadChecklistPdf = async () => {
    setSaving(true);
    try {
      const pdfResponse = await fetch(`/api/checklists/${detail.checklist.id}/pdf`, { headers: { "x-selected-unit": selectedUnit } });
      if (!pdfResponse.ok) {
        const payload = await pdfResponse.json().catch(() => ({}));
        throw new Error(payload.error || payload.message || "Não foi possível gerar o PDF.");
      }
      const blob = await pdfResponse.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${detail.checklist.protocolo || detail.checklist.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);

      const detailResponse = await fetch(`/api/checklists/${detail.checklist.id}`, { headers: { "x-selected-unit": selectedUnit } });
      if (detailResponse.ok) onChanged(await detailResponse.json() as ChecklistDetailPayload);
      setNotification({ type: "success", message: "PDF baixado. As imagens temporárias foram apagadas; os dados do checklist continuam no histórico." });
    } catch (error) {
      setNotification({ type: "error", message: error instanceof Error ? error.message : "Não foi possível baixar o PDF." });
    } finally {
      setSaving(false);
    }
  };

  const readPhoto = async (file: File): Promise<string> => {
    if (!["image/png", "image/jpeg"].includes(file.type)) throw new Error("Use uma imagem PNG ou JPEG.");
    if (file.size > 3 * 1024 * 1024) throw new Error("A foto excede o limite de 3 MB.");
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Não foi possível ler a foto."));
      reader.readAsDataURL(file);
    });
  };

  const uploadVehiclePhoto = async (position: string, file: File) => {
    setSaving(true);
    try {
      const fotoDataUrl = await readPhoto(file);
      const payload = await parseApi(await fetch(`/api/checklists/${detail.checklist.id}/fotos-veiculo`, {
        method: "POST", headers, body: JSON.stringify({ posicao: position, fotoDataUrl }),
      }));
      onChanged(payload.detail);
      setNotification({ type: "success", message: `Foto da parte ${position.toLowerCase()} registrada.` });
    } catch (error) {
      setNotification({ type: "error", message: error instanceof Error ? error.message : "Não foi possível enviar a foto." });
    } finally {
      setSaving(false);
    }
  };

  const saveObservation = async () => {
    if (!observationText.trim()) {
      setNotification({ type: "error", message: "Escreva a observação antes de salvar." });
      return;
    }
    setSaving(true);
    try {
      const payload = await parseApi(await fetch(`/api/checklists/${detail.checklist.id}/observacoes`, {
        method: "POST", headers, body: JSON.stringify({ texto: observationText.trim(), fotoDataUrl: observationPhoto }),
      }));
      setObservationText("");
      setObservationPhoto(null);
      onChanged(payload.detail);
      setNotification({ type: "success", message: "Observação registrada no histórico do checklist." });
    } catch (error) {
      setNotification({ type: "error", message: error instanceof Error ? error.message : "Não foi possível salvar a observação." });
    } finally {
      setSaving(false);
    }
  };

  const handleParticipantSign = async () => {
    const signatureDataUrl = signatureRef.current?.getDataUrl();
    if (!declarationAccepted || !signatureDataUrl) {
      setNotification({ type: "error", message: "Aceite a declaração e assine no campo indicado." });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/checklists/${detail.checklist.id}/assinar`, {
        method: "POST",
        headers,
        body: JSON.stringify({ declaracaoAceita: true, assinaturaDataUrl: signatureDataUrl }),
      });
      const payload = await parseApi(response);
      onChanged(payload.detail);
      setNotification({ type: "success", message: "Sua assinatura foi registrada sem alterar a assinatura dos demais participantes." });
    } catch (error) {
      setNotification({ type: "error", message: error instanceof Error ? error.message : "Não foi possível registrar sua assinatura." });
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
        <label><span className="text-[9px] uppercase text-slate-500">Quilometragem</span><input disabled={responsesLocked} type="number" min="0" value={km} onChange={(event) => setKm(event.target.value)} className="mt-1 w-full rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-white disabled:opacity-70" /></label>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
        <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase text-slate-400">
          <span>Progresso do checklist</span><span>{answeredCount}/{responses.length} · {progressPercent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-label="Progresso do checklist" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {detail.participantes.map((participant) => (
          <div key={participant.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <div className="flex items-center justify-between gap-2">
              <div><p className="text-[9px] font-black uppercase text-slate-500">{participant.tipoParticipante}</p><p className="text-xs font-bold text-white">{participant.nomeSnapshot}</p></div>
              <span className={`rounded px-2 py-1 text-[9px] font-black ${participant.statusAssinatura === "ASSINADO" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{participant.statusAssinatura}</span>
            </div>
            <p className="mt-1 text-[9px] text-slate-500">{participant.dataAssinatura ? new Date(participant.dataAssinatura).toLocaleString("pt-BR") : "Assinatura pendente"}</p>
          </div>
        ))}
        {detail.participantes.every((participant) => participant.tipoParticipante !== "AJUDANTE") && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-400">Ajudante não escalado nesta operação.</div>
        )}
      </div>

      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div><h3 className="text-sm font-black text-white">Fotos do veículo</h3><p className="mt-1 text-xs text-slate-400">Registre os quatro ângulos: lado direito, lado esquerdo, frente e traseira. PNG ou JPEG, até 3 MB por foto.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
          {CHECKLIST_VEHICLE_SIDES.map((position) => {
            const photo = detail.anexos.find((attachment) => attachment.tipo === "FOTO_VEICULO" && attachment.posicaoVeiculo === position);
            const label = position === "DIREITA" ? "Lado direito" : position === "ESQUERDA" ? "Lado esquerdo" : position === "FRENTE" ? "Frente" : "Parte de trás";
            return <div key={position} className="rounded-lg border border-slate-700 bg-slate-950 p-3">
              <p className="mb-2 text-xs font-bold text-white">{label}</p>
              {photo?.dataUrl ? <img src={photo.dataUrl} alt={`Foto do veículo - ${label}`} className="mb-2 h-36 w-full rounded object-contain bg-slate-900" /> : <div className="mb-2 flex h-36 items-center justify-center rounded bg-slate-900 text-xs text-slate-500">{photo ? "Imagem removida após gerar PDF" : "Sem foto"}</div>}
              {!responsesLocked && canAddEvidence && <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded border border-dashed border-slate-600 px-3 text-xs font-bold text-slate-200"><Camera className="h-4 w-4" /> {photo ? "Substituir foto" : "Adicionar foto"}<input type="file" accept="image/png,image/jpeg" capture="environment" disabled={saving} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadVehiclePhoto(position, file); event.target.value = ""; }} /></label>}
            </div>;
          })}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div><h3 className="text-sm font-black text-white">Observações adicionais</h3><p className="mt-1 text-xs text-slate-400">Motorista ou supervisor podem registrar uma observação. A foto é opcional; registros anteriores ficam preservados.</p></div>
        {(detail.checklist.observacoes || []).map((observation) => {
          const photo = detail.anexos.find((attachment) => attachment.id === observation.fotoAnexoId);
          const isAddendum = Boolean(detail.checklist.inspecaoConcluidaEm && observation.criadoEm > detail.checklist.inspecaoConcluidaEm);
          return <article key={observation.id} className="rounded-lg border border-slate-700 bg-slate-950 p-3">
            <p className="text-[10px] text-slate-400">{observation.autorNome} · {new Date(observation.criadoEm).toLocaleString("pt-BR")}</p>
            {isAddendum && <p className="mt-1 text-[10px] font-bold text-amber-300">Adendo após a conclusão; não altera a assinatura original.</p>}
            <p className="mt-2 whitespace-pre-wrap text-xs text-white">{observation.texto}</p>
            {photo?.dataUrl ? <img src={photo.dataUrl} alt="Foto da observação" className="mt-3 max-h-56 w-full rounded object-contain bg-slate-900" /> : photo && <p className="mt-2 text-[10px] text-slate-500">Imagem removida após gerar PDF.</p>}
          </article>;
        })}
        {canAddEvidence && <div className="space-y-2">
          <textarea value={observationText} maxLength={2000} onChange={(event) => setObservationText(event.target.value)} placeholder="Descreva sua observação sobre o veículo..." aria-label="Nova observação do checklist" className="min-h-24 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-white" />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-600 px-3 text-xs font-bold text-slate-200"><Camera className="h-4 w-4" /> {observationPhoto ? "Foto selecionada" : "Anexar foto (opcional)"}<input type="file" accept="image/png,image/jpeg" capture="environment" disabled={saving} className="sr-only" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { setObservationPhoto(await readPhoto(file)); } catch (error) { setNotification({ type: "error", message: error instanceof Error ? error.message : "Foto inválida." }); } event.target.value = ""; }} /></label>
            {observationPhoto && <button type="button" onClick={() => setObservationPhoto(null)} className="text-xs text-slate-400">Remover foto</button>}
            <button type="button" disabled={saving || !observationText.trim()} onClick={saveObservation} className="min-h-11 rounded-lg bg-sky-600 px-4 text-xs font-black text-white disabled:opacity-50">SALVAR OBSERVAÇÃO</button>
          </div>
        </div>}
      </section>

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
                    disabled={responsesLocked || (answer === "NAO_APLICA" && !response.permiteNASnapshot)}
                    onClick={() => setResponses((items) => items.map((item) => item.id === response.id ? { ...item, resposta: answer } : item))}
                    className={`min-h-12 rounded-lg border px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-30 ${response.resposta === answer ? (answer === "NAO_CONFORME" ? "border-rose-400 bg-rose-500/20 text-rose-200" : "border-emerald-400 bg-emerald-500/20 text-emerald-200") : "border-slate-700 bg-slate-950 text-slate-400"}`}
                  >
                    {answer === "CONFORME" ? "Conforme" : answer === "NAO_CONFORME" ? "Não Conforme" : "Não se Aplica"}
                  </button>
                ))}
              </div>
              {response.resposta === "NAO_CONFORME" && (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <textarea disabled={responsesLocked} value={response.observacao || ""} onChange={(event) => setResponses((items) => items.map((item) => item.id === response.id ? { ...item, observacao: event.target.value } : item))} placeholder={`Observação${response.exigeObservacaoSnapshot ? " obrigatória" : ""}`} className="min-h-20 rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-white" />
                  <textarea disabled={responsesLocked} value={response.acaoCorretiva || ""} onChange={(event) => setResponses((items) => items.map((item) => item.id === response.id ? { ...item, acaoCorretiva: event.target.value } : item))} placeholder={`Ação corretiva${response.exigeAcaoCorretivaSnapshot ? " obrigatória" : ""}`} className="min-h-20 rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-white" />
                  {!responsesLocked && (
                    <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-sky-500">
                      <Camera className="h-4 w-4" /> {hasPhoto ? "Substituir foto" : `Adicionar foto${response.exigeFotoSnapshot ? " *" : ""}`}
                      <input type="file" accept="image/png,image/jpeg" capture="environment" className="hidden" onChange={(event) => {
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
                  {inspectionComplete && canManage && !response.manutencaoId && (
                    <button type="button" disabled={saving} onClick={() => action(`/api/checklists/${detail.checklist.id}/gerar-manutencao`, { respostaId: response.id }, "Solicitação de manutenção criada e vinculada.")} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-600 px-3 text-xs font-black text-white hover:bg-amber-500"><Wrench className="h-4 w-4" /> GERAR SOLICITAÇÃO DE MANUTENÇÃO</button>
                  )}
                  {response.manutencaoId && <p className="text-[10px] font-mono text-amber-300">Manutenção vinculada: {response.manutencaoId}</p>}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {canFinalizeInspection && (
        <div className="space-y-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2"><PenTool className="h-5 w-5 text-emerald-400" /><h3 className="text-sm font-black text-white">Assinatura do {signatoryRoleLabel}</h3></div>
          <p className="text-xs text-slate-300">Assine usando o dedo ou a caneta na área abaixo.</p>
          <SignaturePad ref={signatureRef} />
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200">
            <input type="checkbox" checked={declarationAccepted} onChange={(event) => setDeclarationAccepted(event.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-500" />
            <span>{CHECKLIST_SIGNATURE_DECLARATION}</span>
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={saving} onClick={handleSave} className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 text-xs font-black text-white"><Save className="h-4 w-4" /> SALVAR RASCUNHO</button>
            <button type="button" disabled={saving} onClick={handleFinalize} className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-600 text-xs font-black text-white hover:bg-emerald-500"><ShieldCheck className="h-4 w-4" /> ASSINAR E FINALIZAR</button>
          </div>
        </div>
      )}

      {canSignPending && (
        <div className="space-y-4 rounded-xl border border-teal-500/30 bg-teal-500/5 p-4">
          <div className="flex items-center gap-2"><PenTool className="h-5 w-5 text-teal-300" /><h3 className="text-sm font-black text-white">Checklist aguardando sua confirmação</h3></div>
          <p className="text-xs text-slate-300">Revise todas as respostas acima. A assinatura será associada somente ao seu usuário e cadastro oficial.</p>
          <SignaturePad ref={signatureRef} />
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200">
            <input type="checkbox" checked={declarationAccepted} onChange={(event) => setDeclarationAccepted(event.target.checked)} className="mt-0.5 h-4 w-4 accent-teal-500" />
            <span>{CHECKLIST_SIGNATURE_DECLARATION}</span>
          </label>
          <button type="button" disabled={saving} onClick={handleParticipantSign} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-teal-600 text-xs font-black text-white hover:bg-teal-500"><ShieldCheck className="h-4 w-4" /> CONCORDO E ASSINO</button>
        </div>
      )}

      {inspectionComplete && (
        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
            Baixe e salve o PDF agora. Ao gerar o documento, as imagens temporárias serão apagadas; os dados do checklist permanecem no histórico.
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-[9px] uppercase text-slate-500">Protocolo</p><p className="font-mono text-sm font-black text-white">{detail.checklist.protocolo || "Não emitido"}</p></div>
            <button type="button" disabled={saving} onClick={() => void downloadChecklistPdf()} className="flex min-h-11 items-center gap-2 rounded-lg bg-sky-600 px-4 text-xs font-black text-white disabled:opacity-50"><FileText className="h-4 w-4" /> BAIXAR E SALVAR PDF</button>
          </div>
          <p className="text-xs text-slate-400">As assinaturas são individuais. Participantes pendentes aparecem acima e nunca são marcados como assinados automaticamente.</p>
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
