import React, { lazy, Suspense, useState, useEffect, useMemo } from "react";
import { 
  ArrowRightLeft, Plus, Search, Filter, RefreshCw, FileSpreadsheet, Download, 
  Database, Eye, Edit3, Trash2, Calendar, DollarSign, CheckCircle2, Clock, 
  AlertTriangle, XCircle, ArrowUpDown, ChevronLeft, ChevronRight, X
} from "lucide-react";
import { Unidade, DevolucaoRegistro, DevolucaoCliente, DevolucaoMotorista, DevolucaoMotivo } from "../types";

const DevolucoesDashboard = lazy(() => import("./devolucoes/DevolucoesDashboard"));
const DevolucoesRegistroModal = lazy(() => import("./devolucoes/DevolucoesRegistroModal"));
const DevolucoesImportModal = lazy(() => import("./devolucoes/DevolucoesImportModal"));
const DevolucoesBasesModal = lazy(() => import("./devolucoes/DevolucoesBasesModal"));
const DevolucoesDetalhesModal = lazy(() => import("./devolucoes/DevolucoesDetalhesModal"));
const DevolucoesDeleteModal = lazy(() => import("./devolucoes/DevolucoesDeleteModal"));
const DevolucoesBulkDeleteModal = lazy(() => import("./devolucoes/DevolucoesBulkDeleteModal"));

interface DevolucoesViewProps {
  unidades: Unidade[];
  currentUser: any;
  onRefresh: () => void;
}

export default function DevolucoesView({ unidades, currentUser, onRefresh }: DevolucoesViewProps) {
  // Main state collections
  const [registros, setRegistros] = useState<DevolucaoRegistro[]>([]);
  const [clientes, setClientes] = useState<DevolucaoCliente[]>([]);
  const [motoristas, setMotoristas] = useState<DevolucaoMotorista[]>([]);
  const [motivos, setMotivos] = useState<DevolucaoMotivo[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [hierarquia, setHierarquia] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [isRegistroModalOpen, setIsRegistroModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBasesModalOpen, setIsBasesModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState<DevolucaoRegistro | null>(null);
  const [editingRecord, setEditingRecord] = useState<DevolucaoRegistro | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<DevolucaoRegistro | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Auto-hide toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Filter States
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  const [filterNF, setFilterNF] = useState("");
  const [filterClienteCod, setFilterClienteCod] = useState("");
  const [filterClienteNome, setFilterClienteNome] = useState("");
  const [filterMotorista, setFilterMotorista] = useState("");
  const [filterMotivo, setFilterMotivo] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterResolvido, setFilterResolvido] = useState("Todos");
  const [filterFilial, setFilterFilial] = useState(currentUser?.unidadeId !== "Todas" ? currentUser?.unidadeId : "Todas");
  const [filterVendedor, setFilterVendedor] = useState("");
  const [filterSupervisor, setFilterSupervisor] = useState("");
  const [filterGerente, setFilterGerente] = useState("");

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [sortField, setSortField] = useState<string>("dataOcorrido");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Fetch all module data
  const loadModuleData = async () => {
    setIsLoading(true);
    try {
      const headers = { "x-user-email": currentUser?.email || "" };
      const [regRes, cliRes, drvRes, sysDrvRes, motRes, hieRes, veicRes] = await Promise.all([
        fetch("/api/devolucoes/registros", { headers }),
        fetch("/api/devolucoes/clientes", { headers }),
        fetch("/api/devolucoes/motoristas", { headers }),
        fetch("/api/motoristas", { headers }),
        fetch("/api/devolucoes/motivos", { headers }),
        fetch("/api/devolucoes/hierarquia", { headers }),
        fetch("/api/veiculos", { headers })
      ]);

      if (regRes.ok) setRegistros(await regRes.json());
      if (cliRes.ok) setClientes(await cliRes.json());

      let devDrivers: DevolucaoMotorista[] = [];
      let sysDrivers: any[] = [];
      if (drvRes.ok) devDrivers = await drvRes.json();
      if (sysDrvRes && sysDrvRes.ok) sysDrivers = await sysDrvRes.json();

      const mergedDrivers: DevolucaoMotorista[] = [...devDrivers];
      const seen = new Set(devDrivers.map(d => (d.matricula || d.id || d.nome).toLowerCase()));

      sysDrivers.forEach((m: any) => {
        if (m.statusFinal === "BLOQUEADO") return; // Apenas liberados da base
        const key = (m.matricula || m.id || m.cpf || m.nome).toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          mergedDrivers.push({
            id: m.id || m.matricula || m.cpf || "",
            matricula: m.matricula || m.id || m.cpf || "",
            nome: m.nome,
            telefone: m.telefone || "",
            funcao: m.tipo || "Motorista",
            unidadeId: m.unidadeId || "",
            status: "Ativo",
            dataCadastro: m.dataCriacao || new Date().toISOString()
          });
        }
      });

      setMotoristas(mergedDrivers);
      if (motRes.ok) setMotivos(await motRes.json());
      if (hieRes.ok) setHierarquia(await hieRes.json());
      if (veicRes.ok) setVeiculos(await veicRes.json());
    } catch (err) {
      console.error("Erro ao carregar módulo de devoluções:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadModuleData();
  }, [currentUser]);

  // Save / Update Record
  const handleSaveRecord = async (recordPayload: any) => {
    const isEdit = Boolean(recordPayload.id);
    const url = isEdit 
      ? `/api/devolucoes/registros/${recordPayload.id}` 
      : "/api/devolucoes/registros";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-user-email": currentUser?.email || ""
      },
      body: JSON.stringify(recordPayload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Falha ao salvar registro.");
    }

    await loadModuleData();
    onRefresh();
  };

  // Trigger Delete Confirmation Modal
  const handleDeleteRecord = (record: any) => {
    if (!record) return;
    setRecordToDelete(record);
    setIsDeleteModalOpen(true);
  };

  // Confirm and Execute Deletion via API
  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);

    const targetId = recordToDelete.id || recordToDelete.protocolo || recordToDelete.numeroNF;
    if (!targetId) {
      setToastMessage({ text: "Não foi possível excluir o registro.", type: "error" });
      setIsDeleting(false);
      return;
    }

    try {
      const queryParams = new URLSearchParams({
        id: recordToDelete.id || "",
        protocolo: recordToDelete.protocolo || "",
        nf: recordToDelete.numeroNF || "",
        clienteCodigo: recordToDelete.clienteCodigo || ""
      }).toString();

      const res = await fetch(`/api/devolucoes/registros/${encodeURIComponent(targetId)}?${queryParams}`, {
        method: "DELETE",
        headers: {
          "x-user-email": currentUser?.email || "",
          "x-selected-unit": currentUser?.unidadeId || "Todas"
        }
      });

      if (res.ok) {
        // Remove from local table state immediately
        setRegistros((prev) => prev.filter((r) => 
          r.id !== recordToDelete.id && 
          r.protocolo !== recordToDelete.protocolo && 
          r.numeroNF !== recordToDelete.numeroNF
        ));
        setToastMessage({ text: "Registro excluído com sucesso.", type: "success" });
        setIsDeleteModalOpen(false);
        setRecordToDelete(null);

        // Synchronize backend data and global state
        await loadModuleData();
        onRefresh();
      } else {
        setToastMessage({ text: "Não foi possível excluir o registro.", type: "error" });
      }
    } catch (err) {
      console.error("Erro na exclusão do registro:", err);
      setToastMessage({ text: "Não foi possível excluir o registro.", type: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  // Confirm and Execute Bulk Deletion (Limpeza Geral)
  const handleConfirmBulkDelete = async (payload: { modo: string; dataInicio?: string; dataFim?: string; unidade?: string }) => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/devolucoes/historico", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": currentUser?.email || ""
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToastMessage({ text: `${data.removidos || 0} registro(s) excluído(s). Histórico limpo com sucesso.`, type: "success" });
        setIsBulkDeleteModalOpen(false);

        // Synchronize table data, indicators, and charts automatically
        await loadModuleData();
        onRefresh();
      } else {
        setToastMessage({ text: data.error || "Não foi possível realizar a limpeza do histórico.", type: "error" });
      }
    } catch (err) {
      console.error("Erro na limpeza geral de histórico:", err);
      setToastMessage({ text: "Falha de conexão para limpeza de histórico.", type: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilterStart("");
    setFilterEnd("");
    setFilterNF("");
    setFilterClienteCod("");
    setFilterClienteNome("");
    setFilterMotorista("");
    setFilterMotivo("");
    setFilterStatus("Todos");
    setFilterResolvido("Todos");
    setFilterFilial(currentUser?.unidadeId !== "Todas" ? currentUser?.unidadeId : "Todas");
    setFilterVendedor("");
    setFilterSupervisor("");
    setFilterGerente("");
    setCurrentPage(1);
  };

  // Filtered & Sorted Records
  const filteredRecords = useMemo(() => {
    return registros.filter(r => {
      const regDate = r.dataOcorrido || r.data || "";
      if (filterStart && regDate < filterStart) return false;
      if (filterEnd && regDate > filterEnd) return false;
      if (filterNF && !String(r.numeroNF || "").toLowerCase().includes(filterNF.toLowerCase())) return false;
      if (filterClienteCod && !String(r.clienteCodigo || "").toLowerCase().includes(filterClienteCod.toLowerCase())) return false;
      if (filterClienteNome) {
        const fullClient = `${r.clienteNome || ""} ${r.clienteNomeFantasia || ""} ${r.clienteRazaoSocial || ""}`.toLowerCase();
        if (!fullClient.includes(filterClienteNome.toLowerCase())) return false;
      }
      if (filterMotorista && !String(r.motoristaNome || "").toLowerCase().includes(filterMotorista.toLowerCase())) return false;
      if (filterMotivo && r.motivoCodigo !== filterMotivo && !String(r.motivoDescricao || "").toLowerCase().includes(filterMotivo.toLowerCase())) return false;
      if (filterStatus !== "Todos" && r.status !== filterStatus) return false;
      if (filterResolvido !== "Todos") {
        const isRes = r.resolvido === "SIM" || r.status === "Resolvida";
        if (filterResolvido === "SIM" && !isRes) return false;
        if (filterResolvido === "NÃO" && isRes) return false;
      }
      if (filterFilial && filterFilial !== "Todas") {
        const regFilial = r.filial || r.unidadeId || "";
        if (regFilial !== filterFilial) return false;
      }
      if (filterVendedor && !String(r.vendedor || "").toLowerCase().includes(filterVendedor.toLowerCase())) return false;
      if (filterSupervisor && !String(r.supervisor || "").toLowerCase().includes(filterSupervisor.toLowerCase())) return false;
      if (filterGerente && !String(r.gerente || "").toLowerCase().includes(filterGerente.toLowerCase())) return false;

      return true;
    }).sort((a, b) => {
      let valA = (a as any)[sortField] || "";
      let valB = (b as any)[sortField] || "";

      if (sortField === "valorNF") {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [
    registros, filterStart, filterEnd, filterNF, filterClienteCod, filterClienteNome,
    filterMotorista, filterMotivo, filterStatus, filterResolvido, filterFilial,
    filterVendedor, filterSupervisor, filterGerente, sortField, sortOrder
  ]);

  // Pagination bounds
  const totalItems = filteredRecords.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredRecords.slice(startIdx, startIdx + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Export to Excel
  const handleExportExcel = async () => {
    if (filteredRecords.length === 0) {
      alert("Nenhum registro para exportar.");
      return;
    }

    const exportRows = filteredRecords.map(r => ({
      "Data Ocorrência": r.dataOcorrido || r.data,
      "Número NF": r.numeroNF,
      "Valor (R$)": r.valorNF,
      "Código Cliente": r.clienteCodigo,
      "Razão Social / Fantasia": r.clienteNomeFantasia || r.clienteRazaoSocial || r.clienteNome,
      "Motorista": r.motoristaNome,
      "Matrícula Motorista": r.motoristaMatricula,
      "Código Motivo": r.motivoCodigo,
      "Descrição Motivo": r.motivoDescricao,
      "Status": r.status,
      "Resolvido": r.resolvido || (r.status === "Resolvida" ? "SIM" : "NÃO"),
      "Filial": r.filial || r.unidadeId,
      "Vendedor": r.vendedor,
      "Supervisor": r.supervisor,
      "Gerente": r.gerente,
      "Observação": r.observacao,
      "Usuário Cadastro": r.usuarioCadastro || r.criadoPor,
      "Data Cadastro": r.dataCadastro || r.criadoEm
    }));

    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Devoluções");
    XLSX.writeFile(workbook, `Gestao_Devolucoes_AMPLA_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Toggle Sorting
  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. CABEÇALHO DO MÓDULO E AÇÕES RÁPIDAS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <span className="text-[10px] font-bold text-sky-400 font-mono tracking-widest uppercase block">
            MÓDULO DE GESTÃO INTEGRADA AMPLA
          </span>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2 mt-0.5 font-mono">
            <ArrowRightLeft className="w-6 h-6 text-sky-400" /> DEVOLUÇÕES DE NOTAS FISCAIS
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Controle operacional, tratativas de ocorrências, motivos Y-Code e emissão de relatórios com auto-completamento de banco de dados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setEditingRecord(null);
              setIsRegistroModalOpen(true);
            }}
            className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold rounded-xl flex items-center gap-2 text-xs font-mono shadow-lg shadow-sky-500/10 transition-all"
          >
            <Plus className="w-4 h-4" /> Nova Devolução
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl flex items-center gap-2 text-xs font-mono font-bold transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Importar Excel
          </button>

          <button
            onClick={() => setIsBasesModalOpen(true)}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 rounded-xl flex items-center gap-2 text-xs font-mono font-bold transition-all"
          >
            <Database className="w-4 h-4 text-indigo-400" /> Bases
          </button>

          <button
            onClick={() => setIsBulkDeleteModalOpen(true)}
            className="px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs font-mono font-bold transition-all shadow-lg shadow-rose-950/20"
            title="Limpeza Geral do Histórico"
          >
            <Trash2 className="w-4 h-4 text-rose-400" /> Limpeza Geral
          </button>

          <button
            onClick={loadModuleData}
            disabled={isLoading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Atualizar Dados"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-sky-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. ÁREA 1: DASHBOARD DE INDICADORES (7 CARDS + 5 GRÁFICOS) */}
      <Suspense fallback={<div className="h-40 rounded-2xl bg-slate-900/60 animate-pulse" />}>
        <DevolucoesDashboard
          registros={filteredRecords}
          unidades={unidades}
        />
      </Suspense>

      {/* 3. ÁREA 2: FILTROS DE PESQUISA */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
              Filtros de Pesquisa Operacional
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {filteredRecords.length} de {registros.length} registros encontrados
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs font-mono">
          {/* Data Inicial */}
          <div className="space-y-1">
            <label className="text-slate-400 text-[10px] font-bold block">Data Inicial</label>
            <input 
              type="date"
              value={filterStart}
              onChange={(e) => setFilterStart(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* Data Final */}
          <div className="space-y-1">
            <label className="text-slate-400 text-[10px] font-bold block">Data Final</label>
            <input 
              type="date"
              value={filterEnd}
              onChange={(e) => setFilterEnd(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* Número NF */}
          <div className="space-y-1">
            <label className="text-slate-400 text-[10px] font-bold block">Número NF</label>
            <input 
              type="text"
              placeholder="Digite NF..."
              value={filterNF}
              onChange={(e) => setFilterNF(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* Código Cliente */}
          <div className="space-y-1">
            <label className="text-slate-400 text-[10px] font-bold block">Cód. Cliente</label>
            <input 
              type="text"
              placeholder="Cód. PDV..."
              value={filterClienteCod}
              onChange={(e) => setFilterClienteCod(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* Cliente Nome */}
          <div className="space-y-1">
            <label className="text-slate-400 text-[10px] font-bold block">Nome Cliente</label>
            <input 
              type="text"
              placeholder="Razão / Fantasia..."
              value={filterClienteNome}
              onChange={(e) => setFilterClienteNome(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* Motorista */}
          <div className="space-y-1">
            <label className="text-slate-400 text-[10px] font-bold block">Motorista</label>
            <input 
              type="text"
              placeholder="Nome condutor..."
              value={filterMotorista}
              onChange={(e) => setFilterMotorista(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* Motivo */}
          <div className="space-y-1">
            <label className="text-slate-400 text-[10px] font-bold block">Motivo (Y-Code)</label>
            <select
              value={filterMotivo}
              onChange={(e) => setFilterMotivo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:border-sky-500 focus:outline-none"
            >
              <option value="">Todos os Motivos</option>
              {motivos.map(m => (
                <option key={m.codigo} value={m.codigo}>{m.codigo} - {m.descricao}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-slate-400 text-[10px] font-bold block">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:border-sky-500 focus:outline-none font-bold"
            >
              <option value="Todos">Todos os Status</option>
              <option value="Aguardando Tratativa">Aguardando Tratativa</option>
              <option value="Em Análise">Em Análise</option>
              <option value="Em Atendimento">Em Atendimento</option>
              <option value="Aguardando Comercial">Aguardando Comercial</option>
              <option value="Resolvida">Resolvida</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>

          {/* Campo Resolvido */}
          <div className="space-y-1">
            <label className="text-slate-400 text-[10px] font-bold block">Resolvido?</label>
            <select
              value={filterResolvido}
              onChange={(e) => setFilterResolvido(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:border-sky-500 focus:outline-none font-bold"
            >
              <option value="Todos">Todos</option>
              <option value="SIM">SIM</option>
              <option value="NÃO">NÃO</option>
            </select>
          </div>

          {/* Filial */}
          <div className="space-y-1">
            <label className="text-slate-400 text-[10px] font-bold block">Filial</label>
            <select
              value={filterFilial}
              onChange={(e) => setFilterFilial(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:border-sky-500 focus:outline-none"
            >
              <option value="Todas">Todas as Filiais</option>
              {unidades.map(u => (
                <option key={u.id} value={u.id}>{u.nome || u.cidade || u.id}</option>
              ))}
            </select>
          </div>

          {/* Vendedor */}
          <div className="space-y-1">
            <label className="text-slate-400 text-[10px] font-bold block">Vendedor</label>
            <input 
              type="text"
              placeholder="Vendedor..."
              value={filterVendedor}
              onChange={(e) => setFilterVendedor(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* Supervisor / Gerente */}
          <div className="space-y-1">
            <label className="text-slate-400 text-[10px] font-bold block">Supervisor</label>
            <input 
              type="text"
              placeholder="Supervisor..."
              value={filterSupervisor}
              onChange={(e) => setFilterSupervisor(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Filter Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold rounded-lg flex items-center gap-1.5 text-xs font-mono shadow-sm"
            >
              <Search className="w-3.5 h-3.5" /> Pesquisar
            </button>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg flex items-center gap-1.5 text-xs font-mono transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Limpar Filtros
            </button>
          </div>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold rounded-lg flex items-center gap-1.5 text-xs font-mono transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Exportar Excel
          </button>
        </div>
      </div>

      {/* 4. ÁREA 3: TABELA DE HISTÓRICO DE DEVOLUÇÕES (HIGH PERFORMANCE) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Histórico Operacional de Devoluções
            </h3>
            <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-bold text-[10px]">
              {totalItems} Registros
            </span>
          </div>

          {/* Rows Per Page Selector */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Exibir:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none"
            >
              <option value={15}>15 por pág.</option>
              <option value={30}>30 por pág.</option>
              <option value={50}>50 por pág.</option>
              <option value={100}>100 por pág.</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3 cursor-pointer hover:text-sky-400" onClick={() => toggleSort("dataOcorrido")}>
                  <div className="flex items-center gap-1">Data <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
                </th>
                <th className="p-3 cursor-pointer hover:text-sky-400" onClick={() => toggleSort("numeroNF")}>
                  <div className="flex items-center gap-1">NF <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
                </th>
                <th className="p-3 text-right cursor-pointer hover:text-sky-400" onClick={() => toggleSort("valorNF")}>
                  <div className="flex items-center justify-end gap-1">Valor <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
                </th>
                <th className="p-3">Cód. Cli</th>
                <th className="p-3 cursor-pointer hover:text-sky-400" onClick={() => toggleSort("clienteNome")}>
                  <div className="flex items-center gap-1">Cliente <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
                </th>
                <th className="p-3">Motorista</th>
                <th className="p-3">Motivo</th>
                <th className="p-3 cursor-pointer hover:text-sky-400" onClick={() => toggleSort("status")}>
                  <div className="flex items-center gap-1">Status <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
                </th>
                <th className="p-3 text-center">Resolvido</th>
                <th className="p-3">Filial</th>
                <th className="p-3">Usuário</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {paginatedRecords.map((r) => {
                const isResolvido = r.resolvido === "SIM" || r.status === "Resolvida";
                return (
                  <tr key={r.id || r.protocolo} className="hover:bg-slate-800/40 transition-colors">
                    {/* Data */}
                    <td className="p-3 whitespace-nowrap text-slate-400 font-medium">
                      {r.dataOcorrido || r.data}
                    </td>

                    {/* NF */}
                    <td className="p-3 font-bold text-sky-400 whitespace-nowrap">
                      #{r.numeroNF}
                    </td>

                    {/* Valor */}
                    <td className="p-3 text-right font-bold text-emerald-400 whitespace-nowrap">
                      R$ {Number(r.valorNF || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Codigo Cliente */}
                    <td className="p-3 font-semibold text-slate-400 whitespace-nowrap">
                      {r.clienteCodigo}
                    </td>

                    {/* Cliente Nome */}
                    <td className="p-3 font-semibold text-slate-100 max-w-[180px] truncate" title={r.clienteNomeFantasia || r.clienteRazaoSocial || r.clienteNome}>
                      {r.clienteNomeFantasia || r.clienteRazaoSocial || r.clienteNome}
                    </td>

                    {/* Motorista */}
                    <td className="p-3 text-slate-300 max-w-[130px] truncate" title={r.motoristaNome}>
                      {r.motoristaNome}
                    </td>

                    {/* Motivo */}
                    <td className="p-3 max-w-[150px] truncate" title={`${r.motivoCodigo} - ${r.motivoDescricao}`}>
                      <span className="text-sky-400 font-bold">{r.motivoCodigo}</span> - <span className="text-slate-400 text-[11px]">{r.motivoDescricao}</span>
                    </td>

                    {/* Status Badge */}
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                        r.status === "Resolvida"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : r.status === "Cancelada"
                          ? "bg-slate-800 text-slate-400 border-slate-700"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}>
                        {r.status}
                      </span>
                    </td>

                    {/* Resolvido Badge */}
                    <td className="p-3 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isResolvido 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" 
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                      }`}>
                        {isResolvido ? "SIM" : "NÃO"}
                      </span>
                    </td>

                    {/* Filial */}
                    <td className="p-3 text-slate-400 text-[11px] whitespace-nowrap">
                      {r.filial || r.unidadeId || "Goiânia"}
                    </td>

                    {/* Usuario Cadastro */}
                    <td className="p-3 text-slate-400 text-[11px] whitespace-nowrap">
                      {r.usuarioCadastro || r.criadoPor || "Sistema"}
                    </td>

                    {/* Ações */}
                    <td className="p-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedRecord(r);
                            setIsDetailsModalOpen(true);
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg transition-colors"
                          title="Visualizar Detalhes"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setEditingRecord(r);
                            setIsRegistroModalOpen(true);
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg transition-colors"
                          title="Editar Registro"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteRecord(r)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-lg transition-colors"
                          title="Excluir Registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedRecords.length === 0 && (
                <tr>
                  <td colSpan={12} className="p-12 text-center text-slate-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Search className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="font-bold text-slate-400 text-sm">Nenhuma devolução encontrada</p>
                      <p className="text-xs text-slate-500">Tente ajustar os filtros ou registrar uma nova devolução.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
          <div>
            Mostrando <strong className="text-slate-200">{paginatedRecords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> até <strong className="text-slate-200">{Math.min(currentPage * pageSize, totalItems)}</strong> de <strong className="text-slate-200">{totalItems}</strong> registros
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg font-bold hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <span>Página <strong className="text-sky-400">{currentPage}</strong> de {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg font-bold hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              Próxima <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODALS */}
      <Suspense fallback={null}>
      {isRegistroModalOpen && <DevolucoesRegistroModal
        isOpen={isRegistroModalOpen}
        onClose={() => {
          setIsRegistroModalOpen(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveRecord}
        editRecord={editingRecord}
        clientes={clientes}
        motoristas={motoristas}
        motivos={motivos}
        veiculos={veiculos}
        unidades={unidades}
        currentUser={currentUser}
      />}

      {isImportModalOpen && <DevolucoesImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={loadModuleData}
        clientes={clientes}
        motoristas={motoristas}
        motivos={motivos}
        currentUser={currentUser}
      />}

      {isBasesModalOpen && <DevolucoesBasesModal
        isOpen={isBasesModalOpen}
        onClose={() => setIsBasesModalOpen(false)}
        clientes={clientes}
        motoristas={motoristas}
        motivos={motivos}
        hierarquia={hierarquia}
        onRefresh={loadModuleData}
        currentUser={currentUser}
      />}

      {isDetailsModalOpen && <DevolucoesDetalhesModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedRecord(null);
        }}
        record={selectedRecord}
      />}

      {isDeleteModalOpen && <DevolucoesDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setRecordToDelete(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        record={recordToDelete}
        isDeleting={isDeleting}
      />}

      {isBulkDeleteModalOpen && <DevolucoesBulkDeleteModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsBulkDeleteModalOpen(false);
          }
        }}
        onConfirm={handleConfirmBulkDelete}
        unidades={unidades}
        allRecords={registros}
        isDeleting={isDeleting}
      />}
      </Suspense>

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 text-xs font-mono font-bold transition-all animate-fade-in ${
          toastMessage.type === "success" 
            ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-300 shadow-emerald-950/50" 
            : "bg-rose-950/90 border-rose-500/40 text-rose-300 shadow-rose-950/50"
        }`}>
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button 
            onClick={() => setToastMessage(null)} 
            className="ml-2 text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
