import "dotenv/config";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Ensure data folder exists
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "database.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

console.log("[Supabase Initialization DIAGNOSTICS] URL length:", supabaseUrl ? supabaseUrl.length : 0);
console.log("[Supabase Initialization DIAGNOSTICS] Anon Key length:", supabaseAnonKey ? supabaseAnonKey.length : 0);

if (supabaseUrl && supabaseAnonKey) {
  console.log("[Supabase Initialization DIAGNOSTICS] Initializing Supabase client with URL:", supabaseUrl);
} else {
  console.log("[Supabase Initialization DIAGNOSTICS] Missing SUPABASE_URL or SUPABASE_ANON_KEY. Falling back to local database mode.");
}

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

console.log("[Supabase Initialization DIAGNOSTICS] Supabase Client loaded successfully:", !!supabase);

export interface Usuario {
  id: string;
  email: string;
  nome: string;
  perfil: "admin_master" | "admin_unidade" | "operador";
  unidadeId: string; // "Todas" or specific unit ID
  status: "ativo" | "inativo";
  senha?: string;
  deveAlterarSenha?: boolean;
  supervisor?: string;
  unidadesPermitidas?: string[];
  
  // New compliance fields
  unidade_id?: string;
  tipo_usuario?: "MASTER" | "SUPERVISOR" | "OPERADOR" | "CONFERENTE" | "MOTORISTA" | "FINANCEIRO" | "ADMINISTRATIVO";
  cpf?: string;
  telefone?: string;
  cargo?: string;
  permissions?: {
    [key: string]: {
      visualizar: boolean;
      criar: boolean;
      editar: boolean;
      excluir: boolean;
      exportar?: boolean;
    };
  };
}

export interface Unidade {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  supervisor?: string;
  usuarioResponsavel?: string;
  email?: string;
  telefone?: string;
  
  // New compliance fields
  codigo?: string;
  endereco?: string;
  status?: "ativo" | "inativo";
  created_at?: string;
  updated_at?: string;
}

export interface DocumentoHistorico {
  id: string;
  pessoaId: string;
  pessoaNome: string;
  documentoTipo: string;
  dataTroca: string;
  usuarioResponsavel: string;
  arquivoAntigo?: string;
  arquivoNovo: string;
  validadeAnterior?: string;
  novaValidade?: string;
  motivo?: string;
}

export interface Motorista {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  unidadeId: string;
  cnhVencimento: string;
  asoVencimento: string;
  // Status check (Pendente / Feito)
  integracao: "Feito" | "Pendente";
  pesquisa: "Feito" | "Pendente" | "Reprovada";
  aso: "Feito" | "Pendente";
  fichaEpi: "Feito" | "Pendente";
  statusFinal: "LIBERADO" | "PENDENTE" | "BLOQUEADO";
  statusConformidade?: "APTO" | "ATENÇÃO" | "CRÍTICO" | "BLOQUEADO";
  motivoBloqueio?: string;
  cnhDocumentoUrl?: string;
  asoDocumentoUrl?: string;
  
  // v2.2 additions
  tipo?: "Motorista" | "Ajudante Fixo" | "Ajudante Geral";
  integracaoData?: string;
  integracaoVencimento?: string;
  integracaoDocumentoUrl?: string;
  pesquisaVencimento?: string;
  pesquisaDocumentoUrl?: string;
  moppVencimento?: string;
  moppDocumentoUrl?: string;
  mopp?: "Feito" | "Pendente";
  toxicologicoVencimento?: string;
  toxicologicoDocumentoUrl?: string;
  toxicologico?: "Feito" | "Pendente";
  fichaEpiVencimento?: string;
  fichaEpiDocumentoUrl?: string;
  documentoPessoalVencimento?: string;
  documentoPessoalDocumentoUrl?: string;
  documentoPessoal?: "Feito" | "Pendente";
  comprovanteVencimento?: string;
  comprovanteDocumentoUrl?: string;
  comprovante?: "Feito" | "Pendente";
  fotoVencimento?: string;
  fotoDocumentoUrl?: string;
  foto?: "Feito" | "Pendente";
  motoristaPreferencialId?: string;
  motoristasVinculadosIds?: string[];
  
  // Financial integration fields
  identificador_unico_financeiro?: string;
  statusFinanceiro?: string;
  dataCriacaoContaFinanceira?: string;
}

export interface Veiculo {
  id: string; // Corresponds to plate usually
  placa: string;
  modelo: string;
  marca: string;
  ano: number;
  renavam: string;
  perfil: "Truck" | "Carreta" | "Toco" | "VUC" | "Van" | "3/4" | "Utilitário";
  tipo: "Frota Própria" | "Terceiro";
  status: "Liberado" | "Bloqueado" | "Pendente";
  motivoBloqueio?: string;
  documentoCRVUrl?: string;
  licenciamentoUrl?: string;
  seguroUrl?: string;
  licenciamentoVencimento: string;
  seguroVencimento: string;
  motoristaId?: string; // Linked driver
  unidadeId: string;
  prefixo?: string;
  documentoCRLVUrl?: string;
  fotoVeiculoUrl?: string;
  ultimaTrocaOleo?: string;
  proximaManutencao?: string;
  ultimaRevisao?: string;
  documentacaoStatus?: "Completa" | "Pendente";
  motoristaPreferencialId?: string;
  identificador_unico_financeiro?: string;
  statusFinanceiro?: string;
  dataCriacaoContaFinanceira?: string;

  // Phase 10 additions
  chassi?: string;
  combustivel?: string;
  capacidade?: string;
  antt?: string;
  anttVencimento?: string;
  anttUrl?: string;
  documentacaoObservacoes?: string;
}

export interface Disponibilidade {
  id: string;
  data: string; // YYYY-MM-DD
  veiculoId: string;
  unidadeId: string;
  prioridade: "Alta" | "Média" | "Baixa";
  motoristaId: string;
  roteirizado: boolean;
}

export interface DisponibilidadeDiaria {
  id: string;
  data_disponibilidade: string;
  unidade_id: string;
  veiculo_id: string;
  motorista_id: string;
  prioridade: "Alta" | "Média" | "Baixa";
  created_at: string;
  updated_at: string;
}

export interface NotaFiscal {
  id: string;
  dtId: string;
  numero: string;
  valor: number;
  cliente: string;
}

export interface StatusLogEntry {
  data: string;
  hora: string;
  status: string;
  usuario: string;
}

export interface OccurrenceEntry {
  id: string;
  tipo: string;
  descricao: string;
  data: string;
  hora: string;
  usuario: string;
}

export interface ChangeLogEntry {
  data: string;
  hora: string;
  usuario: string;
  campo: string;
  antes: string;
  depois: string;
}

export interface Rota {
  id: string; // DT Number
  dt: string;
  data: string; // YYYY-MM-DD
  unidadeId: string;
  veiculoId: string;
  motoristaId: string;
  ajudantesIds?: string[];
  equipeSugeridaIds?: string[];
  equipeUtilizadaIds?: string[];
  tipo: "Entrega" | "Recarga" | "Reentrega" | "Entrega OFF";
  status: "Aguardando carregamento" | "Em carregamento" | "Em rota" | "Em descarga" | "Finalizada";
  status_viagem?: string;
  historico_status?: StatusLogEntry[];
  totalEntregas: number;
  entregues: number;
  devolucoes: number;
  recusadas?: number;
  dataPrevista?: string;
  observacoes_operacionais?: string;
  ocorrencias?: OccurrenceEntry[];
  log_alteracoes?: ChangeLogEntry[];
  
  // Entrega OFF specific fields
  clienteCodigo?: string;
  clienteNome?: string;
  clienteCNPJ?: string;
  clienteEndereco?: string;
  clienteCidade?: string;
  clienteUF?: string;
  qtdNF?: number;
  valorTotalEntrega?: number;
  qtdVolumes?: number;
  observacoesEntrega?: string;
}

export interface EntregaOffNF {
  id: string;
  entrega_off_id: string;
  numero_nf: string;
  valor_nf: number;
}

export interface EntregaOff {
  id: string;
  dt: string;
  cliente: string;
  endereco: string;
  veiculoId: string;
  motoristaId: string;
  data: string;
  tipo_operacao: string;
  qtd_nfs: number;
  valor_total: number;
  status_entrega: string;
  unidadeId?: string;
  placa?: string;
  cidade?: string;
  horario?: string;
  observacoes?: string;
  qtd_volumes?: number;
  qtd_entregues?: number;
  qtd_pendente?: number;
  qtd_recusada?: number;
  qtd_devolvida?: number;
  ocorrencias?: OccurrenceEntry[];
  log_alteracoes?: ChangeLogEntry[];
  anexos?: { id: string; nome: string; url: string; tipo: string; data: string }[];
}

export interface Descarga {
  id: string;
  dt: string;
  placa: string;
  motoristaNome: string;
  valorDescarga: number;
  reciboUrl?: string;
  data: string;
  unidadeId?: string;
}

export interface Manutencao {
  id: string;
  veiculoId: string;
  tipo: "Preventiva" | "Corretiva";
  data: string;
  observacao: string;
  fotoUrl?: string;
  proximaManutencao: string;
  unidadeId?: string;
  placa?: string;
  categoria?: string;
  quilometragemAtual?: number;
  proximaQuilometragem?: number;
  valorManutencao?: number;
  oficina?: string;
  fornecedor?: string;
  responsavel?: string;
  checklist: {
    oleo: boolean;
    filtro: boolean;
    freios: boolean;
    pneus: boolean;
    rodas: boolean;
    suspensao: boolean;
    amortecedores: boolean;
    etiquetas: boolean;
    eletrica: boolean;
    motor: boolean;
    lanternas: boolean;
  };
}

export interface Abastecimento {
  id: string;
  veiculoId: string;
  placa: string;
  data: string; // YYYY-MM-DD
  motoristaId: string;
  motoristaNome?: string;
  litros: number;
  valor: number;
  posto: string;
  combustivel: string;
  odometro: number;
  observacoes?: string;
  unidadeId?: string;
  created_at?: string;
}

export interface EstoqueEpi {
  id: string; // Item name
  nome: string;
  saldo: number;
  unidadeId?: string;
  codigo?: string;
  categoria?: string;
  fabricante?: string;
  ca?: string;
  tamanho?: string;
  unidadeMedida?: string;
  quantidadeInicial?: number;
  estoqueMinimo?: number;
  valorUnitario?: number;
  dataCompra?: string;
  fornecedor?: string;
  observacoes?: string;
}

export interface MovimentacaoEpi {
  id: string;
  recebedorNome: string;
  motoristaId?: string;
  itemEpi: string;
  quantidade: number;
  tipo: "Saída" | "Entrada" | "Devolução" | "Perda" | "Ajuste";
  data: string;
  hora?: string;
  usuario?: string;
  motivo?: string;
  unidadeId?: string;
}

export interface Auditoria {
  id: string;
  usuario: string;
  data: string; // YYYY-MM-DD
  hora: string; // HH:MM:SS
  acao: string;
  detalhes: string;
  unidade?: string;
  ip?: string;
}

export interface Alerta {
  id: string;
  tipo: "CNH" | "ASO" | "Licenciamento" | "Seguro" | "Manutenção";
  refId: string; // ID of the driver, vehicle, etc.
  mensagem: string;
  severidade: "Crítica" | "Atenção";
  status: "Ativo" | "Resolvido";
  dataCriacao: string;
}

export interface UsuarioUnidadePermissao {
  id: string;
  usuario_id: string;
  unidade_id: string;
  ativo: boolean;
  created_at: string;
}

export interface ProcessoAnexo {
  id: string;
  nome: string;
  url: string;
  tipo: string;
  data: string;
  usuario: string;
}

export interface Processo {
  id: string;
  titulo: string;
  categoria: string;
  descricao: string;
  unidadeId: string;
  prioridade: "Baixa" | "Média" | "Alta" | "Crítica";
  dataInicio: string;
  dataLimite: string;
  responsavel: string;
  participantes: string[];
  status: string;
  tags: string[];
  observacoes: string;
  anexos: ProcessoAnexo[];
  unidadesCompartilhadas: string[];
  criadoPor: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ProcessoComentario {
  id: string;
  processoId: string;
  usuario: string;
  usuarioNome: string;
  texto: string;
  data: string;
  mencoes?: string[];
}

export interface ProcessoHistorico {
  id: string;
  processoId: string;
  usuario: string;
  acao: string;
  detalhes: string;
  data: string;
}

export interface ProcessoNotificacao {
  id: string;
  usuarioId: string;
  titulo: string;
  mensagem: string;
  processoId: string;
  lida: boolean;
  data: string;
}

export interface ProcessoCategoria {
  id: string;
  nome: string;
  criadoPor?: string;
  criadoEm?: string;
}

export interface ProcessoColuna {
  id: string;
  nome: string;
  ordem: number;
  unidadeId?: string;
}

export interface MovimentacaoFinanceira {
  id: string;
  pessoaId: string;
  data: string; // YYYY-MM-DD
  hora: string; // HH:MM:SS
  tipo: "Crédito" | "Débito";
  origem: string; // Frete, Diária, Descarga, Bonificação, Acerto, Pagamento manual, Vale, Combustível, Pedágio, Multa, Desconto, Adiantamento, Reembolso, Estorno, Outros
  valor: number;
  observacao?: string;
  saldoAnterior: number;
  saldoPosterior: number;
  usuario: string;
  dtId?: string;
  descargaId?: string;
  valeId?: string;
  estornado?: boolean;
  criadoEm: string;
}

export interface DatabaseSchema {
  usuarios: Usuario[];
  unidades: Unidade[];
  motoristas: Motorista[];
  veiculos: Veiculo[];
  disponibilidade: Disponibilidade[];
  disponibilidade_diaria: DisponibilidadeDiaria[];
  rotas: Rota[];
  notas_fiscais: NotaFiscal[];
  entregas_off: EntregaOff[];
  entregas_off_nfs: EntregaOffNF[];
  descargas: Descarga[];
  manutencoes: Manutencao[];
  estoque_epi: EstoqueEpi[];
  movimentacao_epi: MovimentacaoEpi[];
  auditoria: Auditoria[];
  alertas: Alerta[];
  usuario_unidade_permissao: UsuarioUnidadePermissao[];
  processos: Processo[];
  processo_categorias: ProcessoCategoria[];
  processo_colunas: ProcessoColuna[];
  processo_comentarios: ProcessoComentario[];
  processo_historico: ProcessoHistorico[];
  processo_notificacoes: ProcessoNotificacao[];
  vales: any[];
  fechamentos_dt: any[];
  movimentacoes_financeiras?: MovimentacaoFinanceira[];
  fechamentos_semanais?: any[];
  noshows?: any[];
  historico_documentos?: DocumentoHistorico[];
  contas_a_receber?: any[];
  contas_a_pagar?: any[];
  abastecimentos?: Abastecimento[];
  devolucoes_clientes?: any[];
  devolucoes_motoristas?: any[];
  devolucoes_hierarquia?: any[];
  devolucoes_motivos?: any[];
  devolucoes_registros?: any[];
}

const DEFAULT_UNIDADES: Unidade[] = [
  {
    id: "un-go",
    nome: "Goiânia - Matriz",
    codigo: "AMPLA-GO01",
    cidade: "Goiânia",
    estado: "GO",
    endereco: "Av. Perimetral Norte, 3000 - Setor Industrial, Goiânia - GO",
    status: "ativo",
    supervisor: "Marcos Araujo",
    usuarioResponsavel: "marcos.go",
    created_at: "2026-06-14T12:00:00.000Z",
    updated_at: "2026-06-14T12:00:00.000Z"
  }
];

const DEFAULT_ESTOQUE: EstoqueEpi[] = [
  { id: "botina", nome: "Botina de Segurança", saldo: 0 },
  { id: "casquete", nome: "Casquete", saldo: 0 },
  { id: "capa_chuva", nome: "Capa de Chuva", saldo: 0 },
  { id: "luvas", nome: "Luvas de Vaqueta/Grip", saldo: 0 },
  { id: "cones", nome: "Cones de Sinalização", saldo: 0 },
  { id: "calcos", nome: "Calços de Pneu", saldo: 0 },
  { id: "oculos", nome: "Óculos de Proteção", saldo: 0 },
  { id: "colete", nome: "Colete Refletivo", saldo: 0 },
  { id: "mangote", nome: "Mangote Anticorte", saldo: 0 },
];

export const DEFAULT_CATEGORIES: ProcessoCategoria[] = [
  { id: "cat-agregacao", nome: "Agregação de Motorista" },
  { id: "cat-contratacao", nome: "Contratação" },
  { id: "cat-rh", nome: "RH" },
  { id: "cat-operacao", nome: "Operação" },
  { id: "cat-seguranca", nome: "Segurança" },
  { id: "cat-frota", nome: "Frota" },
  { id: "cat-manutencao", nome: "Manutenção" },
  { id: "cat-financeiro", nome: "Financeiro" },
  { id: "cat-compras", nome: "Compras" },
  { id: "cat-auditoria", nome: "Auditoria" },
  { id: "cat-projetos", nome: "Projetos" },
  { id: "cat-outros", nome: "Outros" }
];

export const DEFAULT_COLUMNS: ProcessoColuna[] = [
  { id: "novo", nome: "📥 Novo", ordem: 1 },
  { id: "em_andamento", nome: "🔄 Em Andamento", ordem: 2 },
  { id: "aguardando", nome: "⏳ Aguardando", ordem: 3 },
  { id: "em_analise", nome: "👀 Em Análise", ordem: 4 },
  { id: "pendente", nome: "⚠ Pendente", ordem: 5 },
  { id: "concluido", nome: "✅ Concluído", ordem: 6 },
  { id: "cancelado", nome: "❌ Cancelado", ordem: 7 }
];

const INITIAL_DATABASE: DatabaseSchema = {
  usuarios: [
    { id: "usr-lucas-amplalog", email: "Lucas.amplalog", nome: "Lucas (Master)", perfil: "admin_master", unidadeId: "Todas", status: "ativo", senha: "Lucas.amplalog2026", deveAlterarSenha: false },
    { id: "usr-lucas", email: "lucas.miranda", nome: "Lucas Miranda", perfil: "admin_master", unidadeId: "Todas", status: "ativo", senha: "MasterPassword", deveAlterarSenha: false },
    { id: "usr-atupirama", email: "adciadsetatupirama@gmail.com", nome: "Supervisor Geral", perfil: "admin_master", unidadeId: "Todas", status: "ativo", senha: "Atupirama@2026", deveAlterarSenha: false },
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
  abastecimentos: [],
  devolucoes_clientes: [],
  devolucoes_motoristas: [],
  devolucoes_hierarquia: [],
  devolucoes_motivos: [
    { id: "Y40", codigo: "Y40", descricao: "PDV Fechado" },
    { id: "Y16", codigo: "Y16", descricao: "Local de entrega inexistente" },
    { id: "Y69", codigo: "Y69", descricao: "Endereço divergente" },
    { id: "Y07", codigo: "Y07", descricao: "Cliente ausente" },
    { id: "Y12", codigo: "Y12", descricao: "Recusa por preço divergente" },
    { id: "Y15", codigo: "Y15", descricao: "Avaria no transporte" },
    { id: "Y22", codigo: "Y22", descricao: "Falta de espaço físico" }
  ],
  devolucoes_registros: [],
};

export class FileDatabase {
  private static cache: DatabaseSchema | null = null;
  private static isSupabaseConnected: boolean = false;
  private static connectionError: string | null = null;
  private static schemaVariant: "new" | "old" = "old";
  public static pendingWrites: Promise<void>[] = [];

  public static isSupabaseConfigured(): boolean {
    return !!supabase;
  }

  public static getSupabaseStatus(): { configured: boolean; connected: boolean; error: string | null } {
    return {
      configured: !!supabase,
      connected: this.isSupabaseConnected,
      error: this.connectionError
    };
  }

  public static async bootstrap(): Promise<void> {
    console.log("[FileDatabase DIAGNOSTICS] bootstrap() started.");
    console.log("[FileDatabase DIAGNOSTICS] Local File cache base load initiated.");
    // 1. Always load the local file database as our base cache
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
      // 2. Fetch all collections from Supabase single table starting with the active variant
      let data: any[] | null = null;
      let success = false;
      let primaryErrorMsg = "";

      if (this.schemaVariant === "old") {
        const res = await supabase
          .from("ampla_database")
          .select("key, value");

        if (res.error) {
          primaryErrorMsg = res.error.message;
        } else {
          data = res.data?.map((row: any) => ({
            chave: row.key,
            valor: row.value
          })) || [];
          success = true;
        }
      } else {
        const res = await supabase
          .from("ampla_database")
          .select("chave, valor");

        if (res.error) {
          primaryErrorMsg = res.error.message;
        } else {
          data = res.data || [];
          success = true;
        }
      }

      // If the primary variant failed, quietly try the alternative format
      if (!success) {
        const altVariant = this.schemaVariant === "old" ? "new" : "old";
        console.log(`[FileDatabase] Current preferred variant '${this.schemaVariant}' check resulted in: ${primaryErrorMsg}. Trying alternative '${altVariant}'...`);
        
        if (altVariant === "old") {
          const resOld = await supabase
            .from("ampla_database")
            .select("key, value");

          if (!resOld.error) {
            this.schemaVariant = "old";
            data = resOld.data?.map((row: any) => ({
              chave: row.key,
              valor: row.value
            })) || [];
            success = true;
          } else {
            this.isSupabaseConnected = false;
            this.connectionError = resOld.error.message;
            console.log(`[FileDatabase] Supabase connection is offline or restricted (e.g. exceed_egress_quota). Falling back to local offline JSON database. Reason: ${resOld.error.message}`);
            return;
          }
        } else {
          const resNew = await supabase
            .from("ampla_database")
            .select("chave, valor");

          if (!resNew.error) {
            this.schemaVariant = "new";
            data = resNew.data || [];
            success = true;
          } else {
            this.isSupabaseConnected = false;
            this.connectionError = resNew.error.message;
            console.log(`[FileDatabase] Supabase connection is offline or restricted (e.g. exceed_egress_quota). Falling back to local offline JSON database. Reason: ${resNew.error.message}`);
            return;
          }
        }
      }

      this.isSupabaseConnected = true;
      this.connectionError = null;
      console.log(`[FileDatabase] Supabase connection successful! Fetched active keys (format: '${this.schemaVariant}'):`, data?.map(r => r.chave));

      // 3. Merge Supabase data into our cache and seed missing keys back to Supabase
      const fetchedKeys = new Set<string>();
      if (data && data.length > 0) {
        for (const row of data) {
          const key = row.chave as keyof DatabaseSchema;
          const val = row.valor;
          if (key && val && this.cache) {
            (this.cache as any)[key] = val;
            fetchedKeys.add(key);
          }
        }
        console.log("[FileDatabase] Local cache synchronized with active Supabase records. Keys fetched:", Array.from(fetchedKeys));
      }

      // Check if any keys from this.cache are missing on Supabase, and write them to Supabase
      if (this.cache) {
        const missingKeys: string[] = [];
        for (const key of Object.keys(this.cache)) {
          if (key === "alertas") continue; // alerts are processed dynamically
          if (!fetchedKeys.has(key)) {
            missingKeys.push(key);
            // Async write to Supabase to seed this key
            await this.asyncWriteToSupabase(key, (this.cache as any)[key]);
          }
        }
        if (missingKeys.length > 0) {
          console.log("[FileDatabase] Seeding missing keys to Supabase:", missingKeys);
        }
      }
    } catch (err: any) {
      this.isSupabaseConnected = false;
      this.connectionError = err.message || String(err);
      console.error("[FileDatabase] Error during Supabase bootstrap:", err);
    }

    this.recalculateAlerts(this.cache);
  }

  private static async syncAllToSupabase(): Promise<void> {
    if (!supabase || !this.cache) return;
    try {
      console.log("[FileDatabase] Syncing all keys to Supabase using variant:", this.schemaVariant);
      const promises = Object.keys(this.cache).map(async (key) => {
        if (key === "alertas") return; // alerts are computed dynamically
        const val = (this.cache as any)[key];
        const payload = this.schemaVariant === "new" 
          ? { chave: key, valor: val }
          : { key: key, value: val };

        const { error } = await supabase
          .from("ampla_database")
          .upsert(payload as any);
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

  public static async asyncWriteToSupabase(key: string, value: any): Promise<void> {
    const promise = (async () => {
      if (!supabase) return;
      if (!this.isSupabaseConnected) {
        // Skip attempting Supabase writes if we are in local offline mode
        return;
      }
      try {
        const payload = this.schemaVariant === "new"
          ? { chave: key, valor: value }
          : { key: key, value: value };

        const { error } = await supabase
          .from("ampla_database")
          .upsert(payload as any);

        if (error) {
          console.warn(`[FileDatabase] Async write warning for key '${key}':`, error.message);
          let recoverySucceeded = false;
          
          // Dynamic Recovery: If it fails because of missing/unrecognized columns, we can try the alternative variant!
          if (error.message && (
            error.message.includes("column") || 
            error.message.includes("chave") || 
            error.message.includes("valor") ||
            error.message.includes("key") ||
            error.message.includes("value")
          )) {
            const alternativeVariant = this.schemaVariant === "new" ? "old" : "new";
            console.log(`[FileDatabase] Attempting recovery write for key '${key}' using alternative schema variant: ${alternativeVariant}`);
            
            const recoveryPayload = alternativeVariant === "new"
              ? { chave: key, valor: value }
              : { key: key, value: value };
              
            const { error: recoveryError } = await supabase
              .from("ampla_database")
              .upsert(recoveryPayload as any);
              
            if (!recoveryError) {
              console.log(`[FileDatabase] Recovery write succeeded! Switching active schema variant to: ${alternativeVariant}`);
              this.schemaVariant = alternativeVariant;
              this.isSupabaseConnected = true;
              this.connectionError = null;
              recoverySucceeded = true;
            } else {
              console.log(`[FileDatabase] Recovery write also failed for key '${key}':`, recoveryError.message);
            }
          }

          if (!recoverySucceeded) {
            this.isSupabaseConnected = false;
            this.connectionError = error.message;
            console.log(`[FileDatabase] Gracefully falling back to local file storage only for key '${key}' due to Supabase write restriction.`);
          }
        } else {
          this.isSupabaseConnected = true;
          this.connectionError = null;
        }
      } catch (err: any) {
        console.log(`[FileDatabase] Async write exception for key '${key}':`, err.message || err);
        this.isSupabaseConnected = false;
        this.connectionError = err.message || String(err);
      }
    })();

    this.pendingWrites.push(promise);
    promise.finally(() => {
      this.pendingWrites = this.pendingWrites.filter(p => p !== promise);
    }).catch(() => {
      // Catch unhandled rejection for background promise
    });
  }

  private static readLocalFile(): DatabaseSchema {
    try {
      if (!fs.existsSync(DB_FILE)) {
        this.writeLocalFile(INITIAL_DATABASE);
        return INITIAL_DATABASE;
      }
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      // Ensure all standard tables exist
      const schema = { ...INITIAL_DATABASE, ...parsed };
      
      let updated = false;
 
      // Ensure vales and fechamentos_dt are initialized as arrays
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
 
      if (!schema.devolucoes_clientes) {
        schema.devolucoes_clientes = [];
        updated = true;
      }
      if (!schema.devolucoes_motoristas) {
        schema.devolucoes_motoristas = [];
        updated = true;
      }
      if (!schema.devolucoes_hierarquia) {
        schema.devolucoes_hierarquia = [];
        updated = true;
      }
      if (!schema.devolucoes_motivos || schema.devolucoes_motivos.length === 0) {
        schema.devolucoes_motivos = INITIAL_DATABASE.devolucoes_motivos;
        updated = true;
      }
      if (!schema.devolucoes_registros) {
        schema.devolucoes_registros = [];
        updated = true;
      }
 
      // Ensure "CDA MINAS GERAIS" unit exists
      if (!schema.unidades) {
        schema.unidades = [];
      }
      if (!schema.unidades.some((u: any) => u.nome?.toUpperCase() === "CDA MINAS GERAIS" || u.id === "un-cda-minas-gerais-4650")) {
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        updated = true;
      }
 
      // Ensure "Gabriela" user exists for CDA MINAS GERAIS
      if (!schema.usuarios) {
        schema.usuarios = [];
      }
      if (!schema.usuarios.some((u: any) => u.email?.toLowerCase() === "gabriela" || u.id === "usr-Gabriela")) {
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
      
      // Backfill old entregas_off records
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
      schema.entregas_off = (schema.entregas_off || []).map((e: any) => {
        if (e.tipo_operacao === undefined) {
          e.tipo_operacao = "Entrega Extralimite";
          e.qtd_nfs = e.qtd_nfs || 1;
          e.valor_total = e.valor_total || 500.0;
          e.status_entrega = e.status_entrega || "Finalizada";
          const hasNfs = schema.entregas_off_nfs.some((n: any) => n.entrega_off_id === e.id);
          if (!hasNfs) {
            schema.entregas_off_nfs.push({
              id: `nf-off-bk-${e.id}`,
              entrega_off_id: e.id,
              numero_nf: "45091",
              valor_nf: 500.0
            });
          }
          backfilled = true;
        }
        return e;
      });

      // Automatically migrate old entregas_off records to rotas (Registro de DT)
      const oldOffs = schema.entregas_off || [];
      if (oldOffs.length > 0) {
        schema.rotas = schema.rotas || [];
        oldOffs.forEach((e: any) => {
          const dtVal = e.dt || "";
          const targetId = `DT-${dtVal}` || e.id;
          
          // Check if already exists in rotas
          const exists = schema.rotas.some((r: any) => r.dt === dtVal || r.id === targetId);
          if (!exists) {
            // Map status_entrega to Rota status
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
            
            // Map NFs from entregas_off_nfs
            const nfsForThisOff = (schema.entregas_off_nfs || []).filter((nf: any) => nf.entrega_off_id === e.id);
            const qtdNf = nfsForThisOff.length || e.qtd_nfs || 1;
            const valorTotal = nfsForThisOff.reduce((acc: number, nf: any) => acc + (Number(nf.valor_nf) || 0), 0) || e.valor_total || 0;

            const migratedRoute: any = {
              id: targetId,
              dt: dtVal,
              data: e.data || new Date().toISOString().split("T")[0],
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
              clienteUF: "GO", // default
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

      // Backfill missing protocols in fechamentos_dt (AMPLA v2.2)
      const fechamentos = schema.fechamentos_dt || [];
      let maxProtocolNum = 10540;
      
      // First find the max existing protocol
      fechamentos.forEach((c: any) => {
        if (c.protocoloFechamento && c.protocoloFechamento !== "N/A") {
          const pNum = parseInt(c.protocoloFechamento, 10);
          if (!isNaN(pNum) && pNum > maxProtocolNum) {
            maxProtocolNum = pNum;
          }
        }
        if (c.historicoFechamentos) {
          c.historicoFechamentos.forEach((h: any) => {
            if (h.protocolo && h.protocolo !== "N/A") {
              const pNum = parseInt(h.protocolo, 10);
              if (!isNaN(pNum) && pNum > maxProtocolNum) {
                maxProtocolNum = pNum;
              }
            }
          });
        }
      });

      // Now fill in any missing ones
      fechamentos.forEach((c: any) => {
        if (!c.protocoloFechamento || c.protocoloFechamento === "N/A") {
          maxProtocolNum++;
          const nextProtocol = String(maxProtocolNum).padStart(5, "0");
          c.protocoloFechamento = nextProtocol;
          
          if (!c.dataFechamento) {
            c.dataFechamento = new Date().toISOString().split("T")[0];
          }
          if (!c.horaFechamento) {
            c.horaFechamento = new Date().toTimeString().split(" ")[0];
          }
          if (!c.usuarioFechamento) {
            c.usuarioFechamento = c.usuarioResponsavel || "sistema";
          }
          
          // Ensure first history item matches or is created
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
            // Update the first FECHAMENTO event's protocol if missing
            const firstClose = c.historicoFechamentos.find((h: any) => h.acao === "FECHAMENTO");
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
            nome: "Goiânia - Matriz",
            codigo: "AMPLA-GO01",
            cidade: "Goiânia",
            estado: "GO",
            endereco: "Av. Perimetral Norte, 3000 - Setor Industrial, Goiânia - GO",
            status: "ativo",
            supervisor: "Marcos Araujo",
            usuarioResponsavel: "marcos.go",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
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

  private static read(): DatabaseSchema {
    if (this.cache) {
      return this.cache;
    }
    const db = this.readLocalFile();
    let changed = false;
    if (db.motoristas) {
      db.motoristas = db.motoristas.map(m => {
        let updatedItem = false;
        if (!m.tipo) {
          m.tipo = "Motorista";
          updatedItem = true;
        }
        if (!m.identificador_unico_financeiro) {
          const sanitizedId = m.id.toUpperCase().replace(/[^A-Z0-9]/g, "");
          m.identificador_unico_financeiro = `FIN-${sanitizedId || "PES"}-${Math.floor(100000 + Math.random() * 900000)}`;
          m.statusFinanceiro = "Ativo";
          m.dataCriacaoContaFinanceira = new Date().toISOString().split("T")[0];
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

  private static writeLocalFile(data: DatabaseSchema) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to write to database file", e);
    }
  }

  public static write(data: DatabaseSchema) {
    this.cache = data;
    this.writeLocalFile(data);
  }

  public static get<K extends keyof DatabaseSchema>(key: K): DatabaseSchema[K] {
    const db = this.read();
    if (key === "alertas" || key === "motoristas") {
      this.recalculateAlerts(db);
    }
    return db[key];
  }

  public static getFull(): DatabaseSchema {
    const db = this.read();
    this.recalculateAlerts(db);
    return db;
  }

  public static set<K extends keyof DatabaseSchema>(key: K, value: DatabaseSchema[K]) {
    const db = this.read();
    db[key] = value as any;
    this.write(db);

    if (key === "alertas") return;
    this.asyncWriteToSupabase(key, value);
  }

  public static add<K extends keyof DatabaseSchema>(key: K, item: any, operatorEmail: string = "offline") {
    const db = this.read();
    const array = db[key] as any[];
    
    if (!item.id) {
      item.id = `${key.slice(0, 3)}-${Date.now()}`;
    }
    
    array.push(item);
    
    this.audit(db, operatorEmail, `CREATE_${key.toUpperCase()}`, `Adicionado registro no módulo ${key} com ID ${item.id}`, item);
    this.write(db);
    
    this.asyncWriteToSupabase(key, db[key]);
    this.asyncWriteToSupabase("auditoria", db.auditoria);
    return item;
  }

  public static update<K extends keyof DatabaseSchema>(key: K, id: string, updatedFields: any, operatorEmail: string = "offline") {
    const db = this.read();
    const array = db[key] as any[];
    const idx = array.findIndex((x) => x.id === id || (x.placa && x.placa === id));
    if (idx !== -1) {
      array[idx] = { ...array[idx], ...updatedFields };
      this.audit(db, operatorEmail, `UPDATE_${key.toUpperCase()}`, `Atualizado registro no módulo ${key} com ID ${id}`, updatedFields);
      this.write(db);
      
      this.asyncWriteToSupabase(key, db[key]);
      this.asyncWriteToSupabase("auditoria", db.auditoria);
      return array[idx];
    }
    return null;
  }

  public static delete<K extends keyof DatabaseSchema>(key: K, id: string, operatorEmail: string = "offline") {
    const db = this.read();
    const array = db[key] as any[];
    const idx = array.findIndex((x) => 
      (x.id && typeof x.id === "string" && x.id.toLowerCase() === id.toLowerCase()) || 
      x.id === id || 
      (x.placa && typeof x.placa === "string" && x.placa.toLowerCase() === id.toLowerCase()) || 
      x.placa === id
    );
    if (idx !== -1) {
      const removed = array.splice(idx, 1)[0];
      this.audit(db, operatorEmail, `DELETE_${key.toUpperCase()}`, `Removido registro no módulo ${key} com ID ${id}`, removed);
      this.write(db);
      
      this.asyncWriteToSupabase(key, db[key]);
      this.asyncWriteToSupabase("auditoria", db.auditoria);
      return true;
    }
    return false;
  }

  private static audit(db: DatabaseSchema, user: string, action: string, details: string, data: any = null, unidade: string = "", ip: string = "127.0.0.1") {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().split(" ")[0];
    const log: Auditoria = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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

  public static logAudit(user: string, action: string, details: string, unidade: string = "", ip: string = "127.0.0.1") {
    const db = this.read();
    this.audit(db, user, action, details, null, unidade, ip);
    this.write(db);
    this.asyncWriteToSupabase("auditoria", db.auditoria);
  }


  public static computeDriverStatus(m: Motorista): "LIBERADO" | "PENDENTE" | "BLOQUEADO" {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isMotorista = m.tipo === "Motorista" || !m.tipo;

    const diffInDays = (d1: string) => {
      const date1 = new Date(d1);
      const d1Midnight = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const diffTime = d1Midnight.getTime() - todayMidnight.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const cnhDays = (isMotorista && m.cnhVencimento) ? diffInDays(m.cnhVencimento) : null;
    const asoDays = m.asoVencimento ? diffInDays(m.asoVencimento) : null;
    const toxDays = (isMotorista && m.toxicologicoVencimento) ? diffInDays(m.toxicologicoVencimento) : null;
    const moppDays = (isMotorista && m.moppVencimento) ? diffInDays(m.moppVencimento) : null;
    const intDays = m.integracaoVencimento ? diffInDays(m.integracaoVencimento) : null;

    const isCnhExpired = cnhDays !== null && cnhDays < 0;
    const isAsoExpired = asoDays !== null && asoDays < 0;
    const isToxExpired = toxDays !== null && toxDays < 0;
    const isMoppExpired = moppDays !== null && moppDays < 0;
    const isIntExpired = intDays !== null && intDays < 0;
    const isPesquisaReprovada = m.pesquisa === "Reprovada";

    const formatarDataBr = (val?: string) => {
      if (!val) return "";
      const parts = val.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return val;
    };

    const reasons: string[] = [];
    if (isCnhExpired) {
      reasons.push(`CNH vencida em ${formatarDataBr(m.cnhVencimento)}`);
    }
    if (isAsoExpired) {
      reasons.push(`ASO vencido em ${formatarDataBr(m.asoVencimento)}`);
    }
    if (isToxExpired) {
      reasons.push(`Exame Toxicológico vencido em ${formatarDataBr(m.toxicologicoVencimento)}`);
    }
    if (isMoppExpired) {
      reasons.push(`Curso MOPP vencido em ${formatarDataBr(m.moppVencimento)}`);
    }
    if (isIntExpired) {
      reasons.push(`Integração vencida em ${formatarDataBr(m.integracaoVencimento)}`);
    }
    if (isPesquisaReprovada) {
      reasons.push("Pesquisa GR reprovada");
    }

    if (reasons.length > 0) {
      m.motivoBloqueio = "BLOQUEADO — " + reasons.join(", ") + ".";
      m.statusFinal = "BLOQUEADO";
      m.statusConformidade = "BLOQUEADO";
      return "BLOQUEADO";
    }

    m.motivoBloqueio = undefined;

    // Check if any required field is Pendente
    const hasPendente =
      (isMotorista && (!m.cnhVencimento || m.cnhVencimento === "Pendente")) ||
      (!m.asoVencimento || m.asoVencimento === "Pendente") ||
      m.integracao === "Pendente" ||
      m.pesquisa === "Pendente" ||
      m.aso === "Pendente" ||
      m.fichaEpi === "Pendente";

    const statusObj: "LIBERADO" | "PENDENTE" = hasPendente ? "PENDENTE" : "LIBERADO";
    m.statusFinal = statusObj;

    // Calculate dynamic statusConformidade based on days left:
    // 🟠 Entre 1 e 15 dias -> CRÍTICO
    // 🟡 Entre 16 e 30 dias -> ATENÇÃO
    // 🟢 Mais de 30 dias -> APTO
    const activeDays: number[] = [];
    if (cnhDays !== null) activeDays.push(cnhDays);
    if (asoDays !== null) activeDays.push(asoDays);
    if (toxDays !== null) activeDays.push(toxDays);
    if (moppDays !== null) activeDays.push(moppDays);
    if (intDays !== null) activeDays.push(intDays);

    let finalConformidade: "APTO" | "ATENÇÃO" | "CRÍTICO" = "APTO";
    if (activeDays.length > 0) {
      const minDays = Math.min(...activeDays);
      if (minDays >= 1 && minDays <= 15) {
        finalConformidade = "CRÍTICO";
      } else if (minDays >= 16 && minDays <= 30) {
        finalConformidade = "ATENÇÃO";
      }
    }
    m.statusConformidade = finalConformidade;

    return statusObj;
  }

  // Check expirations and append alerts dynamically
  public static recalculateAlerts(db: DatabaseSchema) {
    const now = new Date();
    const alertList: Alerta[] = [];

    // Helper to calc difference in days
    const diffInDays = (d1: string) => {
      const date1 = new Date(d1);
      const diffTime = date1.getTime() - now.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // Evaluate motoristas: CNH, ASO, Toxicológico, MOPP, Integração
    db.motoristas.forEach((mot) => {
      // Set computed statusFinal automatically
      mot.statusFinal = FileDatabase.computeDriverStatus(mot);

      const isMotorista = mot.tipo === "Motorista" || !mot.tipo;

      // CNH (only for motoristas)
      if (isMotorista && mot.cnhVencimento) {
        const cnhDays = diffInDays(mot.cnhVencimento);
        if (cnhDays < 0) {
          alertList.push({
            id: `al-cnh-v-${mot.id}`,
            tipo: "CNH",
            refId: mot.id,
            mensagem: `CNH do motorista ${mot.nome} está VENCIDA (${mot.cnhVencimento})`,
            severidade: "Crítica",
            status: "Ativo",
            dataCriacao: now.toISOString().split("T")[0],
          });
        } else if (cnhDays <= 30) {
          alertList.push({
            id: `al-cnh-w-${mot.id}`,
            tipo: "CNH",
            refId: mot.id,
            mensagem: `CNH do motorista ${mot.nome} vence em ${cnhDays} dias (${mot.cnhVencimento})`,
            severidade: "Atenção",
            status: "Ativo",
            dataCriacao: now.toISOString().split("T")[0],
          });
        }
      }

      // ASO (all roles)
      if (mot.asoVencimento) {
        const asoDays = diffInDays(mot.asoVencimento);
        if (asoDays < 0) {
          alertList.push({
            id: `al-aso-v-${mot.id}`,
            tipo: "ASO",
            refId: mot.id,
            mensagem: `ASO do profissional ${mot.nome} está VENCIDO (${mot.asoVencimento})`,
            severidade: "Crítica",
            status: "Ativo",
            dataCriacao: now.toISOString().split("T")[0],
          });
        } else if (asoDays <= 15) {
          alertList.push({
            id: `al-aso-w-${mot.id}`,
            tipo: "ASO",
            refId: mot.id,
            mensagem: `ASO do profissional ${mot.nome} vence em ${asoDays} dias (${mot.asoVencimento})`,
            severidade: "Atenção",
            status: "Ativo",
            dataCriacao: now.toISOString().split("T")[0],
          });
        }
      }

      // Toxicológico (only for motoristas)
      if (isMotorista && mot.toxicologicoVencimento) {
        const toxDays = diffInDays(mot.toxicologicoVencimento);
        if (toxDays < 0) {
          alertList.push({
            id: `al-tox-v-${mot.id}`,
            tipo: "CNH",
            refId: mot.id,
            mensagem: `Exame Toxicológico do motorista ${mot.nome} está VENCIDO (${mot.toxicologicoVencimento})`,
            severidade: "Crítica",
            status: "Ativo",
            dataCriacao: now.toISOString().split("T")[0],
          });
        } else if (toxDays <= 30) {
          alertList.push({
            id: `al-tox-w-${mot.id}`,
            tipo: "CNH",
            refId: mot.id,
            mensagem: `Exame Toxicológico do motorista ${mot.nome} vence em ${toxDays} dias (${mot.toxicologicoVencimento})`,
            severidade: "Atenção",
            status: "Ativo",
            dataCriacao: now.toISOString().split("T")[0],
          });
        }
      }

      // Curso MOPP (only for motoristas)
      if (isMotorista && mot.moppVencimento) {
        const moppDays = diffInDays(mot.moppVencimento);
        if (moppDays < 0) {
          alertList.push({
            id: `al-mopp-v-${mot.id}`,
            tipo: "CNH",
            refId: mot.id,
            mensagem: `Curso MOPP do motorista ${mot.nome} está VENCIDO (${mot.moppVencimento})`,
            severidade: "Crítica",
            status: "Ativo",
            dataCriacao: now.toISOString().split("T")[0],
          });
        } else if (moppDays <= 30) {
          alertList.push({
            id: `al-mopp-w-${mot.id}`,
            tipo: "CNH",
            refId: mot.id,
            mensagem: `Curso MOPP do motorista ${mot.nome} vence em ${moppDays} dias (${mot.moppVencimento})`,
            severidade: "Atenção",
            status: "Ativo",
            dataCriacao: now.toISOString().split("T")[0],
          });
        }
      }

      // Integração
      if (mot.integracaoVencimento) {
        const intDays = diffInDays(mot.integracaoVencimento);
        if (intDays < 0) {
          alertList.push({
            id: `al-int-v-${mot.id}`,
            tipo: "CNH",
            refId: mot.id,
            mensagem: `Integração do profissional ${mot.nome} está VENCIDA (${mot.integracaoVencimento})`,
            severidade: "Crítica",
            status: "Ativo",
            dataCriacao: now.toISOString().split("T")[0],
          });
        } else if (intDays <= 15) {
          alertList.push({
            id: `al-int-w-${mot.id}`,
            tipo: "CNH",
            refId: mot.id,
            mensagem: `Integração do profissional ${mot.nome} vence em ${intDays} dias (${mot.integracaoVencimento})`,
            severidade: "Atenção",
            status: "Ativo",
            dataCriacao: now.toISOString().split("T")[0],
          });
        }
      }

      // Pesquisa GR status check
      if (mot.pesquisa === "Reprovada") {
        alertList.push({
          id: `al-pesq-rep-${mot.id}`,
          tipo: "CNH",
          refId: mot.id,
          mensagem: `Pesquisa GR de ${mot.nome} foi REPROVADA!`,
          severidade: "Crítica",
          status: "Ativo",
          dataCriacao: now.toISOString().split("T")[0],
        });
      }
    });

    // Evaluate veiculos: Licenciamento, Seguro, Manutencao
    db.veiculos.forEach((v) => {
      const licDays = diffInDays(v.licenciamentoVencimento);
      if (licDays < 0) {
        alertList.push({
          id: `al-lic-v-${v.placa}`,
          tipo: "Licenciamento",
          refId: v.placa,
          mensagem: `Licenciamento do veículo ${v.placa} (${v.modelo}) está VENCID0 (${v.licenciamentoVencimento})`,
          severidade: "Crítica",
          status: "Ativo",
          dataCriacao: now.toISOString().split("T")[0],
        });
      } else if (licDays <= 30) {
        alertList.push({
          id: `al-lic-w-${v.placa}`,
          tipo: "Licenciamento",
          refId: v.placa,
          mensagem: `Licenciamento do veículo ${v.placa} vence em ${licDays} dias (${v.licenciamentoVencimento})`,
          severidade: "Atenção",
          status: "Ativo",
          dataCriacao: now.toISOString().split("T")[0],
        });
      }

      const segDays = diffInDays(v.seguroVencimento);
      if (segDays < 0) {
        alertList.push({
          id: `al-seg-v-${v.placa}`,
          tipo: "Seguro",
          refId: v.placa,
          mensagem: `Seguro do veículo ${v.placa} está VENCIDO (${v.seguroVencimento})`,
          severidade: "Crítica",
          status: "Ativo",
          dataCriacao: now.toISOString().split("T")[0],
        });
      } else if (segDays <= 30) {
        alertList.push({
          id: `al-seg-w-${v.placa}`,
          tipo: "Seguro",
          refId: v.placa,
          mensagem: `Seguro do veículo ${v.placa} vence em ${segDays} dias (${v.seguroVencimento})`,
          severidade: "Atenção",
          status: "Ativo",
          dataCriacao: now.toISOString().split("T")[0],
        });
      }
    });

    // Evaluate Manutencao
    db.manutencoes.forEach((m) => {
      const manDays = diffInDays(m.proximaManutencao);
      if (manDays < 0) {
        alertList.push({
          id: `al-man-v-${m.id}`,
          tipo: "Manutenção",
          refId: m.veiculoId,
          mensagem: `Próxima manutenção programada para o veículo ${m.veiculoId} está ATRASADA desde ${m.proximaManutencao}`,
          severidade: "Crítica",
          status: "Ativo",
          dataCriacao: now.toISOString().split("T")[0],
        });
      } else if (manDays <= 7) {
        alertList.push({
          id: `al-man-w-${m.id}`,
          tipo: "Manutenção",
          refId: m.veiculoId,
          mensagem: `Manutenção programada para o veículo ${m.veiculoId} vence em ${manDays} dias (${m.proximaManutencao})`,
          severidade: "Atenção",
          status: "Ativo",
          dataCriacao: now.toISOString().split("T")[0],
        });
      }
    });

    db.alertas = alertList;
  }
}
