import api from './api';

/**
 * Representa os dados completos de uma versão da Política de Risco de Crédito.
 * Suporta o histórico temporal do sistema, permitindo a aplicação do
 * princípio da irretroatividade normativa nas validações de transações.
 */
export interface PoliticaRiscoDTO {
  /** Identificador único da política (UUID) */
  id: string;
  /** Identificador de versão da política (ex.: "v1.0", "v1.12") */
  versao: string;
  /** Limite monetário máximo tolerado de inadimplência acumulada para liberação de crédito */
  tetoInadimplencia: number;
  /** Prazo máximo tolerado de dias em atraso antes do bloqueio automático */
  diasAtrasoMaximo: number;
  /** Data/hora de início de vigência desta versão normativa (formato ISO-8601) */
  vigenciaInicio: string; // ISO String
  /** Data/hora de término da vigência; nulo caso seja a versão atualmente ativa */
  vigenciaFim?: string | null;
  /** Justificativa técnica, mercadológica ou regulatória para a criação/alteração dos parâmetros */
  justificativa: string;
  /** Identificação do operador/analista responsável pela publicação da versão */
  criadoPor: string;
  /** Flag que indica se esta política é a versão normativa atualmente vigente */
  ativo: boolean;
}

/**
 * Parâmetros de entrada necessários para publicação de uma nova versão da política de risco.
 * A vigência da política anterior é encerrada e a nova versão é versionada automaticamente pelo backend.
 */
export interface NovaPoliticaRiscoInput {
  /** Novo teto de inadimplência permitido */
  tetoInadimplencia: number;
  /** Novo limite máximo de tolerância de dias em mora */
  diasAtrasoMaximo: number;
  /** Justificativa do ajuste dos parâmetros */
  justificativa: string;
  /** Identificador ou e-mail do autor da alteração */
  criadoPor: string;
}

/**
 * Serviço de comunicação com o módulo de Gestão de Políticas de Risco (`/politicas-risco`).
 * Provê métodos para auditoria histórica e atualização de parâmetros de concessão de crédito.
 */
export const politicaService = {
  /**
   * Recupera o histórico cronológico de todas as versões de políticas já cadastradas.
   * Utilizado para auditoria temporal e verificação retroativa de fatos geradores.
   * Rota: GET /politicas-risco
   */
  async listarTodas(): Promise<PoliticaRiscoDTO[]> {
    const { data } = await api.get<PoliticaRiscoDTO[]>('/politicas-risco');
    return data;
  },

  /**
   * Obtém a versão ativa da política de risco em vigor no momento atual.
   * Rota: GET /politicas-risco/vigente
   */
  async obterVigente(): Promise<PoliticaRiscoDTO> {
    const { data } = await api.get<PoliticaRiscoDTO>('/politicas-risco/vigente');
    return data;
  },

  /**
   * Registra uma nova versão dos parâmetros normativos.
   * O backend encerra a vigência da regra anterior (`vigenciaFim`) e inicia a vigência imediata da nova versão.
   * Rota: POST /politicas-risco
   * @param dados Parâmetros configurados e justificativa técnica
   */
  async cadastrarNovaVersao(dados: NovaPoliticaRiscoInput): Promise<PoliticaRiscoDTO> {
    const { data } = await api.post<PoliticaRiscoDTO>('/politicas-risco', dados);
    return data;
  },
};