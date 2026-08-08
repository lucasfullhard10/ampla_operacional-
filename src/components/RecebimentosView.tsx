import React, { useState, useEffect, useMemo } from "react";
import { 
  DollarSign, Search, Calendar, FileText, CheckCircle2, AlertTriangle, 
  Clock, TrendingUp, Filter, Download, PlusCircle, ArrowUpRight, 
  RefreshCw, Edit3, Trash2, User, Truck, MapPin, Receipt, WalletCards, 
  HelpCircle, ChevronRight, BookOpen, BarChart3, Building, Scale, TrendingDown, CheckSquare, Eye, Edit
} from "lucide-react";
import { Unidade, Usuario } from "../types";

interface RecebimentoTitle {
  id: string;
  dt: string;
  cliente: string;
  veiculoId: string;
  motoristaId: string;
  origem: string;
  destino: string;
  valorFrete: number;
  valorPedagiosReembolsaveis: number;
  valorDiarias: number;
  outrosAcrescimos: number;
  valorTotal: number;
  dataEntrega: string;
  dataVencimento: string;
  status: "A Receber" | "Recebido" | "Parcial" | "Vencido" | "Cancelado" | "Em Contestação";
  responsavel: string;
  observacoes?: string;
  unidadeId: string;
  
  dataRecebimento?: string;
  valorRecebido?: number;
  formaRecebimento?: string;
  observacaoBaixa?: string;
  historicoBaixas?: Array<{
    data: string;
    valor: number;
    forma: string;
    observacao?: string;
    usuario: string;
  }>;

  // AMPLA v2.2 - Fase 11 Enriched properties
  valorDisponibilidade?: number;
  valorDescarga?: number;
  valorReentrega?: number;
  outrasReceitas?: number;
  valorVale?: number;
  valorPedagio?: number;
  valorAbastecimento?: number;
  valorDescontos?: number;
  valorChapas?: number;
  outrosCustos?: number;
  receitaTotal?: number;
  custoTotal?: number;
  resultadoOperacional?: number;
}

interface RecebimentosViewProps {
  currentUser: Usuario;
  unidades: Unidade[];
  onRefresh?: () => void;
}

export default function RecebimentosView({ currentUser, unidades, onRefresh }: RecebimentosViewProps) {
  const [titles, setTitles] = useState<RecebimentoTitle[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"panel" | "clients" | "reports">("panel");
  
  // Separation of Contas a Receber and Contas a Pagar
  const [financialTab, setFinancialTab] = useState<"receber" | "pagar">("receber");
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [pagarLoading, setPagarLoading] = useState(false);
  const [statusPagarFilter, setStatusPagarFilter] = useState<string>("Todos");

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [unidadeFilter, setUnidadeFilter] = useState<string>("Todas");
  const [dateType, setDateType] = useState<"entrega" | "vencimento">("vencimento");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Settlement (Baixa) Modal state (Contas a Receber)
  const [selectedTitle, setSelectedTitle] = useState<RecebimentoTitle | null>(null);
  const [baixaModalOpen, setBaixaModalOpen] = useState(false);
  const [baixaDate, setBaixaDate] = useState(new Date().toISOString().split("T")[0]);
  const [baixaValue, setBaixaValue] = useState<string>("");
  const [baixaMethod, setBaixaMethod] = useState<string>("PIX");
  const [baixaObs, setBaixaObs] = useState<string>("");

  // Settlement (Baixa) Modal state (Contas a Pagar)
  const [selectedPayable, setSelectedPayable] = useState<any | null>(null);
  const [baixaPagarModalOpen, setBaixaPagarModalOpen] = useState(false);
  const [baixaPagarDate, setBaixaPagarDate] = useState(new Date().toISOString().split("T")[0]);
  const [baixaPagarValue, setBaixaPagarValue] = useState<string>("");
  const [baixaPagarMethod, setBaixaPagarMethod] = useState<string>("PIX");
  const [baixaPagarObs, setBaixaPagarObs] = useState<string>("");

  // Details Modal state
  const [detailsTitle, setDetailsTitle] = useState<RecebimentoTitle | null>(null);
  const [detailsPayable, setDetailsPayable] = useState<any | null>(null);

  // Manual / Edit Modal state (Contas a Receber)
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState<RecebimentoTitle | null>(null);
  const [formDt, setFormDt] = useState("");
  const [formCliente, setFormCliente] = useState("");
  const [formVeiculo, setFormVeiculo] = useState("");
  const [formMotorista, setFormMotorista] = useState("");
  const [formOrigem, setFormOrigem] = useState("Goiânia - Matriz");
  const [formDestino, setFormDestino] = useState("");
  const [formFrete, setFormFrete] = useState<number>(0);
  const [formPedagio, setFormPedagio] = useState<number>(0);
  const [formDiaria, setFormDiaria] = useState<number>(0);
  const [formOutros, setFormOutros] = useState<number>(0);
  const [formVencimento, setFormVencimento] = useState("");
  const [formEntrega, setFormEntrega] = useState(new Date().toISOString().split("T")[0]);
  const [formUnidade, setFormUnidade] = useState("");
  const [formObs, setFormObs] = useState("");

  // Manual / Edit Modal state (Contas a Pagar)
  const [pagarFormModalOpen, setPagarFormModalOpen] = useState(false);
  const [editingPayable, setEditingPayable] = useState<any | null>(null);
  const [formPagarDt, setFormPagarDt] = useState("");
  const [formPagarCliente, setFormPagarCliente] = useState("Heineken");
  const [formPagarMotoristaId, setFormPagarMotoristaId] = useState("");
  const [formPagarMotoristaNome, setFormPagarMotoristaNome] = useState("");
  const [formPagarVeiculo, setFormPagarVeiculo] = useState("");
  const [formPagarFrete, setFormPagarFrete] = useState<number>(0);
  const [formPagarDisponibilidade, setFormPagarDisponibilidade] = useState<number>(0);
  const [formPagarDiarias, setFormPagarDiarias] = useState<number>(0);
  const [formPagarAdiantamentos, setFormPagarAdiantamentos] = useState<number>(0);
  const [formPagarDescontos, setFormPagarDescontos] = useState<number>(0);
  const [formPagarVencimento, setFormPagarVencimento] = useState("");
  const [formPagarGeracao, setFormPagarGeracao] = useState(new Date().toISOString().split("T")[0]);
  const [formPagarUnidade, setFormPagarUnidade] = useState("");
  const [formPagarObs, setFormPagarObs] = useState("");

  // Notifications
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const isFinanceUser = useMemo(() => {
    const profile = currentUser.tipo_usuario || "";
    const role = currentUser.perfil || "";
    return profile === "MASTER" || role === "admin_master" || profile === "FINANCEIRO";
  }, [currentUser]);

  const isSupervisorUser = useMemo(() => {
    const profile = currentUser.tipo_usuario || "";
    const role = currentUser.perfil || "";
    return profile === "SUPERVISOR" || role === "admin_unidade";
  }, [currentUser]);

  // Fetch titles
  const fetchTitles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recebimentos", {
        headers: {
          "x-user-email": currentUser.email,
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTitles(data);
      } else {
        showToast("Falha ao obter faturamentos do servidor.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Erro na requisição dos recebimentos.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch accounts payable
  const fetchPagamentos = async () => {
    setPagarLoading(true);
    try {
      const res = await fetch("/api/pagamentos", {
        headers: {
          "x-user-email": currentUser.email,
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPagamentos(data);
      } else {
        showToast("Falha ao obter contas a pagar do servidor.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Erro na requisição das contas a pagar.", "error");
    } finally {
      setPagarLoading(false);
    }
  };

  useEffect(() => {
    fetchTitles();
    fetchPagamentos();
  }, [currentUser]);

  const filteredPagamentos = useMemo(() => {
    return pagamentos.filter((p) => {
      // 1. Search term
      if (searchTerm.trim() !== "") {
        const term = searchTerm.toLowerCase();
        const matchesDt = p.dt && p.dt.toLowerCase().includes(term);
        const matchesMotorista = p.motoristaNome && p.motoristaNome.toLowerCase().includes(term);
        const matchesVeiculo = p.veiculoId && p.veiculoId.toLowerCase().includes(term);
        if (!matchesDt && !matchesMotorista && !matchesVeiculo) return false;
      }

      // 2. Unit
      if (unidadeFilter !== "Todas") {
        if (p.unidadeId !== unidadeFilter) return false;
      }

      // 3. Status
      const previousPaid = (p.historicoBaixas || []).reduce((sum: number, b: any) => sum + Number(b.valor), 0);
      const isPaid = previousPaid >= Number(p.valorTotal);
      const isPartial = previousPaid > 0 && previousPaid < Number(p.valorTotal);
      const isOverdue = !isPaid && new Date(p.dataVencimento) < new Date(new Date().setHours(0,0,0,0));

      let computedStatus = "A Pagar";
      if (isPaid) computedStatus = "Pago";
      else if (isPartial) computedStatus = "Parcial";
      else if (isOverdue) computedStatus = "Vencido";

      if (statusPagarFilter !== "Todos") {
        if (statusPagarFilter === "Vencido" && computedStatus !== "Vencido") return false;
        if (statusPagarFilter === "Pago" && computedStatus !== "Pago") return false;
        if (statusPagarFilter === "Parcial" && computedStatus !== "Parcial") return false;
        if (statusPagarFilter === "A Pagar" && (computedStatus === "Pago" || computedStatus === "Cancelado")) return false;
      }

      // 4. Date filtering
      if (startDate) {
        const compareDate = p.dataVencimento;
        if (compareDate < startDate) return false;
      }
      if (endDate) {
        const compareDate = p.dataVencimento;
        if (compareDate > endDate) return false;
      }

      return true;
    });
  }, [pagamentos, searchTerm, statusPagarFilter, unidadeFilter, startDate, endDate]);

  const pagarStats = useMemo(() => {
    let totalPagar = 0; // Total overall
    let totalPago = 0;  // Total paid
    let totalAberto = 0; // Total outstanding to pay
    let countVencidos = 0;

    filteredPagamentos.forEach((p) => {
      const paidValue = (p.historicoBaixas || []).reduce((sum: number, b: any) => sum + Number(b.valor), 0);
      const outstandingValue = Math.max(0, Number(p.valorTotal) - paidValue);

      totalPagar += Number(p.valorTotal);
      totalPago += paidValue;
      totalAberto += outstandingValue;

      const isPaid = paidValue >= Number(p.valorTotal);
      const isOverdue = !isPaid && new Date(p.dataVencimento) < new Date(new Date().setHours(0,0,0,0));
      if (isOverdue) {
        countVencidos++;
      }
    });

    return { totalPagar, totalPago, totalAberto, countVencidos };
  }, [filteredPagamentos]);

  // Handle open manual faturamento / edit faturamento
  const handleOpenFormModal = (item?: RecebimentoTitle) => {
    if (!isFinanceUser) {
      showToast("Apenas operadores do setor financeiro ou administradores MASTER podem cadastrar faturamentos.", "error");
      return;
    }
    
    if (item) {
      setEditingTitle(item);
      setFormDt(item.dt);
      setFormCliente(item.cliente);
      setFormVeiculo(item.veiculoId);
      setFormMotorista(item.motoristaId);
      setFormOrigem(item.origem);
      setFormDestino(item.destino);
      setFormFrete(item.valorFrete);
      setFormPedagio(item.valorPedagiosReembolsaveis);
      setFormDiaria(item.valorDiarias);
      setFormOutros(item.outrosAcrescimos);
      setFormVencimento(item.dataVencimento);
      setFormEntrega(item.dataEntrega);
      setFormUnidade(item.unidadeId);
      setFormObs(item.observacoes || "");
    } else {
      setEditingTitle(null);
      setFormDt("");
      setFormCliente("");
      setFormVeiculo("");
      setFormMotorista("");
      setFormOrigem("Goiânia - Matriz");
      setFormDestino("");
      setFormFrete(0);
      setFormPedagio(0);
      setFormDiaria(0);
      setFormOutros(0);
      
      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 30);
      setFormVencimento(defaultDue.toISOString().split("T")[0]);
      setFormEntrega(new Date().toISOString().split("T")[0]);
      setFormUnidade(currentUser.unidadeId !== "Todas" ? currentUser.unidadeId : (unidades[0]?.id || "un-go"));
      setFormObs("");
    }
    setFormModalOpen(true);
  };

  // Submit form manually
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDt.trim() || !formCliente.trim()) {
      showToast("Número da DT e Cliente são obrigatórios.", "error");
      return;
    }

    const valorTotal = Number(formFrete) + Number(formPedagio) + Number(formDiaria) + Number(formOutros);
    const payload = {
      dt: formDt.trim(),
      cliente: formCliente.trim(),
      veiculoId: formVeiculo.trim().toUpperCase(),
      motoristaId: formMotorista.trim(),
      origem: formOrigem.trim(),
      destino: formDestino.trim(),
      valorFrete: Number(formFrete),
      valorPedagiosReembolsaveis: Number(formPedagio),
      valorDiarias: Number(formDiaria),
      outrosAcrescimos: Number(formOutros),
      valorTotal: valorTotal,
      dataEntrega: formEntrega,
      dataVencimento: formVencimento,
      unidadeId: formUnidade,
      observacoes: formObs.trim(),
    };

    try {
      const url = editingTitle ? `/api/recebimentos/${editingTitle.id}` : "/api/recebimentos";
      const method = editingTitle ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-email": currentUser.email,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(editingTitle ? "Título financeiro atualizado com sucesso!" : "Faturamento cadastrado com sucesso!");
        setFormModalOpen(false);
        fetchTitles();
        if (onRefresh) onRefresh();
      } else {
        const errData = await res.json();
        showToast(errData.error || "Erro ao salvar faturamento.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Erro técnico ao conectar com o servidor.", "error");
    }
  };

  // Open baixa modal
  const handleOpenBaixaModal = (item: RecebimentoTitle) => {
    if (!isFinanceUser) {
      showToast("Privilégios insuficientes para realizar baixa de faturamento.", "error");
      return;
    }
    setSelectedTitle(item);
    setBaixaDate(new Date().toISOString().split("T")[0]);
    
    // Suggest remaining balance
    const previousPaid = (item.historicoBaixas || []).reduce((sum, b) => sum + Number(b.valor), 0);
    const remaining = Number(item.valorTotal) - previousPaid;
    setBaixaValue(remaining.toFixed(2));
    setBaixaMethod("PIX");
    setBaixaObs("");
    setBaixaModalOpen(true);
  };

  // Submit Baixa
  const handleConfirmBaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTitle) return;

    const val = Number(baixaValue);
    if (isNaN(val) || val <= 0) {
      showToast("Insira um valor de baixa válido e positivo.", "error");
      return;
    }

    try {
      const res = await fetch(`/api/recebimentos/${selectedTitle.id}/receber`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": currentUser.email,
        },
        body: JSON.stringify({
          data: baixaDate,
          valorRecebido: val,
          formaRecebimento: baixaMethod,
          observacao: baixaObs.trim()
        })
      });

      if (res.ok) {
        showToast(`Baixa registrada com sucesso para a DT ${selectedTitle.dt}!`);
        setBaixaModalOpen(false);
        fetchTitles();
        if (onRefresh) onRefresh();
      } else {
        const errData = await res.json();
        showToast(errData.error || "Erro ao realizar baixa do título.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Erro técnico ao registrar recebimento.", "error");
    }
  };

  // Delete title under MASTER security rules
  const handleDeleteTitle = async (item: RecebimentoTitle) => {
    if (currentUser.perfil !== "admin_master") {
      showToast("Apenas administradores de privilégio MASTER podem expurgar faturamentos.", "error");
      return;
    }

    if (!window.confirm(`EXPURGO DE SEGURANÇA MÁXIMA\n\nTem certeza de que deseja expurgar permanentemente o título faturado #${item.id} do cliente ${item.cliente}?\nEsta ação registrará um log de auditoria permanente.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/recebimentos/${item.id}`, {
        method: "DELETE",
        headers: {
          "x-user-email": currentUser.email,
        }
      });

      if (res.ok) {
        showToast("Título faturado expurgado de forma definitiva com sucesso.");
        fetchTitles();
        if (onRefresh) onRefresh();
      } else {
        const errData = await res.json();
        showToast(errData.error || "Falha ao expurgar faturamento.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Erro ao processar expurgo.", "error");
    }
  };

  // Contas a Pagar Handlers
  const handleOpenPagarFormModal = (item?: any) => {
    if (!isFinanceUser) {
      showToast("Apenas operadores do setor financeiro ou administradores MASTER podem cadastrar pagamentos.", "error");
      return;
    }

    if (item) {
      setEditingPayable(item);
      setFormPagarDt(item.dt || "");
      setFormPagarCliente(item.cliente || "Heineken");
      setFormPagarMotoristaId(item.motoristaId || "");
      setFormPagarMotoristaNome(item.motoristaNome || "");
      setFormPagarVeiculo(item.veiculoId || "");
      setFormPagarFrete(item.valorFrete || 0);
      setFormPagarDisponibilidade(item.valorDisponibilidade || 0);
      setFormPagarDiarias(item.valorDiarias || 0);
      setFormPagarAdiantamentos(item.adiantamentos || 0);
      setFormPagarDescontos(item.multasDescontos || 0);
      setFormPagarVencimento(item.dataVencimento || "");
      setFormPagarGeracao(item.dataGeracao || new Date().toISOString().split("T")[0]);
      setFormPagarUnidade(item.unidadeId || "");
      setFormPagarObs(item.observacoes || "");
    } else {
      setEditingPayable(null);
      setFormPagarDt("");
      setFormPagarCliente("Heineken");
      setFormPagarMotoristaId("");
      setFormPagarMotoristaNome("");
      setFormPagarVeiculo("");
      setFormPagarFrete(0);
      setFormPagarDisponibilidade(0);
      setFormPagarDiarias(0);
      setFormPagarAdiantamentos(0);
      setFormPagarDescontos(0);

      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 15);
      setFormPagarVencimento(defaultDue.toISOString().split("T")[0]);
      setFormPagarGeracao(new Date().toISOString().split("T")[0]);
      setFormPagarUnidade(currentUser.unidadeId !== "Todas" ? currentUser.unidadeId : (unidades[0]?.id || "un-go"));
      setFormPagarObs("");
    }
    setPagarFormModalOpen(true);
  };

  const handleSavePagarForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPagarDt.trim() || !formPagarMotoristaNome.trim()) {
      showToast("Número da DT e Nome do Motorista são obrigatórios.", "error");
      return;
    }

    const valorTotal = (Number(formPagarFrete) + Number(formPagarDisponibilidade) + Number(formPagarDiarias)) - (Number(formPagarAdiantamentos) + Number(formPagarDescontos));
    const payload = {
      dt: formPagarDt.trim(),
      cliente: formPagarCliente.trim(),
      motoristaId: formPagarMotoristaId.trim() || "manual",
      motoristaNome: formPagarMotoristaNome.trim(),
      veiculoId: formPagarVeiculo.trim().toUpperCase(),
      valorFrete: Number(formPagarFrete),
      valorDisponibilidade: Number(formPagarDisponibilidade),
      valorDiarias: Number(formPagarDiarias),
      adiantamentos: Number(formPagarAdiantamentos),
      multasDescontos: Number(formPagarDescontos),
      valorTotal: valorTotal,
      dataGeracao: formPagarGeracao,
      dataVencimento: formPagarVencimento,
      unidadeId: formPagarUnidade,
      observacoes: formPagarObs.trim()
    };

    try {
      const url = editingPayable ? `/api/pagamentos/${editingPayable.id}` : "/api/pagamentos";
      const method = editingPayable ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-email": currentUser.email,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(editingPayable ? "Título a pagar atualizado com sucesso!" : "Lançamento a pagar cadastrado com sucesso!");
        setPagarFormModalOpen(false);
        fetchPagamentos();
        if (onRefresh) onRefresh();
      } else {
        const errData = await res.json();
        showToast(errData.error || "Erro ao salvar conta a pagar.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Erro técnico ao conectar com o servidor.", "error");
    }
  };

  const handleOpenPagarBaixaModal = (item: any) => {
    if (!isFinanceUser) {
      showToast("Privilégios insuficientes para realizar baixa de contas a pagar.", "error");
      return;
    }
    setSelectedPayable(item);
    setBaixaPagarDate(new Date().toISOString().split("T")[0]);

    const previousPaid = (item.historicoBaixas || []).reduce((sum: number, b: any) => sum + Number(b.valor), 0);
    const remaining = Number(item.valorTotal) - previousPaid;
    setBaixaPagarValue(remaining.toFixed(2));
    setBaixaPagarMethod("PIX");
    setBaixaPagarObs("");
    setBaixaPagarModalOpen(true);
  };

  const handleConfirmPagarBaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayable) return;

    const val = Number(baixaPagarValue);
    if (isNaN(val) || val <= 0) {
      showToast("Insira um valor de pagamento válido e positivo.", "error");
      return;
    }

    try {
      const res = await fetch(`/api/pagamentos/${selectedPayable.id}/pagar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": currentUser.email,
        },
        body: JSON.stringify({
          data: baixaPagarDate,
          valorPago: val,
          formaPagamento: baixaPagarMethod,
          observacao: baixaPagarObs.trim()
        })
      });

      if (res.ok) {
        showToast(`Pagamento registrado com sucesso para a DT ${selectedPayable.dt}!`);
        setBaixaPagarModalOpen(false);
        fetchPagamentos();
        if (onRefresh) onRefresh();
      } else {
        const errData = await res.json();
        showToast(errData.error || "Erro ao registrar pagamento.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Erro técnico ao registrar pagamento.", "error");
    }
  };

  const handleDeletePagarTitle = async (item: any) => {
    if (currentUser.perfil !== "admin_master") {
      showToast("Apenas administradores de privilégio MASTER podem expurgar lançamentos a pagar.", "error");
      return;
    }

    if (!window.confirm(`EXPURGO DE SEGURANÇA MÁXIMA\n\nTem certeza de que deseja expurgar permanentemente o título a pagar #${item.id} do motorista ${item.motoristaNome}?\nEsta ação registrará um log de auditoria permanente.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/pagamentos/${item.id}`, {
        method: "DELETE",
        headers: {
          "x-user-email": currentUser.email,
        }
      });

      if (res.ok) {
        showToast("Título a pagar expurgado de forma definitiva com sucesso.");
        fetchPagamentos();
        if (onRefresh) onRefresh();
      } else {
        const errData = await res.json();
        showToast(errData.error || "Falha ao expurgar lançamento a pagar.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Erro ao processar expurgo.", "error");
    }
  };

  // Helper date utility for semaphore
  const getSemaphoreInfo = (dueDateStr: string, status: string) => {
    if (status === "Recebido") return { color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", label: "Quitado", days: 0 };
    if (status === "Cancelado") return { color: "text-slate-400 bg-slate-100 border-slate-200", label: "Cancelado", days: 0 };

    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(dueDateStr);
    due.setHours(0,0,0,0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { 
        color: "text-rose-600 bg-rose-50 border-rose-100", 
        label: `Vencido há ${Math.abs(diffDays)}d`, 
        days: diffDays 
      };
    }
    if (diffDays <= 6) {
      return { 
        color: "text-amber-600 bg-amber-50 border-amber-200", 
        label: `Vence em ${diffDays}d (Crítico)`, 
        days: diffDays 
      };
    }
    if (diffDays <= 15) {
      return { 
        color: "text-yellow-600 bg-yellow-50 border-yellow-200", 
        label: `Vence em ${diffDays}d`, 
        days: diffDays 
      };
    }
    return { 
      color: "text-emerald-600 bg-emerald-50 border-emerald-200", 
      label: `Vence em ${diffDays}d`, 
      days: diffDays 
    };
  };

  // Currencies formatter
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  // Filtered titles
  const filteredTitles = useMemo(() => {
    return titles.filter((t) => {
      // Unidade context
      if (unidadeFilter !== "Todas" && t.unidadeId !== unidadeFilter) return false;

      // Status
      if (statusFilter !== "Todos") {
        if (statusFilter === "Vencidos") {
          const info = getSemaphoreInfo(t.dataVencimento, t.status);
          if (info.days >= 0 || t.status === "Recebido" || t.status === "Cancelado") return false;
        } else if (statusFilter === "Critico30") {
          const info = getSemaphoreInfo(t.dataVencimento, t.status);
          if (t.status === "Recebido" || t.status === "Cancelado" || info.days > -30) return false;
        } else if (t.status !== statusFilter) {
          return false;
        }
      }

      // Dates range filter
      if (startDate) {
        const dateToComp = dateType === "entrega" ? t.dataEntrega : t.dataVencimento;
        if (dateToComp < startDate) return false;
      }
      if (endDate) {
        const dateToComp = dateType === "entrega" ? t.dataEntrega : t.dataVencimento;
        if (dateToComp > endDate) return false;
      }

      // Text search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesText = 
          t.cliente.toLowerCase().includes(query) ||
          t.dt.toLowerCase().includes(query) ||
          t.veiculoId.toLowerCase().includes(query) ||
          t.motoristaId.toLowerCase().includes(query) ||
          t.id.toLowerCase().includes(query);
        if (!matchesText) return false;
      }

      return true;
    });
  }, [titles, searchTerm, statusFilter, unidadeFilter, dateType, startDate, endDate]);

  // Dashboard calculation aggregates
  const dashboardStats = useMemo(() => {
    let totalToReceive = 0; // sum of remaining unpaid balances
    let totalReceivedMonth = 0; // received in this calendar month (June 2026 by system clock default)
    let pendingCount = 0;
    let overdueCount = 0;
    let todayDueCount = 0;
    let totalBilled = 0;

    const todayStr = new Date().toISOString().split("T")[0];
    const currentMonth = new Date().toISOString().slice(0, 7); // dynamic system current month

    titles.forEach((t) => {
      if (t.status !== "Cancelado") {
        totalBilled += t.valorTotal;
      }

      const previousPaid = (t.historicoBaixas || []).reduce((sum, b) => sum + Number(b.valor), 0);
      const remainingBalance = Number(t.valorTotal) - previousPaid;

      // Sum receipts in current month
      (t.historicoBaixas || []).forEach((b) => {
        if (b.data.startsWith(currentMonth)) {
          totalReceivedMonth += b.valor;
        }
      });

      if (t.status !== "Recebido" && t.status !== "Cancelado") {
        totalToReceive += remainingBalance;
        pendingCount++;

        const semInfo = getSemaphoreInfo(t.dataVencimento, t.status);
        if (semInfo.days < 0) {
          overdueCount += remainingBalance;
        }

        if (t.dataVencimento === todayStr) {
          todayDueCount += remainingBalance;
        }
      }
    });

    // Top client
    const clientMap: Record<string, { billed: number; received: number }> = {};
    titles.forEach((t) => {
      if (t.status === "Cancelado") return;
      const prevPaid = (t.historicoBaixas || []).reduce((sum, b) => sum + Number(b.valor), 0);
      if (!clientMap[t.cliente]) {
        clientMap[t.cliente] = { billed: 0, received: 0 };
      }
      clientMap[t.cliente].billed += t.valorTotal;
      clientMap[t.cliente].received += prevPaid;
    });

    let topClientName = "Nenhum";
    let topClientVolume = 0;
    Object.entries(clientMap).forEach(([name, data]) => {
      if (data.billed > topClientVolume) {
        topClientVolume = data.billed;
        topClientName = name;
      }
    });

    let filteredReceitaTotal = 0;
    let filteredCustoTotal = 0;
    let filteredResultadoAcumulado = 0;
    const filteredStatusCounts = {
      "Recebido": 0,
      "A Receber": 0,
      "Parcial": 0,
      "Vencido": 0,
      "Em Contestação": 0,
      "Cancelado": 0
    };

    filteredTitles.forEach((t) => {
      filteredReceitaTotal += t.receitaTotal !== undefined ? t.receitaTotal : t.valorTotal;
      filteredCustoTotal += t.custoTotal !== undefined ? t.custoTotal : 0;
      filteredResultadoAcumulado += t.resultadoOperacional !== undefined ? t.resultadoOperacional : t.valorTotal;
      
      const semInfo = getSemaphoreInfo(t.dataVencimento, t.status);
      let resolvedStatus = t.status;
      if (t.status === "A Receber" && semInfo.days < 0) {
        resolvedStatus = "Vencido";
      }
      if (resolvedStatus in filteredStatusCounts) {
        filteredStatusCounts[resolvedStatus as keyof typeof filteredStatusCounts]++;
      }
    });

    return {
      totalToReceive,
      totalReceivedMonth,
      pendingCount,
      overdueCount,
      todayDueCount,
      totalBilled,
      topClientName,
      topClientVolume,
      clientMap,
      filteredReceitaTotal,
      filteredCustoTotal,
      filteredResultadoAcumulado,
      filteredStatusCounts
    };
  }, [titles, filteredTitles]);

  // Clients overview dataset
  const clientLedgers = useMemo(() => {
    return Object.entries(dashboardStats.clientMap).map(([name, rawData]) => {
      const data = rawData as { billed: number; received: number };
      const outstanding = data.billed - data.received;
      return {
        name,
        billed: data.billed,
        received: data.received,
        outstanding: outstanding,
        pct: data.billed > 0 ? (data.received / data.billed) * 100 : 0
      };
    }).sort((a, b) => b.billed - a.billed);
  }, [dashboardStats]);

  // Previsão Contábil de Caixa (30 / 60 / 90 dias)
  const forecastStats = useMemo(() => {
    const today = new Date();
    let p30 = 0, p60 = 0, p90 = 0;
    
    titles.forEach((t) => {
      if (t.status === "Recebido" || t.status === "Cancelado") return;
      const prevPaid = (t.historicoBaixas || []).reduce((sum, b) => sum + Number(b.valor), 0);
      const remaining = t.valorTotal - prevPaid;

      const due = new Date(t.dataVencimento);
      const diffTime = due.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 30) p30 += remaining;
      else if (diffDays <= 60) p60 += remaining;
      else p90 += remaining;
    });

    return { p30, p60, p90 };
  }, [titles]);

  // Meios de Recebimento de Baixas
  const methodsMapStats = useMemo(() => {
    const methodsMap: Record<string, number> = {
      "PIX": 0,
      "TED": 0,
      "Boleto": 0,
      "Dinheiro": 0,
      "Transferência": 0,
      "Outros": 0
    };

    titles.forEach((t) => {
      (t.historicoBaixas || []).forEach((b) => {
        const f = b.forma || "Outros";
        const resolved = f === "Transferência" ? "Transferência" : f === "PIX" ? "PIX" : f === "TED" ? "TED" : f === "Boleto" ? "Boleto" : f === "Dinheiro" ? "Dinheiro" : "Outros";
        methodsMap[resolved] = (methodsMap[resolved] || 0) + b.valor;
      });
    });

    return methodsMap;
  }, [titles]);

  // CSV Export
  const handleExportCSV = () => {
    if (filteredTitles.length === 0) {
      showToast("Não existem dados filtrados para exportar.", "error");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID;DT;Cliente;Veiculo;Motorista;Entrega;Vencimento;Valor Total;Status;Valor Recebido;Saldo Restante\n";

    filteredTitles.forEach((t) => {
      const prevPaid = (t.historicoBaixas || []).reduce((sum, b) => sum + Number(b.valor), 0);
      const remaining = t.valorTotal - prevPaid;
      csvContent += `${t.id};${t.dt};${t.cliente.replace(/;/g, " ")};${t.veiculoId};${t.motoristaId.replace(/;/g, " ")};${t.dataEntrega};${t.dataVencimento};${t.valorTotal.toFixed(2)};${t.status};${prevPaid.toFixed(2)};${remaining.toFixed(2)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `AMPLA_Faturamento_Recebimentos_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Relatório de faturamento exportado em formato CSV!");
  };

  // PDF / Print Report Export
  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("Bloqueador de popups impediu a exportação do PDF. Habilite popups.", "error");
      return;
    }

    const todayStr = new Date().toLocaleDateString("pt-BR");
    
    printWindow.document.write(`
      <html>
        <head>
          <title>AMPLA v2.2 - Relatório Financeiro Executivo</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; }
            @media print {
              .no-print { display: none; }
              body { background-color: #fff; color: #000; }
            }
          </style>
        </head>
        <body class="p-8 bg-white text-slate-800">
          <div class="max-w-4xl mx-auto">
            
            <div class="flex justify-between items-center border-b pb-4 mb-6">
              <div>
                <h1 class="text-2xl font-bold text-slate-900">AMPLA v2.2 LOGÍSTICA S/A</h1>
                <p class="text-sm text-slate-500 font-mono">Centro de Faturamento, Recebimentos e Consolidação Financeira</p>
              </div>
              <div class="text-right text-xs font-mono text-slate-500">
                <p>Data de Emissão: ${todayStr}</p>
                <p>Status: Consolidado Oficial</p>
              </div>
            </div>

            <div class="bg-slate-950 text-white p-5 rounded-xl mb-6 flex justify-between items-center">
              <div>
                <h2 class="text-lg font-bold tracking-tight">RELATÓRIO DE BALANÇOS E CONCILIAÇÃO FINANCEIRA</h2>
                <p class="text-xs text-slate-400">Indicadores consolidados de faturamento das DTs</p>
              </div>
              <span class="text-xs font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30 px-3 py-1 rounded">AMPLA v2.2</span>
            </div>

            <h3 class="text-xs font-bold text-slate-500 font-mono uppercase tracking-wider mb-3">1. Indicadores de Receitas e Custos (Filtrados)</h3>
            <div class="grid grid-cols-3 gap-4 mb-6">
              <div class="border p-4 rounded-xl text-center">
                <p class="text-[10px] font-mono text-slate-400 uppercase">Receita Bruta</p>
                <h4 class="text-xl font-extrabold text-slate-900 mt-1">${formatBRL(dashboardStats.filteredReceitaTotal)}</h4>
              </div>
              <div class="border p-4 rounded-xl text-center">
                <p class="text-[10px] font-mono text-slate-400 uppercase">Custo Operacional</p>
                <h4 class="text-xl font-extrabold text-rose-600 mt-1">${formatBRL(dashboardStats.filteredCustoTotal)}</h4>
              </div>
              <div class="border p-4 rounded-xl text-center ${dashboardStats.filteredResultadoAcumulado >= 0 ? 'bg-emerald-50/20 border-emerald-200' : 'bg-rose-50/20 border-rose-200'}">
                <p class="text-[10px] font-mono text-slate-400 uppercase">Resultado Acumulado</p>
                <h4 class="text-xl font-extrabold mt-1 ${dashboardStats.filteredResultadoAcumulado >= 0 ? 'text-emerald-700' : 'text-rose-700'}">${formatBRL(dashboardStats.filteredResultadoAcumulado)}</h4>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-6 mb-6">
              <div class="border p-4.5 rounded-xl">
                <h4 class="font-bold text-slate-800 text-xs mb-3 font-mono uppercase border-b pb-1">Previsão Contábil de Caixa</h4>
                <div class="space-y-2 text-xs">
                  <div class="flex justify-between"><span>Próximos 30 dias:</span> <span class="font-bold font-mono">${formatBRL(forecastStats.p30)}</span></div>
                  <div class="flex justify-between"><span>31 a 60 dias:</span> <span class="font-bold font-mono">${formatBRL(forecastStats.p60)}</span></div>
                  <div class="flex justify-between"><span>61 a 90+ dias:</span> <span class="font-bold font-mono">${formatBRL(forecastStats.p90)}</span></div>
                </div>
              </div>
              <div class="border p-4.5 rounded-xl">
                <h4 class="font-bold text-slate-800 text-xs mb-3 font-mono uppercase border-b pb-1">Meios de Recebimento</h4>
                <div class="space-y-2 text-xs">
                  ${Object.entries(methodsMapStats).map(([m, val]) => `
                    <div class="flex justify-between py-1 border-b last:border-0 border-slate-100">
                      <span class="font-mono text-slate-500">${m}:</span>
                      <span class="font-bold font-mono">${formatBRL(val as number)}</span>
                    </div>
                  `).join("")}
                </div>
              </div>
            </div>

            <h3 class="text-xs font-bold text-slate-500 font-mono uppercase tracking-wider mb-3">2. Performance de Adimplemento por Cliente</h3>
            <div class="border rounded-xl overflow-hidden mb-6">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50 border-b text-slate-500 uppercase font-mono text-[10px]">
                    <th class="p-3">Nome do Cliente</th>
                    <th class="p-3 text-right">Faturado</th>
                    <th class="p-3 text-right">Liquidado</th>
                    <th class="p-3 text-right">Saldo Pendente</th>
                    <th class="p-3 text-center">Taxa de Adimplemento</th>
                  </tr>
                </thead>
                <tbody class="divide-y text-slate-700">
                  ${clientLedgers.map(cl => `
                    <tr>
                      <td class="p-3 font-semibold">${cl.name}</td>
                      <td class="p-3 text-right font-mono font-bold">${formatBRL(cl.billed)}</td>
                      <td class="p-3 text-right font-mono text-emerald-600 font-bold">${formatBRL(cl.received)}</td>
                      <td class="p-3 text-right font-mono text-amber-600 font-bold">${formatBRL(cl.outstanding)}</td>
                      <td class="p-3 text-center font-mono font-bold ${cl.pct >= 90 ? 'text-emerald-600' : cl.pct >= 70 ? 'text-amber-600' : 'text-rose-600'}">
                        ${cl.pct.toFixed(0)}%
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>

            <div class="border-t pt-6 mt-12 flex justify-between items-center text-[10px] text-slate-400 font-mono">
              <span>Relatório gerado eletronicamente pela Plataforma AMPLA v2.2</span>
              <span>Assinatura do Responsável Financeiro</span>
            </div>

            <div class="mt-8 text-center no-print">
              <button onclick="window.print()" class="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow transition">
                Confirmar Impressão / Salvar PDF
              </button>
            </div>

          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    showToast("Relatório de faturamento preparado para visualização de impressão/PDF!");
  };

  // Status Badge visual styles
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Recebido":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "Parcial":
        return "bg-sky-500/10 text-sky-600 border-sky-500/20";
      case "A Receber":
        return "bg-slate-500/10 text-slate-600 border-slate-500/20";
      case "Vencido":
        return "bg-rose-500/10 text-rose-600 border-rose-500/20";
      case "Cancelado":
        return "bg-slate-200 text-slate-500 border-slate-300";
      case "Em Contestação":
        return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div id="recebimentos-module-root" className="min-h-screen bg-[#f8fafc] p-4 lg:p-6 font-sans">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 p-3.5 rounded-xl border shadow-lg transition-all duration-300 transform translate-y-0 animate-fade-in ${
          toast.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />}
          <p className="text-xs font-semibold leading-tight">{toast.message}</p>
        </div>
      )}

      {/* Module Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className={`p-2 rounded-xl text-white ${financialTab === "receber" ? "bg-sky-600" : "bg-amber-600"}`}>
              <Receipt className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {financialTab === "receber" ? "Centro de Faturamento e Recebimentos" : "Centro de Pagamentos a Terceiros"}
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            {financialTab === "receber" 
              ? "Módulo financeiro integrado de conciliação de receitas de clientes da AMPLA" 
              : "Módulo de controle, provisão e liquidação de fretes de motoristas agregados e terceirizados"}
          </p>
        </div>

        {/* Action button triggers */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => {
              fetchTitles();
              fetchPagamentos();
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-lg transition"
            title="Recarregar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || pagarLoading ? "animate-spin" : ""}`} />
            Sincronizar
          </button>

          {isFinanceUser && (
            <button
              onClick={() => financialTab === "receber" ? handleOpenFormModal() : handleOpenPagarFormModal()}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white rounded-lg transition shadow-sm ${
                financialTab === "receber" ? "bg-sky-600 hover:bg-sky-700" : "bg-amber-600 hover:bg-amber-700"
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              Lançamento Manual
            </button>
          )}
        </div>
      </div>

      {/* High-level separation: A Receber vs A Pagar */}
      <div className="flex border border-slate-200 rounded-xl bg-slate-100 p-1 mb-6 max-w-md">
        <button
          onClick={() => setFinancialTab("receber")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold transition ${
            financialTab === "receber"
              ? "bg-white text-sky-700 shadow-sm font-bold border border-slate-200"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <ArrowUpRight className="w-4.5 h-4.5 text-emerald-500" />
          Contas a Receber
        </button>
        <button
          onClick={() => setFinancialTab("pagar")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold transition ${
            financialTab === "pagar"
              ? "bg-white text-amber-700 shadow-sm font-bold border border-slate-200"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <TrendingDown className="w-4.5 h-4.5 text-rose-500" />
          Contas a Pagar
        </button>
      </div>

      {financialTab === "receber" && (
        <>
          {/* Module Subtabs */}
          <div className="border-b border-slate-200 mb-6 flex gap-6">
        <button
          onClick={() => setActiveSubTab("panel")}
          className={`pb-3 text-xs font-semibold tracking-wide border-b-2 transition ${
            activeSubTab === "panel" ? "border-sky-600 text-sky-600 font-bold" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <WalletCards className="w-4 h-4" />
            Painel de Títulos (Receitas)
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab("clients")}
          className={`pb-3 text-xs font-semibold tracking-wide border-b-2 transition ${
            activeSubTab === "clients" ? "border-sky-600 text-sky-600 font-bold" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Building className="w-4 h-4" />
            Contas de Clientes (Clientes)
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab("reports")}
          className={`pb-3 text-xs font-semibold tracking-wide border-b-2 transition ${
            activeSubTab === "reports" ? "border-sky-600 text-sky-600 font-bold" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4" />
            Balanços & Relatórios
          </span>
        </button>
      </div>

      {/* Tab: General Receivable Ledger Panel */}
      {activeSubTab === "panel" && (
        <>
          {/* Bento-grid dashboard cards row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            
            {/* Receita Card */}
            <div id="card-receita-filtrada" className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-sm hover:shadow transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Receita Bruta (Filtrada)</span>
                <div className="p-1.5 bg-sky-500/10 text-sky-600 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">{formatBRL(dashboardStats.filteredReceitaTotal)}</h3>
              <div className="flex items-center justify-between mt-2 font-mono text-[9px] text-slate-400">
                <span>Faturamento bruto das DTs</span>
                <span className="text-sky-600 font-semibold">Créditos</span>
              </div>
            </div>

            {/* Custo Card */}
            <div id="card-custo-filtrado" className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-sm hover:shadow transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Custo Operacional (Filtrado)</span>
                <div className="p-1.5 bg-rose-500/10 text-rose-600 rounded-lg">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-rose-600 tracking-tight">{formatBRL(dashboardStats.filteredCustoTotal)}</h3>
              <div className="flex items-center justify-between mt-2 font-mono text-[9px] text-slate-400">
                <span>Despesas e deduções associadas</span>
                <span className="text-rose-500 font-semibold">Débitos</span>
              </div>
            </div>

            {/* Resultado Card */}
            <div id="card-resultado-filtrado" className={`border rounded-2xl p-4.5 shadow-sm hover:shadow transition ${
              dashboardStats.filteredResultadoAcumulado >= 0 
                ? "bg-emerald-50/30 border-emerald-100" 
                : "bg-rose-50/30 border-rose-150"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Resultado Acumulado</span>
                <div className={`p-1.5 rounded-lg ${
                  dashboardStats.filteredResultadoAcumulado >= 0 
                    ? "bg-emerald-500/10 text-emerald-600" 
                    : "bg-rose-500/10 text-rose-600"
                }`}>
                  <Scale className="w-4 h-4" />
                </div>
              </div>
              <h3 className={`text-xl font-bold tracking-tight ${
                dashboardStats.filteredResultadoAcumulado >= 0 ? "text-emerald-700" : "text-rose-700"
              }`}>{formatBRL(dashboardStats.filteredResultadoAcumulado)}</h3>
              <div className="flex items-center justify-between mt-2 font-mono text-[9px] text-slate-400">
                <span>Resultado Líquido do período</span>
                <span className={`font-semibold ${
                  dashboardStats.filteredResultadoAcumulado >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}>
                  Margem: {dashboardStats.filteredReceitaTotal > 0 ? ((dashboardStats.filteredResultadoAcumulado / dashboardStats.filteredReceitaTotal) * 100).toFixed(1) : "0.0"}%
                </span>
              </div>
            </div>

            {/* Status Breakdown Card */}
            <div id="card-status-filtrado" className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-sm hover:shadow transition">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Status das DTs (Filtrado)</span>
                <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
                  <CheckSquare className="w-4 h-4" />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-1 text-center font-mono mt-1">
                <div className="bg-emerald-50/50 border border-emerald-100/50 rounded p-1">
                  <span className="block text-[11px] font-bold text-emerald-700">{dashboardStats.filteredStatusCounts["Recebido"]}</span>
                  <span className="text-[8px] text-slate-500 uppercase tracking-tight">Quitadas</span>
                </div>
                <div className="bg-amber-50/50 border border-amber-100/50 rounded p-1">
                  <span className="block text-[11px] font-bold text-amber-700">{dashboardStats.filteredStatusCounts["A Receber"] + dashboardStats.filteredStatusCounts["Parcial"]}</span>
                  <span className="text-[8px] text-slate-500 uppercase tracking-tight">Abertas</span>
                </div>
                <div className="bg-rose-50/50 border border-rose-100/50 rounded p-1">
                  <span className="block text-[11px] font-bold text-rose-700">{dashboardStats.filteredStatusCounts["Vencido"]}</span>
                  <span className="text-[8px] text-slate-500 uppercase tracking-tight">Atrasadas</span>
                </div>
              </div>
              <div className="flex justify-between mt-1.5 font-mono text-[9px] text-slate-400">
                <span>Total no filtro: <strong>{filteredTitles.length}</strong></span>
                <span>Contestação/Canc: {dashboardStats.filteredStatusCounts["Em Contestação"] + dashboardStats.filteredStatusCounts["Cancelado"]}</span>
              </div>
            </div>

          </div>

          {/* Interactive filter control bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4.5 mb-6 shadow-sm">
            <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-slate-700">
              <Filter className="w-4 h-4 text-slate-400" />
              <span>Painel de Filtros Inteligentes</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
              
              {/* Text Search */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-slate-400 uppercase">Busca Livre</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cliente, DT, Placa, ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-2 text-xs outline-none focus:border-sky-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-slate-400 uppercase">Status Financeiro</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs outline-none focus:border-sky-500 focus:bg-white transition"
                >
                  <option value="Todos">Todos os Status</option>
                  <option value="A Receber">A Receber</option>
                  <option value="Recebido">Recebido (Quitação)</option>
                  <option value="Parcial">Recebido Parcial</option>
                  <option value="Vencidos">Vencido (Prazo Excedido)</option>
                  <option value="Critico30">Atrasos Críticos (&gt; 30 dias)</option>
                  <option value="Em Contestação">Em Contestação</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              {/* Unidade Logística Filter */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-slate-400 uppercase">Unidade Logística</label>
                <select
                  value={unidadeFilter}
                  onChange={(e) => setUnidadeFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs outline-none focus:border-sky-500 focus:bg-white transition"
                >
                  <option value="Todas">Todas as Unidades</option>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>

              {/* Date Scope Type Selection */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-slate-400 uppercase">Referência de Data</label>
                <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setDateType("vencimento")}
                    className={`flex-1 py-1.5 text-[10px] font-semibold ${dateType === "vencimento" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    Vencimento
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateType("entrega")}
                    className={`flex-1 py-1.5 text-[10px] font-semibold ${dateType === "entrega" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    Faturamento
                  </button>
                </div>
              </div>

              {/* Start Date */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-slate-400 uppercase">Data Início</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-sky-500 focus:bg-white transition"
                />
              </div>

              {/* End Date */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-slate-400 uppercase">Data Fim</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-sky-500 focus:bg-white transition"
                />
              </div>

            </div>

            <div className="flex items-center justify-between border-t border-slate-100 mt-4.5 pt-3">
              <span className="text-[10px] font-mono text-slate-400 leading-none">
                Exibindo <strong>{filteredTitles.length}</strong> de <strong>{titles.length}</strong> títulos faturados
              </span>

              <div className="flex items-center gap-2">
                {(startDate || endDate || searchTerm || statusFilter !== "Todos" || unidadeFilter !== "Todas") && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("Todos");
                      setUnidadeFilter("Todas");
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="text-[10px] font-semibold text-sky-600 hover:text-sky-700 underline"
                  >
                    Limpar Filtros
                  </button>
                )}
                
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition"
                >
                  <Download className="w-3 h-3" />
                  Planilha (CSV)
                </button>
              </div>
            </div>
          </div>

          {/* Titles Ledger Table card */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-mono uppercase tracking-wider">
                    <th className="px-3 py-3">DT</th>
                    <th className="px-3 py-3">Cliente</th>
                    <th className="px-3 py-3 text-right">Valor do Frete</th>
                    <th className="px-3 py-3 text-right">Recibos</th>
                    <th className="px-3 py-3 text-right">Descargas</th>
                    <th className="px-3 py-3 text-right">Outras cobranças</th>
                    <th className="px-3 py-3 text-right font-bold">Valor Total</th>
                    <th className="px-3 py-3 text-center">Status</th>
                    <th className="px-3 py-3">Data</th>
                    <th className="px-3 py-3">Unidade</th>
                    <th className="px-3 py-3">Responsável</th>
                    <th className="px-3 py-3 text-right">Saldo Devedor</th>
                    <th className="px-3 py-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-xs text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={13} className="text-center py-10 font-mono text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-500" />
                        Carregando títulos faturados...
                      </td>
                    </tr>
                  ) : filteredTitles.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="text-center py-12 text-slate-400">
                        <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-xs text-slate-600">Nenhum título faturado localizado</p>
                        <p className="text-[10px] text-slate-400 mt-1">Insira parâmetros de busca alternativos ou aguarde novos encerramentos de DT.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredTitles.map((t) => {
                      const sem = getSemaphoreInfo(t.dataVencimento, t.status);
                      const previousPaid = (t.historicoBaixas || []).reduce((sum, b) => sum + Number(b.valor), 0);
                      const remaining = t.valorTotal - previousPaid;

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition font-sans text-xs">
                          
                          {/* DT */}
                          <td className="px-3 py-3.5 font-bold font-mono text-slate-900">
                            #{t.dt}
                          </td>

                          {/* Cliente */}
                          <td className="px-3 py-3.5 font-semibold text-slate-850">
                            {t.cliente}
                          </td>

                          {/* Valor do Frete */}
                          <td className="px-3 py-3.5 text-right font-mono text-slate-700">
                            {formatBRL(t.valorFrete || t.valorTotal)}
                          </td>

                          {/* Recibos (reentrega) */}
                          <td className="px-3 py-3.5 text-right font-mono text-slate-700">
                            {formatBRL(t.valorReentrega || 0)}
                          </td>

                          {/* Descargas (descarga) */}
                          <td className="px-3 py-3.5 text-right font-mono text-slate-700">
                            {formatBRL(t.valorDescarga || 0)}
                          </td>

                          {/* Outras cobranças */}
                          <td className="px-3 py-3.5 text-right font-mono text-slate-700">
                            {formatBRL(t.outrosAcrescimos || 0)}
                          </td>

                          {/* Valor Total */}
                          <td className="px-3 py-3.5 text-right font-bold text-slate-950 font-mono bg-slate-50/20">
                            {formatBRL(t.valorTotal)}
                          </td>

                          {/* Status Badge */}
                          <td className="px-3 py-3.5 text-center">
                            <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded border ${getStatusBadge(t.status)}`}>
                              {t.status}
                            </span>
                          </td>

                          {/* Data */}
                          <td className="px-3 py-3.5 font-mono text-slate-600">
                            {new Date(t.dataEntrega + "T00:00:00").toLocaleDateString("pt-BR")}
                          </td>

                          {/* Unidade */}
                          <td className="px-3 py-3.5 text-slate-700">
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                              {unidades.find(u => u.id === t.unidadeId)?.nome?.split(" - ")[0] || t.unidadeId || "Geral"}
                            </span>
                          </td>

                          {/* Responsável */}
                          <td className="px-3 py-3.5 font-mono text-[10px] text-slate-500 truncate max-w-[120px]" title={t.responsavel}>
                            {t.responsavel?.split("@")[0] || "Sistema"}
                          </td>

                          {/* Saldo Devedor Remaining */}
                          <td className="px-3 py-3.5 text-right font-semibold font-mono">
                            {remaining <= 0.01 ? (
                              <span className="text-emerald-600 font-bold text-[10px] bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">Quitado</span>
                            ) : (
                              <span className={t.status === "Vencido" ? "text-rose-600 font-bold" : "text-slate-800"}>
                                {formatBRL(remaining)}
                              </span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="px-3 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              
                              {/* Details action */}
                              <button
                                onClick={() => setDetailsTitle(t)}
                                className="p-1 text-slate-450 hover:text-slate-900 hover:bg-slate-100 rounded transition"
                                title="Visualizar Detalhes Completo"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>

                              {/* Baixa Financeira (Receive money) */}
                              {isFinanceUser && t.status !== "Recebido" && t.status !== "Cancelado" && (
                                <button
                                  onClick={() => handleOpenBaixaModal(t)}
                                  className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded transition shadow-sm cursor-pointer whitespace-nowrap"
                                  title="Registrar Baixa / Recebimento"
                                >
                                  <DollarSign className="w-2.5 h-2.5" />
                                  Receber
                                </button>
                              )}

                              {/* Edit Title */}
                              {isFinanceUser && (
                                <button
                                  onClick={() => handleOpenFormModal(t)}
                                  className="p-1 text-slate-450 hover:text-sky-600 hover:bg-sky-50 rounded transition"
                                  title="Editar Parâmetros Financeiros"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Expurgar (Delete under MASTER) */}
                              {currentUser.perfil === "admin_master" && (
                                <button
                                  onClick={() => handleDeleteTitle(t)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                                  title="Expurgar Título Permanentemente"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}

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
        </>
      )}

      {/* Tab: Client Ledgers */}
      {activeSubTab === "clients" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-sky-600" />
              Saldos e Faturamentos Consolidados por Cliente
            </h2>
            <p className="text-xs text-slate-500 mb-4">Acompanhe a receita operacional individualizada de faturamento, valores compensados e pendentes de cada parceiro.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">Total Billed (Faturado Geral)</p>
                <h4 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">{formatBRL(dashboardStats.totalBilled)}</h4>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">Total Received (Liquidado)</p>
                <h4 className="text-xl font-extrabold text-emerald-600 tracking-tight mt-1">{formatBRL(dashboardStats.totalBilled - dashboardStats.totalToReceive)}</h4>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">Total Outstanding (A Receber)</p>
                <h4 className="text-xl font-extrabold text-amber-600 tracking-tight mt-1">{formatBRL(dashboardStats.totalToReceive)}</h4>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-150 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-slate-400 text-[10px] font-mono uppercase tracking-wider">
                    <th className="px-4.5 py-3">Nome do Cliente</th>
                    <th className="px-4.5 py-3 text-right">Total Faturado</th>
                    <th className="px-4.5 py-3 text-right">Total Liquidado</th>
                    <th className="px-4.5 py-3 text-right">Saldo Pendente</th>
                    <th className="px-4.5 py-3 text-center">Taxa de Adimplemento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {clientLedgers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-400">Nenhum cliente registrado.</td>
                    </tr>
                  ) : (
                    clientLedgers.map((cl, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition">
                        <td className="px-4.5 py-3 font-semibold text-slate-900">{cl.name}</td>
                        <td className="px-4.5 py-3 text-right font-mono font-bold">{formatBRL(cl.billed)}</td>
                        <td className="px-4.5 py-3 text-right font-mono text-emerald-600 font-bold">{formatBRL(cl.received)}</td>
                        <td className="px-4.5 py-3 text-right font-mono text-amber-600 font-bold">{formatBRL(cl.outstanding)}</td>
                        <td className="px-4.5 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                              <div 
                                className={`h-full rounded-full ${
                                  cl.pct >= 90 
                                    ? "bg-emerald-500" 
                                    : cl.pct >= 70 
                                    ? "bg-amber-500" 
                                    : "bg-rose-500"
                                }`} 
                                style={{ width: `${Math.min(100, cl.pct)}%` }}
                              ></div>
                            </div>
                            <span className={`font-mono text-[10px] font-bold ${
                              cl.pct >= 90 
                                ? "text-emerald-600" 
                                : cl.pct >= 70 
                                ? "text-amber-600" 
                                : "text-rose-600"
                            }`}>{cl.pct.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Reports & Analytics */}
      {activeSubTab === "reports" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b pb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-sky-600" />
                  Relatórios Executivos & Balanço Financeiro
                </h2>
                <p className="text-xs text-slate-500">Emissão de demonstrações contábeis e demonstrativo simplificado de fluxo de recebimento.</p>
              </div>
              <button
                id="btn-export-pdf"
                onClick={handleExportPDF}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition shadow-sm self-start sm:self-center"
              >
                <Download className="w-4 h-4" />
                Exportar Relatório Executivo (PDF)
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Box 1: Receivables Schedule */}
              <div className="border border-slate-200 rounded-xl p-4.5 bg-slate-50/50">
                <h4 className="font-bold text-slate-800 text-xs mb-3 font-mono uppercase tracking-wider border-b pb-1.5 border-slate-200">Previsão Contábil de Caixa (30 / 60 / 90 dias)</h4>
                
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between items-center bg-white p-2 border rounded-lg">
                    <span className="font-semibold text-slate-600">Próximos 30 dias:</span>
                    <span className="font-bold text-slate-950">{formatBRL(forecastStats.p30)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-2 border rounded-lg">
                    <span className="font-semibold text-slate-600">31 a 60 dias:</span>
                    <span className="font-bold text-slate-950">{formatBRL(forecastStats.p60)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-2 border rounded-lg">
                    <span className="font-semibold text-slate-600">61 a 90+ dias:</span>
                    <span className="font-bold text-slate-950">{formatBRL(forecastStats.p90)}</span>
                  </div>
                </div>
              </div>

              {/* Box 2: Payment forms breakdown */}
              <div className="border border-slate-200 rounded-xl p-4.5 bg-slate-50/50">
                <h4 className="font-bold text-slate-800 text-xs mb-3 font-mono uppercase tracking-wider border-b pb-1.5 border-slate-200">Meios de Recebimento de Baixas</h4>
                
                <div className="space-y-2.5 text-xs">
                  {Object.entries(methodsMapStats).map(([m, val]) => (
                    <div key={m} className="flex justify-between items-center">
                      <span className="font-semibold text-slate-500 font-mono">{m}</span>
                      <span className="font-bold text-slate-950 font-mono">{formatBRL(val as number)}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* General instructions audit compliance banner */}
            <div className="mt-8 border border-slate-150 rounded-xl bg-slate-50 p-4 flex gap-3 text-slate-500 text-xs">
              <Clock className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-800 font-mono uppercase text-[10px] mb-1">Normativa de Transparência AMPLA v2.2</h4>
                <p className="leading-relaxed">Qualquer baixa financeira executada no Centro de Recebimentos atualizará automaticamente a conciliação do Fluxo de Caixa no Centro Financeiro da Frota (faturamento líquido), lançando uma operação de <strong>Crédito</strong> associada à respectiva DT para fins contábeis corporativos.</p>
              </div>
            </div>

          </div>
        </div>
      )}
        </>
      )}

      {/* High-level section: Contas a Pagar view */}
      {financialTab === "pagar" && (
        <>
          {/* Bento-grid dashboard cards row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            
            {/* Total Provisionado */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-sm hover:shadow transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Total Provisionado</span>
                <div className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">{formatBRL(pagarStats.totalPagar)}</h3>
              <div className="flex items-center justify-between mt-2 font-mono text-[9px] text-slate-400">
                <span>Contratos de frete provisionados</span>
                <span className="text-amber-600 font-semibold">Provisões</span>
              </div>
            </div>

            {/* Total Pago (Liquidado) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-sm hover:shadow transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Total Pago (Liquidado)</span>
                <div className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-emerald-600 tracking-tight">{formatBRL(pagarStats.totalPago)}</h3>
              <div className="flex items-center justify-between mt-2 font-mono text-[9px] text-slate-400">
                <span>Repasses já liquidados e baixados</span>
                <span className="text-emerald-500 font-semibold">Repasses</span>
              </div>
            </div>

            {/* Saldo Pendente (A Pagar) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-sm hover:shadow transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Saldo Pendente</span>
                <div className="p-1.5 bg-rose-500/10 text-rose-600 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-rose-600 tracking-tight">{formatBRL(pagarStats.totalAberto)}</h3>
              <div className="flex items-center justify-between mt-2 font-mono text-[9px] text-slate-400">
                <span>Saldo em aberto de transporte</span>
                <span className="text-rose-500 font-semibold">A Pagar</span>
              </div>
            </div>

            {/* Títulos Vencidos */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-sm hover:shadow transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Títulos Vencidos</span>
                <div className="p-1.5 bg-red-500/10 text-red-600 rounded-lg">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-red-700 tracking-tight">{pagarStats.countVencidos}</h3>
              <div className="flex items-center justify-between mt-2 font-mono text-[9px] text-slate-400">
                <span>Repasses em atraso com terceiros</span>
                <span className="text-red-500 font-semibold">Atrasos</span>
              </div>
            </div>

          </div>

          {/* Interactive filter control bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4.5 mb-6 shadow-sm">
            <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-slate-700">
              <Filter className="w-4 h-4 text-slate-400" />
              <span>Painel de Filtros Inteligentes (Contas a Pagar)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 text-xs">
              
              {/* Text Search */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-slate-400 uppercase">Busca Livre</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Motorista, DT, Placa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-2 text-xs outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-slate-400 uppercase">Status de Pagamento</label>
                <select
                  value={statusPagarFilter}
                  onChange={(e) => setStatusPagarFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs outline-none focus:border-amber-500 focus:bg-white transition"
                >
                  <option value="Todos">Todos os Status</option>
                  <option value="A Pagar">A Pagar / Aberto</option>
                  <option value="Parcial">Pago Parcial</option>
                  <option value="Pago">Pago / Liquidado</option>
                  <option value="Vencido">Vencido / Em Atraso</option>
                </select>
              </div>

              {/* Operational Unit Filter */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-slate-400 uppercase">Unidade</label>
                <select
                  value={unidadeFilter}
                  onChange={(e) => setUnidadeFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs outline-none focus:border-amber-500 focus:bg-white transition"
                >
                  <option value="Todas">Todas as Unidades</option>
                  {unidades.map(u => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-slate-400 uppercase">Vencimento Início</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>

              {/* End Date */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-slate-400 uppercase">Vencimento Fim</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>

            </div>

            <div className="flex justify-end gap-2 mt-3.5 pt-3.5 border-t border-slate-100">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusPagarFilter("Todos");
                  setUnidadeFilter("Todas");
                  setStartDate("");
                  setEndDate("");
                }}
                className="px-3.5 py-1.5 text-[11px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-250 rounded-lg transition"
              >
                Limpar Filtros
              </button>
            </div>
          </div>

          {/* Payables ledger listing table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-6">
            <div className="p-4 border-b border-slate-150 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                <h2 className="text-sm font-bold text-slate-800">Livro de Lançamentos e Repasses a Pagar</h2>
              </div>
              <span className="text-[10px] font-mono bg-slate-200 text-slate-600 px-2.5 py-1 rounded-full font-bold">
                {filteredPagamentos.length} repasses encontrados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/75 border-b border-slate-200 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    <th className="p-3.5 font-bold">ID / DT</th>
                    <th className="p-3.5 font-bold">Motorista (Favorecido)</th>
                    <th className="p-3.5 font-bold">Veículo Placa</th>
                    <th className="p-3.5 font-bold">Vencimento</th>
                    <th className="p-3.5 font-bold text-right">Valor Total</th>
                    <th className="p-3.5 font-bold text-right">Valor Pago</th>
                    <th className="p-3.5 font-bold text-right">Saldo Aberto</th>
                    <th className="p-3.5 font-bold text-center">Status</th>
                    <th className="p-3.5 font-bold text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {pagarLoading ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400 font-mono">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-300" />
                        Sincronizando contas a pagar com o banco de dados...
                      </td>
                    </tr>
                  ) : filteredPagamentos.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400 font-mono">
                        Nenhuma provisão de frete foi localizada no banco de dados com estes filtros.
                      </td>
                    </tr>
                  ) : (
                    filteredPagamentos.map((item) => {
                      const paidVal = (item.historicoBaixas || []).reduce((sum: number, b: any) => sum + Number(b.valor), 0);
                      const outstandingVal = Math.max(0, Number(item.valorTotal) - paidVal);
                      const isFullyPaid = outstandingVal <= 0;
                      const isOverdue = !isFullyPaid && new Date(item.dataVencimento) < new Date(new Date().setHours(0,0,0,0));

                      let badgeStyle = "bg-slate-500/10 text-slate-600 border-slate-500/20";
                      let statusLabel = "A Pagar";
                      if (isFullyPaid) {
                        badgeStyle = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
                        statusLabel = "Pago";
                      } else if (paidVal > 0) {
                        badgeStyle = "bg-amber-500/10 text-amber-600 border-amber-500/20";
                        statusLabel = "Parcial";
                      } else if (isOverdue) {
                        badgeStyle = "bg-rose-500/10 text-rose-600 border-rose-500/20";
                        statusLabel = "Vencido";
                      }

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition font-sans">
                          <td className="p-3.5 font-mono">
                            <span className="font-bold text-slate-800">#{item.id}</span>
                            <span className="block text-[10px] font-semibold text-slate-400">DT: {item.dt}</span>
                          </td>
                          <td className="p-3.5 font-bold text-slate-800">
                            {item.motoristaNome}
                            <span className="block text-[10px] font-medium text-slate-400">Favorecido / Agregado</span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] border border-slate-200 uppercase">
                              {item.veiculoId || "Não Informado"}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono font-semibold text-slate-700">
                            {new Date(item.dataVencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-slate-800">
                            {formatBRL(item.valorTotal)}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-emerald-600">
                            {formatBRL(paidVal)}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold">
                            {isFullyPaid ? (
                              <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 text-[10px]">Quitado</span>
                            ) : (
                              <span className={isOverdue ? "text-rose-600" : "text-amber-600"}>
                                {formatBRL(outstandingVal)}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-full border ${badgeStyle}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              
                              {/* Baixar / Quitar */}
                              <button
                                onClick={() => handleOpenPagarBaixaModal(item)}
                                disabled={isFullyPaid}
                                className="flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-[10px] font-bold rounded transition shadow-sm"
                                title="Pagar / Baixar"
                              >
                                <CheckSquare className="w-3 h-3" />
                                Pagar
                              </button>

                              {/* Ver detalhes */}
                              <button
                                onClick={() => setDetailsPayable(item)}
                                className="p-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 rounded transition"
                                title="Exibir Detalhes"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Editar */}
                              {isFinanceUser && (
                                <button
                                  onClick={() => handleOpenPagarFormModal(item)}
                                  className="p-1 bg-white hover:bg-slate-100 border border-slate-200 text-amber-600 rounded transition"
                                  title="Editar"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Expurgar (MASTER Only) */}
                              {currentUser.perfil === "admin_master" && (
                                <button
                                  onClick={() => handleDeletePagarTitle(item)}
                                  className="p-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded transition"
                                  title="Expurgar Registro"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}

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
        </>
      )}

      {/* Modal: Baixa Financeira (Efetuar Recebimento) */}
      {baixaModalOpen && selectedTitle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-scale-up">
            
            <div className="bg-slate-950 p-4.5 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Registo de Baixa Financeira</span>
                <h3 className="font-bold text-sm tracking-tight">Recebimento de Faturamento #{selectedTitle.id}</h3>
              </div>
              <button 
                onClick={() => setBaixaModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono border border-slate-800 rounded px-2 py-1 transition"
              >
                ESC
              </button>
            </div>

            <form onSubmit={handleConfirmBaixa} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 font-mono text-[10px] space-y-1">
                <div className="flex justify-between"><span className="text-slate-400">Cliente Devedor:</span> <span className="font-bold text-slate-800">{selectedTitle.cliente}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">DT Relacionada:</span> <span className="font-bold text-slate-800">#{selectedTitle.dt}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Total Faturado:</span> <span className="font-bold text-slate-800">{formatBRL(selectedTitle.valorTotal)}</span></div>
                
                {(() => {
                  const prev = (selectedTitle.historicoBaixas || []).reduce((sum, b) => sum + Number(b.valor), 0);
                  const rem = selectedTitle.valorTotal - prev;
                  return (
                    <>
                      <div className="flex justify-between border-t border-slate-200/60 mt-1 pt-1">
                        <span className="text-slate-400">Total Pago Anterior:</span>{" "}
                        <span className="font-bold text-emerald-600">{formatBRL(prev)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-900 text-[11px]">
                        <span className="text-slate-500">Saldo Restante Devedor:</span>{" "}
                        <span>{formatBRL(rem)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Input Data Recebimento */}
              <div className="space-y-1 text-xs">
                <label className="block text-slate-600 font-semibold font-mono text-[10px]">Data do Pagamento</label>
                <input
                  type="date"
                  required
                  value={baixaDate}
                  onChange={(e) => setBaixaDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-sky-500 focus:bg-white transition"
                />
              </div>

              {/* Input Valor Recebido */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <label className="block text-slate-600 font-semibold font-mono text-[10px]">Valor Recebido (BRL)</label>
                  <button
                    type="button"
                    onClick={() => {
                      const prev = (selectedTitle.historicoBaixas || []).reduce((sum, b) => sum + Number(b.valor), 0);
                      setBaixaValue((selectedTitle.valorTotal - prev).toFixed(2));
                    }}
                    className="text-[9px] font-bold text-sky-600 hover:underline"
                  >
                    Usar Saldo Total
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={baixaValue}
                  onChange={(e) => setBaixaValue(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-sky-500 focus:bg-white font-mono font-bold transition"
                />
              </div>

              {/* Input Meio de Pagamento */}
              <div className="space-y-1 text-xs">
                <label className="block text-slate-600 font-semibold font-mono text-[10px]">Meio / Método de Recebimento</label>
                <select
                  value={baixaMethod}
                  onChange={(e) => setBaixaMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-sky-500 focus:bg-white transition"
                >
                  <option value="PIX">PIX (Instantâneo)</option>
                  <option value="TED">TED (Transferência Eletrônica)</option>
                  <option value="Transferência">Transferência Bancária</option>
                  <option value="Boleto">Boleto Bancário</option>
                  <option value="Dinheiro">Dinheiro em Espécie</option>
                  <option value="Outro">Outro Canal / Acerto</option>
                </select>
              </div>

              {/* Input Observação */}
              <div className="space-y-1 text-xs">
                <label className="block text-slate-600 font-semibold font-mono text-[10px]">Observações da Baixa</label>
                <textarea
                  placeholder="Escreva detalhes como banco de recebimento, número do comprovante ou notas sobre conciliação..."
                  value={baixaObs}
                  onChange={(e) => setBaixaObs(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-sky-500 focus:bg-white transition"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setBaixaModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition"
                >
                  Confirmar Baixa
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Details and Audit History */}
      {detailsTitle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-scale-up">
            
            <div className="bg-slate-950 p-4.5 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Detalhamento Financeiro do Título</span>
                <h3 className="font-bold text-sm tracking-tight">{detailsTitle.id} • DT {detailsTitle.dt}</h3>
              </div>
              <button 
                onClick={() => setDetailsTitle(null)}
                className="text-slate-400 hover:text-white text-xs font-mono border border-slate-800 rounded px-2 py-1 transition"
              >
                Fechar
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Client & Route info */}
              <div className="grid grid-cols-2 gap-3.5 border-b pb-4">
                <div className="space-y-0.5 text-xs">
                  <span className="block font-mono text-[9px] text-slate-400 uppercase">Cliente faturado</span>
                  <span className="font-bold text-slate-900">{detailsTitle.cliente}</span>
                </div>
                <div className="space-y-0.5 text-xs">
                  <span className="block font-mono text-[9px] text-slate-400 uppercase">Motorista / Equipe</span>
                  <span className="font-bold text-slate-900">{detailsTitle.motoristaId}</span>
                </div>
                <div className="space-y-0.5 text-xs">
                  <span className="block font-mono text-[9px] text-slate-400 uppercase">Origem da viagem</span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    {detailsTitle.origem}
                  </span>
                </div>
                <div className="space-y-0.5 text-xs">
                  <span className="block font-mono text-[9px] text-slate-400 uppercase">Destino da rota</span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-sky-500 shrink-0" />
                    {detailsTitle.destino}
                  </span>
                </div>
              </div>

              {/* Financial values breakdown */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-[10px] font-mono uppercase tracking-wider flex items-center gap-1">
                  <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                  Demonstrativo Analítico de Viagem
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Receitas Column */}
                  <div className="border border-emerald-100 bg-emerald-50/10 rounded-xl p-3 text-xs space-y-2">
                    <span className="block font-bold text-emerald-800 text-[10px] uppercase font-mono tracking-wider border-b border-emerald-100 pb-1">Receitas (+)</span>
                    <div className="flex justify-between font-mono text-[11px]"><span className="text-slate-500">Frete Base:</span> <span className="font-semibold text-slate-800">{formatBRL(detailsTitle.valorFrete)}</span></div>
                    <div className="flex justify-between font-mono text-[11px]"><span className="text-slate-500">Disponibilidade:</span> <span className="font-semibold text-slate-800">{formatBRL(detailsTitle.valorDisponibilidade || 0)}</span></div>
                    <div className="flex justify-between font-mono text-[11px]"><span className="text-slate-500">Descarga:</span> <span className="font-semibold text-slate-800">{formatBRL(detailsTitle.valorDescarga || 0)}</span></div>
                    <div className="flex justify-between font-mono text-[11px]"><span className="text-slate-500">Reentrega:</span> <span className="font-semibold text-slate-800">{formatBRL(detailsTitle.valorReentrega || 0)}</span></div>
                    <div className="flex justify-between font-mono text-[11px]"><span className="text-slate-500">Outras Receitas:</span> <span className="font-semibold text-slate-800">{formatBRL(detailsTitle.outrasReceitas || 0)}</span></div>
                    
                    <div className="flex justify-between border-t border-emerald-200 mt-1.5 pt-1.5 font-bold text-emerald-900 font-mono">
                      <span>Receita Bruta:</span> <span>{formatBRL(detailsTitle.receitaTotal || detailsTitle.valorTotal)}</span>
                    </div>
                  </div>

                  {/* Custos Column */}
                  <div className="border border-rose-100 bg-rose-50/10 rounded-xl p-3 text-xs space-y-2">
                    <span className="block font-bold text-rose-800 text-[10px] uppercase font-mono tracking-wider border-b border-rose-100 pb-1">Custos Doutivos (-)</span>
                    <div className="flex justify-between font-mono text-[11px]"><span className="text-slate-500">Vale / Faltas:</span> <span className="font-semibold text-slate-800">{formatBRL(detailsTitle.valorVale || 0)}</span></div>
                    <div className="flex justify-between font-mono text-[11px]"><span className="text-slate-500">Pedágio:</span> <span className="font-semibold text-slate-800">{formatBRL(detailsTitle.valorPedagio || detailsTitle.valorPedagiosReembolsaveis || 0)}</span></div>
                    <div className="flex justify-between font-mono text-[11px]"><span className="text-slate-500">Abastecimento:</span> <span className="font-semibold text-slate-800">{formatBRL(detailsTitle.valorAbastecimento || 0)}</span></div>
                    <div className="flex justify-between font-mono text-[11px]"><span className="text-slate-500">Multas/Desc:</span> <span className="font-semibold text-slate-800">{formatBRL(detailsTitle.valorDescontos || 0)}</span></div>
                    <div className="flex justify-between font-mono text-[11px]"><span className="text-slate-500">Chapas / Diárias:</span> <span className="font-semibold text-slate-800">{formatBRL(detailsTitle.valorChapas || detailsTitle.valorDiarias || 0)}</span></div>
                    <div className="flex justify-between font-mono text-[11px]"><span className="text-slate-500">Outros Custos:</span> <span className="font-semibold text-slate-800">{formatBRL(detailsTitle.outrosCustos || detailsTitle.outrosAcrescimos || 0)}</span></div>
                    
                    <div className="flex justify-between border-t border-rose-200 mt-1.5 pt-1.5 font-bold text-rose-900 font-mono">
                      <span>Custo Total:</span> <span>{formatBRL(detailsTitle.custoTotal || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Resultado Líquido Box */}
                <div className={`border rounded-xl p-3.5 flex justify-between items-center text-xs font-bold font-mono ${
                  (detailsTitle.resultadoOperacional ?? detailsTitle.valorTotal) >= 0 
                    ? "bg-emerald-100/50 border-emerald-200 text-emerald-950" 
                    : "bg-rose-100/50 border-rose-200 text-rose-950"
                }`}>
                  <span>Balanço / Resultado Líquido da DT:</span>
                  <span className="text-sm">
                    {formatBRL(detailsTitle.resultadoOperacional ?? detailsTitle.valorTotal)}
                  </span>
                </div>
              </div>

              {/* Status and metadata */}
              <div className="grid grid-cols-2 gap-3 border-b pb-4">
                <div className="space-y-0.5 text-xs">
                  <span className="block font-mono text-[9px] text-slate-400 uppercase">Faturamento (Entrega)</span>
                  <span className="font-semibold font-mono">{new Date(detailsTitle.dataEntrega + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                </div>
                <div className="space-y-0.5 text-xs">
                  <span className="block font-mono text-[9px] text-slate-400 uppercase">Data Limite de Vencimento</span>
                  <span className="font-semibold font-mono">{new Date(detailsTitle.dataVencimento + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                </div>
                <div className="space-y-0.5 text-xs">
                  <span className="block font-mono text-[9px] text-slate-400 uppercase">Responsável pelo Registro</span>
                  <span className="font-semibold truncate">{detailsTitle.responsavel}</span>
                </div>
                <div className="space-y-0.5 text-xs">
                  <span className="block font-mono text-[9px] text-slate-400 uppercase">Status Financeiro</span>
                  <span className={`inline-block px-2 py-0.5 font-bold rounded text-[10px] border mt-0.5 ${getStatusBadge(detailsTitle.status)}`}>
                    {detailsTitle.status}
                  </span>
                </div>
              </div>

              {/* Settlement History / Audit Trail of payments */}
              <div className="space-y-3 pt-1">
                <h4 className="font-bold text-slate-800 text-[10px] font-mono uppercase tracking-wider flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  Histórico de Baixas & Conciliação
                </h4>

                {(!detailsTitle.historicoBaixas || detailsTitle.historicoBaixas.length === 0) ? (
                  <p className="text-[10px] font-mono text-slate-400 bg-slate-50 border p-3 rounded-xl">Não foram registradas parcelas de compensação financeira ou baixas parciais para este título faturado.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {detailsTitle.historicoBaixas.map((b, i) => (
                      <div key={i} className="border border-slate-150 p-2.5 rounded-xl bg-slate-50/50 flex flex-col gap-1 text-[11px] font-sans">
                        <div className="flex justify-between items-center font-mono">
                          <span className="font-bold text-sky-700">{formatBRL(b.valor)} via {b.forma}</span>
                          <span className="text-[10px] text-slate-400">{new Date(b.data + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                        </div>
                        {b.observacao && <p className="text-slate-500 italic">“{b.observacao}”</p>}
                        <div className="text-[9px] font-mono text-slate-400 flex items-center gap-1 mt-0.5 border-t border-slate-100 pt-1">
                          <User className="w-2.5 h-2.5" />
                          <span>Baixado por: {b.usuario}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {detailsTitle.observacoes && (
                <div className="p-3 bg-amber-50/45 border border-amber-100 rounded-xl text-xs text-slate-600">
                  <span className="block font-mono text-[9px] text-amber-500 font-bold uppercase mb-0.5">Observações Gerais</span>
                  <p className="leading-tight">{detailsTitle.observacoes}</p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Modal: Form Manual Faturamento / Edit Faturamento */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-scale-up">
            
            <div className="bg-slate-950 p-4.5 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Controle de Faturamento</span>
                <h3 className="font-bold text-sm tracking-tight">
                  {editingTitle ? `Editar Lançamento ${editingTitle.id}` : "Registrar Novo Faturamento Manual"}
                </h3>
              </div>
              <button 
                onClick={() => setFormModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono border border-slate-800 rounded px-2 py-1 transition"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
              
              <div className="grid grid-cols-2 gap-3.5">
                
                {/* Input DT */}
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-600 font-semibold font-mono text-[10px]">Número do Documento (DT) *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingTitle}
                    placeholder="Ex: 125147"
                    value={formDt}
                    onChange={(e) => setFormDt(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-sky-500 focus:bg-white transition disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </div>

                {/* Input Cliente */}
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-600 font-semibold font-mono text-[10px]">Cliente Faturado *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Heineken Brasil"
                    value={formCliente}
                    onChange={(e) => setFormCliente(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-sky-500 focus:bg-white transition"
                  />
                </div>

                {/* Input Veículo */}
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-600 font-semibold font-mono text-[10px]">Veículo (Placa)</label>
                  <input
                    type="text"
                    placeholder="Ex: AAA-0000"
                    value={formVeiculo}
                    onChange={(e) => setFormVeiculo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-sky-500 focus:bg-white transition"
                  />
                </div>

                {/* Input Motorista */}
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-600 font-semibold font-mono text-[10px]">Motorista</label>
                  <input
                    type="text"
                    placeholder="Ex: Carlos Silva"
                    value={formMotorista}
                    onChange={(e) => setFormMotorista(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-sky-500 focus:bg-white transition"
                  />
                </div>

                {/* Input Origem */}
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-600 font-semibold font-mono text-[10px]">Cidade / Base Origem</label>
                  <input
                    type="text"
                    placeholder="Ex: Goiânia - Matriz"
                    value={formOrigem}
                    onChange={(e) => setFormOrigem(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-sky-500 focus:bg-white transition"
                  />
                </div>

                {/* Input Destino */}
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-600 font-semibold font-mono text-[10px]">Cidade / Base Destino</label>
                  <input
                    type="text"
                    placeholder="Ex: Contagem - MG"
                    value={formDestino}
                    onChange={(e) => setFormDestino(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-sky-500 focus:bg-white transition"
                  />
                </div>

              </div>

              {/* Grid block for financial values */}
              <div className="border border-slate-150 p-4 rounded-2xl bg-slate-50 space-y-3">
                <h4 className="font-bold text-slate-800 text-[10px] font-mono uppercase tracking-wider">Planilha Contábil de Valores</h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  
                  {/* Valor Frete */}
                  <div className="space-y-1 text-xs">
                    <label className="block text-slate-500 font-semibold text-[9px] font-mono">Frete Base (BRL)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formFrete}
                      onChange={(e) => setFormFrete(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  {/* Valor Pedagio */}
                  <div className="space-y-1 text-xs">
                    <label className="block text-slate-500 font-semibold text-[9px] font-mono">Pedágio (BRL)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formPedagio}
                      onChange={(e) => setFormPedagio(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  {/* Valor Diarias */}
                  <div className="space-y-1 text-xs">
                    <label className="block text-slate-500 font-semibold text-[9px] font-mono">Diárias (BRL)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formDiaria}
                      onChange={(e) => setFormDiaria(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  {/* Valor Outros */}
                  <div className="space-y-1 text-xs">
                    <label className="block text-slate-500 font-semibold text-[9px] font-mono">Acréscimos (BRL)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formOutros}
                      onChange={(e) => setFormOutros(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                </div>

                <div className="border-t border-slate-250 pt-2 flex justify-between items-center text-xs font-bold text-slate-900">
                  <span>Valor Total Consolidado Calculado:</span>
                  <span className="font-mono text-sm bg-sky-50 text-sky-800 px-3 py-1 rounded-lg border border-sky-100">
                    {formatBRL(Number(formFrete) + Number(formPedagio) + Number(formDiaria) + Number(formOutros))}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                
                {/* Input Entrega Date */}
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-600 font-semibold font-mono text-[10px]">Data da Entrega (Faturamento)</label>
                  <input
                    type="date"
                    required
                    value={formEntrega}
                    onChange={(e) => setFormEntrega(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-sky-500 focus:bg-white transition"
                  />
                </div>

                {/* Input Vencimento Date */}
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-600 font-semibold font-mono text-[10px]">Data do Vencimento</label>
                  <input
                    type="date"
                    required
                    value={formVencimento}
                    onChange={(e) => setFormVencimento(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-sky-500 focus:bg-white transition"
                  />
                </div>

                {/* Input Unidade */}
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-600 font-semibold font-mono text-[10px]">Unidade Concessionária</label>
                  <select
                    value={formUnidade}
                    onChange={(e) => setFormUnidade(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-sky-500 focus:bg-white transition"
                  >
                    {unidades.map((u) => (
                      <option key={u.id} value={u.id}>{u.nome}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Input Observação */}
              <div className="space-y-1 text-xs">
                <label className="block text-slate-600 font-semibold font-mono text-[10px]">Observações / Notas</label>
                <textarea
                  placeholder="Escreva anotações gerais sobre os acertos de carga do cliente..."
                  value={formObs}
                  onChange={(e) => setFormObs(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-sky-500 focus:bg-white transition"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition shadow-sm"
                >
                  {editingTitle ? "Salvar Alterações" : "Gerar Faturamento"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Details and Audit History for Contas a Pagar */}
      {detailsPayable && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-scale-up">
            
            <div className="bg-slate-950 p-4.5 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Detalhamento de Contas a Pagar</span>
                <h3 className="font-bold text-sm tracking-tight">{detailsPayable.id} • DT {detailsPayable.dt}</h3>
              </div>
              <button 
                onClick={() => setDetailsPayable(null)}
                className="text-slate-400 hover:text-white text-xs font-mono border border-slate-800 rounded px-2 py-1 transition"
              >
                Fechar
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              
              <div className="grid grid-cols-2 gap-3.5 border-b pb-4">
                <div className="space-y-0.5 text-xs">
                  <span className="block font-mono text-[9px] text-slate-400 uppercase">Motorista Credor</span>
                  <p className="font-bold text-slate-800">{detailsPayable.motoristaNome}</p>
                  <p className="text-[10px] text-slate-500 font-mono">ID: {detailsPayable.motoristaId}</p>
                </div>
                <div className="space-y-0.5 text-xs">
                  <span className="block font-mono text-[9px] text-slate-400 uppercase">Veículo / Placa</span>
                  <p className="font-bold text-slate-800 font-mono uppercase">{detailsPayable.veiculoId || "Não informado"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5 border-b pb-4">
                <div className="space-y-0.5 text-xs">
                  <span className="block font-mono text-[9px] text-slate-400 uppercase">Data de Emissão</span>
                  <p className="font-bold text-slate-700 font-mono">
                    {new Date(detailsPayable.dataEmissao + "T00:00:00").toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="space-y-0.5 text-xs">
                  <span className="block font-mono text-[9px] text-slate-400 uppercase">Vencimento</span>
                  <p className="font-bold text-rose-600 font-mono">
                    {new Date(detailsPayable.dataVencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-150 text-center">
                <div>
                  <span className="block text-[8px] font-mono text-slate-400 uppercase">Valor Total</span>
                  <span className="text-xs font-bold font-mono text-slate-800">{formatBRL(detailsPayable.valorTotal)}</span>
                </div>
                <div>
                  <span className="block text-[8px] font-mono text-slate-400 uppercase">Pago</span>
                  <span className="text-xs font-bold font-mono text-emerald-600">
                    {formatBRL((detailsPayable.historicoBaixas || []).reduce((sum: number, b: any) => sum + Number(b.valor), 0))}
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] font-mono text-slate-400 uppercase">Saldo Devedor</span>
                  <span className="text-xs font-bold font-mono text-rose-600">
                    {formatBRL(Math.max(0, detailsPayable.valorTotal - (detailsPayable.historicoBaixas || []).reduce((sum: number, b: any) => sum + Number(b.valor), 0)))}
                  </span>
                </div>
              </div>

              {/* Historico de baixas */}
              <div className="space-y-2 pt-1">
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">Histórico de Repasses / Pagamentos</h4>
                {(!detailsPayable.historicoBaixas || detailsPayable.historicoBaixas.length === 0) ? (
                  <div className="p-3 bg-slate-50 rounded-lg text-center text-slate-400 text-xs italic">
                    Nenhum pagamento registrado para esta provisão de frete.
                  </div>
                ) : (
                  <div className="divide-y border rounded-xl overflow-hidden bg-white text-xs">
                    {detailsPayable.historicoBaixas.map((baixa: any, idx: number) => (
                      <div key={idx} className="p-3 flex justify-between items-center bg-slate-50/50 hover:bg-slate-100/50 transition">
                        <div>
                          <span className="font-semibold text-slate-700 font-mono">{formatBRL(baixa.valor)}</span>
                          <span className="block text-[10px] text-slate-400">Via {baixa.meioPagamento} em {new Date(baixa.data + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                          {baixa.observacao && <span className="block text-[10px] text-slate-500 italic mt-0.5">Obs: {baixa.observacao}</span>}
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full uppercase">Baixa #{idx + 1}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Modal: Form Manual Pagamento / Edit Pagamento */}
      {pagarFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-scale-up">
            
            <div className="bg-slate-950 p-4.5 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Controle de Pagamentos (Fretes)</span>
                <h3 className="font-bold text-sm tracking-tight">
                  {editingPayable ? `Editar Lançamento #${editingPayable.id}` : "Registrar Novo Contas a Pagar Manual"}
                </h3>
              </div>
              <button 
                onClick={() => setPagarFormModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono border border-slate-800 rounded px-2 py-1 transition"
              >
                ESC
              </button>
            </div>

            <form onSubmit={handleSavePagarForm} className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
              
              <div className="grid grid-cols-2 gap-3.5">
                {/* Input DT */}
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-600 font-semibold font-mono text-[10px]">Número da DT *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 50443"
                    value={formPagarDt}
                    onChange={(e) => setFormPagarDt(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>

                {/* Input Unidade */}
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-600 font-semibold font-mono text-[10px]">Unidade Concessionária *</label>
                  <select
                    required
                    value={formPagarUnidade}
                    onChange={(e) => setFormPagarUnidade(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-amber-500 focus:bg-white transition"
                  >
                    <option value="">Selecione a Unidade...</option>
                    {unidades.map(u => (
                      <option key={u.id} value={u.id}>{u.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                {/* Input Motorista Nome */}
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-600 font-semibold font-mono text-[10px]">Nome do Motorista *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João da Silva"
                    value={formPagarMotoristaNome}
                    onChange={(e) => setFormPagarMotoristaNome(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>

                {/* Input Motorista ID / CPF */}
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-600 font-semibold font-mono text-[10px]">CPF / ID do Motorista *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 123.456.789-00"
                    value={formPagarMotoristaId}
                    onChange={(e) => setFormPagarMotoristaId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                {/* Input Veículo ID */}
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-600 font-semibold font-mono text-[10px]">Placa do Veículo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: ABC1D23"
                    value={formPagarVeiculo}
                    onChange={(e) => setFormPagarVeiculo(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>

                {/* Input Cliente faturado */}
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-600 font-semibold font-mono text-[10px]">Cliente Faturado</label>
                  <input
                    type="text"
                    placeholder="Ex: Heineken"
                    value={formPagarCliente}
                    onChange={(e) => setFormPagarCliente(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Input Valor Frete */}
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-600 font-semibold font-mono text-[10px]">Valor Frete (BRL)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formPagarFrete || ""}
                    onChange={(e) => setFormPagarFrete(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-amber-500 focus:bg-white font-mono transition"
                  />
                </div>

                {/* Input Valor Disponibilidade */}
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-600 font-semibold font-mono text-[10px]">Disponibilidade (BRL)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formPagarDisponibilidade || ""}
                    onChange={(e) => setFormPagarDisponibilidade(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-amber-500 focus:bg-white font-mono transition"
                  />
                </div>

                {/* Input Valor Diárias */}
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-600 font-semibold font-mono text-[10px]">Diárias (BRL)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formPagarDiarias || ""}
                    onChange={(e) => setFormPagarDiarias(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-amber-500 focus:bg-white font-mono transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                {/* Input Adiantamentos */}
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-600 font-semibold font-mono text-[10px]">Adiantamentos Recebidos (BRL)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formPagarAdiantamentos || ""}
                    onChange={(e) => setFormPagarAdiantamentos(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-amber-500 focus:bg-white font-mono transition"
                  />
                </div>

                {/* Input Descontos / Multas */}
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-600 font-semibold font-mono text-[10px]">Descontos / Multas (BRL)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formPagarDescontos || ""}
                    onChange={(e) => setFormPagarDescontos(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-amber-500 focus:bg-white font-mono transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                {/* Input Data Emissão */}
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-600 font-semibold font-mono text-[10px]">Data de Emissão *</label>
                  <input
                    type="date"
                    required
                    value={formPagarGeracao}
                    onChange={(e) => setFormPagarGeracao(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>

                {/* Input Data Vencimento */}
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-600 font-semibold font-mono text-[10px]">Data de Vencimento *</label>
                  <input
                    type="date"
                    required
                    value={formPagarVencimento}
                    onChange={(e) => setFormPagarVencimento(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Informative total preview */}
              <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl flex items-center justify-between font-mono text-xs">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[9px]">Valor Líquido Estimado a Pagar:</span>
                <span className="font-bold text-sm text-slate-900">
                  {formatBRL((Number(formPagarFrete) + Number(formPagarDisponibilidade) + Number(formPagarDiarias)) - (Number(formPagarAdiantamentos) + Number(formPagarDescontos)))}
                </span>
              </div>

              {/* Input Observacoes */}
              <div className="space-y-1 text-xs">
                <label className="block text-slate-600 font-semibold font-mono text-[10px]">Observações do Lançamento</label>
                <textarea
                  placeholder="Observações complementares sobre este frete..."
                  value={formPagarObs}
                  onChange={(e) => setFormPagarObs(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setPagarFormModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition shadow-sm"
                >
                  {editingPayable ? "Salvar Alterações" : "Gerar Provisão Pagar"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Baixa Financeira de Pagamento (Pagar / Efetuar Repasse) */}
      {baixaPagarModalOpen && selectedPayable && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-scale-up">
            
            <div className="bg-slate-950 p-4.5 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Registo de Pagamento de Frete</span>
                <h3 className="font-bold text-sm tracking-tight">Quitar / Repassar Frete #{selectedPayable.id}</h3>
              </div>
              <button 
                onClick={() => setBaixaPagarModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono border border-slate-800 rounded px-2 py-1 transition"
              >
                ESC
              </button>
            </div>

            <form onSubmit={handleConfirmPagarBaixa} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 font-mono text-[10px] space-y-1">
                <div className="flex justify-between"><span className="text-slate-400">Favorecido:</span> <span className="font-bold text-slate-800">{selectedPayable.motoristaNome}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">DT Relacionada:</span> <span className="font-bold text-slate-800">#{selectedPayable.dt}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Total Provisionado:</span> <span className="font-bold text-slate-800">{formatBRL(selectedPayable.valorTotal)}</span></div>
                
                {(() => {
                  const prev = (selectedPayable.historicoBaixas || []).reduce((sum: number, b: any) => sum + Number(b.valor), 0);
                  const rem = selectedPayable.valorTotal - prev;
                  return (
                    <>
                      <div className="flex justify-between border-t border-slate-200/60 mt-1 pt-1">
                        <span className="text-slate-400">Total Pago Anterior:</span>{" "}
                        <span className="font-bold text-emerald-600">{formatBRL(prev)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-900 text-[11px]">
                        <span className="text-slate-500">Saldo Restante Devedor:</span>{" "}
                        <span>{formatBRL(rem)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Input Data Pagamento */}
              <div className="space-y-1 text-xs">
                <label className="block text-slate-600 font-semibold font-mono text-[10px]">Data do Pagamento</label>
                <input
                  type="date"
                  required
                  value={baixaPagarDate}
                  onChange={(e) => setBaixaPagarDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>

              {/* Input Valor Pago */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <label className="block text-slate-600 font-semibold font-mono text-[10px]">Valor Pago (BRL)</label>
                  <button
                    type="button"
                    onClick={() => {
                      const prev = (selectedPayable.historicoBaixas || []).reduce((sum: number, b: any) => sum + Number(b.valor), 0);
                      setBaixaPagarValue((selectedPayable.valorTotal - prev).toFixed(2));
                    }}
                    className="text-[9px] font-bold text-amber-600 hover:underline"
                  >
                    Usar Saldo Total
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={baixaPagarValue}
                  onChange={(e) => setBaixaPagarValue(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-amber-500 focus:bg-white font-mono font-bold transition"
                />
              </div>

              {/* Input Meio de Pagamento */}
              <div className="space-y-1 text-xs">
                <label className="block text-slate-600 font-semibold font-mono text-[10px]">Meio / Método de Pagamento</label>
                <select
                  value={baixaPagarMethod}
                  onChange={(e) => setBaixaPagarMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-amber-500 focus:bg-white transition"
                >
                  <option value="PIX">PIX (Instantâneo)</option>
                  <option value="TED">TED (Transferência Eletrônica)</option>
                  <option value="Transferência">Transferência Bancária</option>
                  <option value="Dinheiro">Dinheiro em Espécie</option>
                  <option value="Outro">Outro Canal / Acerto</option>
                </select>
              </div>

              {/* Input Observação */}
              <div className="space-y-1 text-xs">
                <label className="block text-slate-600 font-semibold font-mono text-[10px]">Observações da Baixa</label>
                <textarea
                  placeholder="Escreva detalhes como banco de origem, número do comprovante ou notas sobre conciliação..."
                  value={baixaPagarObs}
                  onChange={(e) => setBaixaPagarObs(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setBaixaPagarModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition"
                >
                  Confirmar Pagamento
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
