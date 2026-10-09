import React, { useState, useEffect, useMemo } from 'react';
import { clienteService, type Cliente } from '../services/clienteService';
import { ModalCliente, formatarTelefone } from '../components/modals/ModalCliente';

interface ClientesPageProps {
  onAvaliarCliente: (clienteId: string) => void;
}

export const formatarCpfCnpj = (valor: string): string => {
  const limpo = (valor || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 14);
  const temLetra = /[A-Z]/.test(limpo);

  if (!temLetra && limpo.length <= 11) {
    return limpo
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')       .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  return limpo
    .replace(/^([A-Z0-9]{2})([A-Z0-9])/, '$1.$2')
    .replace(/^([A-Z0-9]{2})\.([A-Z0-9]{3})([A-Z0-9])/, '$1.$2.$3')
    .replace(/\.([A-Z0-9]{3})([A-Z0-9])/, '.$1/$2')     .replace(/\/([A-Z0-9]{4})([A-Z0-9]{1,2})$/, '$1-$2');
};

export const formatarEnderecoCompleto = (c: Cliente): string => {
  const partes: string[] = [];

  if (c.logradouro) {
    const logradouroNumero = c.numero ? `${c.logradouro}, ${c.numero}` : c.logradouro;
    partes.push(logradouroNumero);
  }

  if (c.complemento) {
    partes.push(c.complemento);
  }

  if (c.bairro) {
    partes.push(c.bairro);
  }

  if (c.cidade) {
    partes.push(c.uf ? `${c.cidade}/${c.uf}` : c.cidade);
  }

  if (c.cep) {
    const cepFormatado = c.cep.replace(/\D/g, '').replace(/^(\d{5})(\d{3})$/, '$1-$2');
    partes.push(`CEP: ${cepFormatado}`);
  }

  return partes.length > 0 ? partes.join(' - ') : '—';
};

export const ClientesPage: React.FC<ClientesPageProps> = ({ onAvaliarCliente }) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteEmEdicao, setClienteEmEdicao] = useState<Cliente | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    carregarClientes();
  }, []);

  const carregarClientes = async () => {
    setCarregando(true);
    try {
      const data = await clienteService.listarTodos();

      // Normalização defensiva: suporta array direto ou Page<T> (data.content)
      const lista: Cliente[] = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.content)
        ? (data as any).content
        : [];

      setClientes(lista);
    } catch (e) {
      console.error('Falha ao listar clientes:', e);
      setClientes([]);
    } finally {
      setCarregando(false);
    }
  };

  const lidarComMudancaBusca = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    const pareceDocumento = /^\d/.test(valor) || (/\d/.test(valor) && !valor.includes(' '));

    if (pareceDocumento) {
      const caracteresLimpos = valor.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 14);
      setBusca(formatarCpfCnpj(caracteresLimpos));
    } else {
      setBusca(valor);
    }
  };

  const clientesFiltrados = useMemo(() => {
    const baseSegura = Array.isArray(clientes) ? clientes : [];
    const termo = busca.trim().toLowerCase();

    if (!termo) return baseSegura;

    const termoAlfanumerico = busca.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const termoNumerico = busca.replace(/\D/g, '');

    return baseSegura.filter((c) => {
      if (!c) return false;

      const nomeMatch = (c.nome || '').toLowerCase().includes(termo);
      const emailMatch = (c.email || '').toLowerCase().includes(termo);

      // Busca por telefone (com ou sem máscara)
      const telDigitos = (c.telefone || '').replace(/\D/g, '');
      const telMatch = termoNumerico.length > 0 && telDigitos.includes(termoNumerico);

      // Busca por documento (CPF ou CNPJ Alfanumérico)
      const docLimpo = (c.documento || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const docFormatado = formatarCpfCnpj(c.documento || '').toLowerCase();
      const docMatch =
        (termoAlfanumerico.length > 0 && docLimpo.includes(termoAlfanumerico)) ||
        (c.documento || '').toLowerCase().includes(termo) ||
        docFormatado.includes(termo);

      // Busca por endereço estruturado (logradouro, bairro, cidade, CEP)
      const enderecoMontado = formatarEnderecoCompleto(c).toLowerCase();
      const enderecoMatch = enderecoMontado.includes(termo);

      return nomeMatch || emailMatch || telMatch || docMatch || enderecoMatch;
    });
  }, [clientes, busca]);

  return (
    <div className="space-y-6 font-sans">
      <section className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {/* CABEÇALHO */}
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-left">
            <h3 className="font-poppins text-base font-bold text-slate-800 tracking-tight">
              Gestão de Clientes & Proponentes
            </h3>
            <p className="text-sm text-slate-500">
              Total:{' '}
              <strong className="text-[#081c30] font-semibold">
                {Array.isArray(clientes) ? clientes.length : 0}
              </strong>{' '}
              clientes cadastrados.
            </p>
          </div>
          <button
            onClick={() => {
              setClienteEmEdicao(null);
              setModalAberto(true);
            }}
            className="px-4 py-2 bg-[#004b87] hover:bg-[#003a6b] text-white font-poppins font-medium text-sm rounded-lg transition-colors flex items-center gap-2 self-start sm:self-auto shadow-xs active:scale-[0.99]"
          >
            <svg className="w-4 h-4 text-[#009ee3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Novo Cliente
          </button>
        </div>

        {/* BARRA DE PESQUISA */}
        <div className="p-4 bg-slate-50/60 border-b border-slate-200 text-left">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              value={busca}
              onChange={lidarComMudancaBusca}
              placeholder="Buscar por nome, documento, contato ou cidade..."
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] transition-all font-sans"
            />
            <div className="absolute left-3 top-2.5 text-slate-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                title="Limpar busca"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* TABELA DE CLIENTES */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5 font-poppins">Nome / Razão Social</th>
                <th className="px-6 py-3.5 font-poppins">Documento</th>
                <th className="px-6 py-3.5 font-poppins">Canais de Contato</th>
                <th className="px-6 py-3.5 font-poppins">Endereço Residencial/Comercial</th>
                <th className="px-6 py-3.5 text-right font-poppins">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {carregando ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-[#004b87] border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p className="text-xs font-medium">Carregando clientes...</p>
                  </td>
                </tr>
              ) : clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-sans">
                    Nenhum cliente encontrado {busca ? `para "${busca}"` : ''}.
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((c) => {
                  const telFormatado = formatarTelefone(c.telefone || '');
                  const telApenasDigitos = (c.telefone || '').replace(/\D/g, '');
                  const enderecoExibicao = formatarEnderecoCompleto(c);

                  return (
                    <tr key={c.id} className="hover:bg-[#e8f3fa]/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{c.nome}</div>
                        <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-semibold bg-[#e8f3fa] text-[#004b87] rounded border border-[#004b87]/20">
                          {c.tipoPessoa || (c.documento?.length > 11 ? 'PJ' : 'PF')}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-700 font-mono text-xs">
                        {formatarCpfCnpj(c.documento)}
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {c.telefone ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-semibold text-slate-800">{telFormatado}</span>
                              <a
                                href={`https://wa.me/55${telApenasDigitos}?text=Ol%C3%A1%2C%20aqui%20%C3%A9%20do%20Bantestes.%20Gostar%C3%ADamos%20de%20conversar%20sobre%20condi%C3%A7%C3%B5es%20especiais%20de%20renegocia%C3%A7%C3%A3o.`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-[#00874c] border border-emerald-300 rounded text-[10px] font-semibold inline-flex items-center gap-0.5"
                                title="Abrir conversa no WhatsApp"
                              >
                                WhatsApp
                              </a>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                          <div className="text-xs text-slate-500 truncate max-w-[200px]" title={c.email || ''}>
                            {c.email || '—'}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-600 max-w-[260px] truncate" title={enderecoExibicao}>
                        {enderecoExibicao}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onAvaliarCliente(c.id)}
                            className="px-3 py-1.5 bg-[#e8f3fa] hover:bg-[#004b87] text-[#004b87] hover:text-white border border-[#004b87]/30 font-medium text-xs rounded-lg transition-all duration-150 inline-flex items-center gap-1.5 shadow-2xs font-sans"
                            title="Avaliar Risco Transacional"
                          >
                            Avaliar Risco
                            <svg className="w-3.5 h-3.5 text-[#009ee3]" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setClienteEmEdicao(c);
                              setModalAberto(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-[#004b87] hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                            title="Editar Dados, Contatos e Endereço"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ModalCliente
        aberto={modalAberto}
        clienteParaEditar={clienteEmEdicao}
        onFechar={() => {
          setModalAberto(false);
          setClienteEmEdicao(null);
        }}
        onSucesso={() => carregarClientes()}
      />
    </div>
  );
};