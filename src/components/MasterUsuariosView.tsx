import React, { useState, useEffect } from "react";
import { Plus, Trash2, Shield, Search, User, Mail, Phone, Lock, Edit3, Key, AlertTriangle, ShieldCheck } from "lucide-react";
import { Unidade, Usuario } from "../types";
import { NotificationModal, ConfirmModal, NotificationType, ConfirmType } from "./NotificationModal";

interface MasterUsuariosProps {
  unidades: Unidade[];
  userEmail: string;
  onRefresh?: () => void;
}

const TIPO_USUARIO_OPTIONS = [
  "MASTER",
  "SUPERVISOR",
  "OPERADOR",
  "CONFERENTE",
  "MOTORISTA",
  "FINANCEIRO",
  "ADMINISTRATIVO"
] as const;

export default function MasterUsuariosView({ unidades, userEmail, onRefresh }: MasterUsuariosProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Form states (Create / Edit)
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState(""); // This is used as the "Usuário" field
  const [senha, setSenha] = useState("");
  const [cargo, setCargo] = useState("");
  const [unidadeId, setUnidadeId] = useState("");
  const [tipoUsuario, setTipoUsuario] = useState<(typeof TIPO_USUARIO_OPTIONS)[number]>("OPERADOR");
  const [status, setStatus] = useState<"ativo" | "inativo">("ativo");

  // Notifications
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmType | null>(null);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/usuarios", {
        headers: { "x-user-email": userEmail }
      });
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data);
      }
    } catch (err) {
      console.error("Erro ao listar usuários:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  useEffect(() => {
    if (!unidadeId && unidades.length > 0) {
      setUnidadeId(unidades[0].id);
    }
  }, [unidades, unidadeId]);

  const resetForm = () => {
    setEditingUserId(null);
    setNome("");
    setCpf("");
    setTelefone("");
    setEmail("");
    setSenha("");
    setCargo("");
    setUnidadeId(unidades[0]?.id || "");
    setTipoUsuario("OPERADOR");
    setStatus("ativo");
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || (!editingUserId && !senha.trim()) || !unidadeId) {
      setNotification({
        type: "error",
        message: "Por favor, preencha os campos obrigatórios (Nome, Usuário, Unidade de Referência)."
      });
      return;
    }

    try {
      const payload = {
        nome: nome.trim(),
        cpf: cpf.trim(),
        telefone: telefone.trim(),
        email: email.trim(),
        senha: senha ? senha.trim() : undefined,
        cargo: cargo.trim(),
        unidade_id: unidadeId,
        tipo_usuario: tipoUsuario,
        status,
        unidadesPermitidas: [unidadeId]
      };

      const url = editingUserId ? `/api/usuarios/${editingUserId}` : "/api/usuarios";
      const method = editingUserId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setNotification({
          type: "success",
          message: editingUserId 
            ? "✅ Dados do usuário atualizados com sucesso." 
            : `✅ Usuário criado com sucesso. Credencial de acesso: ${email}`
        });
        resetForm();
        fetchUsuarios();
      } else {
        const errorData = await res.json();
        setNotification({
          type: "error",
          message: `🚫 Não foi possível salvar o usuário. Motivo: ${errorData.error || "Operação rejeitada"}`
        });
      }
    } catch (err) {
      setNotification({
        type: "error",
        message: "❌ Conexão indisponível com a API."
      });
    }
  };

  const startEdit = (user: Usuario) => {
    setEditingUserId(user.id);
    setNome(user.nome);
    setCpf(user.cpf || "");
    setTelefone(user.telefone || "");
    setEmail(user.email);
    setSenha(""); // leave blank for password change option
    setCargo(user.cargo || "");
    setUnidadeId(user.unidadeId || user.unidade_id || "");
    setTipoUsuario(user.tipo_usuario || "OPERADOR");
    setStatus(user.status || "ativo");
  };

  const handleDelete = (user: Usuario) => {
    setConfirmDialog({
      message: `TEM CERTEZA de que deseja EXCLUIR permanentemente o usuário "${user.nome}" (${user.email})? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/usuarios/${user.id}`, {
            method: "DELETE",
            headers: { "x-user-email": userEmail }
          });
          if (res.ok) {
            setNotification({
              type: "success",
              message: "✅ Usuário excluído com sucesso."
            });
            fetchUsuarios();
          } else {
            const data = await res.json();
            setNotification({
              type: "error",
              message: `🚫 Erro: ${data.error || "Ação não autorizada."}`
            });
          }
        } catch (e) {
          setNotification({ type: "error", message: "❌ Falha operacional de rede." });
        }
      }
    });
  };

  const toggleBlockStatus = async (user: Usuario) => {
    const nextStatus = user.status === "ativo" ? "inativo" : "ativo";
    const confirmText = nextStatus === "inativo" 
      ? `Suspender e bloquear temporariamente o acesso do usuário "${user.nome}"?`
      : `Reativar o acesso do usuário "${user.nome}"?`;

    setConfirmDialog({
      message: confirmText,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/usuarios/${user.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "x-user-email": userEmail
            },
            body: JSON.stringify({ status: nextStatus })
          });
          if (res.ok) {
            setNotification({
              type: "success",
              message: `✅ Usuário modificado para: ${nextStatus === "inativo" ? "Bloqueado" : "Ativo"}.`
            });
            fetchUsuarios();
          } else {
            const data = await res.json();
            setNotification({ type: "error", message: `🚫 Erro: ${data.error}` });
          }
        } catch (e) {
          setNotification({ type: "error", message: "❌ Falha operacional." });
        }
      }
    });
  };

  const filtered = usuarios.filter(u => 
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.cargo && u.cargo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FORM PANEL */}
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 h-fit space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5 font-mono uppercase">
              <Shield className="w-4 h-4 text-sky-450 animate-pulse" />
              {editingUserId ? "Editar Usuário" : "Novo Usuário"}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">
              {editingUserId ? "Edite as credenciais corporativas e dados cadastrais." : "Cadastre novos operadores e supervisores no portal Ampla."}
            </p>
          </div>

          <form onSubmit={handleCreateOrUpdate} className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400 block font-mono">Nome Completo *</label>
              <input
                type="text"
                required
                placeholder="Ex: Lucas Miranda"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">CPF</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Telefone</label>
                <input
                  type="text"
                  placeholder="(62) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Cargo / Função</label>
                <input
                  type="text"
                  placeholder="Ex: Supervisor"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-mono">Usuario / Login *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: lucas.miranda"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 block font-mono">
                {editingUserId ? "Nova Senha (deixe em branco se mantida)" : "Senha de Acesso *"}
              </label>
              <input
                type="password"
                required={!editingUserId}
                placeholder={editingUserId ? "Alterar senha..." : "Definir senha..."}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-slate-400 block font-mono font-medium">Unidade Sede *</label>
                <select
                  value={unidadeId}
                  onChange={(e) => setUnidadeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white text-xs outline-none cursor-pointer"
                  required
                >
                  <option value="">Selecionar...</option>
                  <option value="Todas">★ Todas (Visualização Geral)</option>
                  {unidades.map(u => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-mono font-medium">Tipo Usuário *</label>
                <select
                  value={tipoUsuario}
                  onChange={(e) => setTipoUsuario(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white text-xs outline-none cursor-pointer"
                >
                  {TIPO_USUARIO_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 block font-mono font-medium">Status da Conta *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white text-xs outline-none cursor-pointer"
              >
                <option value="ativo">Conta Ativada (Acesso Liberado)</option>
                <option value="inativo">Bloqueada / Suspensa</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              {editingUserId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2 bg-slate-950 hover:bg-slate-850 text-slate-400 rounded transition border border-slate-800 font-bold font-mono text-[10px] cursor-pointer"
                >
                  CANCELAR
                </button>
              )}
              <button
                type="submit"
                className="flex-1 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded transition font-mono text-[10px] uppercase cursor-pointer"
              >
                {editingUserId ? "SALVAR ALTERAÇÕES" : "CADASTRAR USUÁRIO"}
              </button>
            </div>
          </form>
        </div>

        {/* LIST TABLE PANEL */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Pesquise por nome, e-mail/usuário ou cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-slate-700 font-sans"
              />
            </div>
            <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
              {filtered.length} usuário(s) corporativo(s)
            </span>
          </div>

          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-mono font-semibold uppercase text-[9px] border-b border-slate-800/80">
                    <th className="p-3">Identificação</th>
                    <th className="p-3">Contato / CPF</th>
                    <th className="p-3">Cargo / Perfil</th>
                    <th className="p-3">Unidade Sede</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filtered.map(u => {
                    const matchedUnit = unidades.find(un => un.id === u.unidadeId || un.id === u.unidade_id);
                    const isBlocked = u.status === "inativo";
                    return (
                      <tr key={u.id} className="hover:bg-slate-850/20">
                        <td className="p-3">
                          <span className="text-white font-medium block">{u.nome}</span>
                          <span className="text-[9.5px] text-slate-500 font-mono block mt-0.5">{u.email}</span>
                        </td>
                        <td className="p-3 font-mono text-[10px] space-y-0.5 text-slate-400">
                          {u.telefone && <div className="flex items-center gap-1">📞 {u.telefone}</div>}
                          {u.cpf && <div className="flex items-center gap-1">🪪 {u.cpf}</div>}
                        </td>
                        <td className="p-3">
                          <span className="text-slate-350 block font-medium">{u.cargo || "Operador"}</span>
                          <span className="px-1.5 py-0.5 mt-1 inline-block rounded text-[8px] bg-slate-950 text-sky-400 font-mono uppercase font-bold border border-slate-800/50">
                            {u.tipo_usuario || "OPERADOR"}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-slate-300">
                          {u.unidadeId === "Todas" ? "★ Consolidada" : (matchedUnit?.nome || "Goiânia")}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => toggleBlockStatus(u)}
                            className={`px-2 py-0.5 rounded text-[8.5px] font-mono uppercase font-bold border cursor-pointer ${
                              isBlocked 
                                ? "bg-rose-500/10 text-rose-450 border-rose-500/20" 
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            }`}
                          >
                            {isBlocked ? "Bloqueado" : "Ativo"}
                          </button>
                        </td>
                        <td className="p-3 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => startEdit(u)}
                            className="p-1 px-1.5 bg-slate-950 hover:bg-sky-550/10 text-sky-450 rounded border border-slate-800 cursor-pointer"
                            title="Editar Dados"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            className="p-1 bg-slate-950 hover:bg-rose-550/10 text-slate-500 hover:text-rose-400 rounded border border-slate-800 cursor-pointer"
                            title="Excluir Usuário"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {loading && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 font-mono text-xs">
                        Buscando dados no sistema central da Ampla...
                      </td>
                    </tr>
                  )}
                  {filtered.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 font-mono text-xs">
                        Nenhum usuário coincide com as definições de pesquisa.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      <NotificationModal notification={notification} onClose={() => setNotification(null)} />
      <ConfirmModal confirm={confirmDialog} onClose={() => setConfirmDialog(null)} />
    </div>
  );
}
