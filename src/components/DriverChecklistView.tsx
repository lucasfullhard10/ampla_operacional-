import React, { useEffect, useState } from "react";
import {
  AlertOctagon,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  LogOut,
  RefreshCw,
  Truck,
} from "lucide-react";
import { ChecklistVeiculo, Motorista, Rota, Usuario, Veiculo, VeiculoBloqueio } from "../types";
import ChecklistEditor, { ChecklistDetailPayload } from "./ChecklistEditor";
import { NotificationModal, NotificationType } from "./NotificationModal";

interface DriverAssignment {
  veiculo: Veiculo;
  rota?: Rota;
  origemMotorista: "ROTA_ATIVA" | "VINCULO_OFICIAL" | "SEM_MOTORISTA";
  semana: { start: string; end: string; identifier: string };
  checklist: ChecklistDetailPayload | null;
  bloqueios: VeiculoBloqueio[];
}

interface DriverCurrentPayload {
  driver?: Motorista;
  assignment: DriverAssignment | null;
  message?: string;
  error?: string;
  code?: string;
}

export default function DriverChecklistView({ currentUser, onLogout }: { currentUser: Usuario; onLogout: () => void }) {
  const [current, setCurrent] = useState<DriverCurrentPayload | null>(null);
  const [history, setHistory] = useState<ChecklistVeiculo[]>([]);
  const [detail, setDetail] = useState<ChecklistDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const headers = { "Content-Type": "application/json", "x-selected-unit": currentUser.unidadeId };

  const load = async () => {
    setLoading(true);
    try {
      const [currentResponse, historyResponse] = await Promise.all([
        fetch("/api/motorista/me/checklist-atual", { headers }),
        fetch("/api/motorista/me/checklists", { headers }),
      ]);
      const currentPayload = await currentResponse.json();
      if (!currentResponse.ok) throw new Error(currentPayload.error || "Acesso ao checklist não disponível.");
      setCurrent(currentPayload as DriverCurrentPayload);
      if (historyResponse.ok) setHistory(await historyResponse.json());
      if (currentPayload.assignment?.checklist) setDetail(currentPayload.assignment.checklist as ChecklistDetailPayload);
    } catch (error) {
      setNotification({ type: "error", message: error instanceof Error ? error.message : "Não foi possível carregar seu checklist." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const startChecklist = async () => {
    if (!current?.assignment) return;
    try {
      const response = await fetch("/api/checklists", { method: "POST", headers, body: JSON.stringify({ veiculoId: current.assignment.veiculo.id }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível iniciar o checklist.");
      setDetail(payload as ChecklistDetailPayload);
      await load();
    } catch (error) {
      setNotification({ type: "error", message: error instanceof Error ? error.message : "Não foi possível iniciar." });
    }
  };

  const openHistory = async (id: string) => {
    try {
      const response = await fetch(`/api/checklists/${id}`, { headers });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Checklist não disponível.");
      setDetail(payload as ChecklistDetailPayload);
    } catch (error) {
      setNotification({ type: "error", message: error instanceof Error ? error.message : "Checklist não disponível." });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3"><img src="/assets/logo.svg" alt="AMPLA" className="h-10 w-10" /><div><p className="text-sm font-black">SISTEMA AMPLA</p><p className="text-[9px] uppercase tracking-widest text-emerald-400">Portal de checklist · {currentUser.tipo_usuario === "AJUDANTE" ? "ajudante" : "motorista"}</p></div></div>
          <button type="button" onClick={onLogout} className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-800 px-3 text-xs font-bold text-slate-300"><LogOut className="h-4 w-4" /> Sair</button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 p-4 pb-12">
        <section className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-slate-900 to-emerald-950/30 p-5">
          <p className="text-xs text-slate-400">Bom dia,</p>
          <h1 className="mt-1 text-2xl font-black">{current?.driver?.nome || currentUser.nome}</h1>
          <p className="mt-2 text-xs text-slate-500">Seu acesso é restrito ao veículo, à rota e aos checklists atribuídos ao seu ID oficial.</p>
        </section>

        {loading && <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-400"><RefreshCw className="h-5 w-5 animate-spin" /> Carregando sua operação...</div>}

        {!loading && !current?.assignment && (
          <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
            <Clock3 className="mx-auto h-10 w-10 text-amber-400" />
            <h2 className="mt-3 text-lg font-black">Nenhum veículo atribuído</h2>
            <p className="mt-2 text-sm text-slate-400">{current?.message || "Procure um administrador para revisar seu vínculo operacional."}</p>
          </section>
        )}

        {!loading && current?.assignment && (
          <>
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-[10px] font-bold uppercase text-slate-500">Veículo de hoje</p><h2 className="mt-1 font-mono text-3xl font-black">{current.assignment.veiculo.placa}</h2><p className="text-xs text-slate-400">{current.assignment.veiculo.modelo}</p></div>
                <div className="rounded-xl bg-slate-950 p-3 text-emerald-400"><Truck className="h-7 w-7" /></div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-800 pt-4 text-xs"><div><span className="text-slate-500">Origem</span><p className="font-semibold">{current.assignment.origemMotorista === "ROTA_ATIVA" ? "Rota/DT ativa" : "Vínculo oficial"}</p></div><div><span className="text-slate-500">Rota / DT</span><p className="font-semibold">{current.assignment.rota?.dt || "Sem rota ativa"}</p></div></div>
            </section>

            {current.assignment.bloqueios.some((block) => block.status === "ATIVO") && (
              <section className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5"><div className="flex items-center gap-2 text-lg font-black text-rose-200"><AlertOctagon className="h-6 w-6" /> VEÍCULO BLOQUEADO</div><p className="mt-2 text-sm text-rose-100">Este veículo não está liberado para operação. O motorista não possui permissão para realizar a liberação.</p></section>
            )}

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-[10px] font-bold uppercase text-slate-500">Checklist da semana</p>
              <div className="mt-2 flex items-center justify-between"><div><h2 className={`text-xl font-black ${current.assignment.checklist ? "text-emerald-400" : "text-amber-400"}`}>{current.assignment.checklist?.checklist.status.replaceAll("_", " ") || "PENDENTE"}</h2><p className="text-[10px] text-slate-500">{current.assignment.semana.start.split("-").reverse().join("/")} a {current.assignment.semana.end.split("-").reverse().join("/")}</p></div>{current.assignment.checklist ? <CheckCircle2 className="h-8 w-8 text-emerald-400" /> : <ClipboardCheck className="h-8 w-8 text-amber-400" />}</div>
              <button type="button" onClick={current.assignment.checklist ? () => setDetail(current.assignment!.checklist) : startChecklist} className="mt-5 min-h-14 w-full rounded-xl bg-emerald-600 text-sm font-black shadow-lg shadow-emerald-950 hover:bg-emerald-500">{current.assignment.checklist ? "ABRIR CHECKLIST" : "INICIAR CHECKLIST"}</button>
            </section>
          </>
        )}

        {detail && (
          <section className="rounded-2xl border border-slate-800 bg-slate-950 p-1 pt-5">
            <button type="button" onClick={() => setDetail(null)} className="mb-4 w-full rounded-lg border border-slate-800 py-2 text-xs font-bold text-slate-400">Voltar ao resumo</button>
            <ChecklistEditor detail={detail} currentUser={currentUser} selectedUnit={currentUser.unidadeId} embedded onChanged={(updated) => { if (updated) setDetail(updated); void load(); }} />
          </section>
        )}

        {history.length > 0 && !detail && (
          <section className="space-y-3"><h2 className="text-sm font-black">Meus checklists</h2>{history.slice(0, 12).map((item) => <button key={item.id} type="button" onClick={() => openHistory(item.id)} className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4 text-left"><div><p className="font-mono text-xs font-black">{item.protocolo || "Rascunho"}</p><p className="mt-1 text-[10px] text-slate-500">{item.placaSnapshot} · {item.dataChecklist.split("-").reverse().join("/")}</p></div><span className="text-[9px] font-black text-slate-300">{item.status.replaceAll("_", " ")}</span></button>)}</section>
        )}
      </main>
      <NotificationModal notification={notification} onClose={() => setNotification(null)} />
    </div>
  );
}
