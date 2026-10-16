import api from './api';

/**
 * Representa o parecer emitido pelo motor de decisão de risco de crédito.
 * Consolida o veredito final, os dados cadastrais do cliente avaliado,
 * o carimbo temporal de auditoria e a lista de justificativas técnicas/normativas.
 */
export interface ParecerDecisao {
  /** Identificador único (UUID) do proponente avaliado */
  clienteId: string;
  /** Nome ou razão social do cliente no momento da avaliação */
  clienteNome: string;
  /** Documento identificador (CPF ou CNPJ) */
  documento: string;
  /** Veredito categórico retornado pelas regras de negócio */
  status: 'LIBERADO' | 'BLOQUEADO';
  /** Relação de motivos de impedimento ou pareceres de conformidade */
  motivos: string[];
  /** Carimbo de data/hora (ISO-8601) em que a análise de risco foi processada */
  dataAvaliacao: string;
  /** Propriedade booleana derivada para facilitar a renderização condicional na interface */
  bloqueado: boolean;
}

/**
 * Serviço de comunicação com o motor de análise e concessão de crédito do backend.
 */
export const motorService = {
  /**
   * Envia uma requisição para auditar o perfil de risco do proponente contra
   * as políticas de crédito e apontamentos restritivos ativos.
   * 
   * Rota: GET /valida-transacao/{clienteId}
   * 
   * @param clienteId Identificador UUID do cliente a ser avaliado
   * @returns Parecer formatado contendo o veredito e as justificativas
   */
  avaliar: async (clienteId: string): Promise<ParecerDecisao> => {
    const response = await api.get(`/valida-transacao/${clienteId}`);
    const data = response.data;

    // Mapeia a resposta da API e normaliza os campos para consumo seguro no React
    return {
      clienteId: data.clienteId,
      clienteNome: data.clienteNome,
      documento: data.documento,
      status: data.status,
      // Garante que 'motivos' seja sempre um array iterável, evitando erros de runtime
      motivos: Array.isArray(data.motivos) ? data.motivos : [],
      dataAvaliacao: data.dataAvaliacao,
      // Computa a flag booleana a partir do status da resposta
      bloqueado: data.status === 'BLOQUEADO',
    };
  },
};