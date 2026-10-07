export type TipoPessoa = 'PF' | 'PJ';
export type StatusCliente = 'ATIVO' | 'INATIVO';
export type StatusRestricao = 'ATIVA' | 'BAIXADA';

export interface Cliente {
  id: string;
  nome: string;
  documento: string;
  tipoPessoa: TipoPessoa;
  status: StatusCliente;
  dataCriacao: string;
}

export interface Restricao {
  id: string;
  clienteId: string;
  clienteNome: string;
  tipoCodigo: string;
  tipoDescricao: string;
  valor: number;
  dataOcorrencia: string;
  status: StatusRestricao;
  dataBaixa: string | null;
  criadoEm: string;
}

export interface DecisaoTransacao {
  clienteId: string;
  clienteNome: string;
  documento: string;
  status: 'LIBERADO' | 'BLOQUEADO';
  motivos: string[];
  dataAvaliacao: string;
}

export interface NovaRestricaoPayload {
  clienteId: string;
  tipoRestricaoCodigo: string;
  valor: number;
  dataOcorrencia: string;
}