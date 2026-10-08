import api from './api';

export interface Cliente {
  id: string;
  nome: string;
  documento: string;
  tipoPessoa: 'PF' | 'PJ';
  email?: string;
  telefone?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  status?: string;
}

export interface ClienteRequestDTO {
  nome: string;
  documento: string;
  tipoPessoa: 'PF' | 'PJ';
  email?: string | null;
  telefone?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
}

export const clienteService = {
  listarTodos: async (): Promise<Cliente[]> => {
    const response = await api.get('/clientes');
    return response.data;
  },

  buscarPorId: async (id: string): Promise<Cliente> => {
    const response = await api.get(`/clientes/${id}`);
    return response.data;
  },

  criar: async (dados: ClienteRequestDTO): Promise<Cliente> => {
    const response = await api.post('/clientes', dados);
    return response.data;
  },

  atualizar: async (id: string, dados: ClienteRequestDTO): Promise<Cliente> => {
    const response = await api.put(`/clientes/${id}`, dados);
    return response.data;
  },

  excluir: async (id: string): Promise<void> => {
    await api.delete(`/clientes/${id}`);
  },
};