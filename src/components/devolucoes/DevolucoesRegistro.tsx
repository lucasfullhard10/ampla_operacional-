import React, { useState, useEffect } from "react";
import { Plus, Search, Filter, Calendar, CheckSquare, XCircle, Trash2, Eye, ShieldCheck, RefreshCw, FileText } from "lucide-react";
import { DevolucaoRegistro, DevolucaoCliente, DevolucaoMotorista, DevolucaoMotivo } from "../../types";

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
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedReg, setSelectedReg] = useState<DevolucaoRegistro | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split("T")[0],
    motoristaMatricula: "",
    motoristaNome: "",
    motoristaTelefone: "",
    clienteCodigo: "",
    clienteRazaoSocial: "",
    clienteNomeFantasia: "",
    vendedor: "",
    supervisor: "",
    gerente: "",
    canal: "Rotas",
    telefone: "",
    endereco: "",
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
      const [resReg, resCli, resMot, resDrv] = await Promise.all([
        fetch("/api/devolucoes/registros"),
        fetch("/api/devolucoes/clientes"),
        fetch("/api/devolucoes/motivos"),
        fetch("/api/devolucoes/motoristas")
      ]);

      if (resReg.ok) setRegistros(await resReg.json());
      if (resCli.ok) setClientes(await resCli.json());
      if (resMot.ok) setMotivos(await resMot.json());
      if (resDrv.ok) setMotoristas(await resDrv.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  // Handle client auto-fill
  const handleClientSelect = (codigo: string) => {
    const cli = clientes.find(c => c.codigo === codigo);
    if (cli) {
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
        endereco: `${cli.cidade} - ${cli.uf}`
      }));
    }
  };

  // Handle driver auto-fill
  const handleDriverSelect = (matricula: string) => {
    const drv = motoristas.find(m => m.matricula === matricula);
    if (drv) {
      setFormData(prev => ({
        ...prev,
        motoristaMatricula: drv.matricula,
        motoristaNome: drv.nome,
        motoristaTelefone: drv.telefone || "Não Informado"
      }));
    }
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
    if (!formData.clienteCodigo || !formData.numeroNF || !formData.valorNF) {
      alert("Por favor, preencha todos os campos obrigatórios (Cliente, NF e Valor).");
      return;
    }

    try {
      const res = await fetch("/api/devolucoes/registros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          valorNF: parseFloat(String(formData.valorNF)) || 0
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
          clienteCodigo: "",
          clienteRazaoSocial: "",
          clienteNomeFantasia: "",
          vendedor: "",
          supervisor: "",
          gerente: "",
          canal: "Rotas",
          telefone: "",
          endereco: "",
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

  const toggleStatus = async (reg: DevolucaoRegistro) => {
    const newStatus = reg.status === "Pendente" ? "Resolvida" : "Pendente";
    try {
      const res = await fetch(`/api/devolucoes/registros/${reg.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta devolução de forma permanente? Esta ação será registrada no log de auditoria.")) return;
    try {
      const res = await fetch(`/api/devolucoes/registros/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchData();
        onRefresh();
      }
    } catch (err) {
      console.error(err);
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
                      <div className="text-slate-200">NF {reg.numeroNF}</div>
                      <div className="text-[11px] text-slate-400 font-semibold">
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
                          onClick={() => handleDelete(reg.id)}
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
          <div className="bg-slate-950 border border-slate-850 w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-850 flex items-center justify-between bg-slate-900/40">
              <div>
                <h3 className="text-sm font-bold text-slate-100 font-mono tracking-wider uppercase">Registrar Devolução Ampla</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Informe os dados da devolução da nota fiscal para gerar o protocolo.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-100 text-sm font-bold font-mono">Fechar [X]</button>
            </div>

            <form onSubmit={handleCreate} className="p-6 overflow-y-auto space-y-4 scrollbar-thin">
              {/* Cliente Autocomplete & NF details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 font-mono uppercase">Cliente / PDV <span className="text-rose-500">*</span></label>
                  <select
                    value={formData.clienteCodigo}
                    onChange={(e) => handleClientSelect(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 rounded-lg p-2 font-mono"
                    required
                  >
                    <option value="">-- Selecione o Cliente (PDV) --</option>
                    {clientes.map(c => (
                      <option key={c.codigo} value={c.codigo}>{c.codigo} - {c.nomeFantasia}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 font-mono uppercase">Motorista Associado</label>
                  <select
                    value={formData.motoristaMatricula}
                    onChange={(e) => handleDriverSelect(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 rounded-lg p-2 font-mono"
                  >
                    <option value="">-- Selecione o Motorista --</option>
                    {motoristas.map(m => (
                      <option key={m.matricula} value={m.matricula}>{m.matricula} - {m.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Hierarquia comercial preenchida automaticamente */}
              <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-850 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase">Vendedor RCA</span>
                  <span className="text-slate-300 font-semibold block mt-0.5 truncate">{formData.vendedor || "Selecione o cliente"}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase">Supervisor</span>
                  <span className="text-slate-300 font-semibold block mt-0.5 truncate">{formData.supervisor || "Selecione o cliente"}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase">Gerente</span>
                  <span className="text-slate-300 font-semibold block mt-0.5 truncate">{formData.gerente || "Selecione o cliente"}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase">Canal / Região</span>
                  <span className="text-slate-300 font-semibold block mt-0.5 truncate">{formData.canal}</span>
                </div>
              </div>

              {/* Informações da Nota Fiscal */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 font-mono uppercase">Número da NF <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.numeroNF}
                    onChange={(e) => setFormData(prev => ({ ...prev, numeroNF: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 text-xs rounded-lg p-2 font-mono text-slate-200"
                    placeholder="NF-00000"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 font-mono uppercase">Valor da Devolução (R$) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.valorNF}
                    onChange={(e) => setFormData(prev => ({ ...prev, valorNF: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 text-xs rounded-lg p-2 font-mono text-slate-200"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 font-mono uppercase">Data do Ocorrido</label>
                  <input
                    type="date"
                    required
                    value={formData.data}
                    onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 text-xs rounded-lg p-2 font-mono text-slate-200"
                  />
                </div>
              </div>

              {/* Motivo e Unidade */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 font-mono uppercase">Motivo Heineken</label>
                  <select
                    value={formData.motivoCodigo}
                    onChange={(e) => handleReasonSelect(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 rounded-lg p-2 font-mono"
                  >
                    {motivos.map(m => (
                      <option key={m.codigo} value={m.codigo}>{m.codigo} - {m.descricao}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 font-mono uppercase">Filial Operacional</label>
                  <select
                    value={formData.unidadeId}
                    onChange={(e) => setFormData(prev => ({ ...prev, unidadeId: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 text-xs rounded-lg p-2 font-mono text-slate-200"
                    disabled={currentUser.unidadeId !== "Todas"}
                  >
                    {unidades.map(u => (
                      <option key={u.id} value={u.id}>{u.nome}</option>
                    ))}
                  </select>
                </div>
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
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 text-xs font-semibold rounded-lg transition-colors font-mono"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-slate-950 text-xs font-bold rounded-lg transition-all font-mono"
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

              {/* Action */}
              <div className="flex justify-end gap-3 pt-2">
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
    </div>
  );
}
