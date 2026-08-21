import React, { useState, useMemo } from "react";
import { 
  Plus, 
  Trash, 
  Edit, 
  Search, 
  Check, 
  AlertTriangle, 
  FileSpreadsheet, 
  Phone, 
  MapPin, 
  Grid, 
  List, 
  ArrowUpDown, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Filter,
  Truck,
  FileText,
  User,
  Eye
} from "lucide-react";
import { Motorista, Unidade, Veiculo } from "../types";
import { NotificationModal, ConfirmModal, NotificationType, ConfirmType } from "./NotificationModal";
import { resolveVehicleDriverLink } from "../../shared/vehicleDriverLink";
import { openDocumentOrNotify } from "../lib/documents";

interface MotoristasProps {
  motoristas: Motorista[];
  unidades: Unidade[];
  veiculos: Veiculo[];
  onRefresh: () => void;
  userEmail: string;
}

// CPF validation function
function validarCPF(cpf: string): boolean {
  const clean = cpf.replace(/[^\d]/g, "");
  if (clean.length !== 11) return false;
  // Refuse basic patterns
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let soma = 0;
  let resto;

  for (let i = 1; i <= 9; i++) {
    soma += parseInt(clean.substring(i - 1, i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(clean.substring(9, 10))) return false;

  soma = 0;
  for (let i = 1; i <= 10; i++) {
    soma += parseInt(clean.substring(i - 1, i)) * (12 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(clean.substring(10, 11))) return false;

  return true;
}

export default function MotoristasView({ motoristas, unidades, veiculos, onRefresh, userEmail }: MotoristasProps) {
  const formatarDataBr = (val: string) => val ? val.split("-").reverse().join("/") : "";

  const handleFileRead = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result as string;
        if (base64Url) {
          setter(base64Url);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleViewFile = (url?: string, _filename?: string) => openDocumentOrNotify(url);

  const getBloqueioMotivo = (m: Motorista) => {
    if (m.statusFinal !== "BLOQUEADO") return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isMotorista = m.tipo === "Motorista" || !m.tipo;

    const reasons: string[] = [];

    if (isMotorista && m.cnhVencimento) {
      const d = new Date(m.cnhVencimento);
      if (d < today) reasons.push(`CNH vencida em ${formatarDataBr(m.cnhVencimento)}`);
    }
    if (m.asoVencimento) {
      const d = new Date(m.asoVencimento);
      if (d < today) reasons.push(`ASO vencido em ${formatarDataBr(m.asoVencimento)}`);
    }
    if (isMotorista && m.toxicologicoVencimento) {
      const d = new Date(m.toxicologicoVencimento);
      if (d < today) reasons.push(`Toxicológico vencido em ${formatarDataBr(m.toxicologicoVencimento)}`);
    }
    if (isMotorista && m.moppVencimento) {
      const d = new Date(m.moppVencimento);
      if (d < today) reasons.push(`MOPP vencido em ${formatarDataBr(m.moppVencimento)}`);
    }
    if (m.integracaoVencimento) {
      const d = new Date(m.integracaoVencimento);
      if (d < today) reasons.push(`Integração vencida em ${formatarDataBr(m.integracaoVencimento)}`);
    }
    if (m.pesquisa === "Reprovada") {
      reasons.push("Pesquisa GR Reprovada");
    }

    if (reasons.length === 0) {
      return "Bloqueado por inconformidade cadastral.";
    }
    return reasons.join(", ");
  };

  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState("");

  // Filters State
  const [filterNome, setFilterNome] = useState("");
  const [filterCPF, setFilterCPF] = useState("");
  const [filterUnidade, setFilterUnidade] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterVeiculo, setFilterVeiculo] = useState("");
  const [filterTipo, setFilterTipo] = useState("Todos");

  // Sorting State
  const [sortBy, setSortBy] = useState<"nome" | "unidade" | "status" | "id">("nome");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmType | null>(null);

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [unidadeId, setUnidadeId] = useState("");
  const [cnhVencimento, setCnhVencimento] = useState("2026-12-31");
  const [asoVencimento, setAsoVencimento] = useState("2026-12-31");
  const [integracaoData, setIntegracaoData] = useState("");
  const [integracaoVencimento, setIntegracaoVencimento] = useState("");
  const [tipo, setTipo] = useState<"Motorista" | "Ajudante Fixo" | "Ajudante Geral">("Motorista");
  const [motoristaPreferencialId, setMotoristaPreferencialId] = useState("");
  const [motoristasVinculadosIds, setMotoristasVinculadosIds] = useState<string[]>([]);
  const [driverSearchTerm, setDriverSearchTerm] = useState("");

  // Status checks (Feito / Pendente)
  const [integracao, setIntegracao] = useState<"Feito" | "Pendente">("Feito");
  const [pesquisa, setPesquisa] = useState<"Feito" | "Pendente">("Feito");
  const [aso, setAso] = useState<"Feito" | "Pendente">("Feito");
  const [fichaEpi, setFichaEpi] = useState<"Feito" | "Pendente">("Feito");

  const [cnhFile, setCnhFile] = useState("");
  const [asoFile, setAsoFile] = useState("");
  const [integracaoFile, setIntegracaoFile] = useState("");

  const [errorMess, setErrorMess] = useState("");

  const resetForm = () => {
    setIsEditing(false);
    setEditingId("");
    setNome("");
    setCpf("");
    setTelefone("");
    setUnidadeId(unidades[0]?.id || "");
    setCnhVencimento("2026-12-31");
    setAsoVencimento("2026-12-31");
    setIntegracaoData("");
    setIntegracaoVencimento("");
    setIntegracao("Feito");
    setPesquisa("Feito");
    setAso("Feito");
    setFichaEpi("Feito");
    setCnhFile("");
    setAsoFile("");
    setIntegracaoFile("");
    setTipo("Motorista");
    setMotoristaPreferencialId("");
    setMotoristasVinculadosIds([]);
    setErrorMess("");
  };

  const handleEditInit = (m: Motorista) => {
    setIsEditing(true);
    setEditingId(m.id);
    setNome(m.nome);
    setCpf(m.cpf);
    setTelefone(m.telefone);
    setUnidadeId(m.unidadeId);
    setCnhVencimento(m.cnhVencimento);
    setAsoVencimento(m.asoVencimento);
    setIntegracaoData(m.integracaoData || "");
    setIntegracaoVencimento(m.integracaoVencimento || "");
    setIntegracao(m.integracao);
    setPesquisa(m.pesquisa);
    setAso(m.aso);
    setFichaEpi(m.fichaEpi);
    setCnhFile(m.cnhDocumentoUrl || "");
    setAsoFile(m.asoDocumentoUrl || "");
    setIntegracaoFile(m.integracaoDocumentoUrl || "");
    setTipo(m.tipo || "Motorista");
    setMotoristaPreferencialId(m.motoristaPreferencialId || "");
    setMotoristasVinculadosIds(m.motoristasVinculadosIds || (m.motoristaPreferencialId ? [m.motoristaPreferencialId] : []));
    setErrorMess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMess("");

    if (!nome.trim() || !cpf.trim()) {
      setNotification({
        type: "error",
        message: "Não foi possível cadastrar o motorista. Motivo: Nome e CPF são campos obrigatórios."
      });
      return;
    }

    // CPF validation
    if (!validarCPF(cpf)) {
      setNotification({
        type: "error",
        message: "Não foi possível cadastrar o motorista. Motivo: CPF informado é inválido. Forneça um CPF real e válido."
      });
      return;
    }

    const payload = {
      nome: nome.trim(),
      cpf: formatCPF(cpf),
      telefone: telefone.trim(),
      unidadeId,
      cnhVencimento,
      asoVencimento,
      integracao,
      pesquisa,
      aso,
      fichaEpi,
      cnhDocumentoUrl: cnhFile || undefined,
      asoDocumentoUrl: asoFile || undefined,
      integracaoData: integracaoData || undefined,
      integracaoVencimento: integracaoVencimento || undefined,
      integracaoDocumentoUrl: integracaoFile || undefined,
      tipo,
      motoristaPreferencialId: (tipo === "Ajudante Fixo" || tipo === "Ajudante Geral") ? (motoristasVinculadosIds[0] || undefined) : undefined,
      motoristasVinculadosIds: (tipo === "Ajudante Fixo" || tipo === "Ajudante Geral") ? motoristasVinculadosIds : [],
    };

    try {
      const url = editingId ? `/api/motoristas/${editingId}` : "/api/motoristas";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setNotification({
          type: "success",
          message: editingId ? "Alterações salvas com sucesso." : "Registro salvo com sucesso."
        });
        resetForm();
        onRefresh();
      } else {
        let d: any = {};
        try {
          d = await res.json();
        } catch (jsonErr) {
          d = { error: `Erro de comunicação do servidor (Status ${res.status}: ${res.statusText})` };
        }
        console.error("[BROWSER ERROR LOG] Erro na gravação do motorista:", d);
        
        let detailedMsg = `Não foi possível ${editingId ? "editar" : "cadastrar"} o motorista.`;
        if (d.details) {
          detailedMsg += `\n\nDetalhes do Erro do Banco:\n• Tabela: ${d.details.tableName}\n• Operação: ${d.details.operation}\n• Campo: ${d.details.errorField}\n• Mensagem: ${d.details.dbMessage}`;
        } else {
          detailedMsg += `\nMotivo: ${d.error || d.message || "Operação rejeitada do servidor."}`;
        }

        setNotification({
          type: "error",
          message: detailedMsg
        });
      }
    } catch (err) {
      console.error("[BROWSER ERROR LOG] Falha imprevista na operação do motorista:", err);
      setNotification({
        type: "error",
        message: `Não foi possível realizar a operação. Causa real: ${err instanceof Error ? err.message : String(err)}`
      });
    }
  };

  const formatCPF = (v: string) => {
    const d = v.replace(/[^\d]/g, "");
    if (d.length === 11) {
      return `${d.substring(0,3)}.${d.substring(3,6)}.${d.substring(6,9)}-${d.substring(9,11)}`;
    }
    return v;
  };

  const handleDelete = (id: string) => {
    setConfirmDialog({
      message: "Confirmar a exclusão permanente do cadastro deste motorista?",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/motoristas/${id}`, {
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
            let d: any = {};
            try {
              d = await res.json();
            } catch (jsonErr) {
              d = { error: `Erro ao excluir motorista (Status ${res.status})` };
            }
            console.error("[BROWSER ERROR LOG] Erro ao excluir de motorista:", d);
            
            let detailedMsg = `Não foi possível excluir o motorista.`;
            if (d.details) {
              detailedMsg += `\n\nDetalhes do Erro do Banco:\n• Tabela: ${d.details.tableName}\n• Operação: ${d.details.operation}\n• Campo: ${d.details.errorField}\n• Mensagem: ${d.details.dbMessage}`;
            } else {
              detailedMsg += `\nMotivo: ${d.error || d.message || "Ação rejeitada pelo banco."}`;
            }

            setNotification({
              type: "error",
              message: detailedMsg
            });
          }
        } catch (err) {
          console.error("[BROWSER ERROR LOG] Falha de conexão ao excluir motorista:", err);
          setNotification({
            type: "error",
            message: `Não foi possível excluir. Causa real: ${err instanceof Error ? err.message : String(err)}`
          });
        }
      }
    });
  };

  // Compliance calculations for general list (all loaded motoristas)
  const totalCount = motoristas.length;
  const aptasCount = motoristas.filter(m => m.statusFinal === "LIBERADO" && m.statusConformidade === "APTO").length;
  const atencaoCount = motoristas.filter(m => (m.statusFinal === "PENDENTE" || m.statusConformidade === "ATENÇÃO") && m.statusFinal !== "BLOQUEADO").length;
  const criticasCount = motoristas.filter(m => m.statusConformidade === "CRÍTICO" && m.statusFinal !== "BLOQUEADO").length;
  const bloqueadasCount = motoristas.filter(m => m.statusConformidade === "BLOQUEADO" || m.statusFinal === "BLOQUEADO").length;
  const compliancePercent = totalCount > 0 ? Math.round((aptasCount / totalCount) * 100) : 100;

  const linkedVehicleByDriverId = useMemo(() => {
    const result = new Map<string, Veiculo>();
    veiculos.forEach(vehicle => {
      const link = resolveVehicleDriverLink(vehicle, motoristas);
      if (link.status === "linked") result.set(link.driverId, vehicle);
    });
    return result;
  }, [veiculos, motoristas]);

  // Filter & Sort Logic
  const processedList = useMemo(() => {
    let list = [...motoristas];

    // Filter by Name
    if (filterNome.trim() !== "") {
      const q = filterNome.toLowerCase();
      list = list.filter(m => m.nome.toLowerCase().includes(q));
    }

    // Filter by CPF
    if (filterCPF.trim() !== "") {
      const q = filterCPF.replace(/\D/g, "");
      list = list.filter(m => m.cpf.replace(/\D/g, "").includes(q));
    }

    // Filter by Unidade
    if (filterUnidade !== "Todos") {
      list = list.filter(m => m.unidadeId === filterUnidade);
    }

    // Filter by Status
    if (filterStatus !== "Todos") {
      list = list.filter(m => m.statusFinal === filterStatus);
    }

    // Filter by Tipo
    if (filterTipo !== "Todos") {
      list = list.filter(m => (m.tipo || "Motorista") === filterTipo);
    }

    // Filter by Veículo (Placa or Modelo)
    if (filterVeiculo.trim() !== "") {
      const q = filterVeiculo.toLowerCase();
      list = list.filter(m => {
        const matchingVeic = linkedVehicleByDriverId.get(m.id);
        if (!matchingVeic) return false;
        return (
          matchingVeic.placa.toLowerCase().includes(q) ||
          matchingVeic.modelo.toLowerCase().includes(q)
        );
      });
    }

    // Sort Logic
    list.sort((a, b) => {
      let fieldA: any = "";
      let fieldB: any = "";

      if (sortBy === "nome") {
        fieldA = a.nome.toLowerCase();
        fieldB = b.nome.toLowerCase();
      } else if (sortBy === "unidade") {
        const uniA = unidades.find(u => u.id === a.unidadeId)?.nome || "";
        const uniB = unidades.find(u => u.id === b.unidadeId)?.nome || "";
        fieldA = uniA.toLowerCase();
        fieldB = uniB.toLowerCase();
      } else if (sortBy === "status") {
        fieldA = a.statusFinal;
        fieldB = b.statusFinal;
      } else if (sortBy === "id") {
        fieldA = a.id;
        fieldB = b.id;
      }

      if (fieldA < fieldB) return sortOrder === "asc" ? -1 : 1;
      if (fieldA > fieldB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [motoristas, linkedVehicleByDriverId, unidades, filterNome, filterCPF, filterUnidade, filterStatus, filterVeiculo, filterTipo, sortBy, sortOrder]);

  const toggleSort = (field: "nome" | "unidade" | "status" | "id") => {
    if (sortBy === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex justify-between items-center bg-slate-900/30 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white">Gestão de Pessoas (Cadastro Unificado)</h2>
          <p className="text-xs text-slate-400 font-mono">Controle unificado de conformidades, exames médicos e licenças de motoristas e ajudantes.</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => {
              resetForm();
              setIsEditing(true);
            }}
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Pessoa
          </button>
        )}
      </div>

      {/* Compliance Management Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div id="card-total-motoristas" className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold font-mono tracking-wider uppercase">Total de Pessoas</span>
          <span className="text-2xl font-extrabold text-white font-mono mt-1">{totalCount}</span>
        </div>

        <div id="card-motoristas-aptas" className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-900/35 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-emerald-400 font-bold font-mono tracking-wider uppercase flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Aptas
            </span>
            <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 px-1 py-0.5 rounded" title="Índice de conformidade">{compliancePercent}%</span>
          </div>
          <span className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">{aptasCount}</span>
        </div>

        <div id="card-motoristas-atencao" className="bg-amber-950/20 p-4 rounded-xl border border-amber-900/30 flex flex-col justify-between">
          <span className="text-[10px] text-amber-500 font-bold font-mono tracking-wider uppercase flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" /> Atenção
          </span>
          <span className="text-2xl font-extrabold text-amber-500 font-mono mt-1">{atencaoCount}</span>
        </div>

        <div id="card-motoristas-criticas" className="bg-orange-950/20 p-4 rounded-xl border border-orange-900/30 flex flex-col justify-between">
          <span className="text-[10px] text-orange-550 font-bold font-mono tracking-wider uppercase flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-orange-500" /> Críticas
          </span>
          <span className="text-2xl font-extrabold text-orange-500 font-mono mt-1">{criticasCount}</span>
        </div>

        <div id="card-motoristas-bloqueadas" className="bg-rose-950/20 p-4 rounded-xl border border-rose-905/30 flex flex-col justify-between">
          <span className="text-[10px] text-rose-500 font-bold font-mono tracking-wider uppercase flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> Bloqueadas
          </span>
          <span className="text-2xl font-extrabold text-rose-500 font-mono mt-1">{bloqueadasCount}</span>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">Filtros Inteligentes de Pesquisa</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-mono">Visualização:</span>
            <div className="bg-slate-950 p-0.5 rounded border border-slate-800 flex gap-0.5">
              <button
                onClick={() => setViewMode("cards")}
                className={`p-1 rounded transition ${viewMode === "cards" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-white"}`}
                title="Visualização em Cards"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1 rounded transition ${viewMode === "list" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-white"}`}
                title="Visualização em Lista"
              >
                <NavListIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          <div className="space-y-1">
            <label className="text-slate-400 block font-mono text-[10px]">Nome do Motorista</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Buscar por nome..."
                value={filterNome}
                onChange={(e) => setFilterNome(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded pl-8 pr-2.5 py-1 text-xs text-white focus:outline-none focus:border-slate-700 font-sans"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 block font-mono text-[10px]">CPF do Motorista</label>
            <input
              type="text"
              placeholder="Buscar por CPF..."
              value={filterCPF}
              onChange={(e) => setFilterCPF(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-slate-700 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 block font-mono text-[10px]">Unidade / Filial</label>
            <select
              value={filterUnidade}
              onChange={(e) => setFilterUnidade(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-slate-700"
            >
              <option value="Todos">Todas Unidades</option>
              {unidades.map(u => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 block font-mono text-[10px]">Status Geral</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-slate-700"
            >
              <option value="Todos">Todos Status</option>
              <option value="LIBERADO">LIBERADO</option>
              <option value="PENDENTE">PENDENTE</option>
              <option value="BLOQUEADO">BLOQUEADO</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 block font-mono text-[10px]">Veículo (Placa/Modelo)</label>
            <div className="relative">
              <Truck className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Placa ou modelo..."
                value={filterVeiculo}
                onChange={(e) => setFilterVeiculo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded pl-8 pr-2.5 py-1 text-xs text-white focus:outline-none focus:border-slate-700"
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-1 border-t border-slate-800/40 text-[10px] font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span>Resultados: <b className="text-sky-400">{processedList.length}</b> de <b>{totalCount}</b></span>
            {(filterNome || filterCPF || filterUnidade !== "Todos" || filterStatus !== "Todos" || filterVeiculo || filterTipo !== "Todos") && (
              <button 
                onClick={() => {
                  setFilterNome("");
                  setFilterCPF("");
                  setFilterUnidade("Todos");
                  setFilterStatus("Todos");
                  setFilterVeiculo("");
                  setFilterTipo("Todos");
                }}
                className="text-amber-500 hover:underline hover:text-amber-400"
              >
                [Limpar filtros]
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800/80">
            <span>Ordenado por:</span>
            <button onClick={() => toggleSort("nome")} className={`hover:text-white underline ${sortBy === "nome" ? "text-sky-400 font-bold" : ""}`}>Nome</button>
            <span>•</span>
            <button onClick={() => toggleSort("unidade")} className={`hover:text-white underline ${sortBy === "unidade" ? "text-sky-400 font-bold" : ""}`}>Unidade</button>
            <span>•</span>
            <button onClick={() => toggleSort("status")} className={`hover:text-white underline ${sortBy === "status" ? "text-sky-400 font-bold" : ""}`}>Status</button>
          </div>
        </div>

        {/* Quick Function Type Tabs */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/20">
          <span className="text-[10px] text-slate-500 uppercase font-mono font-bold self-center mr-1">Filtro por Tipo:</span>
          <button
            onClick={() => setFilterTipo("Todos")}
            className={`px-3 py-1 rounded text-[11px] font-bold font-mono transition ${filterTipo === "Todos" ? "bg-sky-600 text-white" : "bg-slate-950 text-slate-450 hover:text-white border border-slate-850"}`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterTipo("Motorista")}
            className={`px-3 py-1 rounded text-[11px] font-bold font-mono transition ${filterTipo === "Motorista" ? "bg-sky-600 text-white" : "bg-slate-950 text-slate-450 hover:text-white border border-slate-850"}`}
          >
            Motoristas
          </button>
          <button
            onClick={() => setFilterTipo("Ajudante Fixo")}
            className={`px-3 py-1 rounded text-[11px] font-bold font-mono transition ${filterTipo === "Ajudante Fixo" ? "bg-sky-600 text-white" : "bg-slate-950 text-slate-450 hover:text-white border border-slate-850"}`}
          >
            Ajudantes Fixos
          </button>
          <button
            onClick={() => setFilterTipo("Ajudante Geral")}
            className={`px-3 py-1 rounded text-[11px] font-bold font-mono transition ${filterTipo === "Ajudante Geral" ? "bg-sky-600 text-white" : "bg-slate-950 text-slate-450 hover:text-white border border-slate-850"}`}
          >
            Ajudantes Gerais
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Form Container */}
        {isEditing && (
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 h-fit space-y-4 lg:col-span-1">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-sm font-semibold text-white tracking-tight">
                {editingId ? "Editar Cadastro" : "Adicionar Pessoa"}
              </h3>
              <button onClick={() => resetForm()} className="text-xs text-slate-400 hover:text-white font-mono">
                Cancelar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 font-sans text-xs">
              {errorMess && (
                <div className="p-3 bg-red-500/10 border border-red-500/15 rounded text-red-500 font-mono text-[10px]">
                  {errorMess}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Tipo do Profissional</label>
                <select
                  value={tipo}
                  onChange={(e) => {
                    setTipo(e.target.value as any);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white focus:border-slate-700 focus:outline-none"
                >
                  <option value="Motorista">Motorista</option>
                  <option value="Ajudante Fixo">Ajudante Fixo</option>
                  <option value="Ajudante Geral">Ajudante Geral</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Carlos Alberto"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:border-slate-700 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">CPF do Profissional</label>
                  <input
                    type="text"
                    required
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="Somente dígitos"
                    maxLength={14}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:border-slate-700 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Telefone Contato</label>
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="Ex: (62) 99999-1234"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:border-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono">Unidade Pertencente</label>
                  <select
                    value={unidadeId}
                    onChange={(e) => setUnidadeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white focus:border-slate-700 focus:outline-none"
                  >
                    {unidades.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome}
                      </option>
                    ))}
                  </select>
                </div>
                {tipo === "Motorista" ? (
                  <div className="space-y-1">
                    <label className="text-slate-400 block font-mono">Vencimento CNH</label>
                    <input
                      type="date"
                      value={cnhVencimento}
                      onChange={(e) => setCnhVencimento(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white focus:border-slate-700 focus:outline-none font-mono"
                    />
                  </div>
                ) : (
                  (tipo === "Ajudante Fixo" || tipo === "Ajudante Geral") && (
                    <div className="col-span-2 space-y-2 border border-slate-850 bg-slate-900/40 p-3 rounded-lg mt-1">
                      <label className="text-slate-300 block font-mono text-xs uppercase tracking-wider font-semibold">
                        Motoristas Vinculados (Múltipla Escolha)
                      </label>
                      <p className="text-[11px] text-slate-500 font-sans">
                        Selecione um ou mais motoristas parceiros deste ajudante. Isto será usado para sugestão automática na formação de equipes.
                      </p>
                      
                      {/* Simple search box for motoristas */}
                      <input
                        type="text"
                        placeholder="Filtrar motoristas por nome..."
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white text-xs font-sans placeholder-slate-600 focus:outline-none focus:border-slate-700"
                        value={driverSearchTerm}
                        onChange={(e) => setDriverSearchTerm(e.target.value)}
                      />

                      <div className="max-h-36 overflow-y-auto border border-slate-800 bg-slate-950 p-2 space-y-1.5 rounded select-none">
                        {motoristas
                          .filter((m) => (m.tipo === "Motorista" || !m.tipo) && m.nome.toLowerCase().includes(driverSearchTerm.toLowerCase()))
                          .map((m) => {
                            const isChecked = motoristasVinculadosIds.includes(m.id);
                            return (
                              <label key={m.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-900 cursor-pointer text-xs text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setMotoristasVinculadosIds(motoristasVinculadosIds.filter(id => id !== m.id));
                                    } else {
                                      setMotoristasVinculadosIds([...motoristasVinculadosIds, m.id]);
                                    }
                                  }}
                                  className="rounded border-slate-800 bg-slate-900 text-sky-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                                />
                                <span className="font-medium text-slate-200">{m.nome}</span>
                                <span className="text-[9px] font-mono text-slate-550 bg-slate-900 px-1 rounded">{m.cpf}</span>
                              </label>
                            );
                          })}
                        {motoristas.filter((m) => (m.tipo === "Motorista" || !m.tipo) && m.nome.toLowerCase().includes(driverSearchTerm.toLowerCase())).length === 0 && (
                          <div className="text-[11px] text-slate-500 font-sans p-2 text-center">Nenhum motorista encontrado.</div>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Vencimento Exame ASO</label>
                <input
                  type="date"
                  value={asoVencimento}
                  onChange={(e) => setAsoVencimento(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white focus:border-slate-700 focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono text-xs">Data da Integração</label>
                  <input
                    type="date"
                    value={integracaoData}
                    onChange={(e) => setIntegracaoData(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white focus:border-slate-700 focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block font-mono text-xs">Vencimento Integração</label>
                  <input
                    type="date"
                    value={integracaoVencimento}
                    onChange={(e) => setIntegracaoVencimento(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white focus:border-slate-700 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Checklists status */}
              <div className="border-t border-slate-800 pt-2 space-y-2">
                <span className="text-slate-400 block font-mono font-bold text-[11px] mb-1">Módulos de Segurança Requeridos:</span>
                
                <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                  <div className="space-y-1">
                    <label className="text-slate-500 block">Integração Integra</label>
                    <select
                      value={integracao}
                      onChange={(e) => setIntegracao(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-white text-[11px] focus:outline-none"
                    >
                      <option value="Feito">FEITO</option>
                      <option value="Pendente">PENDENTE</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 block">Pesquisa / B.G. check</label>
                    <select
                      value={pesquisa}
                      onChange={(e) => setPesquisa(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-white text-[11px] focus:outline-none"
                    >
                      <option value="Feito">FEITO</option>
                      <option value="Pendente">PENDENTE</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 block">Exame ASO em Dia</label>
                    <select
                      value={aso}
                      onChange={(e) => setAso(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-white text-[11px] focus:outline-none"
                    >
                      <option value="Feito">FEITO</option>
                      <option value="Pendente">PENDENTE</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 block">Assinatura Ficha EPI</label>
                    <select
                      value={fichaEpi}
                      onChange={(e) => setFichaEpi(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-white text-[11px] focus:outline-none"
                    >
                      <option value="Feito">FEITO</option>
                      <option value="Pendente">PENDENTE</option>
                    </select>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-950 rounded text-[10px] text-slate-400 font-mono italic">
                  * O status final será avaliado de forma automatizada pelo motor de conformidade em função dos 4 eixos anteriores.
                </div>
              </div>

              {/* Uploads */}
              <div className="border-t border-slate-800 pt-2 space-y-1 text-[10px] font-mono">
                <label className="text-slate-400 block font-mono text-xs mb-1">Simular Envio de Documentos PDF/FOTO</label>
                {tipo === "Motorista" && (
                  <div>
                    <span className="text-slate-500 block">Cópia da CNH Digital</span>
                    <input 
                      type="file" 
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileRead(e, setCnhFile)} 
                      className="w-full text-slate-400 px-1 cursor-pointer" 
                    />
                    {cnhFile && (
                      <span className="text-[9px] text-emerald-400 block mt-0.5">
                        CNH carregada ({cnhFile.startsWith("data:") ? "Arquivo Base64" : cnhFile})
                      </span>
                    )}
                  </div>
                )}
                <div className="pt-1">
                  <span className="text-slate-500 block">Comprovante de Laudo ASO</span>
                  <input 
                    type="file" 
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileRead(e, setAsoFile)} 
                    className="w-full text-slate-400 px-1 cursor-pointer" 
                  />
                  {asoFile && (
                    <span className="text-[9px] text-emerald-400 block mt-0.5">
                      ASO carregado ({asoFile.startsWith("data:") ? "Arquivo Base64" : asoFile})
                    </span>
                  )}
                </div>
                <div className="pt-1">
                  <span className="text-slate-500 block">Comprovante de Integração</span>
                  <input 
                    type="file" 
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileRead(e, setIntegracaoFile)} 
                    className="w-full text-slate-400 px-1 cursor-pointer" 
                  />
                  {integracaoFile && (
                    <span className="text-[9px] text-emerald-400 block mt-0.5">
                      Integração carregada ({integracaoFile.startsWith("data:") ? "Arquivo Base64" : integracaoFile})
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-sky-600 hover:bg-sky-500 text-white font-medium py-2 rounded transition font-sans"
                >
                  {editingId ? "Salvar Modificações" : "Gravar Cadastro"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Primary Screen Area */}
        <div className={`${isEditing ? "lg:col-span-2" : "col-span-full"} space-y-4`}>
          
          {/* CARDS MODE */}
          {viewMode === "cards" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedList.map((m) => {
                const baseName = unidades.find((u) => u.id === m.unidadeId)?.nome || "Não alocado";
                
                // Find driver's current vehicle
                const driverVeic = linkedVehicleByDriverId.get(m.id);
                const veiculoStr = driverVeic ? `${driverVeic.placa} (${driverVeic.modelo})` : "Nenhum";

                return (
                  <div
                    key={m.id}
                    className={`bg-slate-900 p-4 rounded-xl border transition flex flex-col justify-between ${
                      m.statusFinal === "BLOQUEADO" 
                        ? "border-rose-900/40 hover:border-rose-900 bg-rose-950/5" 
                        : m.statusFinal === "PENDENTE"
                        ? "border-amber-900/40 hover:border-amber-900 bg-amber-950/5"
                        : "border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-white text-sm font-semibold tracking-tight uppercase">{m.nome}</h4>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono tracking-wider uppercase ${
                              (m.tipo || "Motorista") === "Motorista"
                                ? "bg-sky-500/10 text-sky-400 border border-sky-500/10"
                                : (m.tipo || "Motorista") === "Ajudante Fixo"
                                ? "bg-teal-500/10 text-teal-400 border border-teal-500/10"
                                : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/10"
                            }`}>
                              {m.tipo || "Motorista"}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono mt-1">CPF: {m.cpf}</p>
                          <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3 text-slate-500" /> base {baseName}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                            m.statusFinal === "LIBERADO" 
                              ? "bg-emerald-500/10 text-emerald-400" 
                              : m.statusFinal === "PENDENTE"
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-rose-500/10 text-rose-400"
                          }`}>
                            {m.statusFinal === "LIBERADO" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>}
                            {m.statusFinal === "PENDENTE" && <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>}
                            {m.statusFinal === "BLOQUEADO" && <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>}
                            {m.statusFinal}
                          </span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3" /> {m.telefone}
                          </span>
                        </div>
                      </div>

                      {/* Associated Role Details Row */}
                      {(m.tipo || "Motorista") === "Motorista" ? (
                        <div className="mt-2.5 px-2.5 py-1.5 bg-slate-950/40 rounded border border-slate-800/40 text-[10px] font-mono text-slate-400 flex items-center gap-2">
                          <Truck className="w-3.5 h-3.5 text-slate-500" />
                          <span>Veículo Atual: <b className="text-slate-200">{veiculoStr}</b></span>
                        </div>
                      ) : (m.tipo || "Motorista") === "Ajudante Fixo" || (m.tipo || "Motorista") === "Ajudante Geral" ? (
                        <div className="mt-2.5 px-2.5 py-1.5 bg-teal-950/10 rounded border border-teal-900/20 text-[10px] font-mono text-slate-400 flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-teal-500" />
                            <span>Vínculos com Motoristas:</span>
                          </div>
                          <div className="pl-5 flex flex-wrap gap-1 mt-0.5">
                            {(() => {
                              const ids = m.motoristasVinculadosIds || (m.motoristaPreferencialId ? [m.motoristaPreferencialId] : []);
                              if (ids.length === 0) return <span className="text-slate-500 italic">Nenhum vinculado</span>;
                              return ids.map(id => {
                                const mot = motoristas.find(x => x.id === id);
                                if (!mot) return null;
                                return (
                                  <span key={id} className="bg-teal-950/40 text-teal-300 border border-teal-800/30 px-1.5 py-0.5 rounded text-[9px]">
                                    {mot.nome}
                                  </span>
                                );
                              }).filter(Boolean);
                            })()}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2.5 px-2.5 py-1.5 bg-indigo-950/10 rounded border border-indigo-900/20 text-[10px] font-mono text-slate-400 flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-indigo-550" />
                          <span>Função: <b className="text-indigo-300">Ajudante Geral (Sem vínculo fixo)</b></span>
                        </div>
                      )}

                      {m.statusFinal === "BLOQUEADO" && (
                        <div className="mt-2.5 px-2.5 py-1.5 bg-rose-950/20 rounded border border-rose-900/40 text-[10px] font-mono text-rose-400 flex flex-col gap-0.5">
                          <span className="font-bold text-rose-300 flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-rose-400" /> BLOQUEADO:</span>
                          <span>{getBloqueioMotivo(m)}</span>
                        </div>
                      )}

                      {/* Document and Compliance checklist banner */}
                      <div className="mt-3 p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 space-y-1.5 font-mono text-[10px]">
                        {((m.tipo || "Motorista") === "Motorista") && (
                          <div className="flex justify-between items-center text-slate-400">
                            <span>Vencimento CNH:</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-200">{m.cnhVencimento}</span>
                              <button
                                  type="button"
                                  onClick={() => handleViewFile(m.cnhDocumentoUrl, `${m.nome}_CNH`)}
                                  className="p-0.5 bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-sky-300 rounded border border-slate-800 transition cursor-pointer"
                                  title="Visualizar CNH"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-slate-400">
                          <span>Vencimento ASO:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-200">{formatarDataBr(m.asoVencimento)}</span>
                            <button
                                type="button"
                                onClick={() => handleViewFile(m.asoDocumentoUrl, `${m.nome}_ASO`)}
                                className="p-0.5 bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-sky-300 rounded border border-slate-800 transition cursor-pointer"
                                title="Visualizar ASO"
                              >
                                <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-slate-400">
                          <span>Vencimento Integração:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-200">{m.integracaoVencimento ? formatarDataBr(m.integracaoVencimento) : "Nenhum"}</span>
                            <button
                                type="button"
                                onClick={() => handleViewFile(m.integracaoDocumentoUrl, `${m.nome}_Integracao`)}
                                className="p-0.5 bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-sky-300 rounded border border-slate-800 transition cursor-pointer"
                                title="Visualizar Integração"
                              >
                                <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-900 text-center">
                          <div className="rounded py-1 bg-slate-900">
                            <span className="block text-[8px] text-slate-500">INTEG</span>
                            <span className="font-bold flex items-center justify-center gap-0.5 text-[9px]">
                              {m.integracao === "Feito" ? <span className="text-emerald-400">SIM</span> : <span className="text-amber-500">NÃO</span>}
                            </span>
                          </div>
                          <div className="rounded py-1 bg-slate-900">
                            <span className="block text-[8px] text-slate-500">PESQ</span>
                            <span className="font-bold flex items-center justify-center gap-0.5 text-[9px]">
                              {m.pesquisa === "Feito" ? <span className="text-emerald-400">SIM</span> : <span className="text-amber-500">NÃO</span>}
                            </span>
                          </div>
                          <div className="rounded py-1 bg-slate-900">
                            <span className="block text-[8px] text-slate-500">ASO</span>
                            <span className="font-bold flex items-center justify-center gap-0.5 text-[9px]">
                              {m.aso === "Feito" ? <span className="text-emerald-400">SIM</span> : <span className="text-rose-500">NÃO</span>}
                            </span>
                          </div>
                          <div className="rounded py-1 bg-slate-900">
                            <span className="block text-[8px] text-slate-500">EPI</span>
                            <span className="font-bold flex items-center justify-center gap-0.5 text-[9px]">
                              {m.fichaEpi === "Feito" ? <span className="text-emerald-400">SIM</span> : <span className="text-amber-500">NÃO</span>}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action items */}
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex justify-end gap-2">
                      <button
                        onClick={() => handleEditInit(m)}
                        className="p-1 px-3 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white rounded text-[10px] font-sans font-medium flex items-center gap-1.5 transition"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Alterar Cadastro
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-1 px-2.5 bg-rose-950/15 text-rose-500 hover:bg-rose-500 hover:text-white rounded text-[10px] font-sans font-medium transition flex items-center gap-1 transition"
                      >
                        <Trash className="w-3.5 h-3.5" />
                        Excluir
                      </button>
                    </div>

                  </div>
                );
              })}

              {processedList.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500 font-mono text-xs bg-slate-900 border border-slate-800 rounded-xl">
                  Nenhum motorista corresponde aos critérios de pesquisa informados.
                </div>
              )}
            </div>
          ) : (
            
            /* LIST TABLE MODE */
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 font-mono text-slate-400 text-[10px]">
                      <th className="p-3">Nome</th>
                      <th className="p-3">Tipo / Função</th>
                      <th className="p-3">CPF</th>
                      <th className="p-3">Veículo / Vínculo</th>
                      <th className="p-3">Unidade</th>
                      <th className="p-3 text-center">Integração</th>
                      <th className="p-3 text-center">Pesquisa</th>
                      <th className="p-3 text-center">ASO</th>
                      <th className="p-3 text-center">Ficha EPI</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {processedList.map((m) => {
                      const baseName = unidades.find((u) => u.id === m.unidadeId)?.nome || "Não alocado";
                      const driverVeic = linkedVehicleByDriverId.get(m.id);
                      const veiculoStr = driverVeic ? `${driverVeic.placa}` : "Nenhum";
                      const t = m.tipo || "Motorista";

                      return (
                        <tr key={m.id} className="hover:bg-slate-950/45 transition">
                          <td className="p-3 font-semibold text-white uppercase">{m.nome}</td>
                          <td className="p-3">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono tracking-wider uppercase ${
                              t === "Motorista"
                                ? "bg-sky-500/10 text-sky-400"
                                : t === "Ajudante Fixo"
                                ? "bg-teal-500/10 text-teal-400"
                                : "bg-indigo-500/10 text-indigo-400"
                            }`}>
                              {t}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-300">{m.cpf}</td>
                          <td className="p-3">
                            {t === "Motorista" ? (
                              <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-200">
                                <Truck className="w-3 h-3 text-slate-500" />
                                {veiculoStr}
                              </span>
                            ) : (t === "Ajudante Fixo" || t === "Ajudante Geral") ? (
                              <div className="flex flex-col gap-0.5 max-w-[200px] truncate">
                                <span className="flex items-center gap-1 font-mono text-[10px] text-teal-400">
                                  <User className="w-3 h-3 text-teal-550" /> Vínculos:
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {(() => {
                                    const ids = m.motoristasVinculadosIds || (m.motoristaPreferencialId ? [m.motoristaPreferencialId] : []);
                                    if (ids.length === 0) return <span className="text-slate-500 text-[10px] italic">Nenhum</span>;
                                    return ids.map(id => {
                                      const mot = motoristas.find(x => x.id === id);
                                      if (!mot) return null;
                                      return (
                                        <span key={id} className="bg-teal-950/30 text-teal-300 border border-teal-900/40 px-1 rounded text-[9px]" title={mot.nome}>
                                          {mot.nome.split(" ")[0]}
                                        </span>
                                      );
                                    }).filter(Boolean);
                                  })()}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-500 font-mono text-[10px]">Geral / Avulso</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-300 text-[11px] flex items-center gap-1 h-12">
                            <MapPin className="w-3 h-3 text-slate-550" />
                            {baseName}
                          </td>
                          <td className="p-3 text-center">
                            {m.integracao === "Feito" ? (
                              <div className="flex items-center justify-center gap-1">
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[9px]">Feito</span>
                                <button
                                    onClick={() => handleViewFile(m.integracaoDocumentoUrl, `${m.nome}_Integracao`)}
                                    className="p-0.5 text-sky-400 hover:text-sky-300 hover:bg-slate-800 rounded transition cursor-pointer"
                                    title="Visualizar Comprovante de Integração"
                                  >
                                    <Eye className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-mono text-[9px]">Pendente</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {m.pesquisa === "Feito" ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[9px]">Feito</span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-mono text-[9px]">Pendente</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {m.aso === "Feito" ? (
                              <div className="flex items-center justify-center gap-1">
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[9px]">Feito</span>
                                <button
                                    onClick={() => handleViewFile(m.asoDocumentoUrl, `${m.nome}_ASO`)}
                                    className="p-0.5 text-sky-400 hover:text-sky-300 hover:bg-slate-800 rounded transition cursor-pointer"
                                    title="Visualizar Comprovante ASO"
                                  >
                                    <Eye className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-mono text-[9px]">Pendente</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {m.fichaEpi === "Feito" ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[9px]">Feito</span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-mono text-[9px]">Pendente</span>
                            )}
                          </td>
                          <td className="p-3 text-center align-middle">
                            <div className="flex flex-col items-center">
                              <span 
                                title={m.statusFinal === "BLOQUEADO" ? getBloqueioMotivo(m) || undefined : undefined}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold inline-block cursor-help ${
                                  m.statusFinal === "LIBERADO" 
                                    ? "bg-emerald-500/10 text-emerald-400" 
                                    : m.statusFinal === "PENDENTE"
                                    ? "bg-amber-500/10 text-amber-500"
                                    : "bg-rose-500/10 text-rose-400"
                                }`}
                              >
                                {m.statusFinal}
                              </span>
                              {m.statusFinal === "BLOQUEADO" && (
                                <span className="text-[9px] text-rose-500 font-mono mt-1 text-center max-w-[120px] truncate animate-pulse" title={getBloqueioMotivo(m) || ""}>
                                  {getBloqueioMotivo(m)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                  onClick={() => handleViewFile(m.cnhDocumentoUrl, `${m.nome}_CNH`)}
                                  className="p-1 text-sky-400 hover:text-white rounded border border-slate-800 bg-slate-950 transition cursor-pointer"
                                  title="Visualizar CNH"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleEditInit(m)}
                                className="p-1 text-slate-400 hover:text-white rounded border border-slate-800 bg-slate-950 transition cursor-pointer"
                                title="Alterar motorista"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(m.id)}
                                className="p-1 text-rose-550 hover:bg-rose-500 hover:text-white rounded transition"
                                title="Excluir"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {processedList.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-500 font-mono">
                          Nenhum motorista corresponde aos critérios de pesquisa informados.
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
      <NotificationModal notification={notification} onClose={() => setNotification(null)} />
      <ConfirmModal confirm={confirmDialog} onClose={() => setConfirmDialog(null)} />
    </div>
  );
}

// Navigation list icon simple visual helper component for Toggle Buttons
function NavListIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <line x1="8" y1="6" x2="21" y2="6"></line>
      <line x1="8" y1="12" x2="21" y2="12"></line>
      <line x1="8" y1="18" x2="21" y2="18"></line>
      <line x1="3" y1="6" x2="3.01" y2="6"></line>
      <line x1="3" y1="12" x2="3.01" y2="12"></line>
      <line x1="3" y1="18" x2="3.01" y2="18"></line>
    </svg>
  );
}
