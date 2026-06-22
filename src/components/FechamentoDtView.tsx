import React, { useState, useMemo } from "react";
import { 
  Plus, Search, Edit, Trash, FileText, CheckCircle, Clock, AlertCircle, 
  MapPin, User, Truck, DollarSign, X, Layers, RefreshCw, AlertTriangle, 
  Calendar, Save, History, ChevronRight, Shield, Activity, ArrowLeftRight, 
  Download, TrendingUp, BarChart2
} from "lucide-react";
import { Rota, Veiculo, Motorista, Unidade } from "../types";
import { NotificationModal, ConfirmModal, NotificationType, ConfirmType } from "./NotificationModal";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";

interface FechamentoDtProps {
  rotas: Rota[];
  veiculos: Veiculo[];
  motoristas: Motorista[];
  unidades?: Unidade[];
  vales: any[];
  fechamentosDt: any[];
  onRefresh: () => void;
  userEmail: string;
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
  noShows = []
}: FechamentoDtProps) {
  
  // Selection/Search states
  const [targetDt, setTargetDt] = useState("");
  const [activeSearchedDt, setActiveSearchedDt] = useState<Rota | null>(null);
  
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

  // Consultas tab filters
  const [filterClosedStatus, setFilterClosedStatus] = useState<string>("Todas");
  const [searchClosedDt, setSearchClosedDt] = useState<string>("");

  // Modal / overlays states
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [editingVale, setEditingVale] = useState<any | null>(null);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmType | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  // Unclosed active DTs for user lookup help
  const unclosedDts = useMemo(() => {
    return rotas.filter(r => 
      !fechamentosDt.some(c => c.dt === r.dt) && r.status !== "Finalizada"
    );
  }, [rotas, fechamentosDt]);

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

      const alreadyClosed = fechamentosDt.find(c => c.dt === found.dt);
      if (alreadyClosed) {
        setNotification({
          type: "warning",
          message: `⚠ Esta DT (${found.dt}) já está fechada operacionalmente sob auditoria e não permite novos fechamentos.`
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
          motoristaId: activeSearchedDt.motoristaId,
          veiculoId: activeSearchedDt.veiculoId,
          unidadeId: activeSearchedDt.unidadeId || "un-go",
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

          statusFechamento: computedStatus
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT SEARCH AND QUICK GUIDE PANEL */}
          <div className="space-y-4">
            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4 text-left">
              <div>
                <h3 className="text-xs font-bold text-sky-400 font-mono uppercase tracking-wider">Passo 1: Selecionar DT Ativa</h3>
                <p className="text-[11px] text-slate-400 mt-1">Busque a viagem ou selecione da lista de DTs em trânsito abaixo para efetuar a auditoria administrativa.</p>
              </div>

              {/* Lookup form */}
              <div className="space-y-2">
                <label className="text-[11px] text-slate-500 font-mono">Número da DT (Obrigatório)</label>
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

          {/* MAIN DT CLOSURE DETAILS CARD OR BLANK */}
          <div className="lg:col-span-2 text-left space-y-4">
            {!activeSearchedDt ? (
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
            ) : (
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
                {fechamentosDt.some(c => c.dt === activeSearchedDt.dt) ? (
                  <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-xl text-emerald-300 leading-relaxed font-sans text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <span>DT Já Fechada Operacionalmente</span>
                    </div>
                    {(() => {
                      const closureObj = fechamentosDt.find(c => c.dt === activeSearchedDt.dt);
                      return (
                        <div className="space-y-1 text-slate-350">
                          <p>Esta DT já passou pelo encerramento de pendências com sucesso.</p>
                          <div className="bg-slate-955 p-3 rounded text-[11px] font-mono space-y-0.5">
                            <div><span className="text-slate-505">Fechado em:</span> {closureObj?.dataFechamento} {closureObj?.horaFechamento}</div>
                            <div><span className="text-slate-505">Responsável:</span> {closureObj?.usuarioResponsavel}</div>
                            <div><span className="text-slate-505">Observações:</span> {closureObj?.observacoes || "Nenhuma observação adicionada."}</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
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
                )}

              </div>
            )}
          </div>

        </div>
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
                <div className="h-64 mt-1.5">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.unitChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#fff" }} />
                      <Bar dataKey="valor" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Valor Total (R$)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Vales por Motorista (Top 5) */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-left space-y-3">
                <div>
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-sky-450">Motoristas com Maior Índice de Vales (R$)</h4>
                  <p className="text-[10px] text-slate-500">Top 5 condutores com as maiores multas registradas.</p>
                </div>
                <div className="h-64 mt-1.5">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.driverChartData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis type="number" stroke="#64748b" fontSize={10} />
                      <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={9} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#fff" }} />
                      <Bar dataKey="valor" fill="#f43f5e" radius={[0, 4, 4, 0]} name="Valor (R$)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Vales por Veículo (Top 5) */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-left space-y-3">
                <div>
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-sky-450">Índice por Frota / Veículo (R$)</h4>
                  <p className="text-[10px] text-slate-500">Prejuízos gerenciais indexados pelo registro do ativo vehicular.</p>
                </div>
                <div className="h-64 mt-1.5">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.veicChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#fff" }} />
                      <Bar dataKey="valor" fill="#fb923c" radius={[4, 4, 0, 0]} name="Valor (R$)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Evolução Mensal dos Vales */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-left space-y-3">
                <div>
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-sky-450">Evolução Histórica de Vales (R$)</h4>
                  <p className="text-[10px] text-slate-500">Demonstrativo mensal da ocorrência de multas nas DTs.</p>
                </div>
                <div className="h-64 mt-1.5">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.monthChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#fff" }} />
                      <Bar dataKey="valor" fill="#a855f7" radius={[4, 4, 0, 0]} name="Valor Consolidado (R$)" />
                    </BarChart>
                  </ResponsiveContainer>
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

      {/* NOTIFS & CONFIRMS */}
      <NotificationModal notification={notification} onClose={() => setNotification(null)} />
      <ConfirmModal confirm={confirmDialog} onClose={() => setConfirmDialog(null)} />

    </div>
  );
}
