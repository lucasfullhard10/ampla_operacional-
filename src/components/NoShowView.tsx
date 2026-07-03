import React, { useState, useMemo, useEffect } from "react";
import { 
  ShieldAlert, 
  Plus, 
  Edit2, 
  Trash2, 
  Calendar, 
  ClipboardList, 
  CheckCircle2, 
  X, 
  Search, 
  AlertTriangle, 
  Truck, 
  User, 
  Building, 
  FileText,
  Clock,
  ArrowRight,
  Info
} from "lucide-react";
import { Rota, Motorista, Veiculo, Unidade } from "../types";

interface NoShowViewProps {
  rotas: Rota[];
  veiculos: Veiculo[];
  motoristas: Motorista[];
  unidades: Unidade[];
  noShows: any[];
  userEmail: string;
  onRefresh: () => void;
}

export default function NoShowView({
  rotas,
  veiculos,
  motoristas,
  unidades,
  noShows = [],
  userEmail,
  onRefresh
}: NoShowViewProps) {
  // Tabs & Views State
  const [activeTab, setActiveTab] = useState<"lista" | "relatorios">("lista");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields State
  const [selectedDt, setSelectedDt] = useState("");
  const [motoristaId, setMotoristaId] = useState("");
  const [motoristaNome, setMotoristaNome] = useState("");
  const [veiculoId, setVeiculoId] = useState("");
  const [veiculoModelo, setVeiculoModelo] = useState("");
  const [placa, setPlaca] = useState("");
  const [unidadeId, setUnidadeId] = useState("");
  const [unidadeNome, setUnidadeNome] = useState("");
  const [transportador, setTransportador] = useState("");
  
  const [statusNoShow, setStatusNoShow] = useState<"Aberto" | "Resolvido" | "Não Resolvido">("Aberto");
  const [motoristaSubstituto, setMotoristaSubstituto] = useState("");
  const [veiculoSubstituto, setVeiculoSubstituto] = useState("");
  const [transportadorSubstituto, setTransportadorSubstituto] = useState("");
  const [quemAssumiuCarga, setQuemAssumiuCarga] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [dataOcorrencia, setDataOcorrencia] = useState("");

  // Filters State
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [searchDt, setSearchDt] = useState("");
  const [searchMotorista, setSearchMotorista] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Validation / Feedback State
  const [notification, setNotification] = useState<{ type: "success" | "error" | "warning"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Compute Dashboard Indicators
  const stats = useMemo(() => {
    const total = noShows.length;
    const resolvidos = noShows.filter(n => n.statusNoShow === "Resolvido").length;
    const naoResolvidos = noShows.filter(n => n.statusNoShow === "Não Resolvido").length;
    const abertos = noShows.filter(n => n.statusNoShow === "Aberto").length;
    return { total, resolvidos, naoResolvidos, abertos };
  }, [noShows]);

  // Handle DT Selection on Register Form
  const handleDtChange = (dtNum: string) => {
    setSelectedDt(dtNum);
    if (!dtNum) {
      setMotoristaId("");
      setMotoristaNome("");
      setVeiculoId("");
      setVeiculoModelo("");
      setPlaca("");
      setUnidadeId("");
      setUnidadeNome("");
      setTransportador("");
      return;
    }

    const rotaMatch = rotas.find(r => r.dt === dtNum);
    if (rotaMatch) {
      const mot = motoristas.find(m => m.id === rotaMatch.motoristaId);
      const veic = veiculos.find(v => v.id === rotaMatch.veiculoId);
      const unit = unidades.find(u => u.id === rotaMatch.unidadeId);

      setMotoristaId(rotaMatch.motoristaId || "");
      setMotoristaNome(mot ? mot.nome : (rotaMatch.motoristaId || "N/A"));
      setVeiculoId(rotaMatch.veiculoId || "");
      setVeiculoModelo(veic ? `${veic.marca} ${veic.modelo}` : "N/A");
      setPlaca(veic ? veic.placa : (rotaMatch.veiculoId || "N/A"));
      setUnidadeId(rotaMatch.unidadeId || "");
      setUnidadeNome(unit ? unit.nome : "N/A");
      setTransportador(veic ? veic.tipo : "Terceiro");
    }
  };

  // Pre-fill editable fields on Status "Resolvido"
  useEffect(() => {
    if (statusNoShow !== "Resolvido") {
      setMotoristaSubstituto("");
      setVeiculoSubstituto("");
      setTransportadorSubstituto("");
      setQuemAssumiuCarga("");
    }
  }, [statusNoShow]);

  // Save / Post No Show
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDt) {
      setNotification({ type: "error", message: "É obrigatório vincular o registro a uma DT cadastrada." });
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        dt: selectedDt,
        motoristaId,
        veiculoId,
        placa,
        unidadeId,
        transportador,
        statusNoShow,
        data: dataOcorrencia || new Date().toISOString().split("T")[0],
        motoristaSubstituto,
        veiculoSubstituto,
        transportadorSubstituto,
        observacoes,
        quemAssumiuCarga // maps to quemAssumiuCarga / registrar quem assumiu a carga
      };

      let response;
      if (editingId) {
        response = await fetch(`/api/noshows/${editingId}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "x-user-email": userEmail
          },
          body: JSON.stringify(body)
        });
      } else {
        response = await fetch("/api/noshows", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-user-email": userEmail
          },
          body: JSON.stringify(body)
        });
      }

      if (response.ok) {
        setNotification({
          type: "success",
          message: editingId 
            ? "Registro de No Show alterado com sucesso."
            : "Registro de No Show inserido com absoluto sucesso operacional!"
        });
        setIsModalOpen(false);
        resetForm();
        onRefresh();
      } else {
        const err = await response.json();
        throw new Error(err.error || "Falha na comunicação.");
      }
    } catch (err: any) {
      setNotification({ type: "error", message: `Erro ao salvar: ${err.message}` });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modalities
  const handleStartEdit = (ns: any) => {
    setEditingId(ns.id);
    setSelectedDt(ns.dt);
    setMotoristaId(ns.motoristaId || "");
    setMotoristaNome(motoristas.find(m => m.id === ns.motoristaId)?.nome || ns.motoristaId || "");
    setVeiculoId(ns.veiculoId || "");
    setVeiculoModelo(veiculos.find(v => v.id === ns.veiculoId)?.modelo || "");
    setPlaca(ns.placa || "");
    setUnidadeId(ns.unidadeId || "");
    setUnidadeNome(unidades.find(u => u.id === ns.unidadeId)?.nome || "");
    setTransportador(ns.transportador || "");
    setStatusNoShow(ns.statusNoShow || "Aberto");
    setMotoristaSubstituto(ns.motoristaSubstituto || "");
    setVeiculoSubstituto(ns.veiculoSubstituto || "");
    setTransportadorSubstituto(ns.transportadorSubstituto || "");
    setQuemAssumiuCarga(ns.quemAssumiuCarga || "");
    setObservacoes(ns.observacoes || "");
    setDataOcorrencia(ns.data || "");
    setIsModalOpen(true);
  };

  // Delete No Show
  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este registro de No Show de forma definitiva sob auditoria real?")) {
      return;
    }

    try {
      const response = await fetch(`/api/noshows/${id}`, {
        method: "DELETE",
        headers: { "x-user-email": userEmail }
      });
      if (response.ok) {
        setNotification({ type: "success", message: "Registro excluído com sucesso." });
        onRefresh();
      } else {
        throw new Error("Não foi possível excluir.");
      }
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setSelectedDt("");
    setMotoristaId("");
    setMotoristaNome("");
    setVeiculoId("");
    setVeiculoModelo("");
    setPlaca("");
    setUnidadeId("");
    setUnidadeNome("");
    setTransportador("");
    setStatusNoShow("Aberto");
    setMotoristaSubstituto("");
    setVeiculoSubstituto("");
    setTransportadorSubstituto("");
    setQuemAssumiuCarga("");
    setObservacoes("");
    setDataOcorrencia(new Date().toISOString().split("T")[0]);
  };

  const openNewModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Filtering Rows
  const filteredNoShows = useMemo(() => {
    return noShows.filter(ns => {
      const matchesStatus = filterStatus === "Todos" || ns.statusNoShow === filterStatus;
      
      const matchesDt = !searchDt || ns.dt.toLowerCase().includes(searchDt.toLowerCase());

      const motName = motoristas.find(m => m.id === ns.motoristaId)?.nome || ns.motoristaId || "";
      const matchesMotorista = !searchMotorista || motName.toLowerCase().includes(searchMotorista.toLowerCase());

      const nsDate = ns.data || "";
      const matchesStartDate = !filterStartDate || nsDate >= filterStartDate;
      const matchesEndDate = !filterEndDate || nsDate <= filterEndDate;

      return matchesStatus && matchesDt && matchesMotorista && matchesStartDate && matchesEndDate;
    });
  }, [noShows, filterStatus, searchDt, searchMotorista, filterStartDate, filterEndDate, motoristas]);

  return (
    <div className="space-y-6">
      
      {/* NOTIFICATION FEEDBACK */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 transition-all duration-300 ${
          notification.type === "success" 
            ? "bg-emerald-955/20 border-emerald-500/25 text-emerald-400" 
            : notification.type === "warning"
            ? "bg-amber-950/20 border-amber-500/25 text-amber-300"
            : "bg-rose-950/20 border-rose-500/25 text-rose-400"
        }`}>
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <p className="text-xs font-medium font-sans leading-relaxed">{notification.message}</p>
        </div>
      )}

      {/* OPERATIONAL METRICS BENTO GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Registros de No Show</span>
            <h3 className="text-2xl font-black text-rose-400 leading-none">{stats.total}</h3>
            <span className="text-[9px] text-slate-550 block font-mono">Indicador geral de ocorrências</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-500/5 border border-rose-500/10 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider block">Em Aberto 🟡</span>
            <h3 className="text-2xl font-black text-amber-400 leading-none">{stats.abertos}</h3>
            <span className="text-[9px] text-slate-500 block font-mono">Aguardando definição/substitutos</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/5 border border-amber-500/10 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider block">Resolvido 🟢</span>
            <h3 className="text-2xl font-black text-emerald-400 leading-none">{stats.resolvidos}</h3>
            <span className="text-[9px] text-slate-500 block font-mono">Carga com motoristas substitutos</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider block">Não Resolvidos 🔴</span>
            <h3 className="text-2xl font-black text-rose-550 leading-none">{stats.naoResolvidos}</h3>
            <span className="text-[9px] text-slate-500 block font-mono">Requer atenção imediata</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-500/5 border border-rose-500/20 flex items-center justify-center text-rose-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* FILTER CONTROLS HUB */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("lista")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-sans tracking-wide transition-all ${
                activeTab === "lista"
                  ? "bg-sky-600/15 text-sky-455 border border-sky-505/20"
                  : "text-slate-400 border border-transparent hover:text-white"
              }`}
            >
              📋 Monitoramento No Show
            </button>
            <button
              onClick={() => setActiveTab("relatorios")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-sans tracking-wide transition-all ${
                activeTab === "relatorios"
                  ? "bg-sky-600/15 text-sky-455 border border-sky-505/20"
                  : "text-slate-400 border border-transparent hover:text-white"
              }`}
            >
              📊 Relatório de Ocorrências No Show
            </button>
          </div>

          <button
            onClick={openNewModal}
            className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-4.5 py-2 rounded-lg flex items-center gap-1.5 self-start cursor-pointer group shadow"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
            Registrar No Show
          </button>
        </div>

        {/* Search Inputs Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 text-xs">
          
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block font-mono">Buscar por DT</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ex: DT-2026-061"
                value={searchDt}
                onChange={e => setSearchDt(e.target.value)}
                className="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded px-2.5 py-1.5 focus:border-sky-500 focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-600 absolute right-2.5 top-2.5" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block font-mono">Buscar Motorista</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Nome do motorista..."
                value={searchMotorista}
                onChange={e => setSearchMotorista(e.target.value)}
                className="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded px-2.5 py-1.5 focus:border-sky-500 focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-600 absolute right-2.5 top-2.5" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block font-mono">Status do No Show</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full bg-slate-950 text-sky-400 border border-slate-800 rounded px-2.5 py-1.5 focus:border-sky-500 focus:outline-none"
            >
              <option value="Todos">★ Filtrar status (Todos)</option>
              <option value="Aberto">🟡 Aberto</option>
              <option value="Resolvido">🟢 Resolvido</option>
              <option value="Não Resolvido">🔴 Não Resolvido</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block font-mono">Data Início</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={e => setFilterStartDate(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded px-2.5 py-1 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block font-mono">Data Fim</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={e => setFilterEndDate(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded px-2.5 py-1 focus:border-sky-500 focus:outline-none"
            />
          </div>

        </div>

      </div>

      {/* CORE CONTENT LAYOUTS */}
      {activeTab === "lista" ? (
        
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900 text-xs font-sans">
          <div className="overflow-x-auto">
            <table className="w-full text-left leading-relaxed border-collapse">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-850 font-mono text-[10px] tracking-wider uppercase select-none">
                  <th className="py-3 px-4 pl-5">DT Vinculada</th>
                  <th className="py-3 px-3">Data No Show</th>
                  <th className="py-3 px-3">Motorista & Veículo Original</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Equipe Substituta / Resolução</th>
                  <th className="py-3 px-3">Observações</th>
                  <th className="py-3 px-4 pr-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60">
                {filteredNoShows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 italic font-medium">
                      Nenhum registro de No Show localizado com as credenciais aplicadas.
                    </td>
                  </tr>
                ) : (
                  filteredNoShows.map((ns) => {
                    const originalMotName = motoristas.find(m => m.id === ns.motoristaId)?.nome || ns.motoristaId || "Não Localizado";
                    const originalVeicName = veiculos.find(v => v.id === ns.veiculoId)?.modelo || ns.veiculoId || "Não Localizado";

                    const subMotName = motoristas.find(m => m.id === ns.motoristaSubstituto)?.nome || ns.motoristaSubstituto || ns.motoristaSubstituto;
                    const subVeicName = veiculos.find(v => v.id === ns.veiculoSubstituto)?.modelo || ns.veiculoSubstituto || ns.veiculoSubstituto;

                    let statusBadge = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                    let prefix = "🟡";
                    if (ns.statusNoShow === "Resolvido") {
                      statusBadge = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                      prefix = "🟢";
                    } else if (ns.statusNoShow === "Não Resolvido") {
                      statusBadge = "bg-rose-500/10 text-rose-455 border border-rose-505/20";
                      prefix = "🔴";
                    }

                    return (
                      <tr key={ns.id} className="hover:bg-slate-850/15 transition group text-slate-300">
                        
                        <td className="py-3.5 px-4 pl-5 font-bold text-white font-mono text-xs">
                          {ns.dt}
                        </td>

                        <td className="py-3.5 px-3 font-mono text-slate-400 text-[11px]">
                          {ns.data}
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-slate-200 block">{originalMotName}</span>
                            <span className="text-[10px] text-slate-450 block font-mono">
                              Placa: <b className="text-slate-300 uppercase">{ns.placa}</b> • {originalVeicName} ({ns.transportador})
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold ${statusBadge}`}>
                            {prefix} {ns.statusNoShow}
                          </span>
                        </td>

                        <td className="py-3.5 px-3">
                          {ns.statusNoShow === "Resolvido" ? (
                            <div className="space-y-1">
                              <span className="text-[10px] text-emerald-400 font-bold block uppercase tracking-wide">✔ Resolvido Operacionalmente</span>
                              <div className="text-[11px] text-slate-350 space-y-0.5">
                                <p className="leading-tight"><b className="text-slate-400">Substituto:</b> {subMotName || "Não Informado"}</p>
                                <p className="leading-none text-[10px] text-slate-500">
                                  Veículo: {subVeicName || "Próprio"} • Transp: {ns.transportadorSubstituto || "Prop."}
                                </p>
                                {ns.quemAssumiuCarga && (
                                  <p className="leading-tight text-[10px] text-sky-400 font-mono"><b className="text-slate-500">Assumiu:</b> {ns.quemAssumiuCarga}</p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic block">Pendente de substituição</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 max-w-xs text-slate-400 text-[11px]">
                          <div className="line-clamp-2 leading-tight">
                            {ns.observacoes || <span className="text-slate-600 italic">Sem observações cadastradas</span>}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 pr-5 text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleStartEdit(ns)}
                              title="Editar status ou substituto"
                              className="p-1 px-2 bg-slate-950 text-slate-400 hover:text-sky-400 rounded hover:bg-slate-800 border border-slate-850 cursor-pointer flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Editar</span>
                            </button>
                            <button
                              onClick={() => handleDelete(ns.id)}
                              title="Remover este No Show"
                              className="p-1 px-2 bg-slate-950 hover:bg-rose-950/10 text-slate-500 hover:text-rose-400 rounded border border-slate-850 cursor-pointer flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remover</span>
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      ) : (
        
        /* DETAILED REPORTS AND METRIC QUERIES TAB */
        <div className="space-y-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white tracking-tight">Estadísticas e Métricas Operacionais de No Show</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="bg-slate-950 border border-slate-850/60 rounded-lg p-4">
                <h4 className="text-[11px] font-bold text-rose-400 uppercase tracking-widest mb-3">📍 DTs com No Show Total</h4>
                <p className="text-3xl font-black text-rose-300 leading-none">{stats.total}</p>
                <span className="text-[9px] text-slate-500 font-mono block mt-2">100% dos eventos registrados no banco real.</span>
              </div>

              <div className="bg-slate-950 border border-slate-850/60 rounded-lg p-4">
                <h4 className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest mb-3">✅ No Shows com Resolução</h4>
                <p className="text-3xl font-black text-emerald-300 leading-none">{stats.resolvidos}</p>
                <span className="text-[9px] text-slate-550 font-mono block mt-2">
                  Taxa de resolução: {stats.total > 0 ? Math.round((stats.resolvidos / stats.total) * 100) : 0}% de eficiência de frota.
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-850/60 rounded-lg p-4">
                <h4 className="text-[11px] font-bold text-amber-400 uppercase tracking-widest mb-3">⏳ Pendências em aberto</h4>
                <p className="text-3xl font-black text-amber-300 leading-none">{stats.abertos + stats.naoResolvidos}</p>
                <span className="text-[9px] text-slate-500 font-mono block mt-2">No shows aguardando motorista substituto para liberação de carga.</span>
              </div>

            </div>

            {/* Structured Report List */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-300">Auditoria Completa de Rotas Afetadas por No Show</h4>
              
              <div className="space-y-2">
                {filteredNoShows.map(ns => {
                  const mot = motoristas.find(m => m.id === ns.motoristaId)?.nome || ns.motoristaId;
                  const unit = unidades.find(u => u.id === ns.unidadeId)?.nome || ns.unidadeId;
                  const sMot = motoristas.find(m => m.id === ns.motoristaSubstituto)?.nome || ns.motoristaSubstituto;

                  return (
                    <div key={ns.id} className="bg-slate-950 p-3 rounded-lg border border-slate-850/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px]">
                      <div>
                        <span className="font-bold text-white">DT: {ns.dt}</span> <span className="text-slate-600">|</span> <span className="text-slate-400">Filial: {unit}</span>
                        <div className="mt-1 text-slate-500">
                          Motorista No Show: <b className="text-slate-350">{mot}</b> ({ns.placa})
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          ns.statusNoShow === "Resolvido" 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" 
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/10"
                        }`}>
                          {ns.statusNoShow}
                        </span>
                        {ns.statusNoShow === "Resolvido" ? (
                          <div className="text-slate-400 font-mono text-[10px]">
                            👉 Assumido por: <b className="text-emerald-450">{sMot}</b>
                          </div>
                        ) : (
                          <span className="text-rose-400 font-mono text-[9px] animate-pulse">⚡ Requer Equipe Substituta</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

          </div>

        </div>

      )}

      {/* NEW & EDIT NO SHOW REGISTRATION OVERLAY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-xs max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-slate-950 px-5 py-4.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-455 animate-pulse" />
                <div>
                  <h3 className="text-white font-bold leading-none">{editingId ? "Editar Registro No Show" : "Registrar No Show (Controle Técnico)"}</h3>
                  <span className="text-[9px] text-slate-500 font-mono tracking-wide mt-1 block">Vinculação direta com viagens (DT) e frotas</span>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 px-1.5 hover:bg-slate-800/85 text-slate-400 hover:text-white rounded transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-300">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* select DT option */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 font-bold uppercase tracking-widest block font-mono">Número da DT *</label>
                  <select
                    required
                    value={selectedDt}
                    onChange={e => handleDtChange(e.target.value)}
                    disabled={!!editingId}
                    className="w-full bg-slate-950 text-sky-400 font-bold border border-slate-800 rounded px-2.5 py-2 focus:border-sky-500 focus:outline-none uppercase cursor-pointer"
                  >
                    <option value="">-- Selecione uma DT Ativa --</option>
                    {rotas.map(r => (
                      <option key={r.id} value={r.dt}>
                        {r.dt} - {motoristas.find(m => m.id === r.motoristaId)?.nome || r.motoristaId}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 font-bold uppercase tracking-widest block font-mono">Data do Ocorrido</label>
                  <input
                    type="date"
                    value={dataOcorrencia}
                    onChange={e => setDataOcorrencia(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded px-2.5 py-1.5 focus:border-sky-500 focus:outline-none"
                  />
                </div>

              </div>

              {/* AUTO EXTRACTED INFORMATION DISPLAY INFOBOX */}
              {selectedDt && (
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl space-y-2">
                  <span className="text-[9px] text-sky-400 font-bold font-mono tracking-widest uppercase block">📥 Dados coletados do Manifesto Realizado:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] leading-tight text-slate-400">
                    <div>
                      <p className="text-[9px] text-slate-600 block uppercase font-bold font-mono leading-none">Condutor Original</p>
                      <span className="font-semibold text-slate-300 block mt-0.5">{motoristaNome}</span>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-600 block uppercase font-bold font-mono leading-none">Veículo / Modelo</p>
                      <span className="font-semibold text-slate-300 block mt-0.5">{veiculoModelo}</span>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-600 block uppercase font-bold font-mono leading-none">Placa</p>
                      <span className="font-semibold text-slate-300 block font-mono mt-0.5 uppercase">{placa}</span>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-600 block uppercase font-bold font-mono leading-none">Unidade Logística</p>
                      <span className="font-semibold text-slate-300 block mt-0.5">{unidadeNome}</span>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-600 block uppercase font-bold font-mono leading-none">Transportador</p>
                      <span className="font-semibold text-slate-300 block mt-0.5">{transportador}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STATUS DE NO SHOW FIELD */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-450 font-bold uppercase tracking-widest block font-mono">STATUS DO NO SHOW</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: "Aberto", label: "🟡 Aberto", desc: "Sem equipe substituta" },
                    { val: "Resolvido", label: "🟢 Resolvido", desc: "Equipe cadastrada" },
                    { val: "Não Resolvido", label: "🔴 Não Resolvido", desc: "Sem solução possível" },
                  ].map(op => {
                    const active = statusNoShow === op.val;
                    return (
                      <button
                        key={op.val}
                        type="button"
                        onClick={() => setStatusNoShow(op.val as any)}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between cursor-pointer transition-all ${
                          active 
                            ? "bg-slate-950 border-sky-505/30 text-sky-400 ring-1 ring-sky-505/30" 
                            : "bg-slate-950/20 border-slate-800 text-slate-505 hover:text-slate-300"
                        }`}
                      >
                        <span className="font-bold tracking-wide">{op.label}</span>
                        <span className="text-[8px] text-slate-500 mt-1 leading-tight">{op.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SUBSTITUTE FIELDS: CONDITIONAL TO STATUS = RESOLVIDO */}
              {statusNoShow === "Resolvido" && (
                <div className="bg-slate-950/40 border border-emerald-500/10 p-4 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center gap-1.5 border-b border-slate-850 pb-1.5 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400 font-bold font-mono uppercase tracking-widest">
                      📋 Escala de Motorista Substituto (DT Resolvida):
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block font-mono">Motorista Substituto *</label>
                      <select
                        required={statusNoShow === "Resolvido"}
                        value={motoristaSubstituto}
                        onChange={e => setMotoristaSubstituto(e.target.value)}
                        className="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded px-2.5 py-1.5 focus:border-sky-500 focus:outline-none cursor-pointer"
                      >
                        <option value="">-- Selecione Condutor Reserva --</option>
                        {motoristas
                          .filter(m => m.id !== motoristaId && m.statusFinal === "LIBERADO")
                          .map(m => (
                            <option key={m.id} value={m.id}>{m.nome} (Liberado)</option>
                          ))
                        }
                        {/* Fallback to text option in case client wants custom */}
                        <option value="custom_input">★ Digitado Manualmente...</option>
                      </select>
                      {/* Substituto custom text box if Custom type is opted */}
                      {motoristaSubstituto === "custom_input" && (
                        <input
                          type="text"
                          required
                          placeholder="Digite o nome completo do condutor..."
                          onChange={e => setMotoristaSubstituto(e.target.value)}
                          className="w-full mt-1.5 bg-slate-950 text-slate-200 border border-slate-800 rounded px-2.5 py-1.5 focus:border-sky-500 focus:outline-none"
                        />
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block font-mono">Veículo / Placa Substituto</label>
                      <select
                        value={veiculoSubstituto}
                        onChange={e => setVeiculoSubstituto(e.target.value)}
                        className="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded px-2.5 py-1.5 focus:border-sky-500 focus:outline-none cursor-pointer"
                      >
                        <option value="">-- Selecione Veículo Reserva --</option>
                        {veiculos
                          .filter(v => v.id !== veiculoId && v.status === "Liberado")
                          .map(v => (
                            <option key={v.id} value={v.id}>{v.placa} - {v.modelo} (Disponível)</option>
                          ))
                        }
                        <option value="custom_veic">★ Outro veículo (Digitar Placa)...</option>
                      </select>
                      {veiculoSubstituto === "custom_veic" && (
                        <input
                          type="text"
                          required
                          placeholder="Digite Placa ou descritivo do Frota..."
                          onChange={e => setVeiculoSubstituto(e.target.value)}
                          className="w-full mt-1.5 bg-slate-950 text-slate-200 border border-slate-800 rounded px-2.5 py-1.5 focus:border-sky-500 focus:outline-none uppercase"
                        />
                      )}
                    </div>

                    <div className="space-y-1 col-span-1 sm:col-span-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block font-mono">Transportador Substituto</label>
                          <input
                            type="text"
                            placeholder="Nome / Empresa Transportadora..."
                            value={transportadorSubstituto}
                            onChange={e => setTransportadorSubstituto(e.target.value)}
                            className="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded px-2.5 py-1.5 focus:border-sky-500 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block font-mono">Registrar quem assumiu a carga</label>
                          <input
                            type="text"
                            placeholder="Nome de quem assumiu a carga..."
                            value={quemAssumiuCarga}
                            onChange={e => setQuemAssumiuCarga(e.target.value)}
                            className="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded px-2.5 py-1.5 focus:border-sky-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* OBSERVACAO COMPLETA */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-450 font-bold uppercase tracking-widest block font-mono">Justificativa / Observações Gerais do No Show</label>
                <textarea
                  rows={3}
                  placeholder="Explique o motivo do No Show (Ex: Falta de comunicação, ausência inesperada, impossibilidade de contato, etc.)"
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded px-2.5 py-1.5 focus:border-sky-500 focus:outline-none"
                />
              </div>

            </form>

            {/* Modal Footer actions */}
            <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={submitting}
                className="px-4.5 py-2 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:opacity-55 text-white rounded-lg transition text-xs font-bold font-sans cursor-pointer shadow flex items-center gap-1.5"
              >
                {submitting ? "Gravando..." : editingId ? "Salvar Alterações" : "Gravar No Show"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
