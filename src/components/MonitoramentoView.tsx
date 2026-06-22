import React, { useState, useEffect, useMemo } from "react";
import { 
  Plus as LucidePlus, Search as LucideSearch, Edit as LucideEdit, Trash as LucideTrash, FileText as LucideFileText, 
  CheckCircle as LucideCheckCircle, Clock as LucideClock, AlertCircle as LucideAlertCircle, 
  MapPin as LucideMapPin, User as LucideUser, Truck as LucideTruck, DollarSign as LucideDollarSign, 
  X as LucideX, Layers as LucideLayers, RefreshCw as LucideRefreshCw, AlertTriangle as LucideAlertTriangle, 
  Calendar as LucideCalendar, Save, History, Edit, Trash
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from "recharts";
import { Rota, Veiculo, Motorista, NotaFiscal, Unidade } from "../types";
import { NotificationModal, ConfirmModal, NotificationType, ConfirmType } from "./NotificationModal";

interface MonitoramentoProps {
  rotas: Rota[];
  veiculos: Veiculo[];
  motoristas: Motorista[];
  unidades?: Unidade[];
  onRefresh: () => void;
  userEmail: string;
  noShows?: any[];
}

export default function MonitoramentoView({ rotas, veiculos, motoristas, unidades = [], onRefresh, userEmail, noShows = [] }: MonitoramentoProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [errorMess, setErrorMess] = useState("");
  const [loading, setLoading] = useState(false);

  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmType | null>(null);

  // CREATE DT form states
  const [dt, setDt] = useState("");
  const [data, setData] = useState("2026-06-14");
  const [veiculoId, setVeiculoId] = useState("");
  const [motoristaId, setMotoristaId] = useState("");
  const [tipo, setTipo] = useState<"Entrega" | "Recarga" | "Reentrega">("Entrega");
  const [status, setStatus] = useState<"Aguardando carregamento" | "Em carregamento" | "Em rota" | "Em descarga" | "Finalizada">("Aguardando carregamento");
  const [statusViagem, setStatusViagem] = useState<string>("Aguardando Carregamento");
  const [totalEntregas, setTotalEntregas] = useState<number>(10);
  const [entregues, setEntregues] = useState<number>(0);
  const [devolucoes, setDevolucoes] = useState<number>(0);

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

  // OCORRÊNCIAS form states
  const [occurrenceRouteId, setOccurrenceRouteId] = useState<string | null>(null);
  const [occTipo, setOccTipo] = useState("Atraso");
  const [occDescricao, setOccDescricao] = useState("");
  const [occData, setOccData] = useState("2026-06-14");
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
  const [notesList, setNotesList] = useState<NotaFiscal[]>([]);
  const [newNoteNum, setNewNoteNum] = useState("");
  const [newNoteVal, setNewNoteVal] = useState<number>(0);
  const [newNoteCli, setNewNoteCli] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Collapsible DT segments detailed tables expanders
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null);
  const [expandedTab, setExpandedTab] = useState<"timeline" | "changelog" | "occurrences">("timeline");

  // Format and render styled operation badges
  const renderOperationStatusBadge = (statusStr: string) => {
    const norm = (statusStr || "").trim().toLowerCase();
    
    if (norm === "aguardando carregamento" || norm === "ag. carregamento" || norm === "aguardando carga") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold font-mono bg-amber-500/10 text-amber-400 border border-amber-500/10 whitespace-nowrap">
          🟡 Ag. Carregamento
        </span>
      );
    }
    if (norm === "em carregamento") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold font-mono bg-blue-500/10 text-blue-450 border border-blue-500/10 whitespace-nowrap">
          🔵 Em Carregamento
        </span>
      );
    }
    if (norm === "em rota" || norm === "em rota (entregando)") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 whitespace-nowrap">
          🟣 Em Rota
        </span>
      );
    }
    if (norm === "aguardando descarga" || norm === "ag. descarga" || norm === "ag.descarga") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold font-mono bg-amber-500/15 text-orange-400 border border-amber-500/20 whitespace-nowrap">
          🟠 AG.DESCARGA
        </span>
      );
    }
    if (norm === "em descarga") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold font-mono bg-orange-500/10 text-orange-400 border border-orange-500/15 whitespace-nowrap">
          🟠 Em Descarga
        </span>
      );
    }
    if (norm === "cancelada") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold font-mono bg-red-500/15 text-rose-500 border border-red-500/20 whitespace-nowrap">
          🔴 Cancelada
        </span>
      );
    }
    if (norm === "veículo quebrado" || norm === "veiculo quebrado") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold font-mono bg-slate-950 text-slate-400 border border-slate-800 whitespace-nowrap animate-pulse">
          💥 V. Quebrado
        </span>
      );
    }
    if (norm === "retorno base" || norm === "retorno a base" || norm === "retorno_base") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold font-mono bg-sky-500/10 text-sky-400 border border-sky-500/10 whitespace-nowrap">
          🔄 Retorno Base
        </span>
      );
    }
    if (norm === "finalizada") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold font-mono bg-emerald-500/10 text-emerald-450 border border-emerald-500/10 whitespace-nowrap">
          🟢 Finalizada
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold font-mono bg-slate-850 text-slate-300 border border-slate-700 whitespace-nowrap">
        📦 {statusStr}
      </span>
    );
  };

  const resetForm = () => {
    setIsAdding(false);
    setErrorMess("");
    setDt("");
    setData("2026-06-14");
    setVeiculoId("");
    setMotoristaId("");
    setTipo("Entrega");
    setStatus("Aguardando carregamento");
    setStatusViagem("Aguardando Carregamento");
    setTotalEntregas(10);
    setEntregues(0);
    setDevolucoes(0);
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

    setLoading(true);
    try {
      const res = await fetch("/api/rotas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail,
        },
        body: JSON.stringify({
          dt: dt.trim(),
          data,
          veiculoId,
          motoristaId,
          tipo,
          status: "Aguardando carregamento",
          status_viagem: statusViagem,
          totalEntregas: Number(totalEntregas),
          entregues: Number(entregues),
          devolucoes: Number(devolucoes),
          recusadas: 0,
          dataPrevista: data, // Defaults to departure date
          log_alteracoes: [{
            data: new Date().toLocaleDateString("pt-BR"),
            hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            usuario: userEmail,
            campo: "Criação de DT",
            antes: "-",
            depois: `Iniciado com status [${statusViagem}]`
          }]
        }),
      });

      if (res.ok) {
        setNotification({
          type: "success",
          message: "✅ Viagem / DT cadastrada e integrada com as vistorias."
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
          message: `✅ Status de viagem atualizado para: ${payload.status_viagem}`
        });
        onRefresh();
      } else {
        const error = await res.json();
        setNotification({
          type: "error",
          message: `❌ Erro ao atualizar status: ${error.error || "Operação negada."}`
        });
      }
    } catch (err) {
      console.error(err);
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
              message: "✅ Registro excluído com sucesso."
            });
            onRefresh();
          } else {
            const err = await res.json();
            setNotification({
              type: "error",
              message: `❌ Não foi possível excluir a DT. Motivo: ${err.error || "Exclusão não autorizada."}`
            });
          }
        } catch (e) {
          setNotification({
            type: "error",
            message: "❌ Erro de conexão ao excluir a DT."
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
  };

  // SAVE EDIT FORM
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoute) return;

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
          data: editData,
          dataPrevista: editDataPrevista,
          status_viagem: editStatusViagem,
          observacoes_operacionais: editObservacoes,
          totalEntregas: Number(editTotalEntregas),
          entregues: Number(editEntregues),
          recusadas: Number(editRecusadas),
          devolucoes: Number(editDevolucoes)
        })
      });

      if (res.ok) {
        setNotification({
          type: "success",
          message: "✅ Alterações na DT gravadas com logs de auditoria automatizados."
        });
        setEditingRoute(null);
        onRefresh();
      } else {
        const err = await res.json();
        setNotification({
          type: "error",
          message: `❌ Não foi possível gravar: ${err.error || "Operação rejeitada."}`
        });
      }
    } catch (err) {
      setNotification({
        type: "error",
        message: "❌ Erro eletrônico ao comunicar salvar alterações."
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
          message: `⚠️ Incidente [${occTipo}] registrado com sucesso e anexado ao log da DT.`
        });
        setOccurrenceRouteId(null);
        setOccDescricao("");
        onRefresh();
      } else {
        const err = await res.json();
        setNotification({
          type: "error",
          message: `❌ Erro ao gravar ocorrência: ${err.error || "Rejeição."}`
        });
      }
    } catch (err) {
      setNotification({
        type: "error",
        message: "❌ Erro operacional. Sem conectividade."
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

      // Executive Dashboard Period & Transportador overrides
      const matchPeriod = dashPeriod && dashPeriod !== "todos"
        ? isDateInPeriod(r.data, dashPeriod, dashStartDate, dashEndDate)
        : (filterData ? (r.data === filterData) : true);

      const matchTransportador = dashTransportador
        ? (vObj?.tipo === dashTransportador)
        : true;

      const searchLow = searchTerm.toLowerCase().trim();
      const matchSearch = searchLow ? (
        r.dt.includes(searchLow) ||
        (vObj?.placa || "").toLowerCase().includes(searchLow) ||
        (mObj?.nome || "").toLowerCase().includes(searchLow) ||
        (uObj?.nome || "").toLowerCase().includes(searchLow)
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
              <span className="text-emerald-400 text-lg">📊</span> 
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
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">🚛 Rotas Planejadas</span>
              <span className="p-1 px-1.5 rounded-md bg-sky-500/10 text-sky-400 text-[10px] font-bold font-mono">DT</span>
            </div>
            <div className="text-2xl font-black text-white font-mono">{kpis.totalDts}</div>
            <p className="text-[10px] text-slate-500 mt-1 leading-normal">Cadastradas no período filtrado.</p>
          </div>

          {/* CARD 2: Rotas Em Andamento */}
          <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">🟦 Rotas Em Andamento</span>
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
            </div>
            <div className="text-2xl font-black text-sky-400 font-mono">{kpis.emAndamento}</div>
            <p className="text-[10px] text-slate-500 mt-1 leading-normal">DTs com entregas ativas/pendentes.</p>
          </div>

          {/* CARD 3: Rotas Finalizadas */}
          <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">✅ Rotas Finalizadas</span>
              <span className="p-1 rounded bg-emerald-500/10 text-emerald-400"><LucideCheckCircle className="w-3.5 h-3.5" /></span>
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono">{kpis.finalizadas}</div>
            <p className="text-[10px] text-slate-500 mt-1 leading-normal">DTs encerradas de forma definitiva.</p>
          </div>

          {/* CARD 4: Entregas Planejadas */}
          <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">📦 Entregas Planejadas</span>
              <span className="p-1 px-1.5 rounded bg-slate-900 text-slate-400 font-mono text-[9px] font-bold">TOTAL</span>
            </div>
            <div className="text-2xl font-black text-white font-mono">{kpis.totalEntregasPlanejadas}</div>
            <p className="text-[10px] text-slate-500 mt-1 leading-normal">Somatório total de entregas previstas.</p>
          </div>

          {/* CARD 5: Entregas Concluídas */}
          <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">🟢 Entregas Concluídas</span>
              <span className="p-1 rounded bg-green-500/10 text-green-400"><LucideCheckCircle className="w-3.5 h-3.5" /></span>
            </div>
            <div className="text-2xl font-black text-green-450 font-mono">{kpis.totalEntregasConcluidas}</div>
            <p className="text-[10px] text-slate-500 mt-1 leading-normal">Entregas com status Concluído ou Entregue.</p>
          </div>

          {/* CARD 6: Entregas Pendentes */}
          <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">🟡 Entregas Pendentes</span>
              <span className="p-1 rounded bg-amber-500/10 text-amber-400"><LucideClock className="w-3.5 h-3.5" /></span>
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono">{kpis.totalEntregasPendentes}</div>
            <p className="text-[10px] text-slate-500 mt-1 leading-normal">Entregas que ainda restam concluir.</p>
          </div>

          {/* CARD 7: Devoluções do Dia */}
          <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">🔄 Devoluções do Dia</span>
              <span className="p-1 px-1.5 rounded bg-rose-500/10 text-rose-450 font-mono text-[9px] font-bold">DEV</span>
            </div>
            <div className="text-2xl font-black text-rose-400 font-mono">{kpis.totalDevolucoes}</div>
            <p className="text-[10px] text-slate-500 mt-1 leading-normal">Status de devolução ou recusa ativa.</p>
          </div>

          {/* CARD 8: DTs com Ocorrências */}
          <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition shadow-inner" title="Avaria, No Show, Falta, Vale, Divergências...">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">⚠️ DTs c/ Ocorrências</span>
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
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">📈 Progresso Operacional</h4>
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
          <div className="lg:col-span-7 bg-slate-950/50 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between h-[230px]">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono mb-2">📊 Visão Analítica de Entregas</h4>
            
            <div className="flex-1 w-full min-h-[140px] relative">
              {kpis.totalEntregasPlanejadas === 0 ? (
                <div key="no-data-msg-operational" className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 font-mono">
                  Sem dados de entregas no período selecionado.
                </div>
              ) : (
                <div key="chart-wrapper-operational" className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
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
                  </ResponsiveContainer>
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
                  {veiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.placa} - {v.modelo} ({v.perfil})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Motorista Responsável (Liberados)</label>
                <select
                  value={motoristaId}
                  onChange={(e) => setMotoristaId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none"
                  required
                >
                  <option value="">Selecione condutor...</option>
                  {motoristas.filter(m => m.statusFinal === "LIBERADO" || m.id === motoristaId).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 block font-mono font-bold text-amber-400">Status Inicial da Operação *</label>
                <select
                  value={statusViagem}
                  onChange={(e) => setStatusViagem(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-slate-700 font-bold"
                  required
                >
                  <option value="Aguardando Carregamento">🟡 Aguardando Carregamento</option>
                  <option value="Em Carregamento">🔵 Em Carregamento</option>
                  <option value="Em Rota">🟣 Em Rota</option>
                  <option value="Em Descarga">🟠 Em Descarga</option>
                  <option value="AG.DESCARGA">🟠 AG.DESCARGA</option>
                  <option value="Finalizada">🟢 Finalizada</option>
                  <option value="Cancelada">🔴 Cancelada</option>
                  <option value="Veículo Quebrado">⚫ Veículo Quebrado</option>
                  <option value="Retorno Base">🔄 Retorno Base</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono font-bold text-sky-400">Tipo de Expedição</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white"
                  >
                    <option value="Entrega">Entrega</option>
                    <option value="Recarga">Recarga</option>
                    <option value="Reentrega">Reentrega</option>
                  </select>
                </div>

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
              </div>

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
                  {veiculos.map((v) => (
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
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white focus:outline-none"
                  required
                >
                  {motoristas.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome} ({m.statusFinal})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 block font-mono font-bold text-amber-400">Modificar Status Operacional *</label>
                <select
                  value={editStatusViagem}
                  onChange={(e) => setEditStatusViagem(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white focus:outline-none font-bold"
                  required
                >
                  <option value="Aguardando Carregamento">🟡 Aguardando Carregamento</option>
                  <option value="Em Carregamento">🔵 Em Carregamento</option>
                  <option value="Em Rota">🟣 Em Rota</option>
                  <option value="Em Descarga">🟠 Em Descarga</option>
                  <option value="AG.DESCARGA">🟠 AG.DESCARGA</option>
                  <option value="Finalizada">🟢 Finalizada</option>
                  <option value="Cancelada">🔴 Cancelada</option>
                  <option value="Veículo Quebrado">⚫ Veículo Quebrado</option>
                  <option value="Retorno Base">🔄 Retorno Base</option>
                </select>
              </div>

              {/* CONTROLE DE ENTREGAS REAL TIME */}
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
                <h4 className="text-white text-xs font-mono font-bold uppercase tracking-wider">⚠️ Nova Ocorrência</h4>
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
                    <option value="Atraso">⏳ Atraso de Viagem</option>
                    <option value="Trânsito">🚗 Trânsito Intenso / Congestionamento</option>
                    <option value="Acidente">🚨 Acidente Rodoviário (Sinistro)</option>
                    <option value="Cliente Ausente">👤 Cliente Ausente / Estabelecimento Fechado</option>
                    <option value="Recusa">❌ Recusa Parcial/Total da Carga</option>
                    <option value="Falta de Mercadoria">📦 Falta de Mercadoria / Sobra de Carga</option>
                    <option value="Problema Mecânico">🔧 Problema Mecânico / Quebra do Veículo</option>
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
                    <option value="Aguardando Carregamento">🟡 Ag. Carregamento</option>
                    <option value="Em Carregamento">🔵 Em Carregamento</option>
                    <option value="Em Rota">🟣 Em Rota</option>
                    <option value="Em Descarga">🟠 Em Descarga</option>
                    <option value="AG.DESCARGA">🟠 AG.DESCARGA</option>
                    <option value="Finalizada">🟢 Finalizada</option>
                    <option value="Cancelada">🔴 Cancelada</option>
                    <option value="Veículo Quebrado">⚫ V. Quebrado</option>
                    <option value="Retorno Base">🔄 Retorno Base</option>
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
                              
                              {linkedNoShow && (
                                <div className="mt-1.5 space-y-1">
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-505/10 text-rose-400 border border-rose-505/15 animate-pulse select-none">
                                    🚨 Entrega com No Show ({linkedNoShow.statusNoShow})
                                  </span>
                                  <div className="text-[9px] bg-slate-950/65 border border-slate-800 rounded p-1.5 text-slate-400 font-sans max-w-[200px] leading-tight space-y-0.5">
                                    <p className="font-semibold text-rose-400">⚡ Esta DT possui registro de No Show.</p>
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
                                <option value="Aguardando Carregamento">🟡 Ag. Carregamento</option>
                                <option value="Em Carregamento">🔵 Em Carregamento</option>
                                <option value="Em Rota">🟣 Em Rota</option>
                                <option value="Em Descarga">🟠 Em Descarga</option>
                                <option value="AG.DESCARGA">🟠 AG.DESCARGA</option>
                                <option value="Finalizada">🟢 Finalizada</option>
                                <option value="Cancelada">🔴 Cancelada</option>
                                <option value="Veículo Quebrado">⚫ V. Quebrado</option>
                                <option value="Retorno Base">🔄 Retorno Base</option>
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
                                className="px-1.5 py-0.5 text-[9px] font-mono bg-amber-600/10 text-amber-400 hover:bg-amber-600/30 border border-amber-650/20 hover:text-white rounded flex items-center gap-0.5 select-none transition"
                                title="Registrar Nova Ocorrência"
                              >
                                ⚠️ +Ocorrência
                              </button>

                              {/* Edit DT button */}
                              <button
                                onClick={() => startEditing(r)}
                                className="p-1 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded text-slate-400 hover:text-white"
                                title="✏️ Editar DT"
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
                                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-semibold font-mono flex items-center gap-1 transition-all"
                                      >
                                        ⚠️ Registrar Ocorrência
                                      </button>
                                    </div>

                                    <div className="space-y-2">
                                      {r.ocorrencias && r.ocorrencias.length > 0 ? (
                                        r.ocorrencias.map((occ) => (
                                          <div key={occ.id} className="bg-slate-900/60 p-3 rounded-lg border border-slate-850 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs leading-relaxed transition hover:border-slate-800">
                                            <div className="space-y-1">
                                              <div className="flex items-center gap-2">
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/10 uppercase tracking-wider">
                                                  ⚠️ {occ.tipo}
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
              <span className="text-slate-400 block font-mono text-[9px] font-bold uppercase mb-2">
                {editingNoteId ? "🔄 Alterar Detalhamento" : "📥 Anexar Nova NF"}
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
      
      <NotificationModal notification={notification} onClose={() => setNotification(null)} />
      <ConfirmModal confirm={confirmDialog} onClose={() => setConfirmDialog(null)} />
    </div>
  );
}
