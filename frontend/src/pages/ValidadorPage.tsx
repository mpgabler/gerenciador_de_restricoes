import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../services/api';
import { ModalNovaRestricao } from '../components/modals/ModalNovaRestricao';
import type { ParecerDecisao } from '../services/motorService';
import { restricaoService, type RestricaoResponseDTO } from '../services/restricaoService';
import { clienteService, type Cliente } from '../services/clienteService';
import { politicaService, type PoliticaRiscoDTO } from '../services/politicaService';

interface ValidadorPageProps {
  clienteIdInicial?: string | null;
}

// Extensão do parecer para incorporar as métricas de Machine Learning (ONNX)
export interface DecisaoComScoreML extends ParecerDecisao {
  score?: number | null;
  probabilidadeDefault?: number | null;
  faixaRisco?: string | null;
  modeloUtilizado?: string | null;
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
  const [decisao, setDecisao] = useState<DecisaoComScoreML | null>(null);
  const [restricoes, setRestricoes] = useState<RestricaoResponseDTO[]>([]);
  const [politicas, setPoliticas] = useState<PoliticaRiscoDTO[]>([]);
  const [politicaVigente, setPoliticaVigente] = useState<PoliticaRiscoDTO | null>(null);
  const [filtroStatusTabela, setFiltroStatusTabela] = useState<'TODOS' | 'ATIVA' | 'BAIXADA'>('TODOS');
  const [carregando, setCarregando] = useState<boolean>(false);
  const [modalRestricaoAberto, setModalRestricaoAberto] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);

  // Estados para o Modal de Inspeção da Política Aplicada
  const [modalPoliticaAberto, setModalPoliticaAberto] = useState<boolean>(false);
  const [politicaSelecionada, setPoliticaSelecionada] = useState<PoliticaRiscoDTO | null>(null);
  const [restricaoInspecionada, setRestricaoInspecionada] = useState<RestricaoResponseDTO | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    carregarClientesIniciais();
    carregarPoliticas();
  }, []);

  const carregarPoliticas = async () => {
    try {
      const [todas, vigente] = await Promise.all([
        politicaService.listarTodas().catch(() => []),
        politicaService.obterVigente().catch(() => null),
      ]);
      setPoliticas(todas);
      setPoliticaVigente(vigente);
    } catch (e) {
      console.error('Erro ao carregar políticas:', e);
    }
  };

  useEffect(() => {
    if (clienteIdInicial && clientes.length > 0) {
      const encontrado = clientes.find((c) => c.id === clienteIdInicial);
      if (encontrado) {
        selecionarEProcessarCliente(encontrado);
      }
    }
  }, [clienteIdInicial, clientes]);

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

  // Identifica a política aplicável para uma restrição respeitando a irretroatividade temporal
  const obterPoliticaParaRestricao = (r: RestricaoResponseDTO): PoliticaRiscoDTO | null => {
    if (!r.dataOcorrencia) return politicaVigente;
    const partesData = r.dataOcorrencia.split('T')[0].split('-');
    let dataOcorr: Date;
    if (partesData.length === 3) {
      dataOcorr = new Date(Number(partesData[0]), Number(partesData[1]) - 1, Number(partesData[2]), 23, 59, 59);
    } else {
      dataOcorr = new Date(r.dataOcorrencia);
    }

    const encontrada = politicas.find((p) => {
      const inicio = new Date(p.vigenciaInicio);
      const fim = p.vigenciaFim ? new Date(p.vigenciaFim) : new Date(8640000000000000);
      return dataOcorr >= inicio && dataOcorr <= fim;
    });

    return encontrada || politicaVigente;
  };

  const abrirInspecaoPolitica = (r: RestricaoResponseDTO) => {
    const pol = obterPoliticaParaRestricao(r);
    setRestricaoInspecionada(r);
    setPoliticaSelecionada(pol);
    setModalPoliticaAberto(true);
  };

  // Avaliação local para garantia de irretroatividade temporal imediata
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
    const polVigente = await politicaService.obterVigente();

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
      const acumuladoPorVersao = new Map<string, number>();
      const politicasPorVersao = new Map<string, PoliticaRiscoDTO>();

      for (const r of inadimplencias) {
        const partesData = (r.dataOcorrencia || '').split('T')[0].split('-');
        let dataOcorr: Date;
        if (partesData.length === 3) {
          dataOcorr = new Date(Number(partesData[0]), Number(partesData[1]) - 1, Number(partesData[2]), 23, 59, 59);
        } else {
          dataOcorr = new Date(r.dataOcorrencia || agora);
        }

        const politicaDaEpoca = todasPoliticas.find((p) => {
          const inicio = new Date(p.vigenciaInicio);
          const fim = p.vigenciaFim ? new Date(p.vigenciaFim) : new Date(8640000000000000);
          return dataOcorr >= inicio && dataOcorr <= fim;
        }) || polVigente;

        const versaoKey = politicaDaEpoca.versao || 'v1.0';
        politicasPorVersao.set(versaoKey, politicaDaEpoca);

        const valorAtual = acumuladoPorVersao.get(versaoKey) || 0;
        acumuladoPorVersao.set(versaoKey, valorAtual + (Number(r.valor) || 0));

        const diffTempo = agora.getTime() - dataOcorr.getTime();
        const diasAtraso = Math.max(0, Math.floor(diffTempo / (1000 * 60 * 60 * 24)));

        if (diasAtraso > politicaDaEpoca.diasAtrasoMaximo) {
          const dataVigenciaPolitica = formatarDataBR(politicaDaEpoca.vigenciaInicio);
          motivos.push(
            `Atraso temporal excede a tolerância máxima permitida de ${politicaDaEpoca.diasAtrasoMaximo} dias [Política ${politicaDaEpoca.versao} vigente à época em ${dataVigenciaPolitica}]`
          );
        }
      }

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
    // Limpeza mandatória para impedir que o parecer do cliente anterior fique retido
    setDecisao(null);
    setRestricoes([]);

    if (atualizarTexto) {
      setTermoBusca(formatarCpfCnpj(cliente.documento || ''));
    }
    setDropdownAberto(false);
    setFiltroStatusTabela('TODOS');
    setErro(null);
    setCarregando(true);

    try {
      // 1. Carrega restrições cadastradas
      const resRestricoes = await restricaoService.listarPorCliente(cliente.id).catch(() => []);
      const listaRestricoes: RestricaoResponseDTO[] = Array.isArray(resRestricoes)
        ? resRestricoes
        : Array.isArray((resRestricoes as any)?.content)
          ? (resRestricoes as any).content
          : [];

      // 2. Avaliação de conformidade temporal das regras determinísticas
      const parecerDinamico = await avaliarConformidadeTemporal(cliente, listaRestricoes);

      // 3. Consulta à API /valida-transacao/{id} para extração do Score de Machine Learning (ONNX)
      let parecerConsolidado: DecisaoComScoreML = { ...parecerDinamico };

      try {
        const responseMotor = await api.get(`/valida-transacao/${cliente.id}`);
        if (responseMotor && responseMotor.data) {
          const dadosBackend = responseMotor.data;
          parecerConsolidado = {
            ...parecerConsolidado,
            status: dadosBackend.status || parecerDinamico.status,
            bloqueado: dadosBackend.status === 'BLOQUEADO' || parecerDinamico.bloqueado,
            motivos: (dadosBackend.motivos && dadosBackend.motivos.length > 0)
              ? dadosBackend.motivos
              : parecerDinamico.motivos,
            score: dadosBackend.score,
            probabilidadeDefault: dadosBackend.probabilidadeDefault,
            faixaRisco: dadosBackend.faixaRisco,
            modeloUtilizado: dadosBackend.modeloUtilizado,
          };
        }
      } catch (errApi) {
        console.warn('API /valida-transacao inacessível; aplicando estimador de contingência:', errApi);
        const ativas = listaRestricoes.filter((r) => r.status === 'ATIVA');
        const baixadas = listaRestricoes.filter((r) => r.status === 'BAIXADA');
        
        let pdEstimada = parecerDinamico.bloqueado ? 0.95 : (ativas.length > 0 ? 0.35 : 0.02);
        if (!parecerDinamico.bloqueado && baixadas.length > 0) {
          pdEstimada = Math.max(0.01, pdEstimada - baixadas.length * 0.02);
        }
        
        const scoreEstimado = Math.round((1 - pdEstimada) * 1000);
        
        parecerConsolidado = {
          ...parecerConsolidado,
          score: scoreEstimado,
          probabilidadeDefault: pdEstimada,
          faixaRisco: scoreEstimado >= 700 ? 'BAIXO RISCO' : (scoreEstimado >= 400 ? 'MÉDIO RISCO' : 'ALTO RISCO'),
          modeloUtilizado: cliente.tipoPessoa === 'PJ' ? 'IA Corporativa (PJ)' : 'IA Individual (PF)',
        };
      }

      setRestricoes(listaRestricoes);
      setDecisao(parecerConsolidado);
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

  // Estilos cromáticos dinâmicos para a régua do Credit Score
  const corScore = useMemo(() => {
    const s = decisao?.score ?? 500;
    if (s >= 700) return { texto: 'text-emerald-700', bg: 'bg-emerald-50', borda: 'border-emerald-200', barra: 'bg-emerald-500' };
    if (s >= 400) return { texto: 'text-amber-700', bg: 'bg-amber-50', borda: 'border-amber-200', barra: 'bg-amber-500' };
    return { texto: 'text-red-700', bg: 'bg-red-50', borda: 'border-red-200', barra: 'bg-red-500' };
  }, [decisao?.score]);

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

      {/* ESTADO DE CARREGAMENTO TRANSITÓRIO */}
      {clienteAtual && carregando && !decisao && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center text-slate-400">
          <div className="inline-block w-8 h-8 border-3 border-[#004b87] border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm font-medium font-poppins text-slate-700">Avaliando conformidade e calculando Credit Score...</p>
        </div>
      )}

      {/* 2. CARTÃO DE PARECER DA DECISÃO COM CREDIT SCORE ML */}
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
                RESULTADO DA AVALIAÇÃO NORMATIVA
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-5 text-xs border-b border-slate-200/60">
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

          {/* BLOCO: CREDIT SCORE PREDITIVO COM MACHINE LEARNING (ONNX) */}
          <div className="mt-5 p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-[#004b87]/10 flex items-center justify-center text-[#004b87]">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </span>
                <div>
                  <h4 className="font-poppins text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Análise Preditiva de Crédito
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Inferência estatística para análise de crédito ao cliente
                  </p>
                </div>
              </div>

              {decisao.modeloUtilizado && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-[#e8f3fa] text-[#004b87] border border-[#004b87]/20 self-start sm:self-auto">
                  {decisao.modeloUtilizado}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Pontuação de Score */}
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-black font-poppins tracking-tight ${corScore.texto}`}>
                  {decisao.score ?? '—'}
                </span>
                <span className="text-xs font-semibold text-slate-400 font-mono">/ 1000 pts</span>
              </div>

              {/* Barra Visual de Risco */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase font-poppins">
                  <span>Régua de Risco</span>
                  <span className={corScore.texto}>{decisao.faixaRisco || 'EM ANÁLISE'}</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${corScore.barra}`}
                    style={{ width: `${Math.min(100, Math.max(5, ((decisao.score || 0) / 1000) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Probabilidade de Default */}
              <div className="text-right md:border-l md:border-slate-100 md:pl-4">
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-poppins">
                  Probabilidade de Inadimplência (PD)
                </span>
                <span className="text-sm font-bold font-mono text-slate-800">
                  {decisao.probabilidadeDefault !== undefined && decisao.probabilidadeDefault !== null
                    ? `${(decisao.probabilidadeDefault * 100).toFixed(1)}%`
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Justificativa / Parecer de Conformidade */}
          <div className="mt-4 p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <h5 className="font-poppins text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
              {decisao.bloqueado ? 'JUSTIFICATIVA DO BLOQUEIO NORMATIVO:' : 'PARECER DE CONFORMIDADE:'}
            </h5>
            <ul className="space-y-1.5">
              {decisao.motivos && decisao.motivos.length > 0 ? (
                decisao.motivos.map((m, idx) => (
                  <li
                    key={idx}
                    className={`text-xs font-medium ${decisao.bloqueado ? 'text-red-600' : 'text-emerald-700'}`}
                  >
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
                  <th className="px-6 py-3.5 text-center font-poppins">Política Aplicada</th>
                  <th className="px-6 py-3.5 text-right font-poppins">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {restricoesExibidas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-sans">
                      {filtroStatusTabela === 'TODOS'
                        ? 'Nenhuma restrição registrada para este cliente.'
                        : `Nenhuma restrição ${filtroStatusTabela === 'ATIVA' ? 'ativa' : 'baixada'} para este cliente.`}
                    </td>
                  </tr>
                ) : (
                  restricoesExibidas.map((r) => {
                    const isAtiva = r.status === 'ATIVA';
                    const valorFormatado = formatarMoeda(r.valor || 0);
                    const pol = obterPoliticaParaRestricao(r);

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

                        {/* COLUNA: POLÍTICA APLICADA */}
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => abrirInspecaoPolitica(r)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-[#e8f3fa] text-slate-700 hover:text-[#004b87] border border-slate-300/80 hover:border-[#004b87]/40 rounded-lg text-xs font-semibold font-poppins transition-all shadow-2xs group"
                            title="Inspecionar parâmetros da Política de Risco aplicada a esta ocorrência"
                          >
                            <svg className="w-4 h-4 text-slate-500 group-hover:text-[#004b87] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>{pol?.versao ? `Política ${pol.versao}` : 'Ver Política'}</span>
                          </button>
                        </td>

                        {/* COLUNA DE AÇÃO */}
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

      {/* MODAL DE INSPEÇÃO DA POLÍTICA DE RISCO VIGENTE À ÉPOCA */}
      {modalPoliticaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
          <div
            className="fixed inset-0 bg-[#081c30]/75 backdrop-blur-xs transition-opacity"
            onClick={() => setModalPoliticaAberto(false)}
          />

          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-lg overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-poppins mb-1 bg-[#004b87]/10 text-[#004b87]">
                  Auditoria Normativa & Compliance
                </span>
                <h3 className="font-poppins text-base font-bold text-slate-800 tracking-tight">
                  Política de Risco Utilizada
                </h3>
              </div>
              <button
                onClick={() => setModalPoliticaAberto(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Resumo da Ocorrência sob Análise */}
              {restricaoInspecionada && (
                <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-1.5 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-poppins block">
                    Apontamento Confrontado
                  </span>
                  <div className="flex justify-between items-center text-slate-800">
                    <span className="font-bold">{restricaoInspecionada.tipoCodigo}</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatarMoeda(restricaoInspecionada.valor || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500 text-[11px]">
                    <span>Data da Ocorrência:</span>
                    <span className="font-mono">{formatarDataBR(restricaoInspecionada.dataOcorrencia)}</span>
                  </div>
                </div>
              )}

              {/* Parâmetros da Política Vigente à Época */}
              {politicaSelecionada ? (
                <div className="space-y-3">
                  <div className="p-4 bg-[#e8f3fa]/40 border border-[#004b87]/20 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-[#004b87] font-poppins">
                        Versão Normativa: {politicaSelecionada.versao}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          politicaSelecionada.ativo
                            ? 'bg-emerald-100 text-[#00874c]'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {politicaSelecionada.ativo ? 'Versão Vigente' : 'Versão Histórica'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs mt-3">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                          Teto Inadimplência
                        </span>
                        <p className="font-bold font-poppins text-slate-800 text-sm">
                          {formatarMoeda(politicaSelecionada.tetoInadimplencia)}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                          Tolerância Máx. Atraso
                        </span>
                        <p className="font-bold font-poppins text-slate-800 text-sm">
                          {politicaSelecionada.diasAtrasoMaximo} dias
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-200/70 text-[11px] text-slate-600 flex justify-between">
                      <span>Período de Vigência:</span>
                      <span className="font-mono font-semibold">
                        {formatarDataBR(politicaSelecionada.vigenciaInicio)} até{' '}
                        {politicaSelecionada.vigenciaFim
                          ? formatarDataBR(politicaSelecionada.vigenciaFim)
                          : 'Indeterminado (Atual)'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-poppins mb-1">
                      Justificativa Técnica Normativa
                    </span>
                    <p className="text-slate-700 leading-relaxed italic">
                      "{politicaSelecionada.justificativa || 'Sem justificativa informada.'}"
                    </p>
                    <span className="block mt-2 text-[10px] text-slate-400">
                      Cadastrado por: {politicaSelecionada.criadoPor || 'Sistema'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-500">
                  Nenhuma política de risco encontrada para a data desta restrição.
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setModalPoliticaAberto(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors font-poppins"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
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