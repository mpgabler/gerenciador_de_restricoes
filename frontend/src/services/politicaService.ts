import api from './api';

export interface PoliticaRiscoDTO {
  id: string;
  versao: string;
  tetoInadimplencia: number;
  diasAtrasoMaximo: number;
  vigenciaInicio: string; // ISO String
  vigenciaFim?: string | null;
  justificativa: string;
  criadoPor: string;
  ativo: boolean;
}

export interface NovaPoliticaRiscoInput {
  tetoInadimplencia: number;
  diasAtrasoMaximo: number;
  justificativa: string;
  criadoPor: string;
}

export const politicaService = {
  async listarTodas(): Promise<PoliticaRiscoDTO[]> {
    const { data } = await api.get<PoliticaRiscoDTO[]>('/politicas-risco');
    return data;
  },

  async obterVigente(): Promise<PoliticaRiscoDTO> {
    const { data } = await api.get<PoliticaRiscoDTO>('/politicas-risco/vigente');
    return data;
  },

  async cadastrarNovaVersao(dados: NovaPoliticaRiscoInput): Promise<PoliticaRiscoDTO> {
    const { data } = await api.post<PoliticaRiscoDTO>('/politicas-risco', dados);
    return data;
  },
};