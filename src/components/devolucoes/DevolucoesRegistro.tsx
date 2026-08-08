import React, { useState, useEffect } from "react";
import { Plus, Search, Filter, Calendar, CheckSquare, XCircle, Trash2, Eye, ShieldCheck, RefreshCw, FileText, Edit3, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { DevolucaoRegistro, DevolucaoCliente, DevolucaoMotorista, DevolucaoMotivo } from "../../types";
import DevolucoesDeleteModal from "./DevolucoesDeleteModal";

interface RegistroProps {
  unidades: any[];
  currentUser: any;
  onRefresh: () => void;
}

export default function DevolucoesRegistro({ unidades, currentUser, onRefresh }: RegistroProps) {
  const [registros, setRegistros] = useState<DevolucaoRegistro[]>([]);
  const [clientes, setClientes] = useState<DevolucaoCliente[]>([]);
  const [motoristas, setMotoristas] = useState<DevolucaoMotorista[]>([]);
  const [motivos, setMotivos] = useState<DevolucaoMotivo[]>([]);
  
  const [search, setSearch] = useState("");
  const [filterUnit, setFilterUnit] = useState(currentUser.unidadeId !== "Todas" ? currentUser.unidadeId : "");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMotivo, setFilterMotivo] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedReg, setSelectedReg] = useState<DevolucaoRegistro | null>(null);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
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

  // Autocomplete states
  const [clientSearch, setClientSearch] = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [showDriverSuggestions, setShowDriverSuggestions] = useState(false);

  const [editClientSearch, setEditClientSearch] = useState("");
  const [editDriverSearch, setEditDriverSearch] = useState("");
  const [showEditClientSuggestions, setShowEditClientSuggestions] = useState(false);
  const [showEditDriverSuggestions, setShowEditDriverSuggestions] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split("T")[0],
    motoristaMatricula: "",
    motoristaNome: "",
    motoristaTelefone: "",
    motoristaFuncao: "",
    clienteCodigo: "",
    clienteRazaoSocial: "",
    clienteNomeFantasia: "",
    vendedor: "",
    supervisor: "",
    gerente: "",
    canal: "Rotas",
    telefone: "",
    endereco: "",
    areaResponsavel: "",
    numeroNF: "",
    valorNF: "",
    motivoCodigo: "Y40",
    motivoDescricao: "PDV Fechado",
    observacao: "",
    unidadeId: currentUser.unidadeId !== "Todas" ? currentUser.unidadeId : (unidades[0]?.id || "un-go"),
    status: "Pendente" as "Pendente" | "Resolvida"
  });

  // Fetch lists
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const headers = {
        "x-user-email": currentUser?.email || "",
        "x-selected-unit": currentUser?.unidadeId || "Todas"
      };
      const [resReg, resCli, resMot, resDrv, resSysDrv] = await Promise.all([
        fetch("/api/devolucoes/registros", { headers }),
        fetch("/api/devolucoes/clientes", { headers }),
        fetch("/api/devolucoes/motivos", { headers }),
        fetch("/api/devolucoes/motoristas", { headers }),
        fetch("/api/motoristas", { headers })
      ]);

      if (resReg.ok) setRegistros(await resReg.json());
      if (resCli.ok) setClientes(await resCli.json());
      if (resMot.ok) setMotivos(await resMot.json());

      let devDrivers: DevolucaoMotorista[] = [];
      let sysDrivers: any[] = [];
      if (resDrv.ok) devDrivers = await resDrv.json();
      if (resSysDrv && resSysDrv.ok) sysDrivers = await resSysDrv.json();

      const mergedDrivers: DevolucaoMotorista[] = [...devDrivers];
      const seen = new Set(devDrivers.map(d => (d.matricula || d.id || d.nome).toLowerCase()));

      sysDrivers.forEach((m: any) => {
        if (m.statusFinal === "BLOQUEADO") return;
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
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  // Sync autocomplete states
  useEffect(() => {
    if (isModalOpen) {
      setClientSearch(formData.clienteCodigo || "");
      setDriverSearch(formData.motoristaMatricula || "");
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (isEditModalOpen && editFormData) {
      setEditClientSearch(editFormData.clienteCodigo || "");
      setEditDriverSearch(editFormData.motoristaMatricula || "");
    }
  }, [isEditModalOpen, editFormData]);

  // Select Client Callback for Create Form
  const selectClient = (cli: DevolucaoCliente) => {
    setFormData(prev => ({
      ...prev,
      clienteCodigo: cli.codigo,
      clienteRazaoSocial: cli.razaoSocial,
      clienteNomeFantasia: cli.nomeFantasia,
      vendedor: cli.vendedor || "",
      supervisor: cli.supervisor || "",
      gerente: cli.gerente || "",
      canal: cli.canalVenda || "Rotas",
      telefone: cli.telefone || "Não cadastrado",
      endereco: `${cli.cidade} - ${cli.uf}`,
      areaResponsavel: cli.areaResponsavel || "",
      unidadeId: cli.unidadeId || prev.unidadeId
    }));
    setClientSearch(cli.codigo);
    setShowClientSuggestions(false);
  };

  // Select Client Callback for Edit Form
  const selectEditClient = (cli: DevolucaoCliente) => {
    setEditFormData((prev: any) => ({
      ...prev,
      clienteCodigo: cli.codigo,
      clienteRazaoSocial: cli.razaoSocial,
      clienteNomeFantasia: cli.nomeFantasia,
      vendedor: cli.vendedor || "",
      supervisor: cli.supervisor || "",
      gerente: cli.gerente || "",
      canal: cli.canalVenda || "Rotas",
      telefone: cli.telefone || "Não cadastrado",
      endereco: `${cli.cidade} - ${cli.uf}`,
      areaResponsavel: cli.areaResponsavel || "",
      unidadeId: cli.unidadeId || prev.unidadeId
    }));
    setEditClientSearch(cli.codigo);
    setShowEditClientSuggestions(false);
  };

  // Select Driver Callback for Create Form
  const selectDriver = (drv: DevolucaoMotorista) => {
    setFormData(prev => ({
      ...prev,
      motoristaMatricula: drv.matricula,
      motoristaNome: drv.nome,
      motoristaTelefone: drv.telefone || "Não Informado",
      motoristaFuncao: drv.funcao || "Motorista"
    }));
    setDriverSearch(drv.matricula);
    setShowDriverSuggestions(false);
  };

  // Select Driver Callback for Edit Form
  const selectEditDriver = (drv: DevolucaoMotorista) => {
    setEditFormData((prev: any) => ({
      ...prev,
      motoristaMatricula: drv.matricula,
      motoristaNome: drv.nome,
      motoristaTelefone: drv.telefone || "Não Informado",
      motoristaFuncao: drv.funcao || "Motorista"
    }));
    setEditDriverSearch(drv.matricula);
    setShowEditDriverSuggestions(false);
  };

  // Handle reason auto-fill
  const handleReasonSelect = (codigo: string) => {
    const mot = motivos.find(m => m.codigo === codigo);
    if (mot) {
      setFormData(prev => ({
        ...prev,
        motivoCodigo: mot.codigo,
        motivoDescricao: mot.descricao
      }));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clienteCodigo) {
      alert("Por favor, preencha o campo obrigatório (Cliente).");
      return;
    }

    try {
      const finalNF = formData.numeroNF.trim() || "SEM-NF";
      const finalValor = parseFloat(String(formData.valorNF)) || 0;

      const res = await fetch("/api/devolucoes/registros", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": currentUser?.email || "",
          "x-selected-unit": currentUser?.unidadeId || "Todas"
        },
        body: JSON.stringify({
          ...formData,
          numeroNF: finalNF,
          valorNF: finalValor
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
        onRefresh();
        // Reset form
        setFormData({
          data: new Date().toISOString().split("T")[0],
          motoristaMatricula: "",
          motoristaNome: "",
          motoristaTelefone: "",
          motoristaFuncao: "",
          clienteCodigo: "",
          clienteRazaoSocial: "",
          clienteNomeFantasia: "",
          vendedor: "",
          supervisor: "",
          gerente: "",
          canal: "Rotas",
          telefone: "",
          endereco: "",
          areaResponsavel: "",
          numeroNF: "",
          valorNF: "",
          motivoCodigo: "Y40",
          motivoDescricao: "PDV Fechado",
          observacao: "",
          unidadeId: currentUser.unidadeId !== "Todas" ? currentUser.unidadeId : (unidades[0]?.id || "un-go"),
          status: "Pendente"
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData || !editFormData.clienteCodigo) {
      alert("Por favor, selecione o cliente.");
      return;
    }

    try {
      const finalNF = String(editFormData.numeroNF || "").trim() || "SEM-NF";
      const finalValor = parseFloat(String(editFormData.valorNF)) || 0;

      const res = await fetch(`/api/devolucoes/registros/${editFormData.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": currentUser?.email || "",
          "x-selected-unit": currentUser?.unidadeId || "Todas"
        },
        body: JSON.stringify({
          ...editFormData,
          numeroNF: finalNF,
          valorNF: finalValor
        })
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        setEditFormData(null);
        fetchData();
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleStatus = async (reg: DevolucaoRegistro) => {
    const newStatus = reg.status === "Pendente" ? "Resolvida" : "Pendente";
    try {
      const res = await fetch(`/api/devolucoes/registros/${reg.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": currentUser?.email || "",
          "x-selected-unit": currentUser?.unidadeId || "Todas"
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchData();
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger Delete Confirmation Modal
  const handleDelete = (record: any) => {
    if (!record) return;
    const recObj = typeof record === "object" ? record : { id: record };
    setRecordToDelete(recObj);
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
        setRegistros((prev) => prev.filter((r) => 
          r.id !== recordToDelete.id && 
          r.protocolo !== recordToDelete.protocolo && 
          r.numeroNF !== recordToDelete.numeroNF
        ));
        setToastMessage({ text: "Registro excluído com sucesso.", type: "success" });
        setIsDeleteModalOpen(false);
        setRecordToDelete(null);

        await fetchData();
        onRefresh();
      } else {
        setToastMessage({ text: "Não foi possível excluir o registro.", type: "error" });
      }
    } catch (err) {
      console.error("Erro na exclusão em DevolucoesRegistro:", err);
      setToastMessage({ text: "Não foi possível excluir o registro.", type: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered list
  const filteredRegs = registros.filter(r => {
    // Search match
    const cleanSearch = search.toLowerCase();
    const matchSearch = !search || 
      (r.protocolo && r.protocolo.toLowerCase().includes(cleanSearch)) ||
      (r.numeroNF && r.numeroNF.toLowerCase().includes(cleanSearch)) ||
      (r.clienteNomeFantasia && r.clienteNomeFantasia.toLowerCase().includes(cleanSearch)) ||
      (r.clienteCodigo && r.clienteCodigo.toLowerCase().includes(cleanSearch)) ||
      (r.motoristaNome && r.motoristaNome.toLowerCase().includes(cleanSearch));

    const matchUnit = !filterUnit || r.unidadeId === filterUnit;
    const matchStatus = !filterStatus || r.status === filterStatus;
    const matchMotivo = !filterMotivo || r.motivoCodigo === filterMotivo;

    return matchSearch && matchUnit && matchStatus && matchMotivo;
  }).sort((a, b) => b.protocolo.localeCompare(a.protocolo));

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por NF, protocolo, cliente, motorista..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-sky-500 rounded-lg pl-9 pr-4 py-2 text-xs font-mono text-slate-300"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {currentUser.unidadeId === "Todas" && (
            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              className="bg-slate-950 border border-slate-850 text-xs rounded-lg p-2 font-mono text-slate-300 focus:border-sky-500"
            >
              <option value="">Filial: Todas</option>
              {unidades.map(u => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          )}

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-850 text-xs rounded-lg p-2 font-mono text-slate-300 focus:border-sky-500"
          >
            <option value="">Status: Todos</option>
            <option value="Pendente">🔴 Pendentes</option>
            <option value="Resolvida">🟢 Resolvidas</option>
          </select>

          <select
            value={filterMotivo}
            onChange={(e) => setFilterMotivo(e.target.value)}
            className="bg-slate-950 border border-slate-850 text-xs rounded-lg p-2 font-mono text-slate-300 focus:border-sky-500 max-w-[150px]"
          >
            <option value="">Motivo: Todos</option>
            {motivos.map(m => (
              <option key={m.codigo} value={m.codigo}>{m.codigo} - {m.descricao.substring(0, 15)}...</option>
            ))}
          </select>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-sky-500/10 transition-all font-mono"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Registrar Devolução
          </button>
        </div>
      </div>

      {/* Grid of entries */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                <th className="py-3 px-4">Protocolo</th>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Filial</th>
                <th className="py-3 px-4">NF / Valor (R$)</th>
                <th className="py-3 px-4">PDV / Cliente</th>
                <th className="py-3 px-4">Motorista</th>
                <th className="py-3 px-4">Motivo</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs font-mono">
              {filteredRegs.length > 0 ? (
                filteredRegs.map(reg => (
                  <tr key={reg.id} className="hover:bg-slate-800/10 transition-colors group">
                    <td className="py-3 px-4 font-bold text-sky-400 text-[11px]">{reg.protocolo}</td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{new Date(reg.data + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {unidades.find(u => u.id === reg.unidadeId)?.nome?.split(" ")[0] || reg.unidadeId}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {(reg.numeroNF === "SEM-NF" || reg.numeroNF === "SEM NF" || reg.numeroNF === "NÃO INFORMADA" || !reg.numeroNF) ? (
                        <div className="space-y-1">
                          <span className="text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold block w-fit">
                            SEM NF
                          </span>
                          <button
                            onClick={() => {
                              setEditFormData(reg);
                              setIsEditModalOpen(true);
                            }}
                            className="text-sky-400 hover:text-sky-300 hover:underline text-[10px] font-bold flex items-center gap-1 font-mono transition-all"
                          >
                            <Plus className="w-3 h-3 stroke-[3]" /> Adicionar NF
                          </button>
                        </div>
                      ) : (
                        <div className="text-slate-200 font-bold">NF {reg.numeroNF}</div>
                      )}
                      <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                        R$ {reg.valorNF?.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-[180px] truncate">
                      <div className="text-slate-200 truncate">{reg.clienteNomeFantasia}</div>
                      <div className="text-[10px] text-slate-500 font-mono">PDV: {reg.clienteCodigo}</div>
                    </td>
                    <td className="py-3 px-4 truncate max-w-[140px] text-slate-300">{reg.motoristaNome}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[10px] text-slate-400 font-bold">
                        {reg.motivoCodigo}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => toggleStatus(reg)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${
                          reg.status === "Resolvida"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/10 border-rose-500/20 text-rose-400 animate-pulse"
                        }`}
                      >
                        {reg.status === "Resolvida" ? "✓ Resolvida" : "● Pendente"}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedReg(reg);
                            setIsDetailOpen(true);
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 hover:text-sky-400 text-slate-400 rounded transition-colors"
                          title="Detalhes da Devolução"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditFormData(reg);
                            setIsEditModalOpen(true);
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 hover:text-amber-400 text-slate-400 rounded transition-colors"
                          title="Editar Devolução / Adicionar NF"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(reg)}
                          className="p-1.5 bg-slate-800/60 hover:bg-rose-500/10 hover:text-rose-400 text-slate-500 rounded transition-colors"
                          title="Excluir Devolução"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500 text-xs font-mono">
                    Nenhuma devolução encontrada para os critérios de filtragem selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Novo Registro Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-850 w-full max-w-3xl rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-850 flex items-center justify-between bg-slate-900/40 font-mono">
              <div>
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Registrar Devolução Ampla</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Informe o código do cliente e a matrícula do motorista para carregar as informações oficiais.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-100 text-sm font-bold">Fechar [X]</button>
            </div>

            <form onSubmit={handleCreate} className="p-6 overflow-y-auto space-y-5 scrollbar-thin">
              {/* Autocomplete Inputs (Cliente e Motorista) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Cliente Código Autocomplete */}
                <div className="space-y-1.5 relative">
                  <label className="text-[11px] font-semibold text-slate-400 font-mono uppercase flex items-center gap-1">
                    Código do Cliente (PDV) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={(e) => {
                        const val = e.target.value;
                        setClientSearch(val);
                        setShowClientSuggestions(true);
                        
                        // Find exact match
                        const exactMatch = clientes.find(c => c.codigo.toLowerCase() === val.trim().toLowerCase());
                        if (exactMatch) {
                          selectClient(exactMatch);
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            clienteCodigo: val,
                            clienteRazaoSocial: "",
                            clienteNomeFantasia: "",
                            vendedor: "",
                            supervisor: "",
                            gerente: "",
                            canal: "Rotas",
                            telefone: "",
                            endereco: "",
                            areaResponsavel: ""
                          }));
                        }
                      }}
                      onFocus={() => setShowClientSuggestions(true)}
                      onBlur={() => {
                        setTimeout(() => setShowClientSuggestions(false), 200);
                      }}
                      placeholder="Digite o código (ex: TEST_CLI_100)..."
                      className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg p-2 font-mono focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      required
                    />
                    {clientSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setClientSearch("");
                          setFormData(prev => ({
                            ...prev,
                            clienteCodigo: "",
                            clienteRazaoSocial: "",
                            clienteNomeFantasia: "",
                            vendedor: "",
                            supervisor: "",
                            gerente: "",
                            canal: "Rotas",
                            telefone: "",
                            endereco: "",
                            areaResponsavel: ""
                          }));
                        }}
                        className="absolute right-2 top-2.5 text-[10px] text-slate-500 hover:text-slate-300 font-mono uppercase"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  {/* Client Suggestions Dropdown */}
                  {showClientSuggestions && clientSearch.trim().length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg max-h-48 overflow-y-auto shadow-xl">
                      {(() => {
                        const query = clientSearch.toLowerCase();
                        const filtered = clientes.filter(c => 
                          (c.codigo && c.codigo.toLowerCase().includes(query)) ||
                          (c.nomeFantasia && c.nomeFantasia.toLowerCase().includes(query)) ||
                          (c.razaoSocial && c.razaoSocial.toLowerCase().includes(query))
                        );

                        if (filtered.length === 0) {
                          return (
                            <div className="p-2 text-slate-500 text-xs font-mono text-center">
                              Nenhum cliente correspondente
                            </div>
                          );
                        }

                        return filtered.slice(0, 15).map(c => (
                          <button
                            key={c.codigo}
                            type="button"
                            onMouseDown={() => selectClient(c)}
                            className="w-full text-left p-2.5 hover:bg-slate-900 text-slate-300 hover:text-white transition-colors border-b border-slate-900 last:border-0 text-xs font-mono"
                          >
                            <div className="font-bold text-sky-400">{c.codigo}</div>
                            <div className="truncate text-[11px] text-slate-400">{c.nomeFantasia || c.razaoSocial}</div>
                            <div className="text-[10px] text-slate-500">{c.cidade} - {c.uf}</div>
                          </button>
                        ));
                      })()}
                    </div>
                  )}
                </div>

                {/* Motorista Matricula Autocomplete */}
                <div className="space-y-1.5 relative">
                  <label className="text-[11px] font-semibold text-slate-400 font-mono uppercase flex items-center gap-1">
                    Matrícula do Motorista <span className="text-slate-500">(Opcional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={driverSearch}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDriverSearch(val);
                        setShowDriverSuggestions(true);
                        
                        // Find exact match
                        const exactMatch = motoristas.find(m => m.matricula.toLowerCase() === val.trim().toLowerCase());
                        if (exactMatch) {
                          selectDriver(exactMatch);
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            motoristaMatricula: val,
                            motoristaNome: "",
                            motoristaTelefone: "",
                            motoristaFuncao: ""
                          }));
                        }
                      }}
                      onFocus={() => setShowDriverSuggestions(true)}
                      onBlur={() => {
                        setTimeout(() => setShowDriverSuggestions(false), 200);
                      }}
                      placeholder="Digite a matrícula (ex: TEST_DRV_100)..."
                      className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg p-2 font-mono focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                    {driverSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setDriverSearch("");
                          setFormData(prev => ({
                            ...prev,
                            motoristaMatricula: "",
                            motoristaNome: "",
                            motoristaTelefone: "",
                            motoristaFuncao: ""
                          }));
                        }}
                        className="absolute right-2 top-2.5 text-[10px] text-slate-500 hover:text-slate-300 font-mono uppercase"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  {/* Driver Suggestions Dropdown */}
                  {showDriverSuggestions && driverSearch.trim().length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg max-h-48 overflow-y-auto shadow-xl">
                      {(() => {
                        const query = driverSearch.toLowerCase();
                        const filtered = motoristas.filter(m => 
                          (m.matricula && m.matricula.toLowerCase().includes(query)) ||
                          (m.nome && m.nome.toLowerCase().includes(query))
                        );

                        if (filtered.length === 0) {
                          return (
                            <div className="p-2 text-slate-500 text-xs font-mono text-center">
                              Nenhum motorista correspondente
                            </div>
                          );
                        }

                        return filtered.slice(0, 15).map(m => (
                          <button
                            key={m.matricula}
                            type="button"
                            onMouseDown={() => selectDriver(m)}
                            className="w-full text-left p-2.5 hover:bg-slate-900 text-slate-300 hover:text-white transition-colors border-b border-slate-900 last:border-0 text-xs font-mono"
                          >
                            <div className="font-bold text-sky-400">{m.matricula}</div>
                            <div className="truncate text-[11px] text-slate-400">{m.nome}</div>
                            <div className="text-[10px] text-slate-500">{m.funcao || "Motorista"}</div>
                          </button>
                        ));
                      })()}
                    </div>
                  )}
                </div>

              </div>

              {/* Ficha Cadastral do Cliente (Auto-preenchida e Bloqueada) */}
              {formData.clienteCodigo && (
                <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-850 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">Dados Cadastrais do Cliente (Base Oficial)</span>
                    <span className="text-[9px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-bold uppercase">
                      Bloqueado para Visualização
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Razão Social</span>
                      <span className="text-slate-300 font-semibold block mt-0.5 truncate" title={formData.clienteRazaoSocial}>{formData.clienteRazaoSocial || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Nome Fantasia</span>
                      <span className="text-slate-300 font-semibold block mt-0.5 truncate" title={formData.clienteNomeFantasia}>{formData.clienteNomeFantasia || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Endereço (Cidade/UF)</span>
                      <span className="text-slate-300 font-semibold block mt-0.5 truncate">{formData.endereco || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Telefone</span>
                      <span className="text-slate-300 font-semibold block mt-0.5 truncate">{formData.telefone || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Canal / Região</span>
                      <span className="text-slate-300 font-semibold block mt-0.5 truncate">{formData.canal || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Área Responsável</span>
                      <span className="text-slate-300 font-semibold block mt-0.5 truncate">{formData.areaResponsavel || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Vendedor RCA</span>
                      <span className="text-slate-300 font-semibold block mt-0.5 truncate">{formData.vendedor || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Supervisor</span>
                      <span className="text-slate-300 font-semibold block mt-0.5 truncate">{formData.supervisor || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Gerente</span>
                      <span className="text-slate-300 font-semibold block mt-0.5 truncate">{formData.gerente || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Filial</span>
                      <span className="text-slate-300 font-semibold block mt-0.5 truncate">
                        {unidades.find(u => u.id === formData.unidadeId)?.nome || formData.unidadeId || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Ficha Cadastral do Motorista (Auto-preenchida e Bloqueada) */}
              {formData.motoristaMatricula && (
                <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-850 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">Dados Operacionais do Motorista (Base Oficial)</span>
                    <span className="text-[9px] px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded font-bold uppercase">
                      Bloqueado para Visualização
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Nome Completo</span>
                      <span className="text-slate-300 font-semibold block mt-0.5 truncate">{formData.motoristaNome || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Telefone</span>
                      <span className="text-slate-300 font-semibold block mt-0.5 truncate">{formData.motoristaTelefone || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Função / Cargo</span>
                      <span className="text-slate-300 font-semibold block mt-0.5 truncate">{formData.motoristaFuncao || "Motorista"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Informações da Nota Fiscal, Valor e Data */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 font-mono uppercase">Número da NF</label>
                  <input
                    type="text"
                    value={formData.numeroNF}
                    onChange={(e) => setFormData(prev => ({ ...prev, numeroNF: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 text-xs rounded-lg p-2 font-mono text-slate-200"
                    placeholder="NF-00000 (Opcional)"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 font-mono uppercase">Valor da Devolução (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valorNF}
                    onChange={(e) => setFormData(prev => ({ ...prev, valorNF: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 text-xs rounded-lg p-2 font-mono text-slate-200"
                    placeholder="0.00 (Opcional)"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 font-mono uppercase">Data do Ocorrido <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={formData.data}
                    onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 text-xs rounded-lg p-2 font-mono text-slate-200"
                  />
                </div>
              </div>

              {/* Motivo Heineken */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 font-mono uppercase">Motivo Heineken <span className="text-rose-500">*</span></label>
                <select
                  value={formData.motivoCodigo}
                  onChange={(e) => handleReasonSelect(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 rounded-lg p-2 font-mono"
                  required
                >
                  {motivos.map(m => (
                    <option key={m.codigo} value={m.codigo}>{m.codigo} - {m.descricao}</option>
                  ))}
                </select>
              </div>

              {/* Observação */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 font-mono uppercase font-mono">Observações / Detalhes Adicionais</label>
                <textarea
                  value={formData.observacao}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 text-xs rounded-lg p-2.5 font-mono text-slate-200 h-20 resize-none"
                  placeholder="Descreva detalhes específicos do acerto ou pendência..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-850 font-mono">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-slate-950 text-xs font-bold rounded-lg transition-all"
                >
                  Confirmar e Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detalhe e Protocolo Modal */}
      {isDetailOpen && selectedReg && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-850 w-full max-w-xl rounded-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-850 flex items-center justify-between bg-slate-900/40">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-bold text-slate-100 font-mono">Protocolo: {selectedReg.protocolo}</h3>
              </div>
              <button onClick={() => {
                setIsDetailOpen(false);
                setSelectedReg(null);
              }} className="text-slate-400 hover:text-slate-100 text-sm font-bold font-mono">Fechar [X]</button>
            </div>

            <div className="p-6 space-y-5 text-xs font-mono">
              {/* Audit trail */}
              <div className="bg-sky-500/5 p-3 rounded-lg border border-sky-500/10 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] text-sky-400 block uppercase font-bold tracking-wider">Trilha de Auditoria Digital</span>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    Criado por <span className="text-slate-200 font-bold">{selectedReg.criadoPor}</span> em {new Date(selectedReg.criadoEm).toLocaleString("pt-BR")}. 
                    Endereço IP operacional registrado: <span className="text-slate-200">{selectedReg.ip || "127.0.0.1"}</span>.
                  </p>
                </div>
              </div>

              {/* Protocol Details Grid */}
              <div className="grid grid-cols-2 gap-4 border-b border-slate-850 pb-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Data Operação</span>
                  <span className="text-slate-300 font-bold block mt-0.5">{new Date(selectedReg.data + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Filial</span>
                  <span className="text-slate-300 font-bold block mt-0.5">{unidades.find(u => u.id === selectedReg.unidadeId)?.nome || selectedReg.unidadeId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Nota Fiscal (NF)</span>
                  <span className="text-slate-300 font-bold block mt-0.5">NF {selectedReg.numeroNF}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Valor Financeiro</span>
                  <span className="text-emerald-400 font-extrabold block mt-0.5">R$ {selectedReg.valorNF?.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* PDV / Cliente */}
              <div className="border-b border-slate-850 pb-4">
                <span className="text-[10px] text-slate-500 uppercase block mb-1">PDV / Cliente Heineken</span>
                <div className="bg-slate-900/60 p-3 rounded border border-slate-800">
                  <span className="text-slate-200 font-bold block">{selectedReg.clienteNomeFantasia}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Código PDV: {selectedReg.clienteCodigo} | Razão Social: {selectedReg.clienteRazaoSocial}</span>
                  <span className="text-[10px] text-slate-400 block mt-1">Endereço: {selectedReg.endereco}</span>
                </div>
              </div>

              {/* Driver & Reason */}
              <div className="grid grid-cols-2 gap-4 border-b border-slate-850 pb-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Motorista</span>
                  <span className="text-slate-300 font-bold block mt-0.5">{selectedReg.motoristaNome || "Não Informado"}</span>
                  <span className="text-[9px] text-slate-500 block">Matrícula: {selectedReg.motoristaMatricula || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Motivo Heineken</span>
                  <span className="text-slate-300 font-bold block mt-0.5">{selectedReg.motivoCodigo}</span>
                  <span className="text-[9px] text-slate-500 block">{selectedReg.motivoDescricao}</span>
                </div>
              </div>

              {/* Commercial Alignment */}
              <div className="bg-slate-900/40 p-3 rounded border border-slate-850 grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block">Vendedor</span>
                  <span className="text-slate-300 block truncate">{selectedReg.vendedor || "Não informado"}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block">Supervisor</span>
                  <span className="text-slate-300 block truncate">{selectedReg.supervisor || "Não informado"}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block">Gerente</span>
                  <span className="text-slate-300 block truncate">{selectedReg.gerente || "Não informado"}</span>
                </div>
              </div>

              {/* Comments */}
              {selectedReg.observacao && (
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Observações do Registro</span>
                  <p className="bg-slate-900/80 text-slate-300 p-2.5 rounded border border-slate-850 mt-1">{selectedReg.observacao}</p>
                </div>
              )}

              {/* Campos Extras */}
              {selectedReg.camposExtras && Object.keys(selectedReg.camposExtras).length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] text-sky-400 font-bold uppercase block tracking-wider">Campos Extras da Planilha (Base Corporativa)</span>
                  <div className="grid grid-cols-2 gap-2 bg-slate-900/40 p-3 rounded-lg border border-slate-850 max-h-[160px] overflow-y-auto scrollbar-thin">
                    {Object.entries(selectedReg.camposExtras).map(([key, value]) => {
                      if (value === undefined || value === null || String(value).trim() === "") return null;
                      return (
                        <div key={key} className="border-b border-slate-800/40 pb-1.5 last:border-0 font-mono text-[10px] min-w-0">
                          <span className="text-slate-500 uppercase block truncate" title={key}>{key}</span>
                          <span className="text-slate-300 font-medium block truncate" title={String(value)}>
                            {String(value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setIsDetailOpen(false);
                    setEditFormData(selectedReg);
                    setIsEditModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-750 font-mono transition-colors"
                >
                  Editar Dados
                </button>
                <button
                  onClick={() => {
                    setIsDetailOpen(false);
                    toggleStatus(selectedReg);
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    selectedReg.status === "Resolvida"
                      ? "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                      : "bg-emerald-500 text-slate-950 font-bold"
                  }`}
                >
                  {selectedReg.status === "Resolvida" ? "Desfazer Resolução" : "Marcar como Resolvida"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editar Registro Modal */}
      {isEditModalOpen && editFormData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-850 w-full max-w-3xl rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-850 flex items-center justify-between bg-slate-900/40">
              <div>
                <h3 className="text-sm font-bold text-slate-100 font-mono tracking-wider uppercase flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-400" /> Editar Devolução Ampla
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Controle de Protocolo: {editFormData.protocolo}</p>
              </div>
              <button onClick={() => {
                setIsEditModalOpen(false);
                setEditFormData(null);
              }} className="text-slate-400 hover:text-slate-100 text-sm font-bold font-mono">Fechar [X]</button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 overflow-y-auto space-y-5 scrollbar-thin">
              {/* Autocomplete Inputs (Cliente e Motorista) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Cliente Código Autocomplete */}
                <div className="space-y-1.5 relative">
                  <label className="text-[11px] font-semibold text-slate-400 font-mono uppercase flex items-center gap-1">
                    Código do Cliente (PDV) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={editClientSearch}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditClientSearch(val);
                        setShowEditClientSuggestions(true);
                        
                        // Find exact match
                        const exactMatch = clientes.find(c => c.codigo.toLowerCase() === val.trim().toLowerCase());
                        if (exactMatch) {
                          selectEditClient(exactMatch);
                        } else {
                          setEditFormData((prev: any) => ({
                            ...prev,
                            clienteCodigo: val,
                            clienteRazaoSocial: "",
                            clienteNomeFantasia: "",
                            vendedor: "",
                            supervisor: "",
                            gerente: "",
                            canal: "Rotas",
                            telefone: "",
                            endereco: "",
                            areaResponsavel: ""
                          }));
                        }
                      }}
                      onFocus={() => setShowEditClientSuggestions(true)}
                      onBlur={() => {
                        setTimeout(() => setShowEditClientSuggestions(false), 200);
                      }}
                      placeholder="Digite o código (ex: TEST_CLI_100)..."
                      className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg p-2 font-mono focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      required
                    />
                  </div>

                  {/* Edit Client Suggestions Dropdown */}
                  {showEditClientSuggestions && editClientSearch.trim().length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg max-h-48 overflow-y-auto shadow-xl">
                      {(() => {
                        const query = editClientSearch.toLowerCase();
                        const filtered = clientes.filter(c => 
                          (c.codigo && c.codigo.toLowerCase().includes(query)) ||
                          (c.nomeFantasia && c.nomeFantasia.toLowerCase().includes(query)) ||
                          (c.razaoSocial && c.razaoSocial.toLowerCase().includes(query))
                        );

                        if (filtered.length === 0) {
                          return (
                            <div className="p-2 text-slate-500 text-xs font-mono text-center">
                              Nenhum cliente correspondente
                            </div>
                          );
                        }

                        return filtered.slice(0, 15).map(c => (
                          <button
                            key={c.codigo}
                            type="button"
                            onMouseDown={() => selectEditClient(c)}
                            className="w-full text-left p-2.5 hover:bg-slate-900 text-slate-300 hover:text-white transition-colors border-b border-slate-900 last:border-0 text-xs font-mono"
                          >
                            <div className="font-bold text-sky-400">{c.codigo}</div>
                            <div className="truncate text-[11px] text-slate-400">{c.nomeFantasia || c.razaoSocial}</div>
                            <div className="text-[10px] text-slate-500">{c.cidade} - {c.uf}</div>
                          </button>
                        ));
                      })()}
                    </div>
                  )}
                </div>

                {/* Motorista Matricula Autocomplete */}
                <div className="space-y-1.5 relative">
                  <label className="text-[11px] font-semibold text-slate-400 font-mono uppercase flex items-center gap-1">
                    Matrícula do Motorista <span className="text-slate-500">(Opcional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={editDriverSearch}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditDriverSearch(val);
                        setShowEditDriverSuggestions(true);
                        
                        // Find exact match
                        const exactMatch = motoristas.find(m => m.matricula.toLowerCase() === val.trim().toLowerCase());
                        if (exactMatch) {
                          selectEditDriver(exactMatch);
                        } else {
                          setEditFormData((prev: any) => ({
                            ...prev,
                            motoristaMatricula: val,
                            motoristaNome: "",
                            motoristaTelefone: "",
                            motoristaFuncao: ""
                          }));
                        }
                      }}
                      onFocus={() => setShowEditDriverSuggestions(true)}
                      onBlur={() => {
                        setTimeout(() => setShowEditDriverSuggestions(false), 200);
                      }}
                      placeholder="Digite a matrícula (ex: TEST_DRV_100)..."
                      className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg p-2 font-mono focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  {/* Edit Driver Suggestions Dropdown */}
                  {showEditDriverSuggestions && editDriverSearch.trim().length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg max-h-48 overflow-y-auto shadow-xl">
                      {(() => {
                        const query = editDriverSearch.toLowerCase();
                        const filtered = motoristas.filter(m => 
                          (m.matricula && m.matricula.toLowerCase().includes(query)) ||
                          (m.nome && m.nome.toLowerCase().includes(query))
                        );

                        if (filtered.length === 0) {
                          return (
                            <div className="p-2 text-slate-500 text-xs font-mono text-center">
                              Nenhum motorista correspondente
                            </div>
                          );
                        }

                        return filtered.slice(0, 15).map(m => (
                          <button
                            key={m.matricula}
                            type="button"
                            onMouseDown={() => selectEditDriver(m)}
                            className="w-full text-left p-2.5 hover:bg-slate-900 text-slate-300 hover:text-white transition-colors border-b border-slate-900 last:border-0 text-xs font-mono"
                          >
                            <div className="font-bold text-sky-400">{m.matricula}</div>
                            <div className="truncate text-[11px] text-slate-400">{m.nome}</div>
                            <div className="text-[10px] text-slate-500">{m.funcao || "Motorista"}</div>
                          </button>
                        ));
                      })()}
                    </div>
                  )}
                </div>

              </div>

              {/* Ficha Cadastral do Cliente (Auto-preenchida e Bloqueada) */}
              {editFormData.clienteCodigo && (
                <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-850 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">Dados Cadastrais do Cliente (Base Oficial)</span>
                    <span className="text-[9px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-bold uppercase">
                      Bloqueado para Visualização
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Razão Social</span>
                      <span className="text-slate-300 font-semibold block mt-0.5 truncate" title={editFormData.clienteRazaoSocial}>{editFormData.clienteRazaoSocial || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Nome Fantasia</span>
                      <span className="text-slate-300 font-semibold block mt-0.5 truncate" title={editFormData.clienteNomeFantasia}>{editFormData.clienteNomeFantasia || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Endereço (Cidade/UF)</span>
                      <span className="text-slate-300 font-semibold block mt-0.5 truncate">{editFormData.endereco || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Telefone</span>
                      <span className="text-slate-300 font-semibold block mt-0.5 truncate">{editFormData.telefone || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Canal / Região</span>
                      <span className="text-slate-300 font-semibold block mt-0.5 truncate">{editFormData.canal || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Área Responsável</span>
                      <span className="text-slate-300 font-semibold block mt-0.5 truncate">{editFormData.areaResponsavel || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Vendedor RCA</span>
                      <span className="text-slate-300 font-semibold block mt-0.5 truncate">{editFormData.vendedor || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Supervisor</span>
                      <span className="text-slate-300 font-semibold block mt-0.5 truncate">{editFormData.supervisor || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Gerente</span>
                      <span className="text-slate-300 font-semibold block mt-0.5 truncate">{editFormData.gerente || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Filial</span>
                      <span className="text-slate-300 font-semibold block mt-0.5 truncate">
                        {unidades.find(u => u.id === editFormData.unidadeId)?.nome || editFormData.unidadeId || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Ficha Cadastral do Motorista (Auto-preenchida e Bloqueada) */}
              {editFormData.motoristaMatricula && (
                <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-850 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">Dados Operacionais do Motorista (Base Oficial)</span>
                    <span className="text-[9px] px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded font-bold uppercase">
                      Bloqueado para Visualização
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Nome Completo</span>
                      <span className="text-slate-300 font-semibold block mt-0.5 truncate">{editFormData.motoristaNome || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Telefone</span>
                      <span className="text-slate-300 font-semibold block mt-0.5 truncate">{editFormData.motoristaTelefone || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Função / Cargo</span>
                      <span className="text-slate-300 font-semibold block mt-0.5 truncate">{editFormData.motoristaFuncao || "Motorista"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Informações da Nota Fiscal e Valor */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 font-mono uppercase">Número da NF</label>
                  <input
                    type="text"
                    value={editFormData.numeroNF === "SEM-NF" ? "" : editFormData.numeroNF}
                    onChange={(e) => setEditFormData((prev: any) => ({ ...prev, numeroNF: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 text-xs rounded-lg p-2 font-mono text-slate-200 focus:border-sky-500"
                    placeholder="Ex: NF-28490 (vazio = SEM NF)"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 font-mono uppercase">Valor Devolvido (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.valorNF || ""}
                    onChange={(e) => setEditFormData((prev: any) => ({ ...prev, valorNF: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 text-xs rounded-lg p-2 font-mono text-slate-200 focus:border-sky-500"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 font-mono uppercase">Data do Ocorrido <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={editFormData.data}
                    onChange={(e) => setEditFormData((prev: any) => ({ ...prev, data: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 text-xs rounded-lg p-2 font-mono text-slate-200 focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Motivo Heineken */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 font-mono uppercase">Motivo Heineken <span className="text-rose-500">*</span></label>
                <select
                  value={editFormData.motivoCodigo}
                  onChange={(e) => {
                    const m = motivos.find(item => item.codigo === e.target.value);
                    setEditFormData((prev: any) => ({
                      ...prev,
                      motivoCodigo: e.target.value,
                      motivoDescricao: m ? m.descricao : prev.motivoDescricao
                    }));
                  }}
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg p-2 font-mono focus:border-sky-500"
                  required
                >
                  {motivos.map(m => (
                    <option key={m.codigo} value={m.codigo}>{m.codigo} - {m.descricao}</option>
                  ))}
                </select>
              </div>

              {/* Observações */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 font-mono uppercase">Observações / Detalhes Adicionais</label>
                <textarea
                  value={editFormData.observacao || ""}
                  onChange={(e) => setEditFormData((prev: any) => ({ ...prev, observacao: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 text-xs rounded-lg p-2.5 font-mono text-slate-200 h-20 resize-none focus:border-sky-500"
                  placeholder="Descreva detalhes específicos do acerto..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-850 font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditFormData(null);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-slate-950 text-xs font-bold rounded-lg transition-all"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DevolucoesDeleteModal
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
      />

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
