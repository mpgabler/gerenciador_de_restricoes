import api from './api';

export interface ParecerDecisao {
  clienteId: string;
  clienteNome: string;
  documento: string;
  status: 'LIBERADO' | 'BLOQUEADO';
  motivos: string[];
  dataAvaliacao: string;
  bloqueado: boolean; // Flag calculada para controle no React
}

export const motorService = {
  avaliar: async (clienteId: string): Promise<ParecerDecisao> => {
    const response = await api.get(`/valida-transacao/${clienteId}`);
    const data = response.data;

    return {
      clienteId: data.clienteId,
      clienteNome: data.clienteNome,
      documento: data.documento,
      status: data.status,
      motivos: Array.isArray(data.motivos) ? data.motivos : [],
      dataAvaliacao: data.dataAvaliacao,
      bloqueado: data.status === 'BLOQUEADO',
    };
  },
};