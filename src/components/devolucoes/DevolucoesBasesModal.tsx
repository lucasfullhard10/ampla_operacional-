import React, { useState } from "react";
import { X, Database, Users, UserCheck, HelpCircle, Layers, Plus, Search, Trash2, Edit3 } from "lucide-react";
import { DevolucaoCliente, DevolucaoMotorista, DevolucaoMotivo } from "../../types";

interface BasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientes: DevolucaoCliente[];
  motoristas: DevolucaoMotorista[];
  motivos: DevolucaoMotivo[];
  hierarquia: any[];
  onRefresh: () => void;
  currentUser: any;
}

export default function DevolucoesBasesModal({
  isOpen,
  onClose,
  clientes = [],
  motoristas = [],
  motivos = [],
  hierarquia = [],
  onRefresh,
  currentUser
}: BasesModalProps) {
  const [activeTab, setActiveTab] = useState<"clientes" | "motoristas" | "motivos" | "hierarquia">("clientes");
  const [search, setSearch] = useState("");

  if (!isOpen) return null;

  // Filtered lists
  const filteredClientes = clientes.filter(c => 
    !search || 
    c.codigo.toLowerCase().includes(search.toLowerCase()) ||
    c.nomeFantasia?.toLowerCase().includes(search.toLowerCase()) ||
    c.razaoSocial?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredMotoristas = motoristas.filter(m => 
    !search || 
    m.nome.toLowerCase().includes(search.toLowerCase()) ||
    m.matricula?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredMotivos = motivos.filter(m => 
    !search || 
    m.codigo.toLowerCase().includes(search.toLowerCase()) ||
    m.descricao.toLowerCase().includes(search.toLowerCase())
  );

  const filteredHierarquia = hierarquia.filter(h => 
    !search || 
    h.vendedor?.toLowerCase().includes(search.toLowerCase()) ||
    h.supervisor?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-mono tracking-tight">
                Bases Cadastrais do Sistema AMPLA
              </h2>
              <p className="text-xs text-slate-400">Consulta das tabelas oficiais utilizadas na auto-preenchimento das devoluções.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between p-4 bg-slate-950/30 border-b border-slate-800 gap-4">
          <div className="flex items-center gap-2">
            {[
              { id: "clientes", label: `Clientes (${clientes.length})`, icon: Users },
              { id: "motoristas", label: `Motoristas (${motoristas.length})`, icon: UserCheck },
              { id: "motivos", label: `Motivos (${motivos.length})`, icon: HelpCircle },
              { id: "hierarquia", label: `Hierarquia (${hierarquia.length})`, icon: Layers }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setSearch("");
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                    isActive 
                      ? "bg-indigo-500 text-slate-950 shadow-md shadow-indigo-500/10" 
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Pesquisar registro..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none font-mono"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs font-mono text-slate-200 flex-1">
          {/* CLIENTES TAB */}
          {activeTab === "clientes" && (
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold">
                    <th className="p-3">Código</th>
                    <th className="p-3">Nome Fantasia / Razão Social</th>
                    <th className="p-3">Cidade/UF</th>
                    <th className="p-3">Vendedor</th>
                    <th className="p-3">Supervisor</th>
                    <th className="p-3">Gerente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredClientes.slice(0, 50).map(c => (
                    <tr key={c.codigo} className="hover:bg-slate-800/30">
                      <td className="p-3 font-bold text-indigo-400">{c.codigo}</td>
                      <td className="p-3 font-semibold text-slate-100">{c.nomeFantasia || c.razaoSocial}</td>
                      <td className="p-3 text-slate-400">{c.cidade} - {c.uf}</td>
                      <td className="p-3 text-slate-300">{c.vendedor || "Não informado"}</td>
                      <td className="p-3 text-slate-300">{c.supervisor || "Não informado"}</td>
                      <td className="p-3 text-slate-300">{c.gerente || "Não informado"}</td>
                    </tr>
                  ))}
                  {filteredClientes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">Nenhum cliente cadastrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* MOTORISTAS TAB */}
          {activeTab === "motoristas" && (
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold">
                    <th className="p-3">Matrícula</th>
                    <th className="p-3">Nome Completo</th>
                    <th className="p-3">Telefone</th>
                    <th className="p-3">Filial</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredMotoristas.map(m => (
                    <tr key={m.matricula || m.id} className="hover:bg-slate-800/30">
                      <td className="p-3 font-bold text-indigo-400">{m.matricula || m.id}</td>
                      <td className="p-3 font-semibold text-slate-100">{m.nome}</td>
                      <td className="p-3 text-slate-400">{m.telefone || "Não informado"}</td>
                      <td className="p-3 text-slate-300">{m.unidadeId || "Goiânia"}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {m.status || "Ativo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* MOTIVOS TAB */}
          {activeTab === "motivos" && (
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold">
                    <th className="p-3">Código (Y-Code)</th>
                    <th className="p-3">Descrição Oficial Heineken</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredMotivos.map(m => (
                    <tr key={m.codigo} className="hover:bg-slate-800/30">
                      <td className="p-3 font-bold text-indigo-400">{m.codigo}</td>
                      <td className="p-3 font-semibold text-slate-100">{m.descricao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* HIERARQUIA TAB */}
          {activeTab === "hierarquia" && (
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold">
                    <th className="p-3">Vendedor</th>
                    <th className="p-3">Supervisor</th>
                    <th className="p-3">Gerente</th>
                    <th className="p-3">Área</th>
                    <th className="p-3">Canal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredHierarquia.map((h, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="p-3 font-bold text-indigo-400">{h.vendedor || "Não informado"}</td>
                      <td className="p-3 text-slate-200">{h.supervisor || "Não informado"}</td>
                      <td className="p-3 text-slate-200">{h.gerente || "Não informado"}</td>
                      <td className="p-3 text-slate-400">{h.area || "Geral"}</td>
                      <td className="p-3 text-slate-400">{h.canal || "Rotas"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-slate-800 bg-slate-950/50">
          <button onClick={onClose} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs font-mono">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
