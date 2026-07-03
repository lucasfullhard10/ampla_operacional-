var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_config2 = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_vite = require("vite");

// server/database.ts
var import_config = require("dotenv/config");
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_supabase_js = require("@supabase/supabase-js");
var DATA_DIR = import_path.default.join(process.cwd(), "data");
var DB_FILE = import_path.default.join(DATA_DIR, "database.json");
if (!import_fs.default.existsSync(DATA_DIR)) {
  import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
}
var supabaseUrl = process.env.SUPABASE_URL || "";
var supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
console.log("[Supabase Initialization DIAGNOSTICS] URL length:", supabaseUrl ? supabaseUrl.length : 0);
console.log("[Supabase Initialization DIAGNOSTICS] Anon Key length:", supabaseAnonKey ? supabaseAnonKey.length : 0);
if (supabaseUrl && supabaseAnonKey) {
  console.log("[Supabase Initialization DIAGNOSTICS] Initializing Supabase client with URL:", supabaseUrl);
} else {
  console.log("[Supabase Initialization DIAGNOSTICS] Missing SUPABASE_URL or SUPABASE_ANON_KEY. Falling back to local database mode.");
}
var supabase = supabaseUrl && supabaseAnonKey ? (0, import_supabase_js.createClient)(supabaseUrl, supabaseAnonKey) : null;
console.log("[Supabase Initialization DIAGNOSTICS] Supabase Client loaded successfully:", !!supabase);
var DEFAULT_UNIDADES = [
  {
    id: "un-go",
    nome: "Goi\xE2nia - Matriz",
    codigo: "AMPLA-GO01",
    cidade: "Goi\xE2nia",
    estado: "GO",
    endereco: "Av. Perimetral Norte, 3000 - Setor Industrial, Goi\xE2nia - GO",
    status: "ativo",
    supervisor: "Marcos Araujo",
    usuarioResponsavel: "marcos.go",
    created_at: "2026-06-14T12:00:00.000Z",
    updated_at: "2026-06-14T12:00:00.000Z"
  }
];
var DEFAULT_ESTOQUE = [
  { id: "botina", nome: "Botina de Seguran\xE7a", saldo: 0 },
  { id: "casquete", nome: "Casquete", saldo: 0 },
  { id: "capa_chuva", nome: "Capa de Chuva", saldo: 0 },
  { id: "luvas", nome: "Luvas de Vaqueta/Grip", saldo: 0 },
  { id: "cones", nome: "Cones de Sinaliza\xE7\xE3o", saldo: 0 },
  { id: "calcos", nome: "Cal\xE7os de Pneu", saldo: 0 },
  { id: "oculos", nome: "\xD3culos de Prote\xE7\xE3o", saldo: 0 },
  { id: "colete", nome: "Colete Refletivo", saldo: 0 },
  { id: "mangote", nome: "Mangote Anticorte", saldo: 0 }
];
var DEFAULT_CATEGORIES = [
  { id: "cat-agregacao", nome: "Agrega\xE7\xE3o de Motorista" },
  { id: "cat-contratacao", nome: "Contrata\xE7\xE3o" },
  { id: "cat-rh", nome: "RH" },
  { id: "cat-operacao", nome: "Opera\xE7\xE3o" },
  { id: "cat-seguranca", nome: "Seguran\xE7a" },
  { id: "cat-frota", nome: "Frota" },
  { id: "cat-manutencao", nome: "Manuten\xE7\xE3o" },
  { id: "cat-financeiro", nome: "Financeiro" },
  { id: "cat-compras", nome: "Compras" },
  { id: "cat-auditoria", nome: "Auditoria" },
  { id: "cat-projetos", nome: "Projetos" },
  { id: "cat-outros", nome: "Outros" }
];
var DEFAULT_COLUMNS = [
  { id: "novo", nome: "\u{1F4E5} Novo", ordem: 1 },
  { id: "em_andamento", nome: "\u{1F504} Em Andamento", ordem: 2 },
  { id: "aguardando", nome: "\u23F3 Aguardando", ordem: 3 },
  { id: "em_analise", nome: "\u{1F440} Em An\xE1lise", ordem: 4 },
  { id: "pendente", nome: "\u26A0 Pendente", ordem: 5 },
  { id: "concluido", nome: "\u2705 Conclu\xEDdo", ordem: 6 },
  { id: "cancelado", nome: "\u274C Cancelado", ordem: 7 }
];
var INITIAL_DATABASE = {
  usuarios: [
    { id: "usr-lucas-amplalog", email: "Lucas.amplalog", nome: "Lucas (Master)", perfil: "admin_master", unidadeId: "Todas", status: "ativo", senha: "Lucas.amplalog2026", deveAlterarSenha: false },
    { id: "usr-lucas", email: "lucas.miranda", nome: "Lucas Miranda", perfil: "admin_master", unidadeId: "Todas", status: "ativo", senha: "MasterPassword", deveAlterarSenha: false },
    { id: "usr-atupirama", email: "adciadsetatupirama@gmail.com", nome: "Supervisor Geral", perfil: "admin_master", unidadeId: "Todas", status: "ativo", senha: "Atupirama@2026", deveAlterarSenha: false }
  ],
  unidades: DEFAULT_UNIDADES,
  motoristas: [],
  veiculos: [],
  disponibilidade: [],
  disponibilidade_diaria: [],
  rotas: [],
  notas_fiscais: [],
  entregas_off: [],
  entregas_off_nfs: [],
  descargas: [],
  manutencoes: [],
  estoque_epi: DEFAULT_ESTOQUE,
  movimentacao_epi: [],
  auditoria: [
    { id: "aud-1", usuario: "Sistema", data: "2026-06-14", hora: "12:00:00", acao: "INICIALIZACAO", detalhes: "Banco de dados operacional iniciado." }
  ],
  alertas: [],
  usuario_unidade_permissao: [],
  processos: [],
  processo_categorias: DEFAULT_CATEGORIES,
  processo_colunas: DEFAULT_COLUMNS,
  processo_comentarios: [],
  processo_historico: [],
  processo_notificacoes: [],
  vales: [],
  fechamentos_dt: [],
  movimentacoes_financeiras: [],
  noshows: [],
  historico_documentos: [],
  contas_a_receber: [],
  contas_a_pagar: [],
  abastecimentos: []
};
var FileDatabase = class _FileDatabase {
  static {
    this.cache = null;
  }
  static {
    this.isSupabaseConnected = false;
  }
  static {
    this.connectionError = null;
  }
  static {
    this.schemaVariant = "old";
  }
  static {
    this.pendingWrites = [];
  }
  static isSupabaseConfigured() {
    return !!supabase;
  }
  static getSupabaseStatus() {
    return {
      configured: !!supabase,
      connected: this.isSupabaseConnected,
      error: this.connectionError
    };
  }
  static async bootstrap() {
    console.log("[FileDatabase DIAGNOSTICS] bootstrap() started.");
    console.log("[FileDatabase DIAGNOSTICS] Local File cache base load initiated.");
    const localDb = this.readLocalFile();
    this.cache = localDb;
    console.log("[FileDatabase DIAGNOSTICS] Users in Cache base schema count:", localDb.usuarios?.length || 0);
    if (!supabase) {
      console.log("[FileDatabase] Supabase is NOT configured. Running in Local JSON file mode.");
      this.recalculateAlerts(this.cache);
      return;
    }
    console.log("[FileDatabase] Supabase configured. URL:", supabaseUrl, "using schema variant:", this.schemaVariant);
    try {
      let data = null;
      let success = false;
      let primaryErrorMsg = "";
      if (this.schemaVariant === "old") {
        const res = await supabase.from("ampla_database").select("key, value");
        if (res.error) {
          primaryErrorMsg = res.error.message;
        } else {
          data = res.data?.map((row) => ({
            chave: row.key,
            valor: row.value
          })) || [];
          success = true;
        }
      } else {
        const res = await supabase.from("ampla_database").select("chave, valor");
        if (res.error) {
          primaryErrorMsg = res.error.message;
        } else {
          data = res.data || [];
          success = true;
        }
      }
      if (!success) {
        const altVariant = this.schemaVariant === "old" ? "new" : "old";
        console.log(`[FileDatabase] Current preferred variant '${this.schemaVariant}' check resulted in: ${primaryErrorMsg}. Trying alternative '${altVariant}'...`);
        if (altVariant === "old") {
          const resOld = await supabase.from("ampla_database").select("key, value");
          if (!resOld.error) {
            this.schemaVariant = "old";
            data = resOld.data?.map((row) => ({
              chave: row.key,
              valor: row.value
            })) || [];
            success = true;
          } else {
            this.isSupabaseConnected = false;
            this.connectionError = resOld.error.message;
            console.error(`[FileDatabase] Critical database query failure: Both column formats failed to resolve. Primary: ${primaryErrorMsg}, Fallback: ${resOld.error.message}`);
            return;
          }
        } else {
          const resNew = await supabase.from("ampla_database").select("chave, valor");
          if (!resNew.error) {
            this.schemaVariant = "new";
            data = resNew.data || [];
            success = true;
          } else {
            this.isSupabaseConnected = false;
            this.connectionError = resNew.error.message;
            console.error(`[FileDatabase] Critical database query failure: Both column formats failed to resolve. Primary: ${primaryErrorMsg}, Fallback: ${resNew.error.message}`);
            return;
          }
        }
      }
      this.isSupabaseConnected = true;
      this.connectionError = null;
      console.log(`[FileDatabase] Supabase connection successful! Fetched active keys (format: '${this.schemaVariant}'):`, data?.map((r) => r.chave));
      const fetchedKeys = /* @__PURE__ */ new Set();
      if (data && data.length > 0) {
        for (const row of data) {
          const key = row.chave;
          const val = row.valor;
          if (key && val && this.cache) {
            this.cache[key] = val;
            fetchedKeys.add(key);
          }
        }
        console.log("[FileDatabase] Local cache synchronized with active Supabase records. Keys fetched:", Array.from(fetchedKeys));
      }
      if (this.cache) {
        const missingKeys = [];
        for (const key of Object.keys(this.cache)) {
          if (key === "alertas") continue;
          if (!fetchedKeys.has(key)) {
            missingKeys.push(key);
            await this.asyncWriteToSupabase(key, this.cache[key]);
          }
        }
        if (missingKeys.length > 0) {
          console.log("[FileDatabase] Seeding missing keys to Supabase:", missingKeys);
        }
      }
    } catch (err) {
      this.isSupabaseConnected = false;
      this.connectionError = err.message || String(err);
      console.error("[FileDatabase] Error during Supabase bootstrap:", err);
    }
    this.recalculateAlerts(this.cache);
  }
  static async syncAllToSupabase() {
    if (!supabase || !this.cache) return;
    try {
      console.log("[FileDatabase] Syncing all keys to Supabase using variant:", this.schemaVariant);
      const promises = Object.keys(this.cache).map(async (key) => {
        if (key === "alertas") return;
        const val = this.cache[key];
        const payload = this.schemaVariant === "new" ? { chave: key, valor: val } : { key, value: val };
        const { error } = await supabase.from("ampla_database").upsert(payload);
        if (error) {
          console.error(`[FileDatabase] Error seeding key '${key}':`, error.message);
        }
      });
      await Promise.all(promises);
      console.log("[FileDatabase] Seeding complete.");
    } catch (err) {
      console.error("[FileDatabase] Exception inside syncAllToSupabase:", err);
    }
  }
  static async asyncWriteToSupabase(key, value) {
    const promise = (async () => {
      if (!supabase) return;
      try {
        const payload = this.schemaVariant === "new" ? { chave: key, valor: value } : { key, value };
        const { error } = await supabase.from("ampla_database").upsert(payload);
        if (error) {
          console.error(`[FileDatabase] Async write error for key '${key}':`, error.message);
          let recoverySucceeded = false;
          if (error.message && (error.message.includes("column") || error.message.includes("chave") || error.message.includes("valor") || error.message.includes("key") || error.message.includes("value"))) {
            const alternativeVariant = this.schemaVariant === "new" ? "old" : "new";
            console.log(`[FileDatabase] Attempting recovery write for key '${key}' using alternative schema variant: ${alternativeVariant}`);
            const recoveryPayload = alternativeVariant === "new" ? { chave: key, valor: value } : { key, value };
            const { error: recoveryError } = await supabase.from("ampla_database").upsert(recoveryPayload);
            if (!recoveryError) {
              console.log(`[FileDatabase] Recovery write succeeded! Switching active schema variant to: ${alternativeVariant}`);
              this.schemaVariant = alternativeVariant;
              this.isSupabaseConnected = true;
              this.connectionError = null;
              recoverySucceeded = true;
            } else {
              console.error(`[FileDatabase] Recovery write also failed for key '${key}':`, recoveryError.message);
            }
          }
          if (!recoverySucceeded) {
            this.isSupabaseConnected = false;
            this.connectionError = error.message;
            throw new Error(`Erro ao salvar no Supabase para chave '${key}': ${error.message}`);
          }
        } else {
          this.isSupabaseConnected = true;
          this.connectionError = null;
        }
      } catch (err) {
        console.error(`[FileDatabase] Async write exception for key '${key}':`, err);
        this.isSupabaseConnected = false;
        this.connectionError = err.message || String(err);
        throw err;
      }
    })();
    this.pendingWrites.push(promise);
    promise.finally(() => {
      this.pendingWrites = this.pendingWrites.filter((p) => p !== promise);
    }).catch(() => {
    });
  }
  static readLocalFile() {
    try {
      if (!import_fs.default.existsSync(DB_FILE)) {
        this.writeLocalFile(INITIAL_DATABASE);
        return INITIAL_DATABASE;
      }
      const raw = import_fs.default.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      const schema = { ...INITIAL_DATABASE, ...parsed };
      let updated = false;
      if (!schema.vales) {
        schema.vales = [];
        updated = true;
      }
      if (!schema.fechamentos_dt) {
        schema.fechamentos_dt = [];
        updated = true;
      }
      if (!schema.movimentacoes_financeiras) {
        schema.movimentacoes_financeiras = [];
        updated = true;
      }
      if (!schema.noshows) {
        schema.noshows = [];
        updated = true;
      }
      if (!schema.contas_a_receber) {
        schema.contas_a_receber = [];
        updated = true;
      }
      if (!schema.contas_a_pagar) {
        schema.contas_a_pagar = [];
        updated = true;
      }
      if (!schema.abastecimentos) {
        schema.abastecimentos = [];
        updated = true;
      }
      if (!schema.unidades) {
        schema.unidades = [];
      }
      if (!schema.unidades.some((u) => u.nome?.toUpperCase() === "CDA MINAS GERAIS" || u.id === "un-cda-minas-gerais-4650")) {
        schema.unidades.push({
          id: "un-cda-minas-gerais-4650",
          nome: "CDA MINAS GERAIS",
          codigo: "AMPLA-MG01",
          cidade: "Contagem",
          estado: "MG",
          endereco: "Rodovia BR-040, KM 512 - Distrito Industrial, Contagem - MG",
          status: "ativo",
          supervisor: "Gabriela Silva",
          usuarioResponsavel: "Gabriela",
          created_at: (/* @__PURE__ */ new Date()).toISOString(),
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        updated = true;
      }
      if (!schema.usuarios) {
        schema.usuarios = [];
      }
      if (!schema.usuarios.some((u) => u.email?.toLowerCase() === "gabriela" || u.id === "usr-Gabriela")) {
        schema.usuarios.push({
          id: "usr-Gabriela",
          email: "Gabriela",
          nome: "Gabriela (CDA MINAS GERAIS)",
          perfil: "admin_unidade",
          unidadeId: "un-cda-minas-gerais-4650",
          unidade_id: "un-cda-minas-gerais-4650",
          status: "ativo",
          senha: "Gabriela@2026",
          deveAlterarSenha: false,
          tipo_usuario: "SUPERVISOR",
          cargo: "Supervisor de Filial",
          cpf: "",
          telefone: ""
        });
        updated = true;
      }
      let backfilled = false;
      if (!schema.processos) {
        schema.processos = [];
        backfilled = true;
      }
      if (!schema.processo_categorias || schema.processo_categorias.length === 0) {
        schema.processo_categorias = DEFAULT_CATEGORIES;
        backfilled = true;
      }
      if (!schema.processo_colunas || schema.processo_colunas.length === 0) {
        schema.processo_colunas = DEFAULT_COLUMNS;
        backfilled = true;
      }
      if (!schema.processo_comentarios) {
        schema.processo_comentarios = [];
        backfilled = true;
      }
      if (!schema.processo_historico) {
        schema.processo_historico = [];
        backfilled = true;
      }
      if (!schema.processo_notificacoes) {
        schema.processo_notificacoes = [];
        backfilled = true;
      }
      if (!schema.entregas_off_nfs) {
        schema.entregas_off_nfs = [];
        backfilled = true;
      }
      if (!schema.usuario_unidade_permissao) {
        schema.usuario_unidade_permissao = [];
        backfilled = true;
      }
      schema.entregas_off = (schema.entregas_off || []).map((e) => {
        if (e.tipo_operacao === void 0) {
          e.tipo_operacao = "Entrega Extralimite";
          e.qtd_nfs = e.qtd_nfs || 1;
          e.valor_total = e.valor_total || 500;
          e.status_entrega = e.status_entrega || "Finalizada";
          const hasNfs = schema.entregas_off_nfs.some((n) => n.entrega_off_id === e.id);
          if (!hasNfs) {
            schema.entregas_off_nfs.push({
              id: `nf-off-bk-${e.id}`,
              entrega_off_id: e.id,
              numero_nf: "45091",
              valor_nf: 500
            });
          }
          backfilled = true;
        }
        return e;
      });
      const oldOffs = schema.entregas_off || [];
      if (oldOffs.length > 0) {
        schema.rotas = schema.rotas || [];
        oldOffs.forEach((e) => {
          const dtVal = e.dt || "";
          const targetId = `DT-${dtVal}` || e.id;
          const exists = schema.rotas.some((r) => r.dt === dtVal || r.id === targetId);
          if (!exists) {
            let rStatus = "Finalizada";
            const se = (e.status_entrega || "").trim().toLowerCase();
            if (se === "em rota" || se === "em rota (entregando)") {
              rStatus = "Em rota";
            } else if (se === "aguardando carregamento") {
              rStatus = "Aguardando carregamento";
            } else if (se === "em carregamento") {
              rStatus = "Em carregamento";
            } else if (se === "em descarga") {
              rStatus = "Em descarga";
            }
            const nfsForThisOff = (schema.entregas_off_nfs || []).filter((nf) => nf.entrega_off_id === e.id);
            const qtdNf = nfsForThisOff.length || e.qtd_nfs || 1;
            const valorTotal = nfsForThisOff.reduce((acc, nf) => acc + (Number(nf.valor_nf) || 0), 0) || e.valor_total || 0;
            const migratedRoute = {
              id: targetId,
              dt: dtVal,
              data: e.data || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
              unidadeId: e.unidadeId || "un-go",
              veiculoId: e.veiculoId || "",
              motoristaId: e.motoristaId || "",
              tipo: "Entrega OFF",
              status: rStatus,
              status_viagem: e.status_entrega || "Finalizada",
              totalEntregas: qtdNf,
              entregues: e.qtd_entregues ?? (rStatus === "Finalizada" ? qtdNf : 0),
              devolucoes: e.qtd_devolvida ?? 0,
              recusadas: e.qtd_recusada ?? 0,
              dataPrevista: e.data,
              observacoes_operacionais: e.observacoes || "",
              ocorrencias: e.ocorrencias || [],
              log_alteracoes: e.log_alteracoes || [],
              anexos: e.anexos || [],
              // Entrega OFF specific fields in Rota
              clienteCodigo: "OFF",
              clienteNome: e.cliente || "Cliente OFF",
              clienteCNPJ: "",
              clienteEndereco: e.endereco || "",
              clienteCidade: e.cidade || "",
              clienteUF: "GO",
              // default
              qtdNF: qtdNf,
              valorTotalEntrega: valorTotal,
              qtdVolumes: e.qtd_volumes || 0,
              observacoesEntrega: e.observacoes || ""
            };
            schema.rotas.push(migratedRoute);
            backfilled = true;
          }
        });
      }
      const fechamentos = schema.fechamentos_dt || [];
      let maxProtocolNum = 10540;
      fechamentos.forEach((c) => {
        if (c.protocoloFechamento && c.protocoloFechamento !== "N/A") {
          const pNum = parseInt(c.protocoloFechamento, 10);
          if (!isNaN(pNum) && pNum > maxProtocolNum) {
            maxProtocolNum = pNum;
          }
        }
        if (c.historicoFechamentos) {
          c.historicoFechamentos.forEach((h) => {
            if (h.protocolo && h.protocolo !== "N/A") {
              const pNum = parseInt(h.protocolo, 10);
              if (!isNaN(pNum) && pNum > maxProtocolNum) {
                maxProtocolNum = pNum;
              }
            }
          });
        }
      });
      fechamentos.forEach((c) => {
        if (!c.protocoloFechamento || c.protocoloFechamento === "N/A") {
          maxProtocolNum++;
          const nextProtocol = String(maxProtocolNum).padStart(5, "0");
          c.protocoloFechamento = nextProtocol;
          if (!c.dataFechamento) {
            c.dataFechamento = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          }
          if (!c.horaFechamento) {
            c.horaFechamento = (/* @__PURE__ */ new Date()).toTimeString().split(" ")[0];
          }
          if (!c.usuarioFechamento) {
            c.usuarioFechamento = c.usuarioResponsavel || "sistema";
          }
          c.historicoFechamentos = c.historicoFechamentos || [];
          if (c.historicoFechamentos.length === 0) {
            c.historicoFechamentos.push({
              protocolo: nextProtocol,
              acao: "FECHAMENTO",
              usuario: c.usuarioFechamento,
              data: c.dataFechamento,
              hora: c.horaFechamento,
              motivo: "Primeiro fechamento (migrado)."
            });
          } else {
            const firstClose = c.historicoFechamentos.find((h) => h.acao === "FECHAMENTO");
            if (firstClose && (!firstClose.protocolo || firstClose.protocolo === "N/A")) {
              firstClose.protocolo = nextProtocol;
            }
          }
          backfilled = true;
        }
      });
      if (backfilled) {
        updated = true;
      }
      if (!schema.unidades || schema.unidades.length === 0) {
        schema.unidades = [
          {
            id: "un-go",
            nome: "Goi\xE2nia - Matriz",
            codigo: "AMPLA-GO01",
            cidade: "Goi\xE2nia",
            estado: "GO",
            endereco: "Av. Perimetral Norte, 3000 - Setor Industrial, Goi\xE2nia - GO",
            status: "ativo",
            supervisor: "Marcos Araujo",
            usuarioResponsavel: "marcos.go",
            created_at: (/* @__PURE__ */ new Date()).toISOString(),
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          }
        ];
        updated = true;
      }
      if (updated) {
        this.writeLocalFile(schema);
      }
      return schema;
    } catch (e) {
      console.error("Error reading database file, returning default schema", e);
      return INITIAL_DATABASE;
    }
  }
  static read() {
    if (this.cache) {
      return this.cache;
    }
    const db = this.readLocalFile();
    let changed = false;
    if (db.motoristas) {
      db.motoristas = db.motoristas.map((m) => {
        let updatedItem = false;
        if (!m.tipo) {
          m.tipo = "Motorista";
          updatedItem = true;
        }
        if (!m.identificador_unico_financeiro) {
          const sanitizedId = m.id.toUpperCase().replace(/[^A-Z0-9]/g, "");
          m.identificador_unico_financeiro = `FIN-${sanitizedId || "PES"}-${Math.floor(1e5 + Math.random() * 9e5)}`;
          m.statusFinanceiro = "Ativo";
          m.dataCriacaoContaFinanceira = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          updatedItem = true;
        }
        if (updatedItem) {
          changed = true;
        }
        return m;
      });
    }
    if (changed) {
      this.writeLocalFile(db);
    }
    this.cache = db;
    return db;
  }
  static writeLocalFile(data) {
    try {
      import_fs.default.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to write to database file", e);
    }
  }
  static write(data) {
    this.cache = data;
    this.writeLocalFile(data);
  }
  static get(key) {
    const db = this.read();
    if (key === "alertas" || key === "motoristas") {
      this.recalculateAlerts(db);
    }
    return db[key];
  }
  static getFull() {
    const db = this.read();
    this.recalculateAlerts(db);
    return db;
  }
  static set(key, value) {
    const db = this.read();
    db[key] = value;
    this.write(db);
    if (key === "alertas") return;
    this.asyncWriteToSupabase(key, value);
  }
  static add(key, item, operatorEmail = "offline") {
    const db = this.read();
    const array = db[key];
    if (!item.id) {
      item.id = `${key.slice(0, 3)}-${Date.now()}`;
    }
    array.push(item);
    this.audit(db, operatorEmail, `CREATE_${key.toUpperCase()}`, `Adicionado registro no m\xF3dulo ${key} com ID ${item.id}`, item);
    this.write(db);
    this.asyncWriteToSupabase(key, db[key]);
    this.asyncWriteToSupabase("auditoria", db.auditoria);
    return item;
  }
  static update(key, id, updatedFields, operatorEmail = "offline") {
    const db = this.read();
    const array = db[key];
    const idx = array.findIndex((x) => x.id === id || x.placa && x.placa === id);
    if (idx !== -1) {
      array[idx] = { ...array[idx], ...updatedFields };
      this.audit(db, operatorEmail, `UPDATE_${key.toUpperCase()}`, `Atualizado registro no m\xF3dulo ${key} com ID ${id}`, updatedFields);
      this.write(db);
      this.asyncWriteToSupabase(key, db[key]);
      this.asyncWriteToSupabase("auditoria", db.auditoria);
      return array[idx];
    }
    return null;
  }
  static delete(key, id, operatorEmail = "offline") {
    const db = this.read();
    const array = db[key];
    const idx = array.findIndex(
      (x) => x.id && typeof x.id === "string" && x.id.toLowerCase() === id.toLowerCase() || x.id === id || x.placa && typeof x.placa === "string" && x.placa.toLowerCase() === id.toLowerCase() || x.placa === id
    );
    if (idx !== -1) {
      const removed = array.splice(idx, 1)[0];
      this.audit(db, operatorEmail, `DELETE_${key.toUpperCase()}`, `Removido registro no m\xF3dulo ${key} com ID ${id}`, removed);
      this.write(db);
      this.asyncWriteToSupabase(key, db[key]);
      this.asyncWriteToSupabase("auditoria", db.auditoria);
      return true;
    }
    return false;
  }
  static audit(db, user, action, details, data = null, unidade = "", ip = "127.0.0.1") {
    const now = /* @__PURE__ */ new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().split(" ")[0];
    const log = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
      usuario: user,
      data: dateStr,
      hora: timeStr,
      acao: action,
      detalhes: `${details} ${data ? JSON.stringify(data).slice(0, 150) : ""}`,
      unidade,
      ip
    };
    db.auditoria.push(log);
  }
  static logAudit(user, action, details, unidade = "", ip = "127.0.0.1") {
    const db = this.read();
    this.audit(db, user, action, details, null, unidade, ip);
    this.write(db);
    this.asyncWriteToSupabase("auditoria", db.auditoria);
  }
  static computeDriverStatus(m) {
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const isMotorista = m.tipo === "Motorista" || !m.tipo;
    const diffInDays = (d1) => {
      const date1 = new Date(d1);
      const d1Midnight = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const diffTime = d1Midnight.getTime() - todayMidnight.getTime();
      return Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
    };
    const cnhDays = isMotorista && m.cnhVencimento ? diffInDays(m.cnhVencimento) : null;
    const asoDays = m.asoVencimento ? diffInDays(m.asoVencimento) : null;
    const toxDays = isMotorista && m.toxicologicoVencimento ? diffInDays(m.toxicologicoVencimento) : null;
    const moppDays = isMotorista && m.moppVencimento ? diffInDays(m.moppVencimento) : null;
    const intDays = m.integracaoVencimento ? diffInDays(m.integracaoVencimento) : null;
    const isCnhExpired = cnhDays !== null && cnhDays < 0;
    const isAsoExpired = asoDays !== null && asoDays < 0;
    const isToxExpired = toxDays !== null && toxDays < 0;
    const isMoppExpired = moppDays !== null && moppDays < 0;
    const isIntExpired = intDays !== null && intDays < 0;
    const isPesquisaReprovada = m.pesquisa === "Reprovada";
    const formatarDataBr = (val) => {
      if (!val) return "";
      const parts = val.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return val;
    };
    const reasons = [];
    if (isCnhExpired) {
      reasons.push(`CNH vencida em ${formatarDataBr(m.cnhVencimento)}`);
    }
    if (isAsoExpired) {
      reasons.push(`ASO vencido em ${formatarDataBr(m.asoVencimento)}`);
    }
    if (isToxExpired) {
      reasons.push(`Exame Toxicol\xF3gico vencido em ${formatarDataBr(m.toxicologicoVencimento)}`);
    }
    if (isMoppExpired) {
      reasons.push(`Curso MOPP vencido em ${formatarDataBr(m.moppVencimento)}`);
    }
    if (isIntExpired) {
      reasons.push(`Integra\xE7\xE3o vencida em ${formatarDataBr(m.integracaoVencimento)}`);
    }
    if (isPesquisaReprovada) {
      reasons.push("Pesquisa GR reprovada");
    }
    if (reasons.length > 0) {
      m.motivoBloqueio = "BLOQUEADO \u2014 " + reasons.join(", ") + ".";
      m.statusFinal = "BLOQUEADO";
      m.statusConformidade = "BLOQUEADO";
      return "BLOQUEADO";
    }
    m.motivoBloqueio = void 0;
    const hasPendente = isMotorista && (!m.cnhVencimento || m.cnhVencimento === "Pendente") || (!m.asoVencimento || m.asoVencimento === "Pendente") || m.integracao === "Pendente" || m.pesquisa === "Pendente" || m.aso === "Pendente" || m.fichaEpi === "Pendente";
    const statusObj = hasPendente ? "PENDENTE" : "LIBERADO";
    m.statusFinal = statusObj;
    const activeDays = [];
    if (cnhDays !== null) activeDays.push(cnhDays);
    if (asoDays !== null) activeDays.push(asoDays);
    if (toxDays !== null) activeDays.push(toxDays);
    if (moppDays !== null) activeDays.push(moppDays);
    if (intDays !== null) activeDays.push(intDays);
    let finalConformidade = "APTO";
    if (activeDays.length > 0) {
      const minDays = Math.min(...activeDays);
      if (minDays >= 1 && minDays <= 15) {
        finalConformidade = "CR\xCDTICO";
      } else if (minDays >= 16 && minDays <= 30) {
        finalConformidade = "ATEN\xC7\xC3O";
      }
    }
    m.statusConformidade = finalConformidade;
    return statusObj;
  }
  // Check expirations and append alerts dynamically
  static recalculateAlerts(db) {
    const now = /* @__PURE__ */ new Date();
    const alertList = [];
    const diffInDays = (d1) => {
      const date1 = new Date(d1);
      const diffTime = date1.getTime() - now.getTime();
      return Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
    };
    db.motoristas.forEach((mot) => {
      mot.statusFinal = _FileDatabase.computeDriverStatus(mot);
      const isMotorista = mot.tipo === "Motorista" || !mot.tipo;
      if (isMotorista && mot.cnhVencimento) {
        const cnhDays = diffInDays(mot.cnhVencimento);
        if (cnhDays < 0) {
          alertList.push({
            id: `al-cnh-v-${mot.id}`,
            tipo: "CNH",
            refId: mot.id,
            mensagem: `CNH do motorista ${mot.nome} est\xE1 VENCIDA (${mot.cnhVencimento})`,
            severidade: "Cr\xEDtica",
            status: "Ativo",
            dataCriacao: now.toISOString().split("T")[0]
          });
        } else if (cnhDays <= 30) {
          alertList.push({
            id: `al-cnh-w-${mot.id}`,
            tipo: "CNH",
            refId: mot.id,
            mensagem: `CNH do motorista ${mot.nome} vence em ${cnhDays} dias (${mot.cnhVencimento})`,
            severidade: "Aten\xE7\xE3o",
            status: "Ativo",
            dataCriacao: now.toISOString().split("T")[0]
          });
        }
      }
      if (mot.asoVencimento) {
        const asoDays = diffInDays(mot.asoVencimento);
        if (asoDays < 0) {
          alertList.push({
            id: `al-aso-v-${mot.id}`,
            tipo: "ASO",
            refId: mot.id,
            mensagem: `ASO do profissional ${mot.nome} est\xE1 VENCIDO (${mot.asoVencimento})`,
            severidade: "Cr\xEDtica",
            status: "Ativo",
            dataCriacao: now.toISOString().split("T")[0]
          });
        } else if (asoDays <= 15) {
          alertList.push({
            id: `al-aso-w-${mot.id}`,
            tipo: "ASO",
            refId: mot.id,
            mensagem: `ASO do profissional ${mot.nome} vence em ${asoDays} dias (${mot.asoVencimento})`,
            severidade: "Aten\xE7\xE3o",
            status: "Ativo",
            dataCriacao: now.toISOString().split("T")[0]
          });
        }
      }
      if (isMotorista && mot.toxicologicoVencimento) {
        const toxDays = diffInDays(mot.toxicologicoVencimento);
        if (toxDays < 0) {
          alertList.push({
            id: `al-tox-v-${mot.id}`,
            tipo: "CNH",
            refId: mot.id,
            mensagem: `Exame Toxicol\xF3gico do motorista ${mot.nome} est\xE1 VENCIDO (${mot.toxicologicoVencimento})`,
            severidade: "Cr\xEDtica",
            status: "Ativo",
            dataCriacao: now.toISOString().split("T")[0]
          });
        } else if (toxDays <= 30) {
          alertList.push({
            id: `al-tox-w-${mot.id}`,
            tipo: "CNH",
            refId: mot.id,
            mensagem: `Exame Toxicol\xF3gico do motorista ${mot.nome} vence em ${toxDays} dias (${mot.toxicologicoVencimento})`,
            severidade: "Aten\xE7\xE3o",
            status: "Ativo",
            dataCriacao: now.toISOString().split("T")[0]
          });
        }
      }
      if (isMotorista && mot.moppVencimento) {
        const moppDays = diffInDays(mot.moppVencimento);
        if (moppDays < 0) {
          alertList.push({
            id: `al-mopp-v-${mot.id}`,
            tipo: "CNH",
            refId: mot.id,
            mensagem: `Curso MOPP do motorista ${mot.nome} est\xE1 VENCIDO (${mot.moppVencimento})`,
            severidade: "Cr\xEDtica",
            status: "Ativo",
            dataCriacao: now.toISOString().split("T")[0]
          });
        } else if (moppDays <= 30) {
          alertList.push({
            id: `al-mopp-w-${mot.id}`,
            tipo: "CNH",
            refId: mot.id,
            mensagem: `Curso MOPP do motorista ${mot.nome} vence em ${moppDays} dias (${mot.moppVencimento})`,
            severidade: "Aten\xE7\xE3o",
            status: "Ativo",
            dataCriacao: now.toISOString().split("T")[0]
          });
        }
      }
      if (mot.integracaoVencimento) {
        const intDays = diffInDays(mot.integracaoVencimento);
        if (intDays < 0) {
          alertList.push({
            id: `al-int-v-${mot.id}`,
            tipo: "CNH",
            refId: mot.id,
            mensagem: `Integra\xE7\xE3o do profissional ${mot.nome} est\xE1 VENCIDA (${mot.integracaoVencimento})`,
            severidade: "Cr\xEDtica",
            status: "Ativo",
            dataCriacao: now.toISOString().split("T")[0]
          });
        } else if (intDays <= 15) {
          alertList.push({
            id: `al-int-w-${mot.id}`,
            tipo: "CNH",
            refId: mot.id,
            mensagem: `Integra\xE7\xE3o do profissional ${mot.nome} vence em ${intDays} dias (${mot.integracaoVencimento})`,
            severidade: "Aten\xE7\xE3o",
            status: "Ativo",
            dataCriacao: now.toISOString().split("T")[0]
          });
        }
      }
      if (mot.pesquisa === "Reprovada") {
        alertList.push({
          id: `al-pesq-rep-${mot.id}`,
          tipo: "CNH",
          refId: mot.id,
          mensagem: `Pesquisa GR de ${mot.nome} foi REPROVADA!`,
          severidade: "Cr\xEDtica",
          status: "Ativo",
          dataCriacao: now.toISOString().split("T")[0]
        });
      }
    });
    db.veiculos.forEach((v) => {
      const licDays = diffInDays(v.licenciamentoVencimento);
      if (licDays < 0) {
        alertList.push({
          id: `al-lic-v-${v.placa}`,
          tipo: "Licenciamento",
          refId: v.placa,
          mensagem: `Licenciamento do ve\xEDculo ${v.placa} (${v.modelo}) est\xE1 VENCID0 (${v.licenciamentoVencimento})`,
          severidade: "Cr\xEDtica",
          status: "Ativo",
          dataCriacao: now.toISOString().split("T")[0]
        });
      } else if (licDays <= 30) {
        alertList.push({
          id: `al-lic-w-${v.placa}`,
          tipo: "Licenciamento",
          refId: v.placa,
          mensagem: `Licenciamento do ve\xEDculo ${v.placa} vence em ${licDays} dias (${v.licenciamentoVencimento})`,
          severidade: "Aten\xE7\xE3o",
          status: "Ativo",
          dataCriacao: now.toISOString().split("T")[0]
        });
      }
      const segDays = diffInDays(v.seguroVencimento);
      if (segDays < 0) {
        alertList.push({
          id: `al-seg-v-${v.placa}`,
          tipo: "Seguro",
          refId: v.placa,
          mensagem: `Seguro do ve\xEDculo ${v.placa} est\xE1 VENCIDO (${v.seguroVencimento})`,
          severidade: "Cr\xEDtica",
          status: "Ativo",
          dataCriacao: now.toISOString().split("T")[0]
        });
      } else if (segDays <= 30) {
        alertList.push({
          id: `al-seg-w-${v.placa}`,
          tipo: "Seguro",
          refId: v.placa,
          mensagem: `Seguro do ve\xEDculo ${v.placa} vence em ${segDays} dias (${v.seguroVencimento})`,
          severidade: "Aten\xE7\xE3o",
          status: "Ativo",
          dataCriacao: now.toISOString().split("T")[0]
        });
      }
    });
    db.manutencoes.forEach((m) => {
      const manDays = diffInDays(m.proximaManutencao);
      if (manDays < 0) {
        alertList.push({
          id: `al-man-v-${m.id}`,
          tipo: "Manuten\xE7\xE3o",
          refId: m.veiculoId,
          mensagem: `Pr\xF3xima manuten\xE7\xE3o programada para o ve\xEDculo ${m.veiculoId} est\xE1 ATRASADA desde ${m.proximaManutencao}`,
          severidade: "Cr\xEDtica",
          status: "Ativo",
          dataCriacao: now.toISOString().split("T")[0]
        });
      } else if (manDays <= 7) {
        alertList.push({
          id: `al-man-w-${m.id}`,
          tipo: "Manuten\xE7\xE3o",
          refId: m.veiculoId,
          mensagem: `Manuten\xE7\xE3o programada para o ve\xEDculo ${m.veiculoId} vence em ${manDays} dias (${m.proximaManutencao})`,
          severidade: "Aten\xE7\xE3o",
          status: "Ativo",
          dataCriacao: now.toISOString().split("T")[0]
        });
      }
    });
    db.alertas = alertList;
  }
};

// server.ts
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  try {
    await FileDatabase.bootstrap();
    console.log("[FileDatabase] Bootstrapping accomplished.");
  } catch (err) {
    console.error("[FileDatabase] Error during database bootstrapping:", err);
  }
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use("/api", async (req, res, next) => {
    try {
      if (FileDatabase.isSupabaseConfigured()) {
        await FileDatabase.bootstrap();
      }
    } catch (err) {
      console.error("[Middleware] Live reload from Supabase failed:", err);
    }
    const originalJson = res.json;
    const originalSend = res.send;
    let isIntercepted = false;
    const waitForWrites = async () => {
      if (isIntercepted) return true;
      isIntercepted = true;
      if (FileDatabase.pendingWrites.length > 0) {
        console.log(`[Middleware] Waiting for ${FileDatabase.pendingWrites.length} pending Supabase writes...`);
        try {
          await Promise.all(FileDatabase.pendingWrites);
          console.log("[Middleware] All pending writes persisted successfully on Supabase.");
        } catch (err) {
          console.error("[Middleware] Database persistence failed in Supabase:", err);
          res.json = originalJson;
          res.send = originalSend;
          res.status(500).json({
            success: false,
            error: "Erro de Persist\xEAncia no Supabase",
            message: "Falha cr\xEDtica ao gravar ou atualizar o registro no banco de dados Supabase. Opera\xE7\xE3o cancelada para garantir a integridade dos dados.",
            details: err.message || String(err)
          });
          return false;
        }
      }
      return true;
    };
    res.json = function(body) {
      waitForWrites().then((success) => {
        if (success) {
          originalJson.call(res, body);
        }
      });
      return res;
    };
    res.send = function(body) {
      waitForWrites().then((success) => {
        if (success) {
          originalSend.call(res, body);
        }
      });
      return res;
    };
    next();
  });
  const logApiAction = (userEmail, action, details) => {
    FileDatabase.logAudit(userEmail || "Sistema", action, details);
  };
  const handleApiError = (res, info) => {
    const status = info.status || 400;
    const subject = info.tableName === "veiculos" ? "ve\xEDculo" : "motorista";
    let action = "consultar";
    if (info.operation === "INSERT") action = "inserir";
    else if (info.operation === "UPDATE") action = "atualizar";
    else if (info.operation === "DELETE") action = "remover";
    const fullErrorMsg = `Erro ao ${action} ${subject}. ${info.errorField && info.errorField !== "N/A" ? `Campo ${info.errorField} ` : ""}${info.message}`;
    const payload = {
      success: false,
      message: fullErrorMsg,
      error: fullErrorMsg,
      details: {
        tableName: info.tableName,
        operation: info.operation,
        errorField: info.errorField || "N/A",
        dbMessage: info.dbMessage
      }
    };
    console.error(`[BACKEND ERROR LOG] Table: ${info.tableName} | Op: ${info.operation} | Error:`, JSON.stringify(payload, null, 2));
    res.setHeader("Content-Type", "application/json");
    return res.status(status).json(payload);
  };
  const logAudit = (req, username, action, details, unitId = "") => {
    const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const ip = rawIp.replace(/^.*:/, "");
    let unitName = "";
    if (unitId) {
      if (unitId === "Todas") {
        unitName = "Vis\xE3o Consolidada";
      } else {
        const units = FileDatabase.get("unidades");
        unitName = units.find((u) => u.id === unitId)?.nome || unitId;
      }
    }
    FileDatabase.logAudit(username, action, details, unitName, ip);
  };
  const getRequestUser = (req) => {
    const emailHeader = req.headers["x-user-email"];
    if (!emailHeader) return null;
    const users = FileDatabase.get("usuarios");
    return users.find((u) => u.email.toLowerCase() === emailHeader.toLowerCase() || u.id.toLowerCase() === emailHeader.toLowerCase()) || null;
  };
  const getAuthorizedUnitsForUser = (user) => {
    const isMaster = user.perfil === "admin_master" || user.tipo_usuario === "MASTER";
    if (isMaster || user.unidadeId === "Todas" || user.unidade_id === "Todas") {
      const units = FileDatabase.get("unidades");
      return ["Todas", ...units.map((u) => u.id)];
    }
    const permissoes = FileDatabase.get("usuario_unidade_permissao");
    const authorized = [
      user.unidadeId,
      user.unidade_id,
      ...permissoes.filter((p) => p.usuario_id === user.id && p.ativo).map((p) => p.unidade_id)
    ].filter(Boolean);
    return Array.from(new Set(authorized));
  };
  const getRequestUnitContext = (req, user) => {
    const selectedHeader = req.headers["x-selected-unit"] || "";
    const auths = getAuthorizedUnitsForUser(user);
    if (selectedHeader && auths.includes(selectedHeader)) {
      return selectedHeader;
    }
    if (auths.includes("Todas")) {
      return selectedHeader || "Todas";
    }
    return user.unidadeId !== "Todas" ? user.unidadeId : auths[0] || "";
  };
  const checkUserHasAccess = (user, process2) => {
    if (!user || !process2) return false;
    const isMaster = user.perfil === "admin_master" || user.tipo_usuario === "MASTER";
    if (isMaster) return true;
    const emailNorm = (user.email || "").toLowerCase();
    const isPart = process2.criadoPor?.toLowerCase() === emailNorm || process2.responsavel?.toLowerCase() === emailNorm || process2.participantes?.some((pt) => pt.toLowerCase() === emailNorm);
    if (isPart) return true;
    const auths = getAuthorizedUnitsForUser(user);
    const mainUnitMatch = auths.includes(process2.unidadeId);
    const sharedMatch = process2.unidadesCompartilhadas?.some((unId) => auths.includes(unId)) || process2.unidadesCompartilhadas?.includes("Todas");
    if (mainUnitMatch || sharedMatch) {
      return true;
    }
    return false;
  };
  const getProcessUserRole = (process2, user) => {
    if (!user || !process2) return "visualizador";
    const isMaster = user.perfil === "admin_master" || user.tipo_usuario === "MASTER";
    if (isMaster) return "administrador";
    const emailNorm = (user.email || "").toLowerCase();
    if (process2.participanteRoles && process2.participanteRoles[emailNorm]) {
      return process2.participanteRoles[emailNorm];
    }
    const isCreatorOrResponsible = process2.criadoPor?.toLowerCase() === emailNorm || process2.responsavel?.toLowerCase() === emailNorm;
    if (isCreatorOrResponsible) return "administrador";
    const isParticipant = process2.participantes?.some((pt) => pt.toLowerCase() === emailNorm);
    if (isParticipant) return "editor";
    return "visualizador";
  };
  const getUserWithPerms = (user) => {
    const permissoes = FileDatabase.get("usuario_unidade_permissao");
    const activePerms = permissoes.filter((p) => p.usuario_id === user.id && p.ativo).map((p) => p.unidade_id);
    return {
      ...user,
      unidadesPermitidas: activePerms
    };
  };
  app.get("/api/database/status", (req, res) => {
    try {
      const status = FileDatabase.getSupabaseStatus();
      res.json({
        success: true,
        ...status
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/database/sync", async (req, res) => {
    try {
      const isConfigured = FileDatabase.isSupabaseConfigured();
      if (!isConfigured) {
        return res.status(400).json({ success: false, message: "Supabase n\xE3o est\xE1 configurado. Defina SUPABASE_URL e SUPABASE_ANON_KEY nas vari\xE1veis de ambiente." });
      }
      const user = getRequestUser(req);
      await FileDatabase.bootstrap();
      logAudit(req, user?.nome || "Sistema", "SYNC_DATABASE", `Sincroniza\xE7\xE3o manual com o Supabase efetuada`);
      res.json({
        success: true,
        message: "Sincroniza\xE7\xE3o com o Supabase efetuada com sucesso!",
        status: FileDatabase.getSupabaseStatus()
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  app.get("/api/auth/unidades", (req, res) => {
    const unidades = FileDatabase.get("unidades");
    res.json(unidades);
  });
  app.post("/api/auth/login", (req, res) => {
    const { email, password, googleUser } = req.body;
    console.log(`
[Auth DIAGNOSTICS] Login attempt received for '${email}'`);
    const users = FileDatabase.get("usuarios");
    console.log(`[Auth DIAGNOSTICS] Loaded ${users ? users.length : 0} users from cached database.`);
    if (googleUser) {
      console.log(`[Auth DIAGNOSTICS] OAuth Google Login flow triggered for email: ${googleUser.email}`);
      let user2 = users.find((u) => u.email.toLowerCase() === googleUser.email.toLowerCase() || u.id.toLowerCase() === googleUser.email.toLowerCase());
      if (!user2) {
        console.log(`[Auth DIAGNOSTICS] Google user not found in the database. Auto-creating a new operator account.`);
        user2 = {
          id: `usr-${googleUser.email.split("@")[0]}`,
          email: googleUser.email,
          nome: googleUser.name || "Usu\xE1rio Google",
          perfil: "operador",
          unidadeId: "Todas",
          status: "ativo",
          deveAlterarSenha: false
        };
        FileDatabase.add("usuarios", user2, "oauth-system");
      }
      logApiAction(user2.email, "AUTH_GOOGLE_SUCCESS", "Login via Google OAuth efetuado");
      console.log(`[Auth DIAGNOSTICS] Google OAuth Successful for user: ${user2.nome} (Profile: ${user2.perfil})`);
      return res.json({ success: true, user: getUserWithPerms(user2) });
    }
    console.log(`[Auth DIAGNOSTICS] Looking up user by email or ID match for credentials...`);
    const user = users.find((u) => u.email.toLowerCase() === email?.toLowerCase() || u.id.toLowerCase() === email?.toLowerCase());
    if (user) {
      console.log(`[Auth DIAGNOSTICS] User match found! Nome: ${user.nome}, Profile: ${user.perfil}, Status: ${user.status}, Needs PW Change: ${user.deveAlterarSenha}`);
      if (user.status === "inativo") {
        console.warn(`[Auth DIAGNOSTICS] Login rejected: target account is inactive/suspended.`);
        return res.status(403).json({ success: false, message: "Esta conta est\xE1 suspensa ou inativa. Entre em contato com a Administra\xE7\xE3o Master." });
      }
      if (user.senha && user.senha !== password) {
        console.warn(`[Auth DIAGNOSTICS] Login rejected: incorrect password. Provided: "${password}", Stored: "${user.senha}"`);
        return res.status(401).json({ success: false, message: "Senha incorreta." });
      }
      if (user.deveAlterarSenha) {
        logApiAction(user.email, "AUTH_PWD_PENDING_CHANGE", "Logado com sucesso, necessita alterar a senha padr\xE3o");
        logAudit(req, user.nome, "LOGIN", `Login padr\xE3o efetuado (necessita redefinir senha)`, user.unidadeId);
        console.log(`[Auth DIAGNOSTICS] Login successful (pending required password change) for ${user.nome}`);
        return res.json({ success: true, user: getUserWithPerms(user), forcePasswordReset: true });
      }
      logApiAction(user.email, "AUTH_PWD_SUCCESS", "Login tradicional efetuado");
      logAudit(req, user.nome, "LOGIN", `Efetuou login com sucesso no sistema. Tipo: ${user.tipo_usuario || "MASTER"}`, user.unidadeId);
      console.log(`[Auth DIAGNOSTICS] Login successful! Session granted for ${user.nome}`);
      return res.json({ success: true, user: getUserWithPerms(user) });
    }
    console.warn(`[Auth DIAGNOSTICS] Login failed: No user found matching identifier "${email}". Available users in cached database:`);
    if (users && users.length > 0) {
      users.forEach((u) => {
        console.log(` - ID: ${u.id} | Email: ${u.email} | Nome: ${u.nome}`);
      });
    } else {
      console.warn(`[Auth DIAGNOSTICS] WARNING: The "usuarios" table is completely empty! Please check your local JSON database.json or Supabase table.`);
    }
    return res.status(401).json({ success: false, message: "E-mail ou credenciais inv\xE1lidas" });
  });
  app.post("/api/auth/change-password", (req, res) => {
    const { email, newPassword } = req.body;
    const users = FileDatabase.get("usuarios");
    const userIdx = users.findIndex((u) => u.email.toLowerCase() === email?.toLowerCase() || u.id.toLowerCase() === email?.toLowerCase());
    if (userIdx !== -1) {
      const user = users[userIdx];
      user.senha = newPassword;
      user.deveAlterarSenha = false;
      users[userIdx] = user;
      FileDatabase.set("usuarios", users);
      logApiAction(user.email, "PASSWORD_CHANGED", "A senha obrigat\xF3ria do primeiro acesso foi alterada com sucesso");
      logAudit(req, user.nome, "CHANGE_PASSWORD", "Alterou a senha de primeiro acesso", user.unidadeId);
      return res.json({ success: true, user: getUserWithPerms(user) });
    }
    return res.status(404).json({ success: false, message: "Usu\xE1rio n\xE3o localizado." });
  });
  app.post("/api/auth/logout", (req, res) => {
    const user = getRequestUser(req);
    if (user) {
      logAudit(req, user.nome, "LOGOUT", "Efetuou logout do sistema", user.unidadeId);
    }
    res.json({ success: true });
  });
  app.get("/api/dashboard", (req, res) => {
    const { period, unitId, selectedDate, startDate, endDate, month, year } = req.query;
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const rotas = FileDatabase.get("rotas");
    const motoristas = FileDatabase.get("motoristas");
    const veiculos = FileDatabase.get("veiculos");
    const disponibilidade = FileDatabase.get("disponibilidade") || [];
    const descargas = FileDatabase.get("descargas") || [];
    const nfs = FileDatabase.get("notas_fiscais") || [];
    const unidades = FileDatabase.get("unidades") || [];
    const activeHeaderUnit = getRequestUnitContext(req, user);
    const authUnits = getAuthorizedUnitsForUser(user);
    const filteredUnitId = unitId && authUnits.includes(unitId) ? unitId : activeHeaderUnit;
    const filterUnit = (item) => {
      if (filteredUnitId === "Todas") return true;
      const uid = item.unidadeId || item.unidade;
      return uid === filteredUnitId;
    };
    const filteredRotasUnit = rotas.filter(filterUnit);
    const filteredMotoristas = motoristas.filter(filterUnit);
    const filteredVeiculos = veiculos.filter(filterUnit);
    const getRangeForPeriod = (p, selDate, stDate, enDate, m, y) => {
      let start = "1970-01-01";
      let end = "2999-12-31";
      const todayStr = "2026-06-12";
      if (p === "Dia") {
        const ref = selDate || todayStr;
        start = ref;
        end = ref;
      } else if (p === "Semana") {
        if (stDate && enDate) {
          start = stDate;
          end = enDate;
        } else {
          start = "2026-06-08";
          end = "2026-06-14";
        }
      } else if (p === "M\xEAs") {
        const yr = y || "2026";
        const mn = (m || "06").padStart(2, "0");
        start = `${yr}-${mn}-01`;
        end = `${yr}-${mn}-31`;
      } else if (p === "Ano") {
        const yr = y || "2026";
        start = `${yr}-01-01`;
        end = `${yr}-12-31`;
      } else if (p === "Personalizado") {
        start = stDate || "2026-06-01";
        end = enDate || "2026-06-14";
      } else {
        start = "2026-06-08";
        end = "2026-06-14";
      }
      return { start, end };
    };
    const getPreviousRange = (p, currStart, currEnd) => {
      let prevStart = "";
      let prevEnd = "";
      try {
        const dStart = /* @__PURE__ */ new Date(currStart + "T12:00:00");
        const dEnd = /* @__PURE__ */ new Date(currEnd + "T12:00:00");
        const periodType = p || "Semana";
        if (periodType === "Dia") {
          dStart.setDate(dStart.getDate() - 1);
          const s = dStart.toISOString().split("T")[0];
          prevStart = s;
          prevEnd = s;
        } else if (periodType === "Semana") {
          dStart.setDate(dStart.getDate() - 7);
          dEnd.setDate(dEnd.getDate() - 7);
          prevStart = dStart.toISOString().split("T")[0];
          prevEnd = dEnd.toISOString().split("T")[0];
        } else if (periodType === "M\xEAs") {
          dStart.setMonth(dStart.getMonth() - 1);
          const mnStr = String(dStart.getMonth() + 1).padStart(2, "0");
          prevStart = `${dStart.getFullYear()}-${mnStr}-01`;
          prevEnd = `${dStart.getFullYear()}-${mnStr}-31`;
        } else if (periodType === "Ano") {
          dStart.setFullYear(dStart.getFullYear() - 1);
          prevStart = `${dStart.getFullYear()}-01-01`;
          prevEnd = `${dStart.getFullYear()}-12-31`;
        } else {
          const diffMs = dEnd.getTime() - dStart.getTime();
          const diffDays = Math.ceil(diffMs / (1e3 * 60 * 60 * 24)) + 1;
          dStart.setDate(dStart.getDate() - diffDays);
          dEnd.setDate(dEnd.getDate() - diffDays);
          prevStart = dStart.toISOString().split("T")[0];
          prevEnd = dEnd.toISOString().split("T")[0];
        }
      } catch (e) {
        prevStart = "2026-06-01";
        prevEnd = "2026-06-07";
      }
      return { start: prevStart, end: prevEnd };
    };
    const activePeriod = period || "Semana";
    const currentRange = getRangeForPeriod(activePeriod, selectedDate, startDate, endDate, month, year);
    const previousRange = getPreviousRange(activePeriod, currentRange.start, currentRange.end);
    const calculateKpisForRange = (rangeStart, rangeEnd) => {
      const rangeRotas = filteredRotasUnit.filter((r) => r.data >= rangeStart && r.data <= rangeEnd);
      let totalEntregasCount = 0;
      let entreguesCount = 0;
      let devolucoesCount = 0;
      let pendentesCount = 0;
      let reentregasCount = 0;
      let recargasCount = 0;
      let rotasFinalizadas = 0;
      let rotasEmAndamento = 0;
      let viagensEmRota = 0;
      let viagensEmCarregamento = 0;
      let viagensAgDescarga = 0;
      let viagensFinalizadas = 0;
      let viagensAgCarregamento = 0;
      let viagensCanceladas = 0;
      let viagensVeiculoQuebrado = 0;
      rangeRotas.forEach((r) => {
        totalEntregasCount += r.totalEntregas;
        entreguesCount += r.entregues;
        devolucoesCount += r.devolucoes;
        pendentesCount += r.totalEntregas - r.entregues - r.devolucoes;
        if (r.tipo === "Reentrega") reentregasCount++;
        if (r.tipo === "Recarga") recargasCount++;
        if (r.status === "Finalizada") {
          rotasFinalizadas++;
        } else {
          rotasEmAndamento++;
        }
        const sv = (r.status_viagem || r.status || "").trim().toLowerCase();
        if (sv === "em rota" || sv === "em rota (entregando)") {
          viagensEmRota++;
        } else if (sv === "em carregamento") {
          viagensEmCarregamento++;
        } else if (sv === "aguardando descarga" || sv === "ag. descarga" || sv === "ag.descarga" || sv === "em descarga") {
          viagensAgDescarga++;
        } else if (sv === "finalizada") {
          viagensFinalizadas++;
        } else if (sv === "aguardando carregamento" || sv === "ag. carregamento" || sv === "aguardando carga") {
          viagensAgCarregamento++;
        } else if (sv === "cancelada") {
          viagensCanceladas++;
        } else if (sv === "ve\xEDculo quebrado" || sv === "veiculo quebrado") {
          viagensVeiculoQuebrado++;
        } else {
          viagensAgCarregamento++;
        }
      });
      return {
        entregasPrevistas: totalEntregasCount,
        entregasRealizadas: entreguesCount,
        devolucoes: devolucoesCount,
        entregasPendentes: pendentesCount,
        reentregas: reentregasCount,
        recargas: recargasCount,
        rotasFinalizadas,
        rotasEmAndamento,
        viagensEmRota,
        viagensEmCarregamento,
        viagensAgDescarga,
        viagensFinalizadas,
        viagensAgCarregamento,
        viagensCanceladas,
        viagensVeiculoQuebrado,
        rotasTotal: rangeRotas.length
      };
    };
    const currentStats = calculateKpisForRange(currentRange.start, currentRange.end);
    const previousStats = calculateKpisForRange(previousRange.start, previousRange.end);
    const veiculosEmRota = filteredRotasUnit.filter((r) => r.status === "Em rota" && r.data >= currentRange.start && r.data <= currentRange.end).length;
    const veiculosDisponiveis = filteredVeiculos.filter((v) => v.status === "Liberado").length;
    const veiculosIndisponiveis = filteredVeiculos.filter((v) => v.status === "Bloqueado").length;
    const mDisps = disponibilidade.map((item) => {
      const isRoteirizado = rotas.some((r) => r.veiculoId === item.veiculoId && r.data === item.data);
      return {
        ...item,
        roteirizado: isRoteirizado,
        status_disponibilidade: isRoteirizado ? "ROTEIRIZADO" : "N\xC3O ROTEIRIZADO",
        unidadeId: item.unidadeId || item.unidade || "un-go"
      };
    });
    const filteredMDisps = mDisps.filter(filterUnit);
    const rangeDisps = filteredMDisps.filter((d) => d.data >= currentRange.start && d.data <= currentRange.end);
    const disponibilizadosHoje = rangeDisps.length;
    const roteirizadosHoje = rangeDisps.filter((d) => d.roteirizado).length;
    const naoUtilizadosHoje = Math.max(0, disponibilizadosHoje - roteirizadosHoje);
    const aproveitamentoHoje = disponibilizadosHoje > 0 ? Math.round(roteirizadosHoje / disponibilizadosHoje * 100) : 0;
    const veiculosNaoRoteirizados = naoUtilizadosHoje;
    const activeMonth = currentRange.start.slice(0, 7);
    const activeYear = currentRange.start.slice(0, 4);
    const monthlyDisps = filteredMDisps.filter((d) => d.data.startsWith(activeMonth));
    const disponibilizadosMes = monthlyDisps.length;
    const roteirizadosMes = monthlyDisps.filter((d) => d.roteirizado).length;
    const aproveitamentoMes = disponibilizadosMes > 0 ? Math.round(roteirizadosMes / disponibilizadosMes * 100) : 0;
    const dailyGroup = {};
    filteredMDisps.forEach((d) => {
      if (!dailyGroup[d.data]) dailyGroup[d.data] = { disp: 0, rot: 0 };
      dailyGroup[d.data].disp++;
      if (d.roteirizado) dailyGroup[d.data].rot++;
    });
    const sortedDatesStr = Object.keys(dailyGroup).sort().slice(-7);
    if (sortedDatesStr.length === 0) {
      sortedDatesStr.push("2026-06-11", "2026-06-12");
      dailyGroup["2026-06-11"] = { disp: 4, rot: 3 };
      dailyGroup["2026-06-12"] = { disp: 5, rot: 4 };
    }
    const aproveitamentoDiario = sortedDatesStr.map((dStr) => {
      const g = dailyGroup[dStr] || { disp: 0, rot: 0 };
      const rate = g.disp > 0 ? Math.round(g.rot / g.disp * 100) : 0;
      const parts = dStr.split("-");
      const name = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dStr;
      return {
        name,
        "Aproveitamento %": rate,
        "Disponibilizados": g.disp,
        "Roteirizados": g.rot,
        "Ociosos": Math.max(0, g.disp - g.rot)
      };
    });
    const monthlyGroup = {};
    filteredMDisps.forEach((d) => {
      const monthKey = d.data.slice(0, 7);
      if (!monthlyGroup[monthKey]) monthlyGroup[monthKey] = { disp: 0, rot: 0 };
      monthlyGroup[monthKey].disp++;
      if (d.roteirizado) monthlyGroup[monthKey].rot++;
    });
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    if (!monthlyGroup[activeMonth]) {
      monthlyGroup[activeMonth] = { disp: disponibilizadosMes || 6, rot: roteirizadosMes || 5 };
    }
    const aproveitamentoMensalMap = Object.keys(monthlyGroup).sort().map((mKey) => {
      const g = monthlyGroup[mKey];
      const rate = g.disp > 0 ? Math.round(g.rot / g.disp * 100) : 0;
      const monthPart = parseInt(mKey.split("-")[1], 10);
      const name = monthNames[monthPart - 1] || mKey;
      return { name, "Aproveitamento %": rate, "Disponibilizados": g.disp, "Roteirizados": g.rot };
    });
    const yearlyGroup = {};
    filteredMDisps.forEach((d) => {
      const yearKey = d.data.slice(0, 4);
      if (!yearlyGroup[yearKey]) yearlyGroup[yearKey] = { disp: 0, rot: 0 };
      yearlyGroup[yearKey].disp++;
      if (d.roteirizado) yearlyGroup[yearKey].rot++;
    });
    if (!yearlyGroup[activeYear]) {
      yearlyGroup[activeYear] = { disp: filteredMDisps.length || 10, rot: filteredMDisps.filter((d) => d.roteirizado).length || 8 };
    }
    const aproveitamentoAnualMap = Object.keys(yearlyGroup).sort().map((yKey) => {
      const g = yearlyGroup[yKey];
      const rate = g.disp > 0 ? Math.round(g.rot / g.disp * 100) : 0;
      return { name: yKey, "Aproveitamento %": rate, "Disponibilizados": g.disp, "Roteirizados": g.rot };
    });
    const unitGroup = {};
    mDisps.forEach((d) => {
      if (!unitGroup[d.unidadeId]) unitGroup[d.unidadeId] = { disp: 0, rot: 0 };
      unitGroup[d.unidadeId].disp++;
      if (d.roteirizado) unitGroup[d.unidadeId].rot++;
    });
    const aproveitamentoUnidadeMap = Object.keys(unitGroup).map((uId) => {
      const g = unitGroup[uId];
      const rate = g.disp > 0 ? Math.round(g.rot / g.disp * 100) : 0;
      const uObj = unidades.find((u) => u.id === uId);
      const name = uObj ? uObj.nome : uId;
      return { name, "Aproveitamento %": rate, "Disponibilizados": g.disp, "Roteirizados": g.rot };
    }).sort((a, b) => b["Aproveitamento %"] - a["Aproveitamento %"]);
    const veiculosOciososMap = sortedDatesStr.map((dStr) => {
      const g = dailyGroup[dStr] || { disp: 0, rot: 0 };
      const parts = dStr.split("-");
      const name = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dStr;
      return { name, Ociosos: Math.max(0, g.disp - g.rot) };
    });
    const activeRangeRotas = filteredRotasUnit.filter((r) => r.data >= currentRange.start && r.data <= currentRange.end);
    const driversMap = {};
    activeRangeRotas.forEach((r) => {
      const motObj = motoristas.find((m) => m.id === r.motoristaId);
      if (!motObj) return;
      if (!driversMap[r.motoristaId]) {
        driversMap[r.motoristaId] = {
          nome: motObj.nome,
          entregasRealizadas: 0,
          devolucoes: 0,
          rotas: 0,
          produtividade: 0
        };
      }
      driversMap[r.motoristaId].entregasRealizadas += r.entregues;
      driversMap[r.motoristaId].devolucoes += r.devolucoes;
      driversMap[r.motoristaId].rotas += 1;
    });
    const driversList = Object.values(driversMap).map((d) => {
      const tot = d.entregasRealizadas + d.devolucoes;
      const rate = tot > 0 ? Math.round(d.entregasRealizadas / tot * 100) : 0;
      return { ...d, produtividade: rate };
    }).sort((a, b) => b.entregasRealizadas - a.entregasRealizadas || b.produtividade - a.produtividade);
    let chartPeriodData = [];
    if (activePeriod === "Dia") {
      const targetDateObj = /* @__PURE__ */ new Date(currentRange.start + "T12:00:00");
      for (let i = 6; i >= 0; i--) {
        const d = new Date(targetDateObj);
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split("T")[0];
        const dayRotas = filteredRotasUnit.filter((r) => r.data === dStr);
        let delivered = 0;
        let returns = 0;
        dayRotas.forEach((r) => {
          delivered += r.entregues;
          returns += r.devolucoes;
        });
        const weekdayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "S\xE1b"];
        chartPeriodData.push({
          name: i === 0 ? `Hoje (${d.getDate()}/${d.getMonth() + 1})` : `${weekdayNames[d.getDay()]} (${d.getDate()}/${d.getMonth() + 1})`,
          Entregas: delivered,
          Devolucoes: returns
        });
      }
    } else if (activePeriod === "Semana" || activePeriod === "Personalizado") {
      const startD = /* @__PURE__ */ new Date(currentRange.start + "T12:00:00");
      const endD = /* @__PURE__ */ new Date(currentRange.end + "T12:00:00");
      let curr = new Date(startD);
      let limitCount = 0;
      const weekdayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "S\xE1b"];
      while (curr <= endD && limitCount < 32) {
        const dStr = curr.toISOString().split("T")[0];
        const dayRotas = filteredRotasUnit.filter((r) => r.data === dStr);
        let delivered = 0;
        let returns = 0;
        dayRotas.forEach((r) => {
          delivered += r.entregues;
          returns += r.devolucoes;
        });
        chartPeriodData.push({
          name: `${weekdayNames[curr.getDay()]} ${curr.getDate()}/${curr.getMonth() + 1}`,
          Entregas: delivered,
          Devolucoes: returns
        });
        curr.setDate(curr.getDate() + 1);
        limitCount++;
      }
    } else if (activePeriod === "M\xEAs") {
      for (let w = 1; w <= 5; w++) {
        const dayStart = (w - 1) * 7 + 1;
        const dayEnd = Math.min(31, w * 7);
        const mn = currentRange.start.slice(5, 7);
        const yr = currentRange.start.slice(0, 4);
        let delivered = 0;
        let returns = 0;
        for (let d = dayStart; d <= dayEnd; d++) {
          const dStr = `${yr}-${mn}-${String(d).padStart(2, "0")}`;
          const dayRotas = filteredRotasUnit.filter((r) => r.data === dStr);
          dayRotas.forEach((r) => {
            delivered += r.entregues;
            returns += r.devolucoes;
          });
        }
        chartPeriodData.push({
          name: `Semana ${w}`,
          Entregas: delivered,
          Devolucoes: returns
        });
      }
    } else if (activePeriod === "Ano") {
      const yr = currentRange.start.slice(0, 4);
      const mNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      for (let m = 1; m <= 12; m++) {
        const prefix = `${yr}-${String(m).padStart(2, "0")}`;
        const monthRotas = filteredRotasUnit.filter((r) => r.data.startsWith(prefix));
        let delivered = 0;
        let returns = 0;
        monthRotas.forEach((r) => {
          delivered += r.entregues;
          returns += r.devolucoes;
        });
        chartPeriodData.push({
          name: mNames[m - 1],
          Entregas: delivered,
          Devolucoes: returns
        });
      }
    }
    const totalMot = filteredMotoristas.length;
    const libMot = filteredMotoristas.filter((m) => m.statusFinal === "LIBERADO").length;
    const penMot = filteredMotoristas.filter((m) => m.statusFinal === "PENDENTE").length;
    const bloqMot = filteredMotoristas.filter((m) => m.statusFinal === "BLOQUEADO").length;
    const rateCompliance = totalMot > 0 ? Math.round(libMot / totalMot * 100) : 100;
    const vales = FileDatabase.get("vales") || [];
    const fechamentos_dt = FileDatabase.get("fechamentos_dt") || [];
    const filteredVales = vales.filter(filterUnit);
    const filteredClosures = fechamentos_dt.filter((c) => {
      if (filteredUnitId === "Todas") return true;
      return c.unidadeId === filteredUnitId;
    });
    const totalValorVales = filteredVales.reduce((sum, v) => sum + Number(v.valor || 0), 0);
    let totalQuantidadeFaltas = 0;
    filteredClosures.forEach((c) => {
      const occurrencesList = c.ocorrencias || [];
      occurrencesList.forEach((occ) => {
        if (occ.tipo === "Falta de Mercadoria") {
          totalQuantidadeFaltas += Number(occ.quantidade || 0);
        }
      });
    });
    const driverValesMap = {};
    filteredVales.forEach((v) => {
      const motObj = motoristas.find((m) => m.id === v.motoristaId);
      const name = motObj ? motObj.nome : "Motorista Terceiro";
      if (!driverValesMap[v.motoristaId]) {
        driverValesMap[v.motoristaId] = { name, count: 0, valor: 0 };
      }
      driverValesMap[v.motoristaId].count++;
      driverValesMap[v.motoristaId].valor += Number(v.valor || 0);
    });
    const topMotoristasVales = Object.values(driverValesMap).sort((a, b) => b.valor - a.valor).slice(0, 5);
    const unitValesMap = {};
    filteredVales.forEach((v) => {
      const uObj = unidades.find((u) => u.id === v.unidadeId);
      const name = uObj ? uObj.nome : "Filial";
      if (!unitValesMap[v.unidadeId]) {
        unitValesMap[v.unidadeId] = { name, count: 0, valor: 0 };
      }
      unitValesMap[v.unidadeId].count++;
      unitValesMap[v.unidadeId].valor += Number(v.valor || 0);
    });
    const topUnidadesVales = Object.values(unitValesMap).sort((a, b) => b.valor - a.valor).slice(0, 5);
    const monthlyValesMap = {};
    const mNamesShort = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const currentYearNum = 2026;
    for (let m = 1; m <= 6; m++) {
      const key = `${currentYearNum}-${String(m).padStart(2, "0")}`;
      monthlyValesMap[key] = 0;
    }
    filteredVales.forEach((v) => {
      if (v.data) {
        const monthKey = v.data.slice(0, 7);
        monthlyValesMap[monthKey] = (monthlyValesMap[monthKey] || 0) + Number(v.valor || 0);
      }
    });
    const evolucaoMensalVales = Object.entries(monthlyValesMap).sort((a, b) => a[0].localeCompare(b[0])).map(([key, valor]) => {
      const parts = key.split("-");
      const monthIndex = parseInt(parts[1], 10) - 1;
      const name = `${mNamesShort[monthIndex] || parts[1]}/${parts[0].slice(2)}`;
      return { name, valor };
    });
    const dtsWithOccurrencesCount = filteredClosures.filter((c) => (c.ocorrencias || []).length > 0).length;
    const totalDtsInPeriodCount = filteredRotasUnit.length;
    const indiceOcorrenciasPorDt = totalDtsInPeriodCount > 0 ? Math.round(dtsWithOccurrencesCount / totalDtsInPeriodCount * 100) : filteredClosures.length > 0 ? Math.round(dtsWithOccurrencesCount / filteredClosures.length * 100) : 0;
    const totalDtsFechadas = filteredClosures.length;
    const totalDtsFechadasSemVale = filteredClosures.filter((c) => c.statusFechamento === "Fechada Sem Vale" || !c.statusFechamento && (c.ocorrencias || []).length === 0).length;
    const totalDtsFechadasComVale = filteredClosures.filter((c) => c.statusFechamento === "Fechada Com Vale" || !c.statusFechamento && (c.ocorrencias || []).some((occ) => occ.tipo === "Falta de Mercadoria")).length;
    const totalDtsComDevolucao = filteredClosures.filter((c) => c.statusFechamento === "Fechada Com Devolu\xE7\xE3o" || c.houveDevolucao === "Sim" || c.houveDevolucao === true || !c.statusFechamento && (c.ocorrencias || []).some((occ) => occ.tipo === "Devolu\xE7\xE3o")).length;
    const activeRangeDts = filteredRotasUnit.filter((r) => r.data >= currentRange.start && r.data <= currentRange.end);
    const totalDtsWithSuggestions = activeRangeDts.filter((r) => r.equipeSugeridaIds && r.equipeSugeridaIds.length > 0).length;
    const totalAcceptedSuggestions = activeRangeDts.filter((r) => {
      if (!r.equipeSugeridaIds || r.equipeSugeridaIds.length === 0) return false;
      const sug = [...r.equipeSugeridaIds].sort().join(",");
      const uti = [...r.ajudantesIds || []].sort().join(",");
      return sug === uti;
    }).length;
    const adherenceRate = totalDtsWithSuggestions > 0 ? Math.round(totalAcceptedSuggestions / totalDtsWithSuggestions * 100) : 100;
    const currentMonthStr = currentRange.start.substring(0, 7);
    let totalCreditosMes = 0;
    let totalDebitosMes = 0;
    const dbInstance = FileDatabase.getFull();
    const allVeiculos = dbInstance.veiculos || [];
    let maxSaldoNome = "Nenhum";
    let maxSaldoVal = 0;
    let maxDevedorNome = "Nenhum";
    let maxDevedorVal = 0;
    let totalBalancesCombined = 0;
    const processedVeiculos = allVeiculos.filter(filterUnit).map((v) => {
      const movements = getMovementsForVehicle(dbInstance, v.id);
      movements.forEach((m) => {
        if (m.data && m.data.startsWith(currentMonthStr)) {
          if (m.tipo === "Cr\xE9dito") {
            totalCreditosMes += Number(m.valor || 0);
          } else {
            totalDebitosMes += Number(m.valor || 0);
          }
        }
      });
      const credTotal = movements.filter((m) => m.tipo === "Cr\xE9dito" && !m.faturado).reduce((acc, m) => acc + Number(m.valor || 0), 0);
      const debTotal = movements.filter((m) => m.tipo === "D\xE9bito" && !m.faturado).reduce((acc, m) => acc + Number(m.valor || 0), 0);
      const balance = credTotal - debTotal;
      totalBalancesCombined += balance;
      const label = `${v.modelo} (${v.placa})`;
      if (balance > maxSaldoVal) {
        maxSaldoVal = balance;
        maxSaldoNome = label;
      }
      if (balance < maxDevedorVal) {
        maxDevedorVal = balance;
        maxDevedorNome = label;
      }
      return balance;
    });
    const totalMovimentadoMes = totalCreditosMes + totalDebitosMes;
    const mediaPorColaborador = processedVeiculos.length > 0 ? Math.round(totalBalancesCombined / processedVeiculos.length) : 0;
    res.json({
      cards: {
        dtsWithSuggestionsCount: totalDtsWithSuggestions,
        acceptedSuggestionsCount: totalAcceptedSuggestions,
        adherenceRateSuggestions: adherenceRate,
        entregasPrevistas: currentStats.entregasPrevistas,
        entregasRealizadas: currentStats.entregasRealizadas,
        entregasPendentes: currentStats.entregasPendentes,
        reentregas: currentStats.reentregas,
        recargas: currentStats.recargas,
        devolucoes: currentStats.devolucoes,
        rotasFinalizadas: currentStats.rotasFinalizadas,
        rotasEmAndamento: currentStats.rotasEmAndamento,
        veiculosEmRota,
        veiculosDisponiveis,
        veiculosIndisponiveis,
        veiculosNaoRoteirizados,
        motoristasAtivos: libMot,
        motoristasTotal: totalMot,
        motoristasPendentes: penMot,
        motoristasBloqueados: bloqMot,
        motoristasConformidade: rateCompliance,
        viagensEmRota: currentStats.viagensEmRota,
        viagensEmCarregamento: currentStats.viagensEmCarregamento,
        viagensAgDescarga: currentStats.viagensAgDescarga,
        viagensFinalizadas: currentStats.viagensFinalizadas,
        viagensAgCarregamento: currentStats.viagensAgCarregamento,
        viagensCanceladas: currentStats.viagensCanceladas,
        viagensVeiculoQuebrado: currentStats.viagensVeiculoQuebrado
      },
      previousCards: previousStats,
      rangeAnalyzed: {
        start: currentRange.start,
        end: currentRange.end,
        label: activePeriod === "Dia" ? `Dia ${currentRange.start.split("-").reverse().join("/")}` : activePeriod === "Semana" ? `${currentRange.start.split("-").reverse().join("/")} at\xE9 ${currentRange.end.split("-").reverse().join("/")}` : activePeriod === "M\xEAs" ? `Compet\xEAncia ${monthNames[parseInt(currentRange.start.split("-")[1]) - 1]} de ${currentRange.start.split("-")[0]}` : activePeriod === "Ano" ? `Exerc\xEDcio ${currentRange.start.split("-")[0]}` : `${currentRange.start.split("-").reverse().join("/")} at\xE9 ${currentRange.end.split("-").reverse().join("/")}`
      },
      ranking: driversList,
      dadosGraficoPeriodo: chartPeriodData,
      disponibilidadeKpis: {
        disponibilizadosHoje,
        roteirizadosHoje,
        naoUtilizadosHoje,
        aproveitamentoHoje,
        disponibilizadosMes,
        roteirizadosMes,
        aproveitamentoMes,
        aproveitamentoDiario,
        aproveitamentoMensal: aproveitamentoMensalMap,
        aproveitamentoAnual: aproveitamentoAnualMap,
        aproveitamentoUnidade: aproveitamentoUnidadeMap,
        veiculosOciosos: veiculosOciososMap
      },
      valesKpis: {
        totalValorVales,
        totalQuantidadeFaltas,
        topMotoristasVales,
        topUnidadesVales,
        evolucaoMensalVales,
        indiceOcorrenciasPorDt,
        totalDtsFechadas,
        totalDtsFechadasSemVale,
        totalDtsFechadasComVale,
        totalDtsComDevolucao
      },
      financeiroKpis: {
        totalMovimentadoMes,
        creditosMes: totalCreditosMes,
        debitosMes: totalDebitosMes,
        maiorSaldo: maxSaldoVal,
        maiorSaldoNome: maxSaldoNome,
        maiorDevedor: Math.abs(maxDevedorVal),
        maiorDevedorNome: maxDevedorNome,
        mediaPorColaborador
      }
    });
  });
  app.get("/api/unidades", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const list = FileDatabase.get("unidades");
    const isMaster = user.perfil === "admin_master" || user.tipo_usuario === "MASTER";
    const authUnits = getAuthorizedUnitsForUser(user);
    if (!isMaster) {
      return res.json(list.filter((u) => u.status !== "inativo" && authUnits.includes(u.id)));
    }
    res.json(list);
  });
  app.post("/api/unidades", (req, res) => {
    const user = getRequestUser(req);
    const isMaster = user && (user.perfil === "admin_master" || user.tipo_usuario === "MASTER");
    if (!isMaster) {
      return res.status(403).json({ error: "Somente usu\xE1rios MASTER podem cadastrar novas unidades." });
    }
    const { nome, codigo, cidade, estado, endereco, status, supervisor, usuarioResponsavel } = req.body;
    if (!nome || !cidade || !estado) {
      return res.status(400).json({ error: "Nome, cidade e estado s\xE3o obrigat\xF3rios." });
    }
    const finalCodigo = codigo && codigo.trim() || `UN-${nome.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "FIL"}-${Math.floor(100 + Math.random() * 900)}`;
    const finalEndereco = endereco && endereco.trim() || `\xC1rea de Carga e Descarga Geral, s/n - ${cidade} - ${estado}`;
    const sanitizedName = nome.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const unitId = `un-${sanitizedName}-${Date.now().toString().slice(-4)}`;
    const newUnit = {
      id: unitId,
      nome,
      codigo: finalCodigo,
      cidade,
      estado,
      endereco: finalEndereco,
      status: status || "ativo",
      supervisor: supervisor || "Supervisor",
      usuarioResponsavel: usuarioResponsavel || "",
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const operator = user.email;
    const added = FileDatabase.add("unidades", newUnit, operator);
    const supervisorName = supervisor || "Supervisor";
    const tempUsername = usuarioResponsavel || `${supervisorName.toLowerCase().replace(/[^a-z]/g, "")}.${estado.toLowerCase()}`;
    const tempPassword = `${supervisorName.charAt(0).toUpperCase()}${supervisorName.slice(1)}@2026`;
    const generatedSupervisor = {
      id: `usr-${tempUsername}`,
      email: tempUsername,
      nome: `${supervisorName} (${nome})`,
      perfil: "admin_unidade",
      unidadeId: unitId,
      status: "ativo",
      senha: tempPassword,
      deveAlterarSenha: true,
      supervisor: supervisorName,
      unidade_id: unitId,
      tipo_usuario: "SUPERVISOR",
      cargo: "Supervisor de Filial"
    };
    FileDatabase.add("usuarios", generatedSupervisor, operator);
    const db = FileDatabase.getFull();
    const defaultTemplateStock = [
      { id: `botina-${unitId}`, nome: "Botina de Seguran\xE7a", saldo: 0, unidadeId: unitId },
      { id: `casquete-${unitId}`, nome: "Casquete", saldo: 0, unidadeId: unitId },
      { id: `capa-chuva-${unitId}`, nome: "Capa de Chuva", saldo: 0, unidadeId: unitId },
      { id: `luvas-${unitId}`, nome: "Luvas de Vaqueta/Grip", saldo: 0, unidadeId: unitId },
      { id: `cones-${unitId}`, nome: "Cones de Sinaliza\xE7\xE3o", saldo: 0, unidadeId: unitId },
      { id: `calcos-${unitId}`, nome: "Cal\xE7os de Pneu", saldo: 0, unidadeId: unitId },
      { id: `oculos-${unitId}`, nome: "\xD3culos de Prote\xE7\xE3o", saldo: 0, unidadeId: unitId },
      { id: `colete-${unitId}`, nome: "Colete Refletivo", saldo: 0, unidadeId: unitId },
      { id: `mangote-${unitId}`, nome: "Mangote Anticorte", saldo: 0, unidadeId: unitId }
    ];
    db.estoque_epi = [...db.estoque_epi || [], ...defaultTemplateStock];
    FileDatabase.set("estoque_epi", db.estoque_epi);
    logAudit(req, user.nome, "CADASTRO_UNIDADE", `Criou Unidade Comercial ${nome} (C\xF3digo: ${codigo})`, unitId);
    res.json({ success: true, added, generatedUser: generatedSupervisor });
  });
  app.put("/api/unidades/:id", (req, res) => {
    const user = getRequestUser(req);
    const isMaster = user && (user.perfil === "admin_master" || user.tipo_usuario === "MASTER");
    if (!isMaster) {
      return res.status(403).json({ error: "Somente administradores MASTER podem alterar unidades." });
    }
    const { id } = req.params;
    const { nome, codigo, cidade, estado, endereco, status, supervisor, usuarioResponsavel } = req.body;
    const list = FileDatabase.get("unidades");
    const idx = list.findIndex((u) => u.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Unidade n\xE3o localizada." });
    }
    const updated = { updated_at: (/* @__PURE__ */ new Date()).toISOString() };
    if (nome) updated.nome = nome;
    if (codigo) updated.codigo = codigo;
    if (cidade) updated.cidade = cidade;
    if (estado) updated.estado = estado;
    if (endereco) updated.endereco = endereco;
    if (status) updated.status = status;
    if (supervisor !== void 0) updated.supervisor = supervisor;
    if (usuarioResponsavel !== void 0) updated.usuarioResponsavel = usuarioResponsavel;
    FileDatabase.update("unidades", id, updated, user.email);
    if (supervisor !== void 0 || usuarioResponsavel !== void 0) {
      const users = FileDatabase.get("usuarios");
      const unit = list[idx];
      const finalUnitName = nome || unit.nome;
      const finalSupervisor = supervisor !== void 0 ? supervisor : unit.supervisor || "Supervisor";
      const finalUsuarioResponsavel = usuarioResponsavel !== void 0 ? usuarioResponsavel : unit.usuarioResponsavel || "";
      if (finalUsuarioResponsavel) {
        const existingUser = users.find((u) => u.unidadeId === id && (u.perfil === "admin_unidade" || u.tipo_usuario === "SUPERVISOR"));
        if (existingUser) {
          const fieldsToUpdate = {
            email: finalUsuarioResponsavel,
            nome: `${finalSupervisor} (${finalUnitName})`,
            supervisor: finalSupervisor
          };
          FileDatabase.update("usuarios", existingUser.id, fieldsToUpdate, user.email);
        } else {
          const firstPart = finalSupervisor.split(" ")[0];
          const tempPassword = `${firstPart.charAt(0).toUpperCase()}${firstPart.replace(/[^a-zA-Z]/g, "").slice(1)}@2026` || "Supervisor@2026";
          const newUser = {
            id: `usr-${finalUsuarioResponsavel}`,
            email: finalUsuarioResponsavel,
            nome: `${finalSupervisor} (${finalUnitName})`,
            perfil: "admin_unidade",
            unidadeId: id,
            status: "ativo",
            senha: tempPassword,
            deveAlterarSenha: true,
            supervisor: finalSupervisor,
            unidade_id: id,
            tipo_usuario: "SUPERVISOR",
            cargo: "Supervisor de Filial"
          };
          FileDatabase.add("usuarios", newUser, user.email);
        }
      }
    }
    logAudit(req, user.nome, "ALTERACAO_DADOS", `Modificou dados da unidade ${nome || id} (Status: ${status || "N/A"})`, id);
    res.json({ success: true });
  });
  app.delete("/api/unidades/:id", (req, res) => {
    const user = getRequestUser(req);
    const isMaster = user && (user.perfil === "admin_master" || user.tipo_usuario === "MASTER");
    if (!isMaster) {
      return res.status(403).json({ error: "Somente usu\xE1rios de perfil MASTER podem inativar unidades." });
    }
    const { id } = req.params;
    const operator = user.email;
    const list = FileDatabase.get("unidades");
    const target = list.find((u) => u.id === id);
    if (!target) {
      return res.status(404).json({ error: "Unidade n\xE3o localizada." });
    }
    FileDatabase.update("unidades", id, { status: "inativo" }, operator);
    logAudit(req, user.nome, "EXCLUSAO_UNIDADE", `Inativou/Desabilitou o acesso \xE0 unidade ${target.nome} (ID: ${id})`, id);
    res.json({ success: true });
  });
  app.get("/api/usuarios", (req, res) => {
    const user = getRequestUser(req);
    if (!user) {
      return res.status(401).json({ error: "N\xE3o autorizado" });
    }
    const isMaster = user.perfil === "admin_master" || user.tipo_usuario === "MASTER";
    const usuarios = FileDatabase.get("usuarios");
    const permissoes = FileDatabase.get("usuario_unidade_permissao");
    if (!isMaster) {
      const allowedUnits = [
        user.unidadeId,
        user.unidade_id,
        ...permissoes.filter((p) => p.usuario_id === user.id && p.ativo).map((p) => p.unidade_id)
      ].filter(Boolean);
      const filteredUsers = usuarios.filter((u) => {
        const uUnit = u.unidadeId || u.unidade_id;
        return uUnit && allowedUnits.includes(uUnit);
      });
      const mapped2 = filteredUsers.map((u) => {
        const activePerms = permissoes.filter((p) => p.usuario_id === u.id && p.ativo).map((p) => p.unidade_id);
        return {
          ...u,
          unidadesPermitidas: activePerms
        };
      });
      return res.json(mapped2);
    }
    const mapped = usuarios.map((u) => {
      const activePerms = permissoes.filter((p) => p.usuario_id === u.id && p.ativo).map((p) => p.unidade_id);
      return {
        ...u,
        unidadesPermitidas: activePerms
      };
    });
    res.json(mapped);
  });
  app.get("/api/processos-participantes-disponiveis", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const usuarios = FileDatabase.get("usuarios");
    const activeUsers = usuarios.filter((u) => u.status !== "inativo");
    res.json(activeUsers);
  });
  app.post("/api/usuarios", (req, res) => {
    const user = getRequestUser(req);
    const isMaster = user && (user.perfil === "admin_master" || user.tipo_usuario === "MASTER");
    if (!isMaster) {
      return res.status(403).json({ error: "Somente administradores MASTER podem criar usu\xE1rios." });
    }
    const { email, nome, tipo_usuario, unidade_id, status, senha, unidadesPermitidas, cpf, telefone, cargo, permissions } = req.body;
    if (!email || !nome || !senha || !unidade_id || !tipo_usuario) {
      return res.status(400).json({ error: "Usu\xE1rio, nome, senha, tipo de usu\xE1rio e unidade de refer\xEAncia s\xE3o obrigat\xF3rios." });
    }
    const currentUsers = FileDatabase.get("usuarios");
    if (currentUsers.some((u) => u.email.toLowerCase() === email.toLowerCase() || u.id === `usr-${email.toLowerCase()}`)) {
      return res.status(400).json({ error: "E-mail ou Usu\xE1rio j\xE1 cadastrado." });
    }
    let calculatedPerfil = "operador";
    if (tipo_usuario === "MASTER") {
      calculatedPerfil = "admin_master";
    } else if (tipo_usuario === "SUPERVISOR") {
      calculatedPerfil = "admin_unidade";
    }
    const newUser = {
      id: `usr-${email.split("@")[0].toLowerCase()}`,
      email: email.trim(),
      nome: nome.trim(),
      perfil: calculatedPerfil,
      unidadeId: unidade_id,
      // Unidade principal de referência
      status: status || "ativo",
      senha,
      deveAlterarSenha: false,
      // New compliance fields
      unidade_id,
      tipo_usuario,
      cpf: cpf || "",
      telefone: telefone || "",
      cargo: cargo || "",
      permissions: permissions || {}
    };
    FileDatabase.add("usuarios", newUser, user.email);
    if (Array.isArray(unidadesPermitidas)) {
      const permissoes = FileDatabase.get("usuario_unidade_permissao");
      unidadesPermitidas.forEach((uId) => {
        permissoes.push({
          id: `uup-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
          usuario_id: newUser.id,
          unidade_id: uId,
          ativo: true,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
      });
      FileDatabase.set("usuario_unidade_permissao", permissoes);
    }
    logAudit(req, user.nome, "CADASTRO_USUARIO", `Cadastrou usu\xE1rio: ${newUser.nome} (${newUser.email}) - Tipo: ${tipo_usuario}`, user.unidadeId);
    res.json({ success: true, user: newUser });
  });
  app.put("/api/usuarios/:id", (req, res) => {
    const user = getRequestUser(req);
    const isMaster = user && (user.perfil === "admin_master" || user.tipo_usuario === "MASTER");
    if (!isMaster) {
      return res.status(403).json({ error: "Somente administradores MASTER podem editar usu\xE1rios." });
    }
    const { id } = req.params;
    const { nome, tipo_usuario, unidade_id, status, senha, unidadesPermitidas, cpf, telefone, cargo, permissions } = req.body;
    const currentUsers = FileDatabase.get("usuarios");
    const targetIdx = currentUsers.findIndex((u) => u.id === id || u.id && u.id.toLowerCase() === id.toLowerCase());
    if (targetIdx === -1) {
      return res.status(404).json({ error: "Usu\xE1rio n\xE3o localizado." });
    }
    let calculatedPerfil;
    if (tipo_usuario) {
      if (tipo_usuario === "MASTER") {
        calculatedPerfil = "admin_master";
      } else if (tipo_usuario === "SUPERVISOR") {
        calculatedPerfil = "admin_unidade";
      } else {
        calculatedPerfil = "operador";
      }
    }
    const updatedFields = {};
    if (nome) updatedFields.nome = nome.trim();
    if (tipo_usuario) {
      updatedFields.tipo_usuario = tipo_usuario;
      if (calculatedPerfil) updatedFields.perfil = calculatedPerfil;
    }
    if (unidade_id) {
      updatedFields.unidade_id = unidade_id;
      updatedFields.unidadeId = unidade_id;
    }
    if (status) updatedFields.status = status;
    if (senha) updatedFields.senha = senha;
    if (cpf !== void 0) updatedFields.cpf = cpf;
    if (telefone !== void 0) updatedFields.telefone = telefone;
    if (cargo !== void 0) updatedFields.cargo = cargo;
    if (permissions !== void 0) updatedFields.permissions = permissions;
    FileDatabase.update("usuarios", id, updatedFields, user.email);
    if (Array.isArray(unidadesPermitidas)) {
      let permissoes = FileDatabase.get("usuario_unidade_permissao");
      permissoes = permissoes.filter((p) => p.usuario_id !== id);
      unidadesPermitidas.forEach((uId) => {
        permissoes.push({
          id: `uup-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
          usuario_id: id,
          unidade_id: uId,
          ativo: true,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
      });
      FileDatabase.set("usuario_unidade_permissao", permissoes);
    }
    logAudit(req, user.nome, "ALTERACAO_DADOS", `Alterou dados cadastrais do usu\xE1rio ID ${id}: ${nome || ""}`, user.unidadeId);
    if (permissions !== void 0 || unidadesPermitidas !== void 0) {
      logAudit(req, user.nome, "ALTERACAO_PERMISSOES", `Editou privil\xE9gios e permiss\xF5es de acesso do usu\xE1rio ID ${id}`, user.unidadeId);
    }
    res.json({ success: true });
  });
  app.delete("/api/usuarios/:id", (req, res) => {
    const user = getRequestUser(req);
    const isMaster = user && (user.perfil === "admin_master" || user.tipo_usuario === "MASTER");
    if (!isMaster) {
      return res.status(403).json({ error: "Somente administradores MASTER podem excluir usu\xE1rios." });
    }
    const { id } = req.params;
    if (id === user.id) {
      return res.status(400).json({ error: "Voc\xEA n\xE3o pode se auto-excluir." });
    }
    const targetUser = FileDatabase.get("usuarios").find((u) => u.id === id || u.id && u.id.toLowerCase() === id.toLowerCase());
    if (!targetUser) {
      return res.status(404).json({ error: "Usu\xE1rio n\xE3o localizado no banco de dados." });
    }
    const targetName = targetUser.nome;
    if (targetUser.id === user.id) {
      return res.status(400).json({ error: "Voc\xEA n\xE3o pode se auto-excluir." });
    }
    const deleted = FileDatabase.delete("usuarios", targetUser.id, user.email);
    if (!deleted) {
      return res.status(500).json({ error: "Falha interna ao tentar excluir o registro do usu\xE1rio." });
    }
    logAudit(req, user.nome, "EXCLUSAO_USUARIO", `Removeu permanentemente a conta de usu\xE1rio: ${targetName} (ID: ${id})`, user.unidadeId);
    res.json({ success: true });
  });
  app.post("/api/logs/acesso-unidade", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const { unidadeId, unidadeNome } = req.body;
    if (!unidadeId) return res.status(400).json({ error: "Unidade \xE9 obrigat\xF3ria" });
    const units = FileDatabase.get("unidades");
    const name = unidadeNome || units.find((u) => u.id === unidadeId)?.nome || (unidadeId === "Todas" ? "Vis\xE3o Consolidada" : unidadeId);
    logAudit(req, user.nome, "TROCA_UNIDADE", `Visualizou ou alterou para a unidade: ${name}`, unidadeId);
    res.json({ success: true });
  });
  app.get("/api/motoristas", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const list = FileDatabase.get("motoristas");
    const activeUnit = getRequestUnitContext(req, user);
    if (activeUnit === "Todas") return res.json(list);
    res.json(list.filter((m) => m.unidadeId === activeUnit));
  });
  app.post("/api/motoristas", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "INSERT",
          errorField: "x-user-email",
          message: "Usu\xE1rio sem permiss\xE3o de INSERT.",
          dbMessage: "Unauthorized: Request user credentials not found.",
          status: 401
        });
      }
      const tableExists = "motoristas" in FileDatabase.getFull();
      if (!tableExists) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "INSERT",
          errorField: "N/A",
          message: "Tabela motoristas n\xE3o encontrada.",
          dbMessage: "Table 'motoristas' does not exist in DatabaseSchema context.",
          status: 500
        });
      }
      const item = req.body;
      const operator = user.email;
      if (!item.nome || !item.nome.trim()) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "INSERT",
          errorField: "nome",
          message: "Campo nome obrigat\xF3rio.",
          dbMessage: "Column 'nome' cannot be null.",
          status: 400
        });
      }
      if (!item.cpf || !item.cpf.trim()) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "INSERT",
          errorField: "cpf",
          message: "Campo cpf obrigat\xF3rio.",
          dbMessage: "Column 'cpf' cannot be null.",
          status: 400
        });
      }
      const finalUnidadeId = item.unidadeId || (user.perfil !== "admin_master" && user.unidadeId !== "Todas" ? user.unidadeId : null);
      if (!finalUnidadeId) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "INSERT",
          errorField: "unidadeId",
          message: "Campo unidadeId obrigat\xF3rio.",
          dbMessage: "Constraint failure: Column 'unidadeId' is foreign key and cannot be null.",
          status: 400
        });
      }
      const list = FileDatabase.get("motoristas");
      const cleanCpfInput = item.cpf.replace(/\D/g, "");
      const duplicate = list.find((m) => m.cpf.replace(/\D/g, "") === cleanCpfInput);
      if (duplicate) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "INSERT",
          errorField: "cpf",
          message: "Campo cpf duplicado.",
          dbMessage: `duplicate key value violates unique constraint "motoristas_cpf_key" (Key cpf=${item.cpf} already exists)`,
          status: 400
        });
      }
      if (user.perfil !== "admin_master") {
        item.unidadeId = user.unidadeId;
      }
      item.statusFinal = FileDatabase.computeDriverStatus(item);
      const added = FileDatabase.add("motoristas", item, operator);
      res.json(added);
    } catch (err) {
      return handleApiError(res, {
        tableName: "motoristas",
        operation: "INSERT",
        message: "Falha imprevista no servidor de banco de dados.",
        dbMessage: err.message || "Unknown database error.",
        status: 500
      });
    }
  });
  app.put("/api/motoristas/:id", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "UPDATE",
          errorField: "x-user-email",
          message: "Usu\xE1rio sem permiss\xE3o de UPDATE.",
          dbMessage: "Unauthorized: Request user credentials not found.",
          status: 401
        });
      }
      const item = req.body;
      const operator = user.email;
      const current = FileDatabase.get("motoristas").find((x) => x.id === req.params.id);
      if (!current) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "UPDATE",
          errorField: "id",
          message: "Registro n\xE3o encontrado.",
          dbMessage: `Record with id '${req.params.id}' was not found in table 'motoristas'.`,
          status: 404
        });
      }
      if (user.perfil !== "admin_master" && current.unidadeId !== user.unidadeId) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "UPDATE",
          errorField: "unidadeId",
          message: "Usu\xE1rio sem permiss\xE3o de UPDATE.",
          dbMessage: "Access denied. Operation requires admin privileges or matching unit.",
          status: 403
        });
      }
      if (item.nome !== void 0 && (!item.nome || !item.nome.trim())) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "UPDATE",
          errorField: "nome",
          message: "Campo nome obrigat\xF3rio.",
          dbMessage: "Column 'nome' cannot be null.",
          status: 400
        });
      }
      if (item.cpf !== void 0 && (!item.cpf || !item.cpf.trim())) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "UPDATE",
          errorField: "cpf",
          message: "Campo cpf obrigat\xF3rio.",
          dbMessage: "Column 'cpf' cannot be null.",
          status: 400
        });
      }
      if (item.cpf !== void 0 && item.cpf.trim() !== current.cpf.trim()) {
        const cleanCpfInput = item.cpf.replace(/\D/g, "");
        const list = FileDatabase.get("motoristas");
        const duplicate = list.find((m) => m.id !== current.id && m.cpf.replace(/\D/g, "") === cleanCpfInput);
        if (duplicate) {
          return handleApiError(res, {
            tableName: "motoristas",
            operation: "UPDATE",
            errorField: "cpf",
            message: "Campo cpf duplicado.",
            dbMessage: `duplicate key value violates unique constraint "motoristas_cpf_key" (Key cpf=${item.cpf} already exists)`,
            status: 400
          });
        }
      }
      if (user.perfil !== "admin_master") {
        item.unidadeId = user.unidadeId;
      }
      const merged = { ...current, ...item };
      item.statusFinal = FileDatabase.computeDriverStatus(merged);
      item.statusConformidade = merged.statusConformidade;
      item.motivoBloqueio = merged.motivoBloqueio;
      const updated = FileDatabase.update("motoristas", req.params.id, item, operator);
      res.json(updated);
    } catch (err) {
      return handleApiError(res, {
        tableName: "motoristas",
        operation: "UPDATE",
        message: "Falha imprevista no servidor de banco de dados.",
        dbMessage: err.message || "Unknown database error.",
        status: 500
      });
    }
  });
  app.delete("/api/motoristas/:id", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "DELETE",
          errorField: "x-user-email",
          message: "Usu\xE1rio sem permiss\xE3o de DELETE.",
          dbMessage: "Unauthorized: Request user credentials not found.",
          status: 401
        });
      }
      const current = FileDatabase.get("motoristas").find((x) => x.id === req.params.id);
      if (!current) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "DELETE",
          errorField: "id",
          message: "Registro n\xE3o encontrado.",
          dbMessage: `Record with id '${req.params.id}' was not found in table 'motoristas'.`,
          status: 404
        });
      }
      if (user.perfil !== "admin_master" && current.unidadeId !== user.unidadeId) {
        return handleApiError(res, {
          tableName: "motoristas",
          operation: "DELETE",
          errorField: "unidadeId",
          message: "Usu\xE1rio sem permiss\xE3o de DELETE.",
          dbMessage: "Access denied. Action requires appropriate unit context.",
          status: 403
        });
      }
      const operator = user.email;
      FileDatabase.delete("motoristas", req.params.id, operator);
      res.json({ success: true });
    } catch (err) {
      return handleApiError(res, {
        tableName: "motoristas",
        operation: "DELETE",
        message: "Falha imprevista no servidor de banco de dados.",
        dbMessage: err.message || "Unknown database error.",
        status: 500
      });
    }
  });
  app.get(["/api/veiculos", "/veiculos"], (req, res) => {
    const user = getRequestUser(req);
    res.setHeader("Content-Type", "application/json");
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado", message: "N\xE3o autorizado" });
    const list = FileDatabase.get("veiculos");
    const activeUnit = getRequestUnitContext(req, user);
    if (activeUnit === "Todas") return res.json(list);
    res.json(list.filter((v) => v.unidadeId === activeUnit));
  });
  app.get(["/api/veiculos/:id", "/veiculos/:id"], (req, res) => {
    try {
      const user = getRequestUser(req);
      res.setHeader("Content-Type", "application/json");
      if (!user) return res.status(401).json({ success: false, message: "N\xE3o autorizado" });
      const current = FileDatabase.get("veiculos").find((x) => x.id === req.params.id || x.placa && x.placa === req.params.id);
      if (!current) {
        return res.status(404).json({ success: false, message: "Ve\xEDculo n\xE3o encontrado." });
      }
      if (user.perfil !== "admin_master" && current.unidadeId !== user.unidadeId) {
        return res.status(403).json({ success: false, message: "Usu\xE1rio sem permiss\xE3o." });
      }
      res.json(current);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message || "Erro interno" });
    }
  });
  app.post(["/api/veiculos", "/veiculos"], (req, res) => {
    console.log("VEICULO_SAVE_START");
    console.log("[BACKEND LOG] Dados recebidos no POST /api/veiculos:", JSON.stringify(req.body, null, 2));
    try {
      const user = getRequestUser(req);
      if (!user) {
        console.error("VEICULO_SAVE_ERROR - Usu\xE1rio n\xE3o autorizado ou nulo.");
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "INSERT",
          errorField: "x-user-email",
          message: "Usu\xE1rio sem permiss\xE3o de INSERT.",
          dbMessage: "Unauthorized: Session user credentials missing.",
          status: 401
        });
      }
      const tableExists = "veiculos" in FileDatabase.getFull();
      if (!tableExists) {
        console.error("VEICULO_SAVE_ERROR - Tabela de ve\xEDculos n\xE3o encontrada.");
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "INSERT",
          errorField: "N/A",
          message: "Tabela veiculos n\xE3o encontrada.",
          dbMessage: "Table 'veiculos' does not exist in DatabaseSchema context.",
          status: 500
        });
      }
      const item = req.body;
      const operator = user.email;
      if (!item.placa || !item.placa.trim()) {
        console.error("VEICULO_SAVE_ERROR - Campo placa obrigat\xF3rio.");
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "INSERT",
          errorField: "placa",
          message: "Campo placa obrigat\xF3rio.",
          dbMessage: "Column 'placa' cannot be null.",
          status: 400
        });
      }
      if (!item.modelo || !item.modelo.trim()) {
        console.error("VEICULO_SAVE_ERROR - Campo modelo obrigat\xF3rio.");
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "INSERT",
          errorField: "modelo",
          message: "Campo modelo obrigat\xF3rio.",
          dbMessage: "Column 'modelo' cannot be null.",
          status: 400
        });
      }
      if (!item.perfil || !item.perfil.trim()) {
        console.error("VEICULO_SAVE_ERROR - Campo perfil obrigat\xF3rio.");
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "INSERT",
          errorField: "perfil",
          message: "Campo perfil do ve\xEDculo obrigat\xF3rio.",
          dbMessage: "Column 'perfil' cannot be null.",
          status: 400
        });
      }
      if (!item.tipo || !item.tipo.trim()) {
        console.error("VEICULO_SAVE_ERROR - Campo tipo de frota obrigat\xF3rio.");
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "INSERT",
          errorField: "tipo",
          message: "Campo tipo de frota obrigat\xF3rio.",
          dbMessage: "Column 'tipo' cannot be null.",
          status: 400
        });
      }
      const finalUnidadeId = item.unidadeId || (user.perfil !== "admin_master" && user.unidadeId !== "Todas" ? user.unidadeId : null);
      if (!finalUnidadeId) {
        console.error("VEICULO_SAVE_ERROR - Campo unidadeId obrigat\xF3rio.");
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "INSERT",
          errorField: "unidadeId",
          message: "Campo unidadeId obrigat\xF3rio.",
          dbMessage: "Constraint failure: Column 'unidadeId' is foreign key and cannot be null.",
          status: 400
        });
      }
      const plateUpper = item.placa.toUpperCase().replace(/\s+/g, "").trim();
      item.placa = plateUpper;
      item.id = plateUpper;
      const list = FileDatabase.get("veiculos");
      const duplicate = list.find((v) => v.placa.toUpperCase() === plateUpper || v.id.toUpperCase() === plateUpper);
      if (duplicate) {
        console.error("VEICULO_SAVE_ERROR - Campo placa duplicado.");
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "INSERT",
          errorField: "placa",
          message: "Campo placa duplicado.",
          dbMessage: `duplicate key value violates unique constraint "veiculos_placa_key" (Key placa=${plateUpper} already exists)`,
          status: 400
        });
      }
      if (user.perfil !== "admin_master" && user.unidadeId !== "Todas") {
        item.unidadeId = user.unidadeId;
      } else if (!item.unidadeId) {
        const firstUnitId = FileDatabase.get("unidades")[0]?.id || "un-go";
        item.unidadeId = firstUnitId;
      }
      if (item.motoristaId) {
        const driver = FileDatabase.get("motoristas").find((m) => m.id === item.motoristaId);
        if (driver) {
          const conflicting = FileDatabase.get("veiculos").find((v) => v.motoristaId === item.motoristaId);
          if (conflicting) {
            if (req.body.transferDriver || req.query.transferDriver === "true") {
              conflicting.motoristaId = "";
              FileDatabase.update("veiculos", conflicting.id, conflicting, operator);
              FileDatabase.logAudit(
                operator,
                "TRANSFER\xCANCIA_MOTORISTA",
                `Transferiu: ${driver.nome} De: ${conflicting.placa} Para: ${item.placa || ""}`,
                item.unidadeId || conflicting.unidadeId || ""
              );
            } else {
              const conflictUnitObj = FileDatabase.get("unidades").find((u) => u.id === conflicting.unidadeId);
              return res.status(400).json({
                success: false,
                conflict: true,
                message: "Motorista j\xE1 vinculado",
                driverName: driver.nome,
                vehiclePlaca: conflicting.placa,
                vehiclePrefixo: conflicting.prefixo || `PR-${conflicting.placa.slice(-4)}`,
                vehicleModelo: conflicting.modelo,
                vehicleUnidade: conflictUnitObj ? conflictUnitObj.nome : `Filial ${conflicting.unidadeId}`,
                vehicleId: conflicting.id
              });
            }
          }
        }
      }
      if (item.status === "Bloqueado" && !item.motivoBloqueio) {
        item.motivoBloqueio = "Bloqueio operacional preventivo";
      } else if (item.status === "Liberado") {
        item.motivoBloqueio = "";
      }
      console.log("[BACKEND LOG] Enviando para o banco de dados (FileDatabase):", JSON.stringify(item, null, 2));
      const added = FileDatabase.add("veiculos", item, operator);
      console.log("VEICULO_SAVE_SUCCESS", JSON.stringify(added));
      res.setHeader("Content-Type", "application/json");
      res.json({
        success: true,
        message: "Ve\xEDculo cadastrado com sucesso",
        data: added
      });
    } catch (err) {
      console.error("VEICULO_SAVE_ERROR - Erro imprevisto no backend:", err);
      return handleApiError(res, {
        tableName: "veiculos",
        operation: "INSERT",
        message: "Falha imprevista no servidor de banco de dados.",
        dbMessage: err.message || "Unknown database error.",
        status: 500
      });
    }
  });
  app.put(["/api/veiculos/:id", "/veiculos/:id"], (req, res) => {
    console.log("VEICULO_EDIT_START");
    console.log("ID recebido:", req.params.id);
    console.log("Dados recebidos:", JSON.stringify(req.body, null, 2));
    console.log("Endpoint utilizado: PUT /veiculos/:id ou /api/veiculos/:id");
    try {
      const user = getRequestUser(req);
      if (!user) {
        console.error("VEICULO_EDIT_ERROR - Usu\xE1rio n\xE3o autorizado.");
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "UPDATE",
          errorField: "x-user-email",
          message: "Usu\xE1rio sem permiss\xE3o.",
          dbMessage: "Unauthorized: Active session credentials missing.",
          status: 401
        });
      }
      const item = req.body;
      const operator = user.email;
      const current = FileDatabase.get("veiculos").find((x) => x.id === req.params.id || x.placa && x.placa === req.params.id);
      if (!current) {
        console.error(`VEICULO_EDIT_ERROR - Ve\xEDculo com id ${req.params.id} n\xE3o encontrado.`);
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "UPDATE",
          errorField: "id",
          message: "Ve\xEDculo n\xE3o encontrado.",
          dbMessage: `Record with id '${req.params.id}' was not found in table 'veiculos'.`,
          status: 404
        });
      }
      if (user.perfil !== "admin_master" && current.unidadeId !== user.unidadeId) {
        console.error("VEICULO_EDIT_ERROR - Permiss\xE3o de UPDATE negada por unidade.");
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "UPDATE",
          errorField: "unidadeId",
          message: "Usu\xE1rio sem permiss\xE3o.",
          dbMessage: "Access denied. Operation requires administrative rights or matching unit.",
          status: 403
        });
      }
      if (item.placa !== void 0 && (!item.placa || !item.placa.trim())) {
        console.error("VEICULO_EDIT_ERROR - Placa vazia.");
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "UPDATE",
          errorField: "placa",
          message: "ID inv\xE1lido. Campo placa obrigat\xF3rio.",
          dbMessage: "Column 'placa' cannot be null.",
          status: 400
        });
      }
      if (item.modelo !== void 0 && (!item.modelo || !item.modelo.trim())) {
        console.error("VEICULO_EDIT_ERROR - Modelo vazio.");
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "UPDATE",
          errorField: "modelo",
          message: "Campo modelo obrigat\xF3rio.",
          dbMessage: "Column 'modelo' cannot be null.",
          status: 400
        });
      }
      if (item.placa !== void 0) {
        const plateUpper = item.placa.toUpperCase().replace(/\s+/g, "").trim();
        if (plateUpper !== current.placa.toUpperCase()) {
          const list = FileDatabase.get("veiculos");
          const duplicate = list.find((v) => v.id !== current.id && (v.placa.toUpperCase() === plateUpper || v.id.toUpperCase() === plateUpper));
          if (duplicate) {
            console.error("VEICULO_EDIT_ERROR - Placa duplicada.");
            return handleApiError(res, {
              tableName: "veiculos",
              operation: "UPDATE",
              errorField: "placa",
              message: "Campo placa duplicado.",
              dbMessage: `duplicate key value violates unique constraint "veiculos_placa_key" (Key placa=${plateUpper} already exists)`,
              status: 400
            });
          }
        }
      }
      if (user.perfil !== "admin_master") {
        item.unidadeId = user.unidadeId;
      } else if (!item.unidadeId) {
        item.unidadeId = current.unidadeId || "un-go";
      }
      if (item.motoristaId) {
        const driver = FileDatabase.get("motoristas").find((m) => m.id === item.motoristaId);
        if (driver) {
          const conflicting = FileDatabase.get("veiculos").find((v) => v.motoristaId === item.motoristaId && v.id !== current.id);
          if (conflicting) {
            if (req.body.transferDriver || req.query.transferDriver === "true") {
              conflicting.motoristaId = "";
              FileDatabase.update("veiculos", conflicting.id, conflicting, operator);
              FileDatabase.logAudit(
                operator,
                "TRANSFER\xCANCIA_MOTORISTA",
                `Transferiu: ${driver.nome} De: ${conflicting.placa} Para: ${item.placa || current.placa}`,
                item.unidadeId || current.unidadeId || conflicting.unidadeId || ""
              );
            } else {
              const conflictUnitObj = FileDatabase.get("unidades").find((u) => u.id === conflicting.unidadeId);
              return res.status(400).json({
                success: false,
                conflict: true,
                message: "Motorista j\xE1 vinculado",
                driverName: driver.nome,
                vehiclePlaca: conflicting.placa,
                vehiclePrefixo: conflicting.prefixo || `PR-${conflicting.placa.slice(-4)}`,
                vehicleModelo: conflicting.modelo,
                vehicleUnidade: conflictUnitObj ? conflictUnitObj.nome : `Filial ${conflicting.unidadeId}`,
                vehicleId: conflicting.id
              });
            }
          }
        }
      }
      if (item.status === "Liberado") {
        item.motivoBloqueio = "";
      }
      console.log("[BACKEND LOG] Enviando atualiza\xE7\xE3o de ve\xEDculo para o banco:", JSON.stringify(item, null, 2));
      const updated = FileDatabase.update("veiculos", current.id, item, operator);
      console.log("VEICULO_EDIT_SUCCESS");
      console.log("Resultado da opera\xE7\xE3o:", JSON.stringify(updated));
      res.setHeader("Content-Type", "application/json");
      res.json({
        success: true,
        message: "Ve\xEDculo updated com sucesso",
        data: updated
      });
    } catch (err) {
      console.error("VEICULO_EDIT_ERROR - Falha imprevista no UPDATE:", err);
      return handleApiError(res, {
        tableName: "veiculos",
        operation: "UPDATE",
        message: "Falha imprevista no servidor de banco de dados.",
        dbMessage: err.message || "Unknown database error.",
        status: 500
      });
    }
  });
  app.post(["/api/veiculos/:id/remover-motorista", "/veiculos/:id/remover-motorista"], (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) {
        return res.status(401).json({ success: false, error: "N\xE3o autorizado" });
      }
      const current = FileDatabase.get("veiculos").find((v) => v.id === req.params.id);
      if (!current) {
        return res.status(404).json({ success: false, error: "Ve\xEDculo n\xE3o encontrado" });
      }
      const motoristaId = current.motoristaId;
      let motoristaNome = "Motorista";
      if (motoristaId) {
        const motorista = FileDatabase.get("motoristas").find((m) => m.id === motoristaId);
        if (motorista) motoristaNome = motorista.nome;
      }
      const oldPlaca = current.placa;
      current.motoristaId = "";
      const updated = FileDatabase.update("veiculos", current.id, current, user.email);
      FileDatabase.logAudit(
        user.email,
        "V\xCDNCULO_REMOVIDO",
        `Motorista ${motoristaNome} removido do ve\xEDculo ${oldPlaca}`,
        current.unidadeId || ""
      );
      res.json({
        success: true,
        message: "Motorista removido do ve\xEDculo com sucesso",
        data: updated
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  app.delete(["/api/veiculos/:id", "/veiculos/:id"], (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) {
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "DELETE",
          errorField: "x-user-email",
          message: "Usu\xE1rio sem permiss\xE3o de DELETE.",
          dbMessage: "Unauthorized: Request credentials missing.",
          status: 401
        });
      }
      const current = FileDatabase.get("veiculos").find((x) => x.id === req.params.id);
      if (!current) {
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "DELETE",
          errorField: "id",
          message: "Registro n\xE3o encontrado.",
          dbMessage: `Record with plate ID '${req.params.id}' was not found in table 'veiculos'.`,
          status: 404
        });
      }
      if (user.perfil !== "admin_master" && current.unidadeId !== user.unidadeId) {
        return handleApiError(res, {
          tableName: "veiculos",
          operation: "DELETE",
          errorField: "unidadeId",
          message: "Usu\xE1rio sem permiss\xE3o de DELETE.",
          dbMessage: "Access denied. Operation requires administrative privileges or matching unit.",
          status: 403
        });
      }
      const operator = user.email;
      FileDatabase.delete("veiculos", req.params.id, operator);
      res.setHeader("Content-Type", "application/json");
      res.json({ success: true, message: "Ve\xEDculo removido com sucesso" });
    } catch (err) {
      return handleApiError(res, {
        tableName: "veiculos",
        operation: "DELETE",
        message: "Falha imprevista no servidor de banco de dados.",
        dbMessage: err.message || "Unknown database error.",
        status: 500
      });
    }
  });
  app.get("/api/disponibilidade", (req, res) => {
    const { data, date, periodo, startDate, endDate, unidadeId, veiculoId, motoristaId } = req.query;
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const list = FileDatabase.get("disponibilidade_diaria");
    const rotas = FileDatabase.get("rotas");
    const getWeekRange = (dateStr) => {
      const d = /* @__PURE__ */ new Date(dateStr + "T12:00:00");
      const day = d.getDay();
      const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diffToMonday));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const pad = (n) => String(n).padStart(2, "0");
      const mondayStr = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
      const sundayStr = `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`;
      return { start: mondayStr, end: sundayStr };
    };
    let mappedList = list.map((item) => {
      const formDate = item.data_disponibilidade || item.data;
      const vehicleId = item.veiculo_id || item.veiculoId;
      const isRoteirizado = rotas.some((r) => r.veiculoId === vehicleId && r.data === formDate);
      const uid = item.unidade_id || item.unidadeId || item.unidade || "un-go";
      return {
        id: item.id,
        data: formDate,
        data_disponibilidade: formDate,
        unidadeId: uid,
        unidade: uid,
        veiculoId: vehicleId,
        veiculo_id: vehicleId,
        motoristaId: item.motorista_id || item.motoristaId,
        motorista_id: item.motorista_id || item.motoristaId,
        prioridade: item.prioridade || "M\xE9dia",
        roteirizado: isRoteirizado,
        status_disponibilidade: isRoteirizado ? "ROTEIRIZADO" : "N\xC3O ROTEIRIZADO",
        created_at: item.created_at || (/* @__PURE__ */ new Date()).toISOString(),
        motivoOciosidade: item.motivoOciosidade || item.motivo_ociosidade || ""
      };
    });
    const activeUnit = getRequestUnitContext(req, user);
    if (activeUnit !== "Todas") {
      mappedList = mappedList.filter((d) => d.unidade === activeUnit);
    } else if (unidadeId && unidadeId !== "Todas") {
      mappedList = mappedList.filter((d) => d.unidade === unidadeId);
    }
    let refDate = date || data || "2026-06-12";
    if (refDate.includes("/")) {
      const pts = refDate.split("/");
      if (pts.length === 3) {
        refDate = `${pts[2]}-${pts[1]}-${pts[0]}`;
      } else if (pts.length === 2) {
        refDate = `${pts[1]}-${pts[0]}-01`;
      }
    }
    if (periodo && periodo !== "Todas" && periodo !== "Personalizado" && periodo !== "Customizada") {
      if (periodo === "Dia") {
        mappedList = mappedList.filter((x) => x.data === refDate || x.data_disponibilidade === refDate);
      } else if (periodo === "Semana") {
        const range = getWeekRange(refDate);
        mappedList = mappedList.filter((x) => {
          const dVal = x.data_disponibilidade || x.data;
          return dVal >= range.start && dVal <= range.end;
        });
      } else if (periodo === "M\xEAs") {
        const monthPrefix = refDate.slice(0, 7);
        mappedList = mappedList.filter((x) => {
          const dVal = x.data_disponibilidade || x.data;
          return dVal.startsWith(monthPrefix);
        });
      } else if (periodo === "Ano") {
        const yearPrefix = refDate.slice(0, 4);
        mappedList = mappedList.filter((x) => {
          const dVal = x.data_disponibilidade || x.data;
          return dVal.startsWith(yearPrefix);
        });
      }
    } else if (startDate && endDate) {
      mappedList = mappedList.filter((x) => {
        const dVal = x.data_disponibilidade || x.data;
        return dVal >= startDate && dVal <= endDate;
      });
    } else if (date || data) {
      const checkDate = refDate;
      if (checkDate.length === 10) {
        mappedList = mappedList.filter((x) => x.data === checkDate || x.data_disponibilidade === checkDate);
      } else if (checkDate.length === 7) {
        mappedList = mappedList.filter((x) => x.data.startsWith(checkDate) || x.data_disponibilidade && x.data_disponibilidade.startsWith(checkDate));
      } else {
        mappedList = mappedList.filter((x) => x.data.startsWith(checkDate) || x.data_disponibilidade && x.data_disponibilidade.startsWith(checkDate));
      }
    }
    if (veiculoId && veiculoId !== "Todos" && veiculoId !== "") {
      mappedList = mappedList.filter((x) => x.veiculoId === veiculoId);
    }
    if (motoristaId && motoristaId !== "Todos" && motoristaId !== "") {
      mappedList = mappedList.filter((x) => x.motoristaId === motoristaId);
    }
    res.json(mappedList);
  });
  app.post("/api/disponibilidade", (req, res) => {
    const disps = req.body;
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const operator = user.email;
    if (!Array.isArray(disps)) {
      return res.status(400).json({ error: "Payload deve ser uma lista" });
    }
    let current = FileDatabase.get("disponibilidade") || [];
    let currentDiaria = FileDatabase.get("disponibilidade_diaria") || [];
    const rotas = FileDatabase.get("rotas") || [];
    const targetDate = disps[0]?.data || disps[0]?.data_disponibilidade;
    if (targetDate) {
      const targetUnits = Array.from(new Set(disps.map((item) => {
        return user.perfil !== "admin_master" ? user.unidadeId : item.unidadeId || item.unidade_id || item.unidade || (FileDatabase.get("unidades")[0]?.id || "un-go");
      })));
      current = current.filter((x) => !(x.data === targetDate && targetUnits.includes(x.unidadeId || x.unidade)));
      currentDiaria = currentDiaria.filter((x) => !((x.data_disponibilidade === targetDate || x.data === targetDate) && targetUnits.includes(x.unidade_id)));
    }
    disps.forEach((item) => {
      const uId = user.perfil !== "admin_master" ? user.unidadeId : item.unidadeId || item.unidade_id || item.unidade || (FileDatabase.get("unidades")[0]?.id || "un-go");
      const formDate = item.data || item.data_disponibilidade;
      const isRoteirizado = rotas.some((r) => r.veiculoId === item.veiculoId && r.data === formDate);
      const dbRecord = {
        id: item.id || `disp-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
        data: formDate,
        data_disponibilidade: formDate,
        unidadeId: uId,
        unidade: uId,
        veiculoId: item.veiculoId || item.veiculo_id,
        veiculo_id: item.veiculoId || item.veiculo_id,
        motoristaId: item.motoristaId || item.motorista_id,
        motorista_id: item.motoristaId || item.motorista_id,
        prioridade: item.prioridade || "M\xE9dia",
        roteirizado: isRoteirizado,
        status_disponibilidade: isRoteirizado ? "ROTEIRIZADO" : "N\xC3O ROTEIRIZADO",
        created_at: item.created_at || (/* @__PURE__ */ new Date()).toISOString(),
        motivoOciosidade: item.motivoOciosidade || ""
      };
      const dbDiariaRecord = {
        id: dbRecord.id,
        data_disponibilidade: formDate,
        unidade_id: uId,
        veiculo_id: dbRecord.veiculoId,
        motorista_id: dbRecord.motoristaId,
        prioridade: dbRecord.prioridade,
        created_at: dbRecord.created_at,
        updated_at: (/* @__PURE__ */ new Date()).toISOString(),
        motivoOciosidade: dbRecord.motivoOciosidade || ""
      };
      current.push(dbRecord);
      currentDiaria.push(dbDiariaRecord);
    });
    FileDatabase.set("disponibilidade", current);
    FileDatabase.set("disponibilidade_diaria", currentDiaria);
    logApiAction(operator, "DISPONIBILIDADE_SALVOS", `Controle de disponibilidade gravado (${disps.length} ve\xEDculos).`);
    res.json({ success: true });
  });
  app.put("/api/disponibilidade/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const { id } = req.params;
    const fields = req.body;
    if (fields.motivoOciosidade !== void 0) {
      fields.motivo_ociosidade = fields.motivoOciosidade;
    }
    const updated = FileDatabase.update("disponibilidade", id, fields, user.email);
    if (updated) {
      const fieldsDiaria = {};
      if (fields.prioridade) fieldsDiaria.prioridade = fields.prioridade;
      if (fields.motoristaId || fields.motorista_id) fieldsDiaria.motorista_id = fields.motoristaId || fields.motorista_id;
      fieldsDiaria.updated_at = (/* @__PURE__ */ new Date()).toISOString();
      FileDatabase.update("disponibilidade_diaria", id, fieldsDiaria, user.email);
      res.json({ success: true, item: updated });
    } else {
      res.status(404).json({ error: "Disponibilidade n\xE3o encontrada" });
    }
  });
  app.get("/api/rotas", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const list = FileDatabase.get("rotas");
    const activeUnit = getRequestUnitContext(req, user);
    if (activeUnit === "Todas") return res.json(list);
    res.json(list.filter((r) => r.unidadeId === activeUnit));
  });
  app.post("/api/rotas", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const item = req.body;
    const operator = user.email;
    if (user.perfil !== "admin_master") {
      item.unidadeId = user.unidadeId;
    }
    const allRoutes = FileDatabase.get("rotas") || [];
    const isRepeated = allRoutes.some((r) => r.dt === item.dt);
    if (isRepeated && item.tipo !== "Reentrega") {
      return res.status(400).json({ error: "\u274C DT EM DUPLICIDADE\nN\xE3o \xE9 poss\xEDvel salvar. Esta DT j\xE1 est\xE1 cadastrada no sistema." });
    }
    if (!item.status_viagem) {
      item.status_viagem = "Aguardando Carregamento";
    }
    const sv = item.status_viagem.trim().toLowerCase();
    if (sv === "aguardando carregamento" || sv === "ag. carregamento" || sv === "aguardando carga") {
      item.status = "Aguardando carregamento";
    } else if (sv === "em carregamento") {
      item.status = "Em carregamento";
    } else if (sv === "em rota" || sv === "em rota (entregando)") {
      item.status = "Em rota";
    } else if (sv === "aguardando descarga" || sv === "ag. descarga" || sv === "ag.descarga" || sv === "em descarga") {
      item.status = "Em descarga";
    } else if (sv === "finalizada") {
      item.status = "Finalizada";
    }
    const nowObj = /* @__PURE__ */ new Date();
    const dStr = nowObj.toISOString().split("T")[0];
    const tStr = nowObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    item.historico_status = [
      {
        data: dStr,
        hora: tStr,
        status: item.status_viagem,
        usuario: operator
      }
    ];
    item.id = `DT-${item.dt}`;
    const added = FileDatabase.add("rotas", item, operator);
    const disps = FileDatabase.get("disponibilidade");
    const dIdx = disps.findIndex((d) => d.veiculoId === item.veiculoId && d.data === item.data);
    if (dIdx !== -1) {
      disps[dIdx].roteirizado = true;
      FileDatabase.set("disponibilidade", disps);
    }
    if (item.motoristaId) {
      const dbDrivers = FileDatabase.get("motoristas") || [];
      const mName = dbDrivers.find((x) => x.id === item.motoristaId)?.nome || item.motoristaId;
      const sugNames = (item.equipeSugeridaIds || []).map((id) => dbDrivers.find((x) => x.id === id)?.nome || id).join(", ") || "Nenhum";
      const utilNames = (item.ajudantesIds || []).map((id) => dbDrivers.find((x) => x.id === id)?.nome || id).join(", ") || "Nenhum";
      FileDatabase.logAudit(
        operator,
        "Forma\xE7\xE3o de Equipe",
        `DT #${item.dt} - Motorista: ${mName} | Sugerido: [${sugNames}] | Utilizado: [${utilNames}]`
      );
    }
    res.json(added);
  });
  app.put("/api/rotas/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const item = req.body;
    const operator = user.email;
    const current = FileDatabase.get("rotas").find((x) => x.id === req.params.id);
    if (!current) return res.status(404).json({ error: "Rota n\xE3o localizada" });
    if (user.perfil !== "admin_master" && current.unidadeId !== user.unidadeId) {
      return res.status(403).json({ error: "Acesso negado para altera\xE7\xE3o de rotas." });
    }
    if (user.perfil !== "admin_master") {
      item.unidadeId = user.unidadeId;
    }
    const logAlteracoes = current.log_alteracoes || [];
    const changedFields = [];
    const dStr = (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR");
    const tStr = (/* @__PURE__ */ new Date()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const getDriverName = (id) => {
      const dbDrivers = FileDatabase.get("motoristas") || [];
      const m = dbDrivers.find((x) => x.id === id);
      return m ? m.nome : id || "N/D";
    };
    const getVehiclePlate = (id) => {
      const dbVehicles = FileDatabase.get("veiculos") || [];
      const v = dbVehicles.find((x) => x.id === id);
      return v ? v.placa : id || "N/D";
    };
    const recordChange = (campo, antes, depois) => {
      if (antes !== depois && depois !== void 0) {
        changedFields.push({
          data: dStr,
          hora: tStr,
          usuario: user.nome || user.email,
          campo,
          antes: String(antes),
          depois: String(depois)
        });
      }
    };
    if (item.motoristaId !== void 0) {
      recordChange("Motorista", getDriverName(current.motoristaId), getDriverName(item.motoristaId));
    }
    if (item.veiculoId !== void 0) {
      recordChange("Ve\xEDculo", getVehiclePlate(current.veiculoId), getVehiclePlate(item.veiculoId));
    }
    if (item.data !== void 0) {
      recordChange("Data de Sa\xEDda", current.data || "", item.data);
    }
    if (item.dataPrevista !== void 0) {
      recordChange("Data Prevista", current.dataPrevista || "N/A", item.dataPrevista || "N/A");
    }
    if (item.status_viagem !== void 0) {
      recordChange("Status da Viagem", current.status_viagem || current.status || "", item.status_viagem);
    }
    if (item.totalEntregas !== void 0) {
      recordChange("Quantidade Prevista", current.totalEntregas ?? 0, item.totalEntregas ?? 0);
    }
    if (item.entregues !== void 0) {
      recordChange("Quantidade Entregue", current.entregues ?? 0, item.entregues ?? 0);
    }
    if (item.recusadas !== void 0) {
      recordChange("Quantidade Recusada", current.recusadas ?? 0, item.recusadas ?? 0);
    }
    if (item.devolucoes !== void 0) {
      recordChange("Quantidade Devolvida", current.devolucoes ?? 0, item.devolucoes ?? 0);
    }
    if (item.observacoes_operacionais !== void 0) {
      recordChange("Observa\xE7\xF5es Operacionais", current.observacoes_operacionais || "Nenhuma", item.observacoes_operacionais || "Nenhuma");
    }
    if (changedFields.length > 0) {
      item.log_alteracoes = [...changedFields, ...logAlteracoes];
    }
    const newStatusViagem = item.status_viagem || (item.status ? item.status : void 0);
    if (newStatusViagem && newStatusViagem !== current.status_viagem) {
      item.status_viagem = newStatusViagem;
      const sv = newStatusViagem.trim().toLowerCase();
      if (sv === "aguardando carregamento" || sv === "ag. carregamento" || sv === "aguardando carga") {
        item.status = "Aguardando carregamento";
      } else if (sv === "em carregamento") {
        item.status = "Em carregamento";
      } else if (sv === "em rota" || sv === "em rota (entregando)") {
        item.status = "Em rota";
      } else if (sv === "aguardando descarga" || sv === "ag. descarga" || sv === "ag.descarga" || sv === "em descarga") {
        item.status = "Em descarga";
      } else if (sv === "finalizada") {
        item.status = "Finalizada";
      }
      const nowObj = /* @__PURE__ */ new Date();
      const h_dStr = nowObj.toISOString().split("T")[0];
      const h_tStr = nowObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const currentHistory = current.historico_status || [];
      const updatedHistory = [...currentHistory, {
        data: h_dStr,
        hora: h_tStr,
        status: item.status_viagem,
        usuario: operator
      }];
      item.historico_status = updatedHistory;
    }
    if (item.motoristaId) {
      const dbDrivers = FileDatabase.get("motoristas") || [];
      const mName = dbDrivers.find((x) => x.id === item.motoristaId)?.nome || item.motoristaId;
      const sugNames = (item.equipeSugeridaIds || []).map((id) => dbDrivers.find((x) => x.id === id)?.nome || id).join(", ") || "Nenhum";
      const utilNames = (item.ajudantesIds || []).map((id) => dbDrivers.find((x) => x.id === id)?.nome || id).join(", ") || "Nenhum";
      FileDatabase.logAudit(
        operator,
        "Forma\xE7\xE3o de Equipe (Edi\xE7\xE3o)",
        `DT #${item.dt || current.dt} - Motorista: ${mName} | Sugerido: [${sugNames}] | Utilizado: [${utilNames}]`
      );
    }
    const updated = FileDatabase.update("rotas", req.params.id, item, operator);
    res.json(updated);
  });
  app.post("/api/rotas/:id/ocorrencias", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const current = FileDatabase.get("rotas").find((x) => x.id === req.params.id);
    if (!current) return res.status(404).json({ error: "DT n\xE3o encontrada" });
    const { tipo, descricao, data, hora } = req.body;
    if (!tipo || !descricao) {
      return res.status(400).json({ error: "Tipo e descri\xE7\xE3o s\xE3o obrigat\xF3rios." });
    }
    const nowObj = /* @__PURE__ */ new Date();
    const dStr = data || nowObj.toLocaleDateString("pt-BR");
    const tStr = hora || nowObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const occItem = {
      id: "occ-" + Math.random().toString(36).substring(2, 9),
      tipo,
      descricao,
      data: dStr,
      hora: tStr,
      usuario: user.nome || user.email
    };
    const occList = current.ocorrencias || [];
    const updatedRoute = {
      ocorrencias: [occItem, ...occList]
    };
    const logAlteracoes = current.log_alteracoes || [];
    updatedRoute.log_alteracoes = [{
      data: dStr,
      hora: tStr,
      usuario: user.nome || user.email,
      campo: "Nova Ocorr\xEAncia",
      antes: "-",
      depois: `[${tipo}] ${descricao}`
    }, ...logAlteracoes];
    const updated = FileDatabase.update("rotas", req.params.id, updatedRoute, user.email);
    res.json({ success: true, updated, occItem });
  });
  app.delete("/api/rotas/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const current = FileDatabase.get("rotas").find((x) => x.id === req.params.id);
    if (!current) return res.status(404).json({ error: "N\xE3o encontrado" });
    if (user.perfil !== "admin_master" && current.unidadeId !== user.unidadeId) {
      return res.status(403).json({ error: "Acesso negado." });
    }
    const operator = user.email;
    FileDatabase.delete("rotas", req.params.id, operator);
    res.json({ success: true });
  });
  app.get("/api/notas-fiscais", (req, res) => {
    const { dtId } = req.query;
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const list = FileDatabase.get("notas_fiscais");
    const activeUnit = getRequestUnitContext(req, user);
    const filteredNfs = list.filter((nf) => {
      if (activeUnit === "Todas") return true;
      const associatedRoute = FileDatabase.get("rotas").find((r) => r.id === nf.dtId);
      return associatedRoute ? associatedRoute.unidadeId === activeUnit : false;
    });
    if (dtId) {
      return res.json(filteredNfs.filter((nf) => nf.dtId === dtId));
    }
    res.json(filteredNfs);
  });
  app.post("/api/notas-fiscais", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const item = req.body;
    const operator = user.email;
    if (user.perfil !== "admin_master") {
      const associatedRoute = FileDatabase.get("rotas").find((r) => r.id === item.dtId);
      if (associatedRoute && associatedRoute.unidadeId !== user.unidadeId) {
        return res.status(403).json({ error: "N\xE3o autorizado" });
      }
    }
    const added = FileDatabase.add("notas_fiscais", item, operator);
    res.json(added);
  });
  app.put("/api/notas-fiscais/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const item = req.body;
    const operator = user.email;
    const current = FileDatabase.get("notas_fiscais").find((x) => x.id === req.params.id);
    if (!current) return res.status(404).json({ error: "N\xE3o encontrado" });
    if (user.perfil !== "admin_master") {
      const associatedRoute = FileDatabase.get("rotas").find((r) => r.id === current.dtId);
      if (associatedRoute && associatedRoute.unidadeId !== user.unidadeId) {
        return res.status(403).json({ error: "N\xE3o autorizado" });
      }
    }
    const updated = FileDatabase.update("notas_fiscais", req.params.id, item, operator);
    res.json(updated);
  });
  app.delete("/api/notas-fiscais/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const current = FileDatabase.get("notas_fiscais").find((x) => x.id === req.params.id);
    if (!current) return res.status(404).json({ error: "N\xE3o encontrado" });
    if (user.perfil !== "admin_master") {
      const associatedRoute = FileDatabase.get("rotas").find((r) => r.id === current.dtId);
      if (associatedRoute && associatedRoute.unidadeId !== user.unidadeId) {
        return res.status(403).json({ error: "N\xE3o autorizado" });
      }
    }
    const operator = user.email;
    FileDatabase.delete("notas_fiscais", req.params.id, operator);
    res.json({ success: true });
  });
  app.get("/api/recebimentos", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const list = FileDatabase.get("contas_a_receber") || [];
      const activeUnit = getRequestUnitContext(req, user);
      let filtered = [...list];
      if (activeUnit !== "Todas") {
        filtered = filtered.filter((r) => r.unidadeId === activeUnit);
      }
      if (list.length === 0) {
        const fechamentos2 = FileDatabase.get("fechamentos_dt") || [];
        const nfs = FileDatabase.get("notas_fiscais") || [];
        const rotas = FileDatabase.get("rotas") || [];
        const motoristas = FileDatabase.get("motoristas") || [];
        const veiculos = FileDatabase.get("veiculos") || [];
        const clients = ["Heineken", "Ambev", "Coca-Cola Femsa", "Nestl\xE9", "Kabin", "Pepsico", "Unilever"];
        const generated = [];
        fechamentos2.forEach((f, idx) => {
          const associatedRoute = rotas.find((r) => r.dt === f.dt);
          const associatedNf = nfs.find((nf) => nf.dtId === f.id || nf.dtId === `DT-${f.dt}` || nf.dtId === f.dt);
          let clientName = associatedNf?.cliente || clients[idx % clients.length];
          const driverObj = motoristas.find((m) => m.id === f.motoristaId);
          const vehicleObj = veiculos.find((v) => v.id === f.veiculoId);
          const frete = f.freteValor !== void 0 ? Number(f.freteValor) : 1850;
          const ped = f.pedagios !== void 0 ? Number(f.pedagios) : 120;
          const diar = f.diariasBonificacoes !== void 0 ? Number(f.diariasBonificacoes) : 0;
          const acresc = f.outrosCreditos !== void 0 ? Number(f.outrosCreditos) : 0;
          const tot = frete + ped + diar + acresc;
          const deliveryDate = f.dataFechamento || "2026-06-19";
          const dParts = deliveryDate.split("-");
          let dueDate = deliveryDate;
          if (dParts.length === 3) {
            const d = new Date(Number(dParts[0]), Number(dParts[1]) - 1, Number(dParts[2]));
            d.setDate(d.getDate() + 30);
            dueDate = d.toISOString().split("T")[0];
          }
          let st = "A Receber";
          if (idx % 3 === 0) {
            st = "Recebido";
          } else if (idx % 4 === 0) {
            st = "Parcial";
          } else {
            const todayStr = "2026-06-27";
            if (dueDate < todayStr) {
              st = "Vencido";
            }
          }
          const newTitle = {
            id: `REC-${f.dt || Math.floor(1e5 + Math.random() * 9e5)}`,
            dt: f.dt,
            cliente: clientName,
            veiculoId: f.veiculoId || (vehicleObj?.placa || "AAA-0000"),
            motoristaId: driverObj?.nome || f.motoristaId || "Motorista n\xE3o identificado",
            origem: "Goi\xE2nia - Matriz",
            destino: "An\xE1polis - DF",
            valorFrete: frete,
            valorPedagiosReembolsaveis: ped,
            valorDiarias: diar,
            outrosAcrescimos: acresc,
            valorTotal: tot,
            dataEntrega: deliveryDate,
            dataVencimento: dueDate,
            status: st,
            responsavel: f.usuarioResponsavel || "Sistema",
            observacoes: `Gerado automaticamente a partir do faturamento da DT ${f.dt}`,
            unidadeId: f.unidadeId || "un-go",
            dataRecebimento: st === "Recebido" ? dueDate : st === "Parcial" ? dueDate : void 0,
            valorRecebido: st === "Recebido" ? tot : st === "Parcial" ? Math.round(tot * 0.4) : void 0,
            formaRecebimento: st === "Recebido" || st === "Parcial" ? "PIX" : void 0,
            observacaoBaixa: st === "Recebido" || st === "Parcial" ? "Baixa autom\xE1tica de teste" : void 0,
            historicoBaixas: st === "Recebido" ? [
              {
                data: dueDate,
                valor: tot,
                forma: "PIX",
                observacao: "Baixa autom\xE1tica integral",
                usuario: "financeiro@ampla.com"
              }
            ] : st === "Parcial" ? [
              {
                data: dueDate,
                valor: Math.round(tot * 0.4),
                forma: "PIX",
                observacao: "Baixa parcial de 40%",
                usuario: "financeiro@ampla.com"
              }
            ] : []
          };
          generated.push(newTitle);
        });
        if (generated.length > 0) {
          FileDatabase.set("contas_a_receber", generated);
          filtered = activeUnit === "Todas" ? generated : generated.filter((r) => r.unidadeId === activeUnit);
        }
      }
      const fechamentos = FileDatabase.get("fechamentos_dt") || [];
      const enriched = filtered.map((r) => {
        const f = fechamentos.find((cl) => cl.dt === r.dt);
        const valorFrete = r.valorFrete !== void 0 ? Number(r.valorFrete) : f?.freteValor !== void 0 ? Number(f.freteValor) : 1850;
        const valorDisponibilidade = r.valorDisponibilidade !== void 0 ? Number(r.valorDisponibilidade) : f?.disponibilidadeValor !== void 0 ? Number(f.disponibilidadeValor) : 0;
        const valorDescarga = r.valorDescarga !== void 0 ? Number(r.valorDescarga) : f?.houveReciboDescarga === "Sim" ? Number(f?.descargaValor || 0) : 0;
        const valorReentrega = r.valorReentrega !== void 0 ? Number(r.valorReentrega) : f?.reentregaValor !== void 0 ? Number(f.reentregaValor) : 0;
        const outrasReceitas = r.outrasReceitas !== void 0 ? Number(r.outrasReceitas) : f?.outrosCreditos !== void 0 ? Number(f.outrosCreditos) : 0;
        const valorVale = r.valorVale !== void 0 ? Number(r.valorVale) : f?.ocorrencias ? f.ocorrencias.filter((o) => o.tipo === "Falta de Mercadoria").reduce((sum, o) => sum + Number(o.valorTotal || 0), 0) : 0;
        const valorPedagio = r.valorPedagio !== void 0 ? Number(r.valorPedagio) : f?.pedagios !== void 0 ? Number(f.pedagios) : 0;
        const valorAbastecimento = r.valorAbastecimento !== void 0 ? Number(r.valorAbastecimento) : f?.abastecimentoValor !== void 0 ? Number(f.abastecimentoValor) : 0;
        const valorDescontos = r.valorDescontos !== void 0 ? Number(r.valorDescontos) : f?.multasDescontos !== void 0 ? Number(f.multasDescontos) : 0;
        const valorChapas = r.valorChapas !== void 0 ? Number(r.valorChapas) : f?.descargaChapa !== void 0 ? Number(f.descargaChapa) : 0;
        const outrosCustos = r.outrosCustos !== void 0 ? Number(r.outrosCustos) : (f?.lavagensHospedagens || 0) + (f?.alimentacao || 0) + (f?.manutencaoOutros || 0);
        const receitaTotal = valorFrete + valorDisponibilidade + valorDescarga + valorReentrega + outrasReceitas;
        const custoTotal = valorVale + valorPedagio + valorAbastecimento + valorDescontos + valorChapas + outrosCustos;
        const resultadoOperacional = receitaTotal - custoTotal;
        return {
          ...r,
          valorFrete,
          valorDisponibilidade,
          valorDescarga,
          valorReentrega,
          outrasReceitas,
          valorVale,
          valorPedagio,
          valorAbastecimento,
          valorDescontos,
          valorChapas,
          outrosCustos,
          receitaTotal,
          custoTotal,
          resultadoOperacional,
          valorTotal: receitaTotal
        };
      });
      res.json(enriched);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/recebimentos", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const profileType = user.tipo_usuario || "";
      if (profileType === "OPERADOR") {
        return res.status(403).json({ error: "Voc\xEA n\xE3o possui n\xEDvel de permiss\xE3o suficiente para realizar lan\xE7amentos." });
      }
      const item = req.body;
      const operator = user.email;
      if (!item.dt || !item.cliente || !item.valorTotal) {
        return res.status(400).json({ error: "Campos obrigat\xF3rios ausentes." });
      }
      const list = FileDatabase.get("contas_a_receber") || [];
      const newId = `REC-${item.dt}-${Math.floor(1e3 + Math.random() * 9e3)}`;
      const newTitle = {
        id: newId,
        dt: item.dt,
        cliente: item.cliente,
        veiculoId: item.veiculoId || "AAA-0000",
        motoristaId: item.motoristaId || "Motorista",
        origem: item.origem || "Goi\xE2nia",
        destino: item.destino || "S\xE3o Paulo",
        valorFrete: Number(item.valorFrete || 0),
        valorPedagiosReembolsaveis: Number(item.valorPedagiosReembolsaveis || 0),
        valorDiarias: Number(item.valorDiarias || 0),
        outrosAcrescimos: Number(item.outrosAcrescimos || 0),
        valorTotal: Number(item.valorTotal || 0),
        dataEntrega: item.dataEntrega || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        dataVencimento: item.dataVencimento || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        status: item.status || "A Receber",
        responsavel: operator,
        observacoes: item.observacoes || "",
        unidadeId: user.unidadeId !== "Todas" ? user.unidadeId : item.unidadeId || "un-go",
        historicoBaixas: []
      };
      list.push(newTitle);
      FileDatabase.set("contas_a_receber", list);
      FileDatabase.logAudit(
        operator,
        "RECEBIMENTO_MANUAL_CRIADO",
        `Lan\xE7amento manual de faturamento criado para o cliente ${item.cliente}, DT: ${item.dt}, Valor: R$ ${item.valorTotal}.`,
        newTitle.unidadeId
      );
      res.json({ success: true, item: newTitle });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/recebimentos/:id", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const profileType = user.tipo_usuario || "";
      if (profileType === "OPERADOR") {
        return res.status(403).json({ error: "Voc\xEA n\xE3o possui n\xEDvel de permiss\xE3o suficiente para editar faturamentos." });
      }
      const list = FileDatabase.get("contas_a_receber") || [];
      const idx = list.findIndex((x) => x.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: "T\xEDtulo n\xE3o localizado." });
      const current = list[idx];
      const updated = { ...current, ...req.body };
      list[idx] = updated;
      FileDatabase.set("contas_a_receber", list);
      FileDatabase.logAudit(
        user.email,
        "RECEBIMENTO_ATUALIZADO",
        `T\xEDtulo faturado ${req.params.id} do cliente ${updated.cliente} foi alterado.`,
        updated.unidadeId
      );
      res.json({ success: true, item: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/recebimentos/:id", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const profileType = user.tipo_usuario || "";
      if (profileType !== "MASTER" && user.perfil !== "admin_master") {
        return res.status(403).json({ error: "Apenas administradores MASTER podem expurgar faturamentos." });
      }
      const list = FileDatabase.get("contas_a_receber") || [];
      const idx = list.findIndex((x) => x.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: "T\xEDtulo n\xE3o localizado." });
      const deleted = list.splice(idx, 1)[0];
      FileDatabase.set("contas_a_receber", list);
      FileDatabase.logAudit(
        user.email,
        "RECEBIMENTO_EXPURGADO",
        `T\xEDtulo faturado ${req.params.id} do cliente ${deleted.cliente} foi expurgado sob seguran\xE7a m\xE1xima.`,
        deleted.unidadeId
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/recebimentos/:id/receber", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const profileType = user.tipo_usuario || "";
      if (profileType === "OPERADOR" || profileType === "SUPERVISOR") {
        return res.status(403).json({ error: "N\xEDvel de permiss\xE3o insuficiente para efetuar baixas financeiras." });
      }
      const { data, valorRecebido, formaRecebimento, observacao } = req.body;
      if (!data || !valorRecebido || !formaRecebimento) {
        return res.status(400).json({ error: "Data, valor e forma de recebimento s\xE3o obrigat\xF3rios." });
      }
      const list = FileDatabase.get("contas_a_receber") || [];
      const idx = list.findIndex((x) => x.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: "T\xEDtulo n\xE3o localizado." });
      const current = list[idx];
      const previousPaid = (current.historicoBaixas || []).reduce((sum, b) => sum + Number(b.valor), 0);
      const remainingBalance = Number(current.valorTotal) - previousPaid;
      const newPaid = Number(valorRecebido);
      if (newPaid <= 0) {
        return res.status(400).json({ error: "O valor recebido deve ser maior que zero." });
      }
      if (newPaid > remainingBalance + 0.01) {
        return res.status(400).json({ error: `Valor recebido excede o saldo em aberto de R$ ${remainingBalance.toFixed(2)}.` });
      }
      const newBaixa = {
        data,
        valor: newPaid,
        forma: formaRecebimento,
        observacao: observacao || "",
        usuario: user.email
      };
      const newHistory = [...current.historicoBaixas || [], newBaixa];
      const totalPaidUpdated = previousPaid + newPaid;
      let finalStatus = "Parcial";
      if (Math.abs(totalPaidUpdated - Number(current.valorTotal)) < 0.1) {
        finalStatus = "Recebido";
      }
      const updated = {
        ...current,
        status: finalStatus,
        dataRecebimento: data,
        valorRecebido: totalPaidUpdated,
        formaRecebimento,
        observacaoBaixa: observacao || "",
        historicoBaixas: newHistory
      };
      list[idx] = updated;
      FileDatabase.set("contas_a_receber", list);
      FileDatabase.logAudit(
        user.email,
        "RECEBIMENTO_BAIXA",
        `Baixa ${finalStatus === "Recebido" ? "total" : "parcial"} efetuada no faturamento ${current.id} do cliente ${current.cliente}. Recebeu R$ ${newPaid}.`,
        current.unidadeId
      );
      const currentMovements = FileDatabase.get("movimentacoes_financeiras") || [];
      const newMovement = {
        id: `MOV-REC-${Date.now()}`,
        pessoaId: current.cliente,
        data,
        hora: (/* @__PURE__ */ new Date()).toTimeString().split(" ")[0],
        tipo: "Cr\xE9dito",
        origem: "Recebimento Cliente",
        valor: newPaid,
        observacao: `Recebimento Ref: ${current.id} \u2022 DT: ${current.dt} \u2022 Cliente: ${current.cliente}`,
        saldoAnterior: 0,
        saldoPosterior: 0,
        usuario: user.email,
        dtId: current.dt,
        criadoEm: (/* @__PURE__ */ new Date()).toISOString()
      };
      currentMovements.push(newMovement);
      FileDatabase.set("movimentacoes_financeiras", currentMovements);
      res.json({ success: true, item: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/pagamentos", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const list = FileDatabase.get("contas_a_pagar") || [];
      const activeUnit = getRequestUnitContext(req, user);
      let filtered = [...list];
      if (activeUnit !== "Todas") {
        filtered = filtered.filter((r) => r.unidadeId === activeUnit);
      }
      if (list.length === 0) {
        const fechamentos = FileDatabase.get("fechamentos_dt") || [];
        const rotas = FileDatabase.get("rotas") || [];
        const motoristas = FileDatabase.get("motoristas") || [];
        const veiculos = FileDatabase.get("veiculos") || [];
        const generated = [];
        fechamentos.forEach((f, idx) => {
          const associatedRoute = rotas.find((r) => r.dt === f.dt);
          const associatedVeiculo = veiculos.find((v) => v.id === f.veiculoId || v.placa === f.veiculoId);
          if (associatedVeiculo && associatedVeiculo.tipo === "Frota Pr\xF3pria") {
            return;
          }
          const driverObj = motoristas.find((m) => m.id === f.motoristaId);
          const driverName = driverObj?.nome || f.motoristaId || "Motorista";
          const fretePagar = f.freteValor !== void 0 ? Number(f.freteValor) : 1850;
          const disp = f.disponibilidadeValor !== void 0 ? Number(f.disponibilidadeValor) : 0;
          const diar = f.diariasBonificacoes !== void 0 ? Number(f.diariasBonificacoes) : 0;
          const adiantamentosVal = f.adiantamentos !== void 0 ? Number(f.adiantamentos) : 250;
          const valDescontos = f.multasDescontos !== void 0 ? Number(f.multasDescontos) : 0;
          const payTotal = fretePagar + disp + diar - (adiantamentosVal + valDescontos);
          const dateStr = f.dataAcerto || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          let dueDate = dateStr;
          try {
            const d = /* @__PURE__ */ new Date(dateStr + "T12:00:00");
            d.setDate(d.getDate() + 15);
            dueDate = d.toISOString().split("T")[0];
          } catch (e) {
          }
          const payableObj = {
            id: `PAG-${f.dt}-${1e3 + idx}`,
            dt: f.dt,
            cliente: "Heineken",
            motoristaId: f.motoristaId || "mot-1",
            motoristaNome: driverName,
            veiculoId: f.veiculoId || "AAA-0000",
            unidadeId: f.unidadeId || "un-go",
            valorFrete: fretePagar,
            valorDisponibilidade: disp,
            valorDiarias: diar,
            adiantamentos: adiantamentosVal,
            multasDescontos: valDescontos,
            valorTotal: payTotal,
            status: "A Pagar",
            dataGeracao: dateStr,
            dataVencimento: dueDate,
            responsavel: "sistema@ampla.com.br",
            observacoes: `Gerado automaticamente a partir do acerto de viagem da DT ${f.dt}`,
            historicoBaixas: []
          };
          generated.push(payableObj);
        });
        if (generated.length > 0) {
          FileDatabase.set("contas_a_pagar", generated);
          filtered = activeUnit !== "Todas" ? generated.filter((r) => r.unidadeId === activeUnit) : generated;
        }
      }
      res.json(filtered);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/pagamentos", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const profileType = user.tipo_usuario || "";
      if (profileType === "OPERADOR") {
        return res.status(403).json({ error: "Voc\xEA n\xE3o possui n\xEDvel de permiss\xE3o suficiente para realizar lan\xE7amentos." });
      }
      const item = req.body;
      const operator = user.email;
      if (!item.dt || !item.motoristaNome || !item.valorTotal) {
        return res.status(400).json({ error: "Campos obrigat\xF3rios ausentes." });
      }
      const list = FileDatabase.get("contas_a_pagar") || [];
      const newId = `PAG-${item.dt}-${Math.floor(1e3 + Math.random() * 9e3)}`;
      const newTitle = {
        id: newId,
        dt: item.dt,
        cliente: item.cliente || "Heineken",
        motoristaId: item.motoristaId || "manual",
        motoristaNome: item.motoristaNome,
        veiculoId: item.veiculoId || "AAA-0000",
        unidadeId: user.unidadeId !== "Todas" ? user.unidadeId : item.unidadeId || "un-go",
        valorFrete: Number(item.valorFrete || 0),
        valorDisponibilidade: Number(item.valorDisponibilidade || 0),
        valorDiarias: Number(item.valorDiarias || 0),
        adiantamentos: Number(item.adiantamentos || 0),
        multasDescontos: Number(item.multasDescontos || 0),
        valorTotal: Number(item.valorTotal || 0),
        status: item.status || "A Pagar",
        dataGeracao: item.dataGeracao || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        dataVencimento: item.dataVencimento || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        responsavel: operator,
        observacoes: item.observacoes || "",
        historicoBaixas: []
      };
      list.push(newTitle);
      FileDatabase.set("contas_a_pagar", list);
      FileDatabase.logAudit(
        operator,
        "PAGAMENTO_MANUAL_CRIADO",
        `Lan\xE7amento manual de pagamento criado para o motorista ${item.motoristaNome}, DT: ${item.dt}, Valor: R$ ${item.valorTotal}.`,
        newTitle.unidadeId
      );
      res.json({ success: true, item: newTitle });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/pagamentos/:id", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const profileType = user.tipo_usuario || "";
      if (profileType === "OPERADOR") {
        return res.status(403).json({ error: "Voc\xEA n\xE3o possui n\xEDvel de permiss\xE3o suficiente para editar pagamentos." });
      }
      const list = FileDatabase.get("contas_a_pagar") || [];
      const idx = list.findIndex((x) => x.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: "T\xEDtulo n\xE3o localizado." });
      const current = list[idx];
      const updated = { ...current, ...req.body };
      list[idx] = updated;
      FileDatabase.set("contas_a_pagar", list);
      FileDatabase.logAudit(
        user.email,
        "PAGAMENTO_ATUALIZADO",
        `T\xEDtulo a pagar ${req.params.id} do motorista ${updated.motoristaNome} foi alterado.`,
        updated.unidadeId
      );
      res.json({ success: true, item: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/pagamentos/:id", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const profileType = user.tipo_usuario || "";
      if (profileType !== "MASTER" && user.perfil !== "admin_master") {
        return res.status(403).json({ error: "Apenas administradores MASTER podem expurgar pagamentos." });
      }
      const list = FileDatabase.get("contas_a_pagar") || [];
      const idx = list.findIndex((x) => x.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: "T\xEDtulo n\xE3o localizado." });
      const deleted = list.splice(idx, 1)[0];
      FileDatabase.set("contas_a_pagar", list);
      FileDatabase.logAudit(
        user.email,
        "PAGAMENTO_EXPURGADO",
        `T\xEDtulo a pagar ${req.params.id} do motorista ${deleted.motoristaNome} foi expurgado sob seguran\xE7a m\xE1xima.`,
        deleted.unidadeId
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/pagamentos/:id/pagar", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const profileType = user.tipo_usuario || "";
      if (profileType === "OPERADOR" || profileType === "SUPERVISOR") {
        return res.status(403).json({ error: "N\xEDvel de permiss\xE3o insuficiente para efetuar baixas financeiras." });
      }
      const { data, valorPago, formaPagamento, observacao } = req.body;
      if (!data || !valorPago || !formaPagamento) {
        return res.status(400).json({ error: "Data, valor e forma de pagamento s\xE3o obrigat\xF3rios." });
      }
      const list = FileDatabase.get("contas_a_pagar") || [];
      const idx = list.findIndex((x) => x.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: "T\xEDtulo n\xE3o localizado." });
      const current = list[idx];
      const previousPaid = (current.historicoBaixas || []).reduce((sum, b) => sum + Number(b.valor), 0);
      const remainingBalance = Number(current.valorTotal) - previousPaid;
      const newPaid = Number(valorPago);
      if (newPaid <= 0) {
        return res.status(400).json({ error: "O valor pago deve ser maior que zero." });
      }
      if (newPaid > remainingBalance + 0.01) {
        return res.status(400).json({ error: `Valor pago excede o saldo em aberto de R$ ${remainingBalance.toFixed(2)}.` });
      }
      const newBaixa = {
        data,
        valor: newPaid,
        forma: formaPagamento,
        observacao: observacao || "",
        usuario: user.email
      };
      const newHistory = [...current.historicoBaixas || [], newBaixa];
      const totalPaidUpdated = previousPaid + newPaid;
      let finalStatus = "Parcial";
      if (Math.abs(totalPaidUpdated - Number(current.valorTotal)) < 0.1) {
        finalStatus = "Pago";
      }
      const updated = {
        ...current,
        status: finalStatus,
        dataPagamento: data,
        valorPago: totalPaidUpdated,
        formaPagamento,
        observacaoBaixa: observacao || "",
        historicoBaixas: newHistory
      };
      list[idx] = updated;
      FileDatabase.set("contas_a_pagar", list);
      FileDatabase.logAudit(
        user.email,
        "PAGAMENTO_BAIXA",
        `Baixa ${finalStatus === "Pago" ? "total" : "parcial"} efetuada no pagamento ${current.id} do motorista ${current.motoristaNome}. Pagou R$ ${newPaid}.`,
        current.unidadeId
      );
      const currentMovements = FileDatabase.get("movimentacoes_financeiras") || [];
      const newMovement = {
        id: `MOV-PAG-${Date.now()}`,
        pessoaId: current.motoristaNome,
        data,
        hora: (/* @__PURE__ */ new Date()).toTimeString().split(" ")[0],
        tipo: "D\xE9bito",
        origem: "Pagamento Motorista",
        valor: newPaid,
        observacao: `Pagamento Ref: ${current.id} \u2022 DT: ${current.dt} \u2022 Motorista: ${current.motoristaNome}`,
        saldoAnterior: 0,
        saldoPosterior: 0,
        usuario: user.email,
        dtId: current.dt,
        criadoEm: (/* @__PURE__ */ new Date()).toISOString()
      };
      currentMovements.push(newMovement);
      FileDatabase.set("movimentacoes_financeiras", currentMovements);
      res.json({ success: true, item: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/descargas", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const list = FileDatabase.get("descargas");
    const activeUnit = getRequestUnitContext(req, user);
    if (activeUnit === "Todas") return res.json(list);
    res.json(list.filter((d) => d.unidadeId === activeUnit));
  });
  app.post("/api/descargas", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const item = req.body;
    const operator = user.email;
    if (user.perfil !== "admin_master") {
      item.unidadeId = user.unidadeId;
    }
    const added = FileDatabase.add("descargas", item, operator);
    res.json(added);
  });
  app.put("/api/descargas/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    if (user.perfil !== "admin_master" && user.perfil !== "admin_unidade") {
      return res.status(403).json({ error: "Voc\xEA n\xE3o tem permiss\xE3o para editar recibos de descarga." });
    }
    const currentList = FileDatabase.get("descargas");
    const found = currentList.find((x) => x.id === req.params.id);
    if (!found) {
      return res.status(404).json({ error: "Recibo de descarga n\xE3o encontrado." });
    }
    if (user.perfil !== "admin_master" && found.unidadeId !== user.unidadeId) {
      return res.status(403).json({ error: "Voc\xEA n\xE3o tem permiss\xE3o para editar recibos de outra unidade." });
    }
    const item = req.body;
    const operator = user.email;
    if (user.perfil !== "admin_master") {
      item.unidadeId = found.unidadeId;
    }
    const updated = FileDatabase.update("descargas", req.params.id, item, operator);
    res.json(updated);
  });
  app.delete("/api/descargas/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    if (user.perfil !== "admin_master" && user.perfil !== "admin_unidade") {
      return res.status(403).json({ error: "Voc\xEA n\xE3o tem permiss\xE3o para excluir recibos de descarga." });
    }
    const currentList = FileDatabase.get("descargas");
    const found = currentList.find((x) => x.id === req.params.id);
    if (!found) {
      return res.status(404).json({ error: "Recibo de descarga n\xE3o encontrado." });
    }
    if (user.perfil !== "admin_master" && found.unidadeId !== user.unidadeId) {
      return res.status(403).json({ error: "Voc\xEA n\xE3o tem permiss\xE3o para excluir recibos de outra unidade." });
    }
    const motivo = req.body.motivo || req.query.motivo || "Exclus\xE3o solicitada pelo usu\xE1rio";
    const operator = user.email;
    FileDatabase.delete("descargas", req.params.id, operator);
    const auditDetail = `Recibo Exclu\xEDdo - N\xBA do Recibo: ${found.id} | DT Associada: ${found.dt} | Valor: R$ ${found.valorDescarga} | Motivo: ${motivo}`;
    FileDatabase.logAudit(
      user.email,
      "EXCLUSAO_DESCARGA_RICH",
      auditDetail,
      user.unidadeId || found.unidadeId || ""
    );
    res.json({ success: true, message: "Recibo de descarga exclu\xEDdo com sucesso." });
  });
  app.get("/api/manutencao", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const list = FileDatabase.get("manutencoes");
    const activeUnit = getRequestUnitContext(req, user);
    if (activeUnit === "Todas") return res.json(list);
    res.json(list.filter((m) => m.unidadeId === activeUnit));
  });
  app.post("/api/manutencao", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const item = req.body;
    const operator = user.email;
    if (user.perfil !== "admin_master") {
      item.unidadeId = user.unidadeId;
    }
    const added = FileDatabase.add("manutencoes", item, operator);
    res.json(added);
  });
  app.put("/api/manutencao/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    if (user.perfil !== "admin_master" && user.perfil !== "admin_unidade") {
      return res.status(403).json({ error: "Voc\xEA n\xE3o tem permiss\xE3o para editar manuten\xE7\xF5es." });
    }
    const currentList = FileDatabase.get("manutencoes");
    const found = currentList.find((x) => x.id === req.params.id);
    if (!found) {
      return res.status(404).json({ error: "Manuten\xE7\xE3o n\xE3o encontrada." });
    }
    if (user.perfil !== "admin_master" && found.unidadeId !== user.unidadeId) {
      return res.status(403).json({ error: "Voc\xEA n\xE3o tem permiss\xE3o para editar manuten\xE7\xE3o de outra unidade." });
    }
    const item = req.body;
    const operator = user.email || user.nome || "Lucas";
    const historyLogs = [];
    const fieldsToTrack = [
      { key: "veiculoId", label: "Ve\xEDculo" },
      { key: "placa", label: "Placa" },
      { key: "tipo", label: "Tipo de Manuten\xE7\xE3o" },
      { key: "categoria", label: "Categoria" },
      { key: "data", label: "Data da Manuten\xE7\xE3o" },
      { key: "proximaManutencao", label: "Data da Pr\xF3xima Manuten\xE7\xE3o" },
      { key: "quilometragemAtual", label: "Quilometragem Atual" },
      { key: "proximaQuilometragem", label: "Quilometragem da Pr\xF3xima Revis\xE3o" },
      { key: "valorManutencao", label: "Valor da Manuten\xE7\xE3o" },
      { key: "oficina", label: "Oficina" },
      { key: "fornecedor", label: "Fornecedor" },
      { key: "responsavel", label: "Respons\xE1vel" },
      { key: "observacao", label: "Observa\xE7\xF5es" }
    ];
    const todayStr = (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR");
    fieldsToTrack.forEach((field) => {
      const oldVal = found[field.key] !== void 0 ? found[field.key] : "";
      const newVal = item[field.key] !== void 0 ? item[field.key] : "";
      if (String(oldVal) !== String(newVal)) {
        historyLogs.push(`Campo: ${field.label} | Antes: ${oldVal} | Depois: ${newVal}`);
      }
    });
    if (item.checklist && found.checklist) {
      const checklistFields = ["oleo", "filtro", "freios", "pneus", "rodas", "suspensao", "amortecedores", "etiquetas", "eletrica", "motor", "lanternas"];
      checklistFields.forEach((chk) => {
        const oldVal = found.checklist[chk] ? "Ativado" : "Desativado";
        const newVal = item.checklist[chk] ? "Ativado" : "Desativado";
        if (oldVal !== newVal) {
          historyLogs.push(`Campo: Checklist - ${chk.toUpperCase()} | Antes: ${oldVal} | Depois: ${newVal}`);
        }
      });
    }
    if (user.perfil !== "admin_master") {
      item.unidadeId = found.unidadeId;
    }
    const updated = FileDatabase.update("manutencoes", req.params.id, item, operator);
    FileDatabase.getFull();
    const auditDetail = `Manuten\xE7\xE3o Editada - Ve\xEDculo: ${found.veiculoId} (Placa: ${item.placa || found.placa || ""}) | Usu\xE1rio: ${user.nome || user.email}
` + (historyLogs.length > 0 ? historyLogs.join("\n") : "Nenhum campo com altera\xE7\xE3o detectado.");
    FileDatabase.logAudit(
      user.email,
      "MANUTENCAO_EDITADA",
      auditDetail,
      user.unidadeId || found.unidadeId || ""
    );
    res.json(updated);
  });
  app.delete("/api/manutencao/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    if (user.perfil !== "admin_master" && user.perfil !== "admin_unidade") {
      return res.status(403).json({ error: "Voc\xEA n\xE3o tem permiss\xE3o para excluir manuten\xE7\xF5es." });
    }
    const currentList = FileDatabase.get("manutencoes");
    const found = currentList.find((x) => x.id === req.params.id);
    if (!found) {
      return res.status(404).json({ error: "Manuten\xE7\xE3o n\xE3o encontrada." });
    }
    if (user.perfil !== "admin_master" && found.unidadeId !== user.unidadeId) {
      return res.status(403).json({ error: "Voc\xEA n\xE3o tem permiss\xE3o para excluir manuten\xE7\xE3o de outra unidade." });
    }
    const operator = user.email;
    FileDatabase.delete("manutencoes", req.params.id, operator);
    FileDatabase.getFull();
    const auditDetail = `Manuten\xE7\xE3o Exclu\xEDda - ID: ${found.id} | Ve\xEDculo: ${found.veiculoId} | Placa: ${found.placa || found.veiculoId} | Tipo: ${found.tipo} | Data: ${found.data} | Valor: R$ ${found.valorManutencao || 0}`;
    FileDatabase.logAudit(
      user.email,
      "MANUTENCAO_EXCLUIDA",
      auditDetail,
      user.unidadeId || found.unidadeId || ""
    );
    res.json({ success: true, message: "Manuten\xE7\xE3o exclu\xEDda com sucesso." });
  });
  app.get("/api/abastecimentos", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const list = FileDatabase.get("abastecimentos") || [];
    const activeUnit = getRequestUnitContext(req, user);
    if (activeUnit === "Todas") return res.json(list);
    res.json(list.filter((a) => a.unidadeId === activeUnit));
  });
  app.post("/api/abastecimentos", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const item = req.body;
    item.id = item.id || `abs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const operator = user.email;
    if (user.perfil !== "admin_master") {
      item.unidadeId = user.unidadeId;
    }
    const added = FileDatabase.add("abastecimentos", item, operator);
    const auditDetail = `Abastecimento Registrado - Ve\xEDculo: ${item.placa} | Combust\xEDvel: ${item.combustivel} | Litros: ${item.litros}L | Valor: R$ ${item.valor} | Posto: ${item.posto}`;
    FileDatabase.logAudit(
      user.email,
      "ABASTECIMENTO_CRIADO",
      auditDetail,
      user.unidadeId || item.unidadeId || ""
    );
    res.json(added);
  });
  app.delete("/api/abastecimentos/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const currentList = FileDatabase.get("abastecimentos") || [];
    const found = currentList.find((x) => x.id === req.params.id);
    if (!found) {
      return res.status(404).json({ error: "Abastecimento n\xE3o encontrado." });
    }
    if (user.perfil !== "admin_master" && found.unidadeId !== user.unidadeId) {
      return res.status(403).json({ error: "Voc\xEA n\xE3o tem permiss\xE3o para excluir abastecimento de outra unidade." });
    }
    const operator = user.email;
    FileDatabase.delete("abastecimentos", req.params.id, operator);
    const auditDetail = `Abastecimento Exclu\xEDdo - ID: ${found.id} | Ve\xEDculo: ${found.placa} | Combust\xEDvel: ${found.combustivel} | Litros: ${found.litros}L | Valor: R$ ${found.valor}`;
    FileDatabase.logAudit(
      user.email,
      "ABASTECIMENTO_EXCLUIDO",
      auditDetail,
      user.unidadeId || found.unidadeId || ""
    );
    res.json({ success: true, message: "Abastecimento exclu\xEDdo com sucesso." });
  });
  app.get("/api/epi-estoque", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const list = FileDatabase.get("estoque_epi");
    const activeUnit = getRequestUnitContext(req, user);
    if (activeUnit === "Todas") return res.json(list);
    res.json(list.filter((s) => s.unidadeId === activeUnit));
  });
  app.post("/api/epi-estoque", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const item = req.body;
    const operator = user.email;
    if (user.perfil !== "admin_master") {
      item.unidadeId = user.unidadeId;
    } else if (!item.unidadeId) {
      item.unidadeId = "un-go";
    }
    if (!item.id) {
      item.id = "epi-" + Math.random().toString(36).substring(2, 9);
    }
    item.saldo = Number(item.quantidadeInicial || 0);
    const added = FileDatabase.add("estoque_epi", item, operator);
    logAudit(req, user.nome || "Sistema", "CADASTRO_EPI", `Cadastrou epi: ${item.nome}, C\xF3d: ${item.codigo}, Qtd: ${item.quantidadeInicial}`, item.unidadeId);
    res.json({ success: true, added });
  });
  app.get("/api/epi-movimentacoes", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const list = FileDatabase.get("movimentacao_epi");
    const activeUnit = getRequestUnitContext(req, user);
    if (activeUnit === "Todas") return res.json(list);
    res.json(list.filter((m) => m.unidadeId === activeUnit));
  });
  app.post("/api/epi-movimentacoes", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const item = req.body;
    const operator = user.email;
    if (user.perfil !== "admin_master") {
      item.unidadeId = user.unidadeId;
    } else if (!item.unidadeId) {
      item.unidadeId = "un-go";
    }
    if (!item.hora) {
      item.hora = (/* @__PURE__ */ new Date()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }
    if (!item.usuario) {
      item.usuario = user.nome || user.email;
    }
    const stock = FileDatabase.get("estoque_epi");
    const stockItem = stock.find((s) => s.id === item.itemEpi);
    if (stockItem) {
      const tipoNorm = (item.tipo || "Sa\xEDda").trim();
      const qtyNum = Number(item.quantidade || 0);
      if (tipoNorm === "Sa\xEDda" || tipoNorm === "Perda") {
        stockItem.saldo = Math.max(0, stockItem.saldo - qtyNum);
      } else if (tipoNorm === "Entrada" || tipoNorm === "Devolu\xE7\xE3o") {
        stockItem.saldo = stockItem.saldo + qtyNum;
      } else if (tipoNorm === "Ajuste") {
        stockItem.saldo = qtyNum;
      }
      FileDatabase.set("estoque_epi", stock);
    }
    const added = FileDatabase.add("movimentacao_epi", item, operator);
    res.json({ success: true, added });
  });
  const notifyUser = (usuarioId, titulo, mensagem, processoId) => {
    const notifyItem = {
      id: `not-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
      usuarioId,
      titulo,
      mensagem,
      processoId,
      lida: false,
      data: (/* @__PURE__ */ new Date()).toISOString()
    };
    FileDatabase.add("processo_notificacoes", notifyItem, "Sistema");
  };
  const logProcessHistory = (processoId, usuario, acao, detalhes) => {
    const histItem = {
      id: `hpr-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
      processoId,
      usuario,
      acao,
      detalhes,
      data: (/* @__PURE__ */ new Date()).toISOString()
    };
    FileDatabase.add("processo_historico", histItem, "Sistema");
  };
  app.get("/api/processos", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const list = FileDatabase.get("processos") || [];
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    let updatedAny = false;
    list.forEach((p) => {
      if (p.dataLimite && p.dataLimite < todayStr && p.status !== "concluido" && p.status !== "cancelado") {
        const notifications = FileDatabase.get("processo_notificacoes") || [];
        const alreadyNotified = notifications.some((n) => n.processoId === p.id && n.titulo.includes("atrasado"));
        if (!alreadyNotified) {
          const warnMsg = `O processo "${p.titulo}" ultrapassou a data limite (${p.dataLimite}) e encontra-se pendente de conclus\xE3o.`;
          if (p.responsavel) notifyUser(p.responsavel, "\u26A0\uFE0F Processo Atrasado", warnMsg, p.id);
          if (p.participantes && p.participantes.length > 0) {
            p.participantes.forEach((pt) => {
              if (pt !== p.responsavel) {
                notifyUser(pt, "\u26A0\uFE0F Processo Atrasado", warnMsg, p.id);
              }
            });
          }
          const usersList = FileDatabase.get("usuarios") || [];
          usersList.forEach((u) => {
            if (u.perfil === "admin_master") {
              notifyUser(u.email, "\u26A0\uFE0F Processo Atrasado (Alerta Master)", warnMsg, p.id);
            }
          });
          logProcessHistory(p.id, "Sistema", "Atraso Detectado", `Processo ultrapassou o prazo limite de ${p.dataLimite}`);
          updatedAny = true;
        }
      }
    });
    if (updatedAny) {
      FileDatabase.set("processos", list);
    }
    const filtered = list.filter((p) => checkUserHasAccess(user, p));
    res.json(filtered);
  });
  app.post("/api/processos", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const item = req.body;
    const operator = user.email;
    const users = FileDatabase.get("usuarios") || [];
    const units = FileDatabase.get("unidades") || [];
    const validResponsavel = users.some((u) => u.email.toLowerCase() === item.responsavel?.toLowerCase());
    if (!validResponsavel) {
      return res.status(400).json({ error: `Valida\xE7\xE3o do Processo: O Respons\xE1vel Principal "${item.responsavel}" n\xE3o existe ou n\xE3o est\xE1 cadastrado no banco de dados.` });
    }
    if (item.participantes && item.participantes.length > 0) {
      for (const pEmail of item.participantes) {
        const exists = users.some((u) => u.email.toLowerCase() === pEmail.toLowerCase());
        if (!exists) {
          return res.status(400).json({ error: `Valida\xE7\xE3o do Processo: O participante com o e-mail "${pEmail}" n\xE3o existe no banco de dados.` });
        }
      }
    }
    const validSourceUnit = units.some((u) => u.id === item.unidadeId);
    if (!validSourceUnit) {
      return res.status(400).json({ error: `Valida\xE7\xE3o do Processo: A Unidade Origem "${item.unidadeId}" n\xE3o \xE9 uma unidade cadastrada.` });
    }
    if (item.unidadesCompartilhadas && item.unidadesCompartilhadas.length > 0) {
      for (const uId of item.unidadesCompartilhadas) {
        if (uId === "Todas") continue;
        const exists = units.some((u) => u.id === uId);
        if (!exists) {
          return res.status(400).json({ error: `Valida\xE7\xE3o do Processo: A unidade de compartilhamento "${uId}" n\xE3o foi encontrada no banco de dados.` });
        }
      }
    }
    item.id = `prc-${Date.now()}`;
    item.criadoPor = user.email;
    item.criadoEm = (/* @__PURE__ */ new Date()).toISOString();
    item.atualizadoEm = (/* @__PURE__ */ new Date()).toISOString();
    if (!item.anexos) item.anexos = [];
    if (!item.participantes) item.participantes = [];
    if (!item.unidadesCompartilhadas) item.unidadesCompartilhadas = [];
    if (!item.tags) item.tags = [];
    const added = FileDatabase.add("processos", item, operator);
    logProcessHistory(added.id, user.nome || user.email, "Cria\xE7\xE3o", `Processo "${added.titulo}" aberto sob prioridade ${added.prioridade}.`);
    if (added.responsavel && added.responsavel.toLowerCase() !== user.email.toLowerCase()) {
      notifyUser(added.responsavel, "\u{1F4CB} Processo Atribu\xEDdo", `Voc\xEA foi designado como respons\xE1vel principal do processo: "${added.titulo}".`, added.id);
    }
    if (added.participantes && added.participantes.length > 0) {
      added.participantes.forEach((pt) => {
        if (pt.toLowerCase() !== user.email.toLowerCase()) {
          notifyUser(pt, "\u{1F465} Convidado para Processo", `Voc\xEA foi adicionado ao processo ${added.titulo}.`, added.id);
        }
      });
    }
    const auditDetail = `Processo Expandido Criado - ID: ${added.id} | T\xEDtulo: ${added.titulo} | Categoria: ${added.categoria} | Resp: ${added.responsavel} | Unidade: ${added.unidadeId}`;
    FileDatabase.logAudit(
      user.email,
      "PROCESSO_CRIADO",
      auditDetail,
      added.unidadeId || user.unidadeId || ""
    );
    res.json(added);
  });
  app.put("/api/processos/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const currentList = FileDatabase.get("processos") || [];
    const foundIdx = currentList.findIndex((p) => p.id === req.params.id);
    if (foundIdx === -1) {
      return res.status(404).json({ error: "Processo n\xE3o encontrado." });
    }
    const found = currentList[foundIdx];
    const userRole = getProcessUserRole(found, user);
    if (userRole === "visualizador") {
      return res.status(403).json({ error: "Sua permiss\xE3o de Visualizador n\xE3o permite editar este processo." });
    }
    const updatedData = req.body;
    if (userRole !== "administrador") {
      const adminKeys = ["titulo", "categoria", "prioridade", "dataLimite", "responsavel", "unidadeId", "participantes", "unidadesCompartilhadas", "participanteRoles"];
      const modifiedAdminKeys = adminKeys.filter((k) => updatedData[k] !== void 0 && JSON.stringify(updatedData[k]) !== JSON.stringify(found[k]));
      if (modifiedAdminKeys.length > 0) {
        return res.status(403).json({ error: `Sua permiss\xE3o de Editor n\xE3o permite alterar as propriedades administrativas: ${modifiedAdminKeys.join(", ")}.` });
      }
      if (updatedData.status && (updatedData.status === "concluido" || updatedData.status === "cancelado") && found.status !== updatedData.status) {
        return res.status(403).json({ error: "Somente administradores de processo ou MASTER podem encerrar ou cancelar o processo." });
      }
    }
    updatedData.atualizadoEm = (/* @__PURE__ */ new Date()).toISOString();
    const users = FileDatabase.get("usuarios") || [];
    const units = FileDatabase.get("unidades") || [];
    if (updatedData.responsavel) {
      const validResponsavel = users.some((u) => u.email.toLowerCase() === updatedData.responsavel.toLowerCase());
      if (!validResponsavel) {
        return res.status(400).json({ error: `Valida\xE7\xE3o do Processo: O Respons\xE1vel Principal "${updatedData.responsavel}" n\xE3o \xE9 um usu\xE1rio cadastrado no sistema.` });
      }
    }
    if (updatedData.participantes && Array.isArray(updatedData.participantes)) {
      for (const pEmail of updatedData.participantes) {
        const exists = users.some((u) => u.email.toLowerCase() === pEmail.toLowerCase());
        if (!exists) {
          return res.status(400).json({ error: `Valida\xE7\xE3o do Processo: O participante com o e-mail "${pEmail}" n\xE3o \xE9 um usu\xE1rio cadastrado no sistema.` });
        }
      }
    }
    if (updatedData.unidadeId) {
      const validSourceUnit = units.some((u) => u.id === updatedData.unidadeId);
      if (!validSourceUnit) {
        return res.status(400).json({ error: `Valida\xE7\xE3o do Processo: A Unidade Origem "${updatedData.unidadeId}" n\xE3o \xE9 uma unidade cadastrada.` });
      }
    }
    if (updatedData.unidadesCompartilhadas && Array.isArray(updatedData.unidadesCompartilhadas)) {
      for (const uId of updatedData.unidadesCompartilhadas) {
        if (uId === "Todas") continue;
        const exists = units.some((u) => u.id === uId);
        if (!exists) {
          return res.status(400).json({ error: `Valida\xE7\xE3o do Processo: A unidade de compartilhamento "${uId}" n\xE3o foi encontrada no banco de dados.` });
        }
      }
    }
    if (updatedData.participantes && Array.isArray(updatedData.participantes)) {
      const oldParts = found.participantes || [];
      const newParts = updatedData.participantes.filter((p) => !oldParts.includes(p));
      newParts.forEach((pt) => {
        if (pt.toLowerCase() !== user.email.toLowerCase()) {
          notifyUser(pt, "\u{1F465} Convidado para Processo", `Voc\xEA foi adicionado ao processo ${updatedData.titulo || found.titulo}.`, found.id);
        }
      });
    }
    const trackChanges = [];
    const keys = ["titulo", "categoria", "descricao", "prioridade", "dataLimite", "responsavel", "status", "observacoes"];
    keys.forEach((k) => {
      const oldVal = found[k];
      const newVal = updatedData[k];
      if (oldVal !== void 0 && newVal !== void 0 && String(oldVal) !== String(newVal)) {
        trackChanges.push(`"${k}" alterado de "${oldVal}" para "${newVal}"`);
      }
    });
    if (updatedData.status && updatedData.status !== found.status) {
      const msg = `Status do processo "${found.titulo}" mudou para: "${updatedData.status}".`;
      if (found.responsavel) notifyUser(found.responsavel, "\u{1F504} Atualiza\xE7\xE3o de Status", msg, found.id);
      found.participantes?.forEach((pt) => {
        if (pt !== user.email) notifyUser(pt, "\u{1F504} Atualiza\xE7\xE3o de Status", msg, found.id);
      });
    }
    const updated = FileDatabase.update("processos", req.params.id, updatedData, user.email);
    if (trackChanges.length > 0) {
      logProcessHistory(req.params.id, user.nome || user.email, "Edi\xE7\xE3o", trackChanges.join("; "));
    }
    res.json(updated);
  });
  app.put("/api/processos/:id/status", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const currentList = FileDatabase.get("processos") || [];
    const found = currentList.find((p) => p.id === req.params.id);
    if (!found) return res.status(404).json({ error: "Processo n\xE3o encontrado." });
    const userRole = getProcessUserRole(found, user);
    if (userRole === "visualizador") {
      return res.status(403).json({ error: "Sua permiss\xE3o de Visualizador n\xE3o permite alterar o status deste processo." });
    }
    const { status } = req.body;
    if ((status === "concluido" || status === "cancelado") && userRole !== "administrador") {
      return res.status(403).json({ error: "Somente administradores de processo ou MASTER podem encerrar ou cancelar o processo." });
    }
    const oldStatus = found.status;
    found.status = status;
    found.atualizadoEm = (/* @__PURE__ */ new Date()).toISOString();
    FileDatabase.update("processos", req.params.id, { status, atualizadoEm: found.atualizadoEm }, user.email);
    logProcessHistory(found.id, user.nome || user.email, "Movimenta\xE7\xE3o Kanban", `Cart\xE3o movido de "${oldStatus}" para "${status}".`);
    const alertMsg = `O processo "${found.titulo}" foi movido para o status: ${status}.`;
    if (found.responsavel && found.responsavel !== user.email) {
      notifyUser(found.responsavel, "\u{1F504} Status Kanban Alterado", alertMsg, found.id);
    }
    found.participantes?.forEach((pt) => {
      if (pt !== user.email) {
        notifyUser(pt, "\u{1F504} Status Kanban Alterado", alertMsg, found.id);
      }
    });
    res.json({ success: true, status });
  });
  app.delete("/api/processos/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const currentList = FileDatabase.get("processos") || [];
    const found = currentList.find((p) => p.id === req.params.id);
    if (!found) return res.status(404).json({ error: "Processo n\xE3o encontrado." });
    const userRole = getProcessUserRole(found, user);
    if (userRole !== "administrador") {
      return res.status(403).json({ error: "Voc\xEA n\xE3o possui n\xEDvel de permiss\xE3o suficiente para excluir processos." });
    }
    FileDatabase.delete("processos", req.params.id, user.email);
    const auditDetail = `Processo Exclu\xEDdo - ID: ${found.id} | T\xEDtulo: ${found.titulo} | Categoria: ${found.categoria}`;
    FileDatabase.logAudit(
      user.email,
      "PROCESSO_EXCLUIDO",
      auditDetail,
      found.unidadeId || ""
    );
    res.json({ success: true, message: "Processo exclu\xEDdo permanentemente." });
  });
  app.get("/api/processos/:id/comentarios", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const coms = FileDatabase.get("processo_comentarios") || [];
    const filtered = coms.filter((c) => c.processoId === req.params.id);
    res.json(filtered);
  });
  app.post("/api/processos/:id/comentarios", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const { texto, mencoes } = req.body;
    const processId = req.params.id;
    const currentList = FileDatabase.get("processos") || [];
    const proc = currentList.find((p) => p.id === processId);
    if (!proc) return res.status(404).json({ error: "Processo n\xE3o encontrado." });
    const comItem = {
      id: `com-${Date.now()}`,
      processoId: processId,
      usuario: user.email,
      usuarioNome: user.nome || user.email,
      texto,
      data: (/* @__PURE__ */ new Date()).toISOString(),
      mencoes: mencoes || []
    };
    FileDatabase.add("processo_comentarios", comItem, user.email);
    logProcessHistory(processId, user.nome || user.email, "Novo Coment\xE1rio", `Adicionou coment\xE1rio no processo.`);
    if (mencoes && mencoes.length > 0) {
      const systemUsers = FileDatabase.get("usuarios") || [];
      mencoes.forEach((mEmail) => {
        const targetUser = systemUsers.find((u) => u.email.toLowerCase() === mEmail.toLowerCase());
        if (targetUser && checkUserHasAccess(targetUser, proc)) {
          notifyUser(
            mEmail,
            "\u{1F4AC} Voc\xEA foi mencionado",
            `${user.nome || user.email} mencionou voc\xEA no processo: "${texto.substring(0, 60)}..."`,
            processId
          );
        }
      });
    }
    if (proc.responsavel && proc.responsavel.toLowerCase() !== user.email.toLowerCase()) {
      notifyUser(
        proc.responsavel,
        "\u{1F4AC} Novo Coment\xE1rio de Equipe",
        `Novo coment\xE1rio sobre o processo "${proc.titulo}" por ${user.nome || user.email}`,
        processId
      );
    }
    res.json(comItem);
  });
  app.post("/api/processos/:id/anexos", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const { nome, url, tipo } = req.body;
    const currentList = FileDatabase.get("processos") || [];
    const procIdx = currentList.findIndex((p) => p.id === req.params.id);
    if (procIdx === -1) return res.status(404).json({ error: "Processo n\xE3o encontrado" });
    const proc = currentList[procIdx];
    const anexoItem = {
      id: `anx-${Date.now()}`,
      nome: nome || "Documento Anexo",
      url: url || "",
      tipo: tipo || "PDF",
      data: (/* @__PURE__ */ new Date()).toISOString(),
      usuario: user.email
    };
    if (!proc.anexos) proc.anexos = [];
    proc.anexos.push(anexoItem);
    proc.atualizadoEm = (/* @__PURE__ */ new Date()).toISOString();
    FileDatabase.update("processos", req.params.id, { anexos: proc.anexos, atualizadoEm: proc.atualizadoEm }, user.email);
    logProcessHistory(req.params.id, user.nome || user.email, "Novo Anexo", `Arquivo anexado: "${anexoItem.nome}".`);
    res.json(anexoItem);
  });
  app.get("/api/processos/:id/historico", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const hist = FileDatabase.get("processo_historico") || [];
    const filtered = hist.filter((h) => h.processoId === req.params.id);
    filtered.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    res.json(filtered);
  });
  app.get("/api/processo-categorias", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    res.json(FileDatabase.get("processo_categorias") || []);
  });
  app.post("/api/processo-categorias", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    if (user.perfil !== "admin_master") {
      return res.status(403).json({ error: "Apenas administradores corporativos master podem adicionar novas categorias." });
    }
    const { nome } = req.body;
    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: "Nome da categoria obrigat\xF3rio." });
    }
    const catItem = {
      id: `cat-${Date.now()}`,
      nome: nome.trim(),
      criadoPor: user.email,
      criadoEm: (/* @__PURE__ */ new Date()).toISOString()
    };
    const added = FileDatabase.add("processo_categorias", catItem, user.email);
    res.json(added);
  });
  app.get("/api/processo-colunas", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    res.json(FileDatabase.get("processo_colunas") || []);
  });
  app.post("/api/processo-colunas", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    if (user.perfil !== "admin_master") {
      return res.status(403).json({ error: "Apenas administradores master podem gerenciar colunas do Kanban." });
    }
    const { id, nome, ordem } = req.body;
    if (!id || !nome) {
      return res.status(400).json({ error: "ID e Nome da coluna s\xE3o obrigat\xF3rios." });
    }
    const colItem = { id: id.trim(), nome: nome.trim(), ordem: Number(ordem || 1) };
    const added = FileDatabase.add("processo_colunas", colItem, user.email);
    res.json(added);
  });
  app.get("/api/processo-notificacoes", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const list = FileDatabase.get("processo_notificacoes") || [];
    const processos = FileDatabase.get("processos") || [];
    const filtered = list.filter((n) => {
      if (n.usuarioId?.toLowerCase() !== (user.email || "").toLowerCase()) {
        return false;
      }
      if (n.processoId) {
        const proc = processos.find((p) => p.id === n.processoId);
        if (!proc) return false;
        return checkUserHasAccess(user, proc);
      }
      return true;
    });
    filtered.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    res.json(filtered);
  });
  app.put("/api/processo-notificacoes/lida", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const { id, all } = req.body;
    const list = FileDatabase.get("processo_notificacoes") || [];
    if (all) {
      list.forEach((n) => {
        if (n.usuarioId?.toLowerCase() === (user.email || "").toLowerCase()) {
          n.lida = true;
        }
      });
    } else if (id) {
      const idx = list.findIndex((n) => n.id === id);
      if (idx !== -1 && list[idx].usuarioId?.toLowerCase() === (user.email || "").toLowerCase()) {
        list[idx].lida = true;
      }
    }
    FileDatabase.set("processo_notificacoes", list);
    res.json({ success: true });
  });
  app.get("/api/alertas", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const alerts = FileDatabase.get("alertas");
    const activeUnit = getRequestUnitContext(req, user);
    if (activeUnit === "Todas") return res.json(alerts);
    const filteredAlerts = alerts.filter((alert) => {
      if (alert.tipo === "CNH" || alert.tipo === "ASO") {
        const mot = FileDatabase.get("motoristas").find((m) => m.id === alert.refId);
        return mot ? mot.unidadeId === activeUnit : false;
      }
      const veic = FileDatabase.get("veiculos").find((v) => v.id === alert.refId);
      return veic ? veic.unidadeId === activeUnit : false;
    });
    res.json(filteredAlerts);
  });
  app.get("/api/documentos/historico", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const hist = FileDatabase.get("historico_documentos") || [];
      res.json(hist);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/documentos/renovar", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const {
        pessoaId,
        documentoTipo,
        novaValidade,
        novoArquivo,
        motivo
      } = req.body;
      if (!pessoaId || !documentoTipo) {
        return res.status(400).json({ error: "Par\xE2metros pessoaId e documentoTipo s\xE3o obrigat\xF3rios." });
      }
      const db = FileDatabase.getFull();
      const motorista = db.motoristas.find((m) => m.id === pessoaId);
      if (!motorista) {
        return res.status(404).json({ error: "Profissional n\xE3o encontrado." });
      }
      let validadeProp = "";
      let urlProp = "";
      let statusProp = "";
      switch (documentoTipo) {
        case "CNH":
          validadeProp = "cnhVencimento";
          urlProp = "cnhDocumentoUrl";
          break;
        case "ASO":
          validadeProp = "asoVencimento";
          urlProp = "asoDocumentoUrl";
          statusProp = "aso";
          break;
        case "Integra\xE7\xE3o":
          validadeProp = "integracaoVencimento";
          urlProp = "integracaoDocumentoUrl";
          statusProp = "integracao";
          break;
        case "Pesquisa GR":
          validadeProp = "pesquisaVencimento";
          urlProp = "pesquisaDocumentoUrl";
          statusProp = "pesquisa";
          break;
        case "MOPP":
          validadeProp = "moppVencimento";
          urlProp = "moppDocumentoUrl";
          statusProp = "mopp";
          break;
        case "Toxicol\xF3gico":
          validadeProp = "toxicologicoVencimento";
          urlProp = "toxicologicoDocumentoUrl";
          statusProp = "toxicologico";
          break;
        case "Ficha EPI":
          validadeProp = "fichaEpiVencimento";
          urlProp = "fichaEpiDocumentoUrl";
          statusProp = "fichaEpi";
          break;
        case "Documento Pessoal":
          validadeProp = "documentoPessoalVencimento";
          urlProp = "documentoPessoalDocumentoUrl";
          statusProp = "documentoPessoal";
          break;
        case "Comprovante":
          validadeProp = "comprovanteVencimento";
          urlProp = "comprovanteDocumentoUrl";
          statusProp = "comprovante";
          break;
        case "Foto":
          validadeProp = "fotoVencimento";
          urlProp = "fotoDocumentoUrl";
          statusProp = "foto";
          break;
        default:
          return res.status(400).json({ error: "Tipo de documento inv\xE1lido." });
      }
      const arquivoAntigo = motorista[urlProp] || "Nenhum";
      const validadeAnterior = motorista[validadeProp] || "Nenhuma";
      const updatedFields = {};
      if (urlProp) {
        updatedFields[urlProp] = novoArquivo || `${documentoTipo.toLowerCase()}_renovado.pdf`;
      }
      if (validadeProp && novaValidade) {
        updatedFields[validadeProp] = novaValidade;
      }
      if (statusProp) {
        updatedFields[statusProp] = "Feito";
      }
      FileDatabase.update("motoristas", pessoaId, updatedFields, user.email);
      const now = /* @__PURE__ */ new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now.toTimeString().split(" ")[0];
      const histItem = {
        id: `hist-doc-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
        pessoaId,
        pessoaNome: motorista.nome,
        documentoTipo,
        dataTroca: `${dateStr} ${timeStr}`,
        usuarioResponsavel: user.nome || user.email,
        arquivoAntigo,
        arquivoNovo: novoArquivo || `${documentoTipo.toLowerCase()}_renovado.pdf`,
        validadeAnterior,
        novaValidade: novaValidade || "Nenhuma",
        motivo: motivo || ""
      };
      if (!db.historico_documentos) {
        db.historico_documentos = [];
      }
      db.historico_documentos.push(histItem);
      FileDatabase.write(db);
      FileDatabase.asyncWriteToSupabase("historico_documentos", db.historico_documentos);
      FileDatabase.recalculateAlerts(db);
      FileDatabase.write(db);
      res.json({
        success: true,
        motorista: db.motoristas.find((m) => m.id === pessoaId),
        history: histItem
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/fechamentos_dt", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const closures = FileDatabase.get("fechamentos_dt") || [];
      const activeUnit = getRequestUnitContext(req, user);
      if (activeUnit === "Todas") {
        return res.json(closures);
      }
      return res.json(closures.filter((c) => c.unidadeId === activeUnit));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/fechamentos_dt", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const {
        dt,
        motoristaId,
        veiculoId,
        unidadeId,
        observacoes,
        ocorrencias = [],
        houveDevolucao,
        houveAvaria,
        houveFalta,
        devolucaoQtd,
        devolucaoMotivo,
        devolucaoObs,
        faltaProduto,
        faltaQuantidade,
        faltaValorUnit,
        faltaValorTotal,
        faltaObservacao,
        statusFechamento,
        // New Recibo de Descarga (AMPLA v2.2 - Fase 11)
        houveReciboDescarga,
        descargaCliente,
        descargaCodigoCliente,
        descargaNumeroNF,
        descargaValor,
        descargaData,
        descargaObservacoes,
        descargaReciboFile,
        descargaResponsavel,
        // New financial inputs
        reentregaValor,
        abastecimentoValor
      } = req.body;
      if (!dt) {
        return res.status(400).json({ error: "N\xFAmero da DT \xE9 obrigat\xF3rio." });
      }
      const getNextProtocol = () => {
        const closures = FileDatabase.get("fechamentos_dt") || [];
        let maxProtocolNum = 0;
        for (const c of closures) {
          if (c.protocoloFechamento) {
            const pNum = parseInt(c.protocoloFechamento, 10);
            if (!isNaN(pNum) && pNum > maxProtocolNum) {
              maxProtocolNum = pNum;
            }
          }
          if (c.historicoFechamentos) {
            for (const h of c.historicoFechamentos) {
              if (h.protocolo) {
                const pNum = parseInt(h.protocolo, 10);
                if (!isNaN(pNum) && pNum > maxProtocolNum) {
                  maxProtocolNum = pNum;
                }
              }
            }
          }
        }
        const counterFilePath = import_path2.default.join(process.cwd(), "data", "protocol_counter.json");
        let fileCounter = 0;
        try {
          if (import_fs2.default.existsSync(counterFilePath)) {
            const data = JSON.parse(import_fs2.default.readFileSync(counterFilePath, "utf8"));
            if (typeof data.counter === "number") {
              fileCounter = data.counter;
            }
          }
        } catch (e) {
          console.error("Error reading protocol counter file:", e);
        }
        const nextNum = Math.max(maxProtocolNum, fileCounter, 10540) + 1;
        try {
          const dataDir = import_path2.default.join(process.cwd(), "data");
          if (!import_fs2.default.existsSync(dataDir)) {
            import_fs2.default.mkdirSync(dataDir, { recursive: true });
          }
          import_fs2.default.writeFileSync(counterFilePath, JSON.stringify({ counter: nextNum }), "utf8");
        } catch (e) {
          console.error("Error writing protocol counter file:", e);
        }
        return String(nextNum).padStart(5, "0");
      };
      const existing = (FileDatabase.get("fechamentos_dt") || []).find((c) => c.dt === dt);
      if (existing && existing.statusFechamento !== "EM_ABERTO") {
        return res.status(400).json({ error: `A DT ${dt} j\xE1 se encontra fechada operacionalmente.` });
      }
      const now = /* @__PURE__ */ new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now.toTimeString().split(" ")[0];
      let resolvedOcorrencias = [...ocorrencias || []];
      if ((houveFalta === "Sim" || houveFalta === true) && faltaProduto) {
        if (!resolvedOcorrencias.some((o) => o.tipo === "Falta de Mercadoria" && o.produto === faltaProduto)) {
          resolvedOcorrencias.push({
            id: `occ-auto-${Date.now()}`,
            tipo: "Falta de Mercadoria",
            produto: faltaProduto,
            quantidade: Number(faltaQuantidade || 0),
            valorUnitario: Number(faltaValorUnit || 0),
            valorTotal: Number(faltaValorTotal || 0),
            observacao: faltaObservacao || ""
          });
        }
      }
      if (houveDevolucao === "Sim" || houveDevolucao === true) {
        if (!resolvedOcorrencias.some((o) => o.tipo === "Devolu\xE7\xE3o")) {
          resolvedOcorrencias.push({
            id: `occ-auto-dev-${Date.now()}`,
            tipo: "Devolu\xE7\xE3o",
            produto: "Devolu\xE7\xE3o de Mercadoria",
            quantidade: Number(devolucaoQtd || 0),
            valorUnitario: 0,
            valorTotal: 0,
            observacao: `Motivo: ${devolucaoMotivo || "Retorno normal"} \u2022 ${devolucaoObs || ""}`
          });
        }
      }
      if (houveAvaria === "Sim" || houveAvaria === true) {
        if (!resolvedOcorrencias.some((o) => o.tipo === "Avaria")) {
          resolvedOcorrencias.push({
            id: `occ-auto-av-${Date.now()}`,
            tipo: "Avaria",
            produto: "Avaria de Produto / Danificado",
            quantidade: 1,
            valorUnitario: 0,
            valorTotal: 0,
            observacao: "Constatada avaria no encerramento"
          });
        }
      }
      let resolvedStatus = statusFechamento;
      if (!resolvedStatus) {
        if (houveFalta === "Sim" || houveFalta === true) {
          resolvedStatus = "Fechada Com Vale";
        } else if (houveAvaria === "Sim" || houveAvaria === true) {
          resolvedStatus = "Fechada Com Ocorr\xEAncia";
        } else if (houveDevolucao === "Sim" || houveDevolucao === true) {
          resolvedStatus = "Fechada Com Devolu\xE7\xE3o";
        } else {
          resolvedStatus = "Fechada Sem Vale";
        }
      }
      const nextProtocol = getNextProtocol();
      const newHistoryItem = {
        protocolo: nextProtocol,
        acao: "FECHAMENTO",
        usuario: user.email,
        data: dateStr,
        hora: timeStr,
        motivo: existing ? "Novo fechamento ap\xF3s reabertura." : "Primeiro fechamento.",
        snapshot: {
          freteValor: req.body.freteValor !== void 0 ? Number(req.body.freteValor) : 0,
          adiantamentos: req.body.adiantamentos !== void 0 ? Number(req.body.adiantamentos) : 0,
          vales: resolvedOcorrencias.filter((o) => o.tipo === "Falta de Mercadoria"),
          multasDescontos: req.body.multasDescontos !== void 0 ? Number(req.body.multasDescontos) : 0,
          statusFechamento: resolvedStatus
        }
      };
      const history = existing ? [...existing.historicoFechamentos || [], newHistoryItem] : [newHistoryItem];
      const closureData = {
        dataFechamento: dateStr,
        horaFechamento: timeStr,
        usuarioResponsavel: user.email,
        usuarioFechamento: user.email,
        protocoloFechamento: nextProtocol,
        historicoFechamentos: history,
        motoristaId,
        veiculoId,
        unidadeId,
        observacoes: observacoes || "",
        ocorrencias: resolvedOcorrencias,
        houveDevolucao: houveDevolucao || "N\xE3o",
        houveAvaria: houveAvaria || "N\xE3o",
        houveFalta: houveFalta || "N\xE3o",
        devolucaoQtd: Number(devolucaoQtd || 0),
        devolucaoMotivo: devolucaoMotivo || "",
        devolucaoObs: devolucaoObs || "",
        faltaProduto: faltaProduto || "",
        faltaQuantidade: Number(faltaQuantidade || 0),
        faltaValorUnit: Number(faltaValorUnit || 0),
        faltaValorTotal: Number(faltaValorTotal || 0),
        faltaObservacao: faltaObservacao || "",
        statusFechamento: resolvedStatus,
        criadoEm: existing ? existing.criadoEm : now.toISOString(),
        atualizadoEm: now.toISOString(),
        // Phase 5 financial structure fields (Bloco 1 & Bloco 2)
        freteValor: req.body.freteValor !== void 0 ? Number(req.body.freteValor) : void 0,
        valorFaturado: req.body.valorFaturado !== void 0 ? Number(req.body.valorFaturado) : void 0,
        disponibilidadeValor: req.body.disponibilidadeValor !== void 0 ? Number(req.body.disponibilidadeValor) : void 0,
        diariasBonificacoes: req.body.diariasBonificacoes !== void 0 ? Number(req.body.diariasBonificacoes) : void 0,
        adiantamentos: req.body.adiantamentos !== void 0 ? Number(req.body.adiantamentos) : void 0,
        outrosCreditos: req.body.outrosCreditos !== void 0 ? Number(req.body.outrosCreditos) : void 0,
        multasDescontos: req.body.multasDescontos !== void 0 ? Number(req.body.multasDescontos) : void 0,
        descargaChapa: req.body.descargaChapa !== void 0 ? Number(req.body.descargaChapa) : void 0,
        pedagios: req.body.pedagios !== void 0 ? Number(req.body.pedagios) : void 0,
        lavagensHospedagens: req.body.lavagensHospedagens !== void 0 ? Number(req.body.lavagensHospedagens) : void 0,
        alimentacao: req.body.alimentacao !== void 0 ? Number(req.body.alimentacao) : void 0,
        manutencaoOutros: req.body.manutencaoOutros !== void 0 ? Number(req.body.manutencaoOutros) : void 0,
        // AMPLA v2.2 - Fase 11 - Descarga and financial enhancements
        houveReciboDescarga: req.body.houveReciboDescarga || "N\xE3o",
        descargaCliente: req.body.descargaCliente || "",
        descargaCodigoCliente: req.body.descargaCodigoCliente || "",
        descargaNumeroNF: req.body.descargaNumeroNF || "",
        descargaValor: req.body.descargaValor !== void 0 ? Number(req.body.descargaValor) : 0,
        descargaData: req.body.descargaData || "",
        descargaObservacoes: req.body.descargaObservacoes || "",
        descargaReciboFile: req.body.descargaReciboFile || "",
        descargaResponsavel: req.body.descargaResponsavel || "",
        reentregaValor: req.body.reentregaValor !== void 0 ? Number(req.body.reentregaValor) : 0,
        abastecimentoValor: req.body.abastecimentoValor !== void 0 ? Number(req.body.abastecimentoValor) : 0
      };
      let finalClosure;
      if (existing) {
        finalClosure = { ...existing, ...closureData };
        FileDatabase.update("fechamentos_dt", existing.id, closureData, user.email);
      } else {
        finalClosure = {
          id: `cl-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
          dt,
          ...closureData
        };
        FileDatabase.add("fechamentos_dt", finalClosure, user.email);
      }
      FileDatabase.logAudit(
        user.email,
        "FECHAMENTO_DT_CRIADO",
        `Fechamento residencial efetuado para a DT ${dt} com protocolo ${nextProtocol} e status: ${resolvedStatus}.`,
        unidadeId || ""
      );
      const foundRota = (FileDatabase.get("rotas") || []).find((r) => r.dt === dt);
      if (foundRota) {
        FileDatabase.update("rotas", foundRota.id, {
          status: "Finalizada",
          status_viagem: resolvedStatus
          // Let routes reflect this specific closure status too!
        }, user.email);
        FileDatabase.logAudit(
          user.email,
          "ROTA_STATUS_AUTO_FINALIZADA",
          `Status da DT ${dt} automaticamente alterado para Finalizada devido ao fechamento de DT.`,
          unidadeId || ""
        );
      }
      const falhas = resolvedOcorrencias.filter((o) => o.tipo === "Falta de Mercadoria");
      let generatedValesCount = 0;
      const allVales = FileDatabase.get("vales") || [];
      let nextIndex = allVales.length + 1;
      for (const occ of falhas) {
        const valeNum = `VALE-${now.getFullYear()}-${String(nextIndex).padStart(4, "0")}`;
        nextIndex++;
        const newVale = {
          id: `vale-${Date.now()}-${Math.floor(Math.random() * 1e3)}-${generatedValesCount}`,
          numeroVale: valeNum,
          dt,
          motoristaId,
          veiculoId,
          unidadeId,
          produto: occ.produto || "Produto N\xE3o Identificado",
          quantidade: Number(occ.quantidade || 0),
          valor: Number(occ.valorTotal || 0),
          data: dateStr,
          responsavel: user.email,
          status: "Aguardando An\xE1lise",
          valorCobrado: null,
          dataCobran\u00E7a: null,
          formaDeCobran\u00E7a: null,
          statusCobran\u00E7a: null,
          criadoEm: now.toISOString()
        };
        FileDatabase.add("vales", newVale, user.email);
        generatedValesCount++;
        FileDatabase.logAudit(
          user.email,
          "VALE_GERADO_AUTOMATICO",
          `Vale ${valeNum} gerado automaticamente para DT ${dt} (Falta do produto ${newVale.produto}, valor R$ ${newVale.valor.toFixed(2)}).`,
          unidadeId || ""
        );
      }
      try {
        const contas = FileDatabase.get("contas_a_receber") || [];
        const existingReceivableIndex = contas.findIndex((c) => c.dt === dt);
        const nfs = FileDatabase.get("notas_fiscais") || [];
        const motoristas = FileDatabase.get("motoristas") || [];
        const associatedNf = nfs.find((nf) => nf.dtId === `DT-${dt}` || nf.dtId === dt);
        const clientName = associatedNf?.cliente || (houveReciboDescarga === "Sim" && descargaCliente ? descargaCliente : "Cliente N\xE3o Definido");
        const driverObj = motoristas.find((m) => m.id === motoristaId);
        const driverName = driverObj?.nome || motoristaId || "Motorista";
        const valorFaturadoInput = req.body.valorFaturado !== void 0 ? Number(req.body.valorFaturado) : void 0;
        const freteFaturado = valorFaturadoInput !== void 0 ? valorFaturadoInput : req.body.freteValor !== void 0 ? Number(req.body.freteValor) : 1850;
        const fretePagar = req.body.freteValor !== void 0 ? Number(req.body.freteValor) : 1850;
        const ped = req.body.pedagios !== void 0 ? Number(req.body.pedagios) : 0;
        const diar = req.body.diariasBonificacoes !== void 0 ? Number(req.body.diariasBonificacoes) : 0;
        const acresc = req.body.outrosCreditos !== void 0 ? Number(req.body.outrosCreditos) : 0;
        const disp = req.body.disponibilidadeValor !== void 0 ? Number(req.body.disponibilidadeValor) : 0;
        const desc = houveReciboDescarga === "Sim" && descargaValor ? Number(descargaValor) : 0;
        const reent = req.body.reentregaValor !== void 0 ? Number(req.body.reentregaValor) : 0;
        const valVale = resolvedOcorrencias.filter((o) => o.tipo === "Falta de Mercadoria").reduce((sum, o) => sum + Number(o.valorTotal || 0), 0);
        const valPedagio = ped;
        const valAbastecimento = req.body.abastecimentoValor !== void 0 ? Number(req.body.abastecimentoValor) : 0;
        const valDescontos = req.body.multasDescontos !== void 0 ? Number(req.body.multasDescontos) : 0;
        const valChapas = req.body.descargaChapa !== void 0 ? Number(req.body.descargaChapa) : 0;
        const valOutrosCustos = Number(req.body.lavagensHospedagens || 0) + Number(req.body.alimentacao || 0) + Number(req.body.manutencaoOutros || 0);
        const recTotal = freteFaturado + disp + desc + reent + acresc;
        const cstTotal = valVale + valPedagio + valAbastecimento + valDescontos + valChapas + valOutrosCustos;
        const resOperacional = recTotal - cstTotal;
        const dParts = dateStr.split("-");
        let dueDate = dateStr;
        if (dParts.length === 3) {
          const d = new Date(Number(dParts[0]), Number(dParts[1]) - 1, Number(dParts[2]));
          d.setDate(d.getDate() + 30);
          dueDate = d.toISOString().split("T")[0];
        }
        let finalClient = clientName;
        let finalEmpresa = "Ampla Log\xEDstica";
        let finalOrigem = "Fechamento de DT";
        if (clientName && clientName.toLowerCase().includes("heineken")) {
          finalClient = "Heineken";
          finalEmpresa = "Heineken Brasil";
        }
        const receivableObj = {
          id: `REC-${dt}`,
          dt,
          cliente: finalClient,
          empresa: finalEmpresa,
          veiculoId: veiculoId || "AAA-0000",
          motoristaId: driverName,
          origem: finalOrigem,
          destino: "S\xE3o Paulo - Capital",
          // Detailed financial fields
          valorFrete: freteFaturado,
          valorPedagiosReembolsaveis: ped,
          valorDiarias: diar,
          outrosAcrescimos: acresc,
          valorDisponibilidade: disp,
          valorDescarga: desc,
          valorReentrega: reent,
          outrasReceitas: acresc,
          valorVale: valVale,
          valorPedagio: valPedagio,
          valorAbastecimento: valAbastecimento,
          valorDescontos: valDescontos,
          valorChapas: valChapas,
          outrosCustos: valOutrosCustos,
          receitaTotal: recTotal,
          custoTotal: cstTotal,
          resultadoOperacional: resOperacional,
          valorTotal: recTotal,
          // Total receivable is the total revenue
          dataEntrega: dateStr,
          dataVencimento: dueDate,
          responsavel: user.email,
          observacoes: `Gerado automaticamente a partir do faturamento da DT ${dt}`,
          unidadeId: unidadeId || "un-go"
        };
        if (existingReceivableIndex >= 0) {
          const old = contas[existingReceivableIndex];
          contas[existingReceivableIndex] = {
            ...old,
            ...receivableObj,
            status: old.status || "A Receber",
            historicoBaixas: old.historicoBaixas || [],
            dataRecebimento: old.dataRecebimento,
            valorRecebido: old.valorRecebido,
            formaRecebimento: old.formaRecebimento,
            observacaoBaixa: old.observacaoBaixa
          };
          FileDatabase.set("contas_a_receber", contas);
          FileDatabase.logAudit(
            user.email,
            "RECEBIMENTO_ATUALIZADO_AUTOMATICO",
            `T\xEDtulo de Contas a Receber REC-${dt} atualizado automaticamente. Receita Total: R$ ${recTotal.toFixed(2)}, Custos: R$ ${cstTotal.toFixed(2)}, Resultado: R$ ${resOperacional.toFixed(2)}.`,
            unidadeId || ""
          );
        } else {
          const newReceivable = {
            ...receivableObj,
            status: "A Receber",
            historicoBaixas: []
          };
          contas.push(newReceivable);
          FileDatabase.set("contas_a_receber", contas);
          FileDatabase.logAudit(
            user.email,
            "RECEBIMENTO_GERADO_AUTOMATICO",
            `T\xEDtulo de Contas a Receber REC-${dt} gerado automaticamente para o cliente ${finalClient}. Receita: R$ ${recTotal.toFixed(2)}, Custos: R$ ${cstTotal.toFixed(2)}.`,
            unidadeId || ""
          );
        }
        const allVeiculos = FileDatabase.get("veiculos") || [];
        const matchedVeiculo = allVeiculos.find((v) => v.id === veiculoId || v.placa === veiculoId);
        const isFrotaPropria = matchedVeiculo?.tipo === "Frota Pr\xF3pria";
        const contasPagar = FileDatabase.get("contas_a_pagar") || [];
        const existingPayableIndex = contasPagar.findIndex((c) => c.dt === dt);
        if (isFrotaPropria) {
          if (existingPayableIndex >= 0) {
            contasPagar.splice(existingPayableIndex, 1);
            FileDatabase.set("contas_a_pagar", contasPagar);
            FileDatabase.logAudit(
              user.email,
              "PAGAMENTO_DELETADO_FROTA_PROPRIA",
              `T\xEDtulo de Contas a Pagar para DT ${dt} foi removido pois o ve\xEDculo \xE9 de Frota Pr\xF3pria.`,
              unidadeId || ""
            );
          }
        } else {
          const adiantamentosVal = req.body.adiantamentos !== void 0 ? Number(req.body.adiantamentos) : 0;
          const payTotal = fretePagar + disp + diar - (adiantamentosVal + valDescontos);
          const payableObj = {
            id: `PAG-${dt}`,
            dt,
            cliente: finalClient,
            motoristaId,
            motoristaNome: driverName,
            veiculoId: veiculoId || "AAA-0000",
            unidadeId: unidadeId || "un-go",
            valorFrete: fretePagar,
            valorDisponibilidade: disp,
            valorDiarias: diar,
            adiantamentos: adiantamentosVal,
            multasDescontos: valDescontos,
            valorTotal: payTotal,
            status: "A Pagar",
            dataGeracao: dateStr,
            dataVencimento: dueDate,
            responsavel: user.email,
            observacoes: `Gerado automaticamente a partir do acerto de viagem da DT ${dt}`
          };
          if (existingPayableIndex >= 0) {
            const oldP = contasPagar[existingPayableIndex];
            contasPagar[existingPayableIndex] = {
              ...oldP,
              ...payableObj,
              status: oldP.status || "A Pagar"
            };
          } else {
            contasPagar.push(payableObj);
          }
          FileDatabase.set("contas_a_pagar", contasPagar);
          FileDatabase.logAudit(
            user.email,
            "PAGAMENTO_GERADO_AUTOMATICO",
            `T\xEDtulo de Contas a Pagar PAG-${dt} gerado/atualizado automaticamente para o motorista ${driverName}. Valor Total a Pagar: R$ ${payTotal.toFixed(2)}.`,
            unidadeId || ""
          );
        }
      } catch (autoErr) {
        console.error("Erro ao gerar/atualizar conta a receber/pagar autom\xE1tica:", autoErr);
      }
      res.json({
        success: true,
        closure: finalClosure,
        generatedVales: generatedValesCount
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/fechamentos_dt/reabrir", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const { dt, motivo, protocolo } = req.body;
      if (!dt) {
        return res.status(400).json({ error: "N\xFAmero da DT \xE9 obrigat\xF3rio." });
      }
      if (!motivo || !motivo.trim()) {
        return res.status(400).json({ error: "Motivo da reabertura \xE9 obrigat\xF3rio." });
      }
      if (!protocolo || !protocolo.trim()) {
        return res.status(400).json({ error: "Protocolo de fechamento \xE9 obrigat\xF3rio para reabertura." });
      }
      const closures = FileDatabase.get("fechamentos_dt") || [];
      const existing = closures.find((c) => c.dt === dt);
      if (!existing) {
        return res.status(404).json({ error: "DT n\xE3o localizada." });
      }
      const cleanProtocolInput = (protocolo || "").toString().trim();
      const savedProtocolVal = (existing.protocoloFechamento || "").toString().trim();
      let isProtocolValid = false;
      if (cleanProtocolInput === savedProtocolVal) {
        isProtocolValid = true;
      }
      if (!isProtocolValid) {
        const intInput = parseInt(cleanProtocolInput, 10);
        const intSaved = parseInt(savedProtocolVal, 10);
        if (!isNaN(intInput) && !isNaN(intSaved) && intInput === intSaved) {
          isProtocolValid = true;
        }
      }
      if (!isProtocolValid && (savedProtocolVal === "" || savedProtocolVal === "N/A")) {
        const intInput = parseInt(cleanProtocolInput, 10);
        if (cleanProtocolInput === "10541" || intInput === 10541) {
          isProtocolValid = true;
        }
      }
      if (!isProtocolValid) {
        return res.status(400).json({ error: "Protocolo inv\xE1lido." });
      }
      if (existing.statusFechamento === "EM_ABERTO") {
        return res.status(400).json({ error: `A DT ${dt} j\xE1 est\xE1 em aberto.` });
      }
      const isMaster = user.perfil === "admin_master" || user.tipo_usuario === "MASTER";
      if (!isMaster) {
        return res.status(403).json({ error: "Apenas usu\xE1rios MASTER podem reabrir DTs finalizadas." });
      }
      const now = /* @__PURE__ */ new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now.toTimeString().split(" ")[0];
      const reopeningEvent = {
        protocolo: existing.protocoloFechamento || "N/A",
        acao: "REABERTURA",
        usuario: user.email,
        data: dateStr,
        hora: timeStr,
        motivo
      };
      const history = [...existing.historicoFechamentos || [], reopeningEvent];
      FileDatabase.update("fechamentos_dt", existing.id, {
        statusFechamento: "EM_ABERTO",
        historicoFechamentos: history,
        atualizadoEm: now.toISOString()
      }, user.email);
      const foundRota = (FileDatabase.get("rotas") || []).find((r) => r.dt === dt);
      if (foundRota) {
        FileDatabase.update("rotas", foundRota.id, {
          status: "Em rota",
          status_viagem: void 0
        }, user.email);
        FileDatabase.logAudit(
          user.email,
          "ROTA_REABERTA",
          `DT ${dt} reaberta operacionalmente. Status alterado de volta para 'Em rota'.`,
          existing.unidadeId || ""
        );
      }
      FileDatabase.logAudit(
        user.email,
        "REABERTURA_DT",
        `DT: ${dt} | Protocolo: ${existing.protocoloFechamento || "N/A"} | Usu\xE1rio: ${user.email} | Data/Hora: ${dateStr} ${timeStr} | Motivo: ${motivo}`,
        existing.unidadeId || ""
      );
      return res.json({ success: true, message: `DT ${dt} reaberta com sucesso.` });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/vales", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const vales = FileDatabase.get("vales") || [];
      const activeUnit = getRequestUnitContext(req, user);
      if (activeUnit === "Todas") {
        return res.json(vales);
      }
      return res.json(vales.filter((v) => v.unidadeId === activeUnit));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/vales/:id", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const { id } = req.params;
      const current = (FileDatabase.get("vales") || []).find((v) => v.id === id);
      if (!current) {
        return res.status(404).json({ error: "Vale n\xE3o encontrado." });
      }
      const updated = FileDatabase.update("vales", id, req.body, user.email);
      if (req.body.status && req.body.status !== current.status) {
        FileDatabase.logAudit(
          user.email,
          "VALE_STATUS_ALTERADO",
          `Status do Vale ${current.numeroVale} alterado de '${current.status}' para '${req.body.status}'.`,
          current.unidadeId || ""
        );
      } else {
        FileDatabase.logAudit(
          user.email,
          "VALE_ATUALIZADO",
          `Vale ${current.numeroVale} atualizado pelo usu\xE1rio.`,
          current.unidadeId || ""
        );
      }
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/vales/:id", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const { id } = req.params;
      const current = (FileDatabase.get("vales") || []).find((v) => v.id === id);
      if (!current) {
        return res.status(404).json({ error: "Vale n\xE3o encontrado." });
      }
      FileDatabase.delete("vales", id, user.email);
      FileDatabase.logAudit(
        user.email,
        "VALE_EXCLUIDO",
        `Vale corporativo ${current.numeroVale} exclu\xEDdo de forma manual e auditada do banco real.`,
        current.unidadeId || ""
      );
      res.json({ success: true, message: "Vale exclu\xEDdo com sucesso." });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/noshows", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const noshows = FileDatabase.get("noshows") || [];
      const activeUnit = getRequestUnitContext(req, user);
      if (activeUnit === "Todas") {
        return res.json(noshows);
      }
      return res.json(noshows.filter((n) => n.unidadeId === activeUnit));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/noshows", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const {
        dt,
        motoristaId,
        veiculoId,
        placa,
        unidadeId,
        transportador,
        statusNoShow,
        data,
        motoristaSubstituto,
        veiculoSubstituto,
        transportadorSubstituto,
        observacoes
      } = req.body;
      const newNoShow = {
        id: "ns-" + Date.now().toString(),
        dt,
        motoristaId,
        veiculoId,
        placa,
        unidadeId,
        transportador,
        statusNoShow: statusNoShow || "Aberto",
        motoristaSubstituto: motoristaSubstituto || "",
        veiculoSubstituto: veiculoSubstituto || "",
        transportadorSubstituto: transportadorSubstituto || "",
        observacoes: observacoes || "",
        data: data || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        usuarioResponsavel: user.email,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      const noshows = FileDatabase.get("noshows") || [];
      noshows.push(newNoShow);
      FileDatabase.set("noshows", noshows);
      FileDatabase.logAudit(
        user.email,
        "NOSHOW_REGISTRADO",
        `Registro de No Show cadastrado para a DT ${dt} com status: ${newNoShow.statusNoShow}.`,
        unidadeId || ""
      );
      res.status(201).json(newNoShow);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/noshows/:id", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const { id } = req.params;
      const dbList = FileDatabase.get("noshows") || [];
      const itemIdx = dbList.findIndex((n) => n.id === id);
      if (itemIdx === -1) {
        return res.status(404).json({ error: "Registro de no show n\xE3o localizado." });
      }
      const existing = dbList[itemIdx];
      const updated = {
        ...existing,
        ...req.body,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      dbList[itemIdx] = updated;
      FileDatabase.set("noshows", dbList);
      FileDatabase.logAudit(
        user.email,
        "NOSHOW_ATUALIZADO",
        `No Show da DT ${existing.dt} atualizado para status: ${updated.statusNoShow}.`,
        existing.unidadeId || ""
      );
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/noshows/:id", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const { id } = req.params;
      const dbList = FileDatabase.get("noshows") || [];
      const existing = dbList.find((n) => n.id === id);
      if (!existing) {
        return res.status(404).json({ error: "No Show n\xE3o localizado." });
      }
      const filtered = dbList.filter((n) => n.id !== id);
      FileDatabase.set("noshows", filtered);
      FileDatabase.logAudit(
        user.email,
        "NOSHOW_EXCLUIDO",
        `Registro de No Show para a DT ${existing.dt} exclu\xEDdo.`,
        existing.unidadeId || ""
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/auditoria", (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const logs = FileDatabase.get("auditoria");
    const activeUnit = getRequestUnitContext(req, user);
    if (activeUnit === "Todas") return res.json(logs);
    res.json(logs.filter((log) => {
      const op = log.usuario ? log.usuario.toLowerCase() : "";
      return op.includes(user.email.toLowerCase()) || op.includes(user.id.toLowerCase()) || log.detalhes.toLowerCase().includes(activeUnit.toLowerCase());
    }));
  });
  app.post("/api/upload-document", (req, res) => {
    const { base64Data, filename, filetype } = req.body;
    const simulatedUrl = base64Data || `https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1500&auto=format&fit=crop`;
    res.json({
      success: true,
      url: simulatedUrl,
      filename,
      metadata: { uploadedAt: (/* @__PURE__ */ new Date()).toISOString(), size: "2.4 MB" }
    });
  });
  function getMovementsForVehicle(db, veiculoId) {
    const veiculo = (db.veiculos || []).find((v) => v.id === veiculoId);
    if (!veiculo) return [];
    const veiculoPlaca = veiculo.placa;
    const cleanPlaca = (p) => p ? p.replace(/\s|-/g, "").toLowerCase() : "";
    const dts = (db.fechamentos_dt || []).filter((f) => f.veiculoId === veiculoId);
    const autoFretes = [];
    const autoDisps = [];
    const getStandardRates = (perfil) => {
      const p = (perfil || "").toLowerCase();
      if (p.includes("van") || p.includes("utilit\xE1rio") || p.includes("utilitario")) {
        return { frete: 550, disp: 50 };
      }
      if (p.includes("vuc")) {
        return { frete: 750, disp: 70 };
      }
      if (p.includes("3/4") || p.includes("tres quartos")) {
        return { frete: 850, disp: 80 };
      }
      if (p.includes("toco")) {
        return { frete: 1100, disp: 100 };
      }
      if (p.includes("truck")) {
        return { frete: 1500, disp: 150 };
      }
      if (p.includes("carreta")) {
        return { frete: 2200, disp: 200 };
      }
      return { frete: 1200, disp: 100 };
    };
    const rates = getStandardRates(veiculo.perfil);
    dts.forEach((f) => {
      const freteVal = f.freteValor !== void 0 && f.freteValor !== null ? Number(f.freteValor) : rates.frete;
      const dispVal = f.disponibilidadeValor !== void 0 && f.disponibilidadeValor !== null ? Number(f.disponibilidadeValor) : rates.disp;
      autoFretes.push({
        id: `auto-frete-${f.id || f.dt}`,
        veiculoId,
        data: f.dataFechamento || f.data || "2026-06-19",
        hora: f.horaFechamento || f.hora || "12:00:00",
        tipo: "Cr\xE9dito",
        origem: "Frete",
        valor: freteVal,
        observacao: `Frete DT ${f.dt || "N/A"}`,
        usuario: f.usuarioResponsavel || "Sistema",
        dtId: f.dt,
        criadoEm: f.criadoEm || `${f.dataFechamento || "2026-06-19"}T12:00:00.000Z`
      });
      autoDisps.push({
        id: `auto-disp-${f.id || f.dt}`,
        veiculoId,
        data: f.dataFechamento || f.data || "2026-06-19",
        hora: f.horaFechamento || f.hora || "12:05:00",
        tipo: "Cr\xE9dito",
        origem: "Disponibilidade",
        valor: dispVal,
        observacao: `Disponibilidade DT ${f.dt || "N/A"}`,
        usuario: f.usuarioResponsavel || "Sistema",
        dtId: f.dt,
        criadoEm: f.criadoEm || `${f.dataFechamento || "2026-06-19"}T12:05:00.000Z`
      });
      if (f.diariasBonificacoes !== void 0 && f.diariasBonificacoes !== null && Number(f.diariasBonificacoes) > 0) {
        autoFretes.push({
          id: `auto-diarias-bonif-${f.id || f.dt}`,
          veiculoId,
          data: f.dataFechamento || f.data || "2026-06-19",
          hora: f.horaFechamento || f.hora || "12:06:00",
          tipo: "Cr\xE9dito",
          origem: "Bonifica\xE7\xE3o",
          valor: Number(f.diariasBonificacoes),
          observacao: `Di\xE1rias / Bonifica\xE7\xF5es DT ${f.dt || "N/A"}`,
          usuario: f.usuarioResponsavel || "Sistema",
          dtId: f.dt,
          criadoEm: f.criadoEm || `${f.dataFechamento || "2026-06-19"}T12:06:00.000Z`
        });
      }
      if (f.outrosCreditos !== void 0 && f.outrosCreditos !== null && Number(f.outrosCreditos) > 0) {
        autoFretes.push({
          id: `auto-outros-cred-${f.id || f.dt}`,
          veiculoId,
          data: f.dataFechamento || f.data || "2026-06-19",
          hora: f.horaFechamento || f.hora || "12:07:00",
          tipo: "Cr\xE9dito",
          origem: "Outros Cr\xE9ditos",
          valor: Number(f.outrosCreditos),
          observacao: `Outros Cr\xE9ditos DT ${f.dt || "N/A"}`,
          usuario: f.usuarioResponsavel || "Sistema",
          dtId: f.dt,
          criadoEm: f.criadoEm || `${f.dataFechamento || "2026-06-19"}T12:07:00.000Z`
        });
      }
      if (f.adiantamentos !== void 0 && f.adiantamentos !== null && Number(f.adiantamentos) > 0) {
        autoFretes.push({
          id: `auto-adiantamentos-${f.id || f.dt}`,
          veiculoId,
          data: f.dataFechamento || f.data || "2026-06-19",
          hora: f.horaFechamento || f.hora || "12:08:00",
          tipo: "D\xE9bito",
          origem: "Adiantamento",
          valor: Number(f.adiantamentos),
          observacao: `Adiantamento de viagem DT ${f.dt || "N/A"}`,
          usuario: f.usuarioResponsavel || "Sistema",
          dtId: f.dt,
          criadoEm: f.criadoEm || `${f.dataFechamento || "2026-06-19"}T12:08:00.000Z`
        });
      }
      if (f.multasDescontos !== void 0 && f.multasDescontos !== null && Number(f.multasDescontos) > 0) {
        autoFretes.push({
          id: `auto-multas-desc-${f.id || f.dt}`,
          veiculoId,
          data: f.dataFechamento || f.data || "2026-06-19",
          hora: f.horaFechamento || f.hora || "12:09:00",
          tipo: "D\xE9bito",
          origem: "Desconto",
          valor: Number(f.multasDescontos),
          observacao: `Multas / Descontos DT ${f.dt || "N/A"}`,
          usuario: f.usuarioResponsavel || "Sistema",
          dtId: f.dt,
          criadoEm: f.criadoEm || `${f.dataFechamento || "2026-06-19"}T12:09:00.000Z`
        });
      }
    });
    const autoVales = (db.vales || []).filter((v) => v.veiculoId === veiculoId).map((v) => ({
      id: `auto-vale-${v.id}`,
      veiculoId,
      data: v.data,
      hora: "12:10:00",
      tipo: "D\xE9bito",
      origem: "Vale",
      valor: Number(v.valorCobrado || v.valor || 0),
      observacao: `Vale: ${v.produto || "Falta de mercadoria"} (DT ${v.dt || "N/A"})`,
      usuario: v.responsavel || "Sistema",
      valeId: v.id,
      dtId: v.dt,
      criadoEm: v.criadoEm || `${v.data}T12:10:00.000Z`
    }));
    const weeklyClosures = (db.fechamentos_semanais || []).filter((w) => w.veiculoId === veiculoId && w.status === "Pago");
    const payments = weeklyClosures.map((w) => ({
      id: `payment-${w.id}`,
      veiculoId,
      data: w.dataPagamento || w.dataFim,
      hora: "23:59:59",
      // Sort at the very end of the day
      tipo: "D\xE9bito",
      origem: "Pagamento",
      valor: Number(w.saldoFinal || 0),
      observacao: `Pagamento: ${w.numeroFechamento}. Obs: ${w.observacoes || "Sem observa\xE7\xF5es"}`,
      usuario: w.criadoPor || "Sistema",
      dtId: "",
      criadoEm: w.criadoEm || `${w.dataPagamento || "2026-06-19"}T23:59:59.000Z`,
      isPayment: true
    }));
    const allMovements = [...autoFretes, ...autoDisps, ...autoVales, ...payments];
    allMovements.sort((a, b) => {
      const compDate = a.data.localeCompare(b.data);
      if (compDate !== 0) return compDate;
      const compTime = (a.hora || "").localeCompare(b.hora || "");
      if (compTime !== 0) return compTime;
      return (a.id || "").localeCompare(b.id || "");
    });
    let currentBalance = 0;
    return allMovements.map((mov) => {
      const mDate = mov.data ? mov.data.slice(0, 10) : "";
      const isFaturado = mov.isPayment ? true : weeklyClosures.some((w) => mDate >= w.dataInicio && mDate <= w.dataFim);
      const isCredit = mov.tipo === "Cr\xE9dito";
      const val = Number(mov.valor || 0);
      const saldoAnterior = currentBalance;
      if (isCredit) {
        currentBalance += val;
      } else {
        currentBalance -= val;
      }
      const saldoPosterior = currentBalance;
      return {
        ...mov,
        saldoAnterior,
        saldoPosterior,
        faturado: isFaturado
      };
    });
  }
  app.get("/api/financeiro/pessoas", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const db = FileDatabase.getFull();
      const veiculos = db.veiculos || [];
      const motoristas = db.motoristas || [];
      const activeUnit = getRequestUnitContext(req, user);
      let filtered = veiculos;
      if (activeUnit !== "Todas") {
        filtered = veiculos.filter((v) => v.unidadeId === activeUnit);
      }
      const result = filtered.map((v) => {
        const movements = getMovementsForVehicle(db, v.id);
        const activeMovements = movements.filter((m) => !m.faturado);
        const lastMov = movements[movements.length - 1];
        const creditos = activeMovements.filter((mov) => mov.tipo === "Cr\xE9dito").reduce((acc, mov) => acc + Number(mov.valor || 0), 0);
        const debitos = activeMovements.filter((mov) => mov.tipo === "D\xE9bito").reduce((acc, mov) => acc + Number(mov.valor || 0), 0);
        const saldo = creditos - debitos;
        const motorista = motoristas.find((m) => m.id === v.motoristaId || m.id === v.motoristaPreferencialId);
        return {
          id: v.id,
          nome: `${v.modelo} (${v.placa})`,
          placa: v.placa,
          perfil: v.perfil || "Utilit\xE1rio",
          modelo: v.modelo,
          marca: v.marca,
          unidadeId: v.unidadeId,
          motoristaNome: motorista ? motorista.nome : "Sem Motorista Vinculado",
          statusFinanceiro: v.statusFinanceiro || "Ativo",
          dataCriacaoContaFinanceira: v.dataCriacaoContaFinanceira || "2026-06-15",
          saldo,
          saldoDisponivel: v.statusFinanceiro === "Bloqueado" ? 0 : saldo,
          creditos,
          debitos,
          ultimaMovimentacao: lastMov ? {
            data: lastMov.data,
            tipo: lastMov.tipo,
            origem: lastMov.origem,
            valor: lastMov.valor,
            observacao: lastMov.observacao
          } : null
        };
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/financeiro/fechamentos", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const isOperator = user.perfil === "operador" || user.tipo_usuario === "OPERADOR";
      if (isOperator) return res.status(403).json({ error: "Sem acesso" });
      const db = FileDatabase.getFull();
      const closures = db.fechamentos_semanais || [];
      const enriched = closures.map((c) => {
        const veiculo = db.veiculos.find((v) => v.id === c.veiculoId);
        const motorista = veiculo ? db.motoristas.find((m) => m.id === veiculo.motoristaId || m.id === veiculo.motoristaPreferencialId) : null;
        return {
          ...c,
          veiculoModelo: veiculo ? veiculo.modelo : "N/A",
          veiculoPlaca: veiculo ? veiculo.placa : c.placa || "N/A",
          motoristaNome: motorista ? motorista.nome : "Sem Motorista"
        };
      });
      res.json(enriched);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/financeiro/pessoas/:id/extrato", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const { id } = req.params;
      const db = FileDatabase.getFull();
      const veiculo = db.veiculos.find((v) => v.id === id);
      if (!veiculo) return res.status(404).json({ error: "Ve\xEDculo n\xE3o encontrado" });
      const movements = getMovementsForVehicle(db, id);
      const activeMovements = movements.filter((m) => !m.faturado);
      const creditos = activeMovements.filter((mov) => mov.tipo === "Cr\xE9dito").reduce((acc, mov) => acc + Number(mov.valor || 0), 0);
      const debitos = activeMovements.filter((mov) => mov.tipo === "D\xE9bito").reduce((acc, mov) => acc + Number(mov.valor || 0), 0);
      const saldo = creditos - debitos;
      const motorista = db.motoristas.find((m) => m.id === veiculo.motoristaId || m.id === veiculo.motoristaPreferencialId);
      const weeklyClosures = (db.fechamentos_semanais || []).filter((w) => w.veiculoId === id);
      res.json({
        pessoa: {
          id: veiculo.id,
          nome: `${veiculo.modelo} (${veiculo.placa})`,
          placa: veiculo.placa,
          perfil: veiculo.perfil || "Utilit\xE1rio",
          modelo: veiculo.modelo,
          marca: veiculo.marca,
          unidadeId: veiculo.unidadeId,
          motoristaNome: motorista ? motorista.nome : "Sem Motorista Vinculado",
          statusFinanceiro: veiculo.statusFinanceiro || "Ativo",
          dataCriacaoContaFinanceira: veiculo.dataCriacaoContaFinanceira || "2026-06-15",
          saldo,
          saldoDisponivel: veiculo.statusFinanceiro === "Bloqueado" ? 0 : saldo,
          creditos,
          debitos
        },
        extrato: movements,
        fechamentosSemanais: weeklyClosures
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/financeiro/pessoas/:id/fechar-semana", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const isMaster = user.perfil === "admin_master" || user.tipo_usuario === "MASTER";
      if (!isMaster) {
        return res.status(403).json({ error: "Apenas usu\xE1rios MASTER podem fechar pagamentos." });
      }
      const { id } = req.params;
      const {
        dataInicio,
        dataFim,
        receitasFretes,
        receitasDisponibilidade,
        receitasBonificacoes,
        receitasOutros,
        totalReceitas,
        descontosVales,
        descontosAdiantamentos,
        descontosGerais,
        descontosDescargas,
        descontosManutencoes,
        descontosOutros,
        totalDescontos,
        saldoFinal,
        formaPagamento,
        observacoes,
        dataPagamento,
        horaPagamento
      } = req.body;
      if (!dataInicio || !dataFim) {
        return res.status(400).json({ error: "Per\xEDodo (In\xEDcio e Fim) \xE9 obrigat\xF3rio." });
      }
      const db = FileDatabase.getFull();
      const veiculo = db.veiculos.find((v) => v.id === id);
      if (!veiculo) return res.status(404).json({ error: "Ve\xEDculo n\xE3o encontrado" });
      if (!db.fechamentos_semanais) {
        db.fechamentos_semanais = [];
      }
      const overlaps = db.fechamentos_semanais.some((w) => {
        if (w.veiculoId !== id) return false;
        return dataInicio <= w.dataFim && dataFim >= w.dataInicio;
      });
      if (overlaps) {
        return res.status(400).json({ error: "Este per\xEDodo de datas j\xE1 possui um fechamento registrado (conflito de per\xEDodos)." });
      }
      const generatedNumber = `FC-${dataInicio.replace(/-/g, "")}-${dataFim.replace(/-/g, "")}-${Math.floor(1e3 + Math.random() * 9e3)}`;
      const newClosure = {
        id: `fs-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
        veiculoId: id,
        placa: veiculo.placa,
        dataInicio,
        dataFim,
        receitasFretes: Number(receitasFretes || 0),
        receitasDisponibilidade: Number(receitasDisponibilidade || 0),
        receitasBonificacoes: Number(receitasBonificacoes || 0),
        receitasOutros: Number(receitasOutros || 0),
        totalReceitas: Number(totalReceitas || 0),
        descontosVales: Number(descontosVales || 0),
        descontosAdiantamentos: Number(descontosAdiantamentos || 0),
        descontosGerais: Number(descontosGerais || 0),
        descontosDescargas: Number(descontosDescargas || 0),
        descontosManutencoes: Number(descontosManutencoes || 0),
        descontosOutros: Number(descontosOutros || 0),
        totalDescontos: Number(totalDescontos || 0),
        saldoFinal: Number(saldoFinal || 0),
        status: "Pago",
        criadoEm: (/* @__PURE__ */ new Date()).toISOString(),
        criadoPor: user.email,
        formaPagamento: formaPagamento || "PIX",
        observacoes: observacoes || "",
        numeroFechamento: generatedNumber,
        dataPagamento: dataPagamento || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        horaPagamento: horaPagamento || (/* @__PURE__ */ new Date()).toTimeString().split(" ")[0],
        ipAddress: req.ip || "127.0.0.1"
      };
      db.fechamentos_semanais.push(newClosure);
      FileDatabase.write(db);
      FileDatabase.asyncWriteToSupabase("fechamentos_semanais", db.fechamentos_semanais);
      FileDatabase.logAudit(
        user.email,
        "FIN_FECHAMENTO_SEMANAL",
        `Fechamento semanal realizado para o ve\xEDculo ${veiculo.modelo} (${veiculo.placa}) do per\xEDodo ${dataInicio} at\xE9 ${dataFim}. Saldo pago: R$ ${Number(saldoFinal).toFixed(2)}. N\xB0 Fechamento: ${generatedNumber}.`,
        veiculo.unidadeId || ""
      );
      res.json({ success: true, closure: newClosure });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/financeiro/pessoas/:id/fechamentos/:closureId", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const isMaster = user.perfil === "admin_master" || user.tipo_usuario === "MASTER";
      if (!isMaster) {
        return res.status(403).json({ error: "Apenas usu\xE1rios MASTER podem reabrir per\xEDodos ou excluir fechamentos." });
      }
      const { id, closureId } = req.params;
      const db = FileDatabase.getFull();
      const veiculo = db.veiculos.find((v) => v.id === id);
      if (!veiculo) return res.status(404).json({ error: "Ve\xEDculo n\xE3o encontrado" });
      if (!db.fechamentos_semanais) {
        db.fechamentos_semanais = [];
      }
      const closureIndex = db.fechamentos_semanais.findIndex((w) => w.id === closureId && w.veiculoId === id);
      if (closureIndex === -1) {
        return res.status(404).json({ error: "Fechamento n\xE3o encontrado" });
      }
      const deletedClosure = db.fechamentos_semanais[closureIndex];
      db.fechamentos_semanais.splice(closureIndex, 1);
      FileDatabase.write(db);
      FileDatabase.asyncWriteToSupabase("fechamentos_semanais", db.fechamentos_semanais);
      FileDatabase.logAudit(
        user.email,
        "FIN_EXCLUIR_FECHAMENTO_SEMANAL",
        `Exclus\xE3o de fechamento/reabertura de per\xEDodo para o ve\xEDculo ${veiculo.modelo} (${veiculo.placa}) de ${deletedClosure.dataInicio} a ${deletedClosure.dataFim}. Valor estornado: R$ ${Number(deletedClosure.saldoFinal).toFixed(2)}.`,
        veiculo.unidadeId || ""
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/financeiro/pessoas/:id/status", (req, res) => {
    try {
      const user = getRequestUser(req);
      if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
      const isOperator = user.perfil === "operador" || user.tipo_usuario === "OPERADOR";
      if (isOperator) return res.status(403).json({ error: "Sem permiss\xE3o para alterar status financeiro" });
      const { id } = req.params;
      const { statusFinanceiro } = req.body;
      if (!statusFinanceiro) {
        return res.status(400).json({ error: "Status financeiro \xE9 obrigat\xF3rio." });
      }
      const db = FileDatabase.getFull();
      const veiculo = db.veiculos.find((v) => v.id === id);
      if (!veiculo) return res.status(404).json({ error: "Ve\xEDculo n\xE3o encontrado" });
      veiculo.statusFinanceiro = statusFinanceiro;
      FileDatabase.write(db);
      FileDatabase.asyncWriteToSupabase("veiculos", db.veiculos);
      FileDatabase.logAudit(
        user.email,
        "FIN_STATUS_ALTERADO",
        `Status financeiro do ve\xEDculo ${veiculo.modelo} (${veiculo.placa}) alterado para ${statusFinanceiro}.`,
        veiculo.unidadeId || ""
      );
      res.json({ success: true, statusFinanceiro });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[TMS Server] Operational express logistics backend running on port http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
