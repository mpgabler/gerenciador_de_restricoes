import api from './api';

/**
 * Parâmetros de entrada para o registro de um novo apontamento restritivo.
 * Espelha o contrato esperado pelo backend (RestricaoRequestDTO no Spring Boot).
 */
export interface RestricaoRequestDTO {
  /** Identificador único (UUID) do cliente ao qual a restrição será vinculada */
  clienteId: string;
  /** Código categórico da restrição (ex.: 'INADIMPLENCIA', 'FRAUDE', 'BLOQUEIO_JUDICIAL') */
  tipoRestricaoCodigo: string;
  /** Valor monetário nominal associado à pendência financeira */
  valor: number;
  /** Data do fato gerador do apontamento (formato ISO-8601: YYYY-MM-DD), essencial para o corte temporal normativo */
  dataOcorrencia: string;
}

/**
 * Representação completa de um apontamento restritivo retornado pela API.
 * Consolida o estado cadastral, descrições associadas e ciclo de vida da pendência.
 */
export interface RestricaoResponseDTO {
  /** Identificador único do registro (UUID) */
  id: string;
  /** Identificador do cliente titular da ocorrência */
  clienteId: string;
  /** Nome ou razão social do cliente no momento da consulta */
  clienteNome: string;
  /** Código abreviado do tipo de restrição */
  tipoCodigo: string;
  /** Descrição detalhada do tipo de restrição */
  tipoDescricao: string;
  /** Valor monetário pendente ou original da restrição */
  valor: number;
  /** Data de registro original da ocorrência */
  dataOcorrencia: string;
  /** Situação atual do apontamento: ATIVA (impeditiva) ou BAIXADA (regularizada/liquidada) */
  status: 'ATIVA' | 'BAIXADA';
  /** Carimbo de data/hora da baixa, caso a restrição tenha sido liquidada */
  dataBaixa?: string;
  /** Carimbo de data/hora de criação do registro no banco de dados */
  criadoEm?: string;
}

/**
 * Serviço de comunicação com o endpoint de Restrições (`/restricoes`).
 * Gerencia inclusão, consultas (diretas ou filtradas) e encerramento de ocorrências.
 */
export const restricaoService = {
  /**
   * Obtém todas as restrições cadastradas na base.
   * Suporta respostas tanto em formato de lista direta (`Array`) quanto paginada pelo Spring Data (`Page.content`).
   * Rota: GET /restricoes
   */
  listarTodas: async (): Promise<RestricaoResponseDTO[]> => {
    const response = await api.get('/restricoes');
    if (Array.isArray(response.data)) return response.data;
    if (response.data && Array.isArray(response.data.content)) return response.data.content;
    return [];
  },

  /**
   * Recupera o histórico de ocorrências associadas a um cliente específico via query parameter.
   * Contém normalização defensiva para respostas simples ou paginadas.
   * Rota: GET /restricoes?clienteId={clienteId}
   * @param clienteId Identificador UUID do cliente
   */
  listarPorCliente: async (clienteId: string): Promise<RestricaoResponseDTO[]> => {
    const response = await api.get(`/restricoes?clienteId=${clienteId}`);
    if (Array.isArray(response.data)) return response.data;
    if (response.data && Array.isArray(response.data.content)) return response.data.content;
    return [];
  },

  /**
   * Registra um novo apontamento restritivo no prontuário do cliente.
   * Rota: POST /restricoes
   * @param dados Informações de cadastro da ocorrência
   */
  criar: async (dados: RestricaoRequestDTO): Promise<RestricaoResponseDTO> => {
    const response = await api.post('/restricoes', dados);
    return response.data;
  },

  /**
   * Executa a regularização/liquidação do apontamento, alterando seu status para 'BAIXADA'.
   * Rota: PATCH /restricoes/{id}/baixa
   * @param id Identificador UUID da restrição a ser baixada
   */
  darBaixa: async (id: string): Promise<void> => {
    await api.patch(`/restricoes/${id}/baixa`);
  },
};