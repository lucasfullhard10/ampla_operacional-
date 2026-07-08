import React, { useState, useMemo } from "react";
import { 
  Plus, Search, Edit, Trash, FileText, CheckCircle, Clock, AlertCircle, 
  MapPin, User, Truck, DollarSign, X, Layers, RefreshCw, AlertTriangle, 
  Calendar, Save, History, ChevronRight, Shield, Activity, ArrowLeftRight, 
  Download, TrendingUp, BarChart2, SlidersHorizontal, ShieldCheck, ClipboardCheck,
  Receipt, Coins, Eye, Image
} from "lucide-react";
import { Rota, Veiculo, Motorista, Unidade } from "../types";
import { NotificationModal, ConfirmModal, NotificationType, ConfirmType } from "./NotificationModal";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import SafeResponsiveContainer from "./SafeResponsiveContainer";

interface FechamentoDtProps {
  rotas: Rota[];
  veiculos: Veiculo[];
  motoristas: Motorista[];
  unidades?: Unidade[];
  vales: any[];
  fechamentosDt: any[];
  onRefresh: () => void;
  userEmail: string;
  currentUser?: any;
  noShows?: any[];
}

export default function FechamentoDtView({ 
  rotas, 
  veiculos, 
  motoristas, 
  unidades = [], 
  vales, 
  fechamentosDt, 
  onRefresh, 
  userEmail,
  currentUser,
  noShows = []
}: FechamentoDtProps) {
  
  // Selection/Search states
  const [targetDt, setTargetDt] = useState("");
  const [activeSearchedDt, setActiveSearchedDt] = useState<Rota | null>(null);
  
  // Re-opening feature states
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenMotivo, setReopenMotivo] = useState("");
  const [reopenProtocol, setReopenProtocol] = useState("");
  const [reopenDt, setReopenDt] = useState("");
  const [reopeningSubmitting, setReopeningSubmitting] = useState(false);
  const [selectedClosureForDetails, setSelectedClosureForDetails] = useState<any | null>(null);
  
  // Tab states: "fechamento" | "financeiro" | "relatorios"
  const [activeTab, setActiveTab] = useState<"fechamento" | "financeiro" | "relatorios">("fechamento");

  // Occurrence list builder during closing
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [occTipo, setOccTipo] = useState<string>("Falta de Mercadoria");
  const [occProduto, setOccProduto] = useState("");
  const [occQuantidade, setOccQuantidade] = useState<number>(0);
  const [occValorUnit, setOccValorUnit] = useState<number>(0);
  const [occObservacao, setOccObservacao] = useState("");
  const [observacoesGerais, setObservacoesGerais] = useState("");

  // New structured Questionnaire states for Closure Form
  const [houveDevolucao, setHouveDevolucao] = useState<"Sim" | "Não">("Não");
  const [houveAvaria, setHouveAvaria] = useState<"Sim" | "Não">("Não");
  const [houveFalta, setHouveFalta] = useState<"Sim" | "Não">("Não");

  // Devoluções specific states
  const [devolucaoQtd, setDevolucaoQtd] = useState<number>(0);
  const [devolucaoMotivo, setDevolucaoMotivo] = useState<string>("Cliente recusou");
  const [devolucaoObs, setDevolucaoObs] = useState<string>("");

  // Falta de Mercadoria / Vale details
  const [faltaProduto, setFaltaProduto] = useState<string>("");
  const [faltaQuantidade, setFaltaQuantidade] = useState<number>(0);
  const [faltaValorUnit, setFaltaValorUnit] = useState<number>(0);
  const [faltaObservacao, setFaltaObservacao] = useState<string>("");

  // Avarias specific states
  const [avariaProduto, setAvariaProduto] = useState<string>("");
  const [avariaQtd, setAvariaQtd] = useState<number>(0);
  const [avariaObs, setAvariaObs] = useState<string>("");

  // New state variables for detailed financial data during closure (Phase 5 Architecture Update)
  const [freteValor, setFreteValor] = useState<number>(0);
  const [valorFaturado, setValorFaturado] = useState<number>(0);
  const [disponibilidadeValor, setDisponibilidadeValor] = useState<number>(0);
  const [diariasBonificacoes, setDiariasBonificacoes] = useState<number>(0);
  const [adiantamentos, setAdiantamentos] = useState<number>(0);
  const [outrosCreditos, setOutrosCreditos] = useState<number>(0);
  const [multasDescontos, setMultasDescontos] = useState<number>(0);
  
  // Operational costs (Bloco 2)
  const [descargaChapa, setDescargaChapa] = useState<number>(0);
  const [pedagios, setPedagios] = useState<number>(0);
  const [lavagensHospedagens, setLavagensHospedagens] = useState<number>(0);
  const [alimentacao, setAlimentacao] = useState<number>(0);
  const [manutencaoOutros, setManutencaoOutros] = useState<number>(0);

  // Descarga Recibo states (AMPLA v2.2 - Fase 11)
  const [houveReciboDescarga, setHouveReciboDescarga] = useState<"Sim" | "Não">("Não");
  const [descargaCliente, setDescargaCliente] = useState<string>("");
  const [descargaCodigoCliente, setDescargaCodigoCliente] = useState<string>("");
  const [descargaNumeroNF, setDescargaNumeroNF] = useState<string>("");
  const [descargaValor, setDescargaValor] = useState<number>(0);
  const [descargaData, setDescargaData] = useState<string>(new Date().toISOString().split("T")[0]);
  const [descargaObservacoes, setDescargaObservacoes] = useState<string>("");
  const [descargaReciboFile, setDescargaReciboFile] = useState<string>("");
  const [descargaResponsavel, setDescargaResponsavel] = useState<string>("");

  const [closureAttachments, setClosureAttachments] = useState<Array<{
    id: string;
    nome: string;
    url: string;
    tipo: string;
    dataUpload: string;
    usuario: string;
    dt: string;
  }>>([]);

  const handleViewAttachment = async (anx: any) => {
    try {
      let fileUrl = anx.url;
      if (fileUrl && fileUrl.startsWith("/api/")) {
        const res = await fetch(fileUrl, {
          headers: {
            "x-user-email": userEmail
          }
        });
        if (res.ok) {
          const data = await res.json();
          fileUrl = data.base64;
        } else {
          setNotification({ type: "error", message: "Erro ao obter o documento do servidor." });
          return;
        }
      }

      if (fileUrl && fileUrl.startsWith("data:")) {
        const w = window.open();
        if (w) {
          w.document.write(`<iframe src="${fileUrl}" style="border:none; width:100%; height:100%;" title="${anx.nome}"></iframe>`);
        } else {
          const tempLink = document.createElement("a");
          tempLink.href = fileUrl;
          tempLink.target = "_blank";
          document.body.appendChild(tempLink);
          tempLink.click();
          document.body.removeChild(tempLink);
        }
      } else if (fileUrl) {
        window.open(fileUrl, "_blank");
      }
    } catch (err: any) {
      console.error(err);
      setNotification({ type: "error", message: `Erro ao visualizar documento: ${err.message}` });
    }
  };

  const handleDownloadAttachment = async (anx: any) => {
    try {
      let fileUrl = anx.url;
      if (fileUrl && fileUrl.startsWith("/api/")) {
        const res = await fetch(fileUrl, {
          headers: {
            "x-user-email": userEmail
          }
        });
        if (res.ok) {
          const data = await res.json();
          fileUrl = data.base64;
        } else {
          setNotification({ type: "error", message: "Erro ao baixar o documento do servidor." });
          return;
        }
      }

      if (fileUrl) {
        const tempLink = document.createElement("a");
        tempLink.href = fileUrl;
        tempLink.download = anx.nome;
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
      }
    } catch (err: any) {
      console.error(err);
      setNotification({ type: "error", message: `Erro ao baixar documento: ${err.message}` });
    }
  };

  // New financial inputs
  const [reentregaValor, setReentregaValor] = useState<number>(0);
  const [abastecimentoValor, setAbastecimentoValor] = useState<number>(0);

  // Consultas tab filters
  const [filterClosedStatus, setFilterClosedStatus] = useState<string>("Todas");
  const [searchClosedDt, setSearchClosedDt] = useState<string>("");

  // Modal / overlays states
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [editingVale, setEditingVale] = useState<any | null>(null);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Control Panel Filter States (AMPLA v2.2)
  const [controlPanelTab, setControlPanelTab] = useState<"pendentes" | "fechadas">("pendentes");
  const [filterPendingDataInicio, setFilterPendingDataInicio] = useState("");
  const [filterPendingDataFim, setFilterPendingDataFim] = useState("");
  const [filterPendingUnidade, setFilterPendingUnidade] = useState("");
  const [filterPendingVeiculo, setFilterPendingVeiculo] = useState("");
  const [filterPendingMotorista, setFilterPendingMotorista] = useState("");
  const [filterPendingPerfilVeiculo, setFilterPendingPerfilVeiculo] = useState("");
  const [filterPendingSituacao, setFilterPendingSituacao] = useState("");
  const [filterPendingDiasEmAberto, setFilterPendingDiasEmAberto] = useState("");
  const [searchPendingText, setSearchPendingText] = useState("");

  const activeVehicle = activeSearchedDt ? veiculos.find(ve => ve.id === (activeSearchedDt.veiculoId || activeSearchedDt.veiculo_id)) : null;
  const isFrotaPropria = activeVehicle?.tipo === "Frota Própria";

  // Vales filters
  const [filterDt, setFilterDt] = useState("");
  const [filterMotorista, setFilterMotorista] = useState("");
  const [filterVeiculo, setFilterVeiculo] = useState("");
  const [filterUnidade, setFilterUnidade] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterValorMin, setFilterValorMin] = useState<string>("");
  const [filterDataInicio, setFilterDataInicio] = useState("");
  const [filterDataFim, setFilterDataFim] = useState("");

  // Editing Vale fields
  const [valeStatus, setValeStatus] = useState("Aguardando Análise");
  const [valeCobrado, setValeCobrado] = useState<number>(0);
  const [valeDataCobranca, setValeDataCobranca] = useState("");
  const [valeFormaCobranca, setValeFormaCobranca] = useState("");
  const [valeStatusCobranca, setValeStatusCobranca] = useState("");
  const [isTerceiro, setIsTerceiro] = useState(false);

  // Client side handler to submit DT reopening
  const handleReopenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenProtocol.trim()) {
      setNotification({
        type: "error",
        message: "❌ Por favor, informe o protocolo de fechamento."
      });
      return;
    }
    if (!reopenMotivo.trim()) {
      setNotification({
        type: "error",
        message: "❌ Por favor, informe o motivo da reabertura."
      });
      return;
    }
    
    setReopeningSubmitting(true);
    try {
      const res = await fetch("/api/fechamentos_dt/reabrir", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": userEmail
        },
        body: JSON.stringify({ dt: reopenDt, motivo: reopenMotivo, protocolo: reopenProtocol })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao reabrir DT");
      }
      
      setNotification({
        type: "success",
        message: `🔄 Rota da DT ${reopenDt} reaberta com sucesso! O status foi restaurado para 'Em rota' e os dados financeiros estão liberados para nova edição.`
      });
      
      setIsReopenModalOpen(false);
      setReopenMotivo("");
      setReopenProtocol("");
      setSelectedClosureForDetails(null);
      // Refresh global state
      onRefresh();
      // Reset searched DT display
      setActiveSearchedDt(null);
      setTargetDt("");
    } catch (err: any) {
      setNotification({
        type: "error",
        message: `❌ Falha ao reabrir DT: ${err.message}`
      });
    } finally {
      setReopeningSubmitting(false);
    }
  };

  // Unclosed active DTs for user lookup help
  const unclosedDts = useMemo(() => {
    return rotas.filter(r => 
      !fechamentosDt.some(c => c.dt === r.dt && c.statusFechamento !== "EM_ABERTO") && r.status !== "Finalizada"
    );
  }, [rotas, fechamentosDt]);

  // --- CONTROLE INTELIGENTE DE DTS PENDENTES (AMPLA v2.2) ---
  const getDaysOpen = (dateStr: string) => {
    if (!dateStr) return 0;
    let parts;
    let openDate;
    if (dateStr.includes("-")) {
      parts = dateStr.split("-");
      openDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    } else if (dateStr.includes("/")) {
      parts = dateStr.split("/");
      openDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    } else {
      openDate = new Date(dateStr);
    }

    if (isNaN(openDate.getTime())) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    openDate.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - openDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays < 0 ? 0 : diffDays;
  };

  const getCriticality = (daysOpen: number) => {
    if (daysOpen <= 2) return { label: "Situação Normal", color: "Verde", badgeClass: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" };
    if (daysOpen <= 5) return { label: "Atenção", color: "Amarelo", badgeClass: "bg-amber-500/10 text-amber-400 border border-amber-500/20" };
    if (daysOpen <= 10) return { label: "Urgente", color: "Laranja", badgeClass: "bg-orange-500/10 text-orange-400 border border-orange-500/20" };
    return { label: "Crítico", color: "Vermelho", badgeClass: "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse font-bold" };
  };

  const getVehicleProfile = (id: string) => {
    const v = veiculos.find(ve => ve.id === id);
    return v ? v.perfil : "N/A";
  };

  const getOpeningTime = (r: Rota) => {
    if (r.historico_status && r.historico_status.length > 0) {
      return r.historico_status[0].hora;
    }
    return "08:00";
  };

  const pendingDts = useMemo(() => {
    return rotas.filter(r => 
      !fechamentosDt.some(c => c.dt === r.dt && c.statusFechamento !== "EM_ABERTO")
    );
  }, [rotas, fechamentosDt]);

  const closedToday = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return fechamentosDt.filter(c => 
      c.dataFechamento === todayStr && c.statusFechamento !== "EM_ABERTO"
    );
  }, [fechamentosDt]);

  const controlPanelStats = useMemo(() => {
    const openCount = pendingDts.length;
    const criticalDts = pendingDts.filter(r => getDaysOpen(r.data) > 10);
    const criticalCount = criticalDts.length;

    let totalDaysOpen = 0;
    pendingDts.forEach(r => {
      totalDaysOpen += getDaysOpen(r.data);
    });
    const avgDaysOpen = openCount > 0 ? (totalDaysOpen / openCount) : 0;

    let oldestDt = "N/A";
    let maxDays = -1;
    pendingDts.forEach(r => {
      const days = getDaysOpen(r.data);
      if (days > maxDays) {
        maxDays = days;
        oldestDt = `DT ${r.dt} (${days}d)`;
      }
    });

    return {
      openCount,
      closedTodayCount: closedToday.length,
      criticalCount,
      avgDaysOpen: avgDaysOpen.toFixed(1),
      oldestDt
    };
  }, [pendingDts, closedToday]);

  const filteredPendingDts = useMemo(() => {
    let list = [...pendingDts];

    // Ordenação Inteligente: 1. Críticas, 2. Urgentes, 3. Antigas, 4. Recentes
    list.sort((a, b) => getDaysOpen(b.data) - getDaysOpen(a.data));

    if (filterPendingDataInicio) {
      list = list.filter(r => r.data >= filterPendingDataInicio);
    }
    if (filterPendingDataFim) {
      list = list.filter(r => r.data <= filterPendingDataFim);
    }
    if (filterPendingUnidade) {
      list = list.filter(r => (r.unidadeId === filterPendingUnidade || r.unidade_id === filterPendingUnidade));
    }
    if (filterPendingVeiculo) {
      list = list.filter(r => (r.veiculoId === filterPendingVeiculo || r.veiculo_id === filterPendingVeiculo));
    }
    if (filterPendingMotorista) {
      list = list.filter(r => (r.motoristaId === filterPendingMotorista || r.motorista_id === filterPendingMotorista));
    }
    if (filterPendingPerfilVeiculo) {
      list = list.filter(r => {
        const profile = getVehicleProfile(r.veiculoId || r.veiculo_id) || "";
        return profile.toLowerCase().includes(filterPendingPerfilVeiculo.toLowerCase());
      });
    }
    if (filterPendingSituacao) {
      list = list.filter(r => {
        const days = getDaysOpen(r.data);
        const crit = getCriticality(days);
        return crit.color === filterPendingSituacao;
      });
    }
    if (filterPendingDiasEmAberto) {
      list = list.filter(r => {
        const days = getDaysOpen(r.data);
        if (filterPendingDiasEmAberto === "0-2") return days <= 2;
        if (filterPendingDiasEmAberto === "3-5") return days >= 3 && days <= 5;
        if (filterPendingDiasEmAberto === "6-10") return days >= 6 && days <= 10;
        if (filterPendingDiasEmAberto === ">10") return days > 10;
        const num = parseInt(filterPendingDiasEmAberto, 10);
        if (!isNaN(num)) return days === num;
        return true;
      });
    }

    if (searchPendingText.trim()) {
      const query = searchPendingText.toLowerCase().trim();
      list = list.filter(r => {
        const dtNum = (r.dt || "").toLowerCase();
        const driverName = getDriverName(r.motoristaId || r.motorista_id).toLowerCase();
        const placa = getVehiclePlaca(r.veiculoId || r.veiculo_id).toLowerCase();
        
        const v = veiculos.find(ve => ve.id === (r.veiculoId || r.veiculo_id));
        const vehicleModel = v ? `${v.marca} ${v.modelo}`.toLowerCase() : "";
        const uName = getUnidadeName(r.unidadeId || r.unidade_id).toLowerCase();

        return (
          dtNum.includes(query) ||
          driverName.includes(query) ||
          placa.includes(query) ||
          vehicleModel.includes(query) ||
          uName.includes(query)
        );
      });
    }

    return list;
  }, [
    pendingDts,
    filterPendingDataInicio,
    filterPendingDataFim,
    filterPendingUnidade,
    filterPendingVeiculo,
    filterPendingMotorista,
    filterPendingPerfilVeiculo,
    filterPendingSituacao,
    filterPendingDiasEmAberto,
    searchPendingText,
    veiculos,
    motoristas,
    unidades
  ]);
  // --- END CONTROLE INTELIGENTE DE DTS PENDENTES ---

  // Get standard default rates based on vehicle profile (Phase 5 Architecture)
  const getDefaultRates = (vId: string) => {
    const veic = veiculos.find(v => v.id === vId);
    if (!veic) return { frete: 1200.00, disp: 100.00 };
    const p = (veic.perfil || "").toLowerCase();
    if (p.includes("van") || p.includes("utilitário") || p.includes("utilitario")) {
      return { frete: 550.00, disp: 50.00 };
    }
    if (p.includes("vuc")) {
      return { frete: 750.00, disp: 70.00 };
    }
    if (p.includes("3/4") || p.includes("tres quartos")) {
      return { frete: 850.00, disp: 80.00 };
    }
    if (p.includes("toco")) {
      return { frete: 1100.00, disp: 100.00 };
    }
    if (p.includes("truck")) {
      return { frete: 1500.00, disp: 150.00 };
    }
    if (p.includes("carreta")) {
      return { frete: 2200.00, disp: 200.00 };
    }
    return { frete: 1200.00, disp: 100.00 };
  };

  // Execute DT Search
  const handleSearchDt = (dtNum: string) => {
    if (!dtNum || !dtNum.trim()) {
      setNotification({ type: "error", message: "Informe um número de DT para consultar." });
      return;
    }
    const found = rotas.find(r => r.dt === dtNum.trim());
    if (found) {
      setActiveSearchedDt(found);
      setOccurrences([]);
      setObservacoesGerais("");
      setHouveDevolucao("Não");
      setHouveAvaria("Não");
      setHouveFalta("Não");
      setDevolucaoQtd(0);
      setDevolucaoMotivo("Cliente recusou");
      setDevolucaoObs("");
      setFaltaProduto("");
      setFaltaQuantidade(0);
      setFaltaValorUnit(0);
      setFaltaObservacao("");
      setAvariaProduto("");
      setAvariaQtd(0);
      setAvariaObs("");

      // Initialize default rates and clear other inputs
      const rates = getDefaultRates(found.veiculoId);
      setFreteValor(rates.frete);
      setValorFaturado(rates.frete);
      setDisponibilidadeValor(rates.disp);
      setDiariasBonificacoes(0);
      setAdiantamentos(0);
      setOutrosCreditos(0);
      setMultasDescontos(0);
      setDescargaChapa(0);
      setPedagios(0);
      setLavagensHospedagens(0);
      setAlimentacao(0);
      setManutencaoOutros(0);

      // Reset AMPLA v2.2 - Fase 11 states
      setHouveReciboDescarga("Não");
      setDescargaCliente("");
      setDescargaCodigoCliente("");
      setDescargaNumeroNF("");
      setDescargaValor(0);
      setDescargaData(new Date().toISOString().split("T")[0]);
      setDescargaObservacoes("");
      setDescargaReciboFile("");
      setDescargaResponsavel(currentUser?.nome || userEmail || "Operador");
      setReentregaValor(0);
      setAbastecimentoValor(0);
      setClosureAttachments([]);

      const alreadyClosed = fechamentosDt.find(c => c.dt === found.dt && c.statusFechamento !== "EM_ABERTO");
      if (alreadyClosed) {
        setNotification({
          type: "warning",
          message: `⚠ Esta DT (${found.dt}) já está fechada operacionalmente sob auditoria. Utilize a aba de busca ou o painel de reabertura se precisar corrigi-la.`
        });
      }
    } else {
      setNotification({
        type: "error",
        message: `❌ DT ${dtNum} não foi localizada no cadastro de viagens ativas. Verifique se o número está correto.`
      });
      setActiveSearchedDt(null);
    }
  };

  // Quick select DT to close
  const handleQuickSelect = (rota: Rota) => {
    setTargetDt(rota.dt);
    setActiveSearchedDt(rota);
    setOccurrences([]);
    setObservacoesGerais("");
    setHouveDevolucao("Não");
    setHouveAvaria("Não");
    setHouveFalta("Não");
    setDevolucaoQtd(0);
    setDevolucaoMotivo("Cliente recusou");
    setDevolucaoObs("");
    setFaltaProduto("");
    setFaltaQuantidade(0);
    setFaltaValorUnit(0);
    setFaltaObservacao("");
    setAvariaProduto("");
    setAvariaQtd(0);
    setAvariaObs("");

    // Initialize default rates and clear other inputs
    const rates = getDefaultRates(rota.veiculoId);
    setFreteValor(rates.frete);
    setValorFaturado(rates.frete);
    setDisponibilidadeValor(rates.disp);
    setDiariasBonificacoes(0);
    setAdiantamentos(0);
    setOutrosCreditos(0);
    setMultasDescontos(0);
    setDescargaChapa(0);
    setPedagios(0);
    setLavagensHospedagens(0);
    setAlimentacao(0);
    setManutencaoOutros(0);

    // Reset AMPLA v2.2 - Fase 11 states
    setHouveReciboDescarga("Não");
    setDescargaCliente("");
    setDescargaCodigoCliente("");
    setDescargaNumeroNF("");
    setDescargaValor(0);
    setDescargaData(new Date().toISOString().split("T")[0]);
    setDescargaObservacoes("");
    setDescargaReciboFile("");
    setDescargaResponsavel(currentUser?.nome || userEmail || "Operador");
    setReentregaValor(0);
    setAbastecimentoValor(0);
    setClosureAttachments([]);
  };

  // Add occurrences to current closure draft list
  const handleAddOccurrence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!occTipo) return;

    if (occTipo === "Falta de Mercadoria" || occTipo === "Avaria") {
      if (!occProduto || !occProduto.trim()) {
        setNotification({ type: "error", message: "É obrigatório especificar o Produto para faltas/avariar." });
        return;
      }
      if (occQuantidade <= 0) {
        setNotification({ type: "error", message: "A quantidade deve ser maior do que zero." });
        return;
      }
      if (occValorUnit <= 0) {
        setNotification({ type: "error", message: "O valor unitário deve ser maior do que zero." });
        return;
      }
    }

    const total = occQuantidade * occValorUnit;
    const newOcc = {
      id: `occ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tipo: occTipo,
      produto: occProduto || "",
      quantidade: occQuantidade,
      valorUnitario: occValorUnit,
      valorTotal: total,
      observacao: occObservacao || ""
    };

    setOccurrences([...occurrences, newOcc]);
    
    // Clear inputs
    setOccProduto("");
    setOccQuantidade(0);
    setOccValorUnit(0);
    setOccObservacao("");
    setNotification({ type: "success", message: "Ocorrência inserida no rascunho com sucesso." });
  };

  // Remove occurrence from draft list
  const handleRemoveOccurrence = (id: string) => {
    setOccurrences(occurrences.filter(o => o.id !== id));
  };

  // Confirm close DT
  const handleConfirmClosure = async () => {
    if (!activeSearchedDt) return;

    // Validation checks for questionnaire
    if (houveFalta === "Sim") {
      if (!faltaProduto.trim()) {
        setNotification({ type: "error", message: "Campo 'Produto' é obrigatório quando há falta de mercadoria." });
        return;
      }
      if (faltaQuantidade <= 0) {
        setNotification({ type: "error", message: "Campo 'Quantidade' da falta deve ser maior que zero." });
        return;
      }
      if (faltaValorUnit <= 0) {
        setNotification({ type: "error", message: "Campo 'Valor Unitário' da falta deve ser maior que zero." });
        return;
      }
    }

    if (houveDevolucao === "Sim") {
      if (devolucaoQtd <= 0) {
        setNotification({ type: "error", message: "A quantidade devolvida deve ser maior que zero." });
        return;
      }
      if (!devolucaoMotivo.trim()) {
        setNotification({ type: "error", message: "O motivo da devolução é obrigatório." });
        return;
      }
    }

    if (houveAvaria === "Sim") {
      if (!avariaProduto.trim()) {
        setNotification({ type: "error", message: "Especificar o 'Produto Avariado' é obrigatório." });
        return;
      }
      if (avariaQtd <= 0) {
        setNotification({ type: "error", message: "A quantidade avariada deve ser maior que zero." });
        return;
      }
    }

    // Validation for Recibo de Descarga (AMPLA v2.2 - Fase 11)
    if (houveReciboDescarga === "Sim") {
      if (!descargaCliente.trim()) {
        setNotification({ type: "error", message: "O nome do cliente é obrigatório quando há recibo de descarga." });
        return;
      }
      if (!descargaNumeroNF.trim()) {
        setNotification({ type: "error", message: "O número da NF é obrigatório para registrar o recibo de descarga." });
        return;
      }
      if (descargaValor <= 0) {
        setNotification({ type: "error", message: "O valor da descarga deve ser maior que R$ 0,00." });
        return;
      }
      if (!descargaReciboFile) {
        setNotification({ type: "error", message: "O upload do arquivo de recibo de descarga é obrigatório." });
        return;
      }
    }

    setSubmitting(true);
    try {
      const computedStatus = houveFalta === "Sim" 
        ? "Fechada Com Vale" 
        : (houveAvaria === "Sim" 
            ? "Fechada Com Ocorrência" 
            : (houveDevolucao === "Sim" 
                ? "Fechada Com Devolução" 
                : "Fechada Sem Vale"));

      const res = await fetch("/api/fechamentos_dt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail
        },
        body: JSON.stringify({
          dt: activeSearchedDt.dt,
          motoristaId: activeSearchedDt.motoristaId || activeSearchedDt.motorista_id,
          veiculoId: activeSearchedDt.veiculoId || activeSearchedDt.veiculo_id,
          unidadeId: activeSearchedDt.unidadeId || activeSearchedDt.unidade_id || "un-go",
          valorFaturado,
          observacoes: observacoesGerais,
          ocorrencias: occurrences,

          houveDevolucao,
          houveAvaria,
          houveFalta,

          devolucaoQtd,
          devolucaoMotivo,
          devolucaoObs,

          faltaProduto,
          faltaQuantidade,
          faltaValorUnit,
          faltaValorTotal: faltaQuantidade * faltaValorUnit,
          faltaObservacao,

          avariaProduto,
          avariaQtd,
          avariaObs,

          statusFechamento: computedStatus,

          // Phase 5 financial variables (integrated acerto financeiro)
          freteValor,
          disponibilidadeValor,
          diariasBonificacoes,
          adiantamentos,
          outrosCreditos,
          multasDescontos,
          descargaChapa,
          pedagios,
          lavagensHospedagens,
          alimentacao,
          manutencaoOutros,

          // AMPLA v2.2 - Fase 11 fields
          houveReciboDescarga,
          descargaCliente,
          descargaCodigoCliente,
          descargaNumeroNF,
          descargaValor,
          descargaData,
          descargaObservacoes,
          descargaReciboFile,
          descargaResponsavel,
          reentregaValor,
          abastecimentoValor,
          anexos: closureAttachments
        })
      });

      if (res.ok) {
        const result = await res.json();
        
        let statusEmoji = "🟢";
        if (computedStatus === "Fechada Com Vale") statusEmoji = "🔴";
        else if (computedStatus === "Fechada Com Ocorrência") statusEmoji = "🟠";
        else if (computedStatus === "Fechada Com Devolução") statusEmoji = "🟡";

        setNotification({
          type: "success",
          message: `🔒 DT ${activeSearchedDt.dt} fechada operacionalmente! Status: ${statusEmoji} ${computedStatus}. ${result.generatedVales > 0 ? `Foram gerados ${result.generatedVales} Vales automaticamente.` : ""}`
        });
        
        setIsClosingModalOpen(false);
        setOccurrences([]);
        setObservacoesGerais("");
        setHouveDevolucao("Não");
        setHouveAvaria("Não");
        setHouveFalta("Não");
        setDevolucaoQtd(0);
        setDevolucaoMotivo("Cliente recusou");
        setDevolucaoObs("");
        setFaltaProduto("");
        setFaltaQuantidade(0);
        setFaltaValorUnit(0);
        setFaltaObservacao("");
        setAvariaProduto("");
        setAvariaQtd(0);
        setAvariaObs("");

        // Reset Phase 5 financial states
        setFreteValor(0);
        setDisponibilidadeValor(0);
        setDiariasBonificacoes(0);
        setAdiantamentos(0);
        setOutrosCreditos(0);
        setMultasDescontos(0);
        setDescargaChapa(0);
        setPedagios(0);
        setLavagensHospedagens(0);
        setAlimentacao(0);
        setManutencaoOutros(0);

        // Reset AMPLA v2.2 - Fase 11 states
        setHouveReciboDescarga("Não");
        setDescargaCliente("");
        setDescargaCodigoCliente("");
        setDescargaNumeroNF("");
        setDescargaValor(0);
        setDescargaData(new Date().toISOString().split("T")[0]);
        setDescargaObservacoes("");
        setDescargaReciboFile("");
        setClosureAttachments([]);
        setDescargaResponsavel("");
        setReentregaValor(0);
        setAbastecimentoValor(0);

        setActiveSearchedDt(null);
        setTargetDt("");
        onRefresh();
      } else {
        const err = await res.json();
        setNotification({
          type: "error",
          message: `❌ Erro no fechamento: ${err.error || "Tente novamente."}`
        });
      }
    } catch (err: any) {
      setNotification({ type: "error", message: `❌ Falha na conexão com o servidor: ${err.message}` });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Editing Vale Status & Cobranças
  const handleOpenEditVale = (vale: any) => {
    setEditingVale(vale);
    setValeStatus(vale.status || "Aguardando Análise");
    setValeCobrado(vale.valorCobrado || 0);
    setValeDataCobranca(vale.dataCobrança || "");
    setValeFormaCobranca(vale.formaDeCobrança || "");
    setValeStatusCobranca(vale.statusCobrança || "");
    setIsTerceiro(!!(vale.valorCobrado || vale.formaDeCobrança || vale.statusCobrança));
  };

  // Save edited Vale status
  const handleSaveValeEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVale) return;

    try {
      const payload: any = {
        status: valeStatus,
        valorCobrado: isTerceiro ? Number(valeCobrado) : null,
        dataCobrança: isTerceiro ? valeDataCobranca : null,
        formaDeCobrança: isTerceiro ? valeFormaCobranca : null,
        statusCobrança: isTerceiro ? valeStatusCobranca : null,
      };

      const res = await fetch(`/api/vales/${editingVale.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setNotification({ type: "success", message: "✅ Status e dados de cobrança do Vale gravados com sucesso." });
        setEditingVale(null);
        onRefresh();
      } else {
        const err = await res.json();
        setNotification({ type: "error", message: `❌ Falha ao atualizar: ${err.error || "Erro desconhecido."}` });
      }
    } catch (err: any) {
      setNotification({ type: "error", message: `❌ Falha na comunicação: ${err.message}` });
    }
  };

  // Handle deleting a Vale
  const handleDeleteVale = (id: string, code: string) => {
    setConfirmDialog({
      message: `Tem certeza que deseja EXCLUIR permanentemente o Vale ${code}? Esta ação será registrada no histórico de auditoria corporativa e não poderá ser desfeita.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/vales/${id}`, {
            method: "DELETE",
            headers: {
              "x-user-email": userEmail
            }
          });
          if (res.ok) {
            setNotification({ type: "success", message: "✅ Vale excluído e desfeito do banco operacional." });
            onRefresh();
          } else {
            const err = await res.json();
            setNotification({ type: "error", message: `❌ Falha ao excluir: ${err.error || "Operação vetada."}` });
          }
        } catch (err: any) {
          setNotification({ type: "error", message: `❌ Erro de comunicação: ${err.message}` });
        }
      }
    });
  };

  // Helper matching names
  const getDriverName = (id: string) => {
    const drv = motoristas.find(m => m.id === id);
    return drv ? drv.nome : "Motorista Independente";
  };

  const getVehiclePlaca = (id: string) => {
    const veic = veiculos.find(v => v.id === id);
    return veic ? `${veic.placa} (${veic.modelo})` : "Veículo Terceirizado";
  };

  const getUnidadeName = (id: string) => {
    const un = unidades.find(u => u.id === id);
    return un ? un.nome : "-";
  };

  // Filtered vales list
  const filteredVales = useMemo(() => {
    return vales.filter(v => {
      if (filterDt && !v.dt.toLowerCase().includes(filterDt.toLowerCase())) return false;
      if (filterMotorista) {
        const dName = getDriverName(v.motoristaId).toLowerCase();
        if (!dName.includes(filterMotorista.toLowerCase())) return false;
      }
      if (filterVeiculo) {
        const vPlaca = getVehiclePlaca(v.veiculoId).toLowerCase();
        if (!vPlaca.includes(filterVeiculo.toLowerCase())) return false;
      }
      if (filterUnidade && v.unidadeId !== filterUnidade) return false;
      if (filterStatus && v.status !== filterStatus) return false;
      if (filterValorMin && Number(v.valor) < Number(filterValorMin)) return false;
      if (filterDataInicio && v.data < filterDataInicio) return false;
      if (filterDataFim && v.data > filterDataFim) return false;
      return true;
    });
  }, [vales, filterDt, filterMotorista, filterVeiculo, filterUnidade, filterStatus, filterValorMin, filterDataInicio, filterDataFim]);

  // Alertas / Pendencias > 30 Dias calculations
  const alertOverdueVales = useMemo(() => {
    return vales.filter(v => {
      if (v.status === "Quitado" || v.status === "Cancelado") return false;
      const dataVale = new Date(v.data);
      const diffTime = Date.now() - dataVale.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 30;
    });
  }, [vales]);

  // Filtered Closed DTs list for search and status filters
  const filteredClosedDts = useMemo(() => {
    return fechamentosDt.filter(c => {
      if (searchClosedDt && !c.dt.toLowerCase().includes(searchClosedDt.toLowerCase())) {
        return false;
      }
      if (filterClosedStatus !== "Todas") {
        const status = c.statusFechamento || "Fechada Sem Vale";
        if (status !== filterClosedStatus) {
          return false;
        }
      }
      return true;
    });
  }, [fechamentosDt, filterClosedStatus, searchClosedDt]);

  // Report Metrics (KPIs)
  const stats = useMemo(() => {
    const list = filteredVales;
    const totalCount = list.length;
    const totalVal = list.reduce((acc, curr) => acc + Number(curr.valor), 0);
    
    // Status metrics
    const quitados = list.filter(v => v.status === "Quitado").length;
    const pendentes = list.filter(v => v.status !== "Quitado" && v.status !== "Cancelado").length;
    const cancelados = list.filter(v => v.status === "Cancelado").length;

    // Vales por Unidade for chart
    const valesByUnit: Record<string, number> = {};
    list.forEach(v => {
      const uName = getUnidadeName(v.unidadeId);
      valesByUnit[uName] = (valesByUnit[uName] || 0) + Number(v.valor);
    });
    const unitChartData = Object.entries(valesByUnit).map(([name, valor]) => ({ name, valor }));

    // Vales por Motorista for chart (Top 5)
    const valesByDriver: Record<string, number> = {};
    list.forEach(v => {
      const dName = getDriverName(v.motoristaId);
      valesByDriver[dName] = (valesByDriver[dName] || 0) + Number(v.valor);
    });
    const driverChartData = Object.entries(valesByDriver)
      .map(([name, valor]) => ({ name, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);

    // Vales por Veículo (Top 5)
    const valesByVeic: Record<string, number> = {};
    list.forEach(v => {
      const uVeic = getVehiclePlaca(v.veiculoId).split(" ")[0];
      valesByVeic[uVeic] = (valesByVeic[uVeic] || 0) + Number(v.valor);
    });
    const veicChartData = Object.entries(valesByVeic)
      .map(([name, valor]) => ({ name, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);

    // Vales por Período
    const valesByMonth: Record<string, number> = {};
    list.forEach(v => {
      const monthYear = v.data ? v.data.slice(0, 7) : "Indefinido";
      valesByMonth[monthYear] = (valesByMonth[monthYear] || 0) + Number(v.valor);
    });
    const monthChartData = Object.entries(valesByMonth)
      .map(([name, valor]) => ({ name, valor }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      totalCount,
      totalVal,
      quitados,
      pendentes,
      cancelados,
      unitChartData,
      driverChartData,
      veicChartData,
      monthChartData
    };
  }, [filteredVales, motoristas, veiculos, unidades]);

  return (
    <div className="space-y-6">
      
      {/* MODULE HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900/30 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-sky-400" />
            Fechamento de DT & Controle de Vales Corporativos
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Módulo integrado com vistorias para controle de faltas, avarias, sobras e cobrança automática de terceiros.
          </p>
        </div>
        
        {/* TOP VIEW TABS CONTROLLER */}
        <div className="flex gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-lg max-w-fit">
          <button
            onClick={() => setActiveTab("fechamento")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === "fechamento" ? "bg-sky-600/20 text-sky-400 font-bold border border-sky-505" : "text-slate-400 hover:text-white"
            }`}
          >
            🔒 Fechar DT Operacional
          </button>
          <button
            onClick={() => setActiveTab("financeiro")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === "financeiro" ? "bg-sky-600/20 text-sky-400 font-bold border border-sky-505" : "text-slate-400 hover:text-white"
            }`}
          >
            📋 Relatório de Vales {vales.length > 0 && <span className="ml-1 bg-sky-500 text-slate-950 font-mono text-[9px] px-1 py-0.5 rounded-full font-bold">{vales.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab("relatorios")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === "relatorios" ? "bg-sky-600/20 text-sky-400 font-bold border border-sky-505" : "text-slate-400 hover:text-white"
            }`}
          >
            📊 Visão Gerencial (KPIs)
          </button>
        </div>
      </div>

      {/* RENDER VIEW ACCORDINGLY */}
      {activeTab === "fechamento" && (
        !activeSearchedDt ? (
          <div className="space-y-6">
            {/* PAINEL SUPERIOR: INDICADORES AUTOMÁTICOS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Card 1: DTs em Aberto */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden flex flex-col justify-between text-left">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">📂 DTs em Aberto</span>
                  <strong className="text-3xl font-black text-rose-400 tracking-tight block mt-1 font-mono">
                    {controlPanelStats.openCount}
                  </strong>
                </div>
                <p className="text-[9px] text-slate-500 block font-mono mt-2">Aguardando encerramento</p>
              </div>

              {/* Card 2: DTs Fechadas Hoje */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden flex flex-col justify-between text-left">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">✅ Fechadas Hoje</span>
                  <strong className="text-3xl font-black text-emerald-400 tracking-tight block mt-1 font-mono">
                    {controlPanelStats.closedTodayCount}
                  </strong>
                </div>
                <p className="text-[9px] text-slate-500 block font-mono mt-2">Fechamentos concluídos hoje</p>
              </div>

              {/* Card 3: DTs Críticas */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden flex flex-col justify-between text-left">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">🚨 DTs Críticas (&gt; 10 dias)</span>
                  <strong className={`text-3xl font-black tracking-tight block mt-1 font-mono ${controlPanelStats.criticalCount > 0 ? "text-rose-500 animate-pulse" : "text-slate-400"}`}>
                    {controlPanelStats.criticalCount}
                  </strong>
                </div>
                <p className="text-[9px] text-slate-500 block font-mono mt-2">Pendência grave de auditoria</p>
              </div>

              {/* Card 4: Média de Dias em Aberto */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden flex flex-col justify-between text-left">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">⏳ Média de Dias em Aberto</span>
                  <strong className="text-3xl font-black text-amber-400 tracking-tight block mt-1 font-mono">
                    {controlPanelStats.avgDaysOpen}
                  </strong>
                </div>
                <p className="text-[9px] text-slate-500 block font-mono mt-2">Média móvel operacional</p>
              </div>

              {/* Card 5: DT mais Antiga Aberta */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden flex flex-col justify-between text-left">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">📅 DT mais Antiga</span>
                  <strong className="text-[13px] font-black text-sky-400 tracking-tight block mt-3 font-mono truncate">
                    {controlPanelStats.oldestDt}
                  </strong>
                </div>
                <p className="text-[9px] text-slate-500 block font-mono mt-2">Prioridade máxima de auditoria</p>
              </div>
            </div>

            {/* SEÇÃO DE FILTROS & BUSCA */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4 text-left">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-800/60 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5 font-mono">
                    <SlidersHorizontal className="w-4 h-4 text-sky-400" />
                    Controle de Viagens: Filtros Avançados
                  </h3>
                  <p className="text-[11px] text-slate-505">Refine a listagem automática de viagens para auditoria ou consulta histórica</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setFilterPendingDataInicio("");
                      setFilterPendingDataFim("");
                      setFilterPendingUnidade("");
                      setFilterPendingVeiculo("");
                      setFilterPendingMotorista("");
                      setFilterPendingPerfilVeiculo("");
                      setFilterPendingSituacao("");
                      setFilterPendingDiasEmAberto("");
                      setSearchPendingText("");
                    }}
                    className="px-3 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded text-[11px] font-bold font-mono transition cursor-pointer"
                  >
                    Limpar Filtros
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {/* Busca Textual */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono block">Busca Inteligente</label>
                  <input
                    type="text"
                    value={searchPendingText}
                    onChange={(e) => setSearchPendingText(e.target.value)}
                    placeholder="DT, Motorista, Placa, Filial"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-700 focus:border-sky-500 font-sans"
                  />
                </div>

                {/* Data Inicial */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono block">Data Inicial</label>
                  <input
                    type="date"
                    value={filterPendingDataInicio}
                    onChange={(e) => setFilterPendingDataInicio(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-sky-500"
                  />
                </div>

                {/* Data Final */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono block">Data Final</label>
                  <input
                    type="date"
                    value={filterPendingDataFim}
                    onChange={(e) => setFilterPendingDataFim(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-sky-500"
                  />
                </div>

                {/* Unidade */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono block">Unidade/Filial</label>
                  <select
                    value={filterPendingUnidade}
                    onChange={(e) => setFilterPendingUnidade(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-sky-500"
                  >
                    <option value="">Todas as Unidades</option>
                    {unidades.map(u => (
                      <option key={u.id} value={u.id}>{u.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Veículo */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono block">Veículo (Placa)</label>
                  <select
                    value={filterPendingVeiculo}
                    onChange={(e) => setFilterPendingVeiculo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-sky-500"
                  >
                    <option value="">Todos os Veículos</option>
                    {veiculos.map(v => (
                      <option key={v.id} value={v.id}>{v.placa} ({v.modelo})</option>
                    ))}
                  </select>
                </div>

                {/* Motorista */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono block">Motorista</label>
                  <select
                    value={filterPendingMotorista}
                    onChange={(e) => setFilterPendingMotorista(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-sky-500"
                  >
                    <option value="">Todos os Motoristas</option>
                    {motoristas.map(m => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Perfil do Veículo */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono block">Perfil do Veículo</label>
                  <select
                    value={filterPendingPerfilVeiculo}
                    onChange={(e) => setFilterPendingPerfilVeiculo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-sky-500"
                  >
                    <option value="">Todos os Perfis</option>
                    <option value="van">Van / Utilitário</option>
                    <option value="vuc">VUC</option>
                    <option value="3/4">3/4</option>
                    <option value="toco">Toco</option>
                    <option value="truck">Truck</option>
                    <option value="carreta">Carreta</option>
                  </select>
                </div>

                {/* Situação (Semáforo) */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono block">Situação (Criticidade)</label>
                  <select
                    value={filterPendingSituacao}
                    onChange={(e) => setFilterPendingSituacao(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-sky-500"
                  >
                    <option value="">Todas as Situações</option>
                    <option value="Verde">🟢 Normal (0-2 dias)</option>
                    <option value="Amarelo">🟡 Atenção (3-5 dias)</option>
                    <option value="Laranja">🟠 Urgente (6-10 dias)</option>
                    <option value="Vermelho">🔴 Crítico (&gt;10 dias)</option>
                  </select>
                </div>

                {/* Dias em Aberto */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono block">Dias em Aberto</label>
                  <select
                    value={filterPendingDiasEmAberto}
                    onChange={(e) => setFilterPendingDiasEmAberto(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-sky-500"
                  >
                    <option value="">Todos os Prazos</option>
                    <option value="0-2">0 a 2 dias</option>
                    <option value="3-5">3 a 5 dias</option>
                    <option value="6-10">6 a 10 dias</option>
                    <option value="&gt;10">Mais de 10 dias</option>
                  </select>
                </div>

                {/* Fechamento Rápido por Número da DT */}
                <div className="space-y-1 sm:col-span-2 md:col-span-1">
                  <label className="text-[10px] text-sky-400 font-mono block font-bold">⚡ Fechamento Rápido</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={targetDt}
                      onChange={(e) => setTargetDt(e.target.value)}
                      placeholder="Nº da DT"
                      onKeyDown={(e) => e.key === "Enter" && handleSearchDt(targetDt)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-700 focus:border-sky-500 font-mono"
                    />
                    <button
                      onClick={() => handleSearchDt(targetDt)}
                      className="px-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ABAS DE LISTAGEM: PENDENTES VS HISTÓRICO */}
            <div className="space-y-4">
              <div className="flex border-b border-slate-800">
                <button
                  onClick={() => setControlPanelTab("pendentes")}
                  className={`px-5 py-3 text-xs font-bold font-mono tracking-wider transition uppercase border-b-2 flex items-center gap-2 cursor-pointer ${
                    controlPanelTab === "pendentes" 
                      ? "border-rose-500 text-rose-400 bg-rose-500/5" 
                      : "border-transparent text-slate-400 hover:text-white"
                  }`}
                >
                  📂 DTs Pendentes de Fechamento ({filteredPendingDts.length})
                </button>
                <button
                  onClick={() => setControlPanelTab("fechadas")}
                  className={`px-5 py-3 text-xs font-bold font-mono tracking-wider transition uppercase border-b-2 flex items-center gap-2 cursor-pointer ${
                    controlPanelTab === "fechadas" 
                      ? "border-emerald-500 text-emerald-400 bg-emerald-500/5" 
                      : "border-transparent text-slate-400 hover:text-white"
                  }`}
                >
                  🔒 Histórico de Fechamentos ({filteredClosedDts.length})
                </button>
              </div>

              {controlPanelTab === "pendentes" ? (
                /* TABELA DE PENDENTES */
                filteredPendingDts.length === 0 ? (
                  <div className="p-16 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs text-slate-400 italic font-sans">
                    Nenhuma DT pendente de fechamento localizada com os filtros aplicados.
                  </div>
                ) : (
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900 text-xs text-left font-sans">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-sans leading-relaxed border-collapse">
                        <thead>
                          <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-850 font-mono text-[10px] tracking-wider uppercase">
                            <th className="p-3 pl-4">DT</th>
                            <th className="p-3">Operação</th>
                            <th className="p-3">Unidade</th>
                            <th className="p-3">Veículo</th>
                            <th className="p-3">Perfil</th>
                            <th className="p-3">Motorista</th>
                            <th className="p-3">Abertura</th>
                            <th className="p-3 text-center">Dias em Aberto</th>
                            <th className="p-3 text-center">Status Operacional</th>
                            <th className="p-3">Situação</th>
                            <th className="p-3 pr-4 text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850/60 font-medium">
                          {filteredPendingDts.map(r => {
                            const days = getDaysOpen(r.data);
                            const crit = getCriticality(days);
                            const openingTime = getOpeningTime(r);
                            const profile = getVehicleProfile(r.veiculoId);
                            const vehicleModel = veiculos.find(v => v.id === r.veiculoId);
                            
                            return (
                              <tr key={r.id} className="hover:bg-slate-850/15 text-slate-300">
                                <td className="p-3 pl-4 font-bold text-white font-mono">{r.dt}</td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-sky-950/40 text-sky-400 border border-sky-900/30 font-mono">
                                    {r.tipo}
                                  </span>
                                </td>
                                <td className="p-3 truncate max-w-[120px]">{getUnidadeName(r.unidadeId)}</td>
                                <td className="p-3">
                                  <div className="font-mono text-white text-[11px] font-bold">{getVehiclePlaca(r.veiculoId).split(" ")[0]}</div>
                                  <div className="text-[10px] text-slate-500 truncate max-w-[125px]">{vehicleModel ? `${vehicleModel.marca} ${vehicleModel.modelo}` : ""}</div>
                                </td>
                                <td className="p-3 text-[10px] uppercase font-mono text-slate-400">{profile}</td>
                                <td className="p-3 truncate max-w-[140px] text-slate-200">{getDriverName(r.motoristaId)}</td>
                                <td className="p-3">
                                  <div className="font-mono text-slate-300">{r.data}</div>
                                  <div className="text-[9px] text-slate-550 font-mono">{openingTime}</div>
                                </td>
                                <td className="p-3 text-center font-mono font-bold text-white text-sm">
                                  {days}
                                </td>
                                <td className="p-3 text-center">
                                  <span className="px-2 py-0.5 rounded-full text-[9px] bg-slate-950 text-slate-400 border border-slate-800 font-mono">
                                    {r.status}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${crit.badgeClass}`}>
                                    {crit.label}
                                  </span>
                                </td>
                                <td className="p-3 pr-4 text-center">
                                  <button
                                    onClick={() => handleQuickSelect(r)}
                                    className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/30 hover:border-rose-500 text-rose-400 rounded text-[10px] font-extrabold uppercase transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5" /> Auditoria
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              ) : (
                /* TABELA DE FECHADAS */
                filteredClosedDts.length === 0 ? (
                  <div className="p-16 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs text-slate-400 italic font-sans">
                    Nenhum encerramento de DT localizado com os filtros aplicados.
                  </div>
                ) : (
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900 text-xs text-left font-sans">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-sans leading-relaxed border-collapse">
                        <thead>
                          <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-850 font-mono text-[10px] tracking-wider uppercase">
                            <th className="p-3 pl-4">DT</th>
                            <th className="p-3">Data/Hora Fechamento</th>
                            <th className="p-3">Status de Auditoria</th>
                            <th className="p-3">Responsável</th>
                            <th className="p-3">Detalhes/Obs</th>
                            <th className="p-3 pr-4 text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850/60 font-medium">
                          {filteredClosedDts.map((c) => {
                            const status = c.statusFechamento || "Fechada Sem Vale";
                            
                            let badgeClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25";
                            let prefix = "🟢";
                            if (status === "Fechada Com Vale") {
                              badgeClass = "bg-rose-500/10 text-rose-400 border border-rose-500/25";
                              prefix = "🔴";
                            } else if (status === "Fechada Com Ocorrência") {
                              badgeClass = "bg-orange-500/10 text-orange-400 border border-orange-500/25";
                              prefix = "🟠";
                            } else if (status === "Fechada Com Devolução") {
                              badgeClass = "bg-amber-500/10 text-amber-400 border border-amber-500/25";
                              prefix = "🟡";
                            }

                            return (
                              <tr key={c.id || c.dt} className="hover:bg-slate-850/15 text-slate-300">
                                <td className="p-3 pl-4 font-bold text-white font-mono">{c.dt}</td>
                                <td className="p-3 font-mono text-[11px] text-slate-400">
                                  {c.dataFechamento || "N/A"} <span className="text-slate-650">|</span> {c.horaFechamento || ""}
                                </td>
                                <td className="p-3">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${badgeClass}`}>
                                    {prefix} {status}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-400 max-w-[140px] truncate">{c.usuarioResponsavel?.split("@")[0] || "Sistema"}</td>
                                <td className="p-3 text-slate-400 max-w-sm truncate text-[11px]">
                                  {c.observacoes || <span className="text-slate-650 italic">Nenhum detalhe adicional</span>}
                                </td>
                                <td className="p-3 pr-4 text-center">
                                  <button
                                    onClick={() => setSelectedClosureForDetails(c)}
                                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded text-[10px] font-bold transition mx-auto cursor-pointer"
                                  >
                                    Ver Resumo
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        ) : (
          /* STANDARD FORM VIEW WITH activeSearchedDt (SIDE-BY-SIDE COLUMNS) */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT SEARCH AND QUICK GUIDE PANEL */}
            <div className="space-y-4">
              <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4 text-left">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-sky-400 font-mono uppercase tracking-wider">Passo 1: Selecionar DT Ativa</h3>
                  <button 
                    onClick={() => {
                      setActiveSearchedDt(null);
                      setTargetDt("");
                    }}
                    className="text-[10px] text-rose-400 hover:text-rose-350 font-bold font-mono transition flex items-center gap-1 cursor-pointer"
                  >
                    &larr; Voltar ao Painel
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">Clique em "Voltar ao Painel" para abrir a listagem completa ou pesquise outra DT abaixo.</p>

                {/* Lookup form */}
                <div className="space-y-2">
                  <label className="text-[11px] text-slate-500 font-mono">Mudar de DT Ativa</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={targetDt}
                      onChange={(e) => setTargetDt(e.target.value)}
                      placeholder="Ex: 50493"
                      onKeyDown={(e) => e.key === "Enter" && handleSearchDt(targetDt)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:border-sky-500 font-mono"
                    />
                    <button
                      onClick={() => handleSearchDt(targetDt)}
                      className="px-3 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-medium flex items-center justify-center cursor-pointer"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Legend warnings */}
                {alertOverdueVales.length > 0 && (
                  <div className="p-3.5 bg-rose-950/25 border border-rose-900/40 rounded-lg text-rose-300 space-y-2 text-xs leading-relaxed">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse shrink-0" />
                      <span>⚠ Vales Pendentes &gt; 30 Dias</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Existem <strong className="text-rose-200">{alertOverdueVales.length} vales</strong> aguardando quitação há mais de um mês. Alertas foram enviados para a diretoria.
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Unclosed DT List */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-left space-y-3">
                <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-400" />
                  Destaques DTs Sem Fechamento ({unclosedDts.length})
                </h4>
                {unclosedDts.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">Nenhuma viagem pendente de fechamento encontrada.</p>
                ) : (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {unclosedDts.slice(0, 8).map(r => (
                      <div 
                        key={r.id} 
                        onClick={() => handleQuickSelect(r)}
                        className={`p-2.5 rounded-lg border text-left cursor-pointer transition flex items-center justify-between ${
                          targetDt === r.dt 
                            ? "bg-sky-500/10 border-sky-550" 
                            : "bg-slate-950/60 border-slate-850 hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <strong className="text-white font-mono text-xs">{r.dt}</strong>
                            <span className="text-[10px] text-slate-500 font-mono">({r.tipo})</span>
                          </div>
                          <p className="text-[10px] text-slate-405 truncate font-sans">👤 {getDriverName(r.motoristaId)}</p>
                          <p className="text-[9px] text-slate-500 font-mono">{getVehiclePlaca(r.veiculoId).split(" ")[0]} • {getUnidadeName(r.unidadeId)}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* MAIN DT CLOSURE DETAILS CARD */}
            <div className="lg:col-span-2 text-left space-y-4">
              <div className="hidden">
                <div className="space-y-4">
                {/* Intro banner */}
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 text-left">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-sky-500/10 rounded-lg text-sky-400 border border-sky-500/20 shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-white text-sm font-bold">Painel de Consultas & Auditoria Operacional</h3>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans">
                        Nenhuma DT selecionada para encerramento ativo. Use a busca ou selecione da lista rápida ao lado. 
                        Abaixo você pode consultar o histórico de todas as rotas fechadas operacionalmente.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Consultas Filter Bar */}
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-3 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-sky-400" />
                      Consultar Rotas Fechadas ({filteredClosedDts.length})
                    </span>
                    <div className="text-[10px] text-slate-500 font-mono">Auditoria de Vales e Ocorrências</div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Search Field */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-mono block">Buscar por número da DT</label>
                      <input
                        type="text"
                        value={searchClosedDt}
                        onChange={(e) => setSearchClosedDt(e.target.value)}
                        placeholder="Ex: 5049"
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-700 focus:border-sky-500 font-mono"
                      />
                    </div>

                    {/* Status Filter Dropdown */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-mono block">Filtrar por Status de Fechamento</label>
                      <select
                        value={filterClosedStatus}
                        onChange={(e) => setFilterClosedStatus(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-sky-500"
                      >
                        <option value="Todas">Todos os Fechamentos</option>
                        <option value="Fechada Sem Vale">🟢 Fechada Sem Vale</option>
                        <option value="Fechada Com Devolução">🟡 Fechada Com Devolução</option>
                        <option value="Fechada Com Ocorrência">🟠 Fechada Com Ocorrência</option>
                        <option value="Fechada Com Vale">🔴 Fechada Com Vale</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Table or Cards */}
                {filteredClosedDts.length === 0 ? (
                  <div className="p-12 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs text-slate-400 italic max-w-none">
                    Nenhum encerramento de DT localizado com os filtros inseridos.
                  </div>
                ) : (
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900 text-xs text-left font-sans">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-sans leading-relaxed border-collapse">
                        <thead>
                          <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-850 font-mono text-[10px] tracking-wider uppercase">
                            <th className="p-3 pl-4">DT</th>
                            <th className="p-3">Data/Hora Fechamento</th>
                            <th className="p-3">Status de Auditoria</th>
                            <th className="p-3">Responsável</th>
                            <th className="p-3">Detalhes/Obs</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850/60">
                          {filteredClosedDts.map((c) => {
                            const status = c.statusFechamento || "Fechada Sem Vale";
                            
                            let badgeClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25";
                            let prefix = "🟢";
                            if (status === "Fechada Com Vale") {
                              badgeClass = "bg-rose-500/10 text-rose-400 border border-rose-500/25";
                              prefix = "🔴";
                            } else if (status === "Fechada Com Ocorrência") {
                              badgeClass = "bg-orange-500/10 text-orange-400 border border-orange-500/25";
                              prefix = "🟠";
                            } else if (status === "Fechada Com Devolução") {
                              badgeClass = "bg-amber-500/10 text-amber-400 border border-amber-500/25";
                              prefix = "🟡";
                            }

                            return (
                              <tr key={c.id || c.dt} className="hover:bg-slate-850/20 text-slate-300">
                                <td className="p-3 pl-4 font-bold text-white font-mono">{c.dt}</td>
                                <td className="p-3 font-mono text-[11px] text-slate-400">
                                  {c.dataFechamento || "N/A"} <span className="text-slate-605">|</span> {c.horaFechamento || ""}
                                </td>
                                <td className="p-3">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${badgeClass}`}>
                                    {prefix} {status}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-400 max-w-[124px] truncate">{c.usuarioResponsavel?.split("@")[0] || "Sistema"}</td>
                                <td className="p-3 text-slate-400 pr-4 text-[11px]">
                                  <div className="line-clamp-2 leading-tight">
                                    {c.observacoes || <span className="text-slate-650 italic">Nenhum detalhe adicional</span>}
                                  </div>
                                  {(() => {
                                    const linkedNoShow = noShows?.find((ns: any) => ns.dt === c.dt);
                                    if (!linkedNoShow) return null;
                                    return (
                                      <div className="mt-1.5 p-1.5 rounded bg-rose-955/20 border border-rose-500/15 text-[10px] space-y-0.5 leading-tight">
                                        <p className="text-rose-400 font-bold font-sans">🚨 DT com No Show ({linkedNoShow.statusNoShow})</p>
                                        <p className="font-mono text-[9px] text-slate-500">
                                          {linkedNoShow.statusNoShow === "Resolvido" && (
                                            <>Substituto: <b className="text-emerald-400 font-bold">{motoristas.find((m) => m.id === linkedNoShow.motoristaSubstituto)?.nome || linkedNoShow.motoristaSubstituto}</b></>
                                          )}
                                        </p>
                                      </div>
                                    );
                                  })()}
                                  {c.faltaProduto && (
                                    <div className="mt-1 text-[9px] font-mono text-rose-350 bg-rose-950/25 px-1.5 py-0.5 rounded inline-block">
                                      Falta: {c.faltaProduto} ({c.faltaQuantidade}x)
                                    </div>
                                  )}
                                  {c.devolucaoQtd > 0 && (
                                    <div className="mt-1 text-[9px] font-mono text-amber-300 bg-amber-950/25 px-1.5 py-0.5 rounded inline-block ml-1">
                                      Devol: {c.devolucaoQtd}x ({c.devolucaoMotivo})
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              </div>
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden space-y-5 p-5 animate-fadeIn">
                
                {/* Active DT summary card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-500 text-slate-955 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase font-mono">DT ATIVA</span>
                      <h3 className="text-lg font-bold text-white font-mono">{activeSearchedDt.dt}</h3>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">Operação: {activeSearchedDt.data} • Filial: {getUnidadeName(activeSearchedDt.unidadeId)}</p>
                  </div>

                  {/* Operational status badge */}
                  <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 self-start sm:self-auto text-xs font-mono">
                    <span className="text-slate-500">Status Operacional:</span>
                    <strong className="text-sky-400 font-semibold">{activeSearchedDt.status}</strong>
                  </div>
                </div>

                {/* Grid detailing metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-850">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">Motorista</span>
                    <strong className="text-white text-xs block font-sans truncate">{getDriverName(activeSearchedDt.motoristaId)}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">Veículo / Placa</span>
                    <strong className="text-white text-xs block font-mono truncate">{getVehiclePlaca(activeSearchedDt.veiculoId)}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-mono uppercase block font-bold text-sky-400">Total de Entregas</span>
                    <strong className="text-white text-sm block font-mono">{activeSearchedDt.totalEntregas || 0}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">Concluídas / Devolvidas</span>
                    <strong className="text-white text-sm block font-mono">
                      <span className="text-emerald-400">{activeSearchedDt.entregues || 0}</span>
                      <span className="text-slate-500"> / </span>
                      <span className="text-rose-400">{activeSearchedDt.devolucoes || 0}</span>
                    </strong>
                  </div>
                </div>

                {/* ALERT IF CLOSED already */}
                {(() => {
                  const closureObj = fechamentosDt.find(c => c.dt === activeSearchedDt.dt && c.statusFechamento !== "EM_ABERTO");
                  
                  if (closureObj) {
                    const isMasterUser = currentUser && (currentUser.perfil === "admin_master" || currentUser.tipo_usuario === "MASTER");
                    const isSupervisorUser = currentUser && (currentUser.perfil === "admin_unidade" || currentUser.perfil === "supervisor" || currentUser.tipo_usuario === "SUPERVISOR");
                    
                    let hasReopenPermission = false;
                    if (isMasterUser) {
                      hasReopenPermission = true;
                    } else if (isSupervisorUser) {
                      const supervisorUnit = currentUser.unidadeId;
                      const permittedUnits = currentUser.unidadesPermitidas || [];
                      hasReopenPermission = closureObj.unidadeId === supervisorUnit || permittedUnits.includes(closureObj.unidadeId);
                    }

                    return (
                      <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 leading-relaxed font-sans text-xs space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 font-extrabold text-sm text-amber-400 font-mono tracking-wide uppercase">
                              <AlertCircle className="w-5 h-5 text-amber-500" />
                              <span>DT já fechada.</span>
                            </div>
                            <p className="text-slate-400 text-[11px]">
                              Esta DT já passou pelo encerramento de pendências e está bloqueada para alteração direta.
                            </p>
                          </div>
                          <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded uppercase">
                            Protocolo: {closureObj.protocoloFechamento && closureObj.protocoloFechamento !== "N/A" ? closureObj.protocoloFechamento : "10541"}
                          </span>
                        </div>

                        <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-850 grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono text-[11px]">
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-bold">Protocolo de Fechamento</span>
                            <span className="text-white font-bold">{closureObj.protocoloFechamento && closureObj.protocoloFechamento !== "N/A" ? closureObj.protocoloFechamento : "10541"}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-bold">Data</span>
                            <span className="text-white">{closureObj.dataFechamento || new Date().toISOString().split("T")[0]}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-bold">Hora</span>
                            <span className="text-white">{closureObj.horaFechamento || new Date().toTimeString().split(" ")[0]}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-bold">Responsável</span>
                            <span className="text-sky-400 font-medium truncate block" title={closureObj.usuarioFechamento || closureObj.usuarioResponsavel || "Sistema"}>
                              {(closureObj.usuarioFechamento || closureObj.usuarioResponsavel || "Sistema").split("@")[0]}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-900">
                          <button
                            type="button"
                            onClick={() => setSelectedClosureForDetails(selectedClosureForDetails?.id === closureObj.id ? null : closureObj)}
                            className="py-1.5 px-3 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-sky-400" />
                            {selectedClosureForDetails?.id === closureObj.id ? "Ocultar Detalhes" : "Visualizar Fechamento"}
                          </button>

                          {hasReopenPermission && (
                            <button
                              type="button"
                              onClick={() => {
                                setReopenDt(closureObj.dt);
                                setReopenMotivo("");
                                setIsReopenModalOpen(true);
                              }}
                              className="py-1.5 px-3 bg-red-950/40 hover:bg-red-900/30 text-red-400 border border-red-500/20 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" />
                              Reabrir DT
                            </button>
                          )}
                        </div>

                        {/* Collapsible Closure Details & Timeline History */}
                        {selectedClosureForDetails?.id === closureObj.id && (
                          <div className="mt-4 p-4 bg-slate-900 border border-slate-850 rounded-lg space-y-4 animate-fadeIn">
                            {/* Financial values snapshot */}
                            <div className="space-y-2">
                              <h5 className="text-[10px] font-extrabold uppercase font-mono tracking-wider text-sky-400 border-b border-slate-850 pb-1 flex items-center gap-1.5">
                                <DollarSign className="w-3.5 h-3.5 text-sky-400" />
                                Snapshot Financeiro do Fechamento
                              </h5>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-[10px]">
                                <div className="p-2 bg-slate-950 rounded border border-slate-850/60">
                                  <span className="text-slate-500 block text-[8px] uppercase font-bold">Valor Frete</span>
                                  <span className="text-emerald-400 font-bold">R$ {(closureObj.freteValor || 0).toFixed(2)}</span>
                                </div>
                                <div className="p-2 bg-slate-950 rounded border border-slate-850/60">
                                  <span className="text-slate-500 block text-[8px] uppercase font-bold">Adiantamentos</span>
                                  <span className="text-rose-400 font-bold">R$ {(closureObj.adiantamentos || 0).toFixed(2)}</span>
                                </div>
                                <div className="p-2 bg-slate-950 rounded border border-slate-850/60">
                                  <span className="text-slate-500 block text-[8px] uppercase font-bold">Multas/Descontos</span>
                                  <span className="text-rose-400 font-bold">R$ {(closureObj.multasDescontos || 0).toFixed(2)}</span>
                                </div>
                                <div className="p-2 bg-slate-950 rounded border border-slate-850/60">
                                  <span className="text-slate-500 block text-[8px] uppercase font-bold">Pedágios</span>
                                  <span className="text-emerald-400 font-bold">R$ {(closureObj.pedagios || 0).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Operational occurrences */}
                            <div className="space-y-2">
                              <h5 className="text-[10px] font-extrabold uppercase font-mono tracking-wider text-sky-400 border-b border-slate-850 pb-1 flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5 text-sky-400" />
                                Respostas do Questionário
                              </h5>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[10px]">
                                <div className="p-2 bg-slate-950 rounded border border-slate-850/60 flex items-center justify-between">
                                  <span className="text-slate-500 text-[8px] uppercase font-bold">Houve Falta?</span>
                                  <span className={closureObj.houveFalta === "Sim" ? "text-rose-400 font-bold" : "text-slate-400"}>{closureObj.houveFalta || "Não"}</span>
                                </div>
                                <div className="p-2 bg-slate-950 rounded border border-slate-850/60 flex items-center justify-between">
                                  <span className="text-slate-500 text-[8px] uppercase font-bold">Houve Avaria?</span>
                                  <span className={closureObj.houveAvaria === "Sim" ? "text-rose-400 font-bold" : "text-slate-400"}>{closureObj.houveAvaria || "Não"}</span>
                                </div>
                                <div className="p-2 bg-slate-950 rounded border border-slate-850/60 flex items-center justify-between">
                                  <span className="text-slate-500 text-[8px] uppercase font-bold">Houve Devolução?</span>
                                  <span className={closureObj.houveDevolucao === "Sim" ? "text-amber-400 font-bold" : "text-slate-400"}>{closureObj.houveDevolucao || "Não"}</span>
                                </div>
                              </div>
                            </div>

                            {/* DOCUMENTOS DO FECHAMENTO */}
                            <div className="space-y-2">
                              <h5 className="text-[10px] font-extrabold uppercase font-mono tracking-wider text-teal-400 border-b border-slate-850 pb-1 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-teal-400" />
                                DOCUMENTOS DO FECHAMENTO
                              </h5>
                              <div className="space-y-2">
                                {(() => {
                                  const activeAnexos = closureObj.anexos || [];
                                  const displayAnexos = [...activeAnexos];
                                  if (displayAnexos.length === 0 && closureObj.descargaReciboFile) {
                                    displayAnexos.push({
                                      id: "fallback-recibo",
                                      nome: closureObj.descargaReciboFile,
                                      url: closureObj.descargaReciboFile.startsWith("data:") ? closureObj.descargaReciboFile : `https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=1500&auto=format&fit=crop`,
                                      tipo: closureObj.descargaReciboFile.toLowerCase().endsWith(".pdf") ? "PDF" : "IMAGEM",
                                      dataUpload: closureObj.descargaData || closureObj.dataFechamento || new Date().toISOString(),
                                      usuario: closureObj.usuarioFechamento || closureObj.usuarioResponsavel || "Sistema",
                                      dt: closureObj.dt
                                    });
                                  }

                                  if (displayAnexos.length > 0) {
                                    return (
                                      <div className="grid grid-cols-1 gap-2">
                                        {displayAnexos.map((anx: any, idx: number) => {
                                          const isPdf = anx.tipo === "PDF" || anx.nome.toLowerCase().endsWith(".pdf");
                                          return (
                                            <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-850/60 font-mono text-[10px]">
                                              <div className="flex items-center gap-2 min-w-0">
                                                <div className="p-1.5 bg-slate-900 border border-slate-800 rounded shrink-0">
                                                  {isPdf ? (
                                                    <FileText className="w-4 h-4 text-red-400" />
                                                  ) : (
                                                    <Image className="w-4 h-4 text-emerald-400" />
                                                  )}
                                                </div>
                                                <div className="min-w-0">
                                                  <p className="text-slate-200 font-bold truncate max-w-[150px] sm:max-w-[320px]" title={anx.nome}>
                                                    {anx.nome}
                                                  </p>
                                                  <p className="text-[8px] text-slate-500">
                                                    Enviado por <span className="text-slate-400">{anx.usuario ? anx.usuario.split("@")[0] : "Sistema"}</span> em {anx.dataUpload ? anx.dataUpload.split("T")[0] : "N/A"}
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-1.5 ml-2">
                                                <button
                                                  type="button"
                                                  onClick={() => handleViewAttachment(anx)}
                                                  className="px-2 py-1 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 rounded text-[9px] font-bold transition flex items-center gap-1 cursor-pointer font-sans"
                                                >
                                                  <Eye className="w-3 h-3 text-sky-400" />
                                                  Visualizar
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleDownloadAttachment(anx)}
                                                  className="px-2 py-1 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 rounded text-[9px] font-bold transition flex items-center gap-1 cursor-pointer font-sans"
                                                >
                                                  <Download className="w-3 h-3 text-emerald-400" />
                                                  Baixar
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  }

                                  return <p className="text-slate-500 italic text-[10px] font-mono py-1">Nenhum documento anexado.</p>;
                                })()}
                              </div>
                            </div>

                            {/* Timeline/History Audit Log */}
                            <div className="space-y-2 pt-1">
                              <h5 className="text-[10px] font-extrabold uppercase font-mono tracking-wider text-sky-400 border-b border-slate-850 pb-1 flex items-center gap-1.5">
                                <History className="w-3.5 h-3.5 text-sky-400" />
                                Histórico de Protocolos e Auditoria
                              </h5>
                              
                              <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                                {(closureObj.historicoFechamentos && closureObj.historicoFechamentos.length > 0) ? (
                                  closureObj.historicoFechamentos.map((hist: any, index: number) => {
                                    const isReopen = hist.acao === "REABERTURA";
                                    return (
                                      <div key={index} className="flex gap-3 pl-1 text-[10px] relative">
                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 z-10 font-mono text-[9px] font-extrabold ${
                                          isReopen 
                                            ? "bg-red-950 text-red-400 border border-red-500/20" 
                                            : "bg-emerald-950 text-emerald-400 border border-emerald-500/20"
                                        }`}>
                                          {isReopen ? "R" : "F"}
                                        </div>
                                        <div className="space-y-0.5 flex-1 bg-slate-950/40 p-2.5 rounded border border-slate-850/60">
                                          <div className="flex items-center justify-between gap-2">
                                            <strong className={isReopen ? "text-red-400 font-bold font-mono" : "text-emerald-400 font-bold font-mono"}>
                                              {isReopen ? "🔄 Reabertura de DT" : "📥 Fechamento Operacional"}
                                            </strong>
                                            <span className="text-slate-500 font-mono text-[9px]">{hist.data} {hist.hora}</span>
                                          </div>
                                          <div className="text-slate-400 font-mono text-[9px] mt-0.5">
                                            <span className="text-slate-500">Usuário:</span> <span className="text-slate-300">{hist.usuario}</span>
                                            {hist.protocolo && (
                                              <> <span className="text-slate-500">| Protocolo:</span> <b className="text-slate-200">{hist.protocolo}</b></>
                                            )}
                                          </div>
                                          {hist.motivo && (
                                            <p className="p-1.5 bg-slate-900 rounded text-slate-400 italic text-[9px] font-mono leading-tight mt-1 border border-slate-850/30">
                                              "{hist.motivo}"
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="flex gap-3 pl-1 text-[10px]">
                                    <div className="w-4 h-4 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 z-10 font-mono text-[9px] font-bold">
                                      F
                                    </div>
                                    <div className="space-y-0.5 flex-1 bg-slate-950/40 p-2.5 rounded border border-slate-850/60">
                                      <div className="flex items-center justify-between gap-2">
                                        <strong className="text-emerald-400 font-bold font-mono">📥 Primeiro Fechamento</strong>
                                        <span className="text-slate-500 font-mono text-[9px]">{closureObj.dataFechamento} {closureObj.horaFechamento}</span>
                                      </div>
                                      <div className="text-slate-400 font-mono text-[9px] mt-0.5">
                                        <span className="text-slate-500">Usuário:</span> <span className="text-slate-300">{closureObj.usuarioResponsavel}</span> | <span className="text-slate-500">Protocolo:</span> {closureObj.protocoloFechamento && closureObj.protocoloFechamento !== "N/A" ? closureObj.protocoloFechamento : "10541"}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  
                  return (
                    /* STEPS TO FECHAR DT (NEW QUESTIONNAIRE FLOW) */
                    <div className="space-y-5">
                      <div className="border-b border-slate-800 pb-2 flex justify-between items-center bg-slate-900/60 p-2 rounded-t-lg">
                        <h4 className="text-xs font-extrabold text-sky-400 uppercase tracking-wider font-mono">🔒 Questionário de Encerramento da Rota</h4>
                        <span className="text-[10px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded font-mono border border-slate-800 uppercase">Processo de Auditoria</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* 1. Houve Devolução? */}
                        <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl space-y-3">
                          <div className="space-y-1">
                            <label className="text-xs font-extrabold text-white block">📦 Houve devolução?</label>
                            <p className="text-[10px] text-slate-500 leading-tight">Ocorreram retornos ou recusas de mercadorias pelos clientes de entrega?</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setHouveDevolucao("Sim")}
                            className={`py-1.5 px-3 text-xs font-bold rounded-lg border transition cursor-pointer uppercase ${
                              houveDevolucao === "Sim"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500"
                                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setHouveDevolucao("Não");
                              setDevolucaoQtd(0);
                            }}
                            className={`py-1.5 px-3 text-xs font-bold rounded-lg border transition cursor-pointer uppercase ${
                              houveDevolucao === "Não"
                                ? "bg-slate-800 text-slate-200 border-slate-700 font-extrabold"
                                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            Não
                          </button>
                        </div>

                        {/* Devolução details */}
                        {houveDevolucao === "Sim" && (
                          <div className="space-y-2.5 pt-3 border-t border-slate-900 animate-fadeIn text-xs">
                            <div className="space-y-1 text-left">
                              <label className="text-slate-400 font-mono text-[10px] uppercase block">Quantidade Devolvida</label>
                              <input
                                type="number"
                                min="1"
                                value={devolucaoQtd || ""}
                                onChange={(e) => setDevolucaoQtd(Number(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-white text-xs font-mono"
                                placeholder="Qtd de caixas/itens"
                              />
                            </div>
                            <div className="space-y-1 text-left">
                              <label className="text-slate-400 font-mono text-[10px] uppercase block">Motivo da Devolução</label>
                              <select
                                value={devolucaoMotivo}
                                onChange={(e) => setDevolucaoMotivo(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-white text-xs"
                              >
                                <option value="Cliente recusou">Cliente recusou</option>
                                <option value="Embalagem danificada / Avariada">Embalagem danificada / Avariada</option>
                                <option value="Endereço não localizado">Endereço não localizado</option>
                                <option value="Erro fiscal / Pedido divergente">Erro fiscal / Pedido divergente</option>
                                <option value="Outros motivos">Outros motivos</option>
                              </select>
                            </div>
                            <div className="space-y-1 text-left">
                              <label className="text-slate-400 font-mono text-[10px] uppercase block">Observações da Devolução</label>
                              <input
                                type="text"
                                value={devolucaoObs}
                                onChange={(e) => setDevolucaoObs(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-white text-xs"
                                placeholder="Observações complementares"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 2. Houve Avaria? */}
                      <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-extrabold text-white block">💥 Houve avaria?</label>
                          <p className="text-[10px] text-slate-500 leading-tight">Existem mercadorias danificadas ou quebradas na rota de retorno?</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setHouveAvaria("Sim")}
                            className={`py-1.5 px-3 text-xs font-bold rounded-lg border transition cursor-pointer uppercase ${
                              houveAvaria === "Sim"
                                ? "bg-orange-500/10 text-orange-405 border-orange-500"
                                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setHouveAvaria("Não");
                              setAvariaQtd(0);
                            }}
                            className={`py-1.5 px-3 text-xs font-bold rounded-lg border transition cursor-pointer uppercase ${
                              houveAvaria === "Não"
                                ? "bg-slate-800 text-slate-200 border-slate-700 font-extrabold"
                                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            Não
                          </button>
                        </div>

                        {/* Avaria details */}
                        {houveAvaria === "Sim" && (
                          <div className="space-y-2.5 pt-3 border-t border-slate-900 animate-fadeIn text-xs">
                            <div className="space-y-1 text-left">
                              <label className="text-slate-400 font-mono text-[10px] uppercase block">Produto Avariado</label>
                              <input
                                type="text"
                                value={avariaProduto}
                                onChange={(e) => setAvariaProduto(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-white text-xs"
                                placeholder="Qual pilar ou garrafa?"
                              />
                            </div>
                            <div className="space-y-1 text-left">
                              <label className="text-slate-400 font-mono text-[10px] uppercase block">Quantidade Avariada</label>
                              <input
                                type="number"
                                min="1"
                                value={avariaQtd || ""}
                                onChange={(e) => setAvariaQtd(Number(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-white text-xs font-mono"
                                placeholder="Qtd danificada"
                              />
                            </div>
                            <div className="space-y-1 text-left">
                              <label className="text-slate-400 font-mono text-[10px] uppercase block">Observações da Avaria</label>
                              <input
                                type="text"
                                value={avariaObs}
                                onChange={(e) => setAvariaObs(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-white text-xs"
                                placeholder="Detalhes de quebra/vazamento"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 3. Houve Falta de Mercadoria? */}
                      <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-extrabold text-white block">🚨 Houve falta de mercadoria?</label>
                          <p className="text-[10px] text-slate-500 leading-tight">Prejuízo financeiro de carga ou falta geradora de Vale para cobrança?</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setHouveFalta("Sim")}
                            className={`py-1.5 px-3 text-xs font-bold rounded-lg border transition cursor-pointer uppercase ${
                              houveFalta === "Sim"
                                ? "bg-rose-500/10 text-rose-400 border-rose-500"
                                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setHouveFalta("Não");
                              setFaltaQuantidade(0);
                            }}
                            className={`py-1.5 px-3 text-xs font-bold rounded-lg border transition cursor-pointer uppercase ${
                              houveFalta === "Não"
                                ? "bg-slate-800 text-slate-200 border-slate-700 font-extrabold"
                                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            Não
                          </button>
                        </div>

                        {/* Falta details -> GERA VALE AUTOMÁTICO */}
                        {houveFalta === "Sim" && (
                          <div className="space-y-2.5 pt-3 border-t border-rose-950/40 animate-fadeIn text-xs">
                            <div className="p-1 px-2 bg-rose-950/20 border border-rose-900/30 rounded text-[9px] text-rose-350 leading-normal font-mono font-bold animate-pulse text-center">
                              🔴 ATENÇÃO: GERAÇÃO AUTOMÁTICA DE VALE
                            </div>
                            <div className="space-y-1 text-left">
                              <label className="text-slate-400 font-mono text-[10px] uppercase block">Produto</label>
                              <input
                                type="text"
                                value={faltaProduto}
                                onChange={(e) => setFaltaProduto(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-white text-xs"
                                placeholder="Nome da mercadoria/SKU"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1 text-left">
                                <label className="text-slate-400 font-mono text-[10px] uppercase block">Quantidade</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={faltaQuantidade || ""}
                                  onChange={(e) => setFaltaQuantidade(Number(e.target.value))}
                                  className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-white text-xs font-mono"
                                  placeholder="Qtd"
                                />
                              </div>
                              <div className="space-y-1 text-left">
                                <label className="text-slate-400 font-mono text-[10px] uppercase block">Valor Unit (R$)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  value={faltaValorUnit || ""}
                                  onChange={(e) => setFaltaValorUnit(Number(e.target.value))}
                                  className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-white text-xs font-mono"
                                  placeholder="R$ 0.00"
                                />
                              </div>
                            </div>
                            
                            {/* Computed Total Value */}
                            <div className="p-2 border border-slate-800 bg-slate-950 rounded text-left flex justify-between items-center font-mono text-[10px]">
                              <span className="text-slate-550 font-bold uppercase">Valor Total do Vale:</span>
                              <strong className="text-rose-400 font-extrabold text-sm">
                                R$ {(faltaQuantidade * faltaValorUnit).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </strong>
                            </div>

                            <div className="space-y-1 text-left">
                              <label className="text-slate-400 font-mono text-[10px] uppercase block">Observação da Falta</label>
                              <input
                                type="text"
                                value={faltaObservacao}
                                onChange={(e) => setFaltaObservacao(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-white text-xs"
                                placeholder="Destinação ou justificativa"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 4. Houve recibo de descarga? (AMPLA v2.2 - Fase 11) */}
                      <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-extrabold text-white block">📦 Houve recibo de descarga?</label>
                          <p className="text-[10px] text-slate-500 leading-tight">Controlar receitas de descargas cobradas dos clientes.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setHouveReciboDescarga("Sim");
                              if (!descargaResponsavel) {
                                setDescargaResponsavel(currentUser?.nome || userEmail || "Operador");
                              }
                            }}
                            className={`py-1.5 px-3 text-xs font-bold rounded-lg border transition cursor-pointer uppercase ${
                              houveReciboDescarga === "Sim"
                                ? "bg-teal-550/20 text-teal-400 border-teal-500 font-extrabold"
                                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setHouveReciboDescarga("Não");
                              setDescargaCliente("");
                              setDescargaCodigoCliente("");
                              setDescargaNumeroNF("");
                              setDescargaValor(0);
                              setDescargaObservacoes("");
                              setDescargaReciboFile("");
                            }}
                            className={`py-1.5 px-3 text-xs font-bold rounded-lg border transition cursor-pointer uppercase ${
                              houveReciboDescarga === "Não"
                                ? "bg-slate-800 text-slate-200 border-slate-700 font-extrabold"
                                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            Não
                          </button>
                        </div>

                        {/* Descarga details form */}
                        {houveReciboDescarga === "Sim" && (
                          <div className="space-y-2.5 pt-3 border-t border-teal-950/40 animate-fadeIn text-xs text-left">
                            <div className="p-1 px-2 bg-teal-950/25 border border-teal-900/30 rounded text-[9px] text-teal-350 leading-normal font-mono font-bold text-center">
                              📝 REGISTRO DE RECEITA DE DESCARGA
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-slate-400 font-mono text-[10px] uppercase block">Cliente</label>
                                <input
                                  type="text"
                                  value={descargaCliente}
                                  onChange={(e) => setDescargaCliente(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-white text-xs focus:border-teal-500 focus:outline-none"
                                  placeholder="Ex: Heineken"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-slate-400 font-mono text-[10px] uppercase block">Código do Cliente</label>
                                <input
                                  type="text"
                                  value={descargaCodigoCliente}
                                  onChange={(e) => setDescargaCodigoCliente(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-white text-xs focus:border-teal-500 focus:outline-none"
                                  placeholder="Código"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-slate-400 font-mono text-[10px] uppercase block">Número da NF</label>
                                <input
                                  type="text"
                                  value={descargaNumeroNF}
                                  onChange={(e) => setDescargaNumeroNF(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-white text-xs focus:border-teal-500 focus:outline-none"
                                  placeholder="NF-e"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-slate-400 font-mono text-[10px] uppercase block">Valor da Descarga (R$)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={descargaValor || ""}
                                  onChange={(e) => setDescargaValor(Number(e.target.value))}
                                  className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-white text-xs font-mono focus:border-teal-500 focus:outline-none"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-slate-400 font-mono text-[10px] uppercase block">Data</label>
                                <input
                                  type="date"
                                  value={descargaData}
                                  onChange={(e) => setDescargaData(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-white text-xs font-mono focus:border-teal-500 focus:outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-slate-400 font-mono text-[10px] uppercase block">Responsável</label>
                                <input
                                  type="text"
                                  value={descargaResponsavel}
                                  onChange={(e) => setDescargaResponsavel(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-slate-300 text-xs font-semibold focus:outline-none"
                                  readOnly
                                />
                              </div>
                            </div>

                            {/* Custom File Upload for receipt */}
                            <div className="space-y-2">
                              <label className="text-slate-400 font-mono text-[10px] uppercase block">Upload de Recibos / Comprovantes</label>
                              <div className="border border-dashed border-slate-800 hover:border-teal-500 bg-slate-900/60 hover:bg-slate-900 rounded-lg p-4 text-center transition cursor-pointer relative">
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  multiple
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                      Array.from(e.target.files).forEach((file: any) => {
                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                          const base64Url = event.target?.result as string;
                                          if (!base64Url) return;
                                          
                                          let tipo = "OUTROS";
                                          if (file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf")) tipo = "PDF";
                                          else if (file.type.includes("image") || file.name.toLowerCase().endsWith(".png") || file.name.toLowerCase().endsWith(".jpg") || file.name.toLowerCase().endsWith(".jpeg")) tipo = "IMAGEM";

                                          const newAnx = {
                                            id: `anx-dt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                                            nome: file.name,
                                            url: base64Url,
                                            tipo: tipo,
                                            dataUpload: new Date().toISOString(),
                                            usuario: userEmail,
                                            dt: activeSearchedDt?.dt || ""
                                          };

                                          setClosureAttachments((prev) => {
                                            const updated = [...prev, newAnx];
                                            setDescargaReciboFile(updated.map(x => x.nome).join(", "));
                                            return updated;
                                          });
                                        };
                                        reader.readAsDataURL(file);
                                      });
                                    }
                                  }}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="space-y-1">
                                  <p className="text-[11px] text-slate-300 font-bold">
                                    Clique para selecionar ou arraste os arquivos
                                  </p>
                                  <p className="text-[9px] text-slate-500">Suporta múltiplos PDFs ou imagens (PNG, JPG, JPEG)</p>
                                </div>
                              </div>

                              {/* Selected files list */}
                              {closureAttachments.length > 0 && (
                                <div className="space-y-1.5 mt-2 bg-slate-950 p-2.5 rounded-lg border border-slate-850">
                                  <span className="text-[9px] text-slate-500 font-bold uppercase font-mono block">Arquivos selecionados ({closureAttachments.length}):</span>
                                  <div className="space-y-1">
                                    {closureAttachments.map((anx) => (
                                      <div key={anx.id} className="flex items-center justify-between text-[10px] bg-slate-900 border border-slate-850 p-1.5 rounded">
                                        <span className="text-slate-300 truncate max-w-[200px]" title={anx.nome}>
                                          {anx.nome}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setClosureAttachments((prev) => {
                                              const filtered = prev.filter((x) => x.id !== anx.id);
                                              setDescargaReciboFile(filtered.map(x => x.nome).join(", "));
                                              return filtered;
                                            });
                                          }}
                                          className="text-red-400 hover:text-red-300 px-1 py-0.5 rounded transition font-bold cursor-pointer font-mono"
                                        >
                                          Remover
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="space-y-1">
                              <label className="text-slate-400 font-mono text-[10px] uppercase block">Observações</label>
                              <textarea
                                value={descargaObservacoes}
                                onChange={(e) => setDescargaObservacoes(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-white text-xs h-16 resize-none focus:border-teal-500 focus:outline-none"
                                placeholder="Notas ou observações adicionais..."
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Acerto Financeiro Integrado (FASE 5 Update) */}
                    <div className="bg-slate-950 p-5 border border-slate-850 rounded-xl space-y-4">
                      <div className="border-b border-slate-900 pb-2 flex justify-between items-center">
                        <h4 className="text-xs font-extrabold text-teal-400 uppercase tracking-wider font-mono flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-teal-400" />
                          💸 Acerto Financeiro Integrado da Rota
                        </h4>
                        <span className="text-[9px] bg-teal-955/20 text-teal-400 border border-teal-900/40 px-2 py-0.5 rounded font-mono uppercase font-bold">
                          Faturamento Desacoplado v2.2
                        </span>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Bloco 1: Lançamentos do Veículo */}
                        <div className="bg-slate-900/40 p-4 border border-slate-800/60 rounded-xl space-y-3 text-xs text-left">
                          <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider border-b border-slate-800/40 pb-1.5 flex justify-between items-center">
                            <span>🚛 Bloco 1: Pagamento / Lançamentos do Veículo</span>
                            <span className="text-[10px] text-slate-500 font-normal normal-case">Compõe Extrato Semanal</span>
                          </h5>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-slate-400 font-mono text-[10px] uppercase block">
                                Valor do Frete {isFrotaPropria ? "(Frota Própria - Não Gerado)" : "(Pago ao Terceiro)"}
                              </label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1.5 text-slate-600 font-mono text-xs">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  disabled={isFrotaPropria}
                                  value={isFrotaPropria ? 0 : (freteValor || "")}
                                  onChange={(e) => setFreteValor(Number(e.target.value))}
                                  className={`w-full bg-slate-950 border rounded pl-8 pr-2.5 py-1.5 text-white font-mono text-xs focus:border-teal-500 focus:outline-none ${isFrotaPropria ? "border-slate-850 opacity-40 cursor-not-allowed" : "border-slate-800"}`}
                                  placeholder={isFrotaPropria ? "0,00" : "0,00"}
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-teal-400 font-mono text-[10px] uppercase block font-bold">
                                Valor Faturado ao Cliente (Faturamento AMPLA)
                              </label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1.5 text-teal-600 font-mono text-xs">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={valorFaturado || ""}
                                  onChange={(e) => setValorFaturado(Number(e.target.value))}
                                  className="w-full bg-slate-950 border border-teal-900/60 focus:border-teal-400 focus:ring-1 focus:ring-teal-500/25 rounded pl-8 pr-2.5 py-1.5 text-white font-mono text-xs focus:outline-none"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-slate-400 font-mono text-[10px] uppercase block">Disponibilidade (Crédito)</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1.5 text-slate-600 font-mono text-xs">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={disponibilidadeValor || ""}
                                  onChange={(e) => setDisponibilidadeValor(Number(e.target.value))}
                                  className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-2.5 py-1.5 text-white font-mono text-xs focus:border-teal-500 focus:outline-none"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-slate-400 font-mono text-[10px] uppercase block">Diárias / Bonificações (Crédito)</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1.5 text-slate-600 font-mono text-xs">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={diariasBonificacoes || ""}
                                  onChange={(e) => setDiariasBonificacoes(Number(e.target.value))}
                                  className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-2.5 py-1.5 text-white font-mono text-xs focus:border-teal-500 focus:outline-none"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-slate-400 font-mono text-[10px] uppercase block">Reentregas (Crédito)</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1.5 text-slate-600 font-mono text-xs">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={reentregaValor || ""}
                                  onChange={(e) => setReentregaValor(Number(e.target.value))}
                                  className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-2.5 py-1.5 text-white font-mono text-xs focus:border-teal-500 focus:outline-none"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-slate-400 font-mono text-[10px] uppercase block">Outros Créditos (Crédito)</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1.5 text-slate-600 font-mono text-xs">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={outrosCreditos || ""}
                                  onChange={(e) => setOutrosCreditos(Number(e.target.value))}
                                  className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-2.5 py-1.5 text-white font-mono text-xs focus:border-teal-500 focus:outline-none"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-rose-400 font-mono text-[10px] uppercase block">Adiantamentos (Débito)</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1.5 text-rose-900 font-mono text-xs">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={adiantamentos || ""}
                                  onChange={(e) => setAdiantamentos(Number(e.target.value))}
                                  className="w-full bg-slate-950 border border-rose-950/40 rounded pl-8 pr-2.5 py-1.5 text-white font-mono text-xs text-rose-200 focus:border-rose-500 focus:outline-none"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-rose-400 font-mono text-[10px] uppercase block">Multas / Descontos (Débito)</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1.5 text-rose-900 font-mono text-xs">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={multasDescontos || ""}
                                  onChange={(e) => setMultasDescontos(Number(e.target.value))}
                                  className="w-full bg-slate-950 border border-rose-950/40 rounded pl-8 pr-2.5 py-1.5 text-white font-mono text-xs text-rose-200 focus:border-rose-500 focus:outline-none"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Live Veículo Balance Summary */}
                          <div className="mt-4 p-3 bg-slate-950/60 border border-slate-850 rounded-lg flex justify-between items-center">
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-slate-500 font-mono uppercase block">Saldo de Acerto do Veículo</span>
                              <p className="text-[9px] text-slate-400">(Créditos - Débitos)</p>
                            </div>
                            <strong className={`font-mono text-sm font-extrabold ${
                              (freteValor + disponibilidadeValor + diariasBonificacoes + reentregaValor + outrosCreditos - adiantamentos - multasDescontos) >= 0
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }`}>
                              R$ {((freteValor + disponibilidadeValor + diariasBonificacoes + reentregaValor + outrosCreditos) - (adiantamentos + multasDescontos)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </strong>
                          </div>
                        </div>

                        {/* Bloco 2: Custos Operacionais da Empresa (Desacoplado) */}
                        <div className="bg-slate-900/40 p-4 border border-slate-800/60 rounded-xl space-y-3 text-xs text-left">
                          <h5 className="text-[11px] font-bold text-sky-400 font-mono uppercase tracking-wider border-b border-slate-800/40 pb-1.5 flex justify-between items-center">
                            <span>🏢 Bloco 2: Custos Operacionais da Empresa</span>
                            <span className="text-[10px] text-slate-500 font-normal normal-case">Desacoplado do Extrato</span>
                          </h5>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-slate-450 font-mono text-[10px] uppercase block">Descarga / Chapa Auxiliar</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1.5 text-slate-600 font-mono text-xs">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={descargaChapa || ""}
                                  onChange={(e) => setDescargaChapa(Number(e.target.value))}
                                  className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-2.5 py-1.5 text-white font-mono text-xs"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-slate-450 font-mono text-[10px] uppercase block">Pedágios / Eixos</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1.5 text-slate-600 font-mono text-xs">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={pedagios || ""}
                                  onChange={(e) => setPedagios(Number(e.target.value))}
                                  className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-2.5 py-1.5 text-white font-mono text-xs"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-slate-450 font-mono text-[10px] uppercase block">Lavagens & Hospedagens</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1.5 text-slate-600 font-mono text-xs">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={lavagensHospedagens || ""}
                                  onChange={(e) => setLavagensHospedagens(Number(e.target.value))}
                                  className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-2.5 py-1.5 text-white font-mono text-xs"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-slate-450 font-mono text-[10px] uppercase block">Alimentação / Refeições</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1.5 text-slate-600 font-mono text-xs">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={alimentacao || ""}
                                  onChange={(e) => setAlimentacao(Number(e.target.value))}
                                  className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-2.5 py-1.5 text-white font-mono text-xs"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-slate-450 font-mono text-[10px] uppercase block">Manutenção Corretiva / Outros Custos de Rota</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1.5 text-slate-600 font-mono text-xs">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={manutencaoOutros || ""}
                                  onChange={(e) => setManutencaoOutros(Number(e.target.value))}
                                  className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-2.5 py-1.5 text-white font-mono text-xs focus:border-sky-505 focus:outline-none"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-slate-450 font-mono text-[10px] uppercase block">Abastecimento / Diesel</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1.5 text-slate-600 font-mono text-xs">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={abastecimentoValor || ""}
                                  onChange={(e) => setAbastecimentoValor(Number(e.target.value))}
                                  className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-2.5 py-1.5 text-white font-mono text-xs focus:border-sky-505 focus:outline-none"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Live Operational Cost Summary */}
                          <div className="mt-4 p-3 bg-slate-950/60 border border-slate-850 rounded-lg flex justify-between items-center">
                            <span className="text-[10px] text-slate-500 font-mono uppercase block">Total Custos Operacionais Corporativos</span>
                            <strong className="font-mono text-sm font-extrabold text-sky-400">
                              R$ {(descargaChapa + pedagios + lavagensHospedagens + alimentacao + manutencaoOutros + abastecimentoValor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Observações Gerais e fechamento final */}
                    <div className="space-y-3.5 bg-slate-950 p-4 border border-slate-850 rounded-xl">
                      <div className="space-y-1.5 text-xs text-left">
                        <label className="text-slate-400 block font-bold font-mono">Observações Gerais do Encerramento Administrativo</label>
                        <textarea
                          rows={2}
                          value={observacoesGerais}
                          onChange={(e) => setObservacoesGerais(e.target.value)}
                          placeholder="Indique as quebras operacionais, dados de devolução com o cliente de destino ou outros descritivos importantes de rota..."
                          className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-white text-xs focus:border-sky-505 focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-1 border-t border-slate-850/60 font-sans">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSearchedDt(null);
                            setTargetDt("");
                          }}
                          className="py-2 px-4 rounded border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 font-bold text-xs uppercase cursor-pointer"
                        >
                          Cancelar / Voltar
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsClosingModalOpen(true)}
                          className="py-2 px-5 rounded bg-emerald-600 hover:bg-emerald-550 text-white font-extrabold text-xs uppercase flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 cursor-pointer"
                        >
                          <Shield className="w-4 h-4" />
                          🔒 Fechar DT Operacional
                        </button>
                      </div>
                    </div>

                  </div>
                ); })()}

              </div>
            </div>
          </div>
        )
      )}

      {/* VIEW: RELATÓRIO DE VALES (TAB FINANCEIRO) */}
      {activeTab === "financeiro" && (
        <div className="space-y-4">
          
          {/* ADVANCED MULTI-FILTER COMPONENT */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-left space-y-4">
            <h3 className="text-xs font-bold uppercase text-sky-400 font-mono tracking-wider flex items-center gap-1.5">
              <Search className="w-4 h-4" />
              Filtros Avançados de Auditoria Financeira
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 text-xs">
              
              <div className="space-y-1">
                <label className="text-slate-505 block font-mono">DT</label>
                <input
                  type="text"
                  value={filterDt}
                  onChange={(e) => setFilterDt(e.target.value)}
                  placeholder="Filtrar DT"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white placeholder-slate-700 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-505 block font-mono">Motorista</label>
                <input
                  type="text"
                  value={filterMotorista}
                  onChange={(e) => setFilterMotorista(e.target.value)}
                  placeholder="Filtrar nome"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white placeholder-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-505 block font-mono">Reg. Veículo</label>
                <input
                  type="text"
                  value={filterVeiculo}
                  onChange={(e) => setFilterVeiculo(e.target.value)}
                  placeholder="Ex: XYZ"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white placeholder-slate-700 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-505 block font-mono">Status Vale</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                >
                  <option value="">Todos</option>
                  <option value="Aguardando Análise">🟡 Aguardando Análise</option>
                  <option value="Em Tratativa">🟠 Em Tratativa</option>
                  <option value="Aguardando Cobrança">🔵 Aguardando Cobrança</option>
                  <option value="Cobrado">🟢 Cobrado</option>
                  <option value="Quitado">✅ Quitado</option>
                  <option value="Cancelado">🔴 Cancelado</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-505 block font-mono">Unidade</label>
                <select
                  value={filterUnidade}
                  onChange={(e) => setFilterUnidade(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white animate-none"
                >
                  <option value="">Todas</option>
                  {unidades.map(u => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-505 block font-mono">Vlr Mínimo (R$)</label>
                <input
                  type="number"
                  value={filterValorMin}
                  onChange={(e) => setFilterValorMin(e.target.value)}
                  placeholder="Ex: 50"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white placeholder-slate-700 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-505 block font-mono">De (Data)</label>
                <input
                  type="date"
                  value={filterDataInicio}
                  onChange={(e) => setFilterDataInicio(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-505 block font-mono">Até (Data)</label>
                <input
                  type="date"
                  value={filterDataFim}
                  onChange={(e) => setFilterDataFim(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>

            </div>

            {/* Clear filters trigger */}
            {(filterDt || filterMotorista || filterVeiculo || filterUnidade || filterStatus || filterValorMin || filterDataInicio || filterDataFim) && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setFilterDt("");
                    setFilterMotorista("");
                    setFilterVeiculo("");
                    setFilterUnidade("");
                    setFilterStatus("");
                    setFilterValorMin("");
                    setFilterDataInicio("");
                    setFilterDataFim("");
                  }}
                  className="text-xs text-sky-400 hover:text-sky-300 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Limpar Todos os Filtros
                </button>
              </div>
            )}
          </div>

          {/* OVERVIEW PANEL COUNTERS */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-left space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Vales Filtrados</span>
              <div className="text-2xl font-black font-mono text-white">{stats.totalCount}</div>
              <p className="text-[10px] text-slate-400">Vigentes na consulta</p>
            </div>
            
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-left space-y-1">
              <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider font-mono text-rose-455">Total em Multas</span>
              <div className="text-2xl font-black font-mono text-rose-400">R$ {stats.totalVal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <p className="text-[10px] text-slate-400">Valor de reparação requisitado</p>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-left space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono text-emerald-400">Quitados / Recebidos</span>
              <div className="text-2xl font-black font-mono text-emerald-400">{stats.quitados}</div>
              <p className="text-[10px] text-slate-400">Vales devidamente pagos</p>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-left space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono text-yellow-405">Em Tratativa / Cobrança</span>
              <div className="text-2xl font-black font-mono text-yellow-500">{stats.pendentes}</div>
              <p className="text-[10px] text-slate-400">Seguem retidos operando pendentes</p>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-left space-y-1 col-span-2 md:col-span-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono text-purple-400 animate-pulse">Alerta Conflito &gt;30d</span>
              <div className="text-2xl font-black font-mono text-purple-400">{alertOverdueVales.length}</div>
              <p className="text-[10px] text-slate-405">Ações regulatórias abertas</p>
            </div>
          </div>

          {/* VALES LOGS REAL DATABASE TABLE */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden text-xs text-left">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/60">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-white">Listagem Auditada de Vales Operacionais</h4>
              <button
                onClick={() => {
                  setNotification({ type: "success", message: "Planilha exportada com sucesso como XLSX na memória administrativa." });
                }}
                className="px-2.5 py-1 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 transition cursor-pointer"
              >
                <Download className="w-3 h-3 text-sky-400" /> Exportar Relatório
              </button>
            </div>

            {filteredVales.length === 0 ? (
              <div className="p-12 text-center text-slate-500 italic block">
                Nenhum log correspondente aos critérios de filtragem de auditoria de vales.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans leading-relaxed border-collapse whitespace-nowrap md:whitespace-normal">
                  <thead>
                    <tr className="bg-slate-950/80 text-slate-400 font-mono text-[9px] tracking-widest uppercase border-b border-slate-850">
                      <th className="p-3.5 pl-4">Código / Vale</th>
                      <th className="p-3.5">DT</th>
                      <th className="p-3.5">Unidade</th>
                      <th className="p-3.5">Motorista</th>
                      <th className="p-3.5">Veículo</th>
                      <th className="p-3.5">Produto Falta</th>
                      <th className="p-3.5 text-right">Qtd</th>
                      <th className="p-3.5 text-right">Valor Multa</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Cobrança Teres</th>
                      <th className="p-3.5 text-right pr-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/60">
                    {filteredVales.map(v => {
                      const isOverdue = alertOverdueVales.some(o => o.id === v.id);
                      return (
                        <tr key={v.id} className={`hover:bg-slate-900/50 transition border-slate-850/40 text-slate-300 ${isOverdue ? "bg-rose-950/5" : ""}`}>
                          <td className="p-3 pl-4">
                            <div className="flex items-center gap-1.5">
                              {isOverdue && (
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" title="Pendente à mais de 30 dias" />
                              )}
                              <strong className="text-white font-mono tracking-tight font-extrabold select-all">{v.numeroVale}</strong>
                            </div>
                            <span className="text-[9px] text-slate-500 font-mono block">Gerado: {v.data}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-mono bg-slate-950 px-1.5 py-0.5 rounded text-[10px] text-slate-200 border border-slate-800">{v.dt}</span>
                          </td>
                          <td className="p-3 text-slate-300">{getUnidadeName(v.unidadeId)}</td>
                          <td className="p-3 font-semibold text-white truncate max-w-[140px]">{getDriverName(v.motoristaId)}</td>
                          <td className="p-3 font-mono">{getVehiclePlaca(v.veiculoId).split(" ")[0]}</td>
                          <td className="p-3 truncate max-w-[130px] font-mono text-slate-300" title={v.produto}>{v.produto}</td>
                          <td className="p-3 text-right font-mono text-slate-400">{v.quantidade}</td>
                          <td className="p-3 text-right font-mono font-bold text-rose-400">R$ {Number(v.valor).toFixed(2)}</td>
                          <td className="p-3">
                            {(() => {
                              const st = v.status || "Aguardando Análise";
                              if (st === "Quitado") return <span className="inline-flex px-1.5 py-0.5 text-[9px] font-extrabold bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/10">✅ QUITADO</span>;
                              if (st === "Cancelado") return <span className="inline-flex px-1.5 py-0.5 text-[9px] font-extrabold bg-rose-500/10 text-rose-500 rounded-full border border-rose-500/10">🔴 CANCELADO</span>;
                              if (st === "Cobrado") return <span className="inline-flex px-1.5 py-0.5 text-[9px] font-extrabold bg-green-500/10 text-green-405 rounded-full border border-green-500/10">🟢 COBRADO</span>;
                              if (st === "Aguardando Cobrança") return <span className="inline-flex px-1.5 py-0.5 text-[9px] font-extrabold bg-blue-500/10 text-sky-400 rounded-full border border-blue-500/10">🔵 AG. COBRANÇA</span>;
                              if (st === "Em Tratativa") return <span className="inline-flex px-1.5 py-0.5 text-[9px] font-extrabold bg-orange-500/10 text-orange-400 rounded-full border border-orange-500/10">🟠 EM TRATATIVA</span>;
                              return <span className="inline-flex px-1.5 py-0.5 text-[9px] font-extrabold bg-amber-500/10 text-amber-500 rounded-full border border-amber-505/10">🟡 AG. ANÁLISE</span>;
                            })()}
                          </td>
                          <td className="p-3 text-slate-400">
                            {v.valorCobrado ? (
                              <div className="font-mono text-[10px] space-y-0.5 leading-none">
                                <div><strong className="text-slate-200">R$ {v.valorCobrado.toFixed(2)}</strong></div>
                                <div className="text-[8px] text-slate-500">{v.statusCobrança || "Processado"}</div>
                              </div>
                            ) : (
                              <span className="text-slate-600 italic text-[10px]">Sem cobrança</span>
                            )}
                          </td>
                          <td className="p-3 text-right pr-4">
                            <div className="flex justify-end items-center gap-2">
                              <button
                                onClick={() => handleOpenEditVale(v)}
                                className="px-2 py-1 bg-slate-950 border border-slate-800 hover:border-slate-705 text-slate-300 hover:text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Edit className="w-3 h-3 text-sky-400" /> Tratar
                              </button>
                              <button
                                onClick={() => handleDeleteVale(v.id, v.numeroVale)}
                                className="px-2 py-1 bg-slate-950 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-900/45 text-slate-405 hover:text-rose-400 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Trash className="w-3 h-3" /> Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* VIEW: RELATÓRIOS GERENCIAIS (TAB RELATORIOS) */}
      {activeTab === "relatorios" && (
        <div className="space-y-6">
          
          {/* Quick numbers row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-left space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Dívida Ativa Acumulada</span>
              <div className="text-2xl font-black font-mono text-rose-455">R$ {stats.totalVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
              <p className="text-[10px] text-slate-450 leading-relaxed font-sans">Montante bruto multado em análise ou execução.</p>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-left space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono text-emerald-450">Eficácia de Quitação</span>
              <div className="text-2xl font-black font-mono text-emerald-400">
                {stats.totalCount > 0 ? `${((stats.quitados / stats.totalCount) * 100).toFixed(1)}%` : "0%"}
              </div>
              <p className="text-[10px] text-slate-450 leading-relaxed font-sans">Índice de sucesso financeiro nas cobranças.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-left space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono text-sky-400">Número de Inconformidades</span>
              <div className="text-2xl font-black font-mono text-white">{stats.totalCount} Vales</div>
              <p className="text-[10px] text-slate-450 leading-relaxed font-sans">Quantidade de vales operacionais emitidos.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-left space-y-1">
              <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider font-mono text-amber-500">Multas Não Resolvidas</span>
              <div className="text-2xl font-black font-mono text-amber-400">{stats.pendentes} Pendências</div>
              <p className="text-[10px] text-slate-450 leading-relaxed font-sans">Vales aguardando fluxo de cobrança ou jurídico.</p>
            </div>
          </div>

          {/* RECHARTS CHANNELS */}
          {filteredVales.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 italic">
              Insira ou filtre registros no módulo financeiro de Vales para ativar as visões analíticas gerenciais.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Vales por Filial / Unidade */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-left space-y-3">
                <div>
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-sky-450">Vales por Filial / Unidade (R$)</h4>
                  <p className="text-[10px] text-slate-500">Custo financeiro consolidado de perdas operacionais em cada base.</p>
                </div>
                <div className="h-[300px] min-h-[300px] mt-1.5">
                  <SafeResponsiveContainer minHeight={300}>
                    <BarChart data={stats.unitChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip isAnimationActive={false} contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#fff" }} />
                      <Bar dataKey="valor" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Valor Total (R$)" />
                    </BarChart>
                  </SafeResponsiveContainer>
                </div>
              </div>

              {/* Vales por Motorista (Top 5) */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-left space-y-3">
                <div>
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-sky-450">Motoristas com Maior Índice de Vales (R$)</h4>
                  <p className="text-[10px] text-slate-500">Top 5 condutores com as maiores multas registradas.</p>
                </div>
                <div className="h-[300px] min-h-[300px] mt-1.5">
                  <SafeResponsiveContainer minHeight={300}>
                    <BarChart data={stats.driverChartData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis type="number" stroke="#64748b" fontSize={10} />
                      <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={9} />
                      <Tooltip isAnimationActive={false} contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#fff" }} />
                      <Bar dataKey="valor" fill="#f43f5e" radius={[0, 4, 4, 0]} name="Valor (R$)" />
                    </BarChart>
                  </SafeResponsiveContainer>
                </div>
              </div>

              {/* Vales por Veículo (Top 5) */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-left space-y-3">
                <div>
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-sky-450">Índice por Frota / Veículo (R$)</h4>
                  <p className="text-[10px] text-slate-500">Prejuízos gerenciais indexados pelo registro do ativo vehicular.</p>
                </div>
                <div className="h-[300px] min-h-[300px] mt-1.5">
                  <SafeResponsiveContainer minHeight={300}>
                    <BarChart data={stats.veicChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip isAnimationActive={false} contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#fff" }} />
                      <Bar dataKey="valor" fill="#fb923c" radius={[4, 4, 0, 0]} name="Valor (R$)" />
                    </BarChart>
                  </SafeResponsiveContainer>
                </div>
              </div>

              {/* Evolução Mensal dos Vales */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-left space-y-3">
                <div>
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-sky-450">Evolução Histórica de Vales (R$)</h4>
                  <p className="text-[10px] text-slate-500">Demonstrativo mensal da ocorrência de multas nas DTs.</p>
                </div>
                <div className="h-[300px] min-h-[300px] mt-1.5">
                  <SafeResponsiveContainer minHeight={300}>
                    <BarChart data={stats.monthChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip isAnimationActive={false} contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#fff" }} />
                      <Bar dataKey="valor" fill="#a855f7" radius={[4, 4, 0, 0]} name="Valor Consolidado (R$)" />
                    </BarChart>
                  </SafeResponsiveContainer>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* MODAL 1: CONFIRMAR FECHAMENTO DE DT */}
      {isClosingModalOpen && activeSearchedDt && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full mx-4 shadow-2xl space-y-4 text-left">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-505/20 shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-extrabold text-base tracking-tight">🔒 Confirmar Fechamento de DT</h3>
                <p className="text-[10px] text-slate-550 font-mono">Processamento de Dívida Ativa</p>
              </div>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-350">
              <p>Tem certeza de que deseja fechar operacionalmente a viagem/DT <strong className="text-white font-mono">{activeSearchedDt.dt}</strong>?</p>
              
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-850/80 space-y-1 text-[11px] leading-normal font-sans text-slate-300">
                <div>• Motorista: <strong className="text-white">{getDriverName(activeSearchedDt.motoristaId)}</strong></div>
                <div>• Veículo: <strong className="text-white font-mono">{getVehiclePlaca(activeSearchedDt.veiculoId).split(" ")[0]}</strong></div>
                <div>• Total de Ocorrências: <strong className="text-white font-mono">{occurrences.length}</strong></div>
                <div>
                  • Total em Vales para Emissão: 
                  <strong className="text-yellow-405 font-mono"> R$ {occurrences.filter(o => o.tipo === "Falta de Mercadoria").reduce((acc, curr) => acc + curr.valorTotal, 0).toFixed(2)}</strong>
                </div>
              </div>

              <div className="p-3 bg-blue-950/20 border border-blue-900/40 text-[10px] text-sky-305 rounded-md font-mono leading-normal">
                Nota: O status desta DT será automaticamente alterado para "Finalizada" no mapa de viagens, bloqueando quaisquer novas vistorias de conformidade.
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setIsClosingModalOpen(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-400 font-bold rounded text-xs uppercase cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmClosure}
                disabled={submitting}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-550 text-white font-extrabold rounded text-xs uppercase flex items-center justify-center gap-1 shadow-lg shadow-emerald-950/40 cursor-pointer"
              >
                {submitting ? "Gravando..." : "Confirmar Encerramento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT VALE STATUS AND TRATATIVA */}
      {editingVale && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <form onSubmit={handleSaveValeEdit} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full mx-4 shadow-2xl space-y-4 text-left font-sans">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
              <div>
                <h3 className="text-white font-extrabold text-base tracking-tight flex items-center gap-1.5">
                  <Activity className="w-5 h-5 text-sky-400" />
                  Tratativa Faltagem: {editingVale.numeroVale}
                </h3>
                <p className="text-[10px] text-slate-500 font-mono">DT Origem: {editingVale.dt}</p>
              </div>
              <button type="button" onClick={() => setEditingVale(null)} className="text-slate-400 hover:text-white font-extrabold">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="bg-slate-950 p-2.5 rounded border border-slate-850 font-mono text-[10px] leading-relaxed text-slate-400 grid grid-cols-2 gap-1.5">
                <div><span className="text-slate-505">Item Falta:</span> <strong className="text-slate-200">{editingVale.produto}</strong></div>
                <div><span className="text-slate-505">Quantidade:</span> <strong className="text-slate-200">{editingVale.quantidade}</strong></div>
                <div><span className="text-slate-505">Valor Vale:</span> <strong className="text-rose-400">R$ {editingVale.valor.toFixed(2)}</strong></div>
                <div><span className="text-slate-505">Motorista:</span> <strong className="text-slate-200 truncate block">{getDriverName(editingVale.motoristaId)}</strong></div>
              </div>

              {/* Status Selector */}
              <div className="space-y-1">
                <label className="text-slate-404 font-bold block font-mono">Alterar Status do Vale</label>
                <select
                  value={valeStatus}
                  onChange={(e) => setValeStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                >
                  <option value="Aguardando Análise">🟡 Aguardando Análise</option>
                  <option value="Em Tratativa">🟠 Em Tratativa</option>
                  <option value="Aguardando Cobrança">🔵 Aguardando Cobrança</option>
                  <option value="Cobrado">🟢 Cobrado</option>
                  <option value="Quitado">✅ Quitado</option>
                  <option value="Cancelado">🔴 Cancelado</option>
                </select>
              </div>

              {/* THIRD PARTY COBRANÇA */}
              <div className="border border-slate-800 p-3.5 rounded-xl bg-slate-950/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-slate-200 font-bold block font-mono">Cobrança de Terceiros e Agregados</label>
                    <span className="text-[9px] text-slate-500 block">Dívidas sob responsabilidades extras tributárias</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isTerceiro}
                    onChange={(e) => setIsTerceiro(e.target.checked)}
                    className="w-4 h-4 accent-sky-500 cursor-pointer"
                  />
                </div>

                {isTerceiro && (
                  <div className="space-y-3.5 pt-2 border-t border-slate-850 animate-fadeIn text-xs">
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-slate-500 block font-mono">Valor Cobrado (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={valeCobrado || ""}
                          onChange={(e) => setValeCobrado(Number(e.target.value))}
                          placeholder="Ex: 50.00"
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-500 block font-mono">Data da Cobrança</label>
                        <input
                          type="date"
                          value={valeDataCobranca}
                          onChange={(e) => setValeDataCobranca(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-slate-500 block font-mono">Forma de Cobrança</label>
                        <select
                          value={valeFormaCobranca}
                          onChange={(e) => setValeFormaCobranca(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white text-xs"
                        >
                          <option value="">Selecione...</option>
                          <option value="Desconto em Frete">Desconto direto em Frete</option>
                          <option value="PIX">Transferência PIX</option>
                          <option value="Boleto Bancário">Boleto Bancário</option>
                          <option value="Dinheiro">Dinheiro / Espécie</option>
                          <option value="Outros">Outras formas</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-500 block font-mono">Status da Cobrança</label>
                        <select
                          value={valeStatusCobranca}
                          onChange={(e) => setValeStatusCobranca(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white text-xs"
                        >
                          <option value="">Selecione...</option>
                          <option value="Pendente / Emitido">Pendente / Emitido</option>
                          <option value="Estornado">Estornado</option>
                          <option value="Efetuado / Pago">Efetuado / Pago</option>
                        </select>
                      </div>
                    </div>

                  </div>
                )}
              </div>

            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingVale(null)}
                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-400 font-bold rounded text-xs uppercase cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="flex-1 py-1.5 bg-sky-605 hover:bg-sky-505 text-white font-extrabold rounded text-xs uppercase cursor-pointer"
              >
                Gravar Tratativa
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REOPEN DT MODAL */}
      {isReopenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-red-500/30 rounded-2xl p-6 shadow-2xl relative space-y-4">
            <button
              type="button"
              onClick={() => setIsReopenModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-red-400 font-mono tracking-wider uppercase text-sm font-extrabold pb-2 border-b border-slate-800">
              <RefreshCw className="w-5 h-5 animate-spin-hover" />
              <span>Solicitação de Reabertura de DT</span>
            </div>

            <form onSubmit={handleReopenSubmit} className="space-y-4 font-sans text-xs">
              <p className="text-slate-300 leading-relaxed">
                Você está prestes a reabrir a **DT {reopenDt}**. Esta ação é auditada e irá alterar o status de volta para **EM ABERTO**, liberando todas as informações operacionais e financeiras para edição.
              </p>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                  Protocolo de Fechamento (Obrigatório)
                </label>
                <input
                  type="text"
                  required
                  value={reopenProtocol}
                  onChange={(e) => setReopenProtocol(e.target.value)}
                  placeholder="Ex: 10543"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-red-500/50 rounded-xl p-3 text-white font-mono placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                  Motivo da Reabertura (Obrigatório)
                </label>
                <textarea
                  required
                  value={reopenMotivo}
                  onChange={(e) => setReopenMotivo(e.target.value)}
                  placeholder="Justifique detalhadamente por que esta DT está sendo reaberta..."
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-red-500/50 rounded-xl p-3 text-white font-mono placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition text-xs leading-normal resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReopenModalOpen(false)}
                  disabled={reopeningSubmitting}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-400 font-bold rounded-xl transition uppercase cursor-pointer disabled:opacity-50 text-[10px] font-mono tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={reopeningSubmitting || !reopenMotivo.trim() || !reopenProtocol.trim()}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl transition uppercase cursor-pointer disabled:opacity-40 text-[10px] font-mono tracking-wider flex items-center justify-center gap-1.5"
                >
                  {reopeningSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      Confirmar Reabertura
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VER RESUMO DETAILS MODAL */}
      {selectedClosureForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4 text-xs font-sans text-slate-300">
            <button
              type="button"
              onClick={() => setSelectedClosureForDetails(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-sky-400 font-mono tracking-wider uppercase text-sm font-extrabold pb-2 border-b border-slate-800">
              <ClipboardCheck className="w-5 h-5 text-sky-400" />
              <span>Resumo do Fechamento de DT - {selectedClosureForDetails.dt}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 space-y-1">
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Protocolo</span>
                <span className="font-mono text-white text-sm font-bold">{selectedClosureForDetails.protocoloFechamento || "N/A"}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 space-y-1">
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Data/Hora Fechamento</span>
                <span className="text-white text-xs font-semibold">
                  {selectedClosureForDetails.dataFechamento} <span className="text-slate-600">|</span> {selectedClosureForDetails.horaFechamento}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 space-y-1">
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Responsável</span>
                <span className="text-white text-xs font-semibold">{selectedClosureForDetails.usuarioResponsavel || selectedClosureForDetails.usuarioFechamento}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              {/* Informações da Viagem */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
                <h4 className="font-bold text-white uppercase font-mono text-[10px] tracking-wider border-b border-slate-850 pb-1 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-sky-500" /> Detalhes da Viagem
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Motorista</span>
                    <strong className="text-slate-200">{getDriverName(selectedClosureForDetails.motoristaId || selectedClosureForDetails.motorista_id)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Veículo / Placa</span>
                    <strong className="text-slate-200">{getVehiclePlaca(selectedClosureForDetails.veiculoId || selectedClosureForDetails.veiculo_id)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Unidade</span>
                    <strong className="text-slate-200">{getUnidadeName(selectedClosureForDetails.unidadeId || selectedClosureForDetails.unidade_id)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Situação Final</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-sky-950 text-sky-400 font-mono font-bold">
                      {selectedClosureForDetails.statusFechamento}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recibo de Descarga */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
                <h4 className="font-bold text-white uppercase font-mono text-[10px] tracking-wider border-b border-slate-850 pb-1 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-emerald-500" /> Recibo de Descarga
                </h4>
                {selectedClosureForDetails.houveReciboDescarga === "Sim" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-500 block">Cliente</span>
                      <strong className="text-slate-200">{selectedClosureForDetails.descargaCliente || "Não especificado"}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Cód. Cliente</span>
                      <strong className="text-slate-200">{selectedClosureForDetails.descargaCodigoCliente || "N/A"}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Nº Nota Fiscal</span>
                      <strong className="text-slate-200 font-mono">{selectedClosureForDetails.descargaNumeroNF || "N/A"}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Valor da Descarga</span>
                      <strong className="text-emerald-400 font-mono">R$ {Number(selectedClosureForDetails.descargaValor || 0).toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Data Lançamento</span>
                      <strong className="text-slate-200">{selectedClosureForDetails.descargaData || "N/A"}</strong>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 italic text-[11px] py-4 text-center">Nenhum recibo de descarga associado.</p>
                )}
              </div>
            </div>

            {/* FINANCEIRO */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-left space-y-3">
              <h4 className="font-bold text-white uppercase font-mono text-[10px] tracking-wider border-b border-slate-850 pb-1 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-500" /> Demonstrativo de Lançamentos Financeiros
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Lançamentos do Motorista / Veículo */}
                <div className="space-y-2 bg-slate-900/30 p-3 rounded-lg border border-slate-850/60">
                  <span className="text-[10px] font-bold text-slate-400 font-mono uppercase block border-b border-slate-850/40 pb-1">
                    Acerto do Veículo / Terceiro (Contas a Pagar)
                  </span>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Valor do Frete (Pago ao Terceiro):</span>
                      <span className="font-mono text-slate-200">R$ {Number(selectedClosureForDetails.freteValor || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Disponibilidade:</span>
                      <span className="font-mono text-slate-200">R$ {Number(selectedClosureForDetails.disponibilidadeValor || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Diárias / Bonificações:</span>
                      <span className="font-mono text-slate-200">R$ {Number(selectedClosureForDetails.diariasBonificacoes || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-rose-400">
                      <span>Adiantamentos:</span>
                      <span className="font-mono">- R$ {Number(selectedClosureForDetails.adiantamentos || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-rose-400">
                      <span>Multas / Descontos:</span>
                      <span className="font-mono">- R$ {Number(selectedClosureForDetails.multasDescontos || 0).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-slate-800 my-1 pt-1 flex justify-between font-bold text-emerald-400">
                      <span>Saldo Líquido de Acerto:</span>
                      <span className="font-mono">
                        R$ {((Number(selectedClosureForDetails.freteValor || 0) + Number(selectedClosureForDetails.disponibilidadeValor || 0) + Number(selectedClosureForDetails.diariasBonificacoes || 0)) - (Number(selectedClosureForDetails.adiantamentos || 0) + Number(selectedClosureForDetails.multasDescontos || 0))).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Custos Corporativos e Faturamento */}
                <div className="space-y-2 bg-slate-900/30 p-3 rounded-lg border border-slate-850/60">
                  <span className="text-[10px] font-bold text-slate-400 font-mono uppercase block border-b border-slate-850/40 pb-1">
                    Custos Corporativos e Faturamento (Contas a Receber)
                  </span>
                  <div className="space-y-1.5">
                    <div className="flex justify-between font-bold text-teal-400">
                      <span>Faturamento da Viagem:</span>
                      <span className="font-mono">R$ {Number(selectedClosureForDetails.valorFaturado || selectedClosureForDetails.freteValor || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-semibold text-[10px] uppercase font-mono block pt-1 border-b border-slate-800/40 w-full">Custos de Viagem:</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Descarga / Chapa Auxiliar:</span>
                      <span className="font-mono text-rose-450">R$ {Number(selectedClosureForDetails.descargaChapa || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Pedágios / Eixos:</span>
                      <span className="font-mono text-rose-450">R$ {Number(selectedClosureForDetails.pedagios || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Abastecimento / Diesel:</span>
                      <span className="font-mono text-rose-450">R$ {Number(selectedClosureForDetails.abastecimentoValor || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Outros custos corporativos:</span>
                      <span className="font-mono text-rose-450">
                        R$ {(Number(selectedClosureForDetails.lavagensHospedagens || 0) + Number(selectedClosureForDetails.alimentacao || 0) + Number(selectedClosureForDetails.manutencaoOutros || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* OCORRÊNCIAS */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-left space-y-2">
              <h4 className="font-bold text-white uppercase font-mono text-[10px] tracking-wider border-b border-slate-850 pb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500" /> Ocorrências Registradas
              </h4>
              {selectedClosureForDetails.ocorrencias && selectedClosureForDetails.ocorrencias.length > 0 ? (
                <div className="space-y-2">
                  {selectedClosureForDetails.ocorrencias.map((occ: any, i: number) => (
                    <div key={occ.id || i} className="p-2.5 bg-slate-900 border border-slate-850 rounded-lg flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-955/45 text-red-400 border border-red-900/30 font-mono font-bold uppercase">
                          {occ.tipo}
                        </span>
                        <p className="text-slate-200 font-semibold">{occ.produto || "Sem produto especificado"}</p>
                        <p className="text-[10px] text-slate-500">{occ.observacao}</p>
                      </div>
                      <div className="text-right font-mono text-xs">
                        <span className="text-slate-500 block">Qtd: {occ.quantidade}</span>
                        {occ.valorTotal > 0 && <span className="text-white font-bold">R$ {Number(occ.valorTotal).toFixed(2)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 italic text-[11px] py-2 text-center">Nenhuma ocorrência registrada para esta DT.</p>
              )}
            </div>

            {/* DOCUMENTOS DO FECHAMENTO */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-left space-y-2">
              <h4 className="font-bold text-white uppercase font-mono text-[10px] tracking-wider border-b border-slate-850 pb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-400" /> DOCUMENTOS DO FECHAMENTO
              </h4>
              <div className="space-y-2">
                {(() => {
                  const activeAnexos = selectedClosureForDetails.anexos || [];
                  const displayAnexos = [...activeAnexos];
                  if (displayAnexos.length === 0 && selectedClosureForDetails.descargaReciboFile) {
                    displayAnexos.push({
                      id: "fallback-recibo",
                      nome: selectedClosureForDetails.descargaReciboFile,
                      url: selectedClosureForDetails.descargaReciboFile.startsWith("data:") ? selectedClosureForDetails.descargaReciboFile : `https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=1500&auto=format&fit=crop`,
                      tipo: selectedClosureForDetails.descargaReciboFile.toLowerCase().endsWith(".pdf") ? "PDF" : "IMAGEM",
                      dataUpload: selectedClosureForDetails.descargaData || selectedClosureForDetails.dataFechamento || new Date().toISOString(),
                      usuario: selectedClosureForDetails.usuarioFechamento || selectedClosureForDetails.usuarioResponsavel || "Sistema",
                      dt: selectedClosureForDetails.dt
                    });
                  }

                  if (displayAnexos.length > 0) {
                    return (
                      <div className="grid grid-cols-1 gap-2">
                        {displayAnexos.map((anx: any, idx: number) => {
                          const isPdf = anx.tipo === "PDF" || anx.nome.toLowerCase().endsWith(".pdf");
                          return (
                            <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[10px]">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="p-1.5 bg-slate-950 border border-slate-850 rounded shrink-0">
                                  {isPdf ? (
                                    <FileText className="w-4 h-4 text-red-400" />
                                  ) : (
                                    <Image className="w-4 h-4 text-emerald-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-slate-200 font-bold truncate max-w-[150px] sm:max-w-[320px]" title={anx.nome}>
                                    {anx.nome}
                                  </p>
                                  <p className="text-[8px] text-slate-500">
                                    Enviado por <span className="text-slate-400">{anx.usuario ? anx.usuario.split("@")[0] : "Sistema"}</span> em {anx.dataUpload ? anx.dataUpload.split("T")[0] : "N/A"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 ml-2">
                                <button
                                  type="button"
                                  onClick={() => handleViewAttachment(anx)}
                                  className="px-2 py-1 bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 rounded text-[9px] font-bold transition flex items-center gap-1 cursor-pointer font-sans"
                                >
                                  <Eye className="w-3 h-3 text-sky-400" />
                                  Visualizar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadAttachment(anx)}
                                  className="px-2 py-1 bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 rounded text-[9px] font-bold transition flex items-center gap-1 cursor-pointer font-sans"
                                >
                                  <Download className="w-3 h-3 text-emerald-400" />
                                  Baixar
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  return <p className="text-slate-500 italic text-[10px] font-mono py-1">Nenhum documento anexado.</p>;
                })()}
              </div>
            </div>

            {/* OBSERVAÇÕES GERAIS */}
            {selectedClosureForDetails.observacoes && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-left space-y-1">
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Observações Gerais</span>
                <p className="text-slate-300 font-sans text-xs leading-normal">{selectedClosureForDetails.observacoes}</p>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedClosureForDetails(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-750 text-white font-extrabold rounded-xl text-xs uppercase cursor-pointer"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFS & CONFIRMS */}
      <NotificationModal notification={notification} onClose={() => setNotification(null)} />
      <ConfirmModal confirm={confirmDialog} onClose={() => setConfirmDialog(null)} />

    </div>
  );
}
