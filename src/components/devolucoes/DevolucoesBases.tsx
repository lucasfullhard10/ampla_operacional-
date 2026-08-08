import React, { useState, useEffect } from "react";
import { Plus, Search, Trash2, Edit2, Users, UserCheck, ShieldAlert, BookOpen, Key, Building2 } from "lucide-react";
import { DevolucaoCliente, DevolucaoMotorista, DevolucaoHierarquia, DevolucaoMotivo } from "../../types";

interface BasesProps {
  unidades: any[];
  currentUser: any;
}

export default function DevolucoesBases({ unidades, currentUser }: BasesProps) {
  const [activeSubTab, setActiveSubTab] = useState<"clientes" | "motoristas" | "hierarquia" | "motivos">("clientes");

  const [clientes, setClientes] = useState<DevolucaoCliente[]>([]);
  const [motoristas, setMotoristas] = useState<DevolucaoMotorista[]>([]);
  const [hierarquias, setHierarquias] = useState<DevolucaoHierarquia[]>([]);
  const [motivos, setMotivos] = useState<DevolucaoMotivo[]>([]);

  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);

  // Forms states
  const [clientForm, setClientForm] = useState({
    codigo: "",
    razaoSocial: "",
    nomeFantasia: "",
    cnpj: "",
    cidade: "",
    uf: "GO",
    telefone: "",
    canalVenda: "Rotas",
    vendedor: "",
    supervisor: "",
    gerente: "",
    areaResponsavel: "Vendas",
    situacao: "Ativo" as "Ativo" | "Inativo",
    unidadeId: currentUser.unidadeId !== "Todas" ? currentUser.unidadeId : (unidades[0]?.id || "un-go")
  });

  const [driverForm, setDriverForm] = useState({
    matricula: "",
    nome: "",
    telefone: "",
    funcao: "Motorista",
    unidadeId: currentUser.unidadeId !== "Todas" ? currentUser.unidadeId : (unidades[0]?.id || "un-go"),
    status: "Ativo" as "Ativo" | "Inativo"
  });

  const [hierarchyForm, setHierarchyForm] = useState({
    vendedor: "",
    supervisor: "",
    gerente: "",
    area: "Vendas",
    canal: "Rotas",
    telefone: "",
    email: "",
    status: "Ativo" as "Ativo" | "Inativo",
    unidadeId: currentUser.unidadeId !== "Todas" ? currentUser.unidadeId : (unidades[0]?.id || "un-go")
  });

  const [reasonForm, setReasonForm] = useState({
    codigo: "",
    descricao: ""
  });

  const fetchBases = async () => {
    setIsLoading(true);
    try {
      const headers = {
        "x-user-email": currentUser?.email || "",
        "x-selected-unit": currentUser?.unidadeId || "Todas"
      };
      const [resCli, resMot, resHie, resRea] = await Promise.all([
        fetch("/api/devolucoes/clientes", { headers }),
        fetch("/api/devolucoes/motoristas", { headers }),
        fetch("/api/devolucoes/hierarquia", { headers }),
        fetch("/api/devolucoes/motivos", { headers })
      ]);

      if (resCli.ok) setClientes(await resCli.json());
      if (resMot.ok) setMotoristas(await resMot.json());
      if (resHie.ok) setHierarquias(await resHie.json());
      if (resRea.ok) setMotivos(await resRea.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBases();
  }, [activeSubTab, currentUser]);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este item?")) return;
    try {
      const encodedId = encodeURIComponent(id);
      const endpoint = 
        activeSubTab === "clientes" ? `/api/devolucoes/clientes/${encodedId}` :
        activeSubTab === "motoristas" ? `/api/devolucoes/motoristas/${encodedId}` :
        activeSubTab === "hierarquia" ? `/api/devolucoes/hierarquia/${encodedId}` :
        `/api/devolucoes/motivos/${encodedId}`;

      const res = await fetch(endpoint, { 
        method: "DELETE",
        headers: {
          "x-user-email": currentUser?.email || "",
          "x-selected-unit": currentUser?.unidadeId || "Todas"
        }
      });
      if (res.ok) {
        fetchBases();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Erro ao excluir item.");
      }
    } catch (err) {
      console.error(err);
      alert("Falha na requisição de exclusão.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let endpoint = "";
      let payload: any = {};

      if (activeSubTab === "clientes") {
        endpoint = "/api/devolucoes/clientes";
        payload = editItem ? { ...editItem, ...clientForm } : clientForm;
      } else if (activeSubTab === "motoristas") {
        endpoint = "/api/devolucoes/motoristas";
        payload = editItem ? { ...editItem, ...driverForm } : driverForm;
      } else if (activeSubTab === "hierarquia") {
        endpoint = "/api/devolucoes/hierarquia";
        payload = editItem ? { ...editItem, ...hierarchyForm } : hierarchyForm;
      } else if (activeSubTab === "motivos") {
        endpoint = "/api/devolucoes/motivos";
        payload = editItem ? { ...editItem, ...reasonForm } : reasonForm;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": currentUser?.email || "",
          "x-selected-unit": currentUser?.unidadeId || "Todas"
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditItem(null);
        fetchBases();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditOpen = (item: any) => {
    setEditItem(item);
    if (activeSubTab === "clientes") {
      setClientForm({
        codigo: item.codigo,
        razaoSocial: item.razaoSocial,
        nomeFantasia: item.nomeFantasia,
        cnpj: item.cnpj || "",
        cidade: item.cidade,
        uf: item.uf,
        telefone: item.telefone || "",
        canalVenda: item.canalVenda,
        vendedor: item.vendedor,
        supervisor: item.supervisor,
        gerente: item.gerente,
        areaResponsavel: item.areaResponsavel,
        situacao: item.situacao,
        unidadeId: item.unidadeId
      });
    } else if (activeSubTab === "motoristas") {
      setDriverForm({
        matricula: item.matricula,
        nome: item.nome,
        telefone: item.telefone,
        funcao: item.funcao || "Motorista",
        unidadeId: item.unidadeId,
        status: item.status || "Ativo"
      });
    } else if (activeSubTab === "hierarquia") {
      setHierarchyForm({
        vendedor: item.vendedor,
        supervisor: item.supervisor,
        gerente: item.gerente,
        area: item.area || "Vendas",
        canal: item.canal || "Rotas",
        telefone: item.telefone || "",
        email: item.email || "",
        status: item.status || "Ativo",
        unidadeId: item.unidadeId
      });
    } else if (activeSubTab === "motivos") {
      setReasonForm({
        codigo: item.codigo,
        descricao: item.descricao
      });
    }
    setIsModalOpen(true);
  };

  const handleAddOpen = () => {
    setEditItem(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Bases Inner Menu Tabs */}
      <div className="flex border-b border-slate-800">
        {[
          { id: "clientes", label: "Base de Clientes", icon: Users },
          { id: "motoristas", label: "Base de Motoristas", icon: UserCheck },
          { id: "hierarquia", label: "Hierarquia Comercial", icon: Key },
          { id: "motivos", label: "Motivos Heineken", icon: ShieldAlert }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id as any);
                setSearch("");
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold font-mono tracking-wider border-b-2 transition-all ${
                isActive 
                  ? "border-sky-500 text-sky-400 bg-sky-500/5 font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Control Actions */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder={`Buscar em ${activeSubTab}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-sky-500 rounded-lg pl-9 pr-4 py-2 text-xs font-mono text-slate-300"
          />
        </div>

        <button
          onClick={handleAddOpen}
          className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors font-mono"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Adicionar Registro
        </button>
      </div>

      {/* Tables based on selection */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs">
        {activeSubTab === "clientes" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                  <th className="py-3 px-4">Cód. PDV</th>
                  <th className="py-3 px-4">Nome Fantasia / Razão Social</th>
                  <th className="py-3 px-4">Filial</th>
                  <th className="py-3 px-4">Canal</th>
                  <th className="py-3 px-4">Vendedor RCA</th>
                  <th className="py-3 px-4">Supervisor / Gerente</th>
                  <th className="py-3 px-4 text-center">Situação</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {clientes.filter(c => !search || c.codigo.toLowerCase().includes(search.toLowerCase()) || c.nomeFantasia.toLowerCase().includes(search.toLowerCase()) || c.vendedor?.toLowerCase().includes(search.toLowerCase())).map(c => (
                  <tr key={c.id} className="hover:bg-slate-800/10">
                    <td className="py-3 px-4 font-bold text-sky-400">{c.codigo}</td>
                    <td className="py-3 px-4">
                      <div className="text-slate-200 font-semibold">{c.nomeFantasia}</div>
                      <div className="text-[10px] text-slate-500">{c.razaoSocial}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{unidades.find(u => u.id === c.unidadeId)?.nome || c.unidadeId}</td>
                    <td className="py-3 px-4 text-slate-400">{c.canalVenda}</td>
                    <td className="py-3 px-4 text-slate-300">{c.vendedor}</td>
                    <td className="py-3 px-4">
                      <div className="text-slate-300">{c.supervisor}</div>
                      <div className="text-[10px] text-slate-500">{c.gerente}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${c.situacao === "Ativo" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-500"}`}>{c.situacao}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => handleEditOpen(c)} className="p-1 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(c.id)} className="p-1 bg-slate-850 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeSubTab === "motoristas" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                  <th className="py-3 px-4">Matrícula</th>
                  <th className="py-3 px-4">Nome Completo</th>
                  <th className="py-3 px-4">Filial</th>
                  <th className="py-3 px-4">Contato / Telefone</th>
                  <th className="py-3 px-4">Função</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {motoristas.filter(m => !search || m.matricula.toLowerCase().includes(search.toLowerCase()) || m.nome.toLowerCase().includes(search.toLowerCase())).map(m => (
                  <tr key={m.id} className="hover:bg-slate-800/10">
                    <td className="py-3 px-4 font-bold text-sky-400">{m.matricula}</td>
                    <td className="py-3 px-4 text-slate-200 font-semibold">{m.nome}</td>
                    <td className="py-3 px-4 text-slate-400">{unidades.find(u => u.id === m.unidadeId)?.nome || m.unidadeId}</td>
                    <td className="py-3 px-4 text-slate-300">{m.telefone || "Não cadastrado"}</td>
                    <td className="py-3 px-4 text-slate-400">{m.funcao}</td>
                    <td className="py-3 px-4 text-center font-bold">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] ${m.status === "Ativo" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-500"}`}>{m.status}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => handleEditOpen(m)} className="p-1 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(m.id)} className="p-1 bg-slate-850 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeSubTab === "hierarquia" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                  <th className="py-3 px-4">Vendedor RCA</th>
                  <th className="py-3 px-4">Supervisor Responsável</th>
                  <th className="py-3 px-4">Gerente de Vendas</th>
                  <th className="py-3 px-4">Canal / Região</th>
                  <th className="py-3 px-4">Filial</th>
                  <th className="py-3 px-4">Contato Vendedor</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {hierarquias.filter(h => !search || h.vendedor.toLowerCase().includes(search.toLowerCase()) || h.supervisor.toLowerCase().includes(search.toLowerCase())).map(h => (
                  <tr key={h.id} className="hover:bg-slate-800/10">
                    <td className="py-3 px-4 text-slate-200 font-bold">{h.vendedor}</td>
                    <td className="py-3 px-4 text-slate-300">{h.supervisor}</td>
                    <td className="py-3 px-4 text-slate-400">{h.gerente}</td>
                    <td className="py-3 px-4 text-slate-400">{h.canal}</td>
                    <td className="py-3 px-4 text-slate-400">{unidades.find(u => u.id === h.unidadeId)?.nome || h.unidadeId}</td>
                    <td className="py-3 px-4 text-slate-400">{h.telefone || "Não cadastrado"}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${h.status === "Ativo" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-500"}`}>{h.status}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => handleEditOpen(h)} className="p-1 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(h.id)} className="p-1 bg-slate-850 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeSubTab === "motivos" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                  <th className="py-3 px-4">Código Motivo (Heineken)</th>
                  <th className="py-3 px-4">Descrição das Regras do Ocorrido</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {motivos.filter(m => !search || m.codigo.toLowerCase().includes(search.toLowerCase()) || m.descricao.toLowerCase().includes(search.toLowerCase())).map(m => (
                  <tr key={m.id} className="hover:bg-slate-800/10">
                    <td className="py-3 px-4 font-extrabold text-sky-400">{m.codigo}</td>
                    <td className="py-3 px-4 text-slate-200">{m.descricao}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => handleEditOpen(m)} className="p-1 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(m.id)} className="p-1 bg-slate-850 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dynamic CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-850 w-full max-w-lg rounded-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-850 flex items-center justify-between bg-slate-900/40">
              <h3 className="text-xs font-bold text-slate-100 font-mono uppercase tracking-wider">
                {editItem ? "Editar" : "Adicionar"} - {activeSubTab.toUpperCase()}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-100 font-bold font-mono">Fechar [X]</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {activeSubTab === "clientes" && (
                <div className="space-y-4 text-xs font-mono">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-slate-400 font-semibold block uppercase">Cód. PDV</span>
                      <input type="text" value={clientForm.codigo} onChange={(e) => setClientForm(prev => ({ ...prev, codigo: e.target.value }))} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100" required disabled={!!editItem} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 font-semibold block uppercase">Nome Fantasia</span>
                      <input type="text" value={clientForm.nomeFantasia} onChange={(e) => setClientForm(prev => ({ ...prev, nomeFantasia: e.target.value }))} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100" required />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 font-semibold block uppercase">Razão Social</span>
                    <input type="text" value={clientForm.razaoSocial} onChange={(e) => setClientForm(prev => ({ ...prev, razaoSocial: e.target.value }))} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-slate-400 font-semibold block uppercase">Vendedor RCA</span>
                      <input type="text" value={clientForm.vendedor} onChange={(e) => setClientForm(prev => ({ ...prev, vendedor: e.target.value }))} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100" required />
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 font-semibold block uppercase">Supervisor</span>
                      <input type="text" value={clientForm.supervisor} onChange={(e) => setClientForm(prev => ({ ...prev, supervisor: e.target.value }))} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-slate-400 font-semibold block uppercase">Gerente de Vendas</span>
                      <input type="text" value={clientForm.gerente} onChange={(e) => setClientForm(prev => ({ ...prev, gerente: e.target.value }))} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100" required />
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 font-semibold block uppercase">Filial</span>
                      <select value={clientForm.unidadeId} onChange={(e) => setClientForm(prev => ({ ...prev, unidadeId: e.target.value }))} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100" disabled={currentUser.unidadeId !== "Todas"}>
                        {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeSubTab === "motoristas" && (
                <div className="space-y-4 text-xs font-mono">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-slate-400 font-semibold block uppercase">Matrícula</span>
                      <input type="text" value={driverForm.matricula} onChange={(e) => setDriverForm(prev => ({ ...prev, matricula: e.target.value }))} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100" required disabled={!!editItem} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 font-semibold block uppercase">Nome</span>
                      <input type="text" value={driverForm.nome} onChange={(e) => setDriverForm(prev => ({ ...prev, nome: e.target.value }))} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-slate-400 font-semibold block uppercase">Telefone</span>
                      <input type="text" value={driverForm.telefone} onChange={(e) => setDriverForm(prev => ({ ...prev, telefone: e.target.value }))} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 font-semibold block uppercase">Filial</span>
                      <select value={driverForm.unidadeId} onChange={(e) => setDriverForm(prev => ({ ...prev, unidadeId: e.target.value }))} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100" disabled={currentUser.unidadeId !== "Todas"}>
                        {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeSubTab === "hierarquia" && (
                <div className="space-y-4 text-xs font-mono">
                  <div className="space-y-1">
                    <span className="text-slate-400 font-semibold block uppercase">Nome do Vendedor</span>
                    <input type="text" value={hierarchyForm.vendedor} onChange={(e) => setHierarchyForm(prev => ({ ...prev, vendedor: e.target.value }))} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-slate-400 font-semibold block uppercase">Supervisor</span>
                      <input type="text" value={hierarchyForm.supervisor} onChange={(e) => setHierarchyForm(prev => ({ ...prev, supervisor: e.target.value }))} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100" required />
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 font-semibold block uppercase">Gerente</span>
                      <input type="text" value={hierarchyForm.gerente} onChange={(e) => setHierarchyForm(prev => ({ ...prev, gerente: e.target.value }))} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-slate-400 font-semibold block uppercase">Canal</span>
                      <input type="text" value={hierarchyForm.canal} onChange={(e) => setHierarchyForm(prev => ({ ...prev, canal: e.target.value }))} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100" required />
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 font-semibold block uppercase">Filial</span>
                      <select value={hierarchyForm.unidadeId} onChange={(e) => setHierarchyForm(prev => ({ ...prev, unidadeId: e.target.value }))} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100" disabled={currentUser.unidadeId !== "Todas"}>
                        {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeSubTab === "motivos" && (
                <div className="space-y-4 text-xs font-mono">
                  <div className="space-y-1">
                    <span className="text-slate-400 font-semibold block uppercase">Código do Motivo (ex: Y40)</span>
                    <input type="text" value={reasonForm.codigo} onChange={(e) => setReasonForm(prev => ({ ...prev, codigo: e.target.value }))} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100" required disabled={!!editItem} />
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 font-semibold block uppercase">Regras da Ocorrência / Descrição</span>
                    <input type="text" value={reasonForm.descricao} onChange={(e) => setReasonForm(prev => ({ ...prev, descricao: e.target.value }))} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100" required />
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-850">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-400 text-xs font-bold rounded-lg font-mono">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-slate-950 text-xs font-bold rounded-lg font-mono">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
