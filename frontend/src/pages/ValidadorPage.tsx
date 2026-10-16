import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ModalNovaRestricao } from '../components/modals/ModalNovaRestricao';
import type { ParecerDecisao } from '../services/motorService';
import { restricaoService, type RestricaoResponseDTO } from '../services/restricaoService';
import { clienteService, type Cliente } from '../services/clienteService';
import { politicaService, type PoliticaRiscoDTO } from '../services/politicaService';

interface ValidadorPageProps {
  clienteIdInicial?: string | null;
}

// Utilitário de máscara com suporte a CPF numérico e CNPJ Alfanumérico
export const formatarCpfCnpj = (valor: string): string => {
  const limpo = (valor || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 14);
  const temLetra = /[A-Z]/.test(limpo);

  if (!temLetra && limpo.length <= 11) {
    return limpo
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2') .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  return limpo
    .replace(/^([A-Z0-9]{2})([A-Z0-9])/, '$1.$2')
    .replace(/^([A-Z0-9]{2})\.([A-Z0-9]{3})([A-Z0-9])/, '$1.$2.$3')
    .replace(/\.([A-Z0-9]{3})([A-Z0-9])/, '.$1/$2') .replace(/\/([A-Z0-9]{4})([A-Z0-9]{1,2})$/, '$1-$2');
};

// Converte YYYY-MM-DD para DD/MM/AAAA sem sofrer alteração de fuso horário
export const formatarDataBR = (dataStr?: string | null): string => {
  if (!dataStr) return '—';
  const limpo = dataStr.split('T')[0];
  const partes = limpo.split('-');
  if (partes.length === 3) {
    const [ano, mes, dia] = partes;
    return `${dia}/${mes}/${ano}`;
  }
  return dataStr;
};

// Formatação monetária padronizada sem espaço inquebrável
const formatarMoeda = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(valor || 0)
    .replace(/\u00A0/g, ' ');
};

export const ValidadorPage: React.FC<ValidadorPageProps> = ({ clienteIdInicial }) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [dropdownAberto, setDropdownAberto] = useState<boolean>(false);
  const [clienteAtual, setClienteAtual] = useState<Cliente | null>(null);
  const [decisao, setDecisao] = useState<ParecerDecisao | null>(null);
  const [restricoes, setRestricoes] = useState<RestricaoResponseDTO[]>([]);
  const [filtroStatusTabela, setFiltroStatusTabela] = useState<'TODOS' | 'ATIVA' | 'BAIXADA'>('TODOS');
  const [carregando, setCarregando] = useState<boolean>(false);
  const [modalRestricaoAberto, setModalRestricaoAberto] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    carregarClientesIniciais();
  }, []);

  // Seleciona automaticamente o cliente se um ID inicial for fornecido via navegação
  useEffect(() => {
    if (clienteIdInicial && clientes.length > 0) {
      const encontrado = clientes.find((c) => c.id === clienteIdInicial);
      if (encontrado) {
        selecionarEProcessarCliente(encontrado);
      }
    }
  }, [clienteIdInicial, clientes]);

  // Fecha o menu de sugestões ao clicar fora do componente
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
      const res = await clienteService.listarTodos();
      const lista: Cliente[] = Array.isArray(res)
        ? res
        : Array.isArray((res as any)?.content)
          ? (res as any).content
          : [];
      setClientes(lista);
    } catch (error) {
      console.error('Erro ao carregar lista de clientes:', error);
      setClientes([]);
    }
  };

  // Motor dinâmico com princípio de Irretroatividade Normativa e segregação por versão
  const avaliarConformidadeTemporal = async (
    cliente: Cliente,
    listaRestricoes: RestricaoResponseDTO[]
  ): Promise<ParecerDecisao> => {
    const ativas = listaRestricoes.filter((r) => r.status === 'ATIVA');
    const agora = new Date();

    const parecerBase = {
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      documento: cliente.documento,
      tipoPessoa: (cliente.tipoPessoa || 'PF') as 'PF' | 'PJ',
      dataAvaliacao: agora.toISOString(),
    };

    if (ativas.length === 0) {
      return {
        ...parecerBase,
        status: 'LIBERADO',
        bloqueado: false,
        motivos: [],
      };
    }

    const motivos: string[] = [];
    const todasPoliticas = await politicaService.listarTodas();
    const politicaVigente = await politicaService.obterVigente();

    // 1. Verificação compulsória de Fraude e Bloqueio Judicial
    for (const r of ativas) {
      if (r.tipoCodigo === 'FRAUDE') {
        motivos.push('Apontamento ativo de FRAUDE registado no cadastro.');
      }
      if (r.tipoCodigo === 'BLOQUEIO_JUDICIAL') {
        motivos.push('BLOQUEIO JUDICIAL ativo a impedir a concessão de crédito.');
      }
    }

    // 2. Avaliação de Inadimplências com corte temporal pela vigência de cada ocorrência
    const inadimplencias = ativas.filter((r) => r.tipoCodigo === 'INADIMPLENCIA');

    if (inadimplencias.length > 0) {
      // Estruturas de segregação por versão de política (Irretroatividade)
      const acumuladoPorVersao = new Map<string, number>();
      const politicasPorVersao = new Map<string, PoliticaRiscoDTO>();
      const restricoesPorVersao = new Map<string, RestricaoResponseDTO[]>();

      for (const r of inadimplencias) {
        const partesData = (r.dataOcorrencia || '').split('T')[0].split('-');
        let dataOcorr: Date;
        if (partesData.length === 3) {
          dataOcorr = new Date(Number(partesData[0]), Number(partesData[1]) - 1, Number(partesData[2]), 23, 59, 59);
        } else {
          dataOcorr = new Date(r.dataOcorrencia || agora);
        }

        // Obtém a versão da política que vigorava na data exata desta ocorrência
        const politicaDaEpoca = todasPoliticas.find((p) => {
          const inicio = new Date(p.vigenciaInicio);
          const fim = p.vigenciaFim ? new Date(p.vigenciaFim) : new Date(8640000000000000);
          return dataOcorr >= inicio && dataOcorr <= fim;
        }) || politicaVigente;

        const versaoKey = politicaDaEpoca.versao || 'v1.0';
        politicasPorVersao.set(versaoKey, politicaDaEpoca);

        const valorAtual = acumuladoPorVersao.get(versaoKey) || 0;
        acumuladoPorVersao.set(versaoKey, valorAtual + (Number(r.valor) || 0));

        const grupoRestricoes = restricoesPorVersao.get(versaoKey) || [];
        grupoRestricoes.push(r);
        restricoesPorVersao.set(versaoKey, grupoRestricoes);

        // Verificação de tolerância de atraso individual por restrição confrontada com sua política
        const diffTempo = agora.getTime() - dataOcorr.getTime();
        const diasAtraso = Math.max(0, Math.floor(diffTempo / (1000 * 60 * 60 * 24)));

        if (diasAtraso > politicaDaEpoca.diasAtrasoMaximo) {
          const dataVigenciaPolitica = formatarDataBR(politicaDaEpoca.vigenciaInicio);
          motivos.push(
            `Atraso temporal excede a tolerância máxima permitida de ${politicaDaEpoca.diasAtrasoMaximo} dias [Política ${politicaDaEpoca.versao} vigente à época em ${dataVigenciaPolitica}]`
          );
        }
      }

      // Verificação de tetos financeiros segregados por época
      for (const [versaoKey, acumulado] of acumuladoPorVersao.entries()) {
        const politica = politicasPorVersao.get(versaoKey)!;
        if (acumulado > politica.tetoInadimplencia) {
          const valorFormatado = formatarMoeda(acumulado);
          const tetoFormatado = formatarMoeda(politica.tetoInadimplencia);
          const dataVigenciaPolitica = formatarDataBR(politica.vigenciaInicio);

          motivos.push(
            `Inadimplência acumulada de ${valorFormatado} excede o teto permitido de ${tetoFormatado} [Política ${versaoKey} vigente à época em ${dataVigenciaPolitica}]`
          );
        }
      }
    }

    const estaBloqueado = motivos.length > 0;

    return {
      ...parecerBase,
      status: estaBloqueado ? 'BLOQUEADO' : 'LIBERADO',
      bloqueado: estaBloqueado,
      motivos,
    };
  };

  // Sugestões considerando caracteres alfanuméricos sanitizados e nomes
  const sugestoesClientes = useMemo(() => {
    const listaSegura = Array.isArray(clientes) ? clientes : [];
    const termo = termoBusca.trim();

    if (!termo) return [];

    const termoLimpo = termo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const termoTexto = termo.toLowerCase();

    return listaSegura.filter((c) => {
      if (!c) return false;

      const docBancoLimpo = (c.documento || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const docBancoFormatado = formatarCpfCnpj(c.documento || '').toLowerCase();
      const nomeBanco = (c.nome || '').toLowerCase();

      const matchDocLimpo = termoLimpo.length > 0 && docBancoLimpo.includes(termoLimpo);
      const matchDocFormatado = docBancoFormatado.includes(termoTexto);
      const matchNome = nomeBanco.includes(termoTexto);

      return matchDocLimpo || matchDocFormatado || matchNome;
    });
  }, [clientes, termoBusca]);

  const lidarComMudancaDocumento = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const limpo = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 14);
    const formatado = formatarCpfCnpj(limpo);

    setTermoBusca(formatado);
    setDropdownAberto(limpo.length >= 2 || raw.trim().length >= 2);
  };

  const selecionarEProcessarCliente = async (cliente: Cliente, atualizarTexto: boolean = true) => {
    setClienteAtual(cliente);
    if (atualizarTexto) {
      setTermoBusca(formatarCpfCnpj(cliente.documento || ''));
    }
    setDropdownAberto(false);
    setFiltroStatusTabela('TODOS');
    setErro(null);
    setCarregando(true);

    try {
      const resRestricoes = await restricaoService.listarPorCliente(cliente.id).catch(() => []);

      const listaRestricoes: RestricaoResponseDTO[] = Array.isArray(resRestricoes)
        ? resRestricoes
        : Array.isArray((resRestricoes as any)?.content)
          ? (resRestricoes as any).content
          : [];

      const parecerDinamico = await avaliarConformidadeTemporal(cliente, listaRestricoes);

      setRestricoes(listaRestricoes);
      setDecisao(parecerDinamico);
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
    setFiltroStatusTabela('TODOS');
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

  // Filtragem e ordenação decrescente por data da restrição
  const restricoesExibidas = useMemo(() => {
    const filtradas = filtroStatusTabela === 'TODOS'
      ? restricoes
      : restricoes.filter((r) => r.status === filtroStatusTabela);

    return [...filtradas].sort((a, b) => {
      const dataA = a.dataOcorrencia || '';
      const dataB = b.dataOcorrencia || '';
      return dataB.localeCompare(dataA);
    });
  }, [restricoes, filtroStatusTabela]);

  const totalAtivas = useMemo(() => restricoes.filter((r) => r.status === 'ATIVA').length, [restricoes]);
  const totalBaixadas = useMemo(() => restricoes.filter((r) => r.status === 'BAIXADA').length, [restricoes]);

  return (
    <div className="space-y-6 font-sans">
      {/* 1. SEÇÃO DE CONSULTA PONTUAL POR CPF OU CNPJ */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-poppins text-base font-bold text-slate-800 tracking-tight">
              Cliente:
            </h3>
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
                const limpo = termoBusca.replace(/[^a-zA-Z0-9]/g, '');
                if (limpo.length >= 2 || termoBusca.trim().length >= 2) {
                  setDropdownAberto(true);
                }
              }}
              onChange={lidarComMudancaDocumento}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && sugestoesClientes.length > 0) {
                  e.preventDefault();
                  selecionarEProcessarCliente(sugestoesClientes[0]);
                }
              }}
              placeholder="Digite o CPF ou CNPJ do proponente..."
              className="w-full pl-11 pr-28 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all font-mono tracking-wide"
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

          {/* DROPDOWN DINÂMICO DE SUGESTÕES */}
          {dropdownAberto && termoBusca.trim().length >= 2 && (
            <div className="absolute z-30 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto">
              <div className="p-2 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider font-poppins px-3 flex justify-between">
                <span>Resultados Encontrados</span>
                <span>Documento</span>
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
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {c.tipoPessoa === 'PJ' ? 'CNPJ: ' : 'CPF: '}
                        <strong className="text-slate-700">{formatarCpfCnpj(c.documento)}</strong>
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

      {/* 2. CARTÃO DE PARECER DA DECISÃO */}
      {clienteAtual && decisao && (
        <section
          className={`border rounded-2xl p-6 shadow-xs transition-all text-left ${
            decisao.bloqueado ? 'bg-red-50/40 border-red-200' : 'bg-emerald-50/40 border-emerald-200'
          }`}
        >
          {/* Cabeçalho do Veredito */}
          <div className="flex items-center gap-3.5 mb-6">
            <span
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                decisao.bloqueado ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              {decisao.bloqueado ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <div>
              <span
                className={`text-[11px] font-bold uppercase tracking-wider block font-poppins ${
                  decisao.bloqueado ? 'text-red-700' : 'text-emerald-700'
                }`}
              >
                RESULTADO DA AVALIAÇÃO
              </span>
              <h2
                className={`text-2xl font-black font-poppins tracking-tight ${
                  decisao.bloqueado ? 'text-red-950' : 'text-emerald-950'
                }`}
              >
                {decisao.bloqueado ? 'BLOQUEADO' : 'LIBERADO'}
              </h2>
            </div>
          </div>

          {/* Dados do Proponente */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-5 text-xs border-b border-red-200/50">
            <div>
              <span className="text-slate-400 font-medium block text-[11px]">Cliente / Razão Social</span>
              <span className="font-bold text-slate-900 text-sm">{clienteAtual?.nome || 'Não informado'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block text-[11px]">Documento</span>
              <span className="font-bold text-slate-900 font-mono text-sm">
                {formatarCpfCnpj(clienteAtual?.documento || '') || '---'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block text-[11px]">Tipo de Pessoa</span>
              <span className="font-semibold text-slate-800 text-xs">
                {clienteAtual?.tipoPessoa === 'PJ' ? 'Pessoa Jurídica (PJ)' : 'Pessoa Física (PF)'}
              </span>
            </div>
          </div>

          {/* Bloco de Justificativas com menção à Versão e Data da Política à época */}
          <div className="mt-5 p-4 bg-white rounded-xl border border-red-100 shadow-2xs">
            <h5 className="font-poppins text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
              {decisao.bloqueado ? 'JUSTIFICATIVA DO BLOQUEIO:' : 'PARECER DE CONFORMIDADE:'}
            </h5>
            <ul className="space-y-1.5">
              {decisao.motivos && decisao.motivos.length > 0 ? (
                decisao.motivos.map((m, idx) => (
                  <li key={idx} className="text-xs text-red-600 font-medium">
                    • {m}
                  </li>
                ))
              ) : (
                <li className="text-xs text-emerald-600 font-medium">
                  • Nenhuma restrição impeditiva encontrada no cadastro do proponente para os limites vigentes.
                </li>
              )}
            </ul>
          </div>
        </section>
      )}

      {/* 3. TABELA DE RESTRIÇÕES DO CLIENTE CONSULTADO */}
      {clienteAtual && (
        <section className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden text-left">
          <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-left">
              <h3 className="font-poppins text-base font-bold text-slate-800 tracking-tight">
                Histórico de Restrições Registradas
              </h3>
              <p className="text-sm text-slate-500">
                Registros para <strong className="text-[#081c30]">{clienteAtual.nome}</strong> (Total: {restricoes.length}).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* FILTRO EM ABAS */}
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-poppins">
                <button
                  type="button"
                  onClick={() => setFiltroStatusTabela('TODOS')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    filtroStatusTabela === 'TODOS'
                      ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todas ({restricoes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroStatusTabela('ATIVA')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                    filtroStatusTabela === 'ATIVA'
                      ? 'bg-white text-amber-800 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-amber-700'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Ativas ({totalAtivas})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroStatusTabela('BAIXADA')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                    filtroStatusTabela === 'BAIXADA'
                      ? 'bg-white text-[#00874c] shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-[#00874c]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Baixadas ({totalBaixadas})
                </button>
              </div>

              {/* BOTÃO NOVA RESTRIÇÃO */}
              <button
                onClick={() => setModalRestricaoAberto(true)}
                className="px-4 py-2 bg-[#081c30] hover:bg-[#002855] text-white font-poppins font-medium text-sm rounded-lg transition-colors flex items-center gap-2 shadow-xs active:scale-[0.99]"
              >
                <svg className="w-4 h-4 text-[#009ee3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Incluir Nova Restrição
              </button>
            </div>
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
                {restricoesExibidas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-sans">
                      {filtroStatusTabela === 'TODOS'
                        ? 'Nenhuma restrição registrada para este cliente.'
                        : `Nenhuma restrição ${filtroStatusTabela === 'ATIVA' ? 'ativa' : 'baixada'} para este cliente.`}
                    </td>
                  </tr>
                ) : (
                  restricoesExibidas.map((r) => {
                    const isAtiva = r.status === 'ATIVA';
                    const valorFormatado = formatarMoeda(r.valor || 0);

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
                        <td className="px-6 py-4 text-slate-700 font-mono text-xs font-medium">
                          {formatarDataBR(r.dataOcorrencia)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`w-[78px] h-6 inline-flex items-center justify-center text-[11px] font-bold rounded-md border tracking-wide font-sans text-center ${
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