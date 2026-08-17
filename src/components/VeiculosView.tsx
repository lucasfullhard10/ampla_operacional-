import React, { useState, useEffect } from "react";
import { 
  Plus, Trash, Edit, Check, AlertCircle, FileText, Search, User, 
  ShieldAlert, LayoutGrid, List, Calendar, Wrench, Percent, 
  Building, BarChart3, PieChart as PieChartIcon, Eye, Download, 
  ChevronDown, CheckCircle2, AlertTriangle, FileUp, Info, ArrowLeftRight,
  Disc, Filter, Fuel, RotateCcw, UserMinus, Paperclip, Camera, Settings,
  ShieldCheck, FileSearch, X, Folder, Truck, RefreshCw
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import { Veiculo, Motorista, Unidade } from "../types";
import { NotificationModal, ConfirmModal, NotificationType, ConfirmType } from "./NotificationModal";
import SafeResponsiveContainer from "./SafeResponsiveContainer";
import { openDocumentOrNotify } from "../lib/documents";

interface VeiculosProps {
  veiculos: Veiculo[];
  motoristas: Motorista[];
  unidades: Unidade[];
  disps?: any[];
  rotas?: any[];
  manutencoes?: any[];
  abastecimentos?: any[];
  vales?: any[];
  fechamentosDt?: any[];
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
  abastecimentos = [],
  vales = [],
  fechamentosDt = [],
  userRole, 
  onRefresh, 
  userEmail 
}: VeiculosProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"gestao" | "dashboard">("gestao");
  
  // Visual modes
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);

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

  // Phase 10 States
  const [chassi, setChassi] = useState("");
  const [combustivel, setCombustivel] = useState("Diesel");
  const [capacidade, setCapacidade] = useState("");
  const [antt, setAntt] = useState("");
  const [anttVencimento, setAnttVencimento] = useState("");
  const [anttUrl, setAnttUrl] = useState("");
  const [documentacaoObservacoes, setDocumentacaoObservacoes] = useState("");

  const [selectedVehicleForDetails, setSelectedVehicleForDetails] = useState<Veiculo | null>(null);
  const [detailTab, setDetailTab] = useState<"geral" | "documentacao" | "manutencoes" | "abastecimentos" | "financeiro" | "rotas">("geral");

  // Fuel Form states inside details
  const [refuelData, setRefuelData] = useState(() => new Date().toISOString().split("T")[0]);
  const [refuelLitros, setRefuelLitros] = useState<number | "">("");
  const [refuelValor, setRefuelValor] = useState<number | "">("");
  const [refuelPosto, setRefuelPosto] = useState("");
  const [refuelCombustivel, setRefuelCombustivel] = useState("Diesel");
  const [refuelOdometro, setRefuelOdometro] = useState<number | "">("");
  const [refuelMotoristaId, setRefuelMotoristaId] = useState("");
  const [refuelObservacoes, setRefuelObservacoes] = useState("");
  const [isAddingRefuel, setIsAddingRefuel] = useState(false);

  // Maint Form states inside details
  const [maintTipo, setMaintTipo] = useState<"Preventiva" | "Corretiva">("Preventiva");
  const [maintData, setMaintData] = useState(() => new Date().toISOString().split("T")[0]);
  const [maintObservacao, setMaintObservacao] = useState("");
  const [maintProximaData, setMaintProximaData] = useState("");
  const [maintCategoria, setMaintCategoria] = useState("Revisão Periódica");
  const [maintQuilometragem, setMaintQuilometragem] = useState<number | "">("");
  const [maintProximaQuilometragem, setMaintProximaQuilometragem] = useState<number | "">("");
  const [maintValor, setMaintValor] = useState<number | "">("");
  const [maintOficina, setMaintOficina] = useState("");
  const [maintFornecedor, setMaintFornecedor] = useState("");
  const [maintResponsavel, setMaintResponsavel] = useState("");
  const [isAddingMaint, setIsAddingMaint] = useState(false);

  const handleVehicleFileRead = (event: React.ChangeEvent<HTMLInputElement>, setter: (value: string) => void) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setter(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => setNotification({ type: "error", message: "Não foi possível ler o documento selecionado." });
    reader.readAsDataURL(file);
  };

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

    // New Phase 10 fields
    setChassi("");
    setCombustivel("Diesel");
    setCapacidade("");
    setAntt("");
    setAnttVencimento("");
    setAnttUrl("");
    setDocumentacaoObservacoes("");
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

    // New Phase 10 fields
    setChassi(v.chassi || "");
    setCombustivel(v.combustivel || "Diesel");
    setCapacidade(v.capacidade || "");
    setAntt(v.antt || "");
    setAnttVencimento(v.anttVencimento || "");
    setAnttUrl(v.anttUrl || "");
    setDocumentacaoObservacoes(v.documentacaoObservacoes || "");
  };

  // Dynamic automatic status calculator
  const getCalculatedStatus = (v: Veiculo) => {
    const today = selectedDate ? new Date(selectedDate) : new Date();
    today.setHours(0, 0, 0, 0);

    const licDate = v.licenciamentoVencimento ? new Date(v.licenciamentoVencimento) : null;
    const segDate = v.seguroVencimento ? new Date(v.seguroVencimento) : null;
    const proxMaintDate = v.proximaManutencao ? new Date(v.proximaManutencao) : null;
    const anttDate = v.anttVencimento ? new Date(v.anttVencimento) : null;

    const isLicExpired = licDate && licDate < today;
    const isSegExpired = segDate && segDate < today;
    const isMaintCriticalExpired = proxMaintDate && proxMaintDate < today;
    const isAnttExpired = anttDate && anttDate < today;

    // BLOQUEADO if: CRLV expired, Seguro expired, ANTT expired, flagged Bloqueado or crit maintenance expired
    if (v.status === "Bloqueado" || isLicExpired || isSegExpired || isMaintCriticalExpired || isAnttExpired) {
      return "BLOQUEADO";
    }

    // PENDENTE if: documentacaoStatus is Pendente, or nearing vencimento within 15 days, or admin flagged Pendente
    const isLicSoon = licDate && (licDate.getTime() - today.getTime()) < 15 * 24 * 60 * 60 * 1000;
    const isSegSoon = segDate && (segDate.getTime() - today.getTime()) < 15 * 24 * 60 * 60 * 1000;
    const isMaintSoon = proxMaintDate && (proxMaintDate.getTime() - today.getTime()) < 15 * 24 * 60 * 60 * 1000;
    const isAnttSoon = anttDate && (anttDate.getTime() - today.getTime()) < 15 * 24 * 60 * 60 * 1000;

    if (
      v.status === "Pendente" ||
      v.documentacaoStatus === "Pendente" ||
      isLicSoon ||
      isSegSoon ||
      isMaintSoon ||
      isAnttSoon
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

  // Handlers for Phase 10 details actions
  const handleAddMaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleForDetails) return;
    const v = veiculos.find(x => x.id === selectedVehicleForDetails.id) || selectedVehicleForDetails;
    const payload = {
      veiculoId: v.id,
      placa: v.placa,
      tipo: maintTipo,
      data: maintData,
      observacao: maintObservacao,
      categoria: maintCategoria,
      quilometragemAtual: Number(maintQuilometragem || v.quilometragemAtual || 0),
      proximaQuilometragem: Number(maintProximaQuilometragem || (Number(maintQuilometragem || v.quilometragemAtual || 0) + 10000)),
      proximaManutencao: maintProximaData || new Date(new Date(maintData).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      valorManutencao: Number(maintValor || 0),
      oficina: maintOficina,
      fornecedor: maintFornecedor,
      responsavel: maintResponsavel
    };

    try {
      const res = await fetch("/api/manutencao", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setNotification({ type: "success", message: "Manutenção gravada com sucesso!" });
        setIsAddingMaint(false);
        setMaintObservacao("");
        setMaintProximaData("");
        setMaintQuilometragem("");
        setMaintProximaQuilometragem("");
        setMaintValor("");
        setMaintOficina("");
        setMaintFornecedor("");
        setMaintResponsavel("");
        onRefresh();
      } else {
        throw new Error();
      }
    } catch {
      setNotification({ type: "error", message: "Erro ao salvar a manutenção." });
    }
  };

  const handleDeleteMaint = async (maintId: string) => {
    if (!window.confirm("Deseja realmente excluir esta ordem de serviço/manutenção?")) return;
    try {
      const res = await fetch(`/api/manutencao/${maintId}`, {
        method: "DELETE",
        headers: {
          "x-user-email": userEmail
        }
      });
      if (res.ok) {
        setNotification({ type: "success", message: "Ordem de serviço excluída!" });
        onRefresh();
      } else {
        throw new Error();
      }
    } catch {
      setNotification({ type: "error", message: "Erro ao excluir manutenção." });
    }
  };

  const handleAddRefuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleForDetails) return;
    const v = veiculos.find(x => x.id === selectedVehicleForDetails.id) || selectedVehicleForDetails;
    const driver = motoristas.find(m => m.id === v.motoristaId);
    
    const payload = {
      veiculoId: v.id,
      placa: v.placa,
      data: refuelData,
      motoristaId: v.motoristaId || "",
      motoristaNome: driver ? driver.nome : "N/A",
      litros: Number(refuelLitros || 0),
      valor: Number(refuelValor || 0),
      posto: refuelPosto || "Posto Credenciado",
      combustivel: refuelCombustivel,
      odometro: Number(refuelOdometro || 0),
      observacoes: refuelObservacoes,
      unidadeId: v.unidadeId
    };

    try {
      const res = await fetch("/api/abastecimentos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setNotification({ type: "success", message: "Abastecimento registrado com sucesso!" });
        setIsAddingRefuel(false);
        setRefuelLitros("");
        setRefuelValor("");
        setRefuelPosto("");
        setRefuelOdometro("");
        setRefuelObservacoes("");
        onRefresh();
      } else {
        throw new Error();
      }
    } catch {
      setNotification({ type: "error", message: "Erro ao registrar o abastecimento." });
    }
  };

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
      documentoCRLVUrl: docCRLV || undefined,
      documentoCRVUrl: docCRV || undefined,
      seguroUrl: docSeguro || undefined,
      licenciamentoUrl: docLicenciamento || undefined,
      fotoVeiculoUrl: docFoto || undefined,
      transferDriver,

      // New Phase 10 fields
      chassi,
      combustivel,
      capacidade,
      antt,
      anttVencimento,
      anttUrl: anttUrl || undefined,
      documentacaoObservacoes
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
          message: "Registro salvo com sucesso."
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
            message: `Erro no cadastro: ${error.message || error.error || "Operação recusada pelo banco de dados."}`
          });
        }
      }
    } catch (err) {
      setNotification({
        type: "error",
        message: `Falha de rede: ${err instanceof Error ? err.message : String(err)}`
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
          message: "Motorista removido e liberado imediatamente com sucesso no banco de dados."
        });
        if (veiculoId === editingId) {
          setMotoristaId("");
        }
        onRefresh();
      } else {
        const error = await res.json();
        setNotification({
          type: "error",
          message: `Erro ao desvincular: ${error.message || "Operação recusada."}`
        });
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: `Falha na comunicação: ${err.message}`
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
            setNotification({ type: "success", message: "Veículo removido com sucesso do banco." });
            onRefresh();
          } else {
            const error = await res.json();
            setNotification({ type: "error", message: `Erro ao remover: ${error.message || "Remoção negada."}` });
          }
        } catch (e) {
          setNotification({ type: "error", message: "Erro ao excluir do banco." });
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
            <span className="p-1.5 bg-sky-600/20 text-sky-400 rounded-lg"><Truck className="w-5 h-5" /></span>
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
              <div className="h-[300px] min-h-[300px]">
                <SafeResponsiveContainer minHeight={300}>
                  <BarChart data={chartPerfilData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                    <YAxis stroke="#64748b" fontSize={9} />
                    <Tooltip isAnimationActive={false} contentStyle={{ backgroundColor: "#020617", borderColor: "#334155" }} />
                    <Bar dataKey="Quantidade" fill="#0284c7" radius={[4, 4, 0, 0]}>
                      {chartPerfilData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#0284c7" : "#0ea5e9"} />
                      ))}
                    </Bar>
                  </BarChart>
                </SafeResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Status da Frota */}
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                Distribuição de Status Operacional
              </h3>
              <div className="h-[300px] min-h-[300px] flex items-center justify-center">
                <SafeResponsiveContainer minHeight={300}>
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
                    <Tooltip isAnimationActive={false} contentStyle={{ backgroundColor: "#020617", borderColor: "#334155" }} />
                  </PieChart>
                </SafeResponsiveContainer>
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
              <div className="h-[300px] min-h-[300px]">
                <SafeResponsiveContainer minHeight={300}>
                  <BarChart data={chartUnidadeData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                    <YAxis stroke="#64748b" fontSize={9} unit="%" />
                    <Tooltip isAnimationActive={false} contentStyle={{ backgroundColor: "#020617", borderColor: "#334155" }} />
                    <Bar dataKey="Utilização" fill="#eab308" radius={[4, 4, 0, 0]}>
                      {chartUnidadeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.Utilização >= 85 ? "#10b981" : entry.Utilização >= 60 ? "#0284c7" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </SafeResponsiveContainer>
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
              <h3 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-sky-400" />
                Filtros Avançados
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
            
            {/* COMPREHENSIVE VEHICLE DETAILS SHEET (Phase 10) */}
            {selectedVehicleForDetails ? (() => {
              const v = veiculos.find(x => x.id === selectedVehicleForDetails.id) || selectedVehicleForDetails;
              const assignedDriverObj = motoristas.find(m => m.id === v.motoristaId);
              const associatedUnit = unidades.find(u => u.id === v.unidadeId);
              const parsedStatus = getCalculatedStatus(v);
              
              // Refuels
              const vAbs = abastecimentos.filter(a => a.veiculoId === v.id || a.placa === v.placa);
              const totalLiters = vAbs.reduce((sum, a) => sum + (a.litros || 0), 0);
              const totalFuelCost = vAbs.reduce((sum, a) => sum + (a.valor || 0), 0);
              
              // Sort fuel entries by odometer to get real average consumption
              const sortedAbs = [...vAbs].sort((a, b) => a.odometro - b.odometro);
              let avgConsumption = "N/A";
              if (sortedAbs.length > 1 && totalLiters > 0) {
                const odoDiff = sortedAbs[sortedAbs.length - 1].odometro - sortedAbs[0].odometro;
                if (odoDiff > 0) {
                  avgConsumption = (odoDiff / totalLiters).toFixed(2) + " km/L";
                }
              } else if (v.perfil === "Carreta" || v.perfil === "Truck") {
                avgConsumption = "2.80 km/L (Est.)";
              } else if (v.perfil === "Van" || v.perfil === "Utilitário") {
                avgConsumption = "9.50 km/L (Est.)";
              } else {
                avgConsumption = "5.20 km/L (Est.)";
              }

              // Maintenance
              const vMaints = manutencoes.filter(m => m.veiculoId === v.id || m.placa === v.placa);
              const totalMaintCost = vMaints.reduce((sum, m) => sum + (m.valorManutencao || 0), 0);

              // Financial closures
              const closures = fechamentosDt.filter(f => f.veiculoId === v.id || f.placa?.toUpperCase() === v.placa?.toUpperCase());
              const totalFreight = closures.reduce((sum, f) => sum + (f.freteValor || 0) + (f.disponibilidadeValor || 0) + (f.diariasBonificacoes || 0) + (f.outrosCreditos || 0), 0);
              const totalAdvances = closures.reduce((sum, f) => sum + (f.adiantamentos || 0), 0);
              const totalDiscounts = closures.reduce((sum, f) => sum + (f.multasDescontos || 0), 0);
              const totalNetValue = totalFreight - totalAdvances - totalDiscounts;

              const vVales = vales.filter(vl => vl.veiculoId === v.id || vl.placa?.toUpperCase() === v.placa?.toUpperCase());
              const totalValesSum = vVales.reduce((sum, vl) => sum + (vl.valor || 0), 0);

              // Routes history
              const vRoutes = rotas.filter(r => r.veiculoId === v.id || r.placa?.toUpperCase() === v.placa?.toUpperCase());
              
              // Odômetro atualizado
              const maxOdometerLog = Math.max(v.quilometragemAtual || 0, ...vAbs.map(a => a.odometro || 0), ...vMaints.map(m => m.quilometragemAtual || 0));

              // Dates calculations for alerts
              const today = new Date(selectedDate);
              today.setHours(0,0,0,0);
              const isCRLVExpired = v.licenciamentoVencimento && new Date(v.licenciamentoVencimento) < today;
              const isSegExpired = v.seguroVencimento && new Date(v.seguroVencimento) < today;
              const isAnttExpired = v.anttVencimento && new Date(v.anttVencimento) < today;

              return (
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-6">
                  {/* Detailed Page Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedVehicleForDetails(null)}
                        className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition"
                        title="Voltar para a listagem"
                      >
                        <Plus className="w-4 h-4 rotate-45" /> {/* Simple back cross indicator */}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-white text-slate-950 font-extrabold px-2 py-0.5 rounded text-sm font-mono tracking-wider border border-slate-300">
                            {v.placa}
                          </span>
                          <span className="bg-slate-950 text-slate-400 font-bold px-1.5 py-0.5 rounded text-xs font-mono border border-slate-850">
                            Pref: {v.prefixo || `PR-${v.placa.slice(-3)}`}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                            parsedStatus === "LIBERADO" 
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                              : parsedStatus === "PENDENTE" 
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                                : "bg-rose-500/10 text-rose-450 border-rose-500/20"
                          }`}>
                            ● {parsedStatus}
                          </span>
                        </div>
                        <h3 className="text-white text-base font-bold mt-1.5 font-sans">
                          {v.marca || "Fabricante"} {v.modelo} <span className="text-slate-500 text-xs font-mono font-normal">• {v.perfil}</span>
                        </h3>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          handleEditInit(v);
                          setSelectedVehicleForDetails(null);
                        }}
                        className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <Edit className="w-3.5 h-3.5" /> Editar Cadastro
                      </button>
                    </div>
                  </div>

                  {/* Operational compliance warnings panel */}
                  {(isCRLVExpired || isSegExpired || isAnttExpired) && (
                    <div className="bg-rose-500/5 border border-rose-500/15 rounded-xl p-3.5 space-y-2">
                      <h4 className="text-xs font-bold text-rose-450 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-450 shrink-0" /> Restrições Documentais Ativas (Auto-Bloqueio)
                      </h4>
                      <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside font-sans pl-1">
                        {isCRLVExpired && <li className="text-rose-300">Licenciamento CRLV vencido em <strong className="font-mono">{new Date(v.licenciamentoVencimento).toLocaleDateString("pt-BR")}</strong>.</li>}
                        {isSegExpired && <li className="text-rose-300">Seguro de frota vencido em <strong className="font-mono">{new Date(v.seguroVencimento).toLocaleDateString("pt-BR")}</strong>.</li>}
                        {isAnttExpired && <li className="text-rose-300">Registro ANTT vencido em <strong className="font-mono">{new Date(v.anttVencimento!).toLocaleDateString("pt-BR")}</strong>.</li>}
                      </ul>
                    </div>
                  )}

                  {/* Single Vehicle Stats Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                      <span className="text-[10px] text-slate-500 font-bold block font-mono">ÚLTIMO ODÔMETRO</span>
                      <strong className="text-base text-white font-mono block mt-1">{maxOdometerLog.toLocaleString("pt-BR")} Km</strong>
                      <span className="text-[9px] text-slate-500 block">Atualizado por registros</span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                      <span className="text-[10px] text-slate-500 font-bold block font-mono">CONSUMO MÉDIO</span>
                      <strong className="text-base text-sky-400 font-mono block mt-1">{avgConsumption}</strong>
                      <span className="text-[9px] text-slate-500 block">Histórico de abastecimentos</span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                      <span className="text-[10px] text-slate-500 font-bold block font-mono">FATURAMENTO (DTs)</span>
                      <strong className="text-base text-emerald-400 font-mono block mt-1">R$ {totalFreight.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                      <span className="text-[9px] text-slate-500 block">{closures.length} viagens encerradas</span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                      <span className="text-[10px] text-slate-500 font-bold block font-mono">CUSTO MANUTENÇÃO</span>
                      <strong className="text-base text-amber-500 font-mono block mt-1">R$ {totalMaintCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                      <span className="text-[9px] text-slate-500 block">{vMaints.length} ordens de serviço</span>
                    </div>
                  </div>

                  {/* Tabs navigation */}
                  <div className="flex border-b border-slate-800 overflow-x-auto gap-2 py-0.5 select-none no-scrollbar">
                    {(["geral", "documentacao", "manutencoes", "abastecimentos", "financeiro", "rotas"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setDetailTab(tab)}
                        className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 font-mono whitespace-nowrap transition cursor-pointer ${
                          detailTab === tab 
                            ? "border-sky-500 text-sky-400 font-bold" 
                            : "border-transparent text-slate-450 hover:text-white"
                        }`}
                      >
                        {tab === "geral" && "Dados Gerais"}
                        {tab === "documentacao" && "Documentação"}
                        {tab === "manutencoes" && "Manutenções"}
                        {tab === "abastecimentos" && "Abastecimentos"}
                        {tab === "financeiro" && "Financeiro"}
                        {tab === "rotas" && "Viagens"}
                      </button>
                    ))}
                  </div>

                  {/* Tab Contents */}
                  <div className="space-y-4">
                    {/* TAB: Dados Gerais */}
                    {detailTab === "geral" && (
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300 font-sans">
                        <div className="space-y-3">
                          <h4 className="text-sm font-bold text-white border-b border-slate-850 pb-1.5 uppercase font-mono tracking-wider">Especificações Técnicas</h4>
                          <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                            <div>
                              <span className="text-slate-500 block font-mono text-[10px]">PLACA</span>
                              <strong className="text-white text-xs">{v.placa}</strong>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-mono text-[10px]">PREFIXO</span>
                              <strong className="text-white text-xs">{v.prefixo || "N/A"}</strong>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-mono text-[10px]">MARCA / MODELO</span>
                              <strong className="text-white text-xs">{v.marca || "Fabricante"} - {v.modelo}</strong>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-mono text-[10px]">ANO FABRICAÇÃO</span>
                              <strong className="text-white text-xs">{v.ano}</strong>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-mono text-[10px]">PERFIL / PORTE</span>
                              <strong className="text-white text-xs">{v.perfil}</strong>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-mono text-[10px]">REGIME OPERACIONAL</span>
                              <strong className="text-white text-xs">{v.tipo}</strong>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-mono text-[10px]">CHASSI</span>
                              <strong className="text-white text-xs font-mono">{v.chassi || "NÃO CADASTRADO"}</strong>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-mono text-[10px]">CAPACIDADE</span>
                              <strong className="text-white text-xs">{v.capacidade || "N/A"}</strong>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-mono text-[10px]">COMBUSTÍVEL PADRÃO</span>
                              <strong className="text-white text-xs">{v.combustivel || "Diesel"}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-sm font-bold text-white border-b border-slate-850 pb-1.5 uppercase font-mono tracking-wider">Vínculos Administrativos</h4>
                          <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                            <div>
                              <span className="text-slate-500 block font-mono text-[10px]">MOTORISTA HABITUAL</span>
                              <strong className="text-white text-xs flex items-center gap-1">{assignedDriverObj ? <><User className="w-3.5 h-3.5 text-sky-400" /> {assignedDriverObj.nome}</> : "Nenhum condutor fixo"}</strong>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-mono text-[10px]">FILIAL DE ALOCAÇÃO</span>
                              <strong className="text-white text-xs flex items-center gap-1"><Building className="w-3.5 h-3.5 text-sky-400" /> {associatedUnit ? associatedUnit.nome : `Filial ${v.unidadeId}`}</strong>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-mono text-[10px]">DATA DE ÚLTIMA REVISÃO</span>
                              <strong className="text-white text-xs font-mono">{v.ultimaRevisao ? new Date(v.ultimaRevisao).toLocaleDateString("pt-BR") : "N/A"}</strong>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-mono text-[10px]">ÚLTIMA TROCA DE ÓLEO</span>
                              <strong className="text-white text-xs font-mono">{v.ultimaTrocaOleo ? new Date(v.ultimaTrocaOleo).toLocaleDateString("pt-BR") : "N/A"}</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB: Documentação */}
                    {detailTab === "documentacao" && (
                      <div className="space-y-4">
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4">
                          <h4 className="text-sm font-bold text-white uppercase font-mono tracking-wider">Controle de Validade dos Documentos</h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                            {/* CRLV */}
                            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex justify-between items-center">
                              <div>
                                <span className="text-slate-500 text-[10px] block font-mono">LICENCIAMENTO (CRLV)</span>
                                <strong className="text-white font-mono">{v.licenciamentoVencimento ? new Date(v.licenciamentoVencimento).toLocaleDateString("pt-BR") : "N/A"}</strong>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase ${isCRLVExpired ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                                  {isCRLVExpired ? "Vencido" : "✓ Válido"}
                                </span>
                                <button
                                  onClick={() => openDocumentOrNotify(v.documentoCRLVUrl)}
                                  className="p-1.5 bg-slate-950 hover:bg-slate-800 text-sky-400 rounded transition border border-slate-800"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* SEGURO */}
                            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex justify-between items-center">
                              <div>
                                <span className="text-slate-500 text-[10px] block font-mono">APÓLICE DE SEGURO FROTA</span>
                                <strong className="text-white font-mono">{v.seguroVencimento ? new Date(v.seguroVencimento).toLocaleDateString("pt-BR") : "N/A"}</strong>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase ${isSegExpired ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                                  {isSegExpired ? "Vencido" : "✓ Ativo"}
                                </span>
                                <button
                                  onClick={() => openDocumentOrNotify(v.seguroUrl)}
                                  className="p-1.5 bg-slate-950 hover:bg-slate-800 text-sky-400 rounded transition border border-slate-800"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* ANTT */}
                            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex justify-between items-center">
                              <div>
                                <span className="text-slate-500 text-[10px] block font-mono">REGISTRO ANTT ({v.antt || "NÃO INFORMADO"})</span>
                                <strong className="text-white font-mono">{v.anttVencimento ? new Date(v.anttVencimento).toLocaleDateString("pt-BR") : "NÃO INFORMADO"}</strong>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase ${isAnttExpired ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                                  {isAnttExpired ? "Vencido" : "✓ Válido"}
                                </span>
                                <button
                                  onClick={() => openDocumentOrNotify(v.anttUrl)}
                                  className="p-1.5 bg-slate-950 hover:bg-slate-800 text-sky-400 rounded transition border border-slate-800"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* OUTROS DOCUMENTOS */}
                            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex justify-between items-center">
                              <div>
                                <span className="text-slate-500 text-[10px] block font-mono">TÍTULO DE PROPRIEDADE (CRV)</span>
                                <strong className="text-white">Recibo CRV / Compra e Venda</strong>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openDocumentOrNotify(v.documentoCRVUrl)}
                                  className="p-1.5 bg-slate-950 hover:bg-slate-800 text-sky-400 rounded transition border border-slate-800"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {v.documentacaoObservacoes && (
                            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800/60 text-xs">
                              <span className="text-slate-500 font-mono text-[9px] uppercase flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-amber-400" /> Observações de Pendências:
                              </span>
                              <p className="text-slate-300 italic mt-0.5">{v.documentacaoObservacoes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB: Manutenções */}
                    {detailTab === "manutencoes" && (
                      <div className="space-y-4">
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-bold text-white uppercase font-mono tracking-wider">Histórico Mecânico</h4>
                            <button
                              onClick={() => {
                                setIsAddingMaint(!isAddingMaint);
                                // Set initial values
                                setMaintData(selectedDate);
                                setMaintTipo("Preventiva");
                                setMaintQuilometragem(maxOdometerLog);
                              }}
                              className="px-3 py-1 bg-sky-600 hover:bg-sky-550 text-white rounded font-semibold text-xs transition flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> {isAddingMaint ? "Fechar Formulário" : "Registrar Manutenção"}
                            </button>
                          </div>

                          {/* Quick Add Maint Form */}
                          {isAddingMaint && (
                            <form onSubmit={handleAddMaint} className="p-4 bg-slate-900 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-sans text-slate-300 font-sans text-xs">
                              <div className="space-y-1">
                                <label className="text-slate-455 block font-mono">Tipo</label>
                                <select
                                  value={maintTipo}
                                  onChange={(e) => setMaintTipo(e.target.value as any)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white"
                                >
                                  <option value="Preventiva">Preventiva</option>
                                  <option value="Corretiva">Corretiva</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-slate-455 block font-mono">Categoria</label>
                                <input
                                  type="text"
                                  placeholder="Ex: Troca de Freios, Motor"
                                  value={maintCategoria}
                                  onChange={(e) => setMaintCategoria(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-slate-455 block font-mono">Data Registro</label>
                                <input
                                  type="date"
                                  value={maintData}
                                  onChange={(e) => setMaintData(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-slate-455 block font-mono">Quilometragem Atual *</label>
                                <input
                                  type="number"
                                  value={maintQuilometragem}
                                  required
                                  onChange={(e) => setMaintQuilometragem(Number(e.target.value))}
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-slate-455 block font-mono">Vencimento Km (Próxima)</label>
                                <input
                                  type="number"
                                  placeholder="Ex: km atual + 10.000"
                                  value={maintQuilometragem && maintProximaQuilometragem === "" ? Number(maintQuilometragem) + 10000 : maintProximaQuilometragem}
                                  onChange={(e) => setMaintProximaQuilometragem(Number(e.target.value))}
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-slate-455 block font-mono">Vencimento Data (Próxima) *</label>
                                <input
                                  type="date"
                                  value={maintProximaData}
                                  required
                                  onChange={(e) => setMaintProximaData(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-slate-455 block font-mono">Valor Total Cobrado (R$) *</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  required
                                  placeholder="0.00"
                                  value={maintValor}
                                  onChange={(e) => setMaintValor(Number(e.target.value))}
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-slate-455 block font-mono">Oficina / Posto Credenciado</label>
                                <input
                                  type="text"
                                  value={maintOficina}
                                  onChange={(e) => setMaintOficina(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                                />
                              </div>

                              <div className="space-y-1 col-span-1 sm:col-span-1">
                                <label className="text-slate-455 block font-mono">Técnico Responsável</label>
                                <input
                                  type="text"
                                  placeholder="Assinatura mecânico"
                                  value={maintResponsavel}
                                  onChange={(e) => setMaintResponsavel(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                                />
                              </div>

                              <div className="space-y-1 sm:col-span-3">
                                <label className="text-slate-455 block font-mono">Observações da Ordem de Serviço</label>
                                <textarea
                                  rows={2}
                                  placeholder="Detalhes adicionais..."
                                  value={maintObservacao}
                                  onChange={(e) => setMaintObservacao(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                                />
                              </div>

                              <div className="sm:col-span-3 flex justify-end gap-2 pt-2 border-t border-slate-800">
                                <button
                                  type="button"
                                  onClick={() => setIsAddingMaint(false)}
                                  className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded font-semibold"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="submit"
                                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-550 text-white rounded font-semibold transition animate-fade-in"
                                >
                                  Gravar Ordem de Serviço
                                </button>
                              </div>
                            </form>
                          )}

                          {/* Maintenance History List */}
                          <div className="overflow-x-auto text-xs">
                            <table className="w-full border-collapse text-left text-slate-300">
                              <thead>
                                <tr className="bg-slate-950 text-slate-500 uppercase text-[9px] font-mono border-b border-slate-850">
                                  <th className="py-2.5 px-3">Data</th>
                                  <th className="py-2.5 px-3">Tipo / OS</th>
                                  <th className="py-2.5 px-3">Categoria</th>
                                  <th className="py-2.5 px-3">Oficina</th>
                                  <th className="py-2.5 px-3">Quilometragem</th>
                                  <th className="py-2.5 px-3 text-right">Valor</th>
                                  <th className="py-2.5 px-3 text-right">Ação</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-850">
                                {vMaints.map((m) => (
                                  <tr key={m.id} className="hover:bg-slate-900/40">
                                    <td className="py-2.5 px-3 font-mono">{new Date(m.data).toLocaleDateString("pt-BR")}</td>
                                    <td className="py-2.5 px-3">
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                                        m.tipo === "Preventiva" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                                      }`}>
                                        {m.tipo}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3">{m.categoria || "Geral / Preventiva"}</td>
                                    <td className="py-2.5 px-3 font-medium text-white">{m.oficina || "Mecânica Credenciada"}</td>
                                    <td className="py-2.5 px-3 font-mono">{m.quilometragemAtual?.toLocaleString("pt-BR") || maxOdometerLog} Km</td>
                                    <td className="py-2.5 px-3 text-right font-semibold font-mono text-white">
                                      R$ {Number(m.valorManutencao || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      <button
                                        onClick={() => handleDeleteMaint(m.id)}
                                        className="p-1 text-slate-600 hover:text-rose-450 transition"
                                        title="Excluir lançamento"
                                      >
                                        <Trash className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                {vMaints.length === 0 && (
                                  <tr>
                                    <td colSpan={7} className="py-8 text-center text-slate-500 italic font-mono">
                                      Nenhum registro mecânico ou preventiva agendada para esta frota.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB: Abastecimentos */}
                    {detailTab === "abastecimentos" && (
                      <div className="space-y-4">
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-bold text-white uppercase font-mono tracking-wider">Histórico de Abastecimentos</h4>
                            <button
                              onClick={() => {
                                setIsAddingRefuel(!isAddingRefuel);
                                setRefuelData(selectedDate);
                                setRefuelOdometro(maxOdometerLog);
                              }}
                              className="px-3 py-1 bg-sky-600 hover:bg-sky-550 text-white rounded font-semibold text-xs transition flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> {isAddingRefuel ? "Fechar Formulário" : "Registrar Abastecimento"}
                            </button>
                          </div>

                          {/* Quick Add Refuel Form */}
                          {isAddingRefuel && (
                            <form onSubmit={handleAddRefuel} className="p-4 bg-slate-900 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-sans text-slate-300 text-xs">
                              <div className="space-y-1">
                                <label className="text-slate-455 block font-mono">Data Registro</label>
                                <input
                                  type="date"
                                  value={refuelData}
                                  onChange={(e) => setRefuelData(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-slate-455 block font-mono">Combustível</label>
                                <select
                                  value={refuelCombustivel}
                                  onChange={(e) => setRefuelCombustivel(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white"
                                >
                                  <option value="Diesel">Diesel</option>
                                  <option value="Gasolina">Gasolina</option>
                                  <option value="Etanol">Etanol</option>
                                  <option value="GNV">GNV</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-slate-455 block font-mono">Quantidade Litros *</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  required
                                  value={refuelLitros}
                                  onChange={(e) => setRefuelLitros(Number(e.target.value))}
                                  placeholder="0.00"
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-slate-455 block font-mono">Valor Pago (R$) *</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  required
                                  value={refuelValor}
                                  onChange={(e) => setRefuelValor(Number(e.target.value))}
                                  placeholder="0.00"
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-slate-455 block font-mono">Odômetro (Km) *</label>
                                <input
                                  type="number"
                                  required
                                  value={refuelOdometro}
                                  onChange={(e) => setRefuelOdometro(Number(e.target.value))}
                                  placeholder="Ex: 154320"
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-slate-455 block font-mono">Posto de Combustível</label>
                                <input
                                  type="text"
                                  placeholder="Ex: Shell Rodovias"
                                  value={refuelPosto}
                                  onChange={(e) => setRefuelPosto(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                                />
                              </div>

                              <div className="space-y-1 sm:col-span-2">
                                <label className="text-slate-455 block font-mono">Observações</label>
                                <input
                                  type="text"
                                  placeholder="Observação ou placa adicional..."
                                  value={refuelObservacoes}
                                  onChange={(e) => setRefuelObservacoes(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                                />
                              </div>

                              <div className="sm:col-span-4 flex justify-end gap-2 pt-2 border-t border-slate-800">
                                <button
                                  type="button"
                                  onClick={() => setIsAddingRefuel(false)}
                                  className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded font-semibold"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="submit"
                                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-550 text-white rounded font-semibold transition"
                                >
                                  Gravar Abastecimento
                                </button>
                              </div>
                            </form>
                          )}

                          {/* Quick summary cards for Fuel */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                              <span className="text-slate-500 font-mono text-[9px] block">LITROS ABASTECIDOS</span>
                              <strong className="text-white text-sm font-mono">{totalLiters.toFixed(2)} L</strong>
                            </div>
                            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                              <span className="text-slate-500 font-mono text-[9px] block">TOTAL INVESTIDO</span>
                              <strong className="text-white text-sm font-mono font-bold">R$ {totalFuelCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                            </div>
                            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                              <span className="text-slate-500 font-mono text-[9px] block">PREÇO MÉDIO / LITRO</span>
                              <strong className="text-white text-sm font-mono">
                                R$ {totalLiters > 0 ? (totalFuelCost / totalLiters).toFixed(2) : "0.00"}
                              </strong>
                            </div>
                          </div>

                          {/* Abastecimentos List Table */}
                          <div className="overflow-x-auto text-xs">
                            <table className="w-full border-collapse text-left text-slate-300">
                              <thead>
                                <tr className="bg-slate-950 text-slate-500 uppercase text-[9px] font-mono border-b border-slate-850">
                                  <th className="py-2.5 px-3">Data</th>
                                  <th className="py-2.5 px-3">Posto</th>
                                  <th className="py-2.5 px-3">Combustível</th>
                                  <th className="py-2.5 px-3">Litros</th>
                                  <th className="py-2.5 px-3">Odômetro</th>
                                  <th className="py-2.5 px-3 text-right">Valor Total</th>
                                  <th className="py-2.5 px-3 text-right">Ação</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-850">
                                {sortedAbs.reverse().map((a) => (
                                  <tr key={a.id} className="hover:bg-slate-900/40">
                                    <td className="py-2.5 px-3 font-mono">{new Date(a.data).toLocaleDateString("pt-BR")}</td>
                                    <td className="py-2.5 px-3 font-medium text-white">{a.posto}</td>
                                    <td className="py-2.5 px-3 uppercase text-[10px] font-mono font-semibold text-sky-400">{a.combustivel}</td>
                                    <td className="py-2.5 px-3 font-mono">{Number(a.litros || 0).toFixed(2)} L</td>
                                    <td className="py-2.5 px-3 font-mono">{Number(a.odometro || 0).toLocaleString("pt-BR")} Km</td>
                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                                      R$ {Number(a.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      <button
                                        onClick={async () => {
                                          if (!window.confirm("Deseja realmente apagar este registro de combustível?")) return;
                                          try {
                                            const res = await fetch(`/api/abastecimentos/${a.id}`, { method: "DELETE" });
                                            if (res.ok) {
                                              setNotification({ type: "success", message: "Registro apagado!" });
                                              onRefresh();
                                            } else throw new Error();
                                          } catch {
                                            setNotification({ type: "error", message: "Erro ao apagar." });
                                          }
                                        }}
                                        className="p-1 text-slate-600 hover:text-rose-450 transition"
                                      >
                                        <Trash className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                {vAbs.length === 0 && (
                                  <tr>
                                    <td colSpan={7} className="py-8 text-center text-slate-500 italic font-mono">
                                      Nenhum registro de abastecimento para este veículo.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB: Financeiro */}
                    {detailTab === "financeiro" && (
                      <div className="space-y-4 font-sans text-xs text-slate-300">
                        {/* Summary panel */}
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4">
                          <h4 className="text-sm font-bold text-white uppercase font-mono tracking-wider">Balanço Financeiro Consolidado</h4>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                              <span className="text-slate-500 block font-mono text-[9px]">TOTAL FRETE FATURADO</span>
                              <strong className="text-base text-white font-mono mt-1 block">R$ {totalFreight.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                            </div>
                            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                              <span className="text-slate-500 block font-mono text-[9px]">TOTAL ADIANTAMENTOS</span>
                              <strong className="text-base text-rose-400 font-mono mt-1 block">R$ {totalAdvances.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                            </div>
                            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                              <span className="text-slate-500 block font-mono text-[9px]">DESCONTOS / MULTAS</span>
                              <strong className="text-base text-amber-500 font-mono mt-1 block">R$ {totalDiscounts.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                            </div>
                            <div className="p-3 bg-sky-950/20 border border-sky-900/30 rounded-lg">
                              <span className="text-sky-400 block font-mono text-[9px] font-bold">SALDO LÍQUIDO A PAGAR</span>
                              <strong className="text-base text-sky-400 font-mono mt-1 block">R$ {totalNetValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Tables */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                            <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Histórico de Fechamentos (DTs)</h4>
                            <div className="overflow-x-auto text-[11px]">
                              <table className="w-full border-collapse text-left">
                                <thead>
                                  <tr className="border-b border-slate-850 font-mono text-slate-500 text-[9px] uppercase">
                                    <th className="py-2 font-mono">DT</th>
                                    <th className="py-2">Data</th>
                                    <th className="py-2 text-right">Frete</th>
                                    <th className="py-2 text-right">Saldo Líq.</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {closures.map((c) => {
                                    const liqVal = (c.freteValor || 0) + (c.disponibilidadeValor || 0) + (c.diariasBonificacoes || 0) + (c.outrosCreditos || 0) - (c.adiantamentos || 0) - (c.multasDescontos || 0);
                                    return (
                                      <tr key={c.id} className="border-b border-slate-850/40 text-slate-300">
                                        <td className="py-2 font-bold font-mono text-white">#{c.dt}</td>
                                        <td className="py-2 font-mono">{c.dataFechamento ? new Date(c.dataFechamento).toLocaleDateString("pt-BR") : "N/A"}</td>
                                        <td className="py-2 text-right font-mono">R$ {Number(c.freteValor || 0).toLocaleString("pt-BR")}</td>
                                        <td className="py-2 text-right font-mono font-bold text-emerald-450">R$ {liqVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                                      </tr>
                                    );
                                  })}
                                  {closures.length === 0 && (
                                    <tr>
                                      <td colSpan={4} className="py-6 text-center text-slate-500 italic">Nenhum fechamento registrado.</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                            <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Vales & Adiantamentos Associados</h4>
                            <div className="overflow-x-auto text-[11px]">
                              <table className="w-full border-collapse text-left">
                                <thead>
                                  <tr className="border-b border-slate-850 font-mono text-slate-500 text-[9px] uppercase">
                                    <th className="py-2">Nº Vale</th>
                                    <th className="py-2">Produto</th>
                                    <th className="py-2">Status</th>
                                    <th className="py-2 text-right">Valor</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {vVales.map((vl) => (
                                    <tr key={vl.id} className="border-b border-slate-850/40 text-slate-300">
                                      <td className="py-2 font-bold font-mono text-white">{vl.numeroVale || "VALE-001"}</td>
                                      <td className="py-2 font-medium">{vl.produto || "Combustível / Óleo"}</td>
                                      <td className="py-2">
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                          vl.status === "Aprovado" || vl.status === "Quitado" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                                        }`}>
                                          {vl.status || "Aguardando"}
                                        </span>
                                      </td>
                                      <td className="py-2 text-right font-mono font-bold text-rose-400">R$ {Number(vl.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                  ))}
                                  {vVales.length === 0 && (
                                    <tr>
                                      <td colSpan={4} className="py-6 text-center text-slate-500 italic">Nenhum vale emitido para este veículo.</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB: Viagens */}
                    {detailTab === "rotas" && (
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4">
                        <h4 className="text-sm font-bold text-white uppercase font-mono tracking-wider">Histórico de Viagens Operacionais (Rotas/DTs)</h4>
                        
                        <div className="overflow-x-auto text-xs">
                          <table className="w-full border-collapse text-left text-slate-300">
                            <thead>
                              <tr className="bg-slate-950 text-slate-500 uppercase text-[9px] font-mono border-b border-slate-850">
                                <th className="py-2.5 px-3">Data</th>
                                <th className="py-2.5 px-3">Nº DT</th>
                                <th className="py-2.5 px-3">Destino / Tipo</th>
                                <th className="py-2.5 px-3">Status</th>
                                <th className="py-2.5 px-3 text-right">Eficácia Entregas</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850">
                              {vRoutes.map((r) => {
                                const total = r.totalEntregas || 0;
                                const done = r.entregues || 0;
                                const pct = total > 0 ? Math.round((done / total) * 100) : 100;
                                return (
                                  <tr key={r.id} className="hover:bg-slate-900/40">
                                    <td className="py-2.5 px-3 font-mono">{new Date(r.data).toLocaleDateString("pt-BR")}</td>
                                    <td className="py-2.5 px-3 font-bold text-white font-mono">#{r.dt}</td>
                                    <td className="py-2.5 px-3 font-medium">{r.tipo} • Filial {r.unidadeId}</td>
                                    <td className="py-2.5 px-3">
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                                        r.status === "Finalizada" ? "bg-emerald-500/10 text-emerald-450" : "bg-sky-500/10 text-sky-400"
                                      }`}>
                                        {r.status}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                                      <span className={pct >= 90 ? "text-emerald-400" : pct >= 70 ? "text-yellow-500" : "text-rose-450"}>
                                        {done}/{total} ({pct}%)
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                              {vRoutes.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="py-8 text-center text-slate-500 italic font-mono">
                                    Nenhuma rota vinculada ou histórico de viagem para esta placa.
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
              );
            })() : isEditing ? (
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800/80 space-y-4 relative">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                    <span className="p-1 bg-sky-600/10 text-sky-400 rounded"><Truck className="w-4 h-4" /></span>
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
                            <UserMinus className="w-3.5 h-3.5" /> Remover Motorista do Veículo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row 3b: Chassi, Combustível, Capacidade (Phase 10) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-450 block font-mono">Chassi do Veículo</label>
                      <input
                        type="text"
                        value={chassi}
                        onChange={(e) => setChassi(e.target.value)}
                        placeholder="Número do chassi..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-450 block font-mono">Combustível Padrão</label>
                      <select
                        value={combustivel}
                        onChange={(e) => setCombustivel(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="Diesel">Diesel</option>
                        <option value="Gasolina">Gasolina</option>
                        <option value="Etanol">Etanol</option>
                        <option value="Flex">Flex (Gasolina/Álcool)</option>
                        <option value="GNV">GNV</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-450 block font-mono">Capacidade de Carga</label>
                      <input
                        type="text"
                        value={capacidade}
                        onChange={(e) => setCapacidade(e.target.value)}
                        placeholder="Ex: 15 Ton / 80 m³"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                      />
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
                        <option value="Completa">Completa / Sem Pendência</option>
                        <option value="Pendente">Pendente / Faltam Cópias</option>
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

                  {/* Row 5b: ANTT and Documentação Observações (Phase 10) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-450 block font-mono">Registro ANTT</label>
                      <input
                        type="text"
                        value={antt}
                        onChange={(e) => setAntt(e.target.value)}
                        placeholder="Número do Registro ANTT..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-450 block font-mono">Vencimento ANTT</label>
                      <input
                        type="date"
                        value={anttVencimento}
                        onChange={(e) => setAnttVencimento(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-450 block font-mono">Observações Documentação</label>
                      <input
                        type="text"
                        value={documentacaoObservacoes}
                        onChange={(e) => setDocumentacaoObservacoes(e.target.value)}
                        placeholder="Ex: irregularidades ou prazos..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                  </div>

                  {/* SIMULADO DE DOCUMENTOS & ARQUIVOS */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                    <span className="text-[10px] font-bold text-slate-500 tracking-wider font-mono uppercase flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                      <Folder className="w-3.5 h-3.5 text-sky-400" />
                      Anexar Documentos Digitais (CRLV, CRV, Seguro, Licenciamento, Fotos)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      
                      {/* CRLV */}
                      <div className="space-y-1">
                        <label className="text-slate-500 text-[10px] block font-mono">CRLV (Digital ou Scan)</label>
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
                              onChange={(e) => handleVehicleFileRead(e, setDocCRLV)}
                            />
                          </label>
                        </div>
                      </div>

                      {/* CRV */}
                      <div className="space-y-1">
                        <label className="text-slate-500 text-[10px] block font-mono">CRV (Compra e Venda)</label>
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
                              onChange={(e) => handleVehicleFileRead(e, setDocCRV)}
                            />
                          </label>
                        </div>
                      </div>

                      {/* Seguro */}
                      <div className="space-y-1">
                        <label className="text-slate-500 text-[10px] block font-mono">Apólice de Seguro</label>
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
                              onChange={(e) => handleVehicleFileRead(e, setDocSeguro)}
                            />
                          </label>
                        </div>
                      </div>

                      {/* Licenciamento */}
                      <div className="space-y-1">
                        <label className="text-slate-500 text-[10px] block font-mono">Licenciamento Recente</label>
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
                              onChange={(e) => handleVehicleFileRead(e, setDocLicenciamento)}
                            />
                          </label>
                        </div>
                      </div>

                      {/* ANTT Certificate Upload */}
                      <div className="space-y-1">
                        <label className="text-slate-500 text-[10px] block font-mono">Certificado ANTT</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="antt_validacao.pdf"
                            value={anttUrl}
                            onChange={(e) => setAnttUrl(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] text-white flex-1 focus:outline-none"
                          />
                          <label className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded cursor-pointer transition">
                            <FileUp className="w-3.5 h-3.5" />
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => handleVehicleFileRead(e, setAnttUrl)}
                            />
                          </label>
                        </div>
                      </div>

                      {/* Fotos do veículo */}
                      <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                        <label className="text-slate-500 text-[10px] block font-mono flex items-center gap-1">
                          <Camera className="w-3 h-3 text-sky-400" /> Fotos Visuais do Veículo
                        </label>
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
                              onChange={(e) => handleVehicleFileRead(e, setDocFoto)}
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
            ) : null}

            {/* RESULTS VIEW HEADER WITH VIEW MODE CONTROLS */}
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
              <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-sky-400" /> {filteredVeiculos.length} veículos localizados
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
                                <strong className="text-white font-semibold block truncate flex items-center gap-1">
                                  <User className="w-3.5 h-3.5 text-sky-400" /> {assignedDriverObj.nome}
                                </strong>
                                <button
                                  type="button"
                                  id={`unbind-${v.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveDriver(v.id);
                                  }}
                                  className="text-[9px] text-rose-450 hover:text-rose-350 font-bold uppercase tracking-wider hover:underline select-none cursor-pointer flex items-center gap-1"
                                >
                                  <UserMinus className="w-3 h-3 text-rose-450" /> Remover Vínculo
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic block mt-0.5">Sem condutor fixado</span>
                            )}
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase font-mono">UNIDADE FILIAL:</span>
                            <span className="text-slate-300 font-medium block truncate mt-0.5 flex items-center gap-1">
                              <Building className="w-3.5 h-3.5 text-sky-400" /> {associatedUnit ? associatedUnit.nome : `Filial ${v.unidadeId}`}
                            </span>
                          </div>
                        </div>

                        {/* CONFORMIDADES DO VEÍCULO SECTION */}
                        <div className="space-y-1.5 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 font-mono text-[10px]">
                          <span className="text-slate-450 text-[9px] font-bold tracking-wider block border-b border-slate-850 pb-0.5 uppercase flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" /> Conformidades do Veículo
                          </span>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                            <span className="flex items-center justify-between text-slate-400">
                              <span>CRLV:</span>
                              <span className={flagCRLV === "Válido" ? "text-emerald-400 font-bold" : "text-rose-450 font-bold"}>
                                {flagCRLV === "Válido" ? "Válido" : "Vencido"}
                              </span>
                            </span>

                            <span className="flex items-center justify-between text-slate-400">
                              <span>Seguro:</span>
                              <span className={flagSeguro === "Ativo" ? "text-emerald-400 font-bold" : "text-rose-450 font-bold"}>
                                {flagSeguro === "Ativo" ? "Ativo" : "Vencido"}
                              </span>
                            </span>

                            <span className="flex items-center justify-between text-slate-400">
                              <span>Manutenção:</span>
                              <span className={flagManutencao === "Em dia" ? "text-emerald-400 font-bold" : flagManutencao === "Atrasada" ? "text-rose-450 font-bold" : "text-yellow-500 font-bold"}>
                                {flagManutencao === "Em dia" ? "Em dia" : flagManutencao === "Atrasada" ? "Atrasada" : "Atenção"}
                              </span>
                            </span>

                            <span className="flex items-center justify-between text-slate-400">
                              <span>Documentos:</span>
                              <span className={flagDocumentos === "Completa" ? "text-emerald-400 font-bold" : "text-rose-450 font-bold"}>
                                {flagDocumentos === "Completa" ? "Completa" : "Pendente"}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* HISTÓRICOS DE MANUTENÇÕES */}
                        <div className="bg-slate-950/20 p-2.5 rounded-xl border border-slate-850/80 font-mono text-[10px] space-y-1">
                          <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <Wrench className="w-3.5 h-3.5 text-sky-400" /> Datas de Manutenção
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
                            <span className="text-[9px] font-mono font-bold text-rose-450 uppercase flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-450" /> Motivo / Observação de Restrição:
                            </span>
                            <p className="text-[10px] text-slate-300 italic">
                              {v.motivoBloqueio || "Documentação com vencimento crítico expirado or pendente."}
                            </p>
                          </div>
                        )}

                        {/* ANEXOS & DOWNLOADS */}
                        <div className="pt-2 border-t border-slate-800/80 space-y-2">
                          <span className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                            <Folder className="w-3.5 h-3.5 text-sky-400" /> Documentos Digitais Anexos
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {/* CRLV */}
                            <button
                              onClick={() => openDocumentOrNotify(v.documentoCRLVUrl)}
                              className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[9px] text-slate-300 rounded font-mono font-bold flex items-center gap-1 shrink-0 transition"
                              title="Visualizar CRLV do veículo"
                            >
                              <FileText className="w-3 h-3 text-sky-400" /> CRLV
                            </button>
                            {/* CRV */}
                            <button
                              onClick={() => openDocumentOrNotify(v.documentoCRVUrl)}
                              className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[9px] text-slate-300 rounded font-mono font-bold flex items-center gap-1 shrink-0 transition"
                              title="Visualizar CRV de propriedade"
                            >
                              <FileText className="w-3 h-3 text-cyan-400" /> CRV
                            </button>
                            {/* Seguro */}
                            <button
                              onClick={() => openDocumentOrNotify(v.seguroUrl)}
                              className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[9px] text-slate-300 rounded font-mono font-bold flex items-center gap-1 shrink-0 transition"
                              title="Visualizar apólice de seguro"
                            >
                              <FileText className="w-3 h-3 text-amber-500" /> SEGURO
                            </button>
                            {/* Licenciamento */}
                            <button
                              onClick={() => openDocumentOrNotify(v.licenciamentoUrl)}
                              className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[9px] text-slate-300 rounded font-mono font-bold flex items-center gap-1 shrink-0 transition"
                              title="Visualizar Licenciamento"
                            >
                              <FileText className="w-3 h-3 text-indigo-400" /> LICENC.
                            </button>
                            {/* Foto */}
                            <button
                              onClick={() => openDocumentOrNotify(v.fotoVeiculoUrl)}
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
                              <RefreshCw className="w-3 h-3 text-cyan-400" /> ROTEIRIZADO HOJE
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
                            onClick={() => setSelectedVehicleForDetails(v)}
                            className="px-2.5 py-1 text-sky-400 hover:text-white hover:bg-slate-800 rounded font-bold text-xs flex items-center gap-1 transition"
                            title="Visualizar ficha completa"
                          >
                            <Eye className="w-3 h-3" /> Ver Ficha
                          </button>

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
                                  <div className="font-semibold text-white flex items-center gap-1">
                                    <User className="w-3.5 h-3.5 text-sky-400" /> {assignedDriverObj.nome}
                                  </div>
                                  <button
                                    type="button"
                                    id={`tbl-unbind-${v.id}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveDriver(v.id);
                                    }}
                                    className="text-[9px] text-rose-450 hover:text-rose-350 font-bold flex items-center gap-1 text-left uppercase tracking-wider select-none cursor-pointer mt-0.5"
                                  >
                                    <UserMinus className="w-3 h-3 text-rose-450" /> Desvincular
                                  </button>
                                </div>
                              ) : (
                                <div className="text-slate-500 italic">Nenhum vinculado</div>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="text-slate-400 font-medium flex items-center gap-1">
                                <Building className="w-3.5 h-3.5 text-sky-400" /> {associatedUnit ? associatedUnit.nome : v.unidadeId}
                              </div>
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
                                  onClick={() => setSelectedVehicleForDetails(v)}
                                  className="p-1.5 text-sky-400 hover:text-white hover:bg-slate-800 rounded transition"
                                  title="Ver Ficha completa"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
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
