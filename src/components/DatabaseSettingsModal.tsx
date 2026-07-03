import React, { useState, useEffect } from "react";
import { Database, ShieldAlert, CheckCircle, RefreshCw, Copy, AlertTriangle, Cloud, Settings, Compass, Info } from "lucide-react";

interface DatabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
}

export default function DatabaseSettingsModal({ isOpen, onClose, currentUser }: DatabaseSettingsModalProps) {
  const [status, setStatus] = useState<{ configured: boolean; connected: boolean; error: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const sqlCode = `-- Execute exatamente este comando no SQL Editor do seu Dashboard do Supabase:
CREATE TABLE IF NOT EXISTS ampla_database (
  chave TEXT PRIMARY KEY,
  valor JSONB,
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilite as politicas de acesso livre para permitir salvamento instantaneo:
ALTER TABLE ampla_database ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir tudo para todos por simplicidade" ON ampla_database FOR ALL USING (true) WITH CHECK (true);
`;

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/database/status");
      if (!res.ok) throw new Error("Erro ao obter status do banco de dados.");
      const data = await res.json();
      if (data.success) {
        setStatus({
          configured: data.configured,
          connected: data.connected,
          error: data.error
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Não foi possível conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setSuccessMsg(null);
    }
  }, [isOpen]);

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const res = await fetch("/api/database/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": currentUser?.email || "sistema"
        }
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        setStatus(data.status);
      } else {
        throw new Error(data.message || "Falha na sincronização.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erro de conexão ao sincronizar.");
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col scale-in font-sans">
        
        {/* Header */}
        <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Persistência em Nuvem (Supabase)</h2>
              <p className="text-[10px] text-slate-400 leading-none">Integração do Banco de Dados Relacional</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-slate-300 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          
          {/* Alerta de Desaparecimento de Dados */}
          <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/15 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-400">Por que meus dados de ontem sumiram?</h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Este ambiente do AI Studio executa sobre contêineres de nuvem **efêmeros** (descartáveis). Qualquer informação inserida enquanto o sistema estiver usando o banco local (`database.json`) é deletada permanentemente quando o servidor reinicia por inatividade ou quando o código é recompilado.
              </p>
              <p className="text-[11px] text-sky-400 font-semibold leading-relaxed mt-1">
                ✔ Para evitar novas perdas de dados, integre o seu projeto com o seu próprio **Supabase**! O Supabase opera em nuvem persistente (permanente e segura).
              </p>
            </div>
          </div>

          {/* Status Real */}
          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-sky-400" />
              Estado Atual da Conexão
            </h4>

            {loading ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono py-2">
                <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                Inspecionando estado do banco híbrido...
              </div>
            ) : status ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Configured Status */}
                <div className="p-3 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Variáveis de Ambiente:</span>
                  {status.configured ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/10 uppercase font-mono text-[10px]">
                      Configuradas
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold border border-rose-500/10 uppercase font-mono text-[10px]">
                      Pendentes
                    </span>
                  )}
                </div>

                {/* Connection Status */}
                <div className="p-3 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Status Handshake:</span>
                  {status.connected ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/10 uppercase font-mono text-[10px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Conectado
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/10 uppercase font-mono text-[10px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      Local JSON Fallback
                    </span>
                  )}
                </div>
              </div>
            ) : null}

            {/* Error messaging */}
            {status && !status.configured && (
              <div className="p-3 rounded bg-slate-900 text-[11px] text-slate-400 leading-relaxed space-y-2 border border-slate-800">
                <p>
                  💡 Para configurar o **Supabase**, clique no menu de engrenagem / **Settings** no topo direito da tela do AI Studio e adicione duas novas chaves nos **Secrets/Environment Variables**:
                </p>
                <div className="space-y-1 pl-3 font-mono text-[10px] text-sky-400">
                  <div>• <span className="text-white font-bold select-all">SUPABASE_URL</span> = <span className="text-slate-500">Ex: https://xxxx.supabase.co</span></div>
                  <div>• <span className="text-white font-bold select-all">SUPABASE_ANON_KEY</span> = <span className="text-slate-500">Ex: (sua anon ou service role key)</span></div>
                </div>
              </div>
            )}

            {/* If configured check fails */}
            {status && status.configured && !status.connected && (
              <div className="p-3 rounded bg-rose-950/10 text-rose-300 font-mono text-[10px] border border-rose-500/15 space-y-1">
                <p className="font-bold">⚠️ Conexão Falhou:</p>
                <p>{status.error || "A tabela 'ampla_database' não foi encontrada no seu banco do Supabase. É necessário criá-la conforme as instruções abaixo."}</p>
              </div>
            )}
          </div>

          {/* Script de criação */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-sky-400" />
                Script SQL para o Supabase
              </h4>
              <button
                onClick={handleCopy}
                className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? "Copiado!" : "Copiar Script"}
              </button>
            </div>
            <div className="relative">
              <pre className="p-4 bg-slate-950 rounded bg-slate-950 text-[10px] font-mono text-slate-300 overflow-x-auto border border-slate-850 max-h-[160px] scrollbar-thin leading-relaxed">
                {sqlCode}
              </pre>
            </div>
            <p className="text-[10px] text-slate-400 italic">
              * Abra o painel do seu projeto no Supabase, clique em **SQL Editor**, selecione **New Query**, cole o código acima e pressione **Run**.
            </p>
          </div>

        </div>

        {/* Action Status Panel */}
        {errorMsg && (
          <div className="px-6 py-2.5 bg-rose-500/10 text-rose-400 text-xs font-semibold border-t border-slate-800">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="px-6 py-2.5 bg-emerald-500/10 text-emerald-400 text-xs font-semibold border-t border-slate-800">
            {successMsg}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-slate-800 px-6 py-4 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Info className="w-3.5 h-3.5 text-sky-400" />
            <span>O banco de dados híbrido mantém cache para carregamento instantâneo.</span>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="px-4 py-2 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-lg border border-slate-800 transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Testar Conexão
            </button>
            {status?.configured && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-sky-600/10"
              >
                <Cloud className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Sincronizando..." : "Sincronizar Agora"}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition border border-slate-700 cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
