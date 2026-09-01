import React, { useEffect, useMemo, useState } from "react";
import {
  AlertOctagon,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileClock,
  FileText,
  Filter,
  Gauge,
  Plus,
  RefreshCw,
  Settings2,
  ShieldAlert,
  Truck,
} from "lucide-react";
import {
  ChecklistConfiguracao,
  ChecklistItemTemplate,
  ChecklistVeiculo,
  Motorista,
  Rota,
  Usuario,
  Veiculo,
  VeiculoBloqueio,
} from "../types";
import { openDocumentOrNotify } from "../lib/documents";
import ChecklistEditor, { ChecklistDetailPayload } from "./ChecklistEditor";
import { NotificationModal, NotificationType } from "./NotificationModal";

interface WeeklyRow {
  veiculo: Veiculo;
  motorista?: Motorista;
  motoristaOrigem: "ROTA_ATIVA" | "VINCULO_OFICIAL" | "SEM_MOTORISTA";
  motoristaMensagem: string;
  rota?: Rota;
  checklist?: ChecklistVeiculo;
  bloqueios: VeiculoBloqueio[];
  semana: { start: string; end: string; year: number; identifier: string };
}

interface WeeklyPayload {
  semana: { start: string; end: string; year: number; identifier: string };
  configuracao: ChecklistConfiguracao;
  rows: WeeklyRow[];
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

const labelStatus = (value?: string) => value ? value.replaceAll("_", " ") : "PENDENTE";
const formatDate = (value: string) => value.split("-").reverse().join("/");

export default function ChecklistSemanalView({ currentUser, selectedUnit }: { currentUser: Usuario; selectedUnit: string }) {
  const [tab, setTab] = useState<"semana" | "historico" | "configuracao">("semana");
  const [weekly, setWeekly] = useState<WeeklyPayload | null>(null);
  const [history, setHistory] = useState<ChecklistVeiculo[]>([]);
  const [templates, setTemplates] = useState<ChecklistItemTemplate[]>([]);
  const [configuration, setConfiguration] = useState<ChecklistConfiguracao | null>(null);
  const [detail, setDetail] = useState<ChecklistDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState("");
  const [historyStart, setHistoryStart] = useState("");
  const [historyEnd, setHistoryEnd] = useState("");
  const [historyWeek, setHistoryWeek] = useState("");
  const [historyVehicle, setHistoryVehicle] = useState("");
  const [historyDriver, setHistoryDriver] = useState("");
  const [historyResult, setHistoryResult] = useState("");
  const [historyBlocked, setHistoryBlocked] = useState(false);
  const [newItem, setNewItem] = useState({ codigo: "", categoria: "", descricao: "", bloqueiaVeiculo: false, exigeFotoNaoConforme: false });
  const headers = { "Content-Type": "application/json", "x-selected-unit": selectedUnit };

  const fetchJson = async <T,>(url: string): Promise<T> => {
    const response = await fetch(url, { headers });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || payload.message || "Operação rejeitada.");
    return payload as T;
  };

  const load = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ unidadeId: selectedUnit });
      const [weeklyData, historyData, templateData, configData] = await Promise.all([
        fetchJson<WeeklyPayload>(`/api/checklists/semana?${query}`),
        fetchJson<ChecklistVeiculo[]>(`/api/checklists?${query}`),
        fetchJson<ChecklistItemTemplate[]>(`/api/checklists/templates?${query}`),
        fetchJson<ChecklistConfiguracao>(`/api/checklists/configuracao?${query}`),
      ]);
      setWeekly(weeklyData);
      setHistory(historyData);
      setTemplates(templateData);
      setConfiguration(configData);
    } catch (error) {
      setNotification({ type: "error", message: error instanceof Error ? error.message : "Não foi possível carregar o módulo." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [selectedUnit]);

  const openChecklist = async (id: string) => {
    try {
      setDetail(await fetchJson<ChecklistDetailPayload>(`/api/checklists/${id}`));
    } catch (error) {
      setNotification({ type: "error", message: error instanceof Error ? error.message : "Checklist não disponível." });
    }
  };

  const startChecklist = async (vehicleId: string) => {
    try {
      const response = await fetch("/api/checklists", { method: "POST", headers, body: JSON.stringify({ veiculoId: vehicleId }) });
      const payload = await response.json();
      if (!response.ok) {
        if (payload.checklistId) await openChecklist(payload.checklistId);
        throw new Error(payload.error || "Não foi possível iniciar o checklist.");
      }
      setDetail(payload as ChecklistDetailPayload);
      await load();
    } catch (error) {
      setNotification({ type: "error", message: error instanceof Error ? error.message : "Não foi possível iniciar." });
    }
  };

  const updateTemplate = async (item: ChecklistItemTemplate, changes: Partial<ChecklistItemTemplate>) => {
    try {
      const response = await fetch(`/api/checklists/templates/${item.id}`, { method: "PUT", headers, body: JSON.stringify(changes) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Alteração rejeitada.");
      await load();
    } catch (error) {
      setNotification({ type: "error", message: error instanceof Error ? error.message : "Não foi possível alterar o item." });
    }
  };

  const createTemplate = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await fetch("/api/checklists/templates", {
        method: "POST",
        headers,
        body: JSON.stringify({ ...newItem, unidadeId: selectedUnit, versaoChecklist: configuration?.versaoChecklistAtiva, obrigatorio: true, exigeObservacaoNaoConforme: true, exigeAcaoCorretivaNaoConforme: true }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Cadastro rejeitado.");
      setNewItem({ codigo: "", categoria: "", descricao: "", bloqueiaVeiculo: false, exigeFotoNaoConforme: false });
      setNotification({ type: "success", message: "Item configurável criado. Ele não altera checklists históricos já iniciados." });
      await load();
    } catch (error) {
      setNotification({ type: "error", message: error instanceof Error ? error.message : "Não foi possível criar o item." });
    }
  };

  const saveConfiguration = async () => {
    if (!configuration) return;
    try {
      const response = await fetch("/api/checklists/configuracao", { method: "PUT", headers, body: JSON.stringify({ ...configuration, unidadeId: selectedUnit }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Configuração rejeitada.");
      setConfiguration(payload as ChecklistConfiguracao);
      setNotification({ type: "success", message: "Prazo semanal e versão ativa atualizados." });
      await load();
    } catch (error) {
      setNotification({ type: "error", message: error instanceof Error ? error.message : "Não foi possível salvar." });
    }
  };

  const filteredHistory = useMemo(() => history.filter((item) => {
    const term = historySearch.toLowerCase();
    return (!term || [item.protocolo, item.placaSnapshot, item.motoristaNomeSnapshot, item.responsavelNomeSnapshot].some((value) => value?.toLowerCase().includes(term))) &&
      (!historyStatus || item.status === historyStatus) &&
      (!historyStart || item.dataChecklist >= historyStart) &&
      (!historyEnd || item.dataChecklist <= historyEnd) &&
      (!historyWeek || item.identificadorSemana === historyWeek) &&
      (!historyVehicle || item.veiculoId === historyVehicle) &&
      (!historyDriver || item.motoristaId === historyDriver) &&
      (!historyResult || (historyResult === "NAO_CONFORME" ? item.resultado !== "CONFORME" : item.resultado === historyResult)) &&
      (!historyBlocked || item.bloqueouVeiculo);
  }), [history, historySearch, historyStatus, historyStart, historyEnd, historyWeek, historyVehicle, historyDriver, historyResult, historyBlocked]);

  if (loading && !weekly) return <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-slate-400"><RefreshCw className="h-5 w-5 animate-spin" /> Carregando checklist semanal...</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-slate-900 to-emerald-950/30 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Manutenção · segurança operacional</p>
          <h1 className="mt-1 text-2xl font-black text-white">Checklist Semanal</h1>
          <p className="mt-1 text-xs text-slate-400">Semana {weekly ? `${formatDate(weekly.semana.start)} a ${formatDate(weekly.semana.end)}` : "—"}</p>
        </div>
        <div className="flex rounded-xl border border-slate-800 bg-slate-950 p-1">
          {(["semana", "historico", "configuracao"] as const).map((item) => (
            <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-lg px-3 py-2 text-[10px] font-black uppercase ${tab === item ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}>{item === "historico" ? "Histórico" : item === "configuracao" ? "Configuração" : "Semana atual"}</button>
          ))}
        </div>
      </header>

      {tab === "semana" && weekly && (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            {[
              ["Veículos ativos", weekly.indicadores.totalVeiculosAtivos, Truck, "text-sky-400"],
              ["Realizados", weekly.indicadores.realizados, ClipboardCheck, "text-emerald-400"],
              ["Pendentes", weekly.indicadores.pendentes, FileClock, "text-amber-400"],
              ["Não conformes", weekly.indicadores.naoConformes, ShieldAlert, "text-orange-400"],
              ["Bloqueados", weekly.indicadores.bloqueados, AlertOctagon, "text-rose-400"],
              ["Conformidade", `${weekly.indicadores.conformidadePercentual}%`, Gauge, "text-violet-400"],
            ].map(([label, value, Icon, color]) => {
              const CardIcon = Icon as typeof Truck;
              return <div key={String(label)} className="rounded-xl border border-slate-800 bg-slate-900 p-4"><CardIcon className={`h-5 w-5 ${color}`} /><p className="mt-3 text-xl font-black text-white">{String(value)}</p><p className="text-[9px] font-bold uppercase text-slate-500">{String(label)}</p></div>;
            })}
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-950 text-[9px] uppercase text-slate-500"><tr><th className="p-4">Veículo</th><th className="p-4">Motorista atual/escalado</th><th className="p-4">Semana</th><th className="p-4">Checklist</th><th className="p-4">Resultado</th><th className="p-4 text-right">Ações</th></tr></thead>
                <tbody className="divide-y divide-slate-800/70">
                  {weekly.rows.map((row) => {
                    const activeBlock = row.bloqueios.some((block) => block.status === "ATIVO");
                    return (
                      <tr key={row.veiculo.id} className="hover:bg-slate-800/30">
                        <td className="p-4"><p className="font-mono font-black text-white">{row.veiculo.placa}</p><p className="text-[10px] text-slate-500">{row.veiculo.modelo}</p></td>
                        <td className="p-4"><p className="font-semibold text-slate-200">{row.motoristaMensagem}</p><p className="text-[9px] uppercase text-slate-500">{row.motoristaOrigem === "ROTA_ATIVA" ? `Operação ativa · DT ${row.rota?.dt || row.rota?.id}` : row.motoristaOrigem === "VINCULO_OFICIAL" ? "Vínculo oficial do veículo" : "Sem vínculo"}</p></td>
                        <td className="p-4 font-mono text-[10px] text-slate-400">{formatDate(row.semana.start)} a {formatDate(row.semana.end)}</td>
                        <td className="p-4"><span className={`rounded border px-2 py-1 text-[9px] font-black ${row.checklist ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-amber-500/20 bg-amber-500/10 text-amber-300"}`}>{labelStatus(row.checklist?.status)}</span></td>
                        <td className="p-4">{activeBlock ? <span className="font-black text-rose-400">VEÍCULO BLOQUEADO</span> : <span className="text-slate-300">{labelStatus(row.checklist?.resultado)}</span>}</td>
                        <td className="p-4 text-right">{row.checklist ? <div className="flex justify-end gap-2"><button type="button" onClick={() => openChecklist(row.checklist!.id)} className="rounded-lg border border-slate-700 px-3 py-2 font-bold text-slate-200">Visualizar</button>{row.checklist.pdfUrl && <button type="button" onClick={() => openDocumentOrNotify(row.checklist?.pdfUrl)} className="rounded-lg bg-sky-600 px-3 py-2 font-bold text-white">PDF</button>}</div> : <button type="button" onClick={() => startChecklist(row.veiculo.id)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 font-black text-white"><Plus className="h-4 w-4" /> Iniciar</button>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {weekly.rows.length === 0 && <div className="p-10 text-center text-sm text-slate-500">Nenhum veículo ativo nesta unidade.</div>}
          </section>
        </>
      )}

      {tab === "historico" && (
        <section className="space-y-4">
          <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-4">
            <label className="relative md:col-span-2"><Filter className="absolute left-3 top-3 h-4 w-4 text-slate-500" /><input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Protocolo, placa, motorista ou responsável" className="min-h-10 w-full rounded-lg border border-slate-800 bg-slate-950 pl-10 pr-3 text-xs text-white" /></label>
            <select value={historyStatus} onChange={(event) => setHistoryStatus(event.target.value)} className="rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white"><option value="">Todos os status</option>{["PENDENTE", "EM_ANDAMENTO", "CONFORME", "COM_PENDENCIAS", "BLOQUEADO", "AGUARDANDO_MANUTENCAO", "AGUARDANDO_REINSPECAO", "LIBERADO", "CANCELADO"].map((status) => <option key={status} value={status}>{labelStatus(status)}</option>)}</select>
            <select value={historyResult} onChange={(event) => setHistoryResult(event.target.value)} className="rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white"><option value="">Todos os resultados</option><option value="CONFORME">Conforme</option><option value="NAO_CONFORME">Com pendência / bloqueado</option></select>
            <label className="text-[9px] uppercase text-slate-500">Período inicial<input type="date" value={historyStart} onChange={(event) => setHistoryStart(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white" /></label>
            <label className="text-[9px] uppercase text-slate-500">Período final<input type="date" value={historyEnd} onChange={(event) => setHistoryEnd(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white" /></label>
            <select value={historyWeek} onChange={(event) => setHistoryWeek(event.target.value)} className="mt-4 min-h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white"><option value="">Todas as semanas</option>{Array.from(new Set<string>(history.map((item) => item.identificadorSemana))).map((week) => <option key={week} value={week}>{week.replace("_", " a ")}</option>)}</select>
            <label className="mt-4 flex min-h-10 items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-rose-300"><input type="checkbox" checked={historyBlocked} onChange={(event) => setHistoryBlocked(event.target.checked)} /> Somente bloqueados</label>
            <select value={historyVehicle} onChange={(event) => setHistoryVehicle(event.target.value)} className="min-h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white"><option value="">Todos os veículos</option>{Array.from(new Map(history.map((item) => [item.veiculoId, item.placaSnapshot])).entries()).map(([id, plate]) => <option key={id} value={id}>{plate}</option>)}</select>
            <select value={historyDriver} onChange={(event) => setHistoryDriver(event.target.value)} className="min-h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white"><option value="">Todos os motoristas</option>{Array.from(new Map(history.filter((item) => item.motoristaId).map((item) => [item.motoristaId!, item.motoristaNomeSnapshot || item.motoristaId!])).entries()).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-950 text-[9px] uppercase text-slate-500"><tr><th className="p-4">Protocolo</th><th className="p-4">Data/semana</th><th className="p-4">Veículo</th><th className="p-4">Motorista snapshot</th><th className="p-4">Status</th><th className="p-4 text-right">Ações</th></tr></thead><tbody className="divide-y divide-slate-800">{filteredHistory.map((item) => <tr key={item.id}><td className="p-4 font-mono font-bold text-white">{item.protocolo || "Rascunho"}{item.checklistOriginalId && <span className="ml-2 text-[8px] text-sky-400">REINSPEÇÃO {item.numeroReinspecao}</span>}</td><td className="p-4 text-slate-400">{formatDate(item.dataChecklist)}<p className="text-[9px]">{formatDate(item.dataInicioSemana)} a {formatDate(item.dataFimSemana)}</p></td><td className="p-4 font-mono text-white">{item.placaSnapshot}</td><td className="p-4 text-slate-300">{item.motoristaNomeSnapshot || "Sem motorista"}</td><td className="p-4"><span className="text-[9px] font-black text-slate-300">{labelStatus(item.status)}</span></td><td className="p-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => openChecklist(item.id)} className="rounded border border-slate-700 px-3 py-2">Ver</button><button type="button" onClick={() => openDocumentOrNotify(item.pdfUrl)} className="rounded bg-sky-600 px-3 py-2 text-white"><FileText className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div>{filteredHistory.length === 0 && <p className="p-10 text-center text-sm text-slate-500">Nenhum checklist encontrado.</p>}</div>
        </section>
      )}

      {tab === "configuracao" && configuration && (
        <section className="space-y-5">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-100"><strong>Modelo inicial configurável:</strong> estes itens não são apresentados como checklist oficial Heineken. A operação deve validar/substituir o conteúdo ao receber a versão oficial controlada.</div>
          <div className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-5">
            <label className="text-[10px] text-slate-400">Dia inicial (0–6)<input type="number" min="0" max="6" value={configuration.diaInicialSemana} onChange={(event) => setConfiguration({ ...configuration, diaInicialSemana: Number(event.target.value) })} className="mt-1 w-full rounded border border-slate-800 bg-slate-950 p-2 text-white" /></label>
            <label className="text-[10px] text-slate-400">Dia do prazo (0–6)<input type="number" min="0" max="6" value={configuration.prazoDiaSemana} onChange={(event) => setConfiguration({ ...configuration, prazoDiaSemana: Number(event.target.value) })} className="mt-1 w-full rounded border border-slate-800 bg-slate-950 p-2 text-white" /></label>
            <label className="text-[10px] text-slate-400">Horário limite<input type="time" value={configuration.prazoHorario} onChange={(event) => setConfiguration({ ...configuration, prazoHorario: event.target.value })} className="mt-1 w-full rounded border border-slate-800 bg-slate-950 p-2 text-white" /></label>
            <label className="text-[10px] text-slate-400">Tolerância (min)<input type="number" min="0" value={configuration.toleranciaMinutos} onChange={(event) => setConfiguration({ ...configuration, toleranciaMinutos: Number(event.target.value) })} className="mt-1 w-full rounded border border-slate-800 bg-slate-950 p-2 text-white" /></label>
            <label className="text-[10px] text-slate-400">Versão ativa<input value={configuration.versaoChecklistAtiva} onChange={(event) => setConfiguration({ ...configuration, versaoChecklistAtiva: event.target.value })} className="mt-1 w-full rounded border border-slate-800 bg-slate-950 p-2 text-white" /></label>
            <button type="button" onClick={saveConfiguration} className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-black text-white md:col-span-5"><Settings2 className="h-4 w-4" /> SALVAR CONFIGURAÇÃO</button>
          </div>
          <form onSubmit={createTemplate} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-6">
            <h2 className="text-sm font-black text-white md:col-span-6">Adicionar item à versão ativa</h2>
            <input required value={newItem.codigo} onChange={(event) => setNewItem({ ...newItem, codigo: event.target.value })} placeholder="Código" className="rounded border border-slate-800 bg-slate-950 p-2 text-xs text-white" />
            <input required value={newItem.categoria} onChange={(event) => setNewItem({ ...newItem, categoria: event.target.value })} placeholder="Categoria" className="rounded border border-slate-800 bg-slate-950 p-2 text-xs text-white" />
            <input required value={newItem.descricao} onChange={(event) => setNewItem({ ...newItem, descricao: event.target.value })} placeholder="Descrição" className="rounded border border-slate-800 bg-slate-950 p-2 text-xs text-white md:col-span-2" />
            <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={newItem.exigeFotoNaoConforme} onChange={(event) => setNewItem({ ...newItem, exigeFotoNaoConforme: event.target.checked })} /> Exige foto</label>
            <label className="flex items-center gap-2 text-xs text-rose-300"><input type="checkbox" checked={newItem.bloqueiaVeiculo} onChange={(event) => setNewItem({ ...newItem, bloqueiaVeiculo: event.target.checked })} /> Bloqueador</label>
            <button className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-black text-white md:col-span-6">ADICIONAR ITEM</button>
          </form>
          <div className="space-y-2">{templates.map((item) => { const lockedGlobal = !item.unidadeId && currentUser.tipo_usuario !== "MASTER" && currentUser.perfil !== "admin_master"; return <div key={item.id} className="grid items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-[110px_160px_1fr_auto_auto]"><span className="font-mono text-xs font-black text-white">{item.codigo}{!item.unidadeId && <small className="block text-[8px] text-slate-500">GLOBAL</small>}</span><span className="text-xs text-slate-400">{item.categoria}</span><span className="text-xs text-slate-200">{item.descricao}</span><button disabled={lockedGlobal} type="button" onClick={() => updateTemplate(item, { bloqueiaVeiculo: !item.bloqueiaVeiculo })} className={`rounded border px-3 py-2 text-[9px] font-black disabled:opacity-40 ${item.bloqueiaVeiculo ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : "border-slate-700 text-slate-400"}`}>{item.bloqueiaVeiculo ? "BLOQUEADOR" : "NÃO BLOQUEIA"}</button><button disabled={lockedGlobal} type="button" onClick={() => updateTemplate(item, { ativo: !item.ativo })} className={`rounded border px-3 py-2 text-[9px] font-black disabled:opacity-40 ${item.ativo ? "border-emerald-500/30 text-emerald-300" : "border-slate-700 text-slate-500"}`}>{item.ativo ? "ATIVO" : "INATIVO"}</button></div>; })}</div>
        </section>
      )}

      {detail && <ChecklistEditor detail={detail} currentUser={currentUser} selectedUnit={selectedUnit} onClose={() => setDetail(null)} onChanged={(updated) => { if (updated) setDetail(updated); void load(); }} />}
      <NotificationModal notification={notification} onClose={() => setNotification(null)} />
    </div>
  );
}
