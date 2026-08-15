import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Plus as LucidePlus, Search as LucideSearch, Edit as LucideEdit, Trash as LucideTrash, FileText as LucideFileText, 
  CheckCircle as LucideCheckCircle, Clock as LucideClock, AlertCircle as LucideAlertCircle, 
  MapPin as LucideMapPin, User as LucideUser, Truck as LucideTruck, DollarSign as LucideDollarSign, 
  X as LucideX, Layers as LucideLayers, RefreshCw as LucideRefreshCw, AlertTriangle as LucideAlertTriangle, 
  Calendar as LucideCalendar, Phone as LucidePhone, RotateCcw as LucideRotateCcw, Share2 as LucideShare2,
  Printer as LucidePrinter, Send as LucideSend, Copy as LucideCopy, Download as LucideDownload, Save, History,
  BarChart2, Filter, Eye, MessageSquare, ShieldCheck, CheckSquare, XCircle, ArrowRight, Package, UserMinus, Building, AlertOctagon, CornerDownLeft, Sparkles, Folder, Wrench, ChevronDown, ChevronUp, TrendingUp
} from "lucide-react";
import { toPng } from "html-to-image";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from "recharts";
import { Rota, Veiculo, Motorista, NotaFiscal, Unidade } from "../types";
import { NotificationModal, ConfirmModal, NotificationType, ConfirmType } from "./NotificationModal";
import SafeResponsiveContainer from "./SafeResponsiveContainer";

interface MonitoramentoProps {
  rotas: Rota[];
  veiculos: Veiculo[];
  motoristas: Motorista[];
  unidades?: Unidade[];
  onRefresh: () => void;
  userEmail: string;
  noShows?: any[];
}

const isVehicleBlocked = (v: any) => {
  if (v.status === "Bloqueado") return true;
  if (v.documentacaoStatus === "Pendente") return true;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const licDate = v.licenciamentoVencimento ? new Date(v.licenciamentoVencimento) : null;
  const segDate = v.seguroVencimento ? new Date(v.seguroVencimento) : null;
  const anttDate = v.anttVencimento ? new Date(v.anttVencimento) : null;
  const proxMaintDate = v.proximaManutencao ? new Date(v.proximaManutencao) : null;

  if (licDate && licDate < today) return true;
  if (segDate && segDate < today) return true;
  if (anttDate && anttDate < today) return true;
  if (proxMaintDate && proxMaintDate < today) return true;
  
  return false;
};

function getVehicleIcon(perfil?: string) {
  switch (perfil) {
    case "Van":
    case "Utilitário":
      return "🚐";
    case "VUC":
    case "3/4":
      return "🚚";
    default:
      return "🚛";
  }
};

export default function MonitoramentoView({ rotas, veiculos, motoristas, unidades = [], onRefresh, userEmail, noShows = [] }: MonitoramentoProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [errorMess, setErrorMess] = useState("");
  const [loading, setLoading] = useState(false);

  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmType | null>(null);

  // CREATE DT form states
  const [dt, setDt] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().split("T")[0]);
  const [veiculoId, setVeiculoId] = useState("");
  const [motoristaId, setMotoristaId] = useState("");
  const [tipo, setTipo] = useState<"Entrega" | "Recarga" | "Reentrega" | "Entrega OFF">("Entrega");
  const [reentregaValidadaState, setReentregaValidadaState] = useState<"Sim" | "Não">("Não");
  const [status, setStatus] = useState<"Aguardando carregamento" | "Em carregamento" | "Em rota" | "Em descarga" | "Finalizada">("Aguardando carregamento");
  const [statusViagem, setStatusViagem] = useState<string>("Aguardando Carregamento");
  const [totalEntregas, setTotalEntregas] = useState<number>(10);
  const [entregues, setEntregues] = useState<number>(0);
  const [devolucoes, setDevolucoes] = useState<number>(0);

  // Entrega OFF form states (Create)
  const [clienteCodigo, setClienteCodigo] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteCNPJ, setClienteCNPJ] = useState("");
  const [clienteEndereco, setClienteEndereco] = useState("");
  const [clienteCidade, setClienteCidade] = useState("");
  const [clienteUF, setClienteUF] = useState("");
  const [qtdNF, setQtdNF] = useState<number>(0);
  const [numerosNotas, setNumerosNotas] = useState<string[]>([]);
  const [valorTotalEntrega, setValorTotalEntrega] = useState<number>(0);
  const [qtdVolumes, setQtdVolumes] = useState<number>(0);
  const [observacoesEntrega, setObservacoesEntrega] = useState("");

  useEffect(() => {
    setNumerosNotas((prev) => {
      const next = [...prev];
      if (next.length < qtdNF) {
        while (next.length < qtdNF) {
          next.push("");
        }
      } else if (next.length > qtdNF) {
        next.splice(qtdNF);
      }
      return next;
    });
  }, [qtdNF]);

  // EDIT DT modal/sideover states
  const [editingRoute, setEditingRoute] = useState<Rota | null>(null);
  const [editVeiculoId, setEditVeiculoId] = useState("");
  const [editMotoristaId, setEditMotoristaId] = useState("");
  const [editData, setEditData] = useState("");
  const [editDataPrevista, setEditDataPrevista] = useState("");
  const [editStatusViagem, setEditStatusViagem] = useState("");
  const [editObservacoes, setEditObservacoes] = useState("");
  const [editTotalEntregas, setEditTotalEntregas] = useState(0);
  const [editEntregues, setEditEntregues] = useState(0);
  const [editRecusadas, setEditRecusadas] = useState(0);
  const [editDevolucoes, setEditDevolucoes] = useState(0);
  const [editReentregaValidadaState, setEditReentregaValidadaState] = useState<"Sim" | "Não">("Não");

  // Entrega OFF form states (Edit)
  const [editClienteCodigo, setEditClienteCodigo] = useState("");
  const [editClienteNome, setEditClienteNome] = useState("");
  const [editClienteCNPJ, setEditClienteCNPJ] = useState("");
  const [editClienteEndereco, setEditClienteEndereco] = useState("");
  const [editClienteCidade, setEditClienteCidade] = useState("");
  const [editClienteUF, setEditClienteUF] = useState("");
  const [editQtdNF, setEditQtdNF] = useState<number>(0);
  const [editNumerosNotas, setEditNumerosNotas] = useState<string[]>([]);
  const [editValorTotalEntrega, setEditValorTotalEntrega] = useState<number>(0);
  const [editQtdVolumes, setEditQtdVolumes] = useState<number>(0);
  const [editObservacoesEntrega, setEditObservacoesEntrega] = useState("");

  useEffect(() => {
    setEditNumerosNotas((prev) => {
      const next = [...prev];
      if (next.length < editQtdNF) {
        while (next.length < editQtdNF) {
          next.push("");
        }
      } else if (next.length > editQtdNF) {
        next.splice(editQtdNF);
      }
      return next;
    });
  }, [editQtdNF]);

  // OCORRÊNCIAS form states
  const [occurrenceRouteId, setOccurrenceRouteId] = useState<string | null>(null);
  const [occTipo, setOccTipo] = useState("Atraso");
  const [occDescricao, setOccDescricao] = useState("");
  const [occData, setOccData] = useState(() => new Date().toISOString().split("T")[0]);
  const [occHora, setOccHora] = useState("");

  // Deep search and filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterDt, setFilterDt] = useState("");
  const [filterVeiculo, setFilterVeiculo] = useState("");
  const [filterMotorista, setFilterMotorista] = useState("");
  const [filterUnidade, setFilterUnidade] = useState("");
  const [filterData, setFilterData] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Executive Operational Dashboard states
  const [dashPeriod, setDashPeriod] = useState<string>("hoje");
  const [dashStartDate, setDashStartDate] = useState<string>("");
  const [dashEndDate, setDashEndDate] = useState<string>("");
  const [dashTransportador, setDashTransportador] = useState<string>("");

  // Sub-entity states: Notas Fiscais selector drawer
  const [selectedDtId, setSelectedDtId] = useState<string | null>(null);

  // INTELLIGENT TEAM FORMATION SYSTEM (Fase 4)
  const [selectedAjudantesIds, setSelectedAjudantesIds] = useState<string[]>([]);
  const [suggestionPanelOpen, setSuggestionPanelOpen] = useState(false);
  const [suggestedHelpersList, setSuggestedHelpersList] = useState<any[]>([]);
  const [suggestedType, setSuggestedType] = useState<"fixos" | "gerais" | "nenhum">("nenhum");
  const [suggestionTarget, setSuggestionTarget] = useState<"create" | "edit">("create");
  const [allAvailabilities, setAllAvailabilities] = useState<any[]>([]);
  const [notesList, setNotesList] = useState<NotaFiscal[]>([]);
  const [newNoteNum, setNewNoteNum] = useState("");
  const [newNoteVal, setNewNoteVal] = useState<number>(0);
  const [newNoteCli, setNewNoteCli] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Collapsible DT segments detailed tables expanders
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null);
  const [expandedTab, setExpandedTab] = useState<"timeline" | "changelog" | "occurrences">("timeline");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [sharingRoute, setSharingRoute] = useState<Rota | null>(null);
  const [historyModalRoute, setHistoryModalRoute] = useState<Rota | null>(null);
  const [printLayoutActive, setPrintLayoutActive] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const getRouteStatusColor = (r: Rota) => {
    if (r.ocorrencias && r.ocorrencias.length > 0) {
      return {
        border: "border-l-red-500",
        bg: "bg-red-500/10",
        text: "text-red-400",
        indicator: "Ocorrência",
        hex: "#ef4444"
      };
    }
    const norm = (r.status_viagem || r.status || "").trim().toLowerCase();
    if (norm.includes("finalizada") || norm.includes("concluido") || norm.includes("concluída")) {
      return {
        border: "border-l-emerald-500",
        bg: "bg-emerald-500/10",
        text: "text-emerald-400",
        indicator: "Finalizada",
        hex: "#10b981"
      };
    }
    if (norm.includes("ag.descarga") || norm.includes("descarga") && norm.includes("aguardando")) {
      return {
        border: "border-l-amber-500",
        bg: "bg-amber-500/10",
        text: "text-amber-400",
        indicator: "Aguardando Descarga",
        hex: "#f59e0b"
      };
    }
    if (norm.includes("em rota") || norm.includes("trânsito") || norm.includes("transito")) {
      return {
        border: "border-l-blue-500",
        bg: "bg-blue-500/10",
        text: "text-blue-400",
        indicator: "Em Trânsito",
        hex: "#3b82f6"
      };
    }
    if (norm.includes("em descarga")) {
      return {
        border: "border-l-orange-500",
        bg: "bg-orange-500/10",
        text: "text-orange-400",
        indicator: "Em Descarga",
        hex: "#f97316"
      };
    }
    // Default
    return {
      border: "border-l-slate-550",
      bg: "bg-slate-500/10",
      text: "text-slate-400",
      indicator: "Aguardando Carregamento",
      hex: "#64748b"
    };
  };

  const mapStatusToSpec = (statusStr: string) => {
    const s = (statusStr || "").trim().toLowerCase();
    if (s.includes("finalizada") || s.includes("concluido") || s.includes("concluída")) {
      return { text: "Finalizada", emoji: "", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
    }
    if (s.includes("rota") || s.includes("trânsito") || s.includes("transito")) {
      return { text: "Em rota", emoji: "", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" };
    }
    if (s.includes("descarga")) {
      return { text: "Aguarda descarga", emoji: "", color: "text-amber-550 bg-amber-500/10 border-amber-500/20" };
    }
    if (s.includes("carregando") || s.includes("carregamento") || s.includes("carga")) {
      return { text: "Carregando", emoji: "", color: "text-sky-400 bg-sky-500/10 border-sky-500/20" };
    }
    return { text: "Parada", emoji: "", color: "text-rose-500 bg-rose-500/10 border-rose-500/20" };
  };

  const getTimelineSummary = (r: Rota) => {
    const h = r.historico_status || [];
    const creationEntry = h.find(log => {
      const s = (log.status || "").toLowerCase();
      return s.includes("aguardando") || s.includes("criação") || s.includes("criada");
    }) || h[0];
    const carregandoEntry = h.find(log => {
      const s = (log.status || "").toLowerCase();
      return s.includes("carregamento") || s.includes("carregando");
    });
    const rotaEntry = h.find(log => (log.status || "").toLowerCase().includes("rota"));
    const lastEntry = h[h.length - 1];

    return {
      saida: creationEntry ? creationEntry.hora : "08:10", // Real or typical creation fallback
      carregamento: carregandoEntry ? carregandoEntry.hora : "--:--",
      rota: rotaEntry ? rotaEntry.hora : "--:--",
      atualizacao: lastEntry ? lastEntry.hora : "--:--",
    };
  };

  // Format and render styled operation badges
  const renderOperationStatusBadge = (statusStr: string) => {
    const norm = (statusStr || "").trim().toLowerCase();
    
    if (norm === "aguardando carregamento" || norm === "ag. carregamento" || norm === "aguardando carga") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold font-mono bg-amber-500/10 text-amber-400 border border-amber-500/10 whitespace-nowrap">
          Ag. Carregamento
        </span>
      );
    }
    if (norm === "em carregamento") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold font-mono bg-blue-500/10 text-blue-450 border border-blue-500/10 whitespace-nowrap">
          Em Carregamento
        </span>
      );
    }
    if (norm === "em rota" || norm === "em rota (entregando)") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 whitespace-nowrap">
          Em Rota
        </span>
      );
    }
    if (norm === "aguardando descarga" || norm === "ag. descarga" || norm === "ag.descarga") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold font-mono bg-amber-500/15 text-orange-400 border border-amber-500/20 whitespace-nowrap">
          AG.DESCARGA
        </span>
      );
    }
    if (norm === "em descarga") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold font-mono bg-orange-500/10 text-orange-400 border border-orange-500/15 whitespace-nowrap">
          Em Descarga
        </span>
      );
    }
    if (norm === "cancelada") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold font-mono bg-red-500/15 text-rose-500 border border-red-500/20 whitespace-nowrap">
          Cancelada
        </span>
      );
    }
    if (norm === "veículo quebrado" || norm === "veiculo quebrado") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold font-mono bg-slate-950 text-slate-400 border border-slate-800 whitespace-nowrap animate-pulse">
          V. Quebrado
        </span>
      );
    }
    if (norm === "retorno base" || norm === "retorno a base" || norm === "retorno_base") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold font-mono bg-sky-500/10 text-sky-400 border border-sky-500/10 whitespace-nowrap">
          Retorno Base
        </span>
      );
    }
    if (norm === "finalizada") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold font-mono bg-emerald-500/10 text-emerald-450 border border-emerald-500/10 whitespace-nowrap">
          Finalizada
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold font-mono bg-slate-850 text-slate-300 border border-slate-700 whitespace-nowrap">
        {statusStr}
      </span>
    );
  };

  const resetForm = () => {
    setIsAdding(false);
    setErrorMess("");
    setDt("");
    setData(new Date().toISOString().split("T")[0]);
    setVeiculoId("");
    setMotoristaId("");
    setTipo("Entrega");
    setReentregaValidadaState("Não");
    setStatus("Aguardando carregamento");
    setStatusViagem("Aguardando Carregamento");
    setTotalEntregas(10);
    setEntregues(0);
    setDevolucoes(0);
    setSelectedAjudantesIds([]);
    setSuggestionPanelOpen(false);
    setSuggestedHelpersList([]);
    setSuggestedType("nenhum");
    
    // Reset Entrega OFF states
    setClienteCodigo("");
    setClienteNome("");
    setClienteCNPJ("");
    setClienteEndereco("");
    setClienteCidade("");
    setClienteUF("");
    setQtdNF(0);
    setNumerosNotas([]);
    setValorTotalEntrega(0);
    setQtdVolumes(0);
    setObservacoesEntrega("");
  };

  const handleTriggerSuggestions = async (driverId: string, travelDate: string, target: "create" | "edit") => {
    if (!driverId || !travelDate) {
      setSuggestedHelpersList([]);
      setSuggestedType("nenhum");
      return;
    }

    try {
      const res = await fetch(`/api/disponibilidade?date=${travelDate}`, {
        headers: { "x-user-email": userEmail }
      });
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const disps = await res.json() as any[];
        setAllAvailabilities(disps);

        const chosenDriver = motoristas.find(m => m.id === driverId);
        if (!chosenDriver) return;

        const targetUnit = chosenDriver.unidadeId || "un-go";

        // Filter active and eligible helpers belonging to the target unit
        const activeHelpers = motoristas.filter(m => 
          (m.tipo === "Ajudante Fixo" || m.tipo === "Ajudante Geral") &&
          m.statusFinal !== "BLOQUEADO" &&
          m.unidadeId === targetUnit
        );

        // Map helper records with their day-specific availability flag
        const helpersWithAvailability = activeHelpers.map(h => {
          const isAvailable = disps.some(d => d.motoristaId === h.id && d.data === travelDate);
          return { ...h, isAvailable };
        });

        // Split helpers list into Fixed linked vs General unlinked helpers
        const availableFixed = helpersWithAvailability.filter(h => {
          if (!h.isAvailable) return false;
          const linkedIds = h.motoristasVinculadosIds || (h.motoristaPreferencialId ? [h.motoristaPreferencialId] : []);
          return linkedIds.includes(driverId);
        });

        const availableGeneral = helpersWithAvailability.filter(h => {
          if (!h.isAvailable) return false;
          const linkedIds = h.motoristasVinculadosIds || (h.motoristaPreferencialId ? [h.motoristaPreferencialId] : []);
          return !linkedIds.includes(driverId);
        });

        setSuggestionTarget(target);
        setSuggestionPanelOpen(true);

        if (availableFixed.length > 0) {
          setSuggestedHelpersList(availableFixed);
          setSuggestedType("fixos");
          setSelectedAjudantesIds(availableFixed.map(x => x.id));
        } else if (availableGeneral.length > 0) {
          setSuggestedHelpersList(availableGeneral);
          setSuggestedType("gerais");
          setSelectedAjudantesIds([]);
        } else {
          setSuggestedHelpersList([]);
          setSuggestedType("nenhum");
          setSelectedAjudantesIds([]);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar sugestões:", err);
    }
  };

  useEffect(() => {
    if (isAdding && motoristaId && data) {
      handleTriggerSuggestions(motoristaId, data, "create");
    } else if (!isAdding) {
      setSuggestionPanelOpen(false);
    }
  }, [motoristaId, data, isAdding]);

  useEffect(() => {
    if (editingRoute && editMotoristaId && editData) {
      handleTriggerSuggestions(editMotoristaId, editData, "edit");
    } else if (!editingRoute) {
      setSuggestionPanelOpen(false);
    }
  }, [editMotoristaId, editData, editingRoute]);

  const renderIntelligentTeamSelectionPanel = (formTarget: "create" | "edit") => {
    if (!suggestionPanelOpen || suggestionTarget !== formTarget) return null;

    const currentDriverId = formTarget === "create" ? motoristaId : editMotoristaId;
    const currentDriver = motoristas.find(m => m.id === currentDriverId);
    if (!currentDriver) return null;

    const travelDate = formTarget === "create" ? data : editData;
    const targetUnit = currentDriver.unidadeId || "un-go";
    const otherAvailableHelpers = motoristas.filter(h => 
      (h.tipo === "Ajudante Fixo" || h.tipo === "Ajudante Geral") &&
      h.statusFinal !== "BLOQUEADO" &&
      h.unidadeId === targetUnit &&
      !selectedAjudantesIds.includes(h.id) &&
      allAvailabilities.some(d => d.motoristaId === h.id && d.data === travelDate)
    );

    return (
      <div className="border border-slate-800 bg-slate-950/40 p-3 rounded-lg space-y-3 mt-2 animate-fadeIn font-sans text-left">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-teal-400 font-bold font-mono text-[11px] uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" /> Formação de Equipe Inteligente
            </span>
          </div>
          <button 
            type="button" 
            onClick={() => setSuggestionPanelOpen(false)} 
            className="text-[10px] text-slate-500 hover:text-white"
          >
            Fechar ✕
          </button>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 font-mono block">Condutor:</span>
          <span className="text-xs font-bold text-slate-100">{currentDriver.nome}</span>
        </div>

        {suggestedType === "fixos" ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-2 rounded text-[10px] flex flex-col gap-0.5 font-semibold leading-normal">
            <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> VÍNCULO DIRETO DETECTADO</span>
            <span className="text-[9px] text-slate-400 font-normal">Ajudantes fixos disponíveis selecionados automaticamente!</span>
          </div>
        ) : suggestedType === "gerais" ? (
          <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-2 rounded text-[10px] flex flex-col gap-0.5 font-semibold leading-normal">
            <span className="flex items-center gap-1"><LucideUser className="w-3.5 h-3.5" /> AJUDANTES GERAIS DISPONÍVEIS</span>
            <span className="text-[9px] text-slate-400 font-normal">Nenhum ajudante fixo disponível. Mostrando ajudantes gerais aptos na filial.</span>
          </div>
        ) : (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-2 rounded text-[10px] flex flex-col gap-0.5 font-semibold leading-normal">
            <span className="flex items-center gap-1"><LucideAlertTriangle className="w-3.5 h-3.5" /> NENHUM RECOMENDADO DISPONÍVEL</span>
            <span className="text-[9px] text-slate-400 font-normal">Nenhum ajudante fixo ou geral cadastrado como disponível para este dia.</span>
          </div>
        )}

        {suggestedHelpersList.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-400 font-mono block font-bold text-slate-300">Ajudantes Disponíveis:</span>
            <div className="space-y-1 bg-slate-950/60 p-2 rounded max-h-32 overflow-y-auto border border-slate-900">
              {suggestedHelpersList.map(h => {
                const isChecked = selectedAjudantesIds.includes(h.id);
                const isFixed = h.tipo === "Ajudante Fixo";
                return (
                  <label key={h.id} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-slate-900 cursor-pointer text-xs">
                    <input 
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked) {
                          setSelectedAjudantesIds(selectedAjudantesIds.filter(id => id !== h.id));
                        } else {
                          setSelectedAjudantesIds([...selectedAjudantesIds, h.id]);
                        }
                      }}
                      className="rounded border-slate-800 bg-slate-950 text-teal-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                    />
                    <div className="flex-1 flex justify-between items-center text-[11px]">
                      <span className="text-slate-200 font-medium">{h.nome}</span>
                      <span className={`px-1 rounded text-[9px] font-mono font-bold ${isFixed ? "bg-emerald-500/15 text-emerald-400" : "bg-blue-500/15 text-blue-400"}`}>
                        {isFixed ? "FIXO" : "GERAL"}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {otherAvailableHelpers.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-mono block font-bold text-slate-300">Selecionar outro ajudante manual:</span>
            <select
              value=""
              onChange={(e) => {
                const val = e.target.value;
                if (val && !selectedAjudantesIds.includes(val)) {
                  setSelectedAjudantesIds([...selectedAjudantesIds, val]);
                }
              }}
              className="w-full bg-slate-950 border border-slate-900 rounded p-1.5 text-[11px] text-slate-300 focus:outline-none"
            >
              <option value="">Clique para incluir...</option>
              {otherAvailableHelpers.map(h => (
                <option key={h.id} value={h.id}>
                  {h.nome} ({h.tipo === "Ajudante Fixo" ? "Fixo" : "Geral"})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t border-slate-900">
          <span className="text-[10px] text-slate-400 font-mono">
            {selectedAjudantesIds.length} ajudante(s) escalado(s)
          </span>
          <button
            type="button"
            onClick={() => setSuggestionPanelOpen(false)}
            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-550 text-white font-bold text-[10px] uppercase font-mono rounded tracking-wider transition"
          >
            Confirmar Equipe
          </button>
        </div>
      </div>
    );
  };

  const renderSelectedAjudantesList = () => {
    if (selectedAjudantesIds.length === 0) return null;
    return (
      <div className="space-y-1.5 mt-2 bg-slate-950/30 p-2.5 rounded border border-slate-800/40 text-left font-sans">
        <label className="text-[10px] text-slate-400 font-mono block uppercase tracking-wider font-semibold text-slate-300 flex items-center gap-1">
          <LucideUser className="w-3.5 h-3.5 text-sky-400" /> Equipe de Ajudantes Selecionada
        </label>
        <div className="flex flex-wrap gap-1.5">
          {selectedAjudantesIds.map(id => {
            const h = motoristas.find(m => m.id === id);
            if (!h) return null;
            return (
              <span key={id} className="inline-flex items-center gap-1.5 bg-slate-900 text-slate-200 border border-slate-800 pl-2 pr-1.5 py-1 rounded text-[11px] font-sans">
                <span>{h.nome}</span>
                <button
                  type="button"
                  onClick={() => setSelectedAjudantesIds(selectedAjudantesIds.filter(x => x !== id))}
                  className="w-4 h-4 rounded-full bg-slate-850 hover:bg-rose-950 hover:text-rose-400 flex items-center justify-center text-[10px]"
                  title="Remover ajudante"
                >
                  ✕
                </button>
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  const renderEntregaOffPanel = (mode: "create" | "edit") => {
    const isEdit = mode === "edit";
    
    // Get auto-filled motorista and veiculo
    const mId = isEdit ? editMotoristaId : motoristaId;
    const vId = isEdit ? editVeiculoId : veiculoId;
    
    const selectedMotoristaName = motoristas.find(m => m.id === mId)?.nome || "Não selecionado";
    const selectedVeiculoPlate = veiculos.find(v => v.id === vId)?.placa || "Não selecionado";
    
    return (
      <div className="bg-slate-900 border border-amber-500/20 rounded-lg p-4 mt-3 space-y-4 animate-fadeIn text-left">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-bold text-xs uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Package className="w-4 h-4 text-amber-400" /> Painel Adicional — Entrega OFF
          </span>
        </div>
        
        {/* Informações do Cliente */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-bold text-slate-400 font-mono uppercase tracking-wider">Informações do Cliente</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 block font-mono font-bold">Código do Cliente *</label>
              <input
                type="text"
                required
                value={isEdit ? editClienteCodigo : clienteCodigo}
                onChange={(e) => isEdit ? setEditClienteCodigo(e.target.value) : setClienteCodigo(e.target.value)}
                placeholder="Ex: 15487"
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 block font-mono font-bold">CNPJ (Opcional)</label>
              <input
                type="text"
                value={isEdit ? editClienteCNPJ : clienteCNPJ}
                onChange={(e) => isEdit ? setEditClienteCNPJ(e.target.value) : setClienteCNPJ(e.target.value)}
                placeholder="Ex: 00.000.000/0001-00"
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs font-mono"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 block font-mono font-bold">Nome do Cliente *</label>
            <input
              type="text"
              required
              value={isEdit ? editClienteNome : clienteNome}
              onChange={(e) => isEdit ? setEditClienteNome(e.target.value) : setClienteNome(e.target.value)}
              placeholder="Ex: ATACADÃO GOIÂNIA"
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 block font-mono font-bold">Endereço *</label>
            <input
              type="text"
              required
              value={isEdit ? editClienteEndereco : clienteEndereco}
              onChange={(e) => isEdit ? setEditClienteEndereco(e.target.value) : setClienteEndereco(e.target.value)}
              placeholder="Rua, Número, Bairro"
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1">
              <label className="text-[11px] text-slate-400 block font-mono font-bold">Cidade *</label>
              <input
                type="text"
                required
                value={isEdit ? editClienteCidade : clienteCidade}
                onChange={(e) => isEdit ? setEditClienteCidade(e.target.value) : setClienteCidade(e.target.value)}
                placeholder="Ex: Goiânia"
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 block font-mono font-bold">UF *</label>
              <input
                type="text"
                required
                maxLength={2}
                value={isEdit ? editClienteUF : clienteUF}
                onChange={(e) => isEdit ? setEditClienteUF(e.target.value.toUpperCase()) : setClienteUF(e.target.value.toUpperCase())}
                placeholder="GO"
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs font-mono text-center animate-pulse"
              />
            </div>
          </div>
        </div>

        {/* Informações da Entrega */}
        <div className="space-y-2 border-t border-slate-800 pt-3">
          <h4 className="text-[11px] font-bold text-slate-400 font-mono uppercase tracking-wider">Informações da Entrega</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 block font-mono font-bold">Qtd NF *</label>
              <input
                type="number"
                required
                min={1}
                value={isEdit ? editQtdNF : qtdNF}
                onChange={(e) => isEdit ? setEditQtdNF(Number(e.target.value)) : setQtdNF(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs font-mono text-center"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-[11px] text-slate-400 block font-mono font-bold">Valor Total (R$) *</label>
              <input
                type="number"
                required
                min={0}
                step="0.01"
                value={isEdit ? editValorTotalEntrega : valorTotalEntrega}
                onChange={(e) => isEdit ? setEditValorTotalEntrega(Number(e.target.value)) : setValorTotalEntrega(Number(e.target.value))}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs font-mono text-right"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 block font-mono font-bold">Qtd Volumes (Opcional)</label>
              <input
                type="number"
                min={0}
                value={isEdit ? editQtdVolumes : qtdVolumes}
                onChange={(e) => isEdit ? setEditQtdVolumes(Number(e.target.value)) : setQtdVolumes(Number(e.target.value))}
                placeholder="Volumes"
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs font-mono text-center"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 block font-mono font-bold">Obs (Opcional)</label>
              <input
                type="text"
                value={isEdit ? editObservacoesEntrega : observacoesEntrega}
                onChange={(e) => isEdit ? setEditObservacoesEntrega(e.target.value) : setObservacoesEntrega(e.target.value)}
                placeholder="Aguardando conferência"
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs"
              />
            </div>
          </div>

          {/* Individual NF fields */}
          {((isEdit ? editQtdNF : qtdNF) > 0) && (
            <div className="space-y-1.5 mt-2.5 bg-slate-950/40 p-2.5 rounded border border-slate-800/40">
              <label className="text-[11px] text-amber-500 block font-mono font-bold uppercase tracking-wider">Número de cada Nota Fiscal *</label>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: isEdit ? editQtdNF : qtdNF }).map((_, index) => {
                  const currentList = isEdit ? editNumerosNotas : numerosNotas;
                  const val = currentList[index] || "";
                  return (
                    <div key={index} className="space-y-0.5">
                      <span className="text-[9px] text-slate-500 font-mono">NF {index + 1}</span>
                      <input
                        type="text"
                        required
                        value={val}
                        onChange={(e) => {
                          const updated = [...currentList];
                          updated[index] = e.target.value;
                          if (isEdit) {
                            setEditNumerosNotas(updated);
                          } else {
                            setNumerosNotas(updated);
                          }
                        }}
                        placeholder={`NF ${index + 1}`}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white text-xs font-mono"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Informações de Operação (Auto-preenchido) */}
        <div className="space-y-2 border-t border-slate-800 pt-3 bg-slate-950/50 p-2.5 rounded">
          <h4 className="text-[11px] font-bold text-slate-400 font-mono uppercase tracking-wider">Operação (Automático da DT)</h4>
          <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
            <div>
              <span className="text-slate-500 block">Motorista:</span>
              <span className="text-slate-200 font-bold">{selectedMotoristaName}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Veículo:</span>
              <span className="text-slate-200 font-bold">{selectedVeiculoPlate}</span>
            </div>
          </div>
        </div>

        {/* Evolução da Operação (Novo Painel Sempre Editável) */}
        {isEdit && (
          <div className="border-t border-slate-800 pt-3 space-y-3">
            <h4 className="text-[11px] font-bold text-amber-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-amber-400" /> Evolução da Operação
            </h4>
            
            <div className="grid grid-cols-2 gap-2 text-center font-mono">
              <div className="bg-slate-950 p-2 rounded border border-slate-850">
                <span className="text-slate-500 block text-[8px] uppercase">Quantidade Planejada</span>
                <span className="text-white font-bold text-xs">{editQtdNF}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-850">
                <span className="text-slate-550 block text-[8px] uppercase">Pendentes</span>
                <span className="text-amber-400 font-bold text-xs">
                  {Math.max(0, editQtdNF - editEntregues - editDevolucoes - editRecusadas)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 block font-mono font-bold text-center">Entregues</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={editEntregues}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setEditEntregues(val);
                    // Regra de Status: se pendentes === 0, sugere status Finalizada
                    const pending = editQtdNF - val - editDevolucoes - editRecusadas;
                    if (pending === 0) {
                      setEditStatusViagem("Finalizada");
                    } else if (editStatusViagem === "Finalizada") {
                      setEditStatusViagem("Em Rota");
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white text-xs font-mono text-center"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 block font-mono font-bold text-center">Devolvidas</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={editDevolucoes}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setEditDevolucoes(val);
                    const pending = editQtdNF - editEntregues - val - editRecusadas;
                    if (pending === 0) {
                      setEditStatusViagem("Finalizada");
                    } else if (editStatusViagem === "Finalizada") {
                      setEditStatusViagem("Em Rota");
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white text-xs font-mono text-center"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 block font-mono font-bold text-center">Recusadas</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={editRecusadas}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setEditRecusadas(val);
                    const pending = editQtdNF - editEntregues - editDevolucoes - val;
                    if (pending === 0) {
                      setEditStatusViagem("Finalizada");
                    } else if (editStatusViagem === "Finalizada") {
                      setEditStatusViagem("Em Rota");
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white text-xs font-mono text-center"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // CREATE DT
  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMess("");

    if (!dt.trim() || !veiculoId || !motoristaId) {
      setNotification({
        type: "error",
        message: "Não foi possível cadastrar a DT. Motivo: DT, Veículo e Motorista são obrigatórios."
      });
      return;
    }

    const cleanDt = dt.trim();
    const isReentrega = tipo.toLowerCase().includes("reentrega");
    const existingRoute = rotas.find(r => r.dt && String(r.dt).trim().toLowerCase() === cleanDt.toLowerCase());
    if (existingRoute && !isReentrega) {
      setNotification({
        type: "error",
        message: `OPERAÇÃO BLOQUEADA\n\nDT EM DUPLICIDADE: A DT #${cleanDt} já possui cadastro no sistema (Status: ${existingRoute.status_viagem || existingRoute.status || "Ativa"}).`
      });
      return;
    }

    const chosenMotorista = motoristas.find(m => m.id === motoristaId);
    if (chosenMotorista && (chosenMotorista.statusFinal === "BLOQUEADO" || chosenMotorista.statusFinal === "PENDENTE")) {
      setNotification({
        type: "error",
        message: chosenMotorista.statusFinal === "BLOQUEADO"
          ? `OPERAÇÃO BLOQUEADA\n\nO motorista ${chosenMotorista.nome} está BLOQUEADO no motor de conformidade: ${chosenMotorista.motivoBloqueio || "Inconformidade cadastral"}`
          : `OPERAÇÃO BLOQUEADA\n\nO motorista ${chosenMotorista.nome} está PENDENTE em processo de agregamento (documentação ou exames incompletos). Conclua o cadastro antes de escalá-lo.`
      });
      return;
    }

    const routeUnit = chosenMotorista?.unidadeId || filterUnidade || unidades[0]?.id || "un-go";

    setLoading(true);
    try {
      const res = await fetch("/api/rotas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail,
          "x-selected-unit": routeUnit
        },
        body: JSON.stringify({
          dt: dt.trim(),
          unidadeId: routeUnit,
          data,
          veiculoId,
          motoristaId,
          ajudantesIds: selectedAjudantesIds,
          equipeSugeridaIds: suggestedHelpersList.map(h => h.id),
          equipeUtilizadaIds: selectedAjudantesIds,
          tipo,
          status: "Aguardando carregamento",
          status_viagem: statusViagem,
          totalEntregas: tipo === "Entrega OFF" ? (Number(qtdNF) || 1) : Number(totalEntregas),
          entregues: Number(entregues),
          devolucoes: Number(devolucoes),
          recusadas: 0,
          dataPrevista: data, // Defaults to departure date
          
          // Reentrega validation flags
          reentrega_validada: tipo === "Reentrega" ? (reentregaValidadaState === "Sim") : false,
          reentregaValidada: tipo === "Reentrega" ? (reentregaValidadaState === "Sim") : false,
          status_validacao: tipo === "Reentrega" ? (reentregaValidadaState === "Sim" ? "VALIDADA" : "PENDENTE DE VALIDAÇÃO") : "N/A",
          
          // Entrega OFF fields
          clienteCodigo: tipo === "Entrega OFF" ? clienteCodigo : undefined,
          clienteNome: tipo === "Entrega OFF" ? clienteNome : undefined,
          clienteCNPJ: tipo === "Entrega OFF" ? clienteCNPJ : undefined,
          clienteEndereco: tipo === "Entrega OFF" ? clienteEndereco : undefined,
          clienteCidade: tipo === "Entrega OFF" ? clienteCidade : undefined,
          clienteUF: tipo === "Entrega OFF" ? clienteUF : undefined,
          qtdNF: tipo === "Entrega OFF" ? Number(qtdNF) : undefined,
          numerosNotas: tipo === "Entrega OFF" ? numerosNotas : undefined,
          valorTotalEntrega: tipo === "Entrega OFF" ? Number(valorTotalEntrega) : undefined,
          qtdVolumes: tipo === "Entrega OFF" ? Number(qtdVolumes) : undefined,
          observacoesEntrega: tipo === "Entrega OFF" ? observacoesEntrega : undefined,

          log_alteracoes: [{
            data: new Date().toLocaleDateString("pt-BR"),
            hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            usuario: userEmail,
            campo: "Criação de DT",
            antes: "-",
            depois: tipo === "Entrega OFF" ? `Iniciado como Entrega OFF para ${clienteNome}` : `Iniciado com status [${statusViagem}]`
          }]
        }),
      });

      if (res.ok) {
        setNotification({
          type: "success",
          message: "Viagem / DT cadastrada e integrada com as vistorias."
        });
        resetForm();
        onRefresh();
      } else {
        const dataErr = await res.json();
        setErrorMess(dataErr.error || "Operação rejeitada pelo sistema.");
      }
    } catch (e) {
      setErrorMess("Erro operacional de rede de dados.");
    } finally {
      setLoading(false);
    }
  };

  // INLINE UPDATE STATUS (Fast Picker)
  const handleUpdateStatus = async (id: string, payload: { status_viagem: string }) => {
    const r = rotas.find(x => x.id === id);
    if (!r) return;

    if (payload.status_viagem === "Finalizada") {
      const planejado = r.tipo === "Entrega OFF" ? (r.qtdNF || 0) : (r.totalEntregas || 0);
      const entreguesNum = r.entregues || 0;
      const devolucoesNum = r.devolucoes || 0;
      const recusadasNum = r.recusadas || 0;
      const pendentesNum = planejado - entreguesNum - devolucoesNum - recusadasNum;

      if (pendentesNum > 0 && (!r.observacoes_operacionais || r.observacoes_operacionais.trim().length === 0)) {
        setNotification({
          type: "error",
          message: "Para fechar definitivamente a DT com entregas pendentes, é obrigatório registrar uma justificativa nas observações operacionais. Ex: 'Cliente recusou recebimento.'"
        });
        return;
      }
    }

    try {
      const res = await fetch(`/api/rotas/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setNotification({
          type: "success",
          message: `Status de viagem atualizado para: ${payload.status_viagem}`
        });
        onRefresh();
      } else {
        const error = await res.json();
        setNotification({
          type: "error",
          message: `Erro ao atualizar status: ${error.error || "Operação negada."}`
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // INLINE UPDATE FIELD (Sempre Editável para Entrega OFF)
  const handleUpdateOffField = async (r: Rota, field: "entregues" | "devolucoes" | "recusadas", newValue: number) => {
    if (newValue < 0) return;
    
    const planejado = r.tipo === "Entrega OFF" ? (r.qtdNF || 1) : r.totalEntregas;
    const currentEntregues = field === "entregues" ? newValue : (r.entregues || 0);
    const currentDevolucoes = field === "devolucoes" ? newValue : (r.devolucoes || 0);
    const currentRecusadas = field === "recusadas" ? newValue : (r.recusadas || 0);

    if (currentEntregues > planejado) {
      setNotification({
        type: "error",
        message: "Quantidade superior ao planejado."
      });
      return;
    }

    if (currentEntregues + currentDevolucoes + currentRecusadas > planejado) {
      setNotification({
        type: "error",
        message: `A soma de entregues, devolvidas e recusadas não pode superar a quantidade planejada (${planejado}).`
      });
      return;
    }

    const pending = planejado - currentEntregues - currentDevolucoes - currentRecusadas;
    let payload: Partial<Rota> = {
      [field]: newValue
    };

    if (pending === 0) {
      payload.status_viagem = "Finalizada";
    } else if (r.status_viagem === "Finalizada") {
      payload.status_viagem = "Em Rota";
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/rotas/${r.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onRefresh();
      } else {
        const err = await res.json();
        setNotification({
          type: "error",
          message: `Erro ao atualizar evolução: ${err.error || "Operação rejeitada."}`
        });
      }
    } catch (err) {
      setNotification({
        type: "error",
        message: "Erro eletrônico ao atualizar evolução."
      });
    } finally {
      setLoading(false);
    }
  };

  // DELETE ROUTE
  const handleDeleteRoute = async (id: string) => {
    setConfirmDialog({
      message: `Auditoria de Rota: Deseja realmente expurgar o registro da DT #${id}? Essa operação é definitiva e auditará seu usuário de acesso.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/rotas/${id}`, {
            method: "DELETE",
            headers: {
              "x-user-email": userEmail,
            },
          });
          if (res.ok) {
            setNotification({
              type: "success",
              message: "Registro excluído com sucesso."
            });
            onRefresh();
          } else {
            const err = await res.json();
            setNotification({
              type: "error",
              message: `Não foi possível excluir a DT. Motivo: ${err.error || "Exclusão não autorizada."}`
            });
          }
        } catch (e) {
          setNotification({
            type: "error",
            message: "Erro de conexão ao excluir a DT."
          });
        }
      }
    });
  };

  // START EDIT OVERLAY
  const startEditing = (r: Rota) => {
    setEditingRoute(r);
    setEditVeiculoId(r.veiculoId);
    setEditMotoristaId(r.motoristaId);
    setEditData(r.data);
    setEditDataPrevista(r.dataPrevista || r.data || "");
    setEditStatusViagem(r.status_viagem || r.status || "Aguardando Carregamento");
    setEditObservacoes(r.observacoes_operacionais || "");
    setEditTotalEntregas(r.totalEntregas);
    setEditEntregues(r.entregues);
    setEditRecusadas(r.recusadas || 0);
    setEditDevolucoes(r.devolucoes);
    setEditReentregaValidadaState((r.reentrega_validada || r.reentregaValidada || r.status_validacao === "VALIDADA") ? "Sim" : "Não");
    setSelectedAjudantesIds(r.ajudantesIds || []);

    // Set Entrega OFF edit states
    setEditClienteCodigo(r.clienteCodigo || "");
    setEditClienteNome(r.clienteNome || "");
    setEditClienteCNPJ(r.clienteCNPJ || "");
    setEditClienteEndereco(r.clienteEndereco || "");
    setEditClienteCidade(r.clienteCidade || "");
    setEditClienteUF(r.clienteUF || "");
    setEditQtdNF(r.qtdNF || 0);
    setEditValorTotalEntrega(r.valorTotalEntrega || 0);
    setEditQtdVolumes(r.qtdVolumes || 0);
    setEditObservacoesEntrega(r.observacoesEntrega || "");
    setEditNumerosNotas(r.numerosNotas || []);
  };

  // SAVE EDIT FORM
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoute) return;

    const planejado = editingRoute.tipo === "Entrega OFF" ? Number(editQtdNF) : Number(editTotalEntregas);
    const entreguesNum = Number(editEntregues);
    const devolucoesNum = Number(editDevolucoes);
    const recusadasNum = Number(editRecusadas);

    if (entreguesNum > planejado) {
      setNotification({
        type: "error",
        message: "Quantidade superior ao planejado."
      });
      return;
    }

    if (entreguesNum + devolucoesNum + recusadasNum > planejado) {
      setNotification({
        type: "error",
        message: `A soma de entregues, devolvidas e recusadas não pode superar a quantidade planejada (${planejado}).`
      });
      return;
    }

    const pendentesNum = planejado - entreguesNum - devolucoesNum - recusadasNum;
    if (editStatusViagem === "Finalizada" && pendentesNum > 0 && (!editObservacoes || editObservacoes.trim().length === 0)) {
      setNotification({
        type: "error",
        message: "Para fechar definitivamente a DT com entregas pendentes, é obrigatório registrar uma justificativa nas observações operacionais. Ex: 'Cliente recusou recebimento.'"
      });
      return;
    }

    const chosenMotorista = motoristas.find(m => m.id === editMotoristaId);
    if (chosenMotorista && (chosenMotorista.statusFinal === "BLOQUEADO" || chosenMotorista.statusFinal === "PENDENTE")) {
      setNotification({
        type: "error",
        message: chosenMotorista.statusFinal === "BLOQUEADO"
          ? `OPERAÇÃO BLOQUEADA\n\nO motorista ${chosenMotorista.nome} está BLOQUEADO no motor de conformidade: ${chosenMotorista.motivoBloqueio || "Inconformidade cadastral"}`
          : `OPERAÇÃO BLOQUEADA\n\nO motorista ${chosenMotorista.nome} está PENDENTE em processo de agregamento (documentação ou exames incompletos). Conclua o cadastro antes de escalá-lo.`
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/rotas/${editingRoute.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail
        },
        body: JSON.stringify({
          veiculoId: editVeiculoId,
          motoristaId: editMotoristaId,
          ajudantesIds: selectedAjudantesIds,
          equipeSugeridaIds: suggestedHelpersList.map(h => h.id),
          equipeUtilizadaIds: selectedAjudantesIds,
          data: editData,
          dataPrevista: editDataPrevista,
          status_viagem: editStatusViagem,
          observacoes_operacionais: editObservacoes,
          totalEntregas: editingRoute.tipo === "Entrega OFF" ? (Number(editQtdNF) || 1) : Number(editTotalEntregas),
          entregues: Number(editEntregues),
          recusadas: Number(editRecusadas),
          devolucoes: Number(editDevolucoes),

          // Reentrega validation flags
          reentrega_validada: editingRoute.tipo === "Reentrega" ? (editReentregaValidadaState === "Sim") : undefined,
          reentregaValidada: editingRoute.tipo === "Reentrega" ? (editReentregaValidadaState === "Sim") : undefined,
          status_validacao: editingRoute.tipo === "Reentrega" ? (editReentregaValidadaState === "Sim" ? "VALIDADA" : "PENDENTE DE VALIDAÇÃO") : undefined,

          // Entrega OFF specific edit fields
          clienteCodigo: editingRoute.tipo === "Entrega OFF" ? editClienteCodigo : undefined,
          clienteNome: editingRoute.tipo === "Entrega OFF" ? editClienteNome : undefined,
          clienteCNPJ: editingRoute.tipo === "Entrega OFF" ? editClienteCNPJ : undefined,
          clienteEndereco: editingRoute.tipo === "Entrega OFF" ? editClienteEndereco : undefined,
          clienteCidade: editingRoute.tipo === "Entrega OFF" ? editClienteCidade : undefined,
          clienteUF: editingRoute.tipo === "Entrega OFF" ? editClienteUF : undefined,
          qtdNF: editingRoute.tipo === "Entrega OFF" ? Number(editQtdNF) : undefined,
          numerosNotas: editingRoute.tipo === "Entrega OFF" ? editNumerosNotas : undefined,
          valorTotalEntrega: editingRoute.tipo === "Entrega OFF" ? Number(editValorTotalEntrega) : undefined,
          qtdVolumes: editingRoute.tipo === "Entrega OFF" ? Number(editQtdVolumes) : undefined,
          observacoesEntrega: editingRoute.tipo === "Entrega OFF" ? editObservacoesEntrega : undefined,
        })
      });

      if (res.ok) {
        setNotification({
          type: "success",
          message: "Alterações na DT gravadas com logs de auditoria automatizados."
        });
        setEditingRoute(null);
        onRefresh();
      } else {
        const err = await res.json();
        setNotification({
          type: "error",
          message: `Não foi possível gravar: ${err.error || "Operação rejeitada."}`
        });
      }
    } catch (err) {
      setNotification({
        type: "error",
        message: "Erro eletrônico ao comunicar salvar alterações."
      });
    } finally {
      setLoading(false);
    }
  };

  // TRIGGER ADD INCIDENT OCORRENCIA MODAL
  const openOccurrenceModal = (rId: string) => {
    setOccurrenceRouteId(rId);
    setOccTipo("Atraso");
    setOccDescricao("");
    setOccData(new Date().toISOString().split("T")[0]);
    setOccHora(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
  };

  // SUBMIT OCORRENCIA FORM
  const handleSaveOccurrence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!occurrenceRouteId || !occDescricao.trim()) {
      setNotification({
        type: "error",
        message: "Por favor, digite a descrição da Ocorrência."
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/rotas/${occurrenceRouteId}/ocorrencias`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail
        },
        body: JSON.stringify({
          tipo: occTipo,
          descricao: occDescricao,
          data: occData,
          hora: occHora
        })
      });

      if (res.ok) {
        setNotification({
          type: "success",
          message: `Incidente [${occTipo}] registrado com sucesso e anexado ao log da DT.`
        });
        setOccurrenceRouteId(null);
        setOccDescricao("");
        onRefresh();
      } else {
        const err = await res.json();
        setNotification({
          type: "error",
          message: `Erro ao gravar ocorrência: ${err.error || "Rejeição."}`
        });
      }
    } catch (err) {
      setNotification({
        type: "error",
        message: "Erro operacional. Sem conectividade."
      });
    } finally {
      setLoading(false);
    }
  };

  // NOTAS FISCAIS SUB-FLOWS
  const fetchNotesForDt = async (dtId: string) => {
    try {
      const res = await fetch(`/api/notas-fiscais?dtId=${dtId}`, {
        headers: {
          "x-user-email": userEmail
        }
      });
      if (res.ok) {
        const json = await res.json();
        setNotesList(json);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenNoteManager = (dtId: string) => {
    setSelectedDtId(dtId);
    setNewNoteNum("");
    setNewNoteVal(0);
    setNewNoteCli("");
    setEditingNoteId(null);
    fetchNotesForDt(dtId);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteNum.trim() || newNoteVal <= 0 || !newNoteCli.trim() || !selectedDtId) {
      setNotification({
        type: "error",
        message: "Não foi possível adicionar a Nota Fiscal. Motivo: Preencha todos os campos válidos."
      });
      return;
    }

    const payload = {
      dtId: selectedDtId,
      numero: newNoteNum.trim(),
      valor: Number(newNoteVal),
      cliente: newNoteCli.trim(),
    };

    try {
      const url = editingNoteId ? `/api/notas-fiscais/${editingNoteId}` : "/api/notas-fiscais";
      const method = editingNoteId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setNewNoteNum("");
        setNewNoteVal(0);
        setNewNoteCli("");
        setEditingNoteId(null);
        fetchNotesForDt(selectedDtId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInitiateEditNote = (nf: NotaFiscal) => {
    setEditingNoteId(nf.id);
    setNewNoteNum(nf.numero);
    setNewNoteVal(nf.valor);
    setNewNoteCli(nf.cliente);
  };

  const handleDeleteNote = async (nfId: string) => {
    if (!window.confirm("Deseja expurgar esta Nota Fiscal?")) return;

    try {
      const res = await fetch(`/api/notas-fiscais/${nfId}`, {
        method: "DELETE",
        headers: {
          "x-user-email": userEmail,
        },
      });
      if (res.ok && selectedDtId) {
        fetchNotesForDt(selectedDtId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to verify if route's YYYY-MM-DD date is within the selected period filter
  const isDateInPeriod = (dateStr: string, period: string, start?: string, end?: string) => {
    if (!dateStr) return false;
    
    // Create baseline dates for comparison, matching localized calendar representations
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Parse target date YYYY-MM-DD
    const targetParts = dateStr.trim().split("-");
    if (targetParts.length !== 3) return false;
    const target = new Date(Number(targetParts[0]), Number(targetParts[1]) - 1, Number(targetParts[2]));
    
    if (period === "hoje") {
      return target.getTime() === today.getTime();
    }
    
    if (period === "ontem") {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return target.getTime() === yesterday.getTime();
    }
    
    if (period === "esta_semana") {
      const dayOfWeek = today.getDay(); // 0 Sunday, 1 Monday, etc.
      const monday = new Date(today);
      const diff = today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
      monday.setDate(diff);
      
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      
      return target.getTime() >= monday.getTime() && target.getTime() <= sunday.getTime();
    }
    
    if (period === "este_mes") {
      return target.getFullYear() === today.getFullYear() && target.getMonth() === today.getMonth();
    }
    
    if (period === "personalizado") {
      let match = true;
      if (start) {
        const sParts = start.trim().split("-");
        if (sParts.length === 3) {
          const sDate = new Date(Number(sParts[0]), Number(sParts[1]) - 1, Number(sParts[2]));
          match = match && target.getTime() >= sDate.getTime();
        }
      }
      if (end) {
        const eParts = end.trim().split("-");
        if (eParts.length === 3) {
          const eDate = new Date(Number(eParts[0]), Number(eParts[1]) - 1, Number(eParts[2]));
          match = match && target.getTime() <= eDate.getTime();
        }
      }
      return match;
    }
    
    return true; // "todos"
  };

  // Dynamic list of transporter types from the vehicles list
  const transportadoresUnicos = useMemo(() => {
    const list = new Set<string>();
    veiculos.forEach((v) => {
      if (v.tipo) list.add(v.tipo);
    });
    return Array.from(list);
  }, [veiculos]);

  // FILTERING logic
  const filtered = useMemo(() => {
    return rotas.filter((r) => {
      const vObj = veiculos.find((v) => v.id === r.veiculoId);
      const mObj = motoristas.find((m) => m.id === r.motoristaId);
      const uObj = (unidades || []).find((u) => u.id === r.unidadeId);

      // Simple text-based inputs
      const matchDt = filterDt ? r.dt.includes(filterDt.trim()) : true;
      const matchVeiculo = filterVeiculo ? (vObj?.placa || "").toLowerCase().includes(filterVeiculo.trim().toLowerCase()) : true;
      const matchMotorista = filterMotorista ? (mObj?.nome || "").toLowerCase().includes(filterMotorista.trim().toLowerCase()) : true;
      const matchUnidade = filterUnidade ? (r.unidadeId === filterUnidade) : true;
      const matchStatus = filterStatus ? ((r.status_viagem || r.status || "").toLowerCase() === filterStatus.toLowerCase()) : true;

      // Executive Dashboard Period & Transportador overrides (bypassed if specific DT number or search term is entered)
      const hasSpecificDtSearch = Boolean(filterDt.trim() || (searchTerm.trim() && /^\d+$/.test(searchTerm.trim())));
      const matchPeriod = hasSpecificDtSearch
        ? true
        : (dashPeriod && dashPeriod !== "todos"
            ? isDateInPeriod(r.data, dashPeriod, dashStartDate, dashEndDate)
            : (filterData ? (r.data === filterData) : true));

      const matchTransportador = dashTransportador
        ? (vObj?.tipo === dashTransportador)
        : true;

      const searchLow = searchTerm.toLowerCase().trim();
      const matchSearch = searchLow ? (
        r.dt.includes(searchLow) ||
        (vObj?.placa || "").toLowerCase().includes(searchLow) ||
        (mObj?.nome || "").toLowerCase().includes(searchLow) ||
        (uObj?.nome || "").toLowerCase().includes(searchLow) ||
        (r.clienteNome || "").toLowerCase().includes(searchLow) ||
        (r.clienteCodigo || "").toLowerCase().includes(searchLow)
      ) : true;

      return matchDt && matchVeiculo && matchMotorista && matchUnidade && matchStatus && matchPeriod && matchTransportador && matchSearch;
    });
  }, [
    rotas, veiculos, motoristas, unidades, searchTerm, 
    filterDt, filterVeiculo, filterMotorista, filterUnidade, filterData, filterStatus,
    dashPeriod, dashStartDate, dashEndDate, dashTransportador
  ]);

  // Compute operational KPIs reactively
  const kpis = useMemo(() => {
    let totalDts = filtered.length;
    let emAndamento = 0;
    let finalizadas = 0;
    let totalEntregasPlanejadas = 0;
    let totalEntregasConcluidas = 0;
    let totalDevolucoes = 0;
    let dtsComOcorrencias = 0;

    filtered.forEach((r) => {
      const statusStr = (r.status_viagem || r.status || "").trim().toLowerCase();
      const isFinalizada = statusStr === "finalizada";
      const isCancelada = statusStr === "cancelada";

      const plan = r.totalEntregas || 0;
      const conc = r.entregues || 0;
      const dev = r.devolucoes || 0;
      const rec = r.recusadas || 0;

      if (isFinalizada) {
        finalizadas++;
      } else if (!isCancelada) {
        emAndamento++;
      }

      totalEntregasPlanejadas += plan;
      totalEntregasConcluidas += conc;
      totalDevolucoes += (dev + rec);

      // Occurrence detection strategy
      const hasNoShow = noShows?.some((ns: any) => ns.dt === r.dt);
      const hasOcorr = r.ocorrencias && r.ocorrencias.length > 0;
      
      const hasSpecificOcorr = hasOcorr && r.ocorrencias!.some((o) => {
        const t = (o.tipo || "").toLowerCase();
        const d = (o.descricao || "").toLowerCase();
        return (
          t.includes("vale") || d.includes("vale") ||
          t.includes("show") || d.includes("show") ||
          t.includes("avaria") || d.includes("avaria") ||
          t.includes("falta") || d.includes("falta") ||
          t.includes("divergência") || d.includes("divergência") || t.includes("divergencia") || d.includes("divergencia") ||
          t.includes("recusa") || d.includes("recusa")
        );
      });

      if (hasNoShow || hasOcorr || hasSpecificOcorr) {
        dtsComOcorrencias++;
      }
    });

    const totalEntregasPendentes = Math.max(0, totalEntregasPlanejadas - totalEntregasConcluidas - totalDevolucoes);
    const progressoPercent = totalEntregasPlanejadas > 0
      ? (totalEntregasConcluidas / totalEntregasPlanejadas) * 100
      : 0;

    return {
      totalDts,
      emAndamento,
      finalizadas,
      totalEntregasPlanejadas,
      totalEntregasConcluidas,
      totalEntregasPendentes,
      totalDevolucoes,
      dtsComOcorrencias,
      progressoPercent
    };
  }, [filtered, noShows]);

  // Operational Chart data structures
  const chartData = useMemo(() => {
    return [
      { name: "Planejadas", Quantidade: kpis.totalEntregasPlanejadas, fill: "#38bdf8" },
      { name: "Concluídas", Quantidade: kpis.totalEntregasConcluidas, fill: "#4ade80" },
      { name: "Pendentes", Quantidade: kpis.totalEntregasPendentes, fill: "#fbbf24" },
      { name: "Devoluções", Quantidade: kpis.totalDevolucoes, fill: "#f87171" }
    ];
  }, [kpis]);

  const sumNotesTotal = useMemo(() => {
    return notesList.reduce((acc, current) => acc + current.valor, 0);
  }, [notesList]);

  return (
    <div className="space-y-6">
      {/* HEADER BAR AND TITLE */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900/30 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
            <LucideLayers className="w-5 h-5 text-sky-400" />
            Vistoria & Monitoramento de DTs / Viagens
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Acompanhe o tráfego rodoviário das entregas, reportes de devoluções, vistorias e controle de ocorrências.
          </p>
        </div>

        {!isAdding && !editingRoute && (
          <button
            onClick={() => {
              setIsAdding(true);
              setEditingRoute(null);
            }}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition self-start"
          >
            <LucidePlus className="w-3.5 h-3.5" />
            Nova Viagem / DT
          </button>
        )}
      </div>

      {/* PAINEL EXECUTIVO OPERACIONAL DAS DTs */}
      <div className="bg-slate-900/95 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl animate-fadeIn backdrop-blur-md">
        {/* Header of Dashboard */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-emerald-400" />
              PAINEL EXECUTIVO OPERACIONAL DAS DTS
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Indicadores de performance, rotas do dia e status de entrega atualizados em tempo real do Supabase.
            </p>
          </div>
          
          {/* Dashboard Filters Area */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider px-1">Período:</span>
              <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 flex-wrap">
                {(["hoje", "ontem", "esta_semana", "este_mes", "personalizado", "todos"] as const).map((period) => {
                  const labelMap = {
                    hoje: "Hoje",
                    ontem: "Ontem",
                    esta_semana: "Semana",
                    este_mes: "Mês",
                    personalizado: "Personalizado",
                    todos: "Todos"
                  };
                  const active = dashPeriod === period;
                  return (
                    <button
                      key={period}
                      type="button"
                      onClick={() => {
                        setDashPeriod(period);
                        if (period !== "personalizado") {
                          setDashStartDate("");
                          setDashEndDate("");
                        }
                      }}
                      className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider transition ${
                        active 
                          ? "bg-sky-500/15 text-sky-400 font-semibold" 
                          : "text-slate-450 hover:text-white"
                      }`}
                    >
                      {labelMap[period]}
                    </button>
                  );
                })}
              </div>
            </div>

            {dashPeriod === "personalizado" && (
              <div className="flex items-center gap-1.5 animate-fadeIn">
                <input
                  type="date"
                  value={dashStartDate}
                  onChange={(e) => setDashStartDate(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-white rounded px-2 py-0.5 font-mono text-[10px]"
                />
                <span className="text-slate-500 text-[10px]">até</span>
                <input
                  type="date"
                  value={dashEndDate}
                  onChange={(e) => setDashEndDate(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-white rounded px-2 py-0.5 font-mono text-[10px]"
                />
              </div>
            )}

            <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>

            {/* Unidade filter */}
            {unidades.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] font-mono">Unidade:</span>
                <select
                  value={filterUnidade}
                  onChange={(e) => setFilterUnidade(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-white rounded px-2 py-1 text-[11px]"
                >
                  <option value="">Todas</option>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>

            {/* Transportador filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] font-mono">Transportador:</span>
              <select
                value={dashTransportador}
                onChange={(e) => setDashTransportador(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-white rounded px-2 py-1 text-[11px]"
              >
                <option value="">Todos</option>
                <option value="Frota Própria">Frota Própria</option>
                <option value="Terceiro">Terceiro</option>
                {/* Dynamically fallback to other unique carrier types */}
                {transportadoresUnicos
                  .filter(t => t !== "Frota Própria" && t !== "Terceiro")
                  .map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))
                }
              </select>
            </div>
          </div>
        </div>

        {/* Dashboard Grid containing cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* CARD 1: Rotas Planejadas */}
          <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <LucideTruck className="w-3.5 h-3.5 text-sky-400" /> Rotas Planejadas
              </span>
              <span className="p-1 px-1.5 rounded-md bg-sky-500/10 text-sky-400 text-[10px] font-bold font-mono">DT</span>
            </div>
            <div className="text-2xl font-black text-white font-mono">{kpis.totalDts}</div>
            <p className="text-[10px] text-slate-500 mt-1 leading-normal">Cadastradas no período filtrado.</p>
          </div>

          {/* CARD 2: Rotas Em Andamento */}
          <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <LucideClock className="w-3.5 h-3.5 text-blue-400" /> Rotas Em Andamento
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
            </div>
            <div className="text-2xl font-black text-sky-400 font-mono">{kpis.emAndamento}</div>
            <p className="text-[10px] text-slate-500 mt-1 leading-normal">DTs com entregas ativas/pendentes.</p>
          </div>

          {/* CARD 3: Rotas Finalizadas */}
          <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Rotas Finalizadas</span>
              <span className="p-1 rounded bg-emerald-500/10 text-emerald-400"><LucideCheckCircle className="w-3.5 h-3.5" /></span>
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono">{kpis.finalizadas}</div>
            <p className="text-[10px] text-slate-500 mt-1 leading-normal">DTs encerradas de forma definitiva.</p>
          </div>

          {/* CARD 4: Entregas Planejadas */}
          <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Entregas Planejadas</span>
              <span className="p-1 px-1.5 rounded bg-slate-900 text-slate-400 font-mono text-[9px] font-bold">TOTAL</span>
            </div>
            <div className="text-2xl font-black text-white font-mono">{kpis.totalEntregasPlanejadas}</div>
            <p className="text-[10px] text-slate-500 mt-1 leading-normal">Somatório total de entregas previstas.</p>
          </div>

          {/* CARD 5: Entregas Concluídas */}
          <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Entregas Concluídas</span>
              <span className="p-1 rounded bg-green-500/10 text-green-400"><LucideCheckCircle className="w-3.5 h-3.5" /></span>
            </div>
            <div className="text-2xl font-black text-green-450 font-mono">{kpis.totalEntregasConcluidas}</div>
            <p className="text-[10px] text-slate-500 mt-1 leading-normal">Entregas com status Concluído ou Entregue.</p>
          </div>

          {/* CARD 6: Entregas Pendentes */}
          <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Entregas Pendentes</span>
              <span className="p-1 rounded bg-amber-500/10 text-amber-400"><LucideClock className="w-3.5 h-3.5" /></span>
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono">{kpis.totalEntregasPendentes}</div>
            <p className="text-[10px] text-slate-500 mt-1 leading-normal">Entregas que ainda restam concluir.</p>
          </div>

          {/* CARD 7: Devoluções do Dia */}
          <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Devoluções do Dia</span>
              <span className="p-1 px-1.5 rounded bg-rose-500/10 text-rose-450 font-mono text-[9px] font-bold">DEV</span>
            </div>
            <div className="text-2xl font-black text-rose-400 font-mono">{kpis.totalDevolucoes}</div>
            <p className="text-[10px] text-slate-500 mt-1 leading-normal">Status de devolução ou recusa ativa.</p>
          </div>

          {/* CARD 8: DTs com Ocorrências */}
          <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition shadow-inner" title="Avaria, No Show, Falta, Vale, Divergências...">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">DTs c/ Ocorrências</span>
              <span className="p-1 rounded bg-red-500/10 text-red-500"><LucideAlertTriangle className="w-3.5 h-3.5 animate-pulse" /></span>
            </div>
            <div className="text-2xl font-black text-rose-500 font-mono">{kpis.dtsComOcorrencias}</div>
            <p className="text-[10px] text-slate-500 mt-1 leading-normal">Vale, No Show, Avaria, Falta, Divergência.</p>
          </div>

        </div>

        {/* Progresso e Gráfico Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Progresso Operacional */}
          <div className="lg:col-span-5 bg-slate-950/50 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-sky-400" /> Progresso Operacional
              </h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                Taxa de conciliação e entregues da operação. Atualiza instantaneamente p/ cada alteração no Supabase.
              </p>
            </div>
            
            <div className="my-5 space-y-2">
              <div className="flex items-end justify-between">
                <span className="text-sm font-black text-white font-mono">
                  {kpis.totalEntregasConcluidas} <span className="text-slate-550 text-xs font-normal">de</span> {kpis.totalEntregasPlanejadas} <span className="text-slate-550 text-xs font-normal">entregas</span>
                </span>
                <span className="text-[16px] font-black text-emerald-400 font-mono">
                  {kpis.progressoPercent.toFixed(2)}% Concluído
                </span>
              </div>
              
              <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 via-sky-400 to-emerald-400 transition-all duration-700 ease-out"
                  style={{ width: `${Math.min(100, kpis.progressoPercent)}%` }}
                ></div>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              Cálculo baseado em tempo real com auditoria ativa.
            </div>
          </div>

          {/* Gráfico Operacional */}
          <div className="lg:col-span-7 bg-slate-950/50 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between h-[380px]">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono mb-2 flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-emerald-400" /> Visão Analítica de Entregas
            </h4>
            
            <div className="flex-1 w-full min-h-[300px] relative">
              {kpis.totalEntregasPlanejadas === 0 ? (
                <div key="no-data-msg-operational" className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 font-mono">
                  Sem dados de entregas no período selecionado.
                </div>
              ) : (
                <div key="chart-wrapper-operational" className="w-full h-[300px] min-h-[300px]">
                  <SafeResponsiveContainer minHeight={300}>
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#64748b" 
                        fontSize={10} 
                        tickLine={false}
                      />
                      <YAxis 
                        stroke="#64748b" 
                        fontSize={10} 
                        tickLine={false}
                      />
                      <Tooltip
                        isAnimationActive={false}
                        contentStyle={{
                          backgroundColor: "#020617",
                          borderColor: "#1e293b",
                          borderRadius: "8px",
                        }}
                        itemStyle={{ color: "#fff", fontSize: 11 }}
                        labelStyle={{ color: "#94a3b8", fontSize: 10, fontWeight: "bold" }}
                      />
                      <Bar dataKey="Quantidade" radius={[4, 4, 0, 0]} barSize={40}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </SafeResponsiveContainer>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* CREATE ROUTE FORM PANEL */}
        {isAdding && (
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 h-fit space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-sm font-semibold text-white">Criar Viagem DT</h3>
              <button onClick={() => resetForm()} className="text-xs text-rose-450 hover:text-white font-mono">
                X Fechar
              </button>
            </div>

            <form onSubmit={handleCreateRoute} className="space-y-3 font-sans text-xs">
              {errorMess && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 font-mono text-[10px]">
                  {errorMess}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Nº Documento DT</label>
                  <input
                    type="text"
                    required
                    value={dt}
                    onChange={(e) => setDt(e.target.value)}
                    placeholder="Ex: 100293"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:border-slate-705"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Data da Viagem</label>
                  <input
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Veículo Escalado (Liberados)</label>
                <select
                  value={veiculoId}
                  onChange={(e) => setVeiculoId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none"
                  required
                >
                  <option value="">Selecione veículo...</option>
                  {veiculos.filter(v => !isVehicleBlocked(v)).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.placa} - {v.modelo} ({v.perfil})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Motorista Responsável (Com Conformidade)</label>
                <select
                  value={motoristaId}
                  onChange={(e) => setMotoristaId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none cursor-help"
                  required
                >
                  <option value="">Selecione condutor...</option>
                  {motoristas.filter(m => m.tipo === "Motorista" || !m.tipo).map((m) => (
                    <option 
                      key={m.id} 
                      value={m.id}
                      disabled={(m.statusFinal === "BLOQUEADO" || m.statusFinal === "PENDENTE") && m.id !== motoristaId}
                      title={m.statusFinal === "BLOQUEADO" ? m.motivoBloqueio : m.statusFinal === "PENDENTE" ? "Pendente em agregamento" : undefined}
                      className={m.statusFinal === "BLOQUEADO" ? "text-rose-550 line-through" : m.statusFinal === "PENDENTE" ? "text-amber-500 font-semibold" : "text-white"}
                    >
                      {m.nome} {m.statusFinal === "BLOQUEADO" ? `(BLOQUEADO - ${m.motivoBloqueio || "Vencido"})` : m.statusFinal === "PENDENTE" ? `(PENDENTE - Agregamento)` : ""}
                    </option>
                  ))}
                </select>
                {renderSelectedAjudantesList()}
                {renderIntelligentTeamSelectionPanel("create")}
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 block font-mono font-bold text-amber-400">Status Inicial da Operação *</label>
                <select
                  value={statusViagem}
                  onChange={(e) => setStatusViagem(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-slate-700 font-bold"
                  required
                >
                  <option value="Aguardando Carregamento">Aguardando Carregamento</option>
                  <option value="Em Carregamento">Em Carregamento</option>
                  <option value="Em Rota">Em Rota</option>
                  <option value="Em Descarga">Em Descarga</option>
                  <option value="AG.DESCARGA">AG.DESCARGA</option>
                  <option value="Finalizada">Finalizada</option>
                  <option value="Cancelada">Cancelada</option>
                  <option value="Veículo Quebrado">Veículo Quebrado</option>
                  <option value="Retorno Base">Retorno Base</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono font-bold text-sky-400">Tipo de Expedição</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-bold"
                  >
                    <option value="Entrega">Entrega</option>
                    <option value="Recarga">Recarga</option>
                    <option value="Reentrega">Reentrega</option>
                    <option value="Entrega OFF">Entrega OFF</option>
                  </select>
                </div>

                {tipo !== "Entrega OFF" && (
                  <div className="space-y-1">
                    <label className="text-slate-400 block font-mono">Total de Itens/Entregas</label>
                    <input
                      type="number"
                      value={totalEntregas}
                      onChange={(e) => setTotalEntregas(Number(e.target.value))}
                      min={1}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono text-center"
                    />
                  </div>
                )}
              </div>

                {tipo === "Reentrega" && (
                  <div className="col-span-2 p-3 bg-amber-950/40 border-2 border-amber-500/60 rounded-xl space-y-2 animate-fadeIn shadow-lg shadow-amber-950/20">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-300 font-mono flex items-center gap-1.5">
                        <LucideAlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                        <span>VALIDAÇÃO DA REENTREGA</span>
                      </label>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                        Requisito Obrigatório
                      </span>
                    </div>
                    <p className="text-xs text-amber-200/90 font-medium leading-tight">
                      A reentrega já foi devidamente validada pelo setor responsável?
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setReentregaValidadaState("Sim")}
                        className={`py-2 px-3 rounded-lg text-xs font-bold font-mono transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          reentregaValidadaState === "Sim"
                            ? "bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-lg shadow-emerald-900/50"
                            : "bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800"
                        }`}
                      >
                        <LucideCheckCircle className="w-3.5 h-3.5" /> SIM (Validada)
                      </button>
                      <button
                        type="button"
                        onClick={() => setReentregaValidadaState("Não")}
                        className={`py-2 px-3 rounded-lg text-xs font-bold font-mono transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          reentregaValidadaState === "Não"
                            ? "bg-rose-600 text-white ring-2 ring-rose-400 shadow-lg shadow-rose-900/50"
                            : "bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800"
                        }`}
                      >
                        <LucideX className="w-3.5 h-3.5" /> NÃO (Pendente / Alerta)
                      </button>
                    </div>
                    {reentregaValidadaState === "Não" && (
                      <div className="p-2 bg-rose-950/60 border border-rose-500/40 rounded-lg text-[11px] text-rose-300 font-mono flex items-start gap-1.5 leading-snug">
                        <LucideAlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <span><b>ALERTA MÁXIMO:</b> Ao selecionar "Não", um alerta de prioridade máxima será exibido na Dashboard do sistema até que a validação seja concluída.</span>
                      </div>
                    )}
                  </div>
                )}

              {tipo !== "Entrega OFF" ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-slate-440 block font-mono text-emerald-400">Qtd Entregues</label>
                      <input
                        type="number"
                        value={entregues}
                        onChange={(e) => setEntregues(Number(e.target.value))}
                        min={0}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-center font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-400 block font-mono text-rose-500">Qtd Devolvidos</label>
                      <input
                        type="number"
                        value={devolucoes}
                        onChange={(e) => setDevolucoes(Number(e.target.value))}
                        min={0}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-center font-mono"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-[10px] text-slate-400">
                    <span>Saldo Pendente Projetado:</span>
                    <span className="block text-sky-450 font-bold text-xs">
                      {Math.max(0, totalEntregas - entregues - devolucoes)} entregas restantes
                    </span>
                  </div>
                </>
              ) : (
                renderEntregaOffPanel("create")
              )}

              <div className="pt-1.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => resetForm()}
                  className="w-1/3 bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white rounded py-2 border border-slate-800 font-medium transition"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-sky-600 hover:bg-sky-500 text-white font-medium py-2 rounded transition"
                >
                  Registrar Viagem
                </button>
              </div>
            </form>
          </div>
        )}

        {/* EDIT DT COMPREHENSIVE FORM PANEL */}
        {editingRoute && (
          <div className="bg-slate-900 p-5 rounded-xl border border-emerald-800 h-fit space-y-4 animate-fadeIn shadow-xl shadow-emerald-950/10">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <div className="p-1 px-1.5 bg-emerald-500/10 text-emerald-400 rounded text-xs font-mono font-bold">
                  Editar
                </div>
                <h3 className="text-sm font-semibold text-white">Editar Viagem DT #{editingRoute.dt}</h3>
              </div>
              <button onClick={() => setEditingRoute(null)} className="text-xs text-rose-400 hover:text-white font-mono">
                X Cancelar
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 font-sans text-xs">
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Data Partida (Saída)</label>
                  <input
                    type="date"
                    required
                    value={editData}
                    onChange={(e) => setEditData(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono text-indigo-400">Data Prevista Chegada</label>
                  <input
                    type="date"
                    required
                    value={editDataPrevista}
                    onChange={(e) => setEditDataPrevista(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Veículo Reescalado</label>
                <select
                  value={editVeiculoId}
                  onChange={(e) => setEditVeiculoId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white focus:outline-none"
                  required
                >
                  {veiculos.filter(v => !isVehicleBlocked(v) || editVeiculoId === v.id).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.placa} - {v.modelo} ({v.perfil})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Motorista Responsável</label>
                <select
                  value={editMotoristaId}
                  onChange={(e) => setEditMotoristaId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white focus:outline-none cursor-help"
                  required
                >
                  <option value="">Selecione condutor...</option>
                  {motoristas.filter(m => m.tipo === "Motorista" || !m.tipo).map((m) => (
                    <option 
                      key={m.id} 
                      value={m.id}
                      disabled={(m.statusFinal === "BLOQUEADO" || m.statusFinal === "PENDENTE") && m.id !== editMotoristaId}
                      title={m.statusFinal === "BLOQUEADO" ? m.motivoBloqueio : m.statusFinal === "PENDENTE" ? "Pendente em agregamento" : undefined}
                      className={m.statusFinal === "BLOQUEADO" ? "text-rose-550 line-through" : m.statusFinal === "PENDENTE" ? "text-amber-500 font-semibold" : "text-white"}
                    >
                      {m.nome} {m.statusFinal === "BLOQUEADO" ? `(BLOQUEADO - ${m.motivoBloqueio || "Vencido"})` : m.statusFinal === "PENDENTE" ? `(PENDENTE - Agregamento)` : ""}
                    </option>
                  ))}
                </select>
                {renderSelectedAjudantesList()}
                {renderIntelligentTeamSelectionPanel("edit")}
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 block font-mono font-bold text-amber-400">Modificar Status Operacional *</label>
                <select
                  value={editStatusViagem}
                  onChange={(e) => setEditStatusViagem(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white focus:outline-none font-bold"
                  required
                >
                  <option value="Aguardando Carregamento">Aguardando Carregamento</option>
                  <option value="Em Carregamento">Em Carregamento</option>
                  <option value="Em Rota">Em Rota</option>
                  <option value="Em Descarga">Em Descarga</option>
                  <option value="AG.DESCARGA">AG.DESCARGA</option>
                  <option value="Finalizada">Finalizada</option>
                  <option value="Cancelada">Cancelada</option>
                  <option value="Veículo Quebrado">Veículo Quebrado</option>
                  <option value="Retorno Base">Retorno Base</option>
                </select>
              </div>

              {editingRoute.tipo && String(editingRoute.tipo).toLowerCase().includes("reentrega") && (
                <div className="p-3 bg-amber-950/40 border-2 border-amber-500/60 rounded-xl space-y-2 animate-fadeIn shadow-lg shadow-amber-950/20">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-300 font-mono flex items-center gap-1.5">
                      <LucideAlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span>VALIDAÇÃO DA REENTREGA (FECHAMENTO)</span>
                    </label>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                      Edição de Status
                    </span>
                  </div>
                  <p className="text-xs text-amber-200/90 font-medium leading-tight">
                    A reentrega já foi devidamente validada pelo setor responsável?
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditReentregaValidadaState("Sim")}
                      className={`py-2 px-3 rounded-lg text-xs font-bold font-mono transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        editReentregaValidadaState === "Sim"
                          ? "bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-lg shadow-emerald-900/50"
                          : "bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800"
                      }`}
                    >
                      <LucideCheckCircle className="w-3.5 h-3.5" /> SIM (Validada)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditReentregaValidadaState("Não")}
                      className={`py-2 px-3 rounded-lg text-xs font-bold font-mono transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        editReentregaValidadaState === "Não"
                          ? "bg-rose-600 text-white ring-2 ring-rose-400 shadow-lg shadow-rose-900/50"
                          : "bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800"
                      }`}
                    >
                      <LucideX className="w-3.5 h-3.5" /> NÃO (Pendente / Alerta)
                    </button>
                  </div>
                </div>
              )}

              {/* CONTROLE DE ENTREGAS REAL TIME */}
              {editingRoute.tipo !== "Entrega OFF" ? (
                <div className="border-t border-slate-800 pt-2 bg-slate-950/20 p-2.5 rounded border border-slate-850 space-y-2">
                  <span className="text-sky-300 font-mono text-[10px] font-bold block uppercase tracking-wider">
                    Controle Logístico & Quantidades
                  </span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-slate-450 block font-mono text-[10px]">Previstos (Total)</label>
                      <input
                        type="number"
                        required
                        value={editTotalEntregas}
                        onChange={(e) => setEditTotalEntregas(Number(e.target.value))}
                        min={1}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-center font-mono font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-emerald-450 block font-mono text-[10px]">Entregues (Sucesso)</label>
                      <input
                        type="number"
                        required
                        value={editEntregues}
                        onChange={(e) => setEditEntregues(Number(e.target.value))}
                        min={0}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-emerald-450 text-center font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-red-400 block font-mono text-[10px]">Recusados (Rejeição)</label>
                      <input
                        type="number"
                        required
                        value={editRecusadas}
                        onChange={(e) => setEditRecusadas(Number(e.target.value))}
                        min={0}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-red-400 text-center font-mono font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-amber-500 block font-mono text-[10px]">Devolvidos</label>
                      <input
                        type="number"
                        required
                        value={editDevolucoes}
                        onChange={(e) => setEditDevolucoes(Number(e.target.value))}
                        min={0}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-amber-400 text-center font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-850 flex justify-between items-center text-[10px] font-mono">
                    <span className="text-slate-400 block">Restantes (Pendentes):</span>
                    <span className="bg-slate-950 px-2 py-0.5 rounded text-sky-400 font-extrabold text-xs block">
                      {Math.max(0, editTotalEntregas - editEntregues - editRecusadas - editDevolucoes)} un
                    </span>
                  </div>
                </div>
              ) : (
                renderEntregaOffPanel("edit")
              )}

              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Observações Operacionais</label>
                <textarea
                  value={editObservacoes}
                  onChange={(e) => setEditObservacoes(e.target.value)}
                  placeholder="Justifique atrasos, indique doc de ocorrências ou dados de restrição..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-sans text-xs"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRoute(null)}
                  className="w-1/3 bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white rounded py-2 border border-slate-800 font-medium transition"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded transition flex items-center justify-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  {loading ? "Gravando..." : "Salvar Edição"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* REGISTRY OCORRENCIA MODAL FLOATER */}
        {occurrenceRouteId && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-scaleUp">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-1 text-slate-300">
                  <LucideX className="w-4 h-4 text-rose-500 hover:scale-110 cursor-pointer" onClick={() => setOccurrenceRouteId(null)} />
                  <span className="text-xs font-mono text-slate-400 ml-1.5">DT: {rotas.find(x => x.id === occurrenceRouteId)?.dt}</span>
                </div>
                <h4 className="text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <LucideAlertTriangle className="w-4 h-4 text-amber-400" /> Nova Ocorrência
                </h4>
              </div>

              <form onSubmit={handleSaveOccurrence} className="space-y-3 text-xs leading-relaxed">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Tipo de Incidente *</label>
                  <select
                    value={occTipo}
                    onChange={(e) => setOccTipo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-semibold text-xs"
                    required
                  >
                    <option value="Atraso">Atraso de Viagem</option>
                    <option value="Trânsito">Trânsito Intenso / Congestionamento</option>
                    <option value="Acidente">Acidente Rodoviário (Sinistro)</option>
                    <option value="Cliente Ausente">Cliente Ausente / Estabelecimento Fechado</option>
                    <option value="Recusa">Recusa Parcial/Total da Carga</option>
                    <option value="Falta de Mercadoria">Falta de Mercadoria / Sobra de Carga</option>
                    <option value="Problema Mecânico">Problema Mecânico / Quebra do Veículo</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-450 block font-mono font-bold text-slate-400">Data *</label>
                    <input
                      type="date"
                      required
                      value={occData}
                      onChange={(e) => setOccData(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-450 block font-mono font-bold text-slate-400">Horário *</label>
                    <input
                      type="text"
                      required
                      value={occHora}
                      onChange={(e) => setOccHora(e.target.value)}
                      placeholder="Ex: 14:35"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white font-mono text-center"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Descrição & Detalhamento da Ocorrência *</label>
                  <textarea
                    required
                    value={occDescricao}
                    onChange={(e) => setOccDescricao(e.target.value)}
                    placeholder="Especifique nome do cliente, quilometragem ou problema mecânico..."
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-sans text-xs"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setOccurrenceRouteId(null)}
                    className="px-4 py-2 bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white rounded border border-slate-800 transition"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded transition"
                  >
                    {loading ? "Salvando..." : "Registrar Ocorrência"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DT LISTINGS TABLE */}
        <div className={`${isAdding || selectedDtId || editingRoute ? "lg:col-span-2" : "col-span-full"} space-y-4`}>
          {/* Query Filters */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <LucideSearch className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Pesquisa rápida por DT, placa ou condutor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                />
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {/* Segmented control for Cards / Table view */}
                <div className="bg-slate-950 border border-slate-800 rounded p-0.5 flex items-center">
                  <button
                    type="button"
                    onClick={() => setViewMode("cards")}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition flex items-center gap-1 ${
                      viewMode === "cards"
                        ? "bg-sky-500/15 text-sky-400 font-extrabold"
                        : "text-slate-500 hover:text-slate-350"
                    }`}
                  >
                    <LucideLayers className="w-3.5 h-3.5" /> Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition flex items-center gap-1 ${
                      viewMode === "table"
                        ? "bg-sky-500/15 text-sky-400 font-extrabold"
                        : "text-slate-500 hover:text-slate-350"
                    }`}
                  >
                    <LucideFileText className="w-3.5 h-3.5" /> Tabela
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`px-3 py-1.5 rounded text-xs font-mono border transition flex items-center gap-1.5 ${
                    showAdvancedFilters 
                      ? "bg-sky-500/15 border-sky-450 text-sky-400" 
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-750"
                  }`}
                >
                  <LucideLayers className="w-3.5 h-3.5" />
                  {showAdvancedFilters ? "Recolher Filtros" : "Filtros Avançados"}
                </button>

                <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800">
                  {filtered.length} rotas filtradas
                </span>
              </div>
            </div>

            {/* Collapsible Advanced Filters Content */}
            {showAdvancedFilters && (
              <div className="pt-3 border-t border-slate-800/60 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 animate-fadeIn text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 block font-mono">Número DT</label>
                  <input
                    type="text"
                    placeholder="Filtrar DT..."
                    value={filterDt}
                    onChange={(e) => setFilterDt(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white focus:outline-none focus:border-slate-700 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 block font-mono">Veículo</label>
                  <input
                    type="text"
                    placeholder="Filtrar veículo/placa..."
                    value={filterVeiculo}
                    onChange={(e) => setFilterVeiculo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white focus:outline-none focus:border-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 block font-mono">Motorista</label>
                  <input
                    type="text"
                    placeholder="Filtrar motorista..."
                    value={filterMotorista}
                    onChange={(e) => setFilterMotorista(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white focus:outline-none focus:border-slate-700"
                  />
                </div>

                {unidades.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-mono">Unidade</label>
                    <select
                      value={filterUnidade}
                      onChange={(e) => setFilterUnidade(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none"
                    >
                      <option value="">Todas</option>
                      {unidades.map((u) => (
                        <option key={u.id} value={u.id}>{u.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 block font-mono">Data</label>
                  <input
                    type="date"
                    value={filterData}
                    onChange={(e) => setFilterData(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 block font-mono">Status Operação</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none focus:border-slate-700 font-bold"
                  >
                    <option value="">Todos</option>
                    <option value="Aguardando Carregamento">Ag. Carregamento</option>
                    <option value="Em Carregamento">Em Carregamento</option>
                    <option value="Em Rota">Em Rota</option>
                    <option value="Em Descarga">Em Descarga</option>
                    <option value="AG.DESCARGA">AG.DESCARGA</option>
                    <option value="Finalizada">Finalizada</option>
                    <option value="Cancelada">Cancelada</option>
                    <option value="Veículo Quebrado">V. Quebrado</option>
                    <option value="Retorno Base">Retorno Base</option>
                  </select>
                </div>
              </div>
            )}

            {(filterDt || filterVeiculo || filterMotorista || filterUnidade || filterData || filterStatus) && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setFilterDt("");
                    setFilterVeiculo("");
                    setFilterMotorista("");
                    setFilterUnidade("");
                    setFilterData("");
                    setFilterStatus("");
                  }}
                  className="text-[10px] text-rose-450 hover:underline flex items-center gap-1 font-mono cursor-pointer"
                >
                  <LucideX className="w-3 h-3" /> Limpar filtros aplicados
                </button>
              </div>
            )}
          </div>

          {/* TABLE DISPLAY */}
          {viewMode === "table" ? (
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/20 text-slate-450 uppercase tracking-wider font-mono text-[10px]">
                    <th className="py-3 px-3">Dados DT</th>
                    <th className="py-3 px-3">Veículo / Placa</th>
                    <th className="py-3 px-3">Motorista</th>
                    <th className="py-3 px-3">Itinerário (Real/Rec/Recusa/Pend)</th>
                    <th className="py-3 px-3">Estado Rota</th>
                    <th className="py-3 px-3 text-center">Faturamento</th>
                    <th className="py-3 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filtered.map((r) => {
                    const vObj = veiculos.find((v) => v.id === r.veiculoId);
                    const mObj = motoristas.find((m) => m.id === r.motoristaId);
                    
                    const pend = Math.max(0, r.totalEntregas - r.entregues - (r.recusadas || 0) - r.devolucoes);
                    const linkedNoShow = noShows?.find((ns: any) => ns.dt === r.dt);

                    return (
                      <React.Fragment key={r.id}>
                        <tr className="hover:bg-slate-850/15 transition">
                          
                          {/* DT general info and expanded tabs trigger */}
                          <td className="py-3.5 px-3">
                            <div className="space-y-0.5">
                              <span className="text-white font-bold block font-mono text-xs">DT #{r.dt}</span>
                              <span className="text-[10px] text-slate-400 font-mono block">Saída: {r.data} • {r.tipo}</span>
                              
                              {r.tipo && String(r.tipo).toLowerCase().includes("reentrega") && (
                                <div className="mt-1">
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono border ${
                                    (r.reentrega_validada || r.reentregaValidada || r.status_validacao === "VALIDADA")
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                      : "bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse"
                                  }`}>
                                    {(r.reentrega_validada || r.reentregaValidada || r.status_validacao === "VALIDADA")
                                      ? <><LucideCheckCircle className="w-3 h-3 text-emerald-400" /> Validada</>
                                      : <><LucideAlertTriangle className="w-3 h-3 text-rose-400" /> NÃO Validada</>}
                                  </span>
                                </div>
                              )}
                              
                              {linkedNoShow && (
                                <div className="mt-1.5 space-y-1">
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-505/10 text-rose-400 border border-rose-505/15 animate-pulse select-none">
                                    <LucideAlertTriangle className="w-3 h-3 text-rose-400" /> Entrega com No Show ({linkedNoShow.statusNoShow})
                                  </span>
                                  <div className="text-[9px] bg-slate-950/65 border border-slate-800 rounded p-1.5 text-slate-400 font-sans max-w-[200px] leading-tight space-y-0.5">
                                    <p className="font-semibold text-rose-400 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Esta DT possui registro de No Show.</p>
                                    <p className="font-mono text-[8px] text-slate-500">Status: {linkedNoShow.statusNoShow}</p>
                                    {linkedNoShow.statusNoShow === "Resolvido" && (
                                      <p className="leading-normal">
                                        <b className="text-slate-400">Motorista Substituto:</b>{" "}
                                        <span className="text-emerald-400 font-semibold">
                                          {motoristas.find((m) => m.id === linkedNoShow.motoristaSubstituto)?.nome || linkedNoShow.motoristaSubstituto || "Não Informado"}
                                        </span>
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => setExpandedTimelineId(expandedTimelineId === r.id ? null : r.id)}
                                className="mt-1 flex items-center gap-1 text-[10px] text-sky-450 hover:text-sky-300 font-mono transition cursor-pointer"
                              >
                                <LucideClock className="w-3 h-3 text-slate-500" />
                                Histórico & Ocorrências ({r.ocorrencias?.length || 0})
                              </button>
                            </div>
                          </td>

                          {/* Vehicle */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <LucideTruck className="w-3.5 h-3.5 text-slate-500" />
                              <span className="text-slate-300 font-mono uppercase bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                                {vObj ? vObj.placa : "N/D"}
                              </span>
                            </div>
                          </td>

                          {/* Driver */}
                          <td className="py-3.5 px-3">
                            <span className="text-slate-300 font-medium font-sans block max-w-[120px] truncate" title={mObj?.nome}>
                              {mObj ? mObj.nome : "Sem Driver"}
                            </span>
                            {r.ajudantesIds && r.ajudantesIds.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1 max-w-[120px]">
                                {r.ajudantesIds.map(hId => {
                                  const h = motoristas.find(m => m.id === hId);
                                  if (!h) return null;
                                  return (
                                    <span key={hId} className="inline-flex items-center gap-1 bg-teal-950/20 text-teal-400 border border-teal-900 px-1 py-0.5 rounded text-[8px] font-mono leading-none font-bold whitespace-nowrap" title={h.nome}>
                                      <LucideUser className="w-2.5 h-2.5" /> {h.nome.split(" ")[0]}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>

                          {/* Cargo Stats with New Recusadas field */}
                          <td className="py-3.5 px-3 font-sans">
                            <div className="font-mono text-[10px] leading-relaxed">
                              <span className="text-slate-500">Ttl:</span> <span className="text-white font-bold mr-1">{r.totalEntregas}</span>
                              <span className="text-emerald-500">Ok:</span> <span className="text-emerald-450 mr-1">{r.entregues}</span>
                              <span className="text-red-400">Rec:</span> <span className="text-red-400 mr-1">{r.recusadas || 0}</span>
                              <span className="text-amber-500">Dev:</span> <span className="text-amber-400 mr-1">{r.devolucoes}</span>
                              <span className="text-sky-450">Pnd:</span> <span className="text-sky-300 font-bold">{pend}</span>
                            </div>
                          </td>

                          {/* Status Select Inline */}
                          <td className="py-3.5 px-3">
                            <div className="flex flex-col gap-1.5 min-w-[145px]">
                              {renderOperationStatusBadge(r.status_viagem || r.status)}
                              
                              <select
                                value={r.status_viagem || r.status}
                                onChange={(e) => handleUpdateStatus(r.id, { status_viagem: e.target.value })}
                                className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-slate-300 text-[9px] font-mono focus:outline-none cursor-pointer focus:border-slate-700 hover:bg-slate-900 transition"
                              >
                                <option value="Aguardando Carregamento">Ag. Carregamento</option>
                                <option value="Em Carregamento">Em Carregamento</option>
                                <option value="Em Rota">Em Rota</option>
                                <option value="Em Descarga">Em Descarga</option>
                                <option value="AG.DESCARGA">AG.DESCARGA</option>
                                <option value="Finalizada">Finalizada</option>
                                <option value="Cancelada">Cancelada</option>
                                <option value="Veículo Quebrado">V. Quebrado</option>
                                <option value="Retorno Base">Retorno Base</option>
                              </select>
                            </div>
                          </td>

                          {/* Invoice Launcher (NFs) */}
                          <td className="py-3.5 px-3 text-center">
                            <button
                              onClick={() => handleOpenNoteManager(r.id)}
                              className="px-2 py-1 bg-slate-950 hover:bg-slate-850 hover:text-white border border-slate-800 text-sky-400 rounded text-[9px] font-mono flex items-center justify-center gap-1 mx-auto"
                            >
                              <LucideFileText className="w-3 h-3" />
                              Ver/Add NFs
                            </button>
                          </td>

                          {/* Multiple Actions: EDIT, OCORRENCIA, ACCIDENT, TRASH */}
                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* New Occurrence button */}
                              <button
                                onClick={() => openOccurrenceModal(r.id)}
                                className="px-1.5 py-0.5 text-[9px] font-mono bg-amber-600/10 text-amber-400 hover:bg-amber-600/30 border border-amber-650/20 hover:text-white rounded flex items-center gap-1 select-none transition"
                                title="Registrar Nova Ocorrência"
                              >
                                <LucideAlertTriangle className="w-3 h-3 text-amber-400" /> Ocorrência
                              </button>

                              {/* Edit DT button */}
                              <button
                                onClick={() => startEditing(r)}
                                className="p-1 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded text-slate-400 hover:text-white"
                                title="Editar DT"
                              >
                                <LucideEdit className="w-3 h-3 text-sky-400" />
                              </button>

                              {/* Delete DT button */}
                              <button
                                onClick={() => handleDeleteRoute(r.id)}
                                className="p-1 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded text-slate-500 hover:text-rose-455"
                                title="Remover DT"
                              >
                                <LucideTrash className="w-3 h-3 text-rose-500" />
                              </button>
                            </div>
                          </td>

                        </tr>

                        {/* DETAILED TABS AND EXPANSED HISTORIES SEGMENT */}
                        {expandedTimelineId === r.id && (
                          <tr className="bg-slate-950/25 border-b border-slate-850">
                            <td colSpan={7} className="p-4">
                              <div className="bg-slate-950 rounded-lg p-4 border border-slate-850 space-y-4">
                                
                                {/* Inner Segment Navigation Tabs */}
                                <div className="flex items-center gap-3 border-b border-slate-850 pb-2">
                                  <button
                                    onClick={() => setExpandedTab("timeline")}
                                    className={`text-[10px] font-mono font-bold uppercase tracking-wider pb-1 flex items-center gap-1 cursor-pointer transition ${
                                      expandedTab === "timeline" ? "text-sky-450 border-b-2 border-sky-400" : "text-slate-500 hover:text-slate-300"
                                    }`}
                                  >
                                    <LucideClock className="w-3 h-3" />
                                    Timeline Status
                                  </button>

                                  <button
                                    onClick={() => setExpandedTab("changelog")}
                                    className={`text-[10px] font-mono font-bold uppercase tracking-wider pb-1 flex items-center gap-1 cursor-pointer transition ${
                                      expandedTab === "changelog" ? "text-indigo-400 border-b-2 border-indigo-455" : "text-slate-500 hover:text-slate-300"
                                    }`}
                                  >
                                    <History className="w-3 h-3" />
                                    Auditoria de Mudanças
                                  </button>

                                  <button
                                    onClick={() => setExpandedTab("occurrences")}
                                    className={`text-[10px] font-mono font-bold uppercase tracking-wider pb-1 flex items-center gap-1 cursor-pointer transition ${
                                      expandedTab === "occurrences" ? "text-amber-400 border-b-2 border-amber-400" : "text-slate-500 hover:text-slate-300"
                                    }`}
                                  >
                                    <LucideAlertTriangle className="w-3 h-3" />
                                    Anomalias / Ocorrências ({r.ocorrencias?.length || 0})
                                  </button>

                                  <div className="ml-auto font-mono text-[9px] text-slate-500 uppercase flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded cursor-default select-none">
                                    <span>Obs Operacionais:</span>
                                    <span className="text-slate-300 italic truncate max-w-xs">{r.observacoes_operacionais || "Nenhuma"}</span>
                                  </div>
                                </div>

                                {/* TAB PANEL 1: TIMELINE STATUS CHANGES */}
                                {expandedTab === "timeline" && (
                                  <div className="relative border-l border-slate-800 ml-2.5 pl-4 space-y-3.5 text-xs py-1.5 max-h-56 overflow-y-auto">
                                    {(r.historico_status && r.historico_status.length > 0) ? (
                                      r.historico_status.map((log, lIdx) => (
                                        <div key={lIdx} className="relative">
                                          <span className="absolute -left-[21.5px] top-1.5 w-2 h-2 rounded-full bg-sky-500 border border-slate-900 shadow"></span>
                                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                                            <div className="flex items-center gap-2">
                                              {renderOperationStatusBadge(log.status)}
                                              <span className="text-slate-500 font-sans">operado por</span>
                                              <span className="text-slate-300 font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800/40 font-semibold">{log.usuario || "sistema"}</span>
                                            </div>
                                            <div className="text-slate-500 font-mono text-[10px]">
                                              {log.data} • {log.hora}
                                            </div>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="relative">
                                        <span className="absolute -left-[21.5px] top-1.5 w-2 h-2 rounded-full bg-slate-650 border border-slate-900"></span>
                                        <div className="flex items-center gap-3">
                                          {renderOperationStatusBadge(r.status_viagem || r.status)}
                                          <span className="text-slate-500 font-mono text-[10px]">{r.data} • 00:00 (Criação do Documento)</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* TAB PANEL 2: AUDIT LOG OF DATA FIELD CHANGES */}
                                {expandedTab === "changelog" && (
                                  <div className="space-y-2 max-h-56 overflow-y-auto font-sans text-xs">
                                    {r.log_alteracoes && r.log_alteracoes.length > 0 ? (
                                      <div className="divide-y divide-slate-850">
                                        {r.log_alteracoes.map((log, chIdx) => (
                                          <div key={chIdx} className="py-2.5 flex flex-col sm:flex-row sm:items-start justify-between gap-2 first:pt-0">
                                            <div className="space-y-1">
                                              <div className="flex items-center gap-2 text-[10px] font-mono">
                                                <span className="text-slate-550 block">Campo:</span>
                                                <span className="text-sky-300 font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">{log.campo}</span>
                                                <span className="text-slate-550">modificado por</span>
                                                <span className="text-slate-300 font-semibold">{log.usuario}</span>
                                              </div>
                                              <div className="text-[11px] leading-relaxed text-slate-350">
                                                <span>Antes: </span><span className="text-slate-500 line-through mr-3">{log.antes}</span>
                                                <span>Depois: </span><span className="text-emerald-400 font-semibold">{log.depois}</span>
                                              </div>
                                            </div>
                                            <span className="text-[10px] text-slate-500 font-mono block sm:self-center">
                                              {log.data} • {log.hora}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-center text-slate-500 font-mono py-4 text-[11px] italic">
                                        Nenhuma alteração de dados cadastada sob auditoria para esta DT.
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* TAB PANEL 3: TRIP INCIDENT OCCURRENCES */}
                                {expandedTab === "occurrences" && (
                                  <div className="space-y-3 max-h-62 overflow-y-auto">
                                    <div className="flex justify-between items-center bg-slate-900/35 p-2 rounded border border-slate-850">
                                      <span className="text-[10px] text-slate-400 font-mono italic">
                                        Anomalias rodoviárias e logísticas (atraso, trânsito, quebras, etc.) registradas sobre o trajeto.
                                      </span>
                                      
                                      <button
                                        onClick={() => openOccurrenceModal(r.id)}
                                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-semibold font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                                      >
                                        <LucideAlertTriangle className="w-3.5 h-3.5 text-amber-200" /> Registrar Ocorrência
                                      </button>
                                    </div>

                                    <div className="space-y-2">
                                      {r.ocorrencias && r.ocorrencias.length > 0 ? (
                                        r.ocorrencias.map((occ) => (
                                          <div key={occ.id} className="bg-slate-900/60 p-3 rounded-lg border border-slate-850 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs leading-relaxed transition hover:border-slate-800">
                                            <div className="space-y-1">
                                              <div className="flex items-center gap-2">
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/10 uppercase tracking-wider flex items-center gap-1">
                                                  <LucideAlertTriangle className="w-3 h-3 text-amber-400" /> {occ.tipo}
                                                </span>
                                                <span className="text-slate-500 text-[10px]">de</span>
                                                <span className="text-slate-350 font-semibold text-[10px] font-mono uppercase bg-slate-950 px-1 py-0.5 rounded border border-slate-850">{occ.usuario}</span>
                                              </div>
                                              <p className="text-slate-300 font-medium pl-1">{occ.descricao}</p>
                                            </div>

                                            <div className="text-[10px] text-slate-500 font-mono text-right shrink-0">
                                              {occ.data} • {occ.hora}
                                            </div>
                                          </div>
                                        ))
                                      ) : (
                                        <p className="text-center text-slate-500 font-mono py-6 text-[11px] italic">
                                          Nenhum incidente ou ocorrência registrada nesta viagem. Operação ocorrendo perfeitamente conformada.
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}

                              </div>
                            </td>
                          </tr>
                        )}

                      </React.Fragment>
                    );
                  })}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                        Nenhuma viagem DT registrada para esta pesquisa.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
          ) : (
            /* CARDS GRID DISPLAY */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
              {filtered.map((r) => {
                const vObj = veiculos.find((v) => v.id === r.veiculoId);
                const mObj = motoristas.find((m) => m.id === r.motoristaId);
                const colors = getRouteStatusColor(r);
                
                const total = r.tipo === "Entrega OFF" ? (r.qtdNF || 1) : r.totalEntregas;
                const delivered = r.tipo === "Entrega OFF" ? (r.entregues || 0) : r.entregues;
                const pending = Math.max(0, total - delivered - (r.devolucoes || 0));
                const percentConcluido = total > 0 ? Math.round((delivered / total) * 100) : 0;
                
                const isOff = r.tipo === "Entrega OFF";
                const specStatus = mapStatusToSpec(r.status_viagem || r.status);

                return (
                  <div
                    key={r.id}
                    className={`bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg hover:border-slate-700 transition flex flex-col justify-between border-l-4 ${colors.border}`}
                  >
                    {/* Card Header */}
                    <div className="p-4 border-b border-slate-800 flex justify-between items-start gap-2 bg-slate-950/20">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold font-mono text-sm">DT #{r.dt}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isOff ? "bg-amber-500/15 text-amber-400 border border-amber-500/10" : "bg-sky-500/15 text-sky-400 border border-sky-500/10"}`}>
                            {r.tipo}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-1">
                          <LucideCalendar className="w-3 h-3 text-slate-500" /> Saída: {r.data}
                        </span>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono border whitespace-nowrap ${specStatus.color}`}>
                          <span>{specStatus.text}</span>
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-4 flex-1 text-xs">
                      
                      {/* Bloco 1 & 2: Veículo e Condutor */}
                      <div className="grid grid-cols-2 gap-3 bg-slate-950/45 p-3 rounded-xl border border-slate-850/80">
                        {/* Bloco 1: Veículo */}
                        <div className="flex items-start gap-2.5">
                          <LucideTruck className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" aria-label="Veículo" />
                          <div>
                            <span className="text-slate-500 block text-[9px] font-mono uppercase tracking-wider">Veículo</span>
                            <span className="text-slate-200 font-bold font-mono text-xs block">
                              {vObj ? vObj.placa : r.veiculoPlaca || "Não escalado"}
                            </span>
                            <span className="text-slate-400 text-[10px] block mt-0.5 leading-tight truncate max-w-[100px]">
                              {vObj ? `${vObj.perfil} • ${vObj.modelo}` : "Sem perfil"}
                            </span>
                          </div>
                        </div>

                        {/* Bloco 2: Condutor */}
                        <div className="flex items-start gap-2.5 border-l border-slate-850 pl-3">
                          {mObj?.fotoDocumentoUrl ? (
                            <img
                              src={mObj.fotoDocumentoUrl}
                              alt={mObj.nome}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full object-cover border border-slate-800"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-bold text-sky-400 font-mono flex-shrink-0">
                              {mObj ? mObj.nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase() : <LucideUser className="w-3.5 h-3.5" />}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-slate-500 block text-[9px] font-mono uppercase tracking-wider">Condutor</span>
                            <span className="text-slate-200 font-bold text-xs block truncate" title={mObj ? mObj.nome : "Não escalado"}>
                              {mObj ? mObj.nome : "Não escalado"}
                            </span>
                            {mObj && (
                              <span className="text-slate-450 text-[9px] flex items-center gap-1 font-mono mt-0.5">
                                <LucidePhone className="w-2.5 h-2.5 text-slate-500" /> {mObj.telefone || "Sem fone"}
                              </span>
                            )}
                            <span className="text-slate-550 text-[8px] flex items-center gap-1 mt-0.5 truncate">
                              <LucideMapPin className="w-2.5 h-2.5 text-slate-500" /> {unidades.find(u => u.id === r.unidadeId || u.id === mObj?.unidadeId)?.nome || "Não informado"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* CONDITIONAL ENTREGA OFF INFO */}
                      {isOff && (
                        <>
                          <div className="space-y-3 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                            {/* Cliente Header */}
                            <div className="border-b border-slate-800/60 pb-1.5">
                              <span className="text-amber-400 font-mono text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <LucideUser className="w-3 h-3 text-amber-400" /> Informações do Cliente
                              </span>
                              <div className="mt-1 space-y-1">
                                <p className="text-white font-extrabold font-sans">
                                  <span className="text-slate-500 font-mono text-[10px] mr-1">[{r.clienteCodigo}]</span>
                                  {r.clienteNome}
                                </p>
                                {r.clienteCNPJ && <p className="text-[10px] text-slate-450 font-mono">CNPJ: {r.clienteCNPJ}</p>}
                                <p className="text-[10px] text-slate-400 leading-tight">
                                  {r.clienteEndereco}, {r.clienteCidade} - <span className="font-mono font-bold text-amber-500">{r.clienteUF}</span>
                                </p>
                              </div>
                            </div>

                            {/* Entrega Header */}
                            <div>
                              <span className="text-amber-400 font-mono text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <Package className="w-3 h-3 text-amber-400" /> Informações da Entrega OFF
                              </span>
                              <div className="mt-1.5 grid grid-cols-3 gap-2 text-center font-mono text-[10px]">
                                <div className="bg-slate-950 p-1.5 rounded border border-slate-850">
                                  <span className="text-slate-550 block text-[8px] uppercase font-mono">Qtd NF</span>
                                  <span className="text-slate-200 font-bold">{r.qtdNF}</span>
                                </div>
                                <div className="bg-slate-950 p-1.5 rounded border border-slate-850 col-span-2">
                                  <span className="text-slate-550 block text-[8px] uppercase font-mono">Valor Total</span>
                                  <span className="text-emerald-400 font-bold">R$ {r.valorTotalEntrega?.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                              </div>
                              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                                {r.qtdVolumes !== undefined && r.qtdVolumes > 0 && (
                                  <p className="text-slate-400"><b className="text-slate-500">Volumes:</b> <span className="font-mono text-slate-300">{r.qtdVolumes}</span></p>
                                )}
                                {r.observacoesEntrega && (
                                  <p className="text-slate-400 col-span-2"><b className="text-slate-500">Obs:</b> <span className="italic text-amber-400/90">{r.observacoesEntrega}</span></p>
                                )}
                              </div>

                              {r.numerosNotas && r.numerosNotas.length > 0 && (
                                <div className="mt-2.5 pt-2 border-t border-slate-800/40">
                                  <span className="text-amber-400 font-mono text-[9px] font-bold block uppercase tracking-wider mb-1">Notas Fiscais</span>
                                  <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-300 font-mono text-[10px]">
                                    {r.numerosNotas.map((nf, idx) => (
                                      <li key={idx} className="flex items-center gap-1.5 font-mono">
                                        <span className="text-amber-500/70 text-xs">•</span>
                                        <span>{nf}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Evolução da Operação (Novo Painel Sempre Editável) */}
                          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 space-y-3 text-left">
                            <span className="text-sky-400 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                              <TrendingUp className="w-3.5 h-3.5 text-sky-400" /> Evolução da Operação
                            </span>
                            
                            <div className="grid grid-cols-2 gap-2 text-center font-mono">
                              <div className="bg-slate-900/80 p-2 rounded border border-slate-800/60">
                                <span className="text-slate-550 block text-[8px] uppercase">Quantidade Planejada</span>
                                <span className="text-white font-black text-sm">{total}</span>
                              </div>
                              <div className="bg-slate-900/80 p-2 rounded border border-slate-800/60">
                                <span className="text-slate-550 block text-[8px] uppercase">Pendentes</span>
                                <span className={`font-black text-sm ${Math.max(0, total - (r.entregues || 0) - (r.devolucoes || 0) - (r.recusadas || 0)) > 0 ? "text-amber-400 animate-pulse" : "text-emerald-400"}`}>
                                  {Math.max(0, total - (r.entregues || 0) - (r.devolucoes || 0) - (r.recusadas || 0))}
                                </span>
                              </div>
                            </div>

                            <div className="divide-y divide-slate-850/60 space-y-2.5 pt-1.5">
                              {/* Entregues */}
                              <div className="flex items-center justify-between text-xs pt-2.5 first:pt-0">
                                <span className="text-emerald-450 font-medium flex items-center gap-1.5">
                                  <LucideCheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Entregues
                                </span>
                                <div className="flex items-center gap-1">
                                  <button 
                                    type="button"
                                    onClick={() => handleUpdateOffField(r, "entregues", (r.entregues || 0) - 1)}
                                    className="w-7 h-7 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded font-black flex items-center justify-center border border-slate-800 cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <input 
                                    type="number"
                                    value={r.entregues || 0}
                                    onChange={(e) => handleUpdateOffField(r, "entregues", Number(e.target.value))}
                                    className="w-12 bg-slate-950 border border-slate-800 rounded text-center text-white text-xs font-mono font-bold py-1"
                                  />
                                  <button 
                                    type="button"
                                    onClick={() => handleUpdateOffField(r, "entregues", (r.entregues || 0) + 1)}
                                    className="w-7 h-7 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded font-black flex items-center justify-center border border-slate-800 cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              {/* Devolvidas */}
                              <div className="flex items-center justify-between text-xs pt-2.5">
                                <span className="text-amber-500 font-medium flex items-center gap-1.5">
                                  <LucideRotateCcw className="w-3.5 h-3.5 text-amber-400" /> Devolvidas
                                </span>
                                <div className="flex items-center gap-1">
                                  <button 
                                    type="button"
                                    onClick={() => handleUpdateOffField(r, "devolucoes", (r.devolucoes || 0) - 1)}
                                    className="w-7 h-7 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded font-black flex items-center justify-center border border-slate-800 cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <input 
                                    type="number"
                                    value={r.devolucoes || 0}
                                    onChange={(e) => handleUpdateOffField(r, "devolucoes", Number(e.target.value))}
                                    className="w-12 bg-slate-950 border border-slate-800 rounded text-center text-white text-xs font-mono font-bold py-1"
                                  />
                                  <button 
                                    type="button"
                                    onClick={() => handleUpdateOffField(r, "devolucoes", (r.devolucoes || 0) + 1)}
                                    className="w-7 h-7 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded font-black flex items-center justify-center border border-slate-800 cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              {/* Recusadas */}
                              <div className="flex items-center justify-between text-xs pt-2.5">
                                <span className="text-rose-450 font-medium flex items-center gap-1.5">
                                  <LucideX className="w-3.5 h-3.5 text-rose-400" /> Recusadas
                                </span>
                                <div className="flex items-center gap-1">
                                  <button 
                                    type="button"
                                    onClick={() => handleUpdateOffField(r, "recusadas", (r.recusadas || 0) - 1)}
                                    className="w-7 h-7 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded font-black flex items-center justify-center border border-slate-800 cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <input 
                                    type="number"
                                    value={r.recusadas || 0}
                                    onChange={(e) => handleUpdateOffField(r, "recusadas", Number(e.target.value))}
                                    className="w-12 bg-slate-950 border border-slate-800 rounded text-center text-white text-xs font-mono font-bold py-1"
                                  />
                                  <button 
                                    type="button"
                                    onClick={() => handleUpdateOffField(r, "recusadas", (r.recusadas || 0) + 1)}
                                    className="w-7 h-7 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded font-black flex items-center justify-center border border-slate-800 cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Bloco 3: Resumo da operação */}
                      {!isOff && (
                        <div className="bg-slate-950/20 p-3 rounded-xl border border-slate-850/80 space-y-2.5 text-left">
                          <div className="flex justify-between items-center">
                            <span className="text-sky-400 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                              <BarChart2 className="w-3.5 h-3.5 text-sky-400" /> Resumo da Operação
                            </span>
                            <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              Conclusão: {percentConcluido}%
                            </span>
                          </div>

                          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800/85">
                            <div 
                              className="bg-gradient-to-r from-sky-500 to-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                              style={{ width: `${percentConcluido}%` }}
                            ></div>
                          </div>

                          <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[10px]">
                            <div className="bg-slate-950/60 p-1.5 rounded border border-slate-850/60">
                              <span className="text-slate-550 block text-[8px] uppercase">Planejado</span>
                              <span className="text-slate-200 font-bold text-xs">{total}</span>
                            </div>
                            <div className="bg-slate-950/60 p-1.5 rounded border border-slate-850/60">
                              <span className="text-slate-550 block text-[8px] uppercase">Entregues</span>
                              <span className="text-emerald-400 font-bold text-xs">{delivered}</span>
                            </div>
                            <div className="bg-slate-950/60 p-1.5 rounded border border-slate-850/60">
                              <span className="text-slate-550 block text-[8px] uppercase">Devolvidos</span>
                              <span className="text-amber-500 font-bold text-xs">{r.devolucoes || 0}</span>
                            </div>
                            <div className="bg-slate-950/60 p-1.5 rounded border border-slate-850/60">
                              <span className="text-slate-550 block text-[8px] uppercase">Pendentes</span>
                              <span className={`font-bold text-xs ${pending > 0 ? "text-rose-455 animate-pulse" : "text-slate-500"}`}>{pending}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Bloco 4: Linha do Tempo */}
                      {(() => {
                        const times = getTimelineSummary(r);
                        return (
                          <div className="bg-slate-950/20 p-3 rounded-xl border border-slate-850/80 space-y-2 text-left">
                            <span className="text-purple-400 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                              <LucideClock className="w-3.5 h-3.5 text-purple-400" /> Linha do Tempo da DT
                            </span>
                            <div className="grid grid-cols-4 gap-2 pt-1 relative">
                              {/* Decorative connecting lines */}
                              <div className="absolute top-4 left-[12%] right-[12%] h-[1px] bg-slate-850/40 z-0"></div>
                              
                              <div className="flex flex-col items-center text-center relative z-10">
                                <span className="text-[8px] font-mono uppercase text-slate-500 mb-1.5 block">Saída</span>
                                <div className="w-5 h-5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-300">{times.saida}</span>
                              </div>

                              <div className="flex flex-col items-center text-center relative z-10">
                                <span className="text-[8px] font-mono uppercase text-slate-500 mb-1.5 block">Carregando</span>
                                <div className="w-5 h-5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${times.carregamento !== "--:--" ? "bg-blue-400" : "bg-slate-700"}`}></span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-300">{times.carregamento}</span>
                              </div>

                              <div className="flex flex-col items-center text-center relative z-10">
                                <span className="text-[8px] font-mono uppercase text-slate-500 mb-1.5 block">Em Rota</span>
                                <div className="w-5 h-5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${times.rota !== "--:--" ? "bg-purple-400" : "bg-slate-700"}`}></span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-300">{times.rota}</span>
                              </div>

                              <div className="flex flex-col items-center text-center relative z-10">
                                <span className="text-[8px] font-mono uppercase text-slate-500 mb-1.5 block">Última Atu.</span>
                                <div className="w-5 h-5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                </div>
                                <span className="text-[10px] font-mono text-emerald-400 font-bold">{times.atualizacao}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Bloco 5: Indicadores rápidos */}
                      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800/40">
                        <span className="inline-flex items-center gap-1 bg-slate-950/60 text-slate-350 px-2 py-1 rounded-lg border border-slate-850/80 text-[10px] font-mono">
                          <Package className="w-3 h-3 text-slate-400" /> {total} entregas
                        </span>
                        <span className="inline-flex items-center gap-1 bg-slate-950/60 text-slate-350 px-2 py-1 rounded-lg border border-slate-850/80 text-[10px] font-mono">
                          <LucideMapPin className="w-3 h-3 text-slate-400" /> {unidades.find(u => u.id === r.unidadeId || u.id === mObj?.unidadeId)?.cidade || "Goiânia"}
                        </span>
                        <span className="inline-flex items-center gap-1 bg-slate-950/60 text-slate-350 px-2 py-1 rounded-lg border border-slate-850/80 text-[10px] font-mono">
                          <LucideDollarSign className="w-3 h-3 text-slate-400" /> {vObj?.tipo === "Frota Própria" ? "Frota Própria" : "Terceirizado"}
                        </span>
                        {r.ocorrencias && r.ocorrencias.length > 0 && (
                          <span className="inline-flex items-center gap-1 bg-red-950/40 text-rose-450 px-2 py-1 rounded-lg border border-red-900/35 text-[10px] font-mono font-semibold">
                            <LucideAlertTriangle className="w-3 h-3 text-rose-400" /> Ocorrência ({r.ocorrencias.length})
                          </span>
                        )}
                        {isOff && (
                          <span className="inline-flex items-center gap-1 bg-amber-950/40 text-amber-400 px-2 py-1 rounded-lg border border-amber-900/35 text-[10px] font-mono font-semibold">
                            <LucideFileText className="w-3 h-3 text-amber-400" /> Entrega OFF
                          </span>
                        )}
                        {vObj?.perfil && (
                          <span className="inline-flex items-center gap-1 bg-slate-950/60 text-slate-350 px-2 py-1 rounded-lg border border-slate-850/80 text-[10px] font-mono">
                            <LucideTruck className="w-3 h-3" /> {vObj.perfil}
                          </span>
                        )}
                      </div>

                      {/* Operational Remarks */}
                      {r.observacoes_operacionais && (
                        <p className="text-[10px] text-slate-500 font-sans italic border-t border-slate-850/60 pt-2">
                          <b>Obs:</b> {r.observacoes_operacionais}
                        </p>
                      )}
                    </div>

                    {/* Card Actions Footer */}
                    <div className="p-3 bg-slate-950/50 border-t border-slate-800/80 grid grid-cols-2 gap-2">
                      <div className="col-span-2 flex justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setHistoryModalRoute(r);
                          }}
                          className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-lg py-1.5 text-[11px] font-mono transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <LucideClock className="w-3.5 h-3.5 text-slate-500" />
                          Histórico da Operação
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            setSharingRoute(r);
                          }}
                          className="px-2.5 bg-slate-900 border border-slate-800 text-amber-400 hover:text-amber-300 rounded-lg py-1.5 text-[11px] font-mono transition flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Gerar Card para Compartilhamento"
                        >
                          <LucideShare2 className="w-3.5 h-3.5 text-amber-400" /> Compartilhar
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          startEditing(r);
                        }}
                        className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg py-1.5 text-[11px] font-mono transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <LucideEdit className="w-3.5 h-3.5 text-sky-400" /> Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          startEditing(r);
                        }}
                        className="bg-sky-600 hover:bg-sky-500 text-white rounded-lg py-1.5 text-[11px] font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-white" /> Atualizar Status
                      </button>
                    </div>



                    {/* Expanding timeline / changelog inside Card */}
                    {expandedTimelineId === r.id && (
                      <div className="border-t border-slate-800 bg-slate-950/95 p-4 space-y-4 animate-fadeIn">
                        {/* Tab Headers */}
                        <div className="flex gap-2.5 border-b border-slate-800/80 pb-2">
                          <button
                            onClick={() => setExpandedTab("timeline")}
                            className={`text-[10px] font-mono font-bold uppercase tracking-wider pb-1 flex items-center gap-1 cursor-pointer transition ${
                              expandedTab === "timeline" ? "text-sky-400 border-b-2 border-sky-450" : "text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            <LucideClock className="w-3 h-3" />
                            Log operacional
                          </button>
                          
                          <button
                            onClick={() => setExpandedTab("changelog")}
                            className={`text-[10px] font-mono font-bold uppercase tracking-wider pb-1 flex items-center gap-1 cursor-pointer transition ${
                              expandedTab === "changelog" ? "text-sky-400 border-b-2 border-sky-450" : "text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            <History className="w-3 h-3" />
                            Auditoria
                          </button>

                          <button
                            onClick={() => setExpandedTab("occurrences")}
                            className={`text-[10px] font-mono font-bold uppercase tracking-wider pb-1 flex items-center gap-1 cursor-pointer transition ${
                              expandedTab === "occurrences" ? "text-amber-400 border-b-2 border-amber-400" : "text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            <LucideAlertTriangle className="w-3 h-3" />
                            Ocorrências ({r.ocorrencias?.length || 0})
                          </button>
                        </div>

                        {/* Rendering tab panels (same as table) */}
                        {expandedTab === "timeline" && (
                          <div className="relative border-l border-slate-800 ml-2 pl-3 space-y-3 py-1 text-[11px]">
                            {r.historico_status && r.historico_status.length > 0 ? (
                              r.historico_status.map((log, lIdx) => (
                                <div key={lIdx} className="relative">
                                  <span className="absolute -left-[17.5px] top-1.5 w-1.5 h-1.5 rounded-full bg-sky-500 border border-slate-900 shadow"></span>
                                  <div className="flex flex-col text-[11px]">
                                    <div className="flex items-center gap-1.5">
                                      {renderOperationStatusBadge(log.status)}
                                      <span className="text-slate-500 text-[10px]">por {log.usuario || "sistema"}</span>
                                    </div>
                                    <span className="text-slate-500 text-[9px] font-mono">{log.data} • {log.hora}</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="relative">
                                <span className="absolute -left-[17.5px] top-1.5 w-1.5 h-1.5 rounded-full bg-slate-650 border border-slate-900"></span>
                                <span className="text-slate-500 font-mono text-[10px]">{r.data} • 00:00 (Criação de DT)</span>
                              </div>
                            )}
                          </div>
                        )}

                        {expandedTab === "changelog" && (
                          <div className="space-y-2 max-h-48 overflow-y-auto font-sans text-[11px]">
                            {r.log_alteracoes && r.log_alteracoes.length > 0 ? (
                              <div className="divide-y divide-slate-850">
                                {r.log_alteracoes.map((log, chIdx) => (
                                  <div key={chIdx} className="py-2 flex flex-col gap-1 first:pt-0">
                                    <div className="flex items-center gap-1.5 text-[9px] font-mono">
                                      <span className="text-slate-550">Campo:</span>
                                      <span className="text-sky-300 font-bold bg-slate-900 px-1 py-0.5 rounded border border-slate-800">{log.campo}</span>
                                      <span className="text-slate-550">por {log.usuario}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      <span>Antes: </span><span className="text-slate-500 line-through mr-2">{log.antes}</span>
                                      <span>Depois: </span><span className="text-emerald-400 font-semibold">{log.depois}</span>
                                    </div>
                                    <span className="text-[9px] text-slate-550 font-mono">{log.data} • {log.hora}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-center text-slate-500 font-mono py-2 italic text-[10px]">Nenhuma alteração de dados cadastrada sob auditoria.</p>
                            )}
                          </div>
                        )}

                        {expandedTab === "occurrences" && (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            <div className="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-850">
                              <button
                                onClick={() => openOccurrenceModal(r.id)}
                                className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[9px] font-semibold font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <LucideAlertTriangle className="w-3 h-3 text-amber-200" /> Registrar Ocorrência
                              </button>
                            </div>
                            <div className="space-y-1.5">
                              {r.ocorrencias && r.ocorrencias.length > 0 ? (
                                r.ocorrencias.map((occ) => (
                                  <div key={occ.id} className="bg-slate-900/40 p-2 rounded border border-slate-850 text-[10px] leading-relaxed">
                                    <div className="flex justify-between items-start gap-2">
                                      <span className="px-1 py-0.5 rounded text-[8px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/10 uppercase tracking-wider flex items-center gap-1">
                                        <LucideAlertTriangle className="w-2.5 h-2.5 text-amber-400" /> {occ.tipo}
                                      </span>
                                      <span className="text-[8px] text-slate-550 font-mono">{occ.data} • {occ.hora}</span>
                                    </div>
                                    <p className="text-slate-300 font-medium mt-1">{occ.descricao}</p>
                                    <span className="text-slate-550 font-mono text-[8px] block mt-0.5 text-right font-semibold">por {occ.usuario}</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-center text-slate-500 font-mono py-2 italic text-[10px]">Nenhum incidente registrado.</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500 font-mono bg-slate-900 border border-slate-800 rounded-xl">
                  Nenhuma viagem DT registrada para esta pesquisa.
                </div>
              )}
            </div>
          )}

        </div>

        {/* INVOICE DRAWER SLIDEOVER */}
        {selectedDtId && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 h-fit animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <div>
                <h4 className="text-white text-xs font-mono font-bold uppercase tracking-wider">Notas Fiscais de Rota</h4>
                <span className="text-[10px] text-slate-450 font-mono block">DT Responsável: {selectedDtId.replace("DT-","")}</span>
              </div>
              <button 
                onClick={() => setSelectedDtId(null)}
                className="text-slate-400 hover:text-white"
              >
                <LucideX className="w-4 h-4" />
              </button>
            </div>

            {/* Invoices List */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {notesList.map((nf) => (
                <div key={nf.id} className="bg-slate-950 p-2.5 rounded border border-slate-800 text-[11px] flex justify-between items-center">
                  <div>
                    <span className="text-white block font-mono">NF #{nf.numero}</span>
                    <span className="text-[10px] text-slate-400 font-sans block max-w-[120px] truncate">{nf.cliente}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-mono font-semibold">
                      {nf.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                    <button
                      onClick={() => handleInitiateEditNote(nf)}
                      className="text-slate-500 hover:text-white"
                    >
                      <LucideEdit className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => handleDeleteNote(nf.id)}
                      className="text-slate-500 hover:text-rose-450"
                    >
                      <LucideTrash className="w-3 h-3 text-rose-500" />
                    </button>
                  </div>
                </div>
              ))}

              {notesList.length === 0 && (
                <p className="text-center text-slate-500 italic text-[10px] py-4">Sem notas faturadas anexadas a esta DT.</p>
              )}
            </div>

            {/* Faturamento aggregated indicator */}
            <div className="bg-slate-950 p-3 rounded-lg border border-sky-900/15 flex justify-between items-center text-xs font-mono">
              <span className="text-slate-400 uppercase text-[9px]">Agregado Faturado DT:</span>
              <span className="text-emerald-400 font-bold text-sm">
                {sumNotesTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>

            {/* Add Invoice Form */}
            <form onSubmit={handleAddNote} className="space-y-2 border-t border-slate-800 pt-3 text-xs leading-none">
              <span className="text-slate-400 font-mono text-[9px] font-bold uppercase mb-2 flex items-center gap-1.5">
                {editingNoteId ? <LucideRefreshCw className="w-3 h-3 text-sky-400" /> : <LucidePlus className="w-3 h-3 text-emerald-400" />}
                {editingNoteId ? "Alterar Detalhamento" : "Anexar Nova NF"}
              </span>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-slate-500 block font-mono text-[9px] mb-1">Número Nota</label>
                  <input
                    type="text"
                    required
                    value={newNoteNum}
                    onChange={(e) => setNewNoteNum(e.target.value)}
                    placeholder="Ex: 8871"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block font-mono text-[9px] mb-1">Valor Unitário</label>
                  <input
                    type="number"
                    required
                    value={newNoteVal}
                    onChange={(e) => setNewNoteVal(Number(e.target.value))}
                    min={1}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 block font-mono text-[9px] mb-1">Cliente / Destinatário</label>
                <input
                  type="text"
                  required
                  value={newNoteCli}
                  onChange={(e) => setNewNoteCli(e.target.value)}
                  placeholder="Ex: Atacadão Goiânia S/A"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white text-[11px]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2 rounded transition text-xs"
                >
                  {editingNoteId ? "Confirmar Alterações" : "Vincular Nota Fiscal"}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {sharingRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          {printLayoutActive ? (
            /* PRINT PREVIEW LAYOUT OVERLAY */
            <div className="fixed inset-0 z-55 bg-white text-black overflow-y-auto p-8 flex flex-col items-center">
              {/* Float command bar at top - hidden during paper print */}
              <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 text-white rounded-xl p-3.5 mb-6 flex justify-between items-center shadow-lg print:hidden shrink-0">
                <div className="flex items-center gap-2">
                  <LucidePrinter className="w-4 h-4 text-amber-400" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider">Modo de Impressão de Alta Qualidade</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono px-4 py-1.5 rounded-lg transition font-semibold cursor-pointer"
                  >
                    Imprimir Card
                  </button>
                  <button
                    onClick={() => setPrintLayoutActive(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono px-4 py-1.5 rounded-lg transition cursor-pointer"
                  >
                    Voltar
                  </button>
                </div>
              </div>

              {/* Centered clean card representation on virtual blank A4 sheet */}
              <div className="w-full max-w-2xl bg-white text-black border-2 border-black rounded-2xl p-6 shadow-none space-y-4">
                <div className="flex justify-between items-start border-b-2 border-black pb-4">
                  <div>
                    <h2 className="text-2xl font-black font-mono tracking-tight uppercase">DT #{sharingRoute.dt}</h2>
                    <p className="text-xs font-mono mt-1 text-gray-700 font-bold">Saída: {sharingRoute.data} • Tipo: {sharingRoute.tipo}</p>
                  </div>
                  <div>
                    <span className="px-3.5 py-1.5 rounded text-xs font-black font-mono border-2 border-black uppercase bg-black text-white">
                      {sharingRoute.status_viagem || sharingRoute.status}
                    </span>
                  </div>
                </div>

                {/* Driver & Vehicle */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="border-2 border-black p-3 rounded-lg bg-gray-50">
                    <span className="text-gray-650 block text-[9px] font-black font-mono uppercase tracking-wider flex items-center gap-1">
                      <LucideTruck className="w-3 h-3 text-gray-700" /> VEÍCULO / PLACA
                    </span>
                    <span className="font-black font-mono text-sm block mt-0.5">
                      {veiculos.find((v) => v.id === sharingRoute.veiculoId)
                        ? `${veiculos.find((v) => v.id === sharingRoute.veiculoId)?.placa} (${veiculos.find((v) => v.id === sharingRoute.veiculoId)?.modelo})`
                        : "Não escalado"}
                    </span>
                  </div>
                  <div className="border-2 border-black p-3 rounded-lg bg-gray-50">
                    <span className="text-gray-650 block text-[9px] font-black font-mono uppercase tracking-wider flex items-center gap-1">
                      <LucideUser className="w-3 h-3 text-gray-700" /> CONDUTOR
                    </span>
                    <span className="font-black text-sm block mt-0.5">
                      {motoristas.find((m) => m.id === sharingRoute.motoristaId)?.nome || "Não escalado"}
                    </span>
                  </div>
                </div>

                {/* Details Section */}
                {sharingRoute.tipo === "Entrega OFF" ? (
                  <div className="border-2 border-black p-4 rounded-lg bg-white space-y-3 text-xs">
                    <div className="border-b-2 border-gray-250 pb-2.5">
                      <span className="font-black font-mono text-[9px] uppercase tracking-wider text-amber-600 flex items-center gap-1">
                        <LucideUser className="w-3 h-3 text-amber-600" /> INFORMAÇÕES DO CLIENTE
                      </span>
                      <p className="font-black text-base mt-1">
                        <span className="font-mono text-xs mr-1 text-gray-600">[{sharingRoute.clienteCodigo}]</span>
                        {sharingRoute.clienteNome}
                      </p>
                      {sharingRoute.clienteCNPJ && <p className="text-[10px] font-mono text-gray-600 font-bold">CNPJ: {sharingRoute.clienteCNPJ}</p>}
                      <p className="text-xs text-gray-800 mt-1 leading-tight font-semibold">
                        {sharingRoute.clienteEndereco}, {sharingRoute.clienteCidade} - <span className="font-mono font-black">{sharingRoute.clienteUF}</span>
                      </p>
                    </div>

                    <div>
                      <span className="font-black font-mono text-[9px] uppercase tracking-wider text-amber-600 flex items-center gap-1">
                        <Package className="w-3 h-3 text-amber-600" /> DETALHES DA CARGA OFF
                      </span>
                      <div className="mt-2 grid grid-cols-3 gap-3 text-center font-mono text-xs">
                        <div className="border-2 border-black p-2 rounded bg-gray-50">
                          <span className="text-gray-550 block text-[8px] uppercase font-black">QTD NF</span>
                          <span className="font-black text-sm">{sharingRoute.qtdNF}</span>
                        </div>
                        <div className="border-2 border-black p-2 rounded col-span-2 bg-gray-50">
                          <span className="text-gray-550 block text-[8px] uppercase font-black">VALOR TOTAL</span>
                          <span className="text-emerald-700 font-black text-sm">R$ {sharingRoute.valorTotalEntrega?.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                      
                      {sharingRoute.numerosNotas && sharingRoute.numerosNotas.length > 0 && (
                        <div className="mt-4 pt-3 border-t-2 border-gray-200">
                          <span className="font-black font-mono text-[9px] uppercase tracking-wider mb-2 block">NOTAS FISCAIS COBERTAS</span>
                          <div className="grid grid-cols-3 gap-2 font-mono text-xs font-bold">
                            {sharingRoute.numerosNotas.map((nf, idx) => (
                              <div key={idx} className="border border-black p-1 text-center rounded bg-gray-50">
                                {nf}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-black p-4 rounded-lg bg-white space-y-3.5 text-xs">
                    <span className="font-black font-mono text-[9px] uppercase tracking-wider text-sky-650 flex items-center gap-1">
                      <BarChart2 className="w-3 h-3 text-sky-650" /> RESUMO DE ITINERÁRIO
                    </span>
                    <div className="grid grid-cols-4 gap-2 text-center font-mono">
                      <div className="border-2 border-black p-2.5 rounded bg-gray-50">
                        <span className="text-gray-550 block text-[8px] uppercase font-black">PLANEJ</span>
                        <span className="font-black text-base mt-0.5 block">{sharingRoute.totalEntregas}</span>
                      </div>
                      <div className="border-2 border-black p-2.5 rounded bg-gray-50">
                        <span className="text-gray-550 block text-[8px] uppercase font-black">ENTREG</span>
                        <span className="text-emerald-700 font-black text-base mt-0.5 block">{sharingRoute.entregues}</span>
                      </div>
                      <div className="border-2 border-black p-2.5 rounded bg-gray-50">
                        <span className="text-gray-550 block text-[8px] uppercase font-black">DEVOL</span>
                        <span className="text-amber-700 font-black text-base mt-0.5 block">{sharingRoute.devolucoes}</span>
                      </div>
                      <div className="border-2 border-black p-2.5 rounded bg-gray-50">
                        <span className="text-gray-550 block text-[8px] uppercase font-black">PEND</span>
                        <span className="font-black text-base mt-0.5 block">
                          {Math.max(0, sharingRoute.totalEntregas - sharingRoute.entregues - (sharingRoute.recusadas || 0) - sharingRoute.devolucoes)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer seal */}
                <div className="border-t-2 border-black pt-3 flex justify-between items-center text-[9px] font-mono text-gray-600 font-bold">
                  <span>SISTEMA AMPLA OPERACIONAL v2.2</span>
                  <span>AUTENTICAÇÃO INTERNA DE AUDITORIA</span>
                </div>
              </div>
            </div>
          ) : (
            /* STANDARD SHARING DIALOG */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
              {/* Header */}
              <div className="p-4 bg-slate-950 border-b border-slate-850 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <LucideShare2 className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">Compartilhamento de DT</h3>
                </div>
                <button
                  onClick={() => setSharingRoute(null)}
                  className="text-slate-400 hover:text-white font-mono text-xs cursor-pointer px-2"
                >
                  [ Fechar ]
                </button>
              </div>

              {/* Shareable Preview Card container */}
              <div className="p-6 bg-slate-950/40 overflow-y-auto max-h-[50vh]">
                <div 
                  ref={shareCardRef}
                  className="p-5 rounded-xl border border-slate-800 bg-slate-900 text-left space-y-4 shadow-xl"
                >
                  <div className="flex justify-between items-start border-b border-slate-800/80 pb-3">
                    <div>
                      <h2 className="text-base font-bold text-white font-mono">DT #{sharingRoute.dt}</h2>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Saída: {sharingRoute.data} • {sharingRoute.tipo}</p>
                    </div>
                    <div>
                      <span className="px-2.5 py-1 rounded text-[10px] font-bold font-mono uppercase bg-slate-950 border border-slate-850 text-white">
                        {sharingRoute.status_viagem || sharingRoute.status}
                      </span>
                    </div>
                  </div>

                  {/* Driver & Vehicle */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-950/50 p-2.5 rounded border border-slate-850">
                      <span className="text-slate-500 block text-[9px] font-mono uppercase flex items-center gap-1">
                        <LucideTruck className="w-3 h-3 text-slate-500" /> Veículo / Placa
                      </span>
                      <span className="text-slate-200 font-bold font-mono block mt-0.5">
                        {veiculos.find((v) => v.id === sharingRoute.veiculoId)
                          ? `${veiculos.find((v) => v.id === sharingRoute.veiculoId)?.placa} (${veiculos.find((v) => v.id === sharingRoute.veiculoId)?.modelo})`
                          : "Não escalado"}
                      </span>
                    </div>
                    <div className="bg-slate-950/50 p-2.5 rounded border border-slate-850">
                      <span className="text-slate-500 block text-[9px] font-mono uppercase flex items-center gap-1">
                        <LucideUser className="w-3 h-3 text-slate-500" /> Condutor
                      </span>
                      <span className="text-slate-200 font-bold block mt-0.5">
                        {motoristas.find((m) => m.id === sharingRoute.motoristaId)?.nome || "Não escalado"}
                      </span>
                    </div>
                  </div>

                  {/* Details Section */}
                  {sharingRoute.tipo === "Entrega OFF" ? (
                    <div className="space-y-3 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10 text-xs">
                      <div className="border-b border-slate-800 pb-2">
                        <span className="text-amber-400 font-mono text-[9px] font-bold block uppercase tracking-wider flex items-center gap-1">
                          <LucideUser className="w-3 h-3 text-amber-400" /> Informações do Cliente
                        </span>
                        <p className="text-white font-extrabold font-sans mt-1">
                          <span className="text-slate-500 font-mono text-[10px] mr-1">[{sharingRoute.clienteCodigo}]</span>
                          {sharingRoute.clienteNome}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                          {sharingRoute.clienteEndereco}, {sharingRoute.clienteCidade} - <span className="font-mono font-bold text-amber-500">{sharingRoute.clienteUF}</span>
                        </p>
                      </div>

                      <div>
                        <span className="text-amber-400 font-mono text-[9px] font-bold block uppercase tracking-wider flex items-center gap-1">
                          <Package className="w-3 h-3 text-amber-400" /> Informações da Entrega OFF
                        </span>
                        <div className="mt-1.5 grid grid-cols-3 gap-2 text-center font-mono text-[10px]">
                          <div className="bg-slate-950 p-1.5 rounded border border-slate-850">
                            <span className="text-slate-550 block text-[8px] uppercase">Qtd NF</span>
                            <span className="text-slate-200 font-bold">{sharingRoute.qtdNF}</span>
                          </div>
                          <div className="bg-slate-950 p-1.5 rounded border border-slate-850 col-span-2">
                            <span className="text-slate-500 block text-[8px] uppercase">Valor Total</span>
                            <span className="text-emerald-400 font-bold">R$ {sharingRoute.valorTotalEntrega?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>

                        {sharingRoute.numerosNotas && sharingRoute.numerosNotas.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-slate-800">
                            <span className="text-amber-400 font-mono text-[9px] font-bold block uppercase tracking-wider mb-1">Notas Fiscais</span>
                            <ul className="grid grid-cols-2 gap-1 text-slate-300 font-mono text-[10px]">
                              {sharingRoute.numerosNotas.map((nf, idx) => (
                                <li key={idx} className="flex items-center gap-1">
                                  <span className="text-amber-500">•</span>
                                  <span>{nf}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5 bg-slate-950/50 p-3.5 rounded-xl border border-slate-850 text-xs">
                      <span className="text-sky-400 font-mono text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <BarChart2 className="w-3 h-3 text-sky-400" /> Resumo do Itinerário
                      </span>
                      <div className="grid grid-cols-4 gap-1.5 text-center font-mono">
                        <div className="bg-slate-950 p-1.5 rounded border border-slate-850">
                          <span className="text-slate-500 block text-[8px] uppercase">Planej</span>
                          <span className="text-slate-200 font-bold text-xs">{sharingRoute.totalEntregas}</span>
                        </div>
                        <div className="bg-slate-950 p-1.5 rounded border border-slate-850">
                          <span className="text-slate-500 block text-[8px] uppercase">Entreg</span>
                          <span className="text-emerald-400 font-bold text-xs">{sharingRoute.entregues}</span>
                        </div>
                        <div className="bg-slate-950 p-1.5 rounded border border-slate-850">
                          <span className="text-slate-500 block text-[8px] uppercase">Devol</span>
                          <span className="text-amber-500 font-bold text-xs">{sharingRoute.devolucoes}</span>
                        </div>
                        <div className="bg-slate-950 p-1.5 rounded border border-slate-850">
                          <span className="text-slate-500 block text-[8px] uppercase">Pend</span>
                          <span className="text-slate-200 font-bold text-xs">
                            {Math.max(0, sharingRoute.totalEntregas - sharingRoute.entregues - (sharingRoute.recusadas || 0) - sharingRoute.devolucoes)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer seal */}
                  <div className="border-t border-slate-800 pt-2.5 flex justify-between items-center text-[9px] font-mono text-slate-550">
                    <span>SISTEMA AMPLA v2.2</span>
                    <span>AUTENTICADO COM AUDITORIA</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer - Grid with legible icons and labels */}
              <div className="p-4 bg-slate-950 border-t border-slate-850 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {/* WhatsApp send button */}
                  <button
                    type="button"
                    onClick={() => {
                      const text = sharingRoute.tipo === "Entrega OFF" 
                        ? `*AMPLA* - Registro de DT #${sharingRoute.dt}\n*Tipo:* Entrega OFF\n*Saída:* ${sharingRoute.data}\n*Status:* ${sharingRoute.status_viagem || sharingRoute.status}\n\n*Condutor:* ${motoristas.find((m) => m.id === sharingRoute.motoristaId)?.nome || "Não escalado"}\n*Veículo:* ${veiculos.find((v) => v.id === sharingRoute.veiculoId)?.placa || "Não escalado"}\n\n*Cliente:* [${sharingRoute.clienteCodigo}] ${sharingRoute.clienteNome}\n*Endereço:* ${sharingRoute.clienteEndereco}, ${sharingRoute.clienteCidade}-${sharingRoute.clienteUF}\n*NFs:* ${sharingRoute.qtdNF} | *Total:* R$ ${sharingRoute.valorTotalEntrega?.toLocaleString("pt-BR")}`
                        : `*AMPLA* - Registro de DT #${sharingRoute.dt}\n*Tipo:* ${sharingRoute.tipo}\n*Saída:* ${sharingRoute.data}\n*Status:* ${sharingRoute.status_viagem || sharingRoute.status}\n\n*Condutor:* ${motoristas.find((m) => m.id === sharingRoute.motoristaId)?.nome || "Não escalado"}\n*Veículo:* ${veiculos.find((v) => v.id === sharingRoute.veiculoId)?.placa || "Não escalado"}\n\n*Planejadas:* ${sharingRoute.totalEntregas} | *Entregues:* ${sharingRoute.entregues} | *Devoluções:* ${sharingRoute.devolucoes}`;
                      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <LucideSend className="w-3.5 h-3.5 text-emerald-200" /> WhatsApp
                  </button>

                  {/* Copy Report */}
                  <button
                    type="button"
                    onClick={() => {
                      const text = sharingRoute.tipo === "Entrega OFF" 
                        ? `*AMPLA* - Registro de DT #${sharingRoute.dt}\n*Tipo:* Entrega OFF\n*Saída:* ${sharingRoute.data}\n*Status:* ${sharingRoute.status_viagem || sharingRoute.status}\n\n*Condutor:* ${motoristas.find((m) => m.id === sharingRoute.motoristaId)?.nome || "Não escalado"}\n*Veículo:* ${veiculos.find((v) => v.id === sharingRoute.veiculoId)?.placa || "Não escalado"}\n\n*Cliente:* [${sharingRoute.clienteCodigo}] ${sharingRoute.clienteNome}\n*Endereço:* ${sharingRoute.clienteEndereco}, ${sharingRoute.clienteCidade}-${sharingRoute.clienteUF}\n*NFs:* ${sharingRoute.qtdNF} | *Total:* R$ ${sharingRoute.valorTotalEntrega?.toLocaleString("pt-BR")}`
                        : `*AMPLA* - Registro de DT #${sharingRoute.dt}\n*Tipo:* ${sharingRoute.tipo}\n*Saída:* ${sharingRoute.data}\n*Status:* ${sharingRoute.status_viagem || sharingRoute.status}\n\n*Condutor:* ${motoristas.find((m) => m.id === sharingRoute.motoristaId)?.nome || "Não escalado"}\n*Veículo:* ${veiculos.find((v) => v.id === sharingRoute.veiculoId)?.placa || "Não escalado"}\n\n*Planejadas:* ${sharingRoute.totalEntregas} | *Entregues:* ${sharingRoute.entregues} | *Devoluções:* ${sharingRoute.devolucoes}`;
                      navigator.clipboard.writeText(text);
                      setNotification({
                        title: "Copiado!",
                        message: "Resumo formatado copiado com sucesso para o WhatsApp!",
                        type: "success"
                      });
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white py-2 rounded-xl text-xs font-mono transition cursor-pointer flex items-center justify-center gap-1.5 border border-slate-700"
                  >
                    <LucideCopy className="w-3.5 h-3.5 text-slate-300" /> Copiar Resumo
                  </button>

                  {/* Generate Print Layout Mode */}
                  <button
                    type="button"
                    onClick={() => {
                      setPrintLayoutActive(true);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 py-2 rounded-xl text-xs font-mono transition cursor-pointer flex items-center justify-center gap-1.5 border border-slate-700"
                  >
                    <LucidePrinter className="w-3.5 h-3.5 text-amber-400" /> Gerar Print
                  </button>

                  {/* Download PNG natively with html-to-image */}
                  <button
                    type="button"
                    onClick={() => {
                      if (shareCardRef.current) {
                        toPng(shareCardRef.current, { cacheBust: true, backgroundColor: "#0f172a" })
                          .then((dataUrl) => {
                            const link = document.createElement("a");
                            link.download = `AMPLA-DT-${sharingRoute.dt}.png`;
                            link.href = dataUrl;
                            link.click();
                            setNotification({
                              title: "Sucesso!",
                              message: "Imagem PNG gerada e baixada com sucesso!",
                              type: "success"
                            });
                          })
                          .catch((err) => {
                            console.error("Erro ao gerar imagem:", err);
                            setNotification({
                              title: "Erro",
                              message: "Falha ao exportar imagem PNG.",
                              type: "error"
                            });
                          });
                      }
                    }}
                    className="bg-sky-600 hover:bg-sky-500 text-white py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <LucideDownload className="w-3.5 h-3.5 text-white" /> Baixar PNG
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSharingRoute(null)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs py-1.5 rounded-xl font-mono cursor-pointer border border-slate-850"
                >
                  Voltar ao Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* HISTÓRICO DA OPERAÇÃO MODAL */}
      {historyModalRoute && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-850 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <LucideClock className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-350">
                  Histórico Operacional — DT #{historyModalRoute.dt}
                </h3>
              </div>
              <button
                onClick={() => setHistoryModalRoute(null)}
                className="text-slate-400 hover:text-white font-mono text-xs cursor-pointer px-2 py-1"
              >
                [ Fechar ]
              </button>
            </div>

            {/* Scrollable Timeline Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-left">
              {/* Incident occurrences if any */}
              <div>
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-1.5">
                  <LucideAlertTriangle className="w-4 h-4 text-rose-400" /> Registro de Incidentes / Ocorrências
                </h4>
                {historyModalRoute.ocorrencias && historyModalRoute.ocorrencias.length > 0 ? (
                  <div className="space-y-3">
                    {historyModalRoute.ocorrencias.map((occ: any, idx: number) => (
                      <div key={idx} className="bg-red-500/5 border border-red-500/10 rounded-xl p-3.5 text-xs space-y-1">
                        <div className="flex justify-between items-center border-b border-slate-800/40 pb-1.5 mb-1.5">
                          <span className="font-bold text-rose-400 font-mono text-[10px] uppercase tracking-wider bg-rose-500/10 px-1.5 py-0.5 rounded">
                            {occ.tipo}
                          </span>
                          <span className="text-slate-500 font-mono text-[10px]">
                            {occ.data} às {occ.hora}
                          </span>
                        </div>
                        <p className="text-slate-300 font-sans leading-relaxed">{occ.descricao}</p>
                        {occ.usuario && (
                          <div className="text-[9px] font-mono text-slate-500 pt-1">
                            Registrado por: {occ.usuario}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-mono text-slate-500 italic bg-slate-950/40 border border-slate-850/60 p-3 rounded-xl text-center">
                    Nenhum incidente ou ocorrência registrada nesta DT.
                  </p>
                )}
              </div>

              {/* Status transition log */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400 mb-4 flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-sky-400" /> Auditoria de Transições de Status
                </h4>
                
                {historyModalRoute.historico_status && historyModalRoute.historico_status.length > 0 ? (
                  <div className="relative pl-6 border-l-2 border-slate-850 space-y-5">
                    {historyModalRoute.historico_status.map((log: any, idx: number) => {
                      const spec = mapStatusToSpec(log.status);
                      return (
                        <div key={idx} className="relative group text-xs">
                          {/* Circle Indicator */}
                          <span className="absolute -left-[31px] top-1.5 bg-slate-900 border border-slate-800 rounded-full w-4 h-4 flex items-center justify-center text-[10px] shadow">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-450 animate-pulse"></span>
                          </span>
                          
                          <div className="bg-slate-950/40 border border-slate-850/60 rounded-xl p-3 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${spec.color}`}>
                                <span>{spec.emoji}</span>
                                <span>{spec.text}</span>
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">
                                {log.data} • {log.hora}
                              </span>
                            </div>
                            {log.descricao && (
                              <p className="text-slate-300 font-mono leading-tight">{log.descricao}</p>
                            )}
                            <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 pt-1 border-t border-slate-850">
                              <span>Operador: {log.usuario || "Sistema AMPLA"}</span>
                              {log.geolocalizacao && (
                                <span className="text-sky-500 flex items-center gap-1">
                                  <LucideMapPin className="w-3 h-3 text-sky-500" /> Coordenadas registradas
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs font-mono text-slate-500 italic bg-slate-950/40 border border-slate-850/60 p-3 rounded-xl text-center">
                    Nenhum histórico de status encontrado.
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-850 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setHistoryModalRoute(null)}
                className="bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono text-xs px-4 py-2 rounded-xl border border-slate-800 transition cursor-pointer"
              >
                [ Fechar ]
              </button>
            </div>
          </div>
        </div>
      )}

      <NotificationModal notification={notification} onClose={() => setNotification(null)} />
      <ConfirmModal confirm={confirmDialog} onClose={() => setConfirmDialog(null)} />
    </div>
  );
}
