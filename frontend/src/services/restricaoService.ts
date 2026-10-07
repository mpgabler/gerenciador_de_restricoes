import api from './api';

export interface RestricaoRequestDTO {
  clienteId: string;
  tipoRestricaoCodigo: string;
  valor: number;
  dataOcorrencia: string;
}

export interface RestricaoResponseDTO {
  id: string;
  clienteId: string;
  clienteNome: string;
  tipoCodigo: string;
  tipoDescricao: string;
  valor: number;
  dataOcorrencia: string;
  status: 'ATIVA' | 'BAIXADA';
  dataBaixa?: string;
  criadoEm?: string;
}

export const restricaoService = {
  listarTodas: async (): Promise<RestricaoResponseDTO[]> => {
    const response = await api.get('/restricoes');
    if (Array.isArray(response.data)) return response.data;
    if (response.data && Array.isArray(response.data.content)) return response.data.content;
    return [];
  },

  listarPorCliente: async (clienteId: string): Promise<RestricaoResponseDTO[]> => {
    const response = await api.get(`/restricoes?clienteId=${clienteId}`);
    if (Array.isArray(response.data)) return response.data;
    if (response.data && Array.isArray(response.data.content)) return response.data.content;
    return [];
  },

  criar: async (dados: RestricaoRequestDTO): Promise<RestricaoResponseDTO> => {
    const response = await api.post('/restricoes', dados);
    return response.data;
  },

  darBaixa: async (id: string): Promise<void> => {
    await api.patch(`/restricoes/${id}/baixa`);
  },
};