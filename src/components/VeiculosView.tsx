import React, { useState, useEffect } from "react";
import { 
  Plus, Trash, Edit, Check, AlertCircle, FileText, Search, User, 
  ShieldAlert, LayoutGrid, List, Calendar, Wrench, Percent, 
  Building, BarChart3, PieChart as PieChartIcon, Eye, Download, 
  ChevronDown, CheckCircle2, AlertTriangle, FileUp, Info, ArrowLeftRight
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import { Veiculo, Motorista, Unidade } from "../types";
import { NotificationModal, ConfirmModal, NotificationType, ConfirmType } from "./NotificationModal";

interface VeiculosProps {
  veiculos: Veiculo[];
  motoristas: Motorista[];
  unidades: Unidade[];
  disps?: any[];
  rotas?: any[];
  manutencoes?: any[];
  userRole?: string;
  onRefresh: () => void;
  userEmail: string;
}

export default function VeiculosView({ 
  veiculos, 
  motoristas, 
  unidades, 
  disps = [], 
  rotas = [], 
  manutencoes = [], 
  userRole, 
  onRefresh, 
  userEmail 
}: VeiculosProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"gestao" | "dashboard">("gestao");
  
  // Visual modes
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [selectedDate, setSelectedDate] = useState("2026-06-12");

  // Filter conditions
  const [filterPrefixo, setFilterPrefixo] = useState("");
  const [filterPlaca, setFilterPlaca] = useState("");
  const [filterMotoristaId, setFilterMotoristaId] = useState("Todos");
  const [filterUnidadeId, setFilterUnidadeId] = useState("Todas");
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [filterPerfil, setFilterPerfil] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterDisponibilidade, setFilterDisponibilidade] = useState("Todos");

  // Form active state
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState("");

  // Modals alerts
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmType | null>(null);

  // Form Fields
  const [placa, setPlaca] = useState("");
  const [prefixo, setPrefixo] = useState("");
  const [modelo, setModelo] = useState("");
  const [marca, setMarca] = useState("");
  const [ano, setAno] = useState<number>(2024);
  const [renavam, setRenavam] = useState("");
  const [perfil, setPerfil] = useState<"Truck" | "Carreta" | "Toco" | "VUC" | "Van" | "3/4" | "Utilitário">("Truck");
  const [tipo, setTipo] = useState<"Frota Própria" | "Terceiro">("Frota Própria");
  const [status, setStatus] = useState<"Liberado" | "Bloqueado" | "Pendente">("Liberado");
  const [motivoBloqueio, setMotivoBloqueio] = useState("");
  const [licenciamentoVencimento, setLicenciamentoVencimento] = useState("2026-12-31");
  const [seguroVencimento, setSeguroVencimento] = useState("2027-06-12");
  const [motoristaId, setMotoristaId] = useState("");
  const [unidadeId, setUnidadeId] = useState("");

  // Extended maintenance and revision fields
  const [ultimaTrocaOleo, setUltimaTrocaOleo] = useState("2026-03-15");
  const [proximaManutencao, setProximaManutencao] = useState("2026-06-15");
  const [ultimaRevisao, setUltimaRevisao] = useState("2026-02-20");
  const [documentacaoStatus, setDocumentacaoStatus] = useState<"Completa" | "Pendente">("Completa");

  // Document attachment simulated states (saves actual filename simulation)
  const [docCRLV, setDocCRLV] = useState("");
  const [docCRV, setDocCRV] = useState("");
  const [docSeguro, setDocSeguro] = useState("");
  const [docLicenciamento, setDocLicenciamento] = useState("");
  const [docFoto, setDocFoto] = useState("");

  // Document view modal preview
  const [previewDoc, setPreviewDoc] = useState<{ title: string; filename: string } | null>(null);

  // Driver conflict details view state
  const [conflictData, setConflictData] = useState<{
    driverName: string;
    vehicleId: string;
    vehiclePlaca: string;
    vehiclePrefixo: string;
    vehicleModelo: string;
    vehicleUnidade: string;
  } | null>(null);

  // Fetch or setup defaults
  useEffect(() => {
    if (!unidadeId && unidades?.length > 0) {
      setUnidadeId(unidades[0].id);
    }
  }, [unidades]);

  // Reset form helper
  const resetForm = () => {
    setIsEditing(false);
    setEditingId("");
    setPlaca("");
    setPrefixo("");
    setModelo("");
    setMarca("");
    setAno(2024);
    setRenavam("");
    setPerfil("Truck");
    setTipo("Frota Própria");
    setStatus("Liberado");
    setMotivoBloqueio("");
    setLicenciamentoVencimento("2026-12-31");
    setSeguroVencimento("2027-06-12");
    setMotoristaId("");
    setUnidadeId(unidades?.[0]?.id || "un-go");
    
    // Maintenance fields
    setUltimaTrocaOleo("2026-03-15");
    setProximaManutencao("2026-06-15");
    setUltimaRevisao("2026-02-20");
    setDocumentacaoStatus("Completa");

    // Documents
    setDocCRLV("");
    setDocCRV("");
    setDocSeguro("");
    setDocLicenciamento("");
    setDocFoto("");
  };

  // Populate form fields for edit mode
  const handleEditInit = (v: Veiculo) => {
    setIsEditing(true);
    setEditingId(v.id);
    setPlaca(v.placa);
    setPrefixo(v.prefixo || "");
    setModelo(v.modelo);
    setMarca(v.marca);
    setAno(v.ano);
    setRenavam(v.renavam);
    setPerfil(v.perfil as any);
    setTipo(v.tipo);
    setStatus(v.status as any);
    setMotivoBloqueio(v.motivoBloqueio || "");
    setLicenciamentoVencimento(v.licenciamentoVencimento);
    setSeguroVencimento(v.seguroVencimento);
    setMotoristaId(v.motoristaId || "");
    setUnidadeId(v.unidadeId || unidades?.[0]?.id || "un-go");
    
    // Extended fields
    setUltimaTrocaOleo(v.ultimaTrocaOleo || "2026-03-15");
    setProximaManutencao(v.proximaManutencao || "2026-06-15");
    setUltimaRevisao(v.ultimaRevisao || "2026-02-20");
    setDocumentacaoStatus((v.documentacaoStatus as any) || "Completa");

    // Documents
    setDocCRLV(v.documentoCRLVUrl || "");
    setDocCRV(v.documentoCRVUrl || "");
    setDocSeguro(v.seguroUrl || "");
    setDocLicenciamento(v.licenciamentoUrl || "");
    setDocFoto(v.fotoVeiculoUrl || "");
  };

  // Dynamic automatic status calculator
  const getCalculatedStatus = (v: Veiculo) => {
    const today = new Date(selectedDate);
    today.setHours(0, 0, 0, 0);

    const licDate = v.licenciamentoVencimento ? new Date(v.licenciamentoVencimento) : null;
    const segDate = v.seguroVencimento ? new Date(v.seguroVencimento) : null;
    const proxMaintDate = v.proximaManutencao ? new Date(v.proximaManutencao) : null;

    const isLicExpired = licDate && licDate < today;
    const isSegExpired = segDate && segDate < today;
    const isMaintCriticalExpired = proxMaintDate && proxMaintDate < today;

    // BLOQUEADO if: CRLV expired, Seguro expired, flagged Bloqueado or crit maintenance expired
    if (v.status === "Bloqueado" || isLicExpired || isSegExpired || isMaintCriticalExpired) {
      return "BLOQUEADO";
    }

    // PENDENTE if: documentacaoStatus is Pendente, or nearing vencimento within 15 days, or admin flagged Pendente
    const isLicSoon = licDate && (licDate.getTime() - today.getTime()) < 15 * 24 * 60 * 60 * 1000;
    const isSegSoon = segDate && (segDate.getTime() - today.getTime()) < 15 * 24 * 60 * 60 * 1000;
    const isMaintSoon = proxMaintDate && (proxMaintDate.getTime() - today.getTime()) < 15 * 24 * 60 * 60 * 1000;

    if (
      v.status === "Pendente" ||
      v.documentacaoStatus === "Pendente" ||
      isLicSoon ||
      isSegSoon ||
      isMaintSoon
    ) {
      return "PENDENTE";
    }

    return "LIBERADO";
  };

  // Filter vehicles on active unit constraints
  const getAuthorizedVehicles = () => {
    if (userRole === "admin_master") return veiculos;
    // Non-admins see only vehicles matching their unit
    return veiculos.filter(v => v.unidadeId !== "Todas" && unidades.some(u => u.id === v.unidadeId));
  };

  const authVeiculos = getAuthorizedVehicles();

  // Handle Form Submission (POST/PUT)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeSave(false);
  };

  const executeSave = async (transferDriver: boolean = false) => {
    if (!placa || !placa.trim()) {
      setNotification({ type: "error", message: "A placa do veículo é um campo obrigatório." });
      return;
    }
    if (!modelo || !modelo.trim()) {
      setNotification({ type: "error", message: "O modelo do veículo é um campo obrigatório." });
      return;
    }

    const payload = {
      placa: placa.toUpperCase().trim(),
      prefixo: prefixo.trim() || `PR-${placa.slice(-4)}`,
      modelo: modelo.trim(),
      marca: marca.trim(),
      ano: Number(ano),
      renavam: renavam.trim(),
      perfil,
      tipo,
      status: status === "BLOQUEADO" ? "Bloqueado" : status === "PENDENTE" ? "Pendente" : "Liberado",
      motivoBloqueio: (status === "BLOQUEADO" || status === "Pendente") ? motivoBloqueio : "",
      licenciamentoVencimento,
      seguroVencimento,
      motoristaId: motoristaId || undefined,
      unidadeId: unidadeId || unidades?.[0]?.id || "un-go",
      ultimaTrocaOleo,
      proximaManutencao,
      ultimaRevisao,
      documentacaoStatus,
      documentoCRLVUrl: docCRLV || "CRLV_Atualizado_Assinado.pdf",
      documentoCRVUrl: docCRV || "Recibo_Compra_Venda.pdf",
      seguroUrl: docSeguro || "Apolice_Seguro_Completo.pdf",
      licenciamentoUrl: docLicenciamento || "Comprovante_Licenciamento_Exerc.pdf",
      fotoVeiculoUrl: docFoto || "Foto_Lateral_Veiculo.jpg",
      transferDriver
    };

    try {
      const url = editingId ? `/api/veiculos/${editingId}` : "/api/veiculos";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setNotification({
          type: "success",
          message: "✅ Registro salvo com sucesso."
        });
        resetForm();
        onRefresh();
      } else {
        const error = await res.json();
        if (error.conflict) {
          setConflictData({
            driverName: error.driverName,
            vehicleId: error.vehicleId,
            vehiclePlaca: error.vehiclePlaca,
            vehiclePrefixo: error.vehiclePrefixo,
            vehicleModelo: error.vehicleModelo,
            vehicleUnidade: error.vehicleUnidade
          });
        } else {
          setNotification({
            type: "error",
            message: `❌ Erro no cadastro: ${error.message || error.error || "Operação recusada pelo banco de dados."}`
          });
        }
      }
    } catch (err) {
      setNotification({
        type: "error",
        message: `❌ Falha de rede: ${err instanceof Error ? err.message : String(err)}`
      });
    }
  };

  const handleRemoveDriver = async (veiculoId: string) => {
    if (!window.confirm("Deseja realmente remover o motorista vinculado a este veículo para liberá-lo no sistema?")) return;
    try {
      const res = await fetch(`/api/veiculos/${veiculoId}/remover-motorista`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail
        }
      });
      if (res.ok) {
        setNotification({
          type: "success",
          message: "❌ Motorista removido e liberado imediatamente com sucesso no banco de dados."
        });
        if (veiculoId === editingId) {
          setMotoristaId("");
        }
        onRefresh();
      } else {
        const error = await res.json();
        setNotification({
          type: "error",
          message: `❌ Erro ao desvincular: ${error.message || "Operação recusada."}`
        });
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: `❌ Falha na comunicação: ${err.message}`
      });
    }
  };

  // Handle DELETE Vehicle
  const handleDelete = (id: string) => {
    setConfirmDialog({
      message: `Tem certeza que deseja apagar definitivamente o veículo placa ${id}? Todos os históricos relacionados serão ajustados.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/veiculos/${id}`, {
            method: "DELETE",
            headers: {
              "x-user-email": userEmail
            }
          });
          if (res.ok) {
            setNotification({ type: "success", message: "✅ Veículo removido com sucesso do banco." });
            onRefresh();
          } else {
            const error = await res.json();
            setNotification({ type: "error", message: `❌ Erro ao remover: ${error.message || "Remoção negada."}` });
          }
        } catch (e) {
          setNotification({ type: "error", message: "❌ Erro ao excluir do banco." });
        }
      }
    });
  };

  // Dynamic calculations for dynamic Real-time Indicators
  const totalVeiculos = authVeiculos.length;
  const liberadosCount = authVeiculos.filter(v => getCalculatedStatus(v) === "LIBERADO").length;
  const bloqueadosCount = authVeiculos.filter(v => getCalculatedStatus(v) === "BLOQUEADO").length;
  const pendentesCount = authVeiculos.filter(v => getCalculatedStatus(v) === "PENDENTE").length;

  // Em Manutenção: Count veiculos with next maintenance schedule overdue or flagged locked with maintenance reason
  const emManutencaoCount = authVeiculos.filter(v => {
    const today = new Date(selectedDate);
    const hasMaintReason = v.motivoBloqueio?.toLowerCase().includes("manuten");
    const isMaintOverdue = v.proximaManutencao && new Date(v.proximaManutencao) <= today;
    return (v.status === "Bloqueado" && hasMaintReason) || isMaintOverdue;
  }).length;

  // Veículos Disponíveis: "Veículos disponíveis para roteirização." (LIBERADO or PENDENTE can work, but focus on LIBERADOS)
  const disponiveisCount = authVeiculos.filter(v => getCalculatedStatus(v) === "LIBERADO").length;

  // Veículos Roteirizados: "Veículos que receberam DT no dia selecionado."
  const roteirizadosCount = authVeiculos.filter(v => {
    const hasDispRoute = disps?.some(d => d.veiculoId === v.id && d.roteirizado && d.data === selectedDate);
    const hasActiveRoute = rotas?.some(r => r.veiculoId === v.id && r.data === selectedDate);
    return hasDispRoute || hasActiveRoute;
  }).length;

  // Veículos Não Roteirizados: "Veículos disponíveis que não receberam rota."
  const naoRoteirizadosCount = Math.max(0, disponiveisCount - roteirizadosCount);

  // Índice de Utilização da Frota: Formula -> Roteirizados ÷ Disponíveis × 100
  const utilizacaoFrota = disponiveisCount > 0 ? Math.round((roteirizadosCount / disponiveisCount) * 100) : 0;

  // Filter application on active vehicles view
  const filteredVeiculos = authVeiculos.filter(v => {
    // 1. Prefixo
    if (filterPrefixo && !(v.prefixo || "").toLowerCase().includes(filterPrefixo.toLowerCase())) return false;
    // 2. Placa
    if (filterPlaca && !(v.placa || "").toLowerCase().includes(filterPlaca.toLowerCase())) return false;
    // 3. Motorista
    if (filterMotoristaId !== "Todos") {
      if (filterMotoristaId === "Sem Motorista") {
        if (v.motoristaId) return false;
      } else if (v.motoristaId !== filterMotoristaId) {
        return false;
      }
    }
    // 4. Unidade
    if (filterUnidadeId !== "Todas" && v.unidadeId !== filterUnidadeId) return false;
    // 5. Tipo
    if (filterTipo !== "Todos" && v.tipo !== filterTipo) return false;
    // 6. Perfil
    if (filterPerfil !== "Todos" && v.perfil !== filterPerfil) return false;
    // 7. Status calculated or admin status
    const calcStatus = getCalculatedStatus(v);
    if (filterStatus !== "Todos" && calcStatus !== filterStatus) return false;
    // 8. Disponibilidade
    if (filterDisponibilidade !== "Todos") {
      const isRoteirizado = disps?.some(d => d.veiculoId === v.id && d.roteirizado && d.data === selectedDate) ||
                            rotas?.some(r => r.veiculoId === v.id && r.data === selectedDate);
      if (filterDisponibilidade === "Disponível" && calcStatus !== "LIBERADO") return false;
      if (filterDisponibilidade === "Indisponível" && calcStatus === "LIBERADO") return false;
      if (filterDisponibilidade === "Roteirizado" && !isRoteirizado) return false;
      if (filterDisponibilidade === "Não Roteirizado" && isRoteirizado) return false;
    }

    return true;
  });

  // Calculate Chart data: Frota por Perfil
  const perfisList = ["Truck", "Carreta", "Toco", "VUC", "Van", "3/4", "Utilitário"];
  const chartPerfilData = perfisList.map(p => {
    const count = authVeiculos.filter(v => v.perfil === p).length;
    return { name: p, Quantidade: count };
  });

  // Calculate Chart data: Status da Frota
  const chartStatusData = [
    { name: "Disponíveis", value: disponiveisCount, color: "#10b981" },
    { name: "Roteirizados", value: roteirizadosCount, color: "#06b6d4" },
    { name: "Manutenção", value: emManutencaoCount, color: "#f59e0b" },
    { name: "Bloqueados", value: bloqueadosCount, color: "#f43f5e" }
  ];

  // Calculate Chart data: Utilização por Unidade (Goiânia, Brasília, Anápolis, Minas Gerais)
  const chartUnidadeData = unidades.map(u => {
    const unitVeiculos = veiculos.filter(v => v.unidadeId === u.id);
    const disp = unitVeiculos.filter(v => getCalculatedStatus(v) === "LIBERADO").length;
    const rot = unitVeiculos.filter(v => {
      const hasDispRoute = disps?.some(d => d.veiculoId === v.id && d.roteirizado && d.data === selectedDate);
      const hasActiveRoute = rotas?.some(r => r.veiculoId === v.id && r.data === selectedDate);
      return hasDispRoute || hasActiveRoute;
    }).length;
    const rate = disp > 0 ? Math.round((rot / disp) * 100) : 0;
    return {
      name: u.nome.replace("CEDE ", "").replace("FILIAL ", ""),
      Utilização: rate,
      Disponíveis: disp,
      Roteirizados: rot
    };
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Title & Navigation Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="p-1.5 bg-sky-600/20 text-sky-400 rounded-lg">🛞</span>
            Módulo Gerencial de Frotas & Ativos
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Controle de conformidades, alertas automáticos de CRLV/Seguro, agenda e otimização por bases.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Dashboard vs Active Management toggle */}
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab("gestao")}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === "gestao" 
                  ? "bg-slate-800 text-sky-400 font-bold" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Gestão Ativa
            </button>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === "dashboard" 
                  ? "bg-slate-800 text-sky-400 font-bold" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Painel Frota
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-300 font-mono text-xs focus:outline-none focus:ring-0 w-24"
              title="Selecione o dia operacional para o resumo"
            />
          </div>

          {!isEditing && (
            <button
              onClick={() => {
                resetForm();
                setIsEditing(true);
              }}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-sky-600/10 transition"
            >
              <Plus className="w-4 h-4" />
              Adicionar Veículo
            </button>
          )}
        </div>
      </div>

      {/* HORIZONTAL REGISTER INDICATORS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Total vehicles */}
        <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 tracking-wider font-mono">TOTAL VEÍCULOS</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-black text-white">{totalVeiculos}</span>
            <span className="text-[10px] text-slate-500">frotas</span>
          </div>
        </div>

        {/* Liberados */}
        <div className="bg-emerald-950/10 p-3 rounded-xl border border-emerald-900/30 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-emerald-400 tracking-wider font-mono">LIBERADOS</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-black text-emerald-400">{liberadosCount}</span>
            <span className="text-[9px] text-emerald-500/80 font-mono font-bold">APTO OP</span>
          </div>
        </div>

        {/* Bloqueados */}
        <div className="bg-rose-950/10 p-3 rounded-xl border border-rose-900/30 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-rose-400 tracking-wider font-mono">BLOQUEADOS</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-black text-rose-400">{bloqueadosCount}</span>
            <span className="text-[9px] text-rose-500/80 font-mono font-bold">RETIDO</span>
          </div>
        </div>

        {/* Em manutenção */}
        <div className="bg-amber-955/10 p-3 rounded-xl border border-amber-900/20 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-amber-500 tracking-wider font-mono font-bold">EM MANUTENÇÃO</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-black text-amber-500">{emManutencaoCount}</span>
            <span className="text-[9px] text-amber-500/60 font-mono font-bold">OFICINA</span>
          </div>
        </div>

        {/* Disponiveis */}
        <div className="bg-slate-900/20 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">DISPONÍVEIS</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-black text-white">{disponiveisCount}</span>
            <span className="text-[9px] text-slate-500">AGENDA</span>
          </div>
        </div>

        {/* Roteirizados */}
        <div className="bg-cyan-950/10 p-3 rounded-xl border border-cyan-900/30 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-cyan-400 tracking-wider font-mono">ROTEIRIZADOS</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-black text-cyan-400">{roteirizadosCount}</span>
            <span className="text-[9px] text-cyan-500/80 font-mono">COM DT</span>
          </div>
        </div>

        {/* Não Roteirizados */}
        <div className="bg-slate-900/20 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">NÃO ROTEIRIZADOS</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-black text-slate-400">{naoRoteirizadosCount}</span>
            <span className="text-[9px] text-slate-500">DENTRO</span>
          </div>
        </div>

        {/* Utilização da Frota */}
        <div className="bg-sky-950/10 p-3 rounded-xl border border-sky-800/30 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-sky-450 tracking-wider font-mono">UTILIZAÇÃO FROTA</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-black text-sky-400">{utilizacaoFrota}%</span>
            <span className="text-[8px] text-slate-500 font-mono">ROT/DISP</span>
          </div>
        </div>
      </div>

      {/* DASHBOARD TAB - GRAPHICS & PANELS */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart 1: Frota por Perfil */}
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 bg-sky-500 rounded-full"></span>
                Frota por Perfil Técnico
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartPerfilData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                    <YAxis stroke="#64748b" fontSize={9} />
                    <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#334155" }} />
                    <Bar dataKey="Quantidade" fill="#0284c7" radius={[4, 4, 0, 0]}>
                      {chartPerfilData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#0284c7" : "#0ea5e9"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Status da Frota */}
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                Distribuição de Status Operacional
              </h3>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartStatusData.filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartStatusData.filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#334155" }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Labels Legend side panel */}
                <div className="flex flex-col gap-1.5 pl-2">
                  {chartStatusData.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-[10px]">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-400">{item.name}:</span>
                      <strong className="text-white font-mono">{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart 3: Utilização por Unidade */}
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                Utilização da Frota por Unidade (%)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartUnidadeData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                    <YAxis stroke="#64748b" fontSize={9} unit="%" />
                    <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#334155" }} />
                    <Bar dataKey="Utilização" fill="#eab308" radius={[4, 4, 0, 0]}>
                      {chartUnidadeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.Utilização >= 85 ? "#10b981" : entry.Utilização >= 60 ? "#0284c7" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-800 flex items-center gap-3 text-xs text-slate-400">
            <Info className="w-5 h-5 text-sky-400 shrink-0" />
            <p>
              Os dados de utilização e conformidade são atualizados de forma contínua em tempo real. Supervisor só visualiza informações autorizadas da sua respectiva filial.
            </p>
          </div>
        </div>
      )}

      {/* CORE ACTIVE MANAGEMENT TAB */}
      {activeTab === "gestao" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* LEFT COLUMN: FILTERS & MANAGEMENT */}
          <div className="lg:col-span-1 bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-4 h-fit">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
              <h3 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase">
                🔍 Filtros Avançados
              </h3>
              <button
                onClick={() => {
                  setFilterPrefixo("");
                  setFilterPlaca("");
                  setFilterMotoristaId("Todos");
                  setFilterUnidadeId("Todas");
                  setFilterTipo("Todos");
                  setFilterPerfil("Todos");
                  setFilterStatus("Todos");
                  setFilterDisponibilidade("Todos");
                }}
                className="text-[10px] text-sky-400 hover:text-white"
                title="Limpar todos os filtros da busca"
              >
                Limpar Filtros
              </button>
            </div>

            <div className="space-y-3 text-xs font-sans">
              {/* Prefixo */}
              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Prefixo</label>
                <input
                  type="text"
                  placeholder="Ex: PR-123"
                  value={filterPrefixo}
                  onChange={(e) => setFilterPrefixo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              {/* Placa */}
              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Placa</label>
                <input
                  type="text"
                  placeholder="Ex: ABC-1234"
                  value={filterPlaca}
                  onChange={(e) => setFilterPlaca(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              {/* Motorista */}
              <div className="space-y-1">
                <label className="text-slate-400 block font-mono font-bold text-sky-450">Motorista atual</label>
                <select
                  value={filterMotoristaId}
                  onChange={(e) => setFilterMotoristaId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white"
                >
                  <option value="Todos">Todos</option>
                  <option value="Sem Motorista">Sem motorista fixo</option>
                  {motoristas.map(m => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>

              {/* Unidade */}
              <div className="space-y-1">
                <label className="text-slate-400 block font-mono font-bold text-amber-500">Unidade Base</label>
                <select
                  value={filterUnidadeId}
                  onChange={(e) => setFilterUnidadeId(e.target.value)}
                  disabled={userRole !== "admin_master"}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white disabled:opacity-50"
                >
                  <option value="Todas">Todas as unidades</option>
                  {unidades.map(u => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>

              {/* Tipo de Frota */}
              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Regime / Tipo</label>
                <select
                  value={filterTipo}
                  onChange={(e) => setFilterTipo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white"
                >
                  <option value="Todos">Todos</option>
                  <option value="Frota Própria">Frota Própria</option>
                  <option value="Terceiro">Terceiro</option>
                </select>
              </div>

              {/* Perfil de Veículo */}
              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Perfil / Porte</label>
                <select
                  value={filterPerfil}
                  onChange={(e) => setFilterPerfil(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white"
                >
                  <option value="Todos">Todos</option>
                  {perfisList.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Status Operational */}
              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Status Geral</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white"
                >
                  <option value="Todos">Todos</option>
                  <option value="LIBERADO">LIBERADO</option>
                  <option value="PENDENTE">PENDENTE</option>
                  <option value="BLOQUEADO">BLOQUEADO</option>
                </select>
              </div>

              {/* Disponibilidade */}
              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Disponibilidade</label>
                <select
                  value={filterDisponibilidade}
                  onChange={(e) => setFilterDisponibilidade(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white"
                >
                  <option value="Todos">Todos</option>
                  <option value="Disponível">Disponível para Operação</option>
                  <option value="Indisponível">Indisponível / Impedido</option>
                  <option value="Roteirizado">Roteirizado no Dia</option>
                  <option value="Não Roteirizado">Liberado sem Rota</option>
                </select>
              </div>
            </div>
          </div>

          {/* MAIN MANAGEMENT AREA (Cards / List / Form Editor) */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* EDITOR COMPONENT PREVIEW */}
            {isEditing && (
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800/80 space-y-4 relative">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                    <span className="p-1 bg-sky-600/10 text-sky-400 rounded">🛞</span>
                    {editingId ? `Editar Veículo: ${placa}` : "Cadastrar Veículo na Frota"}
                  </h3>
                  <button 
                    onClick={() => resetForm()} 
                    className="text-xs text-rose-400 hover:text-rose-300 font-semibold uppercase hover:bg-rose-500/10 px-2 py-1 rounded"
                  >
                    Encerrar sem Salvar
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
                  {/* Row 1: Placa, Prefixo, Tipo autoria */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-450 block font-mono">Placa do Veículo *</label>
                      <input
                        type="text"
                        required
                        value={placa}
                        onChange={(e) => setPlaca(e.target.value)}
                        placeholder="Ex: ABC1D23"
                        maxLength={8}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-450 block font-mono">Prefixo da Frota</label>
                      <input
                        type="text"
                        value={prefixo}
                        onChange={(e) => setPrefixo(e.target.value)}
                        placeholder="Ex: GR-102"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-450 block font-mono">Origem / Categoria *</label>
                      <select
                        value={tipo}
                        onChange={(e) => setTipo(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="Frota Própria">Frota Própria</option>
                        <option value="Terceiro">Terceiro</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Modelo, Marca, Ano */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-450 block font-mono">Modelo Técnico *</label>
                      <input
                        type="text"
                        required
                        value={modelo}
                        onChange={(e) => setModelo(e.target.value)}
                        placeholder="Ex: Mercedes-Benz Axor"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-450 block font-mono">Marca / Fabricante</label>
                      <input
                        type="text"
                        value={marca}
                        onChange={(e) => setMarca(e.target.value)}
                        placeholder="Ex: Mercedes-Benz"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-450 block font-mono">Ano Fabricação</label>
                      <input
                        type="number"
                        value={ano}
                        onChange={(e) => setAno(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                  </div>

                  {/* Row 3: Renavam, Perfil de veículo, Motorista fixo */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-450 block font-mono">Código Renavam</label>
                      <input
                        type="text"
                        value={renavam}
                        onChange={(e) => setRenavam(e.target.value)}
                        placeholder="Apenas números..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-450 block font-mono">Perfil / Classificação *</label>
                      <select
                        value={perfil}
                        onChange={(e) => setPerfil(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                      >
                        {perfisList.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-455 block font-mono font-bold text-sky-400">Motorista Atual Vinculado</label>
                      <div className="space-y-1.5">
                        <select
                          value={motoristaId}
                          onChange={(e) => setMotoristaId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                        >
                          <option value="">Nenhum motorista</option>
                          {motoristas.map(m => (
                            <option key={m.id} value={m.id}>{m.nome} (CNH: {m.statusFinal})</option>
                          ))}
                        </select>
                        {isEditing && motoristaId && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDriver(editingId)}
                            className="w-full py-1.5 px-3 rounded-lg bg-rose-950/40 hover:bg-rose-950/60 border border-rose-900/40 hover:border-rose-850/50 text-rose-300 hover:text-rose-200 text-[10px] font-bold tracking-wider uppercase transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            ❌ Remover Motorista do Veículo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Unidade de Alocação (Editable only by Master admins or Lucas Miranda) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-455 block font-mono font-bold text-amber-500">Unidade Base Operacional *</label>
                      <select
                        value={unidadeId}
                        onChange={(e) => setUnidadeId(e.target.value)}
                        disabled={userRole !== "admin_master"}
                        className="w-full bg-slate-950 border border-slate-800/80 rounded-lg px-3 py-2 text-amber-400 font-medium focus:outline-none focus:border-amber-550 disabled:opacity-50"
                      >
                        {unidades.map(u => (
                          <option key={u.id} value={u.id}>{u.nome}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-450 block font-mono">Conformidade Documental</label>
                      <select
                        value={documentacaoStatus}
                        onChange={(e) => setDocumentacaoStatus(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="Completa">✅ Completa / Sem Pendência</option>
                        <option value="Pendente">❌ Pendente / Faltam Cópias</option>
                      </select>
                    </div>
                  </div>

                  {/* Section Manutenções do Veículo */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                    <span className="text-[10px] text-slate-450 font-bold tracking-wider font-mono uppercase flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5 text-amber-500" /> Manutenções Preventivas e Controles
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-slate-500 block">Última Troca de Óleo</label>
                        <input
                          type="date"
                          value={ultimaTrocaOleo}
                          onChange={(e) => setUltimaTrocaOleo(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-500 block">Próxima Manutenção Preventiva</label>
                        <input
                          type="date"
                          value={proximaManutencao}
                          onChange={(e) => setProximaManutencao(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-500 block">Última Revisão Completa</label>
                        <input
                          type="date"
                          value={ultimaRevisao}
                          onChange={(e) => setUltimaRevisao(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 5: Licenciamento, Seguro, Status administrativo */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-slate-450 block font-mono">Vencimento CRLV</label>
                      <input
                        type="date"
                        value={licenciamentoVencimento}
                        onChange={(e) => setLicenciamentoVencimento(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-450 block font-mono">Vencimento Seguro Frota</label>
                      <input
                        type="date"
                        value={seguroVencimento}
                        onChange={(e) => setSeguroVencimento(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-455 block font-mono font-bold text-sky-400">Status Administrativo</label>
                      <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-1">
                        {/* Option buttons */}
                        <button
                          type="button"
                          onClick={() => setStatus("Liberado")}
                          className={`flex-1 py-1 rounded text-[10px] font-bold ${
                            status === "Liberado" ? "bg-emerald-500 text-white" : "text-slate-450"
                          }`}
                        >
                          Liberado
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatus("Pendente")}
                          className={`flex-1 py-1 rounded text-[10px] font-bold ${
                            status === "Pendente" ? "bg-amber-500 text-white" : "text-slate-450"
                          }`}
                        >
                          Pendente
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatus("Bloqueado")}
                          className={`flex-1 py-1 rounded text-[10px] font-bold ${
                            status === "Bloqueado" ? "bg-rose-500 text-white" : "text-slate-450"
                          }`}
                        >
                          Bloqueado
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Motivo do bloqueio se status não for Liberado */}
                  {(status === "Bloqueado" || status === "Pendente") && (
                    <div className="space-y-1">
                      <label className="text-rose-450 block font-mono font-bold">Observações / Motivo do Bloqueio</label>
                      <textarea
                        rows={2}
                        value={motivoBloqueio}
                        onChange={(e) => setMotivoBloqueio(e.target.value)}
                        placeholder="Cite problemas mecânicos, sinistros, documentações faltantes..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                      />
                    </div>
                  )}

                  {/* SIMULADO DE DOCUMENTOS & ARQUIVOS */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                    <span className="text-[10px] font-bold text-slate-500 tracking-wider font-mono uppercase block border-b border-slate-800 pb-1.5">
                      📁 Anexar Documentos Digitais (CRLV, CRV, Seguro, Licenciamento, Fotos)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      
                      {/* CRLV */}
                      <div className="space-y-1">
                        <label className="text-slate-500 text-[10px] block font-mono">📎 CRLV (Digital ou Scan)</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Nenhum arquivo"
                            value={docCRLV}
                            onChange={(e) => setDocCRLV(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] text-white flex-1 focus:outline-none"
                          />
                          <label className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded cursor-pointer transition">
                            <FileUp className="w-3.5 h-3.5" />
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => setDocCRLV(e.target.files?.[0]?.name || "")} 
                            />
                          </label>
                        </div>
                      </div>

                      {/* CRV */}
                      <div className="space-y-1">
                        <label className="text-slate-500 text-[10px] block font-mono">📎 CRV (Compra e Venda)</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Nenhum arquivo"
                            value={docCRV}
                            onChange={(e) => setDocCRV(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] text-white flex-1 focus:outline-none"
                          />
                          <label className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded cursor-pointer transition">
                            <FileUp className="w-3.5 h-3.5" />
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => setDocCRV(e.target.files?.[0]?.name || "")} 
                            />
                          </label>
                        </div>
                      </div>

                      {/* Seguro */}
                      <div className="space-y-1">
                        <label className="text-slate-500 text-[10px] block font-mono">📎 Apólice de Seguro</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Nenhum arquivo"
                            value={docSeguro}
                            onChange={(e) => setDocSeguro(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] text-white flex-1 focus:outline-none"
                          />
                          <label className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded cursor-pointer transition">
                            <FileUp className="w-3.5 h-3.5" />
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => setDocSeguro(e.target.files?.[0]?.name || "")} 
                            />
                          </label>
                        </div>
                      </div>

                      {/* Licenciamento */}
                      <div className="space-y-1">
                        <label className="text-slate-500 text-[10px] block font-mono">📎 Licenciamento Recente</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Nenhum arquivo"
                            value={docLicenciamento}
                            onChange={(e) => setDocLicenciamento(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] text-white flex-1 focus:outline-none"
                          />
                          <label className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded cursor-pointer transition">
                            <FileUp className="w-3.5 h-3.5" />
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => setDocLicenciamento(e.target.files?.[0]?.name || "")} 
                            />
                          </label>
                        </div>
                      </div>

                      {/* Fotos do veículo */}
                      <div className="space-y-1 sm:col-span-2 lg:col-span-2">
                        <label className="text-slate-500 text-[10px] block font-mono">📸 Fotos Visuais do Veículo</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Nenhuma foto anexada"
                            value={docFoto}
                            onChange={(e) => setDocFoto(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] text-white flex-1 focus:outline-none"
                          />
                          <label className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded cursor-pointer transition">
                            <FileUp className="w-3.5 h-3.5" />
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => setDocFoto(e.target.files?.[0]?.name || "")} 
                            />
                          </label>
                        </div>
                      </div>

                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => resetForm()}
                      className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold rounded-lg text-xs"
                    >
                      Descartar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-sky-600 hover:bg-sky-550 text-white font-semibold rounded-lg text-xs transition"
                    >
                      {editingId ? "Salvar alterações" : "Confirmar novo cadastro"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* RESULTS VIEW HEADER WITH VIEW MODE CONTROLS */}
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
              <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase">
                ⚙️ {filteredVeiculos.length} veículos localizados
              </span>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-mono mr-2">Visualização:</span>
                <div className="bg-slate-950 p-0.5 rounded border border-slate-800 flex">
                  <button
                    onClick={() => setViewMode("cards")}
                    className={`p-1.5 rounded transition ${
                      viewMode === "cards" ? "bg-slate-800 text-sky-400" : "text-slate-500 hover:text-white"
                    }`}
                    title="Modo Cards"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded transition ${
                      viewMode === "list" ? "bg-slate-800 text-sky-400" : "text-slate-500 hover:text-white"
                    }`}
                    title="Modo Tabela de Lista"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* CARDS DISPLAY MODE */}
            {viewMode === "cards" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredVeiculos.map((v) => {
                  const assignedDriverObj = motoristas.find(m => m.id === v.motoristaId);
                  const parsedStatus = getCalculatedStatus(v);
                  const isRoteirizado = disps?.some(d => d.veiculoId === v.id && d.roteirizado && d.data === selectedDate) ||
                                        rotas?.some(r => r.veiculoId === v.id && r.data === selectedDate);
                  const associatedUnit = unidades.find(u => u.id === v.unidadeId);

                  // Conformity Checks
                  const flagCRLV = (v.licenciamentoVencimento && new Date(v.licenciamentoVencimento) >= new Date(selectedDate)) ? "Válido" : "Vencido";
                  const flagSeguro = (v.seguroVencimento && new Date(v.seguroVencimento) >= new Date(selectedDate)) ? "Ativo" : "Vencido";
                  
                  let flagManutencao = "Em dia";
                  if (v.proximaManutencao) {
                    const diffDays = (new Date(v.proximaManutencao).getTime() - new Date(selectedDate).getTime()) / (24 * 60 * 60 * 1000);
                    if (diffDays < 0) {
                      flagManutencao = "Atrasada"; // expired
                    } else if (diffDays <= 15) {
                      flagManutencao = "Próxima do vencimento"; // warning
                    }
                  }

                  const flagDocumentos = v.documentacaoStatus === "Pendente" ? "Pendente" : "Completa";

                  return (
                    <div
                      key={v.id}
                      className={`bg-slate-900 rounded-2xl border transition shadow-sm hover:shadow-md flex flex-col justify-between ${
                        parsedStatus === "BLOQUEADO" 
                          ? "border-rose-900/60 hover:border-rose-800" 
                          : parsedStatus === "PENDENTE" 
                            ? "border-amber-900/60 hover:border-amber-800" 
                            : "border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {/* Card Top */}
                      <div className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            {/* License plate & prefix */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="bg-white text-slate-950 font-extrabold px-2 py-0.5 rounded text-xs tracking-wider border border-slate-300 font-mono select-all">
                                {v.placa}
                              </span>
                              <span className="bg-slate-950 text-slate-400 font-bold px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-800 uppercase">
                                Pref: {v.prefixo || `PR-${v.placa.slice(-3)}`}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-mono ${
                                v.tipo === "Frota Própria" ? "bg-sky-500/10 text-sky-400 font-bold" : "bg-slate-950 text-slate-500 font-mono"
                              }`}>
                                {v.tipo}
                              </span>
                            </div>

                            <h4 className="text-white text-sm font-semibold tracking-tight mt-1.5">
                              {v.modelo}
                            </h4>
                            <p className="text-[10px] text-slate-500 font-mono">
                              {v.marca || "Fabricante"} • Ano {v.ano || 2024}
                            </p>
                          </div>

                          {/* Calculated operational status badge */}
                          <div className="flex flex-col items-end gap-1">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border flex items-center gap-1 ${
                              parsedStatus === "LIBERADO" 
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                : parsedStatus === "PENDENTE" 
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                                  : "bg-rose-500/10 text-rose-450 border-rose-500/20"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                parsedStatus === "LIBERADO" ? "bg-emerald-400" : parsedStatus === "PENDENTE" ? "bg-amber-400" : "bg-rose-500"
                              }`} />
                              {parsedStatus}
                            </span>

                            <span className="text-[9px] text-slate-500 uppercase font-mono font-bold bg-slate-950 border border-slate-850 px-1.5 py-0.5 rounded mt-1">
                              {v.perfil}
                            </span>
                          </div>
                        </div>

                        {/* Driver and Operations */}
                        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] font-sans">
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase font-mono">MOTORISTA ATUAL:</span>
                            {assignedDriverObj ? (
                              <div className="mt-0.5 space-y-1">
                                <strong className="text-white font-semibold block truncate">
                                  👤 {assignedDriverObj.nome}
                                </strong>
                                <button
                                  type="button"
                                  id={`unbind-${v.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveDriver(v.id);
                                  }}
                                  className="text-[9px] text-rose-450 hover:text-rose-350 font-bold uppercase block tracking-wider hover:underline select-none cursor-pointer"
                                >
                                  ❌ Remover Vínculo
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic block mt-0.5">Sem condutor fixado</span>
                            )}
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase font-mono">UNIDADE FILIAL:</span>
                            <span className="text-slate-300 font-medium block truncate mt-0.5 flex items-center gap-1">
                              🏢 {associatedUnit ? associatedUnit.nome : `Filial ${v.unidadeId}`}
                            </span>
                          </div>
                        </div>

                        {/* CONFORMIDADES DO VEÍCULO SECTION */}
                        <div className="space-y-1.5 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 font-mono text-[10px]">
                          <span className="text-slate-450 text-[9px] font-bold tracking-wider block border-b border-slate-850 pb-0.5 uppercase">
                            🛡️ Conformidades do Veículo
                          </span>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                            <span className="flex items-center justify-between text-slate-400">
                              <span>CRLV:</span>
                              <span className={flagCRLV === "Válido" ? "text-emerald-400 font-bold" : "text-rose-450 font-bold"}>
                                {flagCRLV === "Válido" ? "✅ Válido" : "❌ Vencido"}
                              </span>
                            </span>

                            <span className="flex items-center justify-between text-slate-400">
                              <span>Seguro:</span>
                              <span className={flagSeguro === "Ativo" ? "text-emerald-400 font-bold" : "text-rose-450 font-bold"}>
                                {flagSeguro === "Ativo" ? "✅ Ativo" : "❌ Vencido"}
                              </span>
                            </span>

                            <span className="flex items-center justify-between text-slate-400">
                              <span>Manutenção:</span>
                              <span className={flagManutencao === "Em dia" ? "text-emerald-400 font-bold" : flagManutencao === "Atrasada" ? "text-rose-450 font-bold" : "text-yellow-500 font-bold"}>
                                {flagManutencao === "Em dia" ? "✅ Em dia" : flagManutencao === "Atrasada" ? "❌ Atrasada" : "⚠ Atenção"}
                              </span>
                            </span>

                            <span className="flex items-center justify-between text-slate-400">
                              <span>Documentos:</span>
                              <span className={flagDocumentos === "Completa" ? "text-emerald-400 font-bold" : "text-rose-450 font-bold"}>
                                {flagDocumentos === "Completa" ? "✅ Completa" : "❌ Pendente"}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* HISTÓRICOS DE MANUTENÇÕES */}
                        <div className="bg-slate-950/20 p-2.5 rounded-xl border border-slate-850/80 font-mono text-[10px] space-y-1">
                          <span className="text-slate-500 text-[9px] font-bold block uppercase tracking-wider">
                            🔧 Datas de Manutenção
                          </span>
                          <div className="flex flex-col gap-1 text-slate-400">
                            <div className="flex justify-between">
                              <span>Última troca óleo:</span>
                              <strong className="text-slate-350">{v.ultimaTrocaOleo ? new Date(v.ultimaTrocaOleo).toLocaleDateString("pt-BR") : "15/03/2026"}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span>Última revisão geral:</span>
                              <strong className="text-slate-350">{v.ultimaRevisao ? new Date(v.ultimaRevisao).toLocaleDateString("pt-BR") : "20/02/2026"}</strong>
                            </div>
                            <div className="flex justify-between text-amber-500">
                              <span>Próxima agendada:</span>
                              <strong className="font-bold">{v.proximaManutencao ? new Date(v.proximaManutencao).toLocaleDateString("pt-BR") : "15/06/2026"}</strong>
                            </div>
                          </div>
                        </div>

                        {/* SHOW BLOCK MOTIVE DETAILS IF NOT LIBERADO */}
                        {(parsedStatus === "BLOQUEADO" || parsedStatus === "PENDENTE") && (
                          <div className="p-2 bg-rose-500/5 rounded-lg border border-rose-550/10 space-y-1">
                            <span className="block text-[9px] font-mono font-bold text-rose-450 uppercase">
                              ⚠️ Motivo / Observação de Restrição:
                            </span>
                            <p className="text-[10px] text-slate-300 italic">
                              {v.motivoBloqueio || "Documentação com vencimento crítico expirado or pendente."}
                            </p>
                          </div>
                        )}

                        {/* ANEXOS & DOWNLOADS */}
                        <div className="pt-2 border-t border-slate-800/80 space-y-2">
                          <span className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-wider block">
                            📂 Documentos Digitais Anexos
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {/* CRLV */}
                            <button
                              onClick={() => setPreviewDoc({ title: "Comprovante CRLV", filename: v.documentoCRLVUrl || "CRLV_Atualizado_Assinado.pdf" })}
                              className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[9px] text-slate-300 rounded font-mono font-bold flex items-center gap-1 shrink-0 transition"
                              title="Visualizar CRLV do veículo"
                            >
                              <FileText className="w-3 h-3 text-sky-400" /> CRLV
                            </button>
                            {/* CRV */}
                            <button
                              onClick={() => setPreviewDoc({ title: "Título de Propriedade - CRV", filename: v.documentoCRVUrl || "Recibo_Compra_Venda.pdf" })}
                              className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[9px] text-slate-300 rounded font-mono font-bold flex items-center gap-1 shrink-0 transition"
                              title="Visualizar CRV de propriedade"
                            >
                              <FileText className="w-3 h-3 text-cyan-400" /> CRV
                            </button>
                            {/* Seguro */}
                            <button
                              onClick={() => setPreviewDoc({ title: "Apólice de Seguro de Frota", filename: v.seguroUrl || "Apolice_Seguro_Completo.pdf" })}
                              className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[9px] text-slate-300 rounded font-mono font-bold flex items-center gap-1 shrink-0 transition"
                              title="Visualizar apólice de seguro"
                            >
                              <FileText className="w-3 h-3 text-amber-500" /> SEGURO
                            </button>
                            {/* Licenciamento */}
                            <button
                              onClick={() => setPreviewDoc({ title: "Guia de Licenciamento Anual", filename: v.licenciamentoUrl || "Comprovante_Licenciamento_Exerc.pdf" })}
                              className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[9px] text-slate-300 rounded font-mono font-bold flex items-center gap-1 shrink-0 transition"
                              title="Visualizar Licenciamento"
                            >
                              <FileText className="w-3 h-3 text-indigo-400" /> LICENC.
                            </button>
                            {/* Foto */}
                            <button
                              onClick={() => setPreviewDoc({ title: "Registro Fotográfico Lateral", filename: v.fotoVeiculoUrl || "Foto_Lateral_Veiculo.jpg" })}
                              className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[9px] text-slate-300 rounded font-mono font-bold flex items-center gap-1 shrink-0 transition"
                              title="Visualizar foto lateral do veículo"
                            >
                              <FileText className="w-3 h-3 text-emerald-400" /> FOTO
                            </button>
                          </div>
                        </div>

                      </div>

                      {/* Card Bottom Footer */}
                      <div className="px-4 py-3 bg-slate-950 border-t border-slate-800/60 rounded-b-2xl flex justify-between items-center text-[11px]">
                        <div>
                          {isRoteirizado ? (
                            <span className="text-cyan-455 font-bold font-mono text-[10px] flex items-center gap-1">
                              🔄 ROTEIRIZADO HOJE
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono text-[10px] uppercase">
                              Não roteirizado
                            </span>
                          )}
                        </div>

                        {/* Modificadores */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditInit(v)}
                            className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded font-semibold text-xs flex items-center gap-1 transition"
                            title="Modificar veículo"
                          >
                            <Edit className="w-3 h-3" /> Editar
                          </button>
                          
                          {/* Excluir represents Master admin privileges */}
                          {(userRole === "admin_master" || userEmail === "adciadsetatupirama@gmail.com") ? (
                            <button
                              onClick={() => handleDelete(v.id)}
                              className="p-1 px-2 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition font-bold"
                              title="Apagar veículo"
                            >
                              Remover
                            </button>
                          ) : null}
                        </div>
                      </div>

                    </div>
                  );
                })}

                {filteredVeiculos.length === 0 && (
                  <div className="col-span-full py-16 text-center text-slate-500 font-mono text-xs bg-slate-900 border border-slate-850 rounded-2xl">
                    Sem registros de veículos com os filtros ou placa ativa.
                  </div>
                )}
              </div>
            )}

            {/* LIST DISPLAY TABLE MODE */}
            {viewMode === "list" && (
              <div className="bg-slate-900 rounded-xl border border-slate-850 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 border-b border-slate-850 text-[10px] font-mono uppercase">
                        <th className="py-3 px-4">Prefixo / Placa</th>
                        <th className="py-3 px-4">Modelo / Tipo</th>
                        <th className="py-3 px-4">Motorista</th>
                        <th className="py-3 px-4">Unidade</th>
                        <th className="py-3 px-4">Disponibilidade</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/80">
                      {filteredVeiculos.map((v) => {
                        const assignedDriverObj = motoristas.find(m => m.id === v.motoristaId);
                        const parsedStatus = getCalculatedStatus(v);
                        const isRoteirizado = disps?.some(d => d.veiculoId === v.id && d.roteirizado && d.data === selectedDate) ||
                                              rotas?.some(r => r.veiculoId === v.id && r.data === selectedDate);
                        const associatedUnit = unidades.find(u => u.id === v.unidadeId);

                        return (
                          <tr key={v.id} className="hover:bg-slate-850/20 text-slate-300 font-sans transition">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-white font-mono">{v.prefixo || `PR-${v.placa.slice(-3)}`}</div>
                              <div className="text-[10px] text-slate-500 font-mono select-all uppercase">{v.placa}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-200">{v.modelo}</div>
                              <div className="text-[10px] text-slate-500 font-mono uppercase">{v.perfil} • {v.tipo}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              {assignedDriverObj ? (
                                <div className="flex flex-col gap-0.5">
                                  <div className="font-semibold text-white">👤 {assignedDriverObj.nome}</div>
                                  <button
                                    type="button"
                                    id={`tbl-unbind-${v.id}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveDriver(v.id);
                                    }}
                                    className="text-[9px] text-rose-450 hover:text-rose-350 font-bold block text-left uppercase tracking-wider select-none cursor-pointer mt-0.5"
                                  >
                                    ❌ Desvincular
                                  </button>
                                </div>
                              ) : (
                                <div className="text-slate-500 italic">Nenhum vinculado</div>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="text-slate-400 font-medium">🏢 {associatedUnit ? associatedUnit.nome : v.unidadeId}</div>
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                              {isRoteirizado ? (
                                <span className="text-cyan-450 font-bold uppercase text-[9px] bg-cyan-950/25 border border-cyan-900/30 px-1.5 py-0.5 rounded">
                                  Roteirizado
                                </span>
                              ) : parsedStatus === "LIBERADO" ? (
                                <span className="text-emerald-450 font-bold uppercase text-[9px] bg-emerald-950/25 border border-emerald-900/30 px-1.5 py-0.5 rounded">
                                  Livre p/ Rota
                                </span>
                              ) : (
                                <span className="text-slate-500 font-mono text-[9px]">Não operacional</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                parsedStatus === "LIBERADO" 
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" 
                                  : parsedStatus === "PENDENTE" 
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/10" 
                                    : "bg-rose-500/10 text-rose-450 border border-rose-500/10"
                              }`}>
                                {parsedStatus}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleEditInit(v)}
                                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                                  title="Editar veículo"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                {(userRole === "admin_master" || userEmail === "adciadsetatupirama@gmail.com") && (
                                  <button
                                    onClick={() => handleDelete(v.id)}
                                    className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                                    title="Remover veículo"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {filteredVeiculos.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-16 text-center text-slate-500 font-mono text-xs">
                            Nenhum veículo operativo localizado na tabela de frotas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* DETAILED ATTACHMENT FILE DOWNLOAD PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-slate-950 px-5 py-4 border-b border-slate-850 flex justify-between items-center">
              <h3 className="text-white text-xs font-bold font-mono tracking-wider uppercase flex items-center gap-1.5/2 justify-center">
                📄 Visualização de Documento Anexo
              </h3>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-white font-mono text-xs border border-slate-800 hover:bg-slate-850 px-2.5 py-1 rounded"
              >
                Fechar
              </button>
            </div>
            {/* Content body */}
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-sky-600/10 text-sky-400 rounded-full flex items-center justify-center mx-auto border border-sky-500/20">
                <FileText className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-white text-sm font-bold tracking-tight">{previewDoc.title}</h4>
                <p className="text-xs text-slate-500 font-mono mt-1 break-all bg-slate-955 p-2 rounded border border-slate-850">
                  📎 {previewDoc.filename || "Anexo_Salvo_Banco.pdf"}
                </p>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Este arquivo está gravado de forma persistente com integridade referencial ao veículo. Você pode realizar o download ou checar histórico.
              </p>
              
              <div className="flex gap-2 pt-2">
                <a
                  href={`#download-${previewDoc.filename}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setNotification({
                      type: "success",
                      message: `💾 Download iniciado para: ${previewDoc.filename}`
                    });
                  }}
                  className="flex-1 py-2 bg-sky-600 hover:bg-sky-550 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1 transition"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar Cópia
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold rounded-lg text-xs transition"
                >
                  Ok, entendi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALS PERSISTENCE */}
      <NotificationModal notification={notification} onClose={() => setNotification(null)} />
      <ConfirmModal confirm={confirmDialog} onClose={() => setConfirmDialog(null)} />

      {/* Driver Conflict Overlay Modal */}
      {conflictData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full mx-4 shadow-2xl space-y-4 text-left">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center border border-amber-500/20 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-extrabold text-base tracking-tight">⚠ Motorista já vinculado</h3>
                <p className="text-[10px] text-slate-500 font-mono">Conflito de exclusividade</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs font-sans leading-relaxed text-slate-350">
              <p>
                O motorista <strong className="text-sky-400 select-all font-semibold">{conflictData.driverName}</strong> já está vinculado ao veículo ativo:
              </p>
              <div className="bg-slate-955 p-3 rounded-lg border border-slate-850/60 space-y-1 font-mono text-[11px] leading-relaxed">
                <div><span className="text-slate-500">Placa:</span> <strong className="text-white select-all">{conflictData.vehiclePlaca}</strong></div>
                <div><span className="text-slate-500">Prefixo / Pref:</span> <strong className="text-white">{conflictData.vehiclePrefixo}</strong></div>
                <div><span className="text-slate-500">Modelo:</span> <strong className="text-white">{conflictData.vehicleModelo}</strong></div>
                <div><span className="text-slate-500">Unidade:</span> <strong className="text-white">{conflictData.vehicleUnidade}</strong></div>
              </div>
              <p className="text-[11px] text-slate-400 italic">
                Para vincular este motorista a outro veículo é necessário removê-lo primeiro do veículo atual ou transferi-lo abaixo.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const foundVeic = veiculos.find(v => v.id === conflictData.vehicleId);
                    setConflictData(null);
                    if (foundVeic) {
                      setFilterPlaca(foundVeic.placa);
                      handleEditInit(foundVeic);
                    }
                  }}
                  className="py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-705 text-slate-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5 text-sky-450" />
                  Visualizar Veículo
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setConflictData(null);
                    setConfirmDialog({
                      message: `Deseja transferir o motorista ${conflictData.driverName} para este veículo (${placa.toUpperCase()})?`,
                      onConfirm: async () => {
                        await executeSave(true);
                      }
                    });
                  }}
                  className="py-2.5 bg-sky-650 hover:bg-sky-550 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer animate-pulse"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  Transferir Motorista
                </button>
              </div>

              <button
                type="button"
                onClick={() => setConflictData(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Voltar / Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
