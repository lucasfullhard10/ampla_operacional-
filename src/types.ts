export interface Usuario {
  id: string;
  email: string;
  nome: string;
  perfil: "admin_master" | "admin_unidade" | "operador";
  unidadeId: string;
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

export interface UsuarioUnidadePermissao {
  id: string;
  usuario_id: string;
  unidade_id: string;
  ativo: boolean;
  created_at: string;
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

export interface Motorista {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  unidadeId: string;
  cnhVencimento: string;
  asoVencimento: string;
  integracao: "Feito" | "Pendente";
  pesquisa: "Feito" | "Pendente";
  aso: "Feito" | "Pendente";
  fichaEpi: "Feito" | "Pendente";
  statusFinal: "LIBERADO" | "PENDENTE" | "BLOQUEADO";
  cnhDocumentoUrl?: string;
  asoDocumentoUrl?: string;
}

export interface Veiculo {
  id: string;
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
  motoristaId?: string;
  unidadeId: string;
  prefixo?: string;
  documentoCRLVUrl?: string;
  fotoVeiculoUrl?: string;
  ultimaTrocaOleo?: string;
  proximaManutencao?: string;
  ultimaRevisao?: string;
  documentacaoStatus?: "Completa" | "Pendente";
}

export interface Disponibilidade {
  id: string;
  data: string;
  veiculoId: string;
  unidadeId: string;
  prioridade: "Alta" | "Média" | "Baixa";
  motoristaId: string;
  roteirizado: boolean;
  motivoOciosidade?: string;
}

export interface DisponibilidadeDiaria {
  id: string;
  data_disponibilidade: string; // Format: DD/MM/AAAA or YYYY-MM-DD
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
  id: string;
  dt: string;
  data: string;
  unidadeId: string;
  veiculoId: string;
  motoristaId: string;
  tipo: "Entrega" | "Recarga" | "Reentrega";
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
  nfs?: EntregaOffNF[];
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
  tipoTaxa?: string;
  local?: string;
  observacoes?: string;
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

export interface EstoqueEpi {
  id: string;
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
  data: string;
  hora: string;
  acao: string;
  detalhes: string;
}

export interface Alerta {
  id: string;
  tipo: "CNH" | "ASO" | "Licenciamento" | "Seguro" | "Manutenção";
  refId: string;
  mensagem: string;
  severidade: "Crítica" | "Atenção";
  status: "Ativo" | "Resolvido";
  dataCriacao: string;
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

