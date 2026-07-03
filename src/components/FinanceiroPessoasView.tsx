import React, { useState, useEffect, useMemo } from "react";
import { 
  WalletCards, Search, Filter, ArrowUpRight, ArrowDownLeft, AlertCircle,
  TrendingUp, TrendingDown, DollarSign, ArrowLeft, Calendar, FileText,
  ShieldAlert, CheckCircle, RefreshCw, X, SlidersHorizontal, Lock, Unlock, Check,
  Trash2, Eye, Printer, Download, CreditCard, Clock, MapPin, Shield
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

interface Unidade {
  id: string;
  nome: string;
}

interface Usuario {
  id: string;
  email: string;
  nome: string;
  perfil: "admin_master" | "admin_unidade" | "operador";
  tipo_usuario?: "MASTER" | "SUPERVISOR" | "OPERADOR" | "CONFERENTE" | "MOTORISTA";
}

interface FinanceiroPessoasViewProps {
  currentUser: Usuario;
  unidades: Unidade[];
  onRefresh?: () => void;
}

interface VeiculoFinanceiro {
  id: string;
  nome: string;
  placa: string;
  perfil: string;
  modelo: string;
  marca: string;
  unidadeId: string;
  motoristaNome: string;
  statusFinanceiro: "Ativo" | "Bloqueado";
  dataCriacaoContaFinanceira: string;
  saldo: number;
  saldoDisponivel: number;
  creditos: number;
  debitos: number;
  ultimaMovimentacao: {
    data: string;
    tipo: "Crédito" | "Débito";
    origem: string;
    valor: number;
    observacao?: string;
  } | null;
}

interface Movimentacao {
  id: string;
  veiculoId: string;
  data: string;
  hora: string;
  tipo: "Crédito" | "Débito";
  origem: "Frete" | "Disponibilidade" | "Vale" | "Descarga" | "Manutenção" | string;
  valor: number;
  observacao?: string;
  saldoAnterior: number;
  saldoPosterior: number;
  usuario: string;
  faturado?: boolean;
  dtId?: string;
  valeId?: string;
  descargaId?: string;
  manutencaoId?: string;
}

interface FechamentoSemanal {
  id: string;
  veiculoId: string;
  placa: string;
  dataInicio: string;
  dataFim: string;
  receitasFretes: number;
  receitasDisponibilidade: number;
  totalReceitas: number;
  descontosVales: number;
  descontosDescargas: number;
  descontosManutencoes: number;
  descontosOutros: number;
  totalDescontos: number;
  saldoFinal: number;
  status: "Pago";
  criadoEm: string;
  criadoPor: string;
}

export default function FinanceiroPessoasView({ currentUser, unidades, onRefresh }: FinanceiroPessoasViewProps) {
  // Authorization flags
  const isMaster = currentUser.perfil === "admin_master" || currentUser.tipo_usuario === "MASTER";
  const isSupervisor = currentUser.perfil === "admin_unidade" || currentUser.tipo_usuario === "SUPERVISOR";
  const isOperator = currentUser.perfil === "operador" || currentUser.tipo_usuario === "OPERADOR";
  const canWrite = isMaster || isSupervisor;
  const canToggleStatus = isMaster;

  // View state
  const [veiculos, setVeiculos] = useState<VeiculoFinanceiro[]>([]);
  const [selectedVeiculoId, setSelectedVeiculoId] = useState<string | null>(null);
  const [extratoData, setExtratoData] = useState<{ 
    pessoa: VeiculoFinanceiro; 
    extrato: Movimentacao[];
    fechamentosSemanais: FechamentoSemanal[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Table Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [unidadeFilter, setUnidadeFilter] = useState("Todas");
  const [perfilFilter, setPerfilFilter] = useState("Todas");
  const [statusFilter, setStatusFilter] = useState("Todas");

  // Extrato Filtros
  const [extratoSearchQuery, setExtratoSearchQuery] = useState("");
  const [extratoTipoFilter, setExtratoTipoFilter] = useState("Todos");
  const [extratoOrigemFilter, setExtratoOrigemFilter] = useState("Todos");
  const [extratoStatusFilter, setExtratoStatusFilter] = useState("Todos"); // "Todos", "Pendente", "Faturado"
  const [extratoStartDate, setExtratoStartDate] = useState("");
  const [extratoEndDate, setExtratoEndDate] = useState("");

  // Fechamento Semanal Modal
  const [isFecharSemanaOpen, setIsFecharSemanaOpen] = useState(false);
  const [closureStartDate, setClosureStartDate] = useState("");
  const [closureEndDate, setClosureEndDate] = useState("");

  // Phase 6 & Phase 8 State Additions
  const [activeTab, setActiveTab] = useState<"vehicles" | "payments" | "history">("vehicles");
  const [loadingPaymentVeiculoId, setLoadingPaymentVeiculoId] = useState<string | null>(null);
  const [allClosures, setAllClosures] = useState<any[]>([]);
  const [loadingClosures, setLoadingClosures] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState("PIX");
  const [observacoes, setObservacoes] = useState("");
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split("T")[0]);
  const [horaPagamento, setHoraPagamento] = useState(new Date().toTimeString().split(" ")[0].slice(0, 5));
  const [selectedClosureForReceipt, setSelectedClosureForReceipt] = useState<any | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyMethodFilter, setHistoryMethodFilter] = useState("Todos");

  // Load all closures across the fleet
  const loadAllClosures = async () => {
    setLoadingClosures(true);
    try {
      const res = await fetch("/api/financeiro/fechamentos", {
        headers: { "x-user-email": currentUser.email }
      });
      if (res.ok) {
        const data = await res.json();
        setAllClosures(data);
      }
    } catch (err) {
      console.error("Erro ao carregar todos os fechamentos:", err);
    } finally {
      setLoadingClosures(false);
    }
  };

  // Load all vehicles financial data
  const loadVeiculos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/financeiro/pessoas", {
        headers: { "x-user-email": currentUser.email }
      });
      if (!res.ok) throw new Error("Erro ao carregar centro financeiro da frota.");
      const data = await res.json();
      setVeiculos(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch individual extract
  const loadIndividualExtrato = async (veiculoId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/financeiro/pessoas/${veiculoId}/extrato`, {
        headers: { "x-user-email": currentUser.email }
      });
      if (!res.ok) throw new Error("Erro ao carregar extrato do veículo.");
      const data = await res.json();
      setExtratoData(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro de conexão ao carregar extrato.");
    } finally {
      setLoading(false);
    }
  };

  // Load data on start
  useEffect(() => {
    loadVeiculos();
    loadAllClosures();
  }, []);

  // Set notification auto dismiss
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Handle toggle account status (bloqueio/desbloqueio)
  const handleToggleStatus = async (veiculo: VeiculoFinanceiro) => {
    if (!canToggleStatus) return;
    const nextStatus = veiculo.statusFinanceiro === "Ativo" ? "Bloqueado" : "Ativo";
    
    setLoading(true);
    try {
      const res = await fetch(`/api/financeiro/pessoas/${veiculo.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": currentUser.email
        },
        body: JSON.stringify({ statusFinanceiro: nextStatus })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao alterar status da conta.");
      }

      setNotification({ type: "success", message: `Status do veículo alterado para ${nextStatus} com sucesso!` });
      
      // Reload current view
      if (selectedVeiculoId === veiculo.id) {
        await loadIndividualExtrato(veiculo.id);
      } else {
        await loadVeiculos();
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Erro de rede." });
    } finally {
      setLoading(false);
    }
  };

  // Weekly closure calculation values derived from selected dates for selected vehicle
  const currentUnfaturadoClosureCalculations = useMemo(() => {
    if (!extratoData || !extratoData.extrato) return null;
    
    // Unfaturado/active movements
    let filtered = extratoData.extrato.filter(m => !m.faturado);
    
    // Apply date range if selected (normalized to YYYY-MM-DD for correct comparison)
    if (closureStartDate) {
      filtered = filtered.filter(m => {
        const mDate = m.data ? m.data.slice(0, 10) : "";
        return mDate >= closureStartDate;
      });
    }
    if (closureEndDate) {
      filtered = filtered.filter(m => {
        const mDate = m.data ? m.data.slice(0, 10) : "";
        return mDate <= closureEndDate;
      });
    }

    const receitasFretes = filtered.filter(m => m.tipo === "Crédito" && m.origem === "Frete").reduce((acc, m) => acc + m.valor, 0);
    const receitasDisponibilidade = filtered.filter(m => m.tipo === "Crédito" && m.origem === "Disponibilidade").reduce((acc, m) => acc + m.valor, 0);
    const receitasBonificacoes = filtered.filter(m => m.tipo === "Crédito" && m.origem === "Bonificação").reduce((acc, m) => acc + m.valor, 0);
    const receitasOutros = filtered.filter(m => m.tipo === "Crédito" && m.origem === "Outros Créditos").reduce((acc, m) => acc + m.valor, 0);
    const totalReceitas = receitasFretes + receitasDisponibilidade + receitasBonificacoes + receitasOutros;

    const descontosVales = filtered.filter(m => m.tipo === "Débito" && m.origem === "Vale").reduce((acc, m) => acc + m.valor, 0);
    const descontosAdiantamentos = filtered.filter(m => m.tipo === "Débito" && m.origem === "Adiantamento").reduce((acc, m) => acc + m.valor, 0);
    const descontosGerais = filtered.filter(m => m.tipo === "Débito" && m.origem === "Desconto").reduce((acc, m) => acc + m.valor, 0);
    const descontosDescargas = filtered.filter(m => m.tipo === "Débito" && m.origem === "Descarga").reduce((acc, m) => acc + m.valor, 0);
    const descontosManutencoes = filtered.filter(m => m.tipo === "Débito" && m.origem === "Manutenção").reduce((acc, m) => acc + m.valor, 0);
    const totalDescontos = descontosVales + descontosAdiantamentos + descontosGerais + descontosDescargas + descontosManutencoes;

    const saldoFinal = totalReceitas - totalDescontos;

    return {
      movementsCount: filtered.length,
      receitasFretes,
      receitasDisponibilidade,
      receitasBonificacoes,
      receitasOutros,
      totalReceitas,
      descontosVales,
      descontosAdiantamentos,
      descontosGerais,
      descontosDescargas,
      descontosManutencoes,
      totalDescontos,
      saldoFinal
    };
  }, [extratoData, closureStartDate, closureEndDate]);

  // Handle post weekly closure
  const handleFecharSemana = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVeiculoId || !currentUnfaturadoClosureCalculations) return;
    if (!closureStartDate || !closureEndDate) {
      setNotification({ type: "error", message: "As datas de início e fim do período são obrigatórias." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/financeiro/pessoas/${selectedVeiculoId}/fechar-semana`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": currentUser.email
        },
        body: JSON.stringify({
          dataInicio: closureStartDate,
          dataFim: closureEndDate,
          receitasFretes: currentUnfaturadoClosureCalculations.receitasFretes,
          receitasDisponibilidade: currentUnfaturadoClosureCalculations.receitasDisponibilidade,
          receitasBonificacoes: currentUnfaturadoClosureCalculations.receitasBonificacoes,
          receitasOutros: currentUnfaturadoClosureCalculations.receitasOutros,
          totalReceitas: currentUnfaturadoClosureCalculations.totalReceitas,
          descontosVales: currentUnfaturadoClosureCalculations.descontosVales,
          descontosAdiantamentos: currentUnfaturadoClosureCalculations.descontosAdiantamentos,
          descontosGerais: currentUnfaturadoClosureCalculations.descontosGerais,
          descontosDescargas: currentUnfaturadoClosureCalculations.descontosDescargas,
          descontosManutencoes: currentUnfaturadoClosureCalculations.descontosManutencoes,
          descontosOutros: 0,
          totalDescontos: currentUnfaturadoClosureCalculations.totalDescontos,
          saldoFinal: currentUnfaturadoClosureCalculations.saldoFinal,
          formaPagamento,
          observacoes,
          dataPagamento,
          horaPagamento: `${horaPagamento}:00`
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao realizar o fechamento semanal.");
      }

      const resData = await res.json();
      const generatedClosure = resData.closure;

      setNotification({ type: "success", message: `Pagamento de R$ ${Number(currentUnfaturadoClosureCalculations.saldoFinal).toFixed(2)} registrado com sucesso!` });
      setIsFecharSemanaOpen(false);
      setClosureStartDate("");
      setClosureEndDate("");
      setFormaPagamento("PIX");
      setObservacoes("");
      setDataPagamento(new Date().toISOString().split("T")[0]);
      setHoraPagamento(new Date().toTimeString().split(" ")[0].slice(0, 5));

      // Reload
      await loadIndividualExtrato(selectedVeiculoId);
      await loadVeiculos();
      await loadAllClosures();
      
      // Auto-open Receipt
      if (generatedClosure) {
        // Enriched closure info for receipt modal display
        const targetVeiculo = veiculos.find(v => v.id === selectedVeiculoId);
        setSelectedClosureForReceipt({
          ...generatedClosure,
          veiculoModelo: targetVeiculo ? targetVeiculo.modelo : "N/A",
          veiculoPlaca: targetVeiculo ? targetVeiculo.placa : "N/A",
          veiculoPerfil: targetVeiculo ? targetVeiculo.perfil : "N/A",
          motoristaNome: targetVeiculo ? targetVeiculo.motoristaNome : "Sem Motorista"
        });
        setIsReceiptModalOpen(true);
      }

      if (onRefresh) onRefresh();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Erro ao fechar semana." });
    } finally {
      setSubmitting(false);
    }
  };

  // Back to list
  const handleBackToList = () => {
    setSelectedVeiculoId(null);
    setExtratoData(null);
    loadVeiculos();
  };

  // Reopen a period (delete weekly closure)
  const handleReabrirPeriodo = async (closureId: string, veiculoId: string) => {
    if (!window.confirm("Deseja realmente reabrir este período? Isso excluirá o registro de faturamento/pagamento e tornará todas as movimentações ativas novamente.")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/financeiro/pessoas/${veiculoId}/fechamentos/${closureId}`, {
        method: "DELETE",
        headers: {
          "x-user-email": currentUser.email
        }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao reabrir período.");
      }

      setNotification({ type: "success", message: "Período reaberto com sucesso!" });
      
      // Reload everything
      await loadAllClosures();
      await loadVeiculos();
      if (selectedVeiculoId === veiculoId) {
        await loadIndividualExtrato(veiculoId);
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Erro ao reabrir período." });
    } finally {
      setLoading(false);
    }
  };

  // Open individual view
  const handleAccessAccount = (veiculoId: string) => {
    setSelectedVeiculoId(veiculoId);
    loadIndividualExtrato(veiculoId);
  };

  // Streamlined FASE 8 single-click closing payment action
  const handleStartPayment = async (veiculo: VeiculoFinanceiro) => {
    setLoadingPaymentVeiculoId(veiculo.id);
    try {
      setSelectedVeiculoId(veiculo.id);
      
      // Load individual extrato first
      const res = await fetch(`/api/financeiro/pessoas/${veiculo.id}/extrato`, {
        headers: { "x-user-email": currentUser.email }
      });
      if (!res.ok) throw new Error("Erro ao carregar dados do extrato do veículo.");
      const data = await res.json();
      setExtratoData(data);

      // Determine suggested dates
      let lastEndDateStr = "";
      if (data.fechamentosSemanais && data.fechamentosSemanais.length > 0) {
        const sorted = [...data.fechamentosSemanais].sort((a, b) => b.dataFim.localeCompare(a.dataFim));
        lastEndDateStr = sorted[0].dataFim;
      }
      
      let suggestedStart = "";
      if (lastEndDateStr) {
        const d = new Date(lastEndDateStr + "T12:00:00");
        d.setDate(d.getDate() + 1);
        suggestedStart = d.toISOString().split("T")[0];
      } else {
        const activeMovs = data.extrato.filter((m: any) => !m.faturado);
        if (activeMovs.length > 0) {
          const sortedMovs = [...activeMovs].sort((a, b) => a.data.localeCompare(b.data));
          suggestedStart = sortedMovs[0].data;
        } else {
          suggestedStart = new Date().toISOString().split("T")[0];
        }
      }
      
      const todayStr = new Date().toISOString().split("T")[0];
      setClosureStartDate(suggestedStart);
      setClosureEndDate(todayStr); // FASE 8 closes up to today
      
      // Pre-fill payment details
      setFormaPagamento("PIX");
      setObservacoes(`Fechamento financeiro consolidado.`);
      setDataPagamento(todayStr);
      setHoraPagamento(new Date().toTimeString().split(" ")[0].slice(0, 5));
      
      setIsFecharSemanaOpen(true);
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Erro ao iniciar processo de pagamento." });
    } finally {
      setLoadingPaymentVeiculoId(null);
    }
  };

  // Open closure modal with automatically suggested dates
  const handleOpenFecharSemana = () => {
    if (!extratoData) return;
    
    // Find the latest weekly closure end date
    let lastEndDateStr = "";
    if (extratoData.fechamentosSemanais && extratoData.fechamentosSemanais.length > 0) {
      const sorted = [...extratoData.fechamentosSemanais].sort((a, b) => b.dataFim.localeCompare(a.dataFim));
      lastEndDateStr = sorted[0].dataFim;
    }
    
    let suggestedStart = "";
    if (lastEndDateStr) {
      const d = new Date(lastEndDateStr + "T12:00:00");
      d.setDate(d.getDate() + 1);
      suggestedStart = d.toISOString().split("T")[0];
    } else {
      const activeMovs = extratoData.extrato.filter(m => !m.faturado);
      if (activeMovs.length > 0) {
        const sortedMovs = [...activeMovs].sort((a, b) => a.data.localeCompare(b.data));
        suggestedStart = sortedMovs[0].data;
      } else {
        suggestedStart = "2026-06-16";
      }
    }
    
    const todayStr = new Date().toISOString().split("T")[0];
    let suggestedEnd = todayStr;
    if (suggestedStart) {
      const d = new Date(suggestedStart + "T12:00:00");
      d.setDate(d.getDate() + 6); // Weekly cycle
      const tempEnd = d.toISOString().split("T")[0];
      if (tempEnd <= todayStr) {
        suggestedEnd = tempEnd;
      }
    }
    
    setClosureStartDate(suggestedStart);
    setClosureEndDate(suggestedEnd);
    
    // Initialize Phase 6 payment details fields
    setFormaPagamento("PIX");
    setObservacoes("");
    setDataPagamento(todayStr);
    setHoraPagamento(new Date().toTimeString().split(" ")[0].slice(0, 5));
    
    setIsFecharSemanaOpen(true);
  };

  // Master KPI Indicators from currently loaded filtered list
  const dashboardKpis = useMemo(() => {
    let saldoPositivoCount = 0;
    let saldoNegativoCount = 0;
    let totalCreditos = 0;
    let totalDebitos = 0;
    let pendenciasCount = 0;

    veiculos.forEach(v => {
      if (v.saldo > 0) saldoPositivoCount++;
      else if (v.saldo < 0) saldoNegativoCount++;
      
      totalCreditos += v.creditos;
      totalDebitos += v.debitos;
      if (v.statusFinanceiro === "Bloqueado") pendenciasCount++;
    });

    return {
      saldoPositivoCount,
      saldoNegativoCount,
      totalCreditos,
      totalDebitos,
      totalMovimentado: totalCreditos + totalDebitos,
      pendenciasCount
    };
  }, [veiculos]);

  // Comprehensive FASE 8 Dashboard Financial Indicators
  const financeDashboardKpis = useMemo(() => {
    const saldoTotalFrota = veiculos.reduce((acc, v) => acc + (v.saldo || 0), 0);
    const saldoTotalAPagar = veiculos.filter(v => v.saldo > 0).reduce((acc, v) => acc + v.saldo, 0);
    const veiculosAguardandoPagamento = veiculos.filter(v => v.saldo > 0).length;
    const veiculosSaldoNegativoCount = veiculos.filter(v => v.saldo < 0).length;

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const currentMonthStr = now.toISOString().slice(0, 7); // YYYY-MM

    // Pagamentos realizados hoje
    const closuresHoje = allClosures.filter(c => {
      const dataStr = c.dataPagamento || (c.criadoEm ? c.criadoEm.slice(0, 10) : "");
      return dataStr === todayStr;
    });
    const pagamentosHojeValor = closuresHoje.reduce((acc, c) => acc + Number(c.saldoFinal || 0), 0);
    const pagamentosHojeCount = closuresHoje.length;

    // Pagamentos da semana (quantidade e valor)
    const closuresSemana = allClosures.filter(c => {
      const criadoDate = new Date(c.criadoEm || c.dataPagamento || "");
      return criadoDate >= oneWeekAgo;
    });
    const pagamentosSemanaCount = closuresSemana.length;
    const valorPagoSemana = closuresSemana.reduce((acc, c) => acc + Number(c.saldoFinal || 0), 0);

    const valorPagoMes = allClosures
      .filter(c => {
        const dateStr = c.criadoEm || c.dataPagamento || "";
        return dateStr.startsWith(currentMonthStr);
      })
      .reduce((acc, c) => acc + Number(c.saldoFinal || 0), 0);

    const saldosFinais = allClosures.map(c => Number(c.saldoFinal || 0));
    const maiorPagamento = saldosFinais.length > 0 ? Math.max(...saldosFinais) : 0;
    const menorPagamento = saldosFinais.length > 0 ? Math.min(...saldosFinais) : 0;

    return {
      saldoTotalFrota,
      saldoTotalAPagar,
      veiculosAguardandoPagamento,
      veiculosSaldoNegativoCount,
      pagamentosHojeValor,
      pagamentosHojeCount,
      pagamentosSemanaCount,
      valorPagoSemana,
      valorPagoMes,
      maiorPagamento,
      menorPagamento
    };
  }, [veiculos, allClosures]);

  // Filtered vehicles list
  const filteredVeiculos = useMemo(() => {
    return veiculos.filter(v => {
      // 1. Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesPlaca = v.placa?.toLowerCase().includes(query);
        const matchesModelo = v.modelo?.toLowerCase().includes(query);
        const matchesMarca = v.marca?.toLowerCase().includes(query);
        const matchesMotorista = v.motoristaNome?.toLowerCase().includes(query);
        if (!matchesPlaca && !matchesModelo && !matchesMarca && !matchesMotorista) return false;
      }

      // 2. Unidade Filter
      if (unidadeFilter !== "Todas" && v.unidadeId !== unidadeFilter) return false;

      // 3. Perfil Filter
      if (perfilFilter !== "Todas" && v.perfil !== perfilFilter) return false;

      // 4. Status Filter
      if (statusFilter !== "Todas" && v.statusFinanceiro !== statusFilter) return false;

      return true;
    });
  }, [veiculos, searchQuery, unidadeFilter, perfilFilter, statusFilter]);

  // Filtered closures list for general history
  const filteredHistory = useMemo(() => {
    return allClosures.filter(c => {
      // 1. Search Query
      if (historySearch) {
        const query = historySearch.toLowerCase();
        const matchesNum = (c.numeroFechamento || "").toLowerCase().includes(query);
        const matchesPlaca = (c.veiculoPlaca || c.placa || "").toLowerCase().includes(query);
        const matchesModelo = (c.veiculoModelo || "").toLowerCase().includes(query);
        const matchesMotorista = (c.motoristaNome || "").toLowerCase().includes(query);
        const matchesObs = (c.observacoes || "").toLowerCase().includes(query);
        if (!matchesNum && !matchesPlaca && !matchesModelo && !matchesMotorista && !matchesObs) return false;
      }
      
      // 2. Method Filter
      if (historyMethodFilter !== "Todos" && c.formaPagamento !== historyMethodFilter) return false;
      
      return true;
    });
  }, [allClosures, historySearch, historyMethodFilter]);

  // Unique profiles for filters
  const uniquePerfis = useMemo(() => {
    const perfis = new Set<string>();
    veiculos.forEach(v => { if (v.perfil) perfis.add(v.perfil); });
    return Array.from(perfis);
  }, [veiculos]);

  // Filtered Extrato list for the selected vehicle
  const filteredExtrato = useMemo(() => {
    if (!extratoData) return [];
    return extratoData.extrato.filter(m => {
      // 1. Text Search
      if (extratoSearchQuery) {
        const query = extratoSearchQuery.toLowerCase();
        const obsMatch = m.observacao?.toLowerCase().includes(query);
        const userMatch = m.usuario?.toLowerCase().includes(query);
        const originMatch = m.origem?.toLowerCase().includes(query);
        const dtMatch = m.dtId?.toLowerCase().includes(query);
        if (!obsMatch && !userMatch && !originMatch && !dtMatch) return false;
      }

      // 2. Tipo Filter
      if (extratoTipoFilter !== "Todos" && m.tipo !== extratoTipoFilter) return false;

      // 3. Origem Filter
      if (extratoOrigemFilter !== "Todos" && m.origem !== extratoOrigemFilter) return false;

      // 4. Status Filter
      if (extratoStatusFilter === "Pendente" && m.faturado) return false;
      if (extratoStatusFilter === "Faturado" && !m.faturado) return false;

      // 5. Date range Filter (normalized to YYYY-MM-DD for correct comparison)
      const mDate = m.data ? m.data.slice(0, 10) : "";
      if (extratoStartDate && mDate < extratoStartDate) return false;
      if (extratoEndDate && mDate > extratoEndDate) return false;

      return true;
    });
  }, [extratoData, extratoSearchQuery, extratoTipoFilter, extratoOrigemFilter, extratoStatusFilter, extratoStartDate, extratoEndDate]);

  // Extrato unique origins for dropdown selection
  const extratoUniqueOrigins = useMemo(() => {
    if (!extratoData) return [];
    const set = new Set<string>();
    extratoData.extrato.forEach(m => { if (m.origem) set.add(m.origem); });
    return Array.from(set);
  }, [extratoData]);

  // Prepare chart data for the selected vehicle's balance evolution or category distributions
  const barChartData = useMemo(() => {
    if (!extratoData || !extratoData.extrato) return [];
    const movements = extratoData.extrato;
    
    // Group by origin category to show where revenues and discounts come from
    const sumByOrigin: Record<string, { name: string; receita: number; desconto: number }> = {};
    
    movements.forEach(m => {
      if (!sumByOrigin[m.origem]) {
        sumByOrigin[m.origem] = { name: m.origem, receita: 0, desconto: 0 };
      }
      if (m.tipo === "Crédito") {
        sumByOrigin[m.origem].receita += m.valor;
      } else {
        sumByOrigin[m.origem].desconto += m.valor;
      }
    });

    return Object.values(sumByOrigin);
  }, [extratoData]);

  return (
    <div id="financeiro-frota-root" className="min-h-screen bg-[#f8fafc] p-6 font-sans">
      {/* Notifications */}
      {notification && (
        <div 
          id="notif-bar"
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg transition-all duration-300 ${
            notification.type === "success" 
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-80">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Header Block */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-900 p-2.5 text-white shadow-md">
                <WalletCards className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Centro Financeiro da Frota</h1>
                <p className="text-sm text-slate-500">Gestão integrada de saldos operacionais, receitas de fretes e custos por veículo.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => { loadVeiculos(); if (selectedVeiculoId) loadIndividualExtrato(selectedVeiculoId); }}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Sincronizar
            </button>
          </div>
        </div>

        {/* View Selection Layout */}
        {!selectedVeiculoId ? (
          // ================= LIST VIEW =================
          <div className="space-y-6 animate-fade-in">
            
            {/* Fleet-level KPIs Dashboard */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 animate-fade-in">
              
              {/* Card 1: Saldo Total a Pagar */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Saldo Total a Pagar</span>
                  <div className="rounded-lg bg-indigo-50 p-1.5 text-indigo-700">
                    <DollarSign className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-xl font-black text-indigo-950">
                    R$ {financeDashboardKpis.saldoTotalAPagar.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Soma dos saldos credores da frota
                  </p>
                </div>
              </div>

              {/* Card 2: Veículos Aguardando Pagamento */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Aguardando Pagto</span>
                  <div className="rounded-lg bg-amber-50 p-1.5 text-amber-700">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-xl font-black text-amber-700">
                    {financeDashboardKpis.veiculosAguardandoPagamento} veículo(s)
                  </h3>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Com saldos credores pendentes
                  </p>
                </div>
              </div>

              {/* Card 3: Pagamentos Efetivados Hoje */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pagamentos de Hoje</span>
                  <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700">
                    <CheckCircle className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-xl font-black text-emerald-700">
                    R$ {financeDashboardKpis.pagamentosHojeValor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {financeDashboardKpis.pagamentosHojeCount} fechamentos hoje
                  </p>
                </div>
              </div>

              {/* Card 4: Pagamentos da Semana */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fechamentos Semana</span>
                  <div className="rounded-lg bg-blue-50 p-1.5 text-blue-700">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-xl font-black text-blue-800">
                    {financeDashboardKpis.pagamentosSemanaCount} ciclo(s)
                  </h3>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Efetuados nos últimos 7 dias
                  </p>
                </div>
              </div>

              {/* Card 5: Valor Pago na Semana */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pago na Semana</span>
                  <div className="rounded-lg bg-indigo-50 p-1.5 text-indigo-700">
                    <Calendar className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-xl font-black text-indigo-800">
                    R$ {financeDashboardKpis.valorPagoSemana.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Total pago nos últimos 7 dias
                  </p>
                </div>
              </div>

              {/* Card 6: Veículos com Saldo Negativo */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Saldo Negativo</span>
                  <div className="rounded-lg bg-rose-50 p-1.5 text-rose-700">
                    <TrendingDown className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-xl font-black text-rose-600">
                    {financeDashboardKpis.veiculosSaldoNegativoCount} veículo(s)
                  </h3>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Com saldos devedores ativos
                  </p>
                </div>
              </div>

            </div>

            {/* Tabs Selector */}
            <div className="flex border border-slate-200 bg-white rounded-xl p-1 shadow-sm gap-1">
              <button
                onClick={() => setActiveTab("vehicles")}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "vehicles"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                🚛 Contas Ativas da Frota
              </button>
              <button
                onClick={() => setActiveTab("payments")}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "payments"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                💸 Fechamento / Pagamentos
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "history"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                📜 Histórico de Pagamentos Geral
              </button>
            </div>

            {/* Filter and Table Card */}
            {activeTab === "vehicles" ? (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              
              {/* Filters Header */}
              <div className="border-b border-slate-100 bg-slate-50/50 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Buscar veículo (placa, modelo, motorista)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 text-slate-500" />
                      <span className="text-xs font-semibold uppercase text-slate-500">Filtros:</span>
                    </div>

                    {/* Unidade filter */}
                    <select 
                      value={unidadeFilter}
                      onChange={(e) => setUnidadeFilter(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none hover:bg-slate-50"
                    >
                      <option value="Todas">Todas as Unidades</option>
                      {unidades.map(u => (
                        <option key={u.id} value={u.id}>{u.nome}</option>
                      ))}
                    </select>

                    {/* Perfil filter */}
                    <select 
                      value={perfilFilter}
                      onChange={(e) => setPerfilFilter(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none hover:bg-slate-50"
                    >
                      <option value="Todas">Todos os Perfis</option>
                      {uniquePerfis.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>

                    {/* Status filter */}
                    <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none hover:bg-slate-50"
                    >
                      <option value="Todas">Todos os Status</option>
                      <option value="Ativo">Contas Ativas</option>
                      <option value="Bloqueado">Bloqueados</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Table Data */}
              <div className="overflow-x-auto">
                {loading && veiculos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                    <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
                    <p className="mt-4 text-sm font-medium">Buscando contas financeiras da frota...</p>
                  </div>
                ) : filteredVeiculos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                    <AlertCircle className="h-10 w-10 text-slate-300" />
                    <p className="mt-3 text-sm font-medium">Nenhum veículo encontrado com os filtros selecionados.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <th className="px-6 py-4">Veículo / Placa</th>
                        <th className="px-6 py-4">Perfil</th>
                        <th className="px-6 py-4">Unidade</th>
                        <th className="px-6 py-4">Motorista Vinculado</th>
                        <th className="px-6 py-4">Status Financeiro</th>
                        <th className="px-6 py-4 text-right">Saldo Corrente</th>
                        <th className="px-6 py-4 text-right">Saldo Disponível</th>
                        <th className="px-6 py-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredVeiculos.map(v => {
                        const isNeg = v.saldo < 0;
                        const isBlock = v.statusFinanceiro === "Bloqueado";
                        return (
                          <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-900">{v.modelo}</div>
                              <div className="font-mono text-xs text-slate-500">{v.placa} ({v.marca})</div>
                            </td>
                            <td className="px-6 py-4 text-slate-600 font-medium">
                              {v.perfil}
                            </td>
                            <td className="px-6 py-4 text-slate-600 font-medium">
                              {unidades.find(u => u.id === v.unidadeId)?.nome || v.unidadeId}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-slate-700 font-medium">{v.motoristaNome}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                isBlock 
                                  ? "bg-rose-50 text-rose-700" 
                                  : "bg-emerald-50 text-emerald-700"
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${isBlock ? "bg-rose-600" : "bg-emerald-600"}`} />
                                {v.statusFinanceiro}
                              </span>
                            </td>
                            <td className={`px-6 py-4 text-right font-bold ${isNeg ? "text-rose-600" : "text-emerald-600"}`}>
                              R$ {v.saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className={`px-6 py-4 text-right font-bold ${isBlock ? "text-slate-400" : isNeg ? "text-rose-600" : "text-emerald-600"}`}>
                              R$ {v.saldoDisponivel.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleAccessAccount(v.id)}
                                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-slate-800 transition"
                                >
                                  Acessar Extrato
                                </button>
                                {v.saldo > 0 && !isBlock && (
                                  <button
                                    onClick={() => handleStartPayment(v)}
                                    title="Realizar Pagamento de Fechamento"
                                    disabled={loadingPaymentVeiculoId !== null}
                                    className="rounded-lg border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-600 hover:bg-emerald-100 transition shadow-sm"
                                  >
                                    <DollarSign className="h-4 w-4" />
                                  </button>
                                )}
                                {canToggleStatus && (
                                  <button
                                    onClick={() => handleToggleStatus(v)}
                                    title={isBlock ? "Desbloquear Conta" : "Bloquear Conta"}
                                    className={`rounded-lg border p-1.5 hover:bg-slate-50 shadow-sm ${
                                      isBlock ? "border-rose-200 text-rose-600" : "border-slate-200 text-slate-500"
                                    }`}
                                  >
                                    {isBlock ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

            </div>
            ) : activeTab === "payments" ? (
              /* ================= PAYMENTS TAB VIEW ================= */
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden animate-fade-in">
                {/* Search & Filter Header */}
                <div className="border-b border-slate-100 bg-slate-50/50 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Buscar veículo (placa, modelo, motorista)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                      />
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      Mostrando apenas saldos que requerem atenção operacional de fechamento de terça-feira.
                    </div>
                  </div>
                </div>

                {filteredVeiculos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white">
                    <div className="rounded-full bg-slate-100 p-3 text-slate-400 mb-3">
                      <DollarSign className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Nenhum veículo localizado</h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Nenhum veículo corresponde aos filtros selecionados.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="px-6 py-4">Veículo / Placa</th>
                          <th className="px-6 py-4">Motorista Vinculado</th>
                          <th className="px-6 py-4 text-right">Saldo Disponível</th>
                          <th className="px-6 py-4 text-center">Status de Pagamento</th>
                          <th className="px-6 py-4 text-center">Ação Operacional</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
                        {filteredVeiculos.map((v) => {
                          const isBlock = v.statusFinanceiro === "Bloqueado";
                          const isNeg = v.saldo <= 0;
                          const canPay = v.saldo > 0 && !isBlock;

                          let statusLabel = "Sem Saldo a Pagar";
                          let statusColor = "bg-slate-50 text-slate-500 ring-slate-600/10";
                          let dotColor = "bg-slate-400";

                          if (isBlock) {
                            statusLabel = "Bloqueado";
                            statusColor = "bg-rose-50 text-rose-700 ring-rose-600/10";
                            dotColor = "bg-rose-600";
                          } else if (v.saldo > 0) {
                            statusLabel = "Pronto para Pagamento";
                            statusColor = "bg-emerald-50 text-emerald-700 ring-emerald-600/10";
                            dotColor = "bg-emerald-500 animate-pulse";
                          }

                          return (
                            <tr key={v.id} className="hover:bg-slate-50/50 transition">
                              <td className="px-6 py-4 font-normal">
                                <div>
                                  <span className="font-bold text-slate-900 block">{v.modelo} {v.marca}</span>
                                  <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{v.placa}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-slate-600 font-normal">
                                {v.motoristaNome || "Sem Motorista"}
                              </td>
                              <td className={`px-6 py-4 text-right font-bold text-sm ${isNeg ? "text-slate-500" : "text-emerald-600"}`}>
                                R$ {v.saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${statusColor}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                                  {statusLabel}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={() => handleStartPayment(v)}
                                  disabled={!canPay || loadingPaymentVeiculoId !== null}
                                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white shadow-sm transition ${
                                    canPay 
                                      ? "bg-slate-900 hover:bg-slate-800 cursor-pointer" 
                                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                  }`}
                                >
                                  {loadingPaymentVeiculoId === v.id ? (
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <DollarSign className="h-3.5 w-3.5" />
                                  )}
                                  Realizar Pagamento
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              /* ================= HISTORY TAB VIEW ================= */
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden animate-fade-in">
                {/* Search & Filter Header */}
                <div className="border-b border-slate-100 bg-slate-50/50 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Buscar por n° fechamento, placa, modelo, motorista..."
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4 text-slate-500" />
                        <span className="text-xs font-semibold uppercase text-slate-500">Filtrar Forma:</span>
                      </div>
                      <select 
                        value={historyMethodFilter}
                        onChange={(e) => setHistoryMethodFilter(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none hover:bg-slate-50"
                      >
                        <option value="Todos">Todas as Formas</option>
                        <option value="PIX">PIX</option>
                        <option value="TED">TED</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Table or Empty State */}
                {filteredHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white">
                    <div className="rounded-full bg-slate-100 p-3 text-slate-400 mb-3">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Nenhum faturamento registrado</h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Nenhum fechamento ou pagamento foi localizado com os critérios informados.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="px-6 py-4">N° Fechamento</th>
                          <th className="px-6 py-4">Veículo</th>
                          <th className="px-6 py-4">Motorista</th>
                          <th className="px-6 py-4">Período</th>
                          <th className="px-6 py-4 text-right">Valor Líquido</th>
                          <th className="px-6 py-4 text-center">Forma</th>
                          <th className="px-6 py-4">Responsável</th>
                          <th className="px-6 py-4">Data/Hora</th>
                          <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
                        {filteredHistory.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition">
                            <td className="px-6 py-4 font-mono font-bold text-slate-900">
                              {item.numeroFechamento || "N/A"}
                            </td>
                            <td className="px-6 py-4 font-normal">
                              <div>
                                <span className="font-bold text-slate-900 block">{item.veiculoModelo}</span>
                                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{item.veiculoPlaca}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-600 font-normal">
                              {item.motoristaNome || "Sem Motorista"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-normal">
                              {new Date(item.dataInicio + "T12:00:00").toLocaleDateString("pt-BR")} até {new Date(item.dataFim + "T12:00:00").toLocaleDateString("pt-BR")}
                            </td>
                            <td className="px-6 py-4 text-right font-black text-slate-900">
                              R$ {Number(item.saldoFinal).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold ring-1 ring-inset ${
                                item.formaPagamento === "PIX" 
                                  ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                                  : item.formaPagamento === "TED"
                                  ? "bg-blue-50 text-blue-700 ring-blue-600/20"
                                  : "bg-slate-50 text-slate-700 ring-slate-600/20"
                              }`}>
                                {item.formaPagamento}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-500 font-normal">
                              {item.criadoPor || "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-normal">
                              <div>
                                <div>{item.dataPagamento ? new Date(item.dataPagamento + "T12:00:00").toLocaleDateString("pt-BR") : "N/A"}</div>
                                <div className="text-[10px] text-slate-400">{item.horaPagamento || "N/A"}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedClosureForReceipt(item);
                                    setIsReceiptModalOpen(true);
                                  }}
                                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                                  title="Visualizar Recibo"
                                >
                                  <Eye className="h-3.5 w-3.5 text-slate-500" />
                                  <span>Recibo</span>
                                </button>
                                
                                {currentUser.tipo_usuario === "MASTER" && (
                                  <button
                                    onClick={() => handleReabrirPeriodo(item.id, item.veiculoId)}
                                    className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-100 transition"
                                    title="Excluir Fechamento e Reabrir Período"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>Reabrir</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        ) : (
          // ================= EXTRATO & LEDGER VIEW =================
          <div className="space-y-6 animate-fade-in">
            
            {/* Back Header */}
            <div className="flex items-center justify-between">
              <button 
                onClick={handleBackToList}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar à Lista da Frota
              </button>

              <div className="flex items-center gap-2">
                {canToggleStatus && extratoData && (
                  <button
                    onClick={() => handleToggleStatus(extratoData.pessoa)}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold shadow-sm transition ${
                      extratoData.pessoa.statusFinanceiro === "Bloqueado"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        : "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100"
                    }`}
                  >
                    {extratoData.pessoa.statusFinanceiro === "Bloqueado" ? (
                      <>
                        <Unlock className="h-4 w-4" /> Unidade: Desbloquear Conta
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" /> Unidade: Bloquear Conta
                      </>
                    )}
                  </button>
                )}

                {canWrite && (
                  <button
                    onClick={() => setIsFecharSemanaOpen(true)}
                    className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow hover:bg-slate-800 transition"
                  >
                    <Check className="h-4 w-4" />
                    Faturar / Fechar Semana
                  </button>
                )}
              </div>
            </div>

            {/* Vehicle Details & Quick stats Card */}
            {extratoData && (
              <div className="grid gap-6 md:grid-cols-3">
                
                {/* Vehicle account specs */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
                  <div className="space-y-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Especificações do Veículo</span>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{extratoData.pessoa.nome}</h2>
                      <p className="text-sm font-medium text-slate-500">Modelo: {extratoData.pessoa.modelo} ({extratoData.pessoa.marca})</p>
                    </div>

                    <div className="space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-400">Perfil de Operação:</span>
                        <span className="font-bold text-slate-800">{extratoData.pessoa.perfil}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-400">Placa:</span>
                        <span className="font-mono font-bold text-slate-800">{extratoData.pessoa.placa}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-400">Motorista Vinculado:</span>
                        <span className="font-bold text-slate-800">{extratoData.pessoa.motoristaNome}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-400">Unidade Logística:</span>
                        <span className="font-bold text-slate-800">
                          {unidades.find(u => u.id === extratoData.pessoa.unidadeId)?.nome || extratoData.pessoa.unidadeId}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-400">Status Financeiro:</span>
                        <span className={`font-bold ${extratoData.pessoa.statusFinanceiro === "Bloqueado" ? "text-rose-600" : "text-emerald-600"}`}>
                          {extratoData.pessoa.statusFinanceiro}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account balance and availability */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Saldo Ativo / Período Corrente</span>
                    <div>
                      <div className="text-xs text-slate-500 font-medium">Saldo Total Operacional</div>
                      <h2 className={`text-3xl font-bold ${extratoData.pessoa.saldo < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                        R$ {extratoData.pessoa.saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </h2>
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <div className="text-xs text-slate-500 font-medium">Saldo Disponível para Saque/Adiantamentos</div>
                      <h3 className={`text-xl font-bold ${extratoData.pessoa.statusFinanceiro === "Bloqueado" ? "text-slate-400" : extratoData.pessoa.saldo < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                        R$ {extratoData.pessoa.saldoDisponivel.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </h3>
                      {extratoData.pessoa.statusFinanceiro === "Bloqueado" && (
                        <p className="mt-1 text-xs text-rose-500 font-semibold flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Conta retida por restrição.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Accumulated active values */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Acumulado do Período</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg bg-emerald-50/50 p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Receitas</span>
                        <div className="mt-1 font-bold text-emerald-800 text-sm">
                          +R$ {extratoData.pessoa.creditos.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>

                      <div className="rounded-lg bg-rose-50/50 p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-rose-700">Descontos</span>
                        <div className="mt-1 font-bold text-rose-800 text-sm">
                          -R$ {extratoData.pessoa.debitos.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 text-center italic">
                      Apenas lançamentos que não foram faturados em fechamentos anteriores.
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Distribution Charts */}
            {extratoData && barChartData.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider text-slate-500">Distribuição Financeira por Categoria</h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={11} stroke="#64748b" />
                      <YAxis fontSize={11} stroke="#64748b" />
                      <Tooltip formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, '']} />
                      <Legend fontSize={11} />
                      <Bar dataKey="receita" name="Créditos (Receita)" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="desconto" name="Débitos (Custos)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Ledger Transactions Grid */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              
              {/* Filter bar */}
              <div className="border-b border-slate-100 bg-slate-50/50 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Buscar movimento (obs, responsante)..."
                      value={extratoSearchQuery}
                      onChange={(e) => setExtratoSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-4 text-xs outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-1"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
                    
                    {/* Filter type */}
                    <select
                      value={extratoTipoFilter}
                      onChange={(e) => setExtratoTipoFilter(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-700 outline-none"
                    >
                      <option value="Todos">Crédito/Débito</option>
                      <option value="Crédito">Créditos</option>
                      <option value="Débito">Débitos</option>
                    </select>

                    {/* Filter Origin */}
                    <select
                      value={extratoOrigemFilter}
                      onChange={(e) => setExtratoOrigemFilter(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-700 outline-none"
                    >
                      <option value="Todos">Todas Origens</option>
                      {extratoUniqueOrigins.map(org => (
                        <option key={org} value={org}>{org}</option>
                      ))}
                    </select>

                    {/* Filter status */}
                    <select
                      value={extratoStatusFilter}
                      onChange={(e) => setExtratoStatusFilter(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-700 outline-none"
                    >
                      <option value="Todos">Faturamento: Todos</option>
                      <option value="Pendente">Pendentes (Atuais)</option>
                      <option value="Faturado">Faturados</option>
                    </select>

                    {/* Start Date */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400">De:</span>
                      <input 
                        type="date"
                        value={extratoStartDate}
                        onChange={(e) => setExtratoStartDate(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px]"
                      />
                    </div>

                    {/* End Date */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400">Até:</span>
                      <input 
                        type="date"
                        value={extratoEndDate}
                        onChange={(e) => setExtratoEndDate(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px]"
                      />
                    </div>

                  </div>

                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto">
                {filteredExtrato.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                    <AlertCircle className="h-8 w-8 text-slate-300" />
                    <p className="mt-3 text-sm">Nenhum lançamento financeiro correspondente aos filtros.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <th className="px-6 py-3.5">Data / Hora</th>
                        <th className="px-6 py-3.5">Origem</th>
                        <th className="px-6 py-3.5">Descrição / Observação</th>
                        <th className="px-6 py-3.5">Valor</th>
                        <th className="px-6 py-3.5">Responsável</th>
                        <th className="px-6 py-3.5 text-right">Saldo Calculado</th>
                        <th className="px-6 py-3.5 text-center">Faturamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredExtrato.map((m) => {
                        const isCredit = m.tipo === "Crédito";
                        return (
                          <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-semibold text-slate-900">
                                {new Date(m.data + "T12:00:00").toLocaleDateString("pt-BR")}
                              </div>
                              <div className="text-xs text-slate-400">{m.hora || "12:00"}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-bold ${
                                m.origem === "Frete" ? "bg-emerald-50 text-emerald-700" :
                                m.origem === "Disponibilidade" ? "bg-teal-50 text-teal-700" :
                                m.origem === "Vale" ? "bg-rose-50 text-rose-700" :
                                m.origem === "Descarga" ? "bg-amber-50 text-amber-700" :
                                m.origem === "Pagamento" ? "bg-indigo-600 text-white shadow-sm font-black" :
                                "bg-indigo-50 text-indigo-700"
                              }`}>
                                {m.origem}
                              </span>
                            </td>
                            <td className="px-6 py-4 max-w-xs">
                              <div className="text-slate-800 font-medium truncate" title={m.observacao}>
                                {m.observacao || "Sem descrição"}
                              </div>
                              {m.dtId && (
                                <div className="text-xs text-slate-500">DT Associada: <span className="font-semibold">{m.dtId}</span></div>
                              )}
                            </td>
                            <td className={`px-6 py-4 font-bold whitespace-nowrap ${isCredit ? "text-emerald-600" : "text-rose-600"}`}>
                              {isCredit ? "+" : "-"} R$ {m.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-slate-500 text-xs">
                              {m.usuario || "Sistema"}
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap font-semibold text-slate-700">
                              R$ {m.saldoPosterior.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {m.faturado ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                                  Faturado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                                  Pendente
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

            </div>

            {/* Historic Closures (Histórico de Fechamentos Semanais) */}
            {extratoData && extratoData.fechamentosSemanais && extratoData.fechamentosSemanais.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <FileText className="h-5 w-5 text-slate-500" />
                  <h3 className="font-bold text-slate-800">Histórico de Fechamentos Semanais</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase text-slate-500">
                        <th className="px-4 py-2">ID</th>
                        <th className="px-4 py-2">Período de Faturamento</th>
                        <th className="px-4 py-2 text-right">Receitas</th>
                        <th className="px-4 py-2 text-right">Descontos</th>
                        <th className="px-4 py-2 text-right">Saldo Final Faturado</th>
                        <th className="px-4 py-2">Feito Em</th>
                        <th className="px-4 py-2">Responsável</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {extratoData.fechamentosSemanais.map((w) => (
                        <tr key={w.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">
                            {w.id}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {new Date(w.dataInicio + "T12:00:00").toLocaleDateString("pt-BR")} até {new Date(w.dataFim + "T12:00:00").toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-600 font-semibold">
                            R$ {w.totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-rose-600 font-semibold">
                            R$ {w.totalDescontos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`px-4 py-3 text-right font-bold ${w.saldoFinal < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                            R$ {w.saldoFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {new Date(w.criadoEm).toLocaleDateString("pt-BR")} {new Date(w.criadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {w.criadoPor}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* MODAL: FECHAR SEMANA / FATURAR PERÍODO */}
      {isFecharSemanaOpen && extratoData && (
        <div id="closure-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-slate-800" />
                <h3 className="text-lg font-bold text-slate-900">Novo Fechamento de Faturamento Semanal</h3>
              </div>
              <button onClick={() => setIsFecharSemanaOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFecharSemana} className="space-y-4">
              
              <div className="rounded-lg bg-slate-50 p-4 border border-slate-100 text-xs text-slate-600 space-y-2">
                <p className="font-semibold text-slate-800 uppercase">Instruções de Faturamento:</p>
                <p>O faturamento semanal irá calcular e agrupar todas as receitas e descontos operacionais que ainda não foram marcados como faturados para este veículo.</p>
                <p>Ao salvar, o período será registrado como **PAGO/FATURADO**, e os lançamentos correspondentes não serão somados ao saldo ativo das próximas semanas.</p>
              </div>

              {/* Date Selection */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Início do Período</label>
                  <input 
                    type="date"
                    required
                    value={closureStartDate}
                    onChange={(e) => setClosureStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fim do Período</label>
                  <input 
                    type="date"
                    required
                    value={closureEndDate}
                    onChange={(e) => setClosureEndDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              {/* Dynamic calculations list */}
              {currentUnfaturadoClosureCalculations && (
                <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-white">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5 flex justify-between">
                    <span>Memória de Cálculo ({currentUnfaturadoClosureCalculations.movementsCount} movimentos)</span>
                    <span className="text-slate-600">Período ativo selecionado</span>
                  </div>

                  {/* Credits */}
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <div className="flex justify-between font-semibold">
                      <span>(+) Receitas de Fretes Consolizados</span>
                      <span className="text-emerald-600">R$ {currentUnfaturadoClosureCalculations.receitasFretes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>(+) Receitas de Diária/Disponibilidade</span>
                      <span className="text-emerald-600">R$ {currentUnfaturadoClosureCalculations.receitasDisponibilidade.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                    {currentUnfaturadoClosureCalculations.receitasBonificacoes > 0 && (
                      <div className="flex justify-between font-semibold">
                        <span>(+) Diárias Extras / Bonificações</span>
                        <span className="text-emerald-600">R$ {currentUnfaturadoClosureCalculations.receitasBonificacoes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {currentUnfaturadoClosureCalculations.receitasOutros > 0 && (
                      <div className="flex justify-between font-semibold">
                        <span>(+) Outros Créditos Gerais</span>
                        <span className="text-emerald-600">R$ {currentUnfaturadoClosureCalculations.receitasOutros.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-b border-slate-100 pb-1 text-slate-950 font-bold">
                      <span>(=) TOTAL DE RECEITAS</span>
                      <span className="text-emerald-600">R$ {currentUnfaturadoClosureCalculations.totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Debits */}
                  <div className="space-y-1.5 text-xs text-slate-700 pt-1">
                    <div className="flex justify-between font-semibold">
                      <span>(-) Custos de Vales/Avarias de Carga</span>
                      <span className="text-rose-600">R$ {currentUnfaturadoClosureCalculations.descontosVales.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                    {currentUnfaturadoClosureCalculations.descontosAdiantamentos > 0 && (
                      <div className="flex justify-between font-semibold">
                        <span>(-) Adiantamentos de Viagem Realizados</span>
                        <span className="text-rose-600">R$ {currentUnfaturadoClosureCalculations.descontosAdiantamentos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {currentUnfaturadoClosureCalculations.descontosGerais > 0 && (
                      <div className="flex justify-between font-semibold">
                        <span>(-) Multas e Descontos Operacionais</span>
                        <span className="text-rose-600">R$ {currentUnfaturadoClosureCalculations.descontosGerais.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {currentUnfaturadoClosureCalculations.descontosDescargas > 0 && (
                      <div className="flex justify-between font-semibold text-slate-400">
                        <span>(-) Taxas de Descargas (Faturamento Desacoplado)</span>
                        <span className="text-rose-400">R$ {currentUnfaturadoClosureCalculations.descontosDescargas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {currentUnfaturadoClosureCalculations.descontosManutencoes > 0 && (
                      <div className="flex justify-between font-semibold text-slate-400">
                        <span>(-) Despesas de Manutenção (Faturamento Desacoplado)</span>
                        <span className="text-rose-400">R$ {currentUnfaturadoClosureCalculations.descontosManutencoes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-b border-slate-100 pb-1 text-slate-950 font-bold">
                      <span>(=) TOTAL DE DESCONTOS</span>
                      <span className="text-rose-600">R$ {currentUnfaturadoClosureCalculations.totalDescontos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Result */}
                  <div className="flex justify-between items-center rounded-lg bg-slate-50 p-3 border border-slate-100">
                    <div className="text-xs font-bold text-slate-800 uppercase">Saldo Líquido Faturado (Semana)</div>
                    <div className={`text-lg font-black ${currentUnfaturadoClosureCalculations.saldoFinal < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      R$ {currentUnfaturadoClosureCalculations.saldoFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsFecharSemanaOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {submitting ? "Gravando Fechamento..." : "Confirmar e Registrar Faturamento"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL: VISUALIZAR RECIBO / COMPROVANTE */}
      {isReceiptModalOpen && selectedClosureForReceipt && (
        <div id="receipt-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in print:bg-white print:p-0 print:absolute print:inset-0 print:z-10">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:shadow-none print:border-none print:p-0">
            
            {/* Modal Header / Actions (Hidden on print) */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">Comprovante de Pagamento de Frota</h3>
              </div>
              <button 
                onClick={() => { setSelectedClosureForReceipt(null); setIsReceiptModalOpen(false); }} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Printable Receipt Frame */}
            <div className="border border-slate-200 rounded-xl p-6 space-y-6 bg-white font-sans text-slate-800 print:border-none print:p-0">
              
              {/* Header block with Logo placeholder & details */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-950">AMPLA LOGÍSTICA E TRANSPORTE S/A</h1>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">CNPJ: 42.128.539/0001-90 | Matriz Rondonópolis-MT</p>
                  <p className="text-[10px] text-slate-400">Rua das Operações Logísticas, N° 1000 - Centro Empresarial</p>
                </div>
                <div className="text-right">
                  <span className="inline-block bg-slate-900 text-white font-mono text-xs font-black px-3 py-1.5 rounded-lg uppercase">
                    RECIBO N° {selectedClosureForReceipt.numeroFechamento || "N/A"}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">Processamento: {new Date(selectedClosureForReceipt.criadoEm || selectedClosureForReceipt.dataPagamento).toLocaleString("pt-BR")}</p>
                </div>
              </div>

              {/* Subject Description */}
              <div className="text-xs space-y-2 border-b border-slate-100 pb-4">
                <h4 className="font-bold text-slate-900 uppercase tracking-wide">Declaração de Recebimento de Valores</h4>
                <p className="leading-relaxed">
                  Declaramos para os devidos fins de direito e controle financeiro de frota agregada, que o veículo descrito abaixo recebeu o pagamento líquido discriminado, correspondente ao faturamento operacional de fretes, diárias de disponibilidade e descontos do período assinalado, dando plena e geral quitação do respectivo período.
                </p>
              </div>

              {/* Fleet Account Specifications */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Veículo Faturado</span>
                  <strong className="text-slate-950 font-bold text-sm block mt-0.5">{selectedClosureForReceipt.veiculoModelo || "N/A"}</strong>
                  <span className="text-[10px] font-mono font-black text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded mt-1 inline-block">{selectedClosureForReceipt.veiculoPlaca || selectedClosureForReceipt.placa || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Motorista / Beneficiário</span>
                  <strong className="text-slate-950 font-bold text-sm block mt-0.5">{selectedClosureForReceipt.motoristaNome || "Sem Motorista Vinculado"}</strong>
                  <span className="text-[10px] text-slate-500 mt-1 block">Perfil de Agregação: {selectedClosureForReceipt.veiculoPerfil || "Padrão"}</span>
                </div>
                <div className="border-t border-slate-200/60 pt-2 col-span-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Período de Faturamento</span>
                  <strong className="text-slate-800 block mt-0.5">
                    {new Date(selectedClosureForReceipt.dataInicio + "T12:00:00").toLocaleDateString("pt-BR")} até {new Date(selectedClosureForReceipt.dataFim + "T12:00:00").toLocaleDateString("pt-BR")}
                  </strong>
                </div>
              </div>

              {/* Financial Calculations breakdown */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide">Demonstrativo Financeiro do Fechamento</h4>
                <div className="border border-slate-100 rounded-lg overflow-hidden text-xs">
                  
                  {/* Table Header */}
                  <div className="grid grid-cols-3 bg-slate-100 px-4 py-2 font-bold text-[10px] uppercase tracking-wider text-slate-600">
                    <span>Descrição da Rubrica</span>
                    <span className="text-right">Proventos (Créditos)</span>
                    <span className="text-right">Descontos (Débitos)</span>
                  </div>

                  {/* Calculations Body */}
                  <div className="divide-y divide-slate-100 bg-white px-4">
                    
                    {/* Freights */}
                    <div className="grid grid-cols-3 py-2 text-slate-700">
                      <span>Receitas de Fretes Consolidadas</span>
                      <span className="text-right text-emerald-600 font-bold">R$ {Number(selectedClosureForReceipt.receitasFretes || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="text-right text-slate-300">-</span>
                    </div>

                    {/* Availability */}
                    <div className="grid grid-cols-3 py-2 text-slate-700">
                      <span>Diárias de Disponibilidade da Frota</span>
                      <span className="text-right text-emerald-600 font-bold">R$ {Number(selectedClosureForReceipt.receitasDisponibilidade || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="text-right text-slate-300">-</span>
                    </div>

                    {/* Other Credits */}
                    {Number(selectedClosureForReceipt.receitasBonificacoes || 0) + Number(selectedClosureForReceipt.receitasOutros || 0) > 0 && (
                      <div className="grid grid-cols-3 py-2 text-slate-700">
                        <span>Outras Bonificações / Ajustes de Crédito</span>
                        <span className="text-right text-emerald-600 font-bold">R$ {Number((selectedClosureForReceipt.receitasBonificacoes || 0) + (selectedClosureForReceipt.receitasOutros || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span className="text-right text-slate-300">-</span>
                      </div>
                    )}

                    {/* Vales */}
                    <div className="grid grid-cols-3 py-2 text-slate-700">
                      <span>(-) Custos de Vales / Avarias descontados</span>
                      <span className="text-right text-slate-300">-</span>
                      <span className="text-right text-rose-600 font-bold">R$ {Number(selectedClosureForReceipt.descontosVales || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    {/* Travel Advances */}
                    {Number(selectedClosureForReceipt.descontosAdiantamentos || 0) > 0 && (
                      <div className="grid grid-cols-3 py-2 text-slate-700">
                        <span>(-) Adiantamentos de Viagem Realizados</span>
                        <span className="text-right text-slate-300">-</span>
                        <span className="text-right text-rose-600 font-bold">R$ {Number(selectedClosureForReceipt.descontosAdiantamentos || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}

                    {/* Outros descontos */}
                    {Number(selectedClosureForReceipt.descontosGerais || 0) > 0 && (
                      <div className="grid grid-cols-3 py-2 text-slate-700">
                        <span>(-) Multas e Ajustes Operacionais</span>
                        <span className="text-right text-slate-300">-</span>
                        <span className="text-right text-rose-600 font-bold">R$ {Number(selectedClosureForReceipt.descontosGerais || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}

                  </div>

                  {/* Summary Footer */}
                  <div className="border-t-2 border-slate-900 bg-slate-50 px-4 py-3 font-bold">
                    <div className="grid grid-cols-3 text-slate-900">
                      <span>SALDO LÍQUIDO PROCESSADO</span>
                      <span className="text-right text-emerald-700">R$ {Number((selectedClosureForReceipt.receitasFretes || 0) + (selectedClosureForReceipt.receitasDisponibilidade || 0) + (selectedClosureForReceipt.receitasBonificacoes || 0) + (selectedClosureForReceipt.receitasOutros || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      <span className="text-right text-rose-700">R$ {Number((selectedClosureForReceipt.descontosVales || 0) + (selectedClosureForReceipt.descontosAdiantamentos || 0) + (selectedClosureForReceipt.descontosGerais || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="grid grid-cols-2 text-sm mt-2 border-t border-slate-200/60 pt-2 text-slate-950 font-black">
                      <span>VALOR TOTAL EFETIVADO</span>
                      <span className="text-right text-lg text-indigo-900">
                        R$ {Number(selectedClosureForReceipt.saldoFinal || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Payment Details & Observations */}
              <div className="grid grid-cols-3 gap-4 text-xs border-t border-b border-slate-100 py-4">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Forma de Pagamento</span>
                  <strong className="text-slate-800 text-sm mt-0.5 block">{selectedClosureForReceipt.formaPagamento || "PIX"}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Data Efetivação</span>
                  <strong className="text-slate-800 text-sm mt-0.5 block">{selectedClosureForReceipt.dataPagamento ? new Date(selectedClosureForReceipt.dataPagamento + "T12:00:00").toLocaleDateString("pt-BR") : "N/A"}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Operador Responsável</span>
                  <strong className="text-slate-800 text-sm mt-0.5 block truncate" title={selectedClosureForReceipt.criadoPor}>{selectedClosureForReceipt.criadoPor || "N/A"}</strong>
                </div>
                {selectedClosureForReceipt.observacoes && (
                  <div className="col-span-3 bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-slate-600 italic">
                    <span className="text-[9px] font-bold uppercase text-slate-400 not-italic block mb-0.5">Observações Operacionais</span>
                    "{selectedClosureForReceipt.observacoes}"
                  </div>
                )}
              </div>

              {/* Signatures (Visible only on print or beautifully styled on screen) */}
              <div className="grid grid-cols-2 gap-8 pt-10 text-center text-xs">
                <div>
                  <div className="border-t border-slate-300 mx-auto w-48 pt-1 text-slate-500">
                    Departamento de Controladoria<br /><strong>AMPLA LOGÍSTICA S/A</strong>
                  </div>
                </div>
                <div>
                  <div className="border-t border-slate-300 mx-auto w-48 pt-1 text-slate-500">
                    Assinatura do Motorista/Beneficiário<br /><strong>{selectedClosureForReceipt.motoristaNome || "Agregado"}</strong>
                  </div>
                </div>
              </div>

            </div>

            {/* Action buttons (Hidden on print) */}
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 print:hidden">
              <button
                type="button"
                onClick={() => { setSelectedClosureForReceipt(null); setIsReceiptModalOpen(false); }}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-indigo-500 transition flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Imprimir Recibo
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
