import api from './api';

/**
 * Representa a entidade de domínio Cliente retornada pela API do backend.
 * Contém o identificador único gerado, os dados cadastrais completos,
 * endereço estruturado e o status atual no sistema.
 */
export interface Cliente {
  id: string;
  nome: string;
  documento: string; // CPF (11 dígitos) ou CNPJ (14 caracteres)
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
  status?: string; // Ex.: 'ATIVO', 'INATIVO'
}

/**
 * Data Transfer Object (DTO) para envio de dados na criação ou atualização de cliente.
 * Espelha o contrato de entrada esperado pelo backend (ClienteRequestDTO no Spring Boot),
 * permitindo valores nulos para campos opcionais não preenchidos.
 */
export interface ClienteRequestDTO {
  nome: string;
  documento: string; // Sanitizado (apenas caracteres alfanuméricos)
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

/**
 * Serviço de integração com o endpoint REST de Clientes (`/clientes`).
 * Centraliza as operações de CRUD consumindo a instância configurada do Axios.
 */
export const clienteService = {
  /**
   * Recupera a listagem completa de todos os clientes cadastrados.
   * Rota: GET /clientes
   */
  listarTodos: async (): Promise<Cliente[]> => {
    const response = await api.get('/clientes');
    return response.data;
  },

  /**
   * Busca um cliente específico a partir do seu identificador único (UUID).
   * Rota: GET /clientes/{id}
   * @param id Identificador do cliente
   */
  buscarPorId: async (id: string): Promise<Cliente> => {
    const response = await api.get(`/clientes/${id}`);
    return response.data;
  },

  /**
   * Envia a requisição para cadastrar um novo proponente/cliente na base.
   * Rota: POST /clientes
   * @param dados Payload com os dados do cliente
   */
  criar: async (dados: ClienteRequestDTO): Promise<Cliente> => {
    const response = await api.post('/clientes', dados);
    return response.data;
  },

  /**
   * Atualiza os dados cadastrais de um cliente existente.
   * Rota: PUT /clientes/{id}
   * @param id Identificador do cliente a ser atualizado
   * @param dados Payload com os dados atualizados
   */
  atualizar: async (id: string, dados: ClienteRequestDTO): Promise<Cliente> => {
    const response = await api.put(`/clientes/${id}`, dados);
    return response.data;
  },

  /**
   * Executa a exclusão (ou desativação/soft-delete) do cadastro de um cliente.
   * Rota: DELETE /clientes/{id}
   * @param id Identificador do cliente a ser removido
   */
  excluir: async (id: string): Promise<void> => {
    await api.delete(`/clientes/${id}`);
  },
};