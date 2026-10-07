import axios from 'axios';
import type { Cliente, Restricao, DecisaoTransacao, NovaRestricaoPayload } from '../types';

const api = axios.create({
  baseURL: 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const clienteService = {
  listar: async () => (await api.get<Cliente[]>('/clientes')).data,
  buscarPorId: async (id: string) => (await api.get<Cliente>(`/clientes/${id}`)).data,
};

export const restricaoService = {
  listarTodas: async () => (await api.get<Restricao[]>('/restricoes')).data,
  listarPorCliente: async (clienteId: string) => 
    (await api.get<Restricao[]>(`/restricoes?clienteId=${clienteId}`)).data,
  criar: async (payload: NovaRestricaoPayload) => 
    (await api.post<Restricao>('/restricoes', payload)).data,
  darBaixa: async (id: string) => 
    (await api.patch<Restricao>(`/restricoes/${id}/baixa`)).data,
};

export const motorService = {
  avaliar: async (clienteId: string) => 
    (await api.get<DecisaoTransacao>(`/valida-transacao/${clienteId}`)).data,
};

export default api;