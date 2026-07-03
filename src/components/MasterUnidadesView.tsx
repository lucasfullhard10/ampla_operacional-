import React, { useState, useEffect } from "react";
import { Plus, Globe, Shield, MapPin, Search, User, Mail, Phone, Edit, ToggleLeft, ToggleRight, Trash } from "lucide-react";
import { Unidade, Usuario } from "../types";
import { NotificationModal, ConfirmModal, NotificationType, ConfirmType } from "./NotificationModal";

interface MasterUnidadesProps {
  unidades: Unidade[];
  onRefresh: () => void;
  userEmail: string;
}

export default function MasterUnidadesView({ unidades, onRefresh, userEmail }: MasterUnidadesProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  // Form Fields
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("GO");
  const [endereco, setEndereco] = useState("");
  const [status, setStatus] = useState<"ativo" | "inativo">("ativo");
  const [supervisor, setSupervisor] = useState("");
  const [usuarioResponsavel, setUsuarioResponsavel] = useState("");

  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setEditingUnitId(null);
    setNome("");
    setCodigo("");
    setCidade("");
    setEstado("GO");
    setEndereco("");
    setStatus("ativo");
    setSupervisor("");
    setUsuarioResponsavel("");
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !codigo.trim() || !cidade.trim() || !estado.trim() || !endereco.trim()) {
      setNotification({
        type: "error",
        message: "Por favor, preencha todos os campos obrigatórios (Nome, Código, Cidade, Estado, Endereço e Status)."
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        nome: nome.trim(),
        codigo: codigo.trim(),
        cidade: cidade.trim(),
        estado,
        endereco: endereco.trim(),
        status,
        supervisor: supervisor.trim() || undefined,
        usuarioResponsavel: usuarioResponsavel.trim() || undefined
      };

      const url = editingUnitId ? `/api/unidades/${editingUnitId}` : "/api/unidades";
      const method = editingUnitId ? "PUT" : "POST";

      const r = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail
        },
        body: JSON.stringify(payload)
      });

      if (r.ok) {
        const data = await r.json();
        let successText = editingUnitId 
          ? "✅ Registro de filial atualizado com sucesso." 
          : `✅ Unidade cadastrada com sucesso (Nome: ${nome}, Código: ${codigo})`;
        
        if (data.generatedUser) {
          successText += `\n\nLogin de supervisor gerado automaticamente:\nUsuário: ${data.generatedUser.email}\nSenha: ${data.generatedUser.senha}`;
        }

        setNotification({ type: "success", message: successText });
        resetForm();
        onRefresh();
      } else {
        const err = await r.json();
        setNotification({
          type: "error",
          message: `🚫 Erro: ${err.error || "Operação recusada."}`
        });
      }
    } catch (err) {
      setNotification({ type: "error", message: "❌ Servidor ou API de rede indisponível." });
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (u: Unidade) => {
    setEditingUnitId(u.id);
    setNome(u.nome);
    setCodigo(u.codigo || "");
    setCidade(u.cidade);
    setEstado(u.estado);
    setEndereco(u.endereco || "");
    setStatus(u.status || "ativo");
    setSupervisor(u.supervisor || "");
    setUsuarioResponsavel(u.usuarioResponsavel || "");
  };

  const handleDelete = (u: Unidade) => {
    setConfirmDialog({
      message: `ATENÇÃO: Desabilitar e inativar o acesso da Unidade "${u.nome}" irá remover sua visualização para os demais operadores. Deseja prosseguir?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/unidades/${u.id}`, {
            method: "DELETE",
            headers: { "x-user-email": userEmail }
          });
          if (res.ok) {
            setNotification({
              type: "success",
              message: `✅ Unidade "${u.nome}" integrada para status INATIVO com sucesso.`
            });
            onRefresh();
          } else {
            const data = await res.json();
            setNotification({ type: "error", message: `🚫 Erro: ${data.error}` });
          }
        } catch (e) {
          setNotification({ type: "error", message: "❌ Erro operacional na conexão." });
        }
      }
    });
  };

  const filtered = unidades.filter(u =>
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.cidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.codigo && u.codigo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* CADASTRO / EDIÇÃO FORM */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl h-fit space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-white tracking-tight uppercase font-mono flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-sky-400 animate-pulse" />
              {editingUnitId ? "Editar Unidade" : "Adicionar Unidade"}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">
              Os campos marcados com (*) são de preenchimento obrigatório pelo administrador.
            </p>
          </div>

          <form onSubmit={handleCreateOrUpdate} className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400 block font-mono">Nome Comercial da Unidade *</label>
              <input
                type="text"
                required
                placeholder="Ex: Goiânia - Matriz"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Código da Filial *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: AMPLA-GO01"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Status Operacional *</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs outline-none cursor-pointer"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Cidade *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Goiânia"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">UF (Estado) *</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs outline-none cursor-pointer"
                >
                  {["GO", "DF", "MG", "SP", "RJ", "ES", "BA", "PE", "PR", "SC", "RS", "MS", "MT", "TO"].map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 block font-mono font-medium">Endereço Completo de Carga *</label>
              <textarea
                required
                rows={2}
                placeholder="Ex: Av. Goiás, Km 15 - Setor Industrial S/N"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs outline-none focus:border-sky-500 resize-none"
              />
            </div>

            <div className="border-t border-slate-800 pt-2.5 mt-1">
              <span className="text-[9.5px] font-mono text-sky-450 uppercase font-bold block mb-2">
                {editingUnitId ? "Supervisor & Login da Filial" : "Auto-Criar Login Supervisor"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-slate-400 block font-mono text-[10px]">Supervisor Geral</label>
                <input
                  type="text"
                  placeholder="Ex: Marcos"
                  value={supervisor}
                  onChange={(e) => setSupervisor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-mono text-[10px]">Usuario Login</label>
                <input
                  type="text"
                  placeholder="Ex: marcos.go"
                  value={usuarioResponsavel}
                  onChange={(e) => setUsuarioResponsavel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2.5">
              {editingUnitId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2 bg-slate-950 text-slate-400 hover:bg-slate-850 rounded font-bold font-mono text-[10px] border border-slate-800 cursor-pointer"
                >
                  CANCELAR
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded font-mono text-[10px] uppercase cursor-pointer"
              >
                {editingUnitId ? "SALVAR ALTERAÇÕES" : "CRIAR UNIDADE"}
              </button>
            </div>
          </form>
        </div>

        {/* LIST GRID CARDS COLUMN */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Pesquise por nome, código filial, cidade ou endereço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-slate-700 font-sans"
              />
            </div>
            <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
              {filtered.length} unidade(s)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(u => {
              const isInactive = u.status === "inativo";
              return (
                <div
                  key={u.id}
                  className={`bg-slate-900 rounded-xl border p-4 flex flex-col justify-between hover:border-slate-700 transition duration-150 relative space-y-3.5 ${
                    isInactive ? "border-slate-800/55 opacity-70" : "border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-950 rounded-lg text-sky-450 border border-slate-850">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-white text-sm font-semibold flex items-center gap-1.5">
                          {u.nome}
                          <span className="text-[9px] text-slate-500 font-mono">({u.codigo || "N/A"})</span>
                        </h4>
                        <div className="text-[9.5px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          <span>{u.cidade} - {u.estado}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(u)}
                        className="p-1.5 bg-slate-950 hover:bg-sky-550/10 text-sky-400 rounded border border-slate-800/80 cursor-pointer"
                        title="Editar Unidade"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="p-1.5 bg-slate-950 hover:bg-rose-550/10 text-slate-500 hover:text-rose-450 rounded border border-slate-800/80 cursor-pointer"
                        title="Desabilitar/Inativar filial"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Address Section */}
                  <div className="bg-slate-950 text-[10.5px] text-slate-400 p-2.5 rounded border border-slate-850 leading-relaxed font-mono">
                    <div className="text-[8.5px] uppercase font-bold text-slate-500 mb-1">🏠 Endereço de Carga:</div>
                    <span>{u.endereco || "Não cadastrado"}</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono border-t border-slate-800/60 pt-2 text-slate-455">
                    <span>STATUS: 
                      <b className={`ml-1 uppercase ${isInactive ? "text-rose-400" : "text-emerald-400"}`}>
                        {u.status || "ativo"}
                      </b>
                    </span>
                    {u.supervisor && (
                      <span className="flex items-center gap-1 text-slate-300">
                        👨‍💼 {u.supervisor}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-500 font-mono text-xs bg-slate-900 border border-slate-800 rounded-xl">
                Nenhuma unidade localizada comercialmente.
              </div>
            )}
          </div>
        </div>

      </div>

      <NotificationModal notification={notification} onClose={() => setNotification(null)} />
      <ConfirmModal confirm={confirmDialog} onClose={() => setConfirmDialog(null)} />
    </div>
  );
}
