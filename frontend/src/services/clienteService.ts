import api from './api';

export interface Cliente {
  id: string;
  nome: string;
  documento: string;
  tipoPessoa?: 'PF' | 'PJ';
  email?: string;
}

export const clienteService = {
  listarTodos: async (): Promise<Cliente[]> => {
    const response = await api.get('/clientes');
    // Se for Page<Cliente>, extrai .content; se for List<Cliente>, usa o array direto
    if (Array.isArray(response.data)) {
      return response.data;
    }
    if (response.data && Array.isArray(response.data.content)) {
      return response.data.content;
    }
    return [];
  },

  criar: async (dados: Omit<Cliente, 'id'>): Promise<Cliente> => {
    const response = await api.post('/clientes', dados);
    return response.data;
  },
};