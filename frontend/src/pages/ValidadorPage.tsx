import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ModalNovaRestricao } from '../components/modals/ModalNovaRestricao';
import { motorService, type ParecerDecisao } from '../services/motorService';
import { restricaoService, type RestricaoResponseDTO } from '../services/restricaoService';
import { clienteService, type Cliente } from '../services/clienteService';

interface ValidadorPageProps {
  clienteIdInicial?: string | null;
}

export const ValidadorPage: React.FC<ValidadorPageProps> = ({ clienteIdInicial }) => {
  const [clientesBase, setClientesBase] = useState<Cliente[]>([]);
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [dropdownAberto, setDropdownAberto] = useState<boolean>(false);
  const [clienteAtual, setClienteAtual] = useState<Cliente | null>(null);
  const [decisao, setDecisao] = useState<ParecerDecisao | null>(null);
  const [restricoes, setRestricoes] = useState<RestricaoResponseDTO[]>([]);
  const [carregando, setCarregando] = useState<boolean>(false);
  const [modalRestricaoAberto, setModalRestricaoAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    carregarClientesIniciais();
  }, [clienteIdInicial]);

  // Fecha o dropdown ao clicar fora do componente
  useEffect(() => {
    const handleClickFora = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  const carregarClientesIniciais = async () => {
    try {
      const data = await clienteService.listarTodos();
      const lista: Cliente[] = Array.isArray(data) ? data : [];
      setClientesBase(lista);

      // Só processa automaticamente se vier de um clique explícito (clienteIdInicial)
      if (clienteIdInicial && lista.length > 0) {
        const clienteAlvo = lista.find((c) => c.id === clienteIdInicial);
        if (clienteAlvo) {
          selecionarEProcessarCliente(clienteAlvo, true);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar lista de clientes:', e);
      setClientesBase([]);
    }
  };

  // Avaliação sob demanda: pesquisa ativa apenas a partir de 2 caracteres
  const sugestoesClientes = useMemo(() => {
    const termo = termoBusca.trim().toLowerCase();
    if (termo.length < 2) return [];

    const digitos = termoBusca.replace(/\D/g, '');

    return clientesBase
      .filter((c) => {
        const matchNome = (c.nome || '').toLowerCase().includes(termo);
        const docDigitos = (c.documento || '').replace(/\D/g, '');
        const matchDoc =
          (c.documento || '').toLowerCase().includes(termo) ||
          (digitos.length > 0 && docDigitos.includes(digitos));
        return matchNome || matchDoc;
      })
      .slice(0, 6);
  }, [clientesBase, termoBusca]);

  const selecionarEProcessarCliente = async (cliente: Cliente, atualizarTexto: boolean = true) => {
    setClienteAtual(cliente);
    if (atualizarTexto) {
      setTermoBusca(`${cliente.nome} (${cliente.documento})`);
    }
    setDropdownAberto(false);
    setErro(null);
    setCarregando(true);

    try {
      const [resRestricoes, resDecisao] = await Promise.all([
        restricaoService.listarPorCliente(cliente.id).catch(() => []),
        motorService.avaliar(cliente.id),
      ]);
      setRestricoes(Array.isArray(resRestricoes) ? resRestricoes : []);
      setDecisao(resDecisao);
    } catch (e: any) {
      console.error('Falha ao avaliar no motor:', e);
      setErro(e.response?.data?.message || 'Erro ao processar as regras de conformidade.');
    } finally {
      setCarregando(false);
    }
  };

  const limparConsulta = () => {
    setClienteAtual(null);
    setDecisao(null);
    setRestricoes([]);
    setTermoBusca('');
    setDropdownAberto(false);
    setErro(null);
  };

  const handleDarBaixa = async (restricaoId: string) => {
    try {
      await restricaoService.darBaixa(restricaoId);
      if (clienteAtual) {
        selecionarEProcessarCliente(clienteAtual, false);
      }
    } catch (e) {
      console.error('Erro ao dar baixa:', e);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. SEÇÃO DE BUSCA PONTUAL */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-poppins text-base font-bold text-slate-800 tracking-tight">
              Consulta & Validação Transacional
            </h3>
            <p className="text-xs text-slate-500">
              Digite o CPF, CNPJ ou Nome do proponente para executar a conformidade normativa em tempo real.
            </p>
          </div>
          {clienteAtual && (
            <button
              onClick={limparConsulta}
              className="text-xs font-semibold text-[#004b87] hover:text-[#003a6b] self-start sm:self-auto font-poppins transition-colors"
            >
              + Nova Consulta
            </button>
          )}
        </div>

        <div className="relative" ref={dropdownRef}>
          <div className="relative flex items-center">
            <input
              type="text"
              value={termoBusca}
              onFocus={() => {
                if (termoBusca.trim().length >= 2) {
                  setDropdownAberto(true);
                }
              }}
              onChange={(e) => {
                const valor = e.target.value;
                setTermoBusca(valor);
                setDropdownAberto(valor.trim().length >= 2);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && sugestoesClientes.length > 0) {
                  e.preventDefault();
                  selecionarEProcessarCliente(sugestoesClientes[0]);
                }
              }}
              placeholder="Digite o CPF (ex: 123.456.789-00), CNPJ ou Razão Social..."
              className="w-full pl-11 pr-28 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all font-sans"
            />
            <div className="absolute left-3.5 text-slate-400 pointer-events-none">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="absolute right-3 flex items-center gap-2">
              {carregando ? (
                <div className="w-5 h-5 border-2 border-[#004b87] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="text-[11px] font-medium text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-md font-mono hidden sm:inline-block">
                  Pressione Enter
                </span>
              )}
            </div>
          </div>

          {/* DROPDOWN DINÂMICO (ABRE SOMENTE APÓS 2 CARACTERES) */}
          {dropdownAberto && termoBusca.trim().length >= 2 && (
            <div className="absolute z-30 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto">
              <div className="p-2 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider font-poppins px-3 flex justify-between">
                <span>Resultados Encontrados</span>
                <span>Chave Primária</span>
              </div>
              {sugestoesClientes.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 font-sans">
                  Nenhum proponente encontrado para o termo pesquisado.
                </div>
              ) : (
                sugestoesClientes.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selecionarEProcessarCliente(c)}
                    className="w-full px-4 py-3 text-left hover:bg-[#e8f3fa]/40 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800 font-poppins group-hover:text-[#004b87] transition-colors">
                        {c.nome}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {c.tipoPessoa === 'PJ' ? 'CNPJ: ' : 'CPF: '}
                        {c.documento}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 group-hover:border-[#004b87]/30 transition-colors">
                      {c.tipoPessoa || 'PF'}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </section>

      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-medium text-left">
          {erro}
        </div>
      )}

      {/* ESTADO VAZIO / ESPERANDO CONSULTA */}
      {!clienteAtual && !carregando && (
        <section className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-slate-400">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#e8f3fa] text-[#004b87] flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h4 className="font-poppins text-base font-semibold text-slate-700">Aguardando Consulta</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Digite o CPF, CNPJ ou Razão Social no campo de busca acima para carregar o parecer do motor e o histórico de restrições.
          </p>
        </section>
      )}

      {/* 2. CARTÃO DE PARECER DA DECISÃO */}
      {clienteAtual && decisao && (
        <section
          className={`border rounded-2xl p-6 shadow-xs transition-all text-left ${
            decisao.bloqueado ? 'bg-red-50/70 border-red-200' : 'bg-emerald-50/70 border-emerald-200'
          }`}
        >
          <div
            className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${
              decisao.bloqueado ? 'border-red-200/80' : 'border-emerald-200/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`p-2.5 text-white rounded-xl shadow-xs ${
                  decisao.bloqueado
                    ? 'bg-red-600 shadow-red-600/20'
                    : 'bg-[#00874c] shadow-emerald-600/20'
                }`}
              >
                {decisao.bloqueado ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <div>
                <span
                  className={`font-poppins text-xs font-bold uppercase tracking-wider block ${
                    decisao.bloqueado ? 'text-red-700' : 'text-[#00874c]'
                  }`}
                >
                  Resultado da Avaliação
                </span>
                <h4
                  className={`font-poppins text-2xl font-extrabold tracking-tight ${
                    decisao.bloqueado ? 'text-red-950' : 'text-emerald-950'
                  }`}
                >
                  {decisao.bloqueado ? 'BLOQUEADO' : 'LIBERADO'}
                </h4>
              </div>
            </div>
            <span
              className={`px-3 py-1 text-xs font-semibold rounded-full border self-start md:self-auto font-poppins ${
                decisao.bloqueado
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : 'bg-emerald-100 text-[#00874c] border-emerald-300'
              }`}
            >
              Decisão Automática (Engine v1 • Banestes)
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-slate-500 block text-xs">Cliente / Razão Social</span>
              <span className="font-semibold text-slate-800">{clienteAtual?.nome || 'Não informado'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-xs">Documento</span>
              <span className="font-semibold text-slate-800 font-mono text-xs">{clienteAtual?.documento || '---'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-xs">Tipo de Pessoa</span>
              <span className="font-semibold text-slate-800">
                {clienteAtual?.tipoPessoa === 'PJ' ? 'Pessoa Jurídica (PJ)' : 'Pessoa Física (PF)'}
              </span>
            </div>
          </div>

          <div
            className={`mt-4 bg-white border rounded-xl p-4 shadow-2xs ${
              decisao.bloqueado ? 'border-red-200' : 'border-emerald-200'
            }`}
          >
            <h5 className="font-poppins text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              {decisao.bloqueado ? 'Justificativa do Bloqueio:' : 'Parecer de Conformidade:'}
            </h5>
            <ul className="space-y-1">
              {decisao.motivos && decisao.motivos.length > 0 ? (
                decisao.motivos.map((m, idx) => (
                  <li
                    key={idx}
                    className={`text-sm font-medium ${
                      decisao.bloqueado ? 'text-red-700' : 'text-[#00874c]'
                    }`}
                  >
                    • {m}
                  </li>
                ))
              ) : (
                <li className="text-sm font-medium text-[#00874c]">
                  Nenhuma restrição impeditiva encontrada no cadastro do proponente.
                </li>
              )}
            </ul>
          </div>
        </section>
      )}

      {/* 3. TABELA DE RESTRIÇÕES DO CLIENTE CONSULTADO */}
      {clienteAtual && (
        <section className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden text-left">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-left">
              <h3 className="font-poppins text-base font-bold text-slate-800 tracking-tight">
                Histórico de Restrições Registradas
              </h3>
              <p className="text-sm text-slate-500">
                Apontamentos para <strong className="text-[#081c30]">{clienteAtual.nome}</strong> (Total: {restricoes.length}).
              </p>
            </div>
            <button
              onClick={() => setModalRestricaoAberto(true)}
              className="px-4 py-2 bg-[#081c30] hover:bg-[#002855] text-white font-poppins font-medium text-sm rounded-lg transition-colors flex items-center gap-2 self-start sm:self-auto shadow-xs active:scale-[0.99]"
            >
              <svg className="w-4 h-4 text-[#009ee3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Incluir Nova Restrição
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5 font-poppins">Tipo de Restrição</th>
                  <th className="px-6 py-3.5 font-poppins">Valor Atrasado</th>
                  <th className="px-6 py-3.5 font-poppins">Data Ocorrência</th>
                  <th className="px-6 py-3.5 font-poppins">Status</th>
                  <th className="px-6 py-3.5 text-right font-poppins">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {restricoes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-sans">
                      Nenhuma restrição registrada para este cliente.
                    </td>
                  </tr>
                ) : (
                  restricoes.map((r) => {
                    const isAtiva = r.status === 'ATIVA';
                    const valorFormatado = new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(r.valor || 0);

                    return (
                      <tr key={r.id} className="hover:bg-[#e8f3fa]/20 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          <span className="inline-flex items-center gap-1.5 font-sans">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                r.tipoCodigo === 'FRAUDE'
                                  ? 'bg-red-500'
                                  : r.tipoCodigo === 'BLOQUEIO_JUDICIAL'
                                  ? 'bg-purple-500'
                                  : 'bg-amber-500'
                              }`}
                            ></span>
                            {r.tipoCodigo || 'OUTROS'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900">{valorFormatado}</td>
                        <td className="px-6 py-4 text-slate-500">{r.dataOcorrencia}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${
                              isAtiva
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-emerald-100 text-[#00874c] border-emerald-200'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isAtiva ? (
                            <button
                              onClick={() => handleDarBaixa(r.id)}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#00874c] border border-emerald-300 font-medium text-xs rounded-lg transition-colors shadow-2xs font-sans"
                            >
                              Dar Baixa
                            </button>
                          ) : (
                            <button
                              disabled
                              className="px-3 py-1.5 bg-slate-100 text-slate-400 font-medium text-xs rounded-lg cursor-not-allowed font-sans"
                            >
                              Resolvido
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* MODAL DE NOVA RESTRIÇÃO */}
      <ModalNovaRestricao
        aberto={modalRestricaoAberto}
        clienteId={clienteAtual?.id || ''}
        clienteNome={clienteAtual?.nome || ''}
        onFechar={() => setModalRestricaoAberto(false)}
        onSucesso={() => clienteAtual && selecionarEProcessarCliente(clienteAtual, false)}
      />
    </div>
  );
};