import React, { useState, useEffect, useRef } from "react";
import { 
  Search, Filter, Calendar, FileText, CheckCircle, AlertTriangle, 
  Clock, RefreshCw, Eye, Download, History, X, Check, ArrowRight,
  FolderCheck, Users, HelpCircle, FileCheck2, FileX
} from "lucide-react";
import { Motorista, Unidade, DocumentoHistorico } from "../types";
import { openDocumentOrNotify } from "../lib/documents";
import { differenceInOperationalCalendarDays } from "../../shared/documentExpiration";

interface CentralDocumentosViewProps {
  motoristas: Motorista[];
  unidades: Unidade[];
  onRefresh: () => void;
  userEmail: string;
}

interface DocumentRow {
  id: string; // unique id
  pessoaId: string;
  pessoaNome: string;
  pessoaCpf: string;
  pessoaTipo: "Motorista" | "Ajudante Fixo" | "Ajudante Geral";
  pessoaUnidadeId: string;
  documentoTipo: "CNH" | "ASO" | "Integração" | "Pesquisa GR" | "MOPP" | "Toxicológico" | "Ficha EPI" | "Documento Pessoal" | "Comprovante" | "Foto";
  validade?: string;
  arquivoUrl?: string;
  diasRestantes?: number;
  status: "Regular" | "Atenção" | "Grave" | "Vencido" | "Pendente";
}

export default function CentralDocumentosView({ motoristas, unidades, onRefresh, userEmail }: CentralDocumentosViewProps) {
  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUnidade, setSelectedUnidade] = useState("Todas");
  const [selectedTipoPessoa, setSelectedTipoPessoa] = useState("Todas");
  const [selectedTipoDoc, setSelectedTipoDoc] = useState("Todos");
  const [selectedStatusDoc, setSelectedStatusDoc] = useState("Todos");
  const [selectedDiasVencer, setSelectedDiasVencer] = useState("Qualquer");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // History & Renewal states
  const [historyLogs, setHistoryLogs] = useState<DocumentoHistorico[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Modals state
  const [selectedDocForHistory, setSelectedDocForHistory] = useState<DocumentRow | null>(null);
  const [selectedDocForRenewal, setSelectedDocForRenewal] = useState<DocumentRow | null>(null);

  // Renewal Form States
  const [novaValidade, setNovaValidade] = useState("");
  const [novoArquivoUrl, setNovoArquivoUrl] = useState("");
  const [observacaoMotivo, setObservacaoMotivo] = useState("");
  const [isSubmittingRenewal, setIsSubmittingRenewal] = useState(false);
  const [renewalError, setRenewalError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  // Fetch History Logs
  const fetchHistoryLogs = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/documentos/historico");
      if (res.ok) {
        const data = await res.json();
        setHistoryLogs(data);
      }
    } catch (error) {
      console.error("Erro ao buscar histórico de documentos:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistoryLogs();
  }, [motoristas]);

  // Helper to calculate remaining days
  const getDaysDiff = (validadeDateStr?: string) => {
    const days = differenceInOperationalCalendarDays(validadeDateStr);
    return days === null ? undefined : days;
  };

  // Compile all documents across all people
  const allDocuments: DocumentRow[] = [];

  motoristas.forEach((p) => {
    const isMotorista = p.tipo === "Motorista" || !p.tipo;
    const tipoLabel = p.tipo || "Motorista";

    // Document types definition
    const docsToEvaluate: Array<{
      tipo: DocumentRow["documentoTipo"];
      validade?: string;
      arquivoUrl?: string;
      statusCheck?: string;
      requiresDriver: boolean;
    }> = [
      { tipo: "CNH", validade: p.cnhVencimento, arquivoUrl: p.cnhDocumentoUrl, requiresDriver: true },
      { tipo: "ASO", validade: p.asoVencimento, arquivoUrl: p.asoDocumentoUrl, statusCheck: p.aso, requiresDriver: false },
      { tipo: "Integração", validade: p.integracaoVencimento, arquivoUrl: p.integracaoDocumentoUrl, statusCheck: p.integracao, requiresDriver: false },
      { tipo: "Pesquisa GR", validade: p.pesquisaVencimento, arquivoUrl: p.pesquisaDocumentoUrl, statusCheck: p.pesquisa, requiresDriver: false },
      { tipo: "MOPP", validade: p.moppVencimento, arquivoUrl: p.moppDocumentoUrl, statusCheck: p.mopp, requiresDriver: true },
      { tipo: "Toxicológico", validade: p.toxicologicoVencimento, arquivoUrl: p.toxicologicoDocumentoUrl, statusCheck: p.toxicologico, requiresDriver: true },
      { tipo: "Ficha EPI", validade: p.fichaEpiVencimento, arquivoUrl: p.fichaEpiDocumentoUrl, statusCheck: p.fichaEpi, requiresDriver: false },
      { tipo: "Documento Pessoal", validade: p.documentoPessoalVencimento, arquivoUrl: p.documentoPessoalDocumentoUrl, statusCheck: p.documentoPessoal, requiresDriver: false },
      { tipo: "Comprovante", validade: p.comprovanteVencimento, arquivoUrl: p.comprovanteDocumentoUrl, statusCheck: p.comprovante, requiresDriver: false },
      { tipo: "Foto", validade: p.fotoVencimento, arquivoUrl: p.fotoDocumentoUrl, statusCheck: p.foto, requiresDriver: false }
    ];

    docsToEvaluate.forEach((doc) => {
      // Skip if doc requires driver and person is not a driver
      if (doc.requiresDriver && !isMotorista) return;

      const remaining = getDaysDiff(doc.validade);
      let computedStatus: DocumentRow["status"] = "Pendente";

      if (doc.validade) {
        if (remaining !== undefined) {
          if (remaining <= 0) {
            computedStatus = "Vencido";
          } else if (remaining <= 15) {
            computedStatus = "Grave";
          } else if (remaining <= 40) {
            computedStatus = "Atenção";
          } else {
            computedStatus = "Regular";
          }
        } else {
          computedStatus = "Regular";
        }
      } else {
        // Fallback to text status checks if exists
        if (doc.statusCheck === "Feito" || doc.arquivoUrl) {
          computedStatus = "Regular";
        } else if (doc.statusCheck === "Pendente") {
          computedStatus = "Pendente";
        } else if (doc.statusCheck === "Reprovada") {
          computedStatus = "Vencido"; // Treated as critical block
        } else {
          computedStatus = "Pendente";
        }
      }

      allDocuments.push({
        id: `${p.id}-${doc.tipo}`,
        pessoaId: p.id,
        pessoaNome: p.nome,
        pessoaCpf: p.cpf,
        pessoaTipo: tipoLabel,
        pessoaUnidadeId: p.unidadeId,
        documentoTipo: doc.tipo,
        validade: doc.validade || undefined,
        arquivoUrl: doc.arquivoUrl || undefined,
        diasRestantes: remaining,
        status: computedStatus
      });
    });
  });

  // Calculate Dashboard Metrics
  const totalProfissionais = motoristas.length;
  const profissionaisAptos = motoristas.filter(m => m.statusFinal === "LIBERADO").length;
  const profissionaisBloqueados = motoristas.filter(m => m.statusFinal === "BLOQUEADO").length;
  
  const totalDocumentos = allDocuments.length;
  const documentosVencidos = allDocuments.filter(d => d.status === "Vencido").length;
  const documentosVencendo15 = allDocuments.filter(d => d.status === "Grave").length;

  // Filter Application
  const filteredDocs = allDocuments.filter((doc) => {
    // 1. Text Search (Name / CPF)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesName = doc.pessoaNome.toLowerCase().includes(term);
      const matchesCpf = doc.pessoaCpf.replace(/\D/g, "").includes(term.replace(/\D/g, ""));
      if (!matchesName && !matchesCpf) return false;
    }

    // 2. Unidade Filter
    if (selectedUnidade !== "Todas" && doc.pessoaUnidadeId !== selectedUnidade) {
      return false;
    }

    // 3. Tipo do colaborador
    if (selectedTipoPessoa !== "Todas") {
      if (selectedTipoPessoa === "Motorista" && doc.pessoaTipo !== "Motorista") return false;
      if (selectedTipoPessoa === "Ajudante" && doc.pessoaTipo === "Motorista") return false;
    }

    // 4. Tipo de documento
    if (selectedTipoDoc !== "Todos" && doc.documentoTipo !== selectedTipoDoc) {
      return false;
    }

    // 5. Status do documento
    if (selectedStatusDoc !== "Todos" && doc.status !== selectedStatusDoc) {
      return false;
    }

    // 6. Dias para vencer
    if (selectedDiasVencer !== "Qualquer") {
      if (doc.diasRestantes === undefined) return false;
      if (selectedDiasVencer === "15" && (doc.diasRestantes <= 0 || doc.diasRestantes > 15)) return false;
      if (selectedDiasVencer === "30" && (doc.diasRestantes <= 0 || doc.diasRestantes > 30)) return false;
      if (selectedDiasVencer === "90" && (doc.diasRestantes <= 0 || doc.diasRestantes > 90)) return false;
    }

    return true;
  });

  // Pagination calculations
  const totalItems = filteredDocs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedDocs = filteredDocs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedUnidade, selectedTipoPessoa, selectedTipoDoc, selectedStatusDoc, selectedDiasVencer]);

  // Reference for file input to support click-to-upload on the dropzone
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        setNovoArquivoUrl(base64Url);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Drag & Drop UX
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleViewFile = (url?: string, _filename?: string) => openDocumentOrNotify(url);

  // Renew Submit Action
  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocForRenewal) return;

    if (!novoArquivoUrl && !selectedDocForRenewal.arquivoUrl) {
      setRenewalError("Por favor, faça upload ou insira o link do novo arquivo de documento.");
      return;
    }

    setIsSubmittingRenewal(true);
    setRenewalError("");

    try {
      const res = await fetch("/api/documentos/renovar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pessoaId: selectedDocForRenewal.pessoaId,
          documentoTipo: selectedDocForRenewal.documentoTipo,
          novaValidade: novaValidade || undefined,
          novoArquivo: novoArquivoUrl || selectedDocForRenewal.arquivoUrl,
          motivo: observacaoMotivo
        })
      });

      if (res.ok) {
        onRefresh();
        setSelectedDocForRenewal(null);
        setNovaValidade("");
        setNovoArquivoUrl("");
        setObservacaoMotivo("");
      } else {
        const errData = await res.json();
        setRenewalError(errData.error || "Ocorreu um erro ao atualizar o documento.");
      }
    } catch (err: any) {
      setRenewalError("Falha ao comunicar com o servidor.");
    } finally {
      setIsSubmittingRenewal(false);
    }
  };

  const getStatusBadge = (status: DocumentRow["status"]) => {
    switch (status) {
      case "Regular":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Regular
          </span>
        );
      case "Atenção":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            Atenção (&lt;30d)
          </span>
        );
      case "Grave":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold bg-orange-500/10 border border-orange-500/20 text-orange-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
            Grave (&lt;15d)
          </span>
        );
      case "Vencido":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
            Vencido
          </span>
        );
      case "Pendente":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold bg-slate-500/10 border border-slate-500/20 text-slate-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Pendente
          </span>
        );
    }
  };

  const currentUnitName = (id: string) => {
    const uni = unidades.find(u => u.id === id);
    return uni ? uni.nome : id;
  };

  return (
    <div className="space-y-6">
      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Pessoas Aptas */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Pessoas Aptas</span>
            <h3 className="text-2xl font-black text-emerald-400 font-sans tracking-tight">
              {profissionaisAptos}
            </h3>
            <p className="text-[9px] text-slate-500 font-mono">De {totalProfissionais} profissionais</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* Pessoas Bloqueadas */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Bloqueados</span>
            <h3 className="text-2xl font-black text-rose-400 font-sans tracking-tight">
              {profissionaisBloqueados}
            </h3>
            <p className="text-[9px] text-slate-500 font-mono">Inaptos operacionais</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
        </div>

        {/* Documentos Vencidos */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Docs Vencidos</span>
            <h3 className="text-2xl font-black text-rose-500 font-sans tracking-tight">
              {documentosVencidos}
            </h3>
            <p className="text-[9px] text-slate-500 font-mono">Ação de renovação urgente</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
            <FileX className="w-5 h-5 text-rose-500" />
          </div>
        </div>

        {/* Vencendo em 15 dias */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Grave (&lt;15 dias)</span>
            <h3 className="text-2xl font-black text-orange-400 font-sans tracking-tight">
              {documentosVencendo15}
            </h3>
            <p className="text-[9px] text-slate-500 font-mono">Alerta de vencimento iminente</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
            <Clock className="w-5 h-5 text-orange-400 animate-pulse" />
          </div>
        </div>

        {/* Total de Documentos */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Total Documentos</span>
            <h3 className="text-2xl font-black text-sky-400 font-sans tracking-tight">
              {totalDocumentos}
            </h3>
            <p className="text-[9px] text-slate-500 font-mono">Mapeados na base global</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center border border-sky-400/20">
            <FileCheck2 className="w-5 h-5 text-sky-400" />
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <span className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-sky-400" />
            Filtros Avançados de Conformidade Documental
          </span>
          <button 
            onClick={() => {
              setSearchTerm("");
              setSelectedUnidade("Todas");
              setSelectedTipoPessoa("Todas");
              setSelectedTipoDoc("Todos");
              setSelectedStatusDoc("Todos");
              setSelectedDiasVencer("Qualquer");
            }}
            className="text-[10px] text-sky-400 hover:text-sky-300 font-mono flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800 transition"
          >
            <RefreshCw className="w-3 h-3" />
            Limpar Filtros
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Text Search */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-slate-400 font-mono">Profissional / CPF</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Nome ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-slate-700 font-mono"
              />
            </div>
          </div>

          {/* Unidade */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-slate-400 font-mono">Unidade</label>
            <select
              value={selectedUnidade}
              onChange={(e) => setSelectedUnidade(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-slate-700 font-mono"
            >
              <option value="Todas">Todas Unidades</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>

          {/* Tipo de Colaborador */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-slate-400 font-mono">Tipo Perfil</label>
            <select
              value={selectedTipoPessoa}
              onChange={(e) => setSelectedTipoPessoa(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-slate-700 font-mono"
            >
              <option value="Todas">Motoristas & Ajudantes</option>
              <option value="Motorista">Motoristas</option>
              <option value="Ajudante">Ajudantes</option>
            </select>
          </div>

          {/* Tipo de Documento */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-slate-400 font-mono">Documento</label>
            <select
              value={selectedTipoDoc}
              onChange={(e) => setSelectedTipoDoc(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-slate-700 font-mono"
            >
              <option value="Todos">Todos Documentos</option>
              <option value="CNH">CNH</option>
              <option value="ASO">ASO</option>
              <option value="Integração">Integração</option>
              <option value="Pesquisa GR">Pesquisa GR</option>
              <option value="MOPP">Curso MOPP</option>
              <option value="Toxicológico">Exame Toxicológico</option>
              <option value="Ficha EPI">Ficha EPI</option>
              <option value="Documento Pessoal">Documento Pessoal</option>
              <option value="Comprovante">Comprovante Residência</option>
              <option value="Foto">Foto Perfil</option>
            </select>
          </div>

          {/* Status do Documento */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-slate-400 font-mono">Status Semáforo</label>
            <select
              value={selectedStatusDoc}
              onChange={(e) => setSelectedStatusDoc(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-slate-700 font-mono"
            >
              <option value="Todos">Todos Status</option>
              <option value="Regular">Regular (Verde)</option>
              <option value="Atenção">Atenção (Amarelo)</option>
              <option value="Grave">Grave (Laranja)</option>
              <option value="Vencido">Vencido (Vermelho)</option>
              <option value="Pendente">Pendente (Cinza)</option>
            </select>
          </div>

          {/* Dias para Vencer */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-slate-400 font-mono">Proximidade</label>
            <select
              value={selectedDiasVencer}
              onChange={(e) => setSelectedDiasVencer(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-slate-700 font-mono"
            >
              <option value="Qualquer">Qualquer prazo</option>
              <option value="15">Vencendo &lt;= 15 dias</option>
              <option value="30">Vencendo &lt;= 30 dias</option>
              <option value="90">Vencendo &lt;= 90 dias</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents Grid Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-950/20 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <span className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
            <FolderCheck className="w-4 h-4 text-sky-400" />
            Grid Unificada de Documentação de Colaboradores
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            Mostrando <strong className="text-white">{filteredDocs.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</strong> a <strong className="text-white">{Math.min(currentPage * itemsPerPage, filteredDocs.length)}</strong> de <strong className="text-white">{filteredDocs.length}</strong> documentos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-[9px] uppercase font-bold text-slate-400 font-mono">
                <th className="p-3">Profissional / CPF</th>
                <th className="p-3">Perfil / Unidade</th>
                <th className="p-3">Tipo do Documento</th>
                <th className="p-3">Validade</th>
                <th className="p-3">Dias Restantes</th>
                <th className="p-3">Sinalização</th>
                <th className="p-3 text-right">Ações de Conformidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs text-slate-300">
              {paginatedDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-500 font-mono">
                    Nenhum documento encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                paginatedDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-850/10 transition">
                    {/* Pessoa & CPF */}
                    <td className="p-3">
                      <div className="font-semibold text-white">{doc.pessoaNome}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{doc.pessoaCpf}</div>
                    </td>

                    {/* Perfil & Unidade */}
                    <td className="p-3">
                      <div className="font-mono text-[10px]">{doc.pessoaTipo}</div>
                      <div className="text-[10px] text-sky-400">{currentUnitName(doc.pessoaUnidadeId)}</div>
                    </td>

                    {/* Document Type */}
                    <td className="p-3 font-semibold text-slate-100 flex items-center gap-1.5 mt-2">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      {doc.documentoTipo}
                    </td>

                    {/* Expiry Date */}
                    <td className="p-3 font-mono">
                      {doc.validade ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {new Date(doc.validade).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    {/* Remaining Days */}
                    <td className="p-3 font-mono">
                      {doc.diasRestantes !== undefined ? (
                        doc.diasRestantes <= 0 ? (
                          <span className="text-rose-500 font-bold">Vencido</span>
                        ) : (
                          <span className={`${doc.diasRestantes <= 15 ? "text-orange-400 font-bold" : doc.diasRestantes <= 40 ? "text-amber-400 font-bold" : "text-emerald-400"}`}>
                            {doc.diasRestantes} dias
                          </span>
                        )
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    {/* Visual Status Traffic Light */}
                    <td className="p-3">
                      {getStatusBadge(doc.status)}
                    </td>

                    {/* Action Panel */}
                    <td className="p-3 text-right space-x-1.5">
                      {/* View document */}
                      <button
                          type="button"
                          onClick={() => handleViewFile(doc.arquivoUrl, `${doc.pessoaNome}_${doc.documentoTipo}`)}
                          className="inline-flex items-center justify-center p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-sky-400 transition cursor-pointer"
                          title="Visualizar Documento"
                        >
                          <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Renew document */}
                      <button
                        onClick={() => {
                          setSelectedDocForRenewal(doc);
                          setNovaValidade(doc.validade || "");
                          setNovoArquivoUrl(doc.arquivoUrl || "");
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-sky-600 hover:bg-sky-500 rounded text-[10px] font-bold text-white font-mono uppercase transition"
                        title="Renovar Documento"
                      >
                        Renovar
                      </button>

                      {/* Substituir */}
                      <button
                        onClick={() => {
                          setSelectedDocForRenewal(doc);
                          setNovaValidade(doc.validade || "");
                          setNovoArquivoUrl(""); // clean file to replace
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-bold text-slate-300 font-mono uppercase transition"
                        title="Substituir Arquivo"
                      >
                        Substituir
                      </button>

                      {/* History Log */}
                      <button
                        onClick={() => setSelectedDocForHistory(doc)}
                        className="inline-flex items-center justify-center p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-amber-400 transition"
                        title="Histórico de Alterações"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/20 flex justify-between items-center">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 rounded text-[10px] font-bold text-white font-mono uppercase transition"
            >
              Anterior
            </button>
            <span className="text-[10px] text-slate-400 font-mono">
              Página <strong className="text-white">{currentPage}</strong> de <strong className="text-white">{totalPages}</strong>
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 rounded text-[10px] font-bold text-white font-mono uppercase transition"
            >
              Próxima
            </button>
          </div>
        )}
      </div>

      {/* RENEWAL DIALOG MODAL */}
      {selectedDocForRenewal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderCheck className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Renovação de Documento</h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {selectedDocForRenewal.pessoaNome} • {selectedDocForRenewal.documentoTipo}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDocForRenewal(null)}
                className="p-1 text-slate-400 hover:text-white rounded bg-slate-900 hover:bg-slate-850 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleRenewSubmit} className="p-5 space-y-4">
              {renewalError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded font-mono">
                  {renewalError}
                </div>
              )}

              {/* Expiry date */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400 font-mono block">
                  Nova Validade
                </label>
                <input
                  type="date"
                  value={novaValidade}
                  onChange={(e) => setNovaValidade(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700 font-mono"
                />
                <span className="text-[9px] text-slate-500 font-mono">
                  Deixe em branco para documentos sem vencimento determinado.
                </span>
              </div>

              {/* Drag and Drop zone for files */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400 font-mono block">
                  Arquivo do Documento
                </label>
                
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border border-dashed rounded-xl p-5 text-center transition flex flex-col items-center justify-center gap-2 bg-slate-950/30 cursor-pointer ${dragActive ? "border-sky-500 bg-sky-500/5" : "border-slate-800 hover:border-slate-700"}`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileInputChange}
                    accept="image/*,application/pdf"
                    className="hidden"
                  />
                  <FileText className="w-8 h-8 text-slate-500" />
                  <div className="text-xs text-slate-300 font-sans">
                    Clique para selecionar ou arraste o novo PDF/imagem aqui
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Formatos aceitos: PDF, JPEG, PNG (Max 5MB)
                  </span>
                </div>

                {novoArquivoUrl && (
                  <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 mt-1">
                    <Check className="w-3.5 h-3.5" /> Arquivo carregado com sucesso ({novoArquivoUrl.startsWith("data:") ? "Arquivo Base64" : novoArquivoUrl})
                  </div>
                )}

                <input
                  type="text"
                  placeholder="URL do arquivo (ex: https://bucket.s3/file.pdf)"
                  value={novoArquivoUrl}
                  onChange={(e) => setNovoArquivoUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700 font-mono"
                />
              </div>

              {/* Justification Textarea */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400 font-mono block">
                  Motivo da Renovação / Observações
                </label>
                <textarea
                  placeholder="Justifique a alteração do documento (ex: Renovo anual da CNH, Substituição por documento legível)..."
                  value={observacaoMotivo}
                  onChange={(e) => setObservacaoMotivo(e.target.value)}
                  rows={3}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                />
              </div>

              {/* Actions CTAs */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setSelectedDocForRenewal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-xs font-bold text-slate-300 font-mono uppercase rounded transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRenewal}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-xs font-bold text-white font-mono uppercase rounded transition flex items-center gap-1.5"
                >
                  {isSubmittingRenewal ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Salvar Renovação
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTORICAL LOGS DIALOG MODAL */}
      {selectedDocForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Histórico de Alterações Documentais</h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {selectedDocForHistory.pessoaNome} • {selectedDocForHistory.documentoTipo}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDocForHistory(null)}
                className="p-1 text-slate-400 hover:text-white rounded bg-slate-900 hover:bg-slate-850 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Timeline Area */}
            <div className="p-5 max-h-[450px] overflow-y-auto space-y-4">
              {isLoadingHistory ? (
                <div className="py-20 text-center text-slate-500 font-mono text-xs flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
                  Carregando histórico unificado...
                </div>
              ) : historyLogs.filter(h => h.pessoaId === selectedDocForHistory.pessoaId && h.documentoTipo === selectedDocForHistory.documentoTipo).length === 0 ? (
                <div className="py-20 text-center text-slate-500 font-mono text-xs">
                  Sem registros de alterações arquivados para este documento.
                </div>
              ) : (
                <div className="relative border-l border-slate-800 ml-3 pl-6 space-y-6">
                  {historyLogs
                    .filter(h => h.pessoaId === selectedDocForHistory.pessoaId && h.documentoTipo === selectedDocForHistory.documentoTipo)
                    .sort((a,b) => b.id.localeCompare(a.id))
                    .map((log) => (
                      <div key={log.id} className="relative">
                        {/* Dot indicator */}
                        <span className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-slate-900"></span>

                        {/* Log card */}
                        <div className="bg-slate-950/50 p-4 border border-slate-800 rounded-xl space-y-3">
                          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                            <span className="font-bold text-amber-400">{log.dataTroca}</span>
                            <span>Operador: <strong className="text-slate-200">{log.usuarioResponsavel}</strong></span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-[11px]">
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-bold text-slate-500 font-mono block">Validade Anterior</span>
                              <div className="font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800/50">
                                {log.validadeAnterior ? (
                                  isNaN(new Date(log.validadeAnterior).getTime()) ? log.validadeAnterior : new Date(log.validadeAnterior).toLocaleDateString("pt-BR", { timeZone: "UTC" })
                                ) : "Nenhuma"}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-bold text-sky-400 font-mono block flex items-center gap-1">
                                Nova Validade <ArrowRight className="w-3 h-3" />
                              </span>
                              <div className="font-mono text-sky-400 bg-sky-950/40 px-2 py-1 rounded border border-sky-900/20">
                                {log.novaValidade ? (
                                  isNaN(new Date(log.novaValidade).getTime()) ? log.novaValidade : new Date(log.novaValidade).toLocaleDateString("pt-BR", { timeZone: "UTC" })
                                ) : "Nenhuma"}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-2 text-[11px] pt-1 border-t border-slate-800/40">
                            <div className="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-800/40">
                              <span className="text-[9px] text-slate-500 font-mono">Arquivo Anterior:</span>
                              <span className="text-[10px] text-slate-400 truncate max-w-[200px]" title={log.arquivoAntigo}>
                                {log.arquivoAntigo && log.arquivoAntigo.includes("/") ? log.arquivoAntigo.split("/").pop() : log.arquivoAntigo}
                              </span>
                            </div>

                            <div className="flex justify-between items-center bg-sky-950/20 p-2 rounded border border-sky-900/10">
                              <span className="text-[9px] text-sky-400 font-mono">Arquivo Novo:</span>
                              <button
                                type="button"
                                onClick={() => handleViewFile(log.arquivoNovo, `${log.pessoaNome}_${log.documentoTipo}`)}
                                className="text-[10px] text-sky-400 underline hover:text-sky-300 font-mono truncate max-w-[200px]"
                                title={log.arquivoNovo}
                              >
                                {log.arquivoNovo && log.arquivoNovo.includes("/") ? log.arquivoNovo.split("/").pop() : log.arquivoNovo}
                              </button>
                            </div>
                          </div>

                          <div className="pt-2">
                            <span className="text-[9px] uppercase font-bold text-slate-500 font-mono block mb-1">Motivo / Observação</span>
                            <p className="text-xs text-slate-300 italic">
                              "{log.motivo || "Sem justificativa registrada."}"
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 text-right">
              <button
                onClick={() => setSelectedDocForHistory(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-xs font-bold text-slate-300 font-mono uppercase rounded transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
