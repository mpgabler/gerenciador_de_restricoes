import axios from 'axios';

/**
 * Instância centralizada do cliente HTTP Axios.
 * Configura o endereço base do backend Spring Boot (porta 8080)
 * e os cabeçalhos padrão para troca de mensagens JSON.
 */
export const api = axios.create({
  baseURL: 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // Timeout defensivo de 10 segundos
});

// Interceptor para padronização ou tratamento global de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Tratamento de falhas de rede ou indisponibilidade do backend
    if (!error.response) {
      console.error('Falha de rede ou backend indisponível:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;