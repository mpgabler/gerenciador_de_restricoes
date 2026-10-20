import React, { useState, useEffect, useMemo } from 'react';
import { restricaoService, type RestricaoResponseDTO } from '../services/restricaoService';
import { clienteService, type Cliente } from '../services/clienteService';
import { politicaService, type PoliticaRiscoDTO } from '../services/politicaService';

type CampoOrdenacao = 'clienteNome' | 'tipoCodigo' | 'valor' | 'dataOcorrencia' | 'status' | 'situacaoRisco';

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

interface RestricaoAuditada extends RestricaoResponseDTO {
  bloqueante: boolean;
  motivoBloqueio?: string;
  versaoPolitica?: string;
}

interface GrupoRestricaoAuditada {
  idGrupo: string;
  clienteId?: string;
  clienteNome?: string;
  tipoCodigo: string;
  status: string;
  valorTotal: number;
  dataOcorrencia: string;
  bloqueante: boolean;
  motivoBloqueio?: string;
  versaoPolitica?: string;
  tipoPessoa: 'PF' | 'PJ';
  documento: string;
  itens: RestricaoAuditada[];
}

export const RelatoriosPage: React.FC = () => {
  const [restricoes, setRestricoes] = useState<RestricaoResponseDTO[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [politicas, setPoliticas] = useState<PoliticaRiscoDTO[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);

  // 1. Estados de Filtros e Busca (Status Operacional padrão definido como 'ATIVA')
  const [busca, setBusca] = useState<string>('');
  const [tipoPessoaFiltro, setTipoPessoaFiltro] = useState<string>('TODOS');
  const [tipoFiltro, setTipoFiltro] = useState<string>('TODOS');
  const [statusFiltro, setStatusFiltro] = useState<string>('ATIVA');
  const [bloqueioFiltro, setBloqueioFiltro] = useState<string>('TODOS');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [atalhoAtivo, setAtalhoAtivo] = useState<string>('todos');

  // 2. Estados da Tabela (Ordenação, Paginação e Expansão de Agrupamentos)
  const [campoOrdenacao, setCampoOrdenacao] = useState<CampoOrdenacao>('dataOcorrencia');
  const [ordemAsc, setOrdemAsc] = useState<boolean>(false);
  const [paginaAtual, setPaginaAtual] = useState<number>(1);
  const [gruposExpandidos, setGruposExpandidos] = useState<Set<string>>(new Set());
  const itensPorPagina = 5;

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const [resRestricoes, resClientes, resPoliticas] = await Promise.all([
        restricaoService.listarTodas ? restricaoService.listarTodas().catch(() => []) : Promise.resolve([]),
        clienteService.listarTodos().catch(() => []),
        politicaService.listarTodas().catch(() => []),
      ]);

      const listaRestricoes: RestricaoResponseDTO[] = Array.isArray(resRestricoes)
        ? resRestricoes
        : Array.isArray((resRestricoes as any)?.content)
        ? (resRestricoes as any).content
        : [];

      const listaClientes: Cliente[] = Array.isArray(resClientes)
        ? resClientes
        : Array.isArray((resClientes as any)?.content)
        ? (resClientes as any).content
        : [];

      setRestricoes(listaRestricoes);
      setClientes(listaClientes);
      setPoliticas(Array.isArray(resPoliticas) ? resPoliticas : []);
    } catch (e) {
      console.error('Falha ao carregar relatórios:', e);
      setRestricoes([]);
      setClientes([]);
      setPoliticas([]);
    } finally {
      setCarregando(false);
    }
  };

  const listaSeguraClientes = useMemo(() => (Array.isArray(clientes) ? clientes : []), [clientes]);
  const listaSeguraRestricoes = useMemo(() => (Array.isArray(restricoes) ? restricoes : []), [restricoes]);

  const mapaClientes = useMemo(() => {
    const map = new Map<string, Cliente>();
    listaSeguraClientes.forEach((c) => {
      if (c?.id) map.set(c.id, c);
    });
    return map;
  }, [listaSeguraClientes]);

  const mapaClientesPorNome = useMemo(() => {
    const map = new Map<string, Cliente>();
    listaSeguraClientes.forEach((c) => {
      if (c?.nome) map.set(c.nome.trim().toLowerCase(), c);
    });
    return map;
  }, [listaSeguraClientes]);

  const obterDocCliente = (r: RestricaoResponseDTO): string => {
    const cliente =
      (r?.clienteId ? mapaClientes.get(r.clienteId) : undefined) ||
      (r?.clienteNome ? mapaClientesPorNome.get(r.clienteNome.trim().toLowerCase()) : undefined);

    return (
      (r as any)?.documento ||
      (r as any)?.clienteDocumento ||
      (r as any)?.cpf ||
      cliente?.documento ||
      ''
    );
  };

  const obterTipoPessoaCliente = (r: RestricaoResponseDTO): 'PF' | 'PJ' => {
    const cliente =
      (r?.clienteId ? mapaClientes.get(r.clienteId) : undefined) ||
      (r?.clienteNome ? mapaClientesPorNome.get(r.clienteNome.trim().toLowerCase()) : undefined);

    if (cliente?.tipoPessoa) {
      return cliente.tipoPessoa;
    }

    const docLimpo = obterDocCliente(r).replace(/[^a-zA-Z0-9]/g, '');
    return docLimpo.length > 11 ? 'PJ' : 'PF';
  };

  const situacaoRiscoDesabilitada = tipoFiltro === 'FRAUDE' || tipoFiltro === 'BLOQUEIO_JUDICIAL';

  const opcoesSituacaoRisco = useMemo(() => {
    if (tipoFiltro === 'FRAUDE') {
      return [{ valor: 'TODOS', label: 'Bloqueio Compulsório (Automático)' }];
    }
    if (tipoFiltro === 'BLOQUEIO_JUDICIAL') {
      return [{ valor: 'TODOS', label: 'Bloqueio Mandatório (Judicial)' }];
    }
    if (tipoFiltro === 'INADIMPLENCIA') {
      return [
        { valor: 'TODOS', label: 'Todas as Inadimplências' },
        { valor: 'BLOQUEIO_INADIMPLENCIA', label: 'Bloqueante (Excede Teto / Prazo)' },
        { valor: 'TOLERADO', label: 'Dentro do Limite Tolerado' },
      ];
    }
    return [
      { valor: 'TODOS', label: 'Todas as Situações' },
      { valor: 'BLOQUEIO_INADIMPLENCIA', label: 'Bloqueio p/ Inadimplência' },
      { valor: 'TOLERADO', label: 'Dentro do Limite Tolerado' },
      { valor: 'BLOQUEIO_CRITICO', label: 'Bloqueio Crítico (Fraude / Judicial)' },
    ];
  }, [tipoFiltro]);

  const lidarMudancaTipoFiltro = (novoTipo: string) => {
    setTipoFiltro(novoTipo);
    setBloqueioFiltro('TODOS');
    setPaginaAtual(1);
  };

  const alternarExpansao = (idGrupo: string) => {
    setGruposExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(idGrupo)) {
        next.delete(idGrupo);
      } else {
        next.add(idGrupo);
      }
      return next;
    });
  };

  // Motor analítico que enriquece os registros para auditoria
  const restricoesAuditadas = useMemo<RestricaoAuditada[]>(() => {
    const agora = new Date();
    const politicaPadrao = politicas.find((p) => p.ativo) || politicas[0] || {
      tetoInadimplencia: 5000,
      diasAtrasoMaximo: 90,
      versao: 'v1.0',
      vigenciaInicio: '2026-01-01',
    };

    const acumuladoAtivoPorCliente = new Map<string, number>();
    listaSeguraRestricoes.forEach((r) => {
      if (r.status === 'ATIVA' && r.tipoCodigo === 'INADIMPLENCIA') {
        const idKey = r.clienteId || r.clienteNome || 'unknown';
        const valorAtual = acumuladoAtivoPorCliente.get(idKey) || 0;
        acumuladoAtivoPorCliente.set(idKey, valorAtual + (Number(r.valor) || 0));
      }
    });

    return listaSeguraRestricoes.map((r) => {
      if (r.tipoCodigo === 'FRAUDE') {
        return {
          ...r,
          bloqueante: true,
          motivoBloqueio: r.status === 'BAIXADA' ? 'Fraude Regularizada/Baixada' : 'Bloqueio Compulsório por Fraude',
          versaoPolitica: 'N/A',
        };
      }

      if (r.tipoCodigo === 'BLOQUEIO_JUDICIAL') {
        return {
          ...r,
          bloqueante: true,
          motivoBloqueio: r.status === 'BAIXADA' ? 'Bloqueio Judicial Baixado' : 'Bloqueio Judicial Mandatório',
          versaoPolitica: 'N/A',
        };
      }

      if (r.tipoCodigo === 'INADIMPLENCIA') {
        const partesData = (r.dataOcorrencia || '').split('T')[0].split('-');
        let dataOcorr: Date;
        if (partesData.length === 3) {
          dataOcorr = new Date(Number(partesData[0]), Number(partesData[1]) - 1, Number(partesData[2]), 23, 59, 59);
        } else {
          dataOcorr = new Date(r.dataOcorrencia || agora);
        }

        const politicaDaEpoca = politicas.find((p) => {
          const inicio = new Date(p.vigenciaInicio);
          const fim = p.vigenciaFim ? new Date(p.vigenciaFim) : new Date(8640000000000000);
          return dataOcorr >= inicio && dataOcorr <= fim;
        }) || politicaPadrao;

        const diffTempo = agora.getTime() - dataOcorr.getTime();
        const diasAtraso = Math.max(0, Math.floor(diffTempo / (1000 * 60 * 60 * 24)));
        const idKey = r.clienteId || r.clienteNome || 'unknown';

        const valorAvaliado = r.status === 'ATIVA'
          ? (acumuladoAtivoPorCliente.get(idKey) || Number(r.valor) || 0)
          : (Number(r.valor) || 0);

        const excedeTeto = valorAvaliado > politicaDaEpoca.tetoInadimplencia;
        const excedePrazo = diasAtraso > politicaDaEpoca.diasAtrasoMaximo;
        const eBloqueante = excedeTeto || excedePrazo;

        let detalhe = 'Dentro do limite tolerado da política';
        if (excedeTeto && excedePrazo) {
          detalhe = `Excede Teto (R$ ${politicaDaEpoca.tetoInadimplencia.toLocaleString('pt-BR')}) e Prazo (${politicaDaEpoca.diasAtrasoMaximo}d)`;
        } else if (excedeTeto) {
          detalhe = `Excede Teto de R$ ${politicaDaEpoca.tetoInadimplencia.toLocaleString('pt-BR')}`;
        } else if (excedePrazo) {
          detalhe = `Atraso (${diasAtraso}d) excede tolerância de ${politicaDaEpoca.diasAtrasoMaximo}d`;
        }

        if (r.status === 'BAIXADA') {
          detalhe = `${detalhe} (Baixada)`;
        }

        return {
          ...r,
          bloqueante: eBloqueante,
          motivoBloqueio: detalhe,
          versaoPolitica: politicaDaEpoca.versao || 'v1.0',
        };
      }

      return { ...r, bloqueante: false, motivoBloqueio: 'Sem restrição impeditiva', versaoPolitica: 'N/A' };
    });
  }, [listaSeguraRestricoes, politicas]);

  const aplicarAtalhoPeriodo = (atalho: 'todos' | 'hoje' | '7dias' | 'mes' | 'ano') => {
    setAtalhoAtivo(atalho);
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    const hojeFormatado = `${ano}-${mes}-${dia}`;

    if (atalho === 'todos') {
      setDataInicio('');
      setDataFim('');
      return;
    }
    if (atalho === 'hoje') {
      setDataInicio(hojeFormatado);
      setDataFim(hojeFormatado);
      return;
    }
    if (atalho === '7dias') {
      const d7 = new Date();
      d7.setDate(hoje.getDate() - 7);
      const a7 = d7.getFullYear();
      const m7 = String(d7.getMonth() + 1).padStart(2, '0');
      const dia7 = String(d7.getDate()).padStart(2, '0');
      setDataInicio(`${a7}-${m7}-${dia7}`);
      setDataFim(hojeFormatado);
      return;
    }
    if (atalho === 'mes') {
      setDataInicio(`${ano}-${mes}-01`);
      setDataFim(hojeFormatado);
      return;
    }
    if (atalho === 'ano') {
      setDataInicio(`${ano}-01-01`);
      setDataFim(hojeFormatado);
      return;
    }
  };

  const limparFiltros = () => {
    setBusca('');
    setTipoPessoaFiltro('TODOS');
    setTipoFiltro('TODOS');
    setStatusFiltro('ATIVA');
    setBloqueioFiltro('TODOS');
    setDataInicio('');
    setDataFim('');
    setAtalhoAtivo('todos');
    setPaginaAtual(1);
    setGruposExpandidos(new Set());
  };

  // Filtragem combinada resiliente com suporte ao tipo PF/PJ
  const restricoesFiltradas = useMemo(() => {
    const termoBusca = busca.trim().toLowerCase();
    const termoAlfanumerico = busca.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    return restricoesAuditadas.filter((r) => {
      if (!r) return false;
      const documentoCliente = obterDocCliente(r);
      const docLimpo = documentoCliente.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

      const matchNome = (r.clienteNome || '').toLowerCase().includes(termoBusca);
      const matchTipo = (r.tipoCodigo || '').toLowerCase().includes(termoBusca);
      const matchDocumento =
        (documentoCliente && documentoCliente.toLowerCase().includes(termoBusca)) ||
        (termoAlfanumerico.length > 0 && docLimpo.includes(termoAlfanumerico));

      const atendeBusca = !termoBusca || matchNome || matchTipo || matchDocumento;
      const atendeTipo = tipoFiltro === 'TODOS' || r.tipoCodigo === tipoFiltro;
      const atendeStatus = statusFiltro === 'TODOS' || r.status === statusFiltro;

      const tipoPessoa = obterTipoPessoaCliente(r);
      const atendeTipoPessoa = tipoPessoaFiltro === 'TODOS' || tipoPessoa === tipoPessoaFiltro;

      let atendeBloqueio = true;
      if (!situacaoRiscoDesabilitada) {
        if (bloqueioFiltro === 'BLOQUEIO_INADIMPLENCIA') {
          atendeBloqueio = r.tipoCodigo === 'INADIMPLENCIA' && r.bloqueante;
        } else if (bloqueioFiltro === 'BLOQUEIO_CRITICO') {
          atendeBloqueio = r.tipoCodigo === 'FRAUDE' || r.tipoCodigo === 'BLOQUEIO_JUDICIAL';
        } else if (bloqueioFiltro === 'TOLERADO') {
          atendeBloqueio = r.tipoCodigo === 'INADIMPLENCIA' && !r.bloqueante;
        }
      }

      let atendeData = true;
      if (dataInicio && r.dataOcorrencia && r.dataOcorrencia < dataInicio) atendeData = false;
      if (dataFim && r.dataOcorrencia && r.dataOcorrencia > dataFim) atendeData = false;

      return atendeBusca && atendeTipoPessoa && atendeTipo && atendeStatus && atendeBloqueio && atendeData;
    });
  }, [restricoesAuditadas, mapaClientes, mapaClientesPorNome, busca, tipoPessoaFiltro, tipoFiltro, statusFiltro, bloqueioFiltro, situacaoRiscoDesabilitada, dataInicio, dataFim]);

  // Agrupamento dos apontamentos filtrados por Cliente + Tipo + Status + Vigência Normativa
  const gruposFiltrados = useMemo<GrupoRestricaoAuditada[]>(() => {
    const mapa = new Map<string, GrupoRestricaoAuditada>();

    restricoesFiltradas.forEach((r) => {
      const doc = obterDocCliente(r);
      const tipoPessoa = obterTipoPessoaCliente(r);
      const idKey = r.clienteId || r.clienteNome || 'unknown';
      const versaoPol = r.versaoPolitica || 'padrao';

      // Chave de agrupamento: agrega itens sob a mesma política/período, status e classificação
      const chave = `${idKey}_${r.tipoCodigo}_${r.status}_${versaoPol}`;

      if (!mapa.has(chave)) {
        mapa.set(chave, {
          idGrupo: chave,
          clienteId: r.clienteId,
          clienteNome: r.clienteNome,
          tipoCodigo: r.tipoCodigo,
          status: r.status,
          valorTotal: Number(r.valor) || 0,
          dataOcorrencia: r.dataOcorrencia || '',
          bloqueante: r.bloqueante,
          motivoBloqueio: r.motivoBloqueio,
          versaoPolitica: r.versaoPolitica,
          tipoPessoa,
          documento: doc,
          itens: [r],
        });
      } else {
        const grupo = mapa.get(chave)!;
        grupo.valorTotal += Number(r.valor) || 0;
        grupo.itens.push(r);

        if ((r.dataOcorrencia || '') > (grupo.dataOcorrencia || '')) {
          grupo.dataOcorrencia = r.dataOcorrencia || '';
        }

        if (r.bloqueante) {
          grupo.bloqueante = true;
          grupo.motivoBloqueio = r.motivoBloqueio;
        }
      }
    });

    return Array.from(mapa.values());
  }, [restricoesFiltradas, mapaClientes, mapaClientesPorNome]);

  // Ordenação dinâmica sobre os grupos consolidados
  const gruposOrdenados = useMemo(() => {
    return [...gruposFiltrados].sort((a, b) => {
      let valorA: any = a[campoOrdenacao as keyof GrupoRestricaoAuditada];
      let valorB: any = b[campoOrdenacao as keyof GrupoRestricaoAuditada];

      if (campoOrdenacao === 'valor') {
        valorA = a.valorTotal || 0;
        valorB = b.valorTotal || 0;
      } else if (campoOrdenacao === 'situacaoRisco') {
        valorA = a.bloqueante ? 1 : 0;
        valorB = b.bloqueante ? 1 : 0;
      } else {
        valorA = (valorA || '').toString().toLowerCase();
        valorB = (valorB || '').toString().toLowerCase();
      }

      if (valorA < valorB) return ordemAsc ? -1 : 1;
      if (valorA > valorB) return ordemAsc ? 1 : -1;
      return 0;
    });
  }, [gruposFiltrados, campoOrdenacao, ordemAsc]);

  const totalPaginas = Math.ceil(gruposOrdenados.length / itensPorPagina) || 1;
  const gruposPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return gruposOrdenados.slice(inicio, inicio + itensPorPagina);
  }, [gruposOrdenados, paginaAtual]);

  const alternarOrdenacao = (campo: CampoOrdenacao) => {
    if (campoOrdenacao === campo) {
      setOrdemAsc(!ordemAsc);
    } else {
      setCampoOrdenacao(campo);
      setOrdemAsc(true);
    }
    setPaginaAtual(1);
  };

  // Métricas
  const totalFiltradas = restricoesFiltradas.length;
  const ativasFiltradas = restricoesFiltradas.filter((r) => r?.status === 'ATIVA');
  const baixadasFiltradas = restricoesFiltradas.filter((r) => r?.status === 'BAIXADA');

  const volumeInadimplenciaAtiva = ativasFiltradas
    .filter((r) => r?.tipoCodigo === 'INADIMPLENCIA')
    .reduce((acc, r) => acc + (r?.valor || 0), 0);

  const bloqueiosInadimplencia = restricoesFiltradas.filter(
    (r) => r?.tipoCodigo === 'INADIMPLENCIA' && r.bloqueante
  );
  const totalBloqueiosInadimplencia = bloqueiosInadimplencia.length;
  const volumeBloqueadoInadimplencia = bloqueiosInadimplencia.reduce((acc, r) => acc + (r?.valor || 0), 0);

  const totalFraudesAtivas = ativasFiltradas.filter((r) => r?.tipoCodigo === 'FRAUDE').length;
  const totalJudiciaisAtivas = ativasFiltradas.filter((r) => r?.tipoCodigo === 'BLOQUEIO_JUDICIAL').length;

  const taxaRegularizacao = totalFiltradas > 0
    ? ((baixadasFiltradas.length / totalFiltradas) * 100).toFixed(1)
    : '0.0';

  const valorTotalTabela = restricoesFiltradas.reduce((acc, r) => acc + (r?.valor || 0), 0);

  const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
      .format(valor || 0)
      .replace(/\u00A0/g, ' ');

  // Exportação CSV com a Coluna de Versão de Política
  const exportarCSV = () => {
    const cabecalho = ['Cliente', 'Tipo Proponente', 'Documento', 'Tipo', 'Valor (R$)', 'Data Ocorrencia', 'Status', 'Impacto Concessao', 'Versao Politica', 'Motivo Discriminado'];
    const linhas = restricoesFiltradas.map((r) => {
      const doc = formatarCpfCnpj(obterDocCliente(r));
      const tipoPessoa = obterTipoPessoaCliente(r);
      const statusImpacto = r.bloqueante ? 'BLOQUEANTE' : 'TOLERADO';
      return [
        `"${r.clienteNome || 'Cliente'}"`,
        `"${tipoPessoa}"`,
        `"${doc}"`,
        `"${r.tipoCodigo}"`,
        (r.valor || 0).toFixed(2),
        `"${formatarDataBR(r.dataOcorrencia)}"`,
        `"${r.status}"`,
        `"${statusImpacto}"`,
        `"${r.versaoPolitica || '-'}"`,
        `"${r.motivoBloqueio || '-'}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [cabecalho.join(';'), ...linhas.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_banestes_restricoes_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Impressão A4 com a Coluna de Política Aplicada
  // Impressão A4 / PDF com Agregação e Composição Detalhada
  const imprimirRelatorioCompleto = () => {
    const dataHoraEmissao = new Date().toLocaleString('pt-BR');
    const periodoTexto = (dataInicio || dataFim)
      ? `${formatarDataBR(dataInicio) || 'Início'} até ${formatarDataBR(dataFim) || 'Hoje'}`
      : 'Todo o Histórico';

    const linhasHtml = gruposOrdenados.map((g) => {
      const doc = formatarCpfCnpj(g.documento) || '-';
      const valorTotalBRL = formatarMoeda(g.valorTotal || 0);
      const statusColor = g.status === 'ATIVA' ? '#b45309' : '#00874c';
      const impactoBadge = g.bloqueante
        ? '<span style="color:#b91c1c; font-weight:bold;">BLOQUEANTE</span>'
        : '<span style="color:#00874c; font-weight:bold;">Tolerado</span>';
      const versaoTexto = g.versaoPolitica && g.versaoPolitica !== 'N/A' ? g.versaoPolitica : '—';
      const temMultiplos = g.itens.length > 1;

      // Sub-bloco visual impresso que detalha os lançamentos somados
      const subLancamentosHtml = temMultiplos
        ? `
          <div style="margin-top: 4px; padding: 3px 5px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; text-align: left;">
            <div style="font-size: 7.5px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 2px;">
              Lançamentos Somados (${g.itens.length}x):
            </div>
            ${g.itens.map((it) => `
              <div style="display: flex; justify-content: space-between; gap: 8px; font-size: 8px; font-family: monospace; color: #334155;">
                <span>• ${formatarDataBR(it.dataOcorrencia)}:</span>
                <span style="font-weight: 600;">${formatarMoeda(it.valor || 0)}</span>
              </div>
            `).join('')}
          </div>
        `
        : '';

      return `
        <tr>
          <td style="vertical-align: top;">
            <strong>${g.clienteNome || 'Cliente'}</strong> 
            <span style="font-size: 8px; color: #64748b;">(${g.tipoPessoa})</span>
          </td>
          <td style="font-family: monospace; vertical-align: top;">${doc}</td>
          <td style="vertical-align: top;">${g.tipoCodigo}</td>
          <td style="text-align: right; vertical-align: top; min-width: 130px;">
            <div style="font-weight: bold; font-family: monospace; font-size: 10px;">
              ${valorTotalBRL}
              ${temMultiplos ? `<span style="font-size: 8px; background: #e2e8f0; padding: 1px 3px; border-radius: 3px; margin-left: 2px;">${g.itens.length}x</span>` : ''}
            </div>
            ${subLancamentosHtml}
          </td>
          <td style="text-align: center; vertical-align: top;">${formatarDataBR(g.dataOcorrencia)}</td>
          <td style="text-align: center; font-weight: bold; color: ${statusColor}; vertical-align: top;">${g.status}</td>
          <td style="text-align: center; vertical-align: top;">${impactoBadge}</td>
          <td style="text-align: center; font-family: monospace; font-weight: bold; color: #004b87; vertical-align: top;">${versaoTexto}</td>
          <td style="font-size: 9px; color: #475569; vertical-align: top;">${g.motivoBloqueio || '-'}</td>
        </tr>
      `;
    }).join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups para imprimir o relatório.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Relatório Executivo de Risco - Banestes</title>
        <style>
          @page { size: A4 landscape; margin: 8mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #081c30; margin: 0; padding: 10px; font-size: 9.5px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2.5px solid #004b87; padding-bottom: 8px; margin-bottom: 10px; }
          .header h1 { font-size: 17px; margin: 0; color: #002855; font-weight: 700; letter-spacing: -0.5px; }
          .header p { margin: 2px 0 0; color: #64748b; font-size: 9.5px; }
          .kpis { display: flex; gap: 8px; margin-bottom: 10px; }
          .kpi-box { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 7px; background: #f8fafc; }
          .kpi-title { font-size: 8.5px; text-transform: uppercase; color: #64748b; font-weight: bold; }
          .kpi-value { font-size: 13.5px; font-weight: bold; margin-top: 2px; color: #081c30; }
          .filtros { font-size: 9px; background: #e8f3fa; padding: 5px 8px; border-radius: 4px; margin-bottom: 10px; color: #002855; border: 1px solid #cbd5e1; }
          table { width: 100%; border-collapse: collapse; font-size: 9px; }
          th { background: #f1f5f9; text-align: left; padding: 6px 8px; border-bottom: 1.5px solid #cbd5e1; font-size: 8.5px; text-transform: uppercase; color: #002855; }
          td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) td { background-color: #fbfcfe; }
          .tfoot td { font-weight: bold; background: #e8f3fa; border-top: 2px solid #004b87; font-size: 10px; color: #002855; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>BANESTES • RISK & COMPLIANCE</h1>
            <p>Relatório Analítico de Apontamentos, Restrições e Auditoria de Bloqueios</p>
          </div>
          <div style="text-align: right; font-size: 9.5px; color: #64748b;">
            Emissão: ${dataHoraEmissao}<br />
            Total: ${gruposOrdenados.length} ocorrências consolidadas (${restricoesFiltradas.length} itens)
          </div>
        </div>

        <div class="filtros">
          <strong>Filtros Aplicados:</strong> Período: ${periodoTexto} | Proponente: ${tipoPessoaFiltro} | Tipo: ${tipoFiltro} | Status: ${statusFiltro} | Risco: ${bloqueioFiltro} | Busca: ${busca || 'Nenhuma'}
        </div>

        <div class="kpis">
          <div class="kpi-box">
            <div class="kpi-title">Exposição Total Ativa</div>
            <div class="kpi-value">${formatarMoeda(volumeInadimplenciaAtiva)}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-title">Bloqueios por Inadimplência</div>
            <div class="kpi-value" style="color: #b91c1c;">${totalBloqueiosInadimplencia} (${formatarMoeda(volumeBloqueadoInadimplencia)})</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-title">Fraudes / Judiciais</div>
            <div class="kpi-value" style="color: #7c3aed;">${totalFraudesAtivas + totalJudiciaisAtivas}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-title">Taxa Regularização</div>
            <div class="kpi-value" style="color: #00874c;">${taxaRegularizacao}%</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Documento</th>
              <th>Classificação</th>
              <th style="text-align: right;">Valor</th>
              <th style="text-align: center;">Ocorrência</th>
              <th style="text-align: center;">Status</th>
              <th style="text-align: center;">Impacto</th>
              <th style="text-align: center;">Política</th>
              <th>Discriminação Técnica</th>
            </tr>
          </thead>
          <tbody>
            ${linhasHtml || '<tr><td colspan="9" style="text-align: center; padding: 20px;">Nenhum registro encontrado.</td></tr>'}
          </tbody>
          <tfoot>
            <tr class="tfoot">
              <td colspan="3">TOTAL GERAL FILTRADO (${restricoesFiltradas.length} itens em ${gruposOrdenados.length} registros consolidados)</td>
              <td style="text-align: right; color: #004b87;">${formatarMoeda(valorTotalTabela)}</td>
              <td colspan="5"></td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
  
  return (
    <div className="space-y-6 font-sans">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-left">
          <h2 className="font-poppins text-xl font-bold text-slate-800 tracking-tight">Relatórios</h2>
          <p className="text-sm text-slate-500">
            Painel Analítico de Apontamentos e Auditoria de Bloqueios de Crédito.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={carregarDados}
            className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs font-sans"
            title="Recarregar dados"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar
          </button>
          <button
            onClick={exportarCSV}
            className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs font-sans"
          >
            <svg className="w-3.5 h-3.5 text-[#00874c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar CSV
          </button>
          <button
            onClick={imprimirRelatorioCompleto}
            className="px-3 py-2 bg-[#081c30] hover:bg-[#002855] text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs font-poppins"
          >
            <svg className="w-3.5 h-3.5 text-[#009ee3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* 1. SEÇÃO DE FILTROS E BUSCA */}
      <section className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs space-y-4 text-left">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-poppins font-semibold text-slate-500 uppercase mr-1 text-[11px]">Período:</span>
            {[
              { id: 'todos', label: 'Todo o Histórico' },
              { id: 'hoje', label: 'Hoje' },
              { id: '7dias', label: 'Últimos 7 dias' },
              { id: 'mes', label: 'Este Mês' },
              { id: 'ano', label: 'Este Ano' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => aplicarAtalhoPeriodo(btn.id as any)}
                className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
                  atalhoAtivo === btn.id
                    ? 'bg-[#004b87] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <button
            onClick={limparFiltros}
            className="text-xs text-[#004b87] hover:text-[#003a6b] font-medium transition-colors"
          >
            Limpar Todos os Filtros
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="block text-[11px] font-poppins font-semibold text-slate-500 uppercase mb-1">
              Busca Global
            </label>
            <input
              type="text"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPaginaAtual(1);
              }}
              placeholder="Pesquisar por cliente, CPF/CNPJ ou tipo..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all"
            />
          </div>

          <div className="min-w-0">
            <label className="block text-[11px] font-poppins font-semibold text-slate-500 uppercase mb-1">
              Proponente
            </label>
            <select
              value={tipoPessoaFiltro}
              onChange={(e) => {
                setTipoPessoaFiltro(e.target.value);
                setPaginaAtual(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all font-medium"
            >
              <option value="TODOS">Todos (PF/PJ)</option>
              <option value="PF">Pessoa Física (PF)</option>
              <option value="PJ">Pessoa Jurídica (PJ)</option>
            </select>
          </div>

          <div className="min-w-0">
            <label className="block text-[11px] font-poppins font-semibold text-slate-500 uppercase mb-1">
              Classificação
            </label>
            <select
              value={tipoFiltro}
              onChange={(e) => lidarMudancaTipoFiltro(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all"
            >
              <option value="TODOS">Todos os Tipos</option>
              <option value="FRAUDE">Fraude</option>
              <option value="INADIMPLENCIA">Inadimplência</option>
              <option value="BLOQUEIO_JUDICIAL">Bloqueio Judicial</option>
            </select>
          </div>

          <div className="min-w-0">
            <label className="block text-[11px] font-poppins font-semibold text-slate-500 uppercase mb-1">
              Situação de Risco
            </label>
            <select
              disabled={situacaoRiscoDesabilitada}
              value={bloqueioFiltro}
              onChange={(e) => {
                setBloqueioFiltro(e.target.value);
                setPaginaAtual(1);
              }}
              className={`w-full px-3 py-2 rounded-lg text-xs transition-all font-medium border ${
                situacaoRiscoDesabilitada
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed select-none'
                  : 'bg-slate-50 border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white'
              }`}
            >
              {opcoesSituacaoRisco.map((opt) => (
                <option key={opt.valor} value={opt.valor}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label className="block text-[11px] font-poppins font-semibold text-slate-500 uppercase mb-1">
              Status Operacional
            </label>
            <select
              value={statusFiltro}
              onChange={(e) => {
                setStatusFiltro(e.target.value);
                setPaginaAtual(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all font-semibold text-[#004b87]"
            >
              <option value="ATIVA">Ativa (Vigente)</option>
              <option value="BAIXADA">Baixada (Regularizada)</option>
              <option value="TODOS">Todos os Status</option>
            </select>
          </div>

          <div className="min-w-0">
            <label className="block text-[11px] font-poppins font-semibold text-slate-500 uppercase mb-1">
              Período (Início)
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => {
                setDataInicio(e.target.value);
                setAtalhoAtivo('');
                setPaginaAtual(1);
              }}
              className="w-full min-w-0 px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all"
            />
          </div>
        </div>
      </section>

      {carregando ? (
        <div className="bg-white border border-slate-200 rounded-xl p-16 text-center text-slate-400">
          <div className="inline-block w-8 h-8 border-3 border-[#004b87] border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm font-medium">A processar dados analíticos do Banestes...</p>
        </div>
      ) : (
        <>
          {/* 2. INDICADORES RESUMIDOS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left">
            <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs">
              <span className="font-poppins text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Exposição Financeira
              </span>
              <p className="font-poppins text-2xl font-bold text-[#081c30] mt-2">{formatarMoeda(volumeInadimplenciaAtiva)}</p>
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-block mt-2 font-mono">
                {ativasFiltradas.filter((r) => r.tipoCodigo === 'INADIMPLENCIA').length} inadimplências ativas
              </span>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs">
              <span className="font-poppins text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Bloqueios por Inadimplência
              </span>
              <p className="font-poppins text-2xl font-bold text-red-700 mt-2">{totalBloqueiosInadimplencia}</p>
              <p className="text-xs text-red-600 mt-2 font-medium">
                {formatarMoeda(volumeBloqueadoInadimplencia)} retidos por estourar teto/prazo
              </p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs">
              <span className="font-poppins text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Ocorrências Críticas
              </span>
              <p className="font-poppins text-2xl font-bold text-purple-700 mt-2">{totalFraudesAtivas + totalJudiciaisAtivas}</p>
              <p className="text-xs text-slate-500 mt-2">
                {totalFraudesAtivas} fraudes e {totalJudiciaisAtivas} ordens judiciais
              </p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs">
              <span className="font-poppins text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Taxa de Regularização
              </span>
              <p className="font-poppins text-2xl font-bold text-[#00874c] mt-2">{taxaRegularizacao}%</p>
              <p className="text-xs text-slate-500 mt-2">
                {baixadasFiltradas.length} de {totalFiltradas} ocorrências baixadas
              </p>
            </div>
          </div>

          {/* 3. TABELA DETALHADA COM AGREGAÇÃO DE OCORRÊNCIAS E EXPANSÃO */}
          <section className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden text-left">
            <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-poppins text-base font-bold text-slate-800 tracking-tight">Registros Detalhados da Auditoria</h3>
                <p className="text-sm text-slate-500">
                  Exibindo {gruposPaginados.length} de {gruposOrdenados.length} ocorrências consolidadas ({restricoesFiltradas.length} apontamentos individuais).
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th
                      onClick={() => alternarOrdenacao('clienteNome')}
                      className="px-6 py-3.5 cursor-pointer hover:text-slate-800 select-none font-poppins"
                    >
                      <div className="flex items-center gap-1">
                        Cliente
                        {campoOrdenacao === 'clienteNome' && (ordemAsc ? ' ▲' : ' ▼')}
                      </div>
                    </th>
                    <th
                      onClick={() => alternarOrdenacao('tipoCodigo')}
                      className="px-6 py-3.5 cursor-pointer hover:text-slate-800 select-none font-poppins"
                    >
                      <div className="flex items-center gap-1">
                        Tipo
                        {campoOrdenacao === 'tipoCodigo' && (ordemAsc ? ' ▲' : ' ▼')}
                      </div>
                    </th>
                    <th
                      onClick={() => alternarOrdenacao('valor')}
                      className="px-6 py-3.5 cursor-pointer hover:text-slate-800 select-none font-poppins"
                    >
                      <div className="flex items-center gap-1">
                        Valor
                        {campoOrdenacao === 'valor' && (ordemAsc ? ' ▲' : ' ▼')}
                      </div>
                    </th>
                    <th
                      onClick={() => alternarOrdenacao('dataOcorrencia')}
                      className="px-6 py-3.5 cursor-pointer hover:text-slate-800 select-none font-poppins"
                    >
                      <div className="flex items-center gap-1">
                        Ocorrência
                        {campoOrdenacao === 'dataOcorrencia' && (ordemAsc ? ' ▲' : ' ▼')}
                      </div>
                    </th>
                    <th
                      onClick={() => alternarOrdenacao('status')}
                      className="px-6 py-3.5 cursor-pointer hover:text-slate-800 select-none font-poppins text-center w-24"
                    >
                      <div className="flex items-center justify-center gap-1">
                        Status
                        {campoOrdenacao === 'status' && (ordemAsc ? ' ▲' : ' ▼')}
                      </div>
                    </th>
                    <th
                      onClick={() => alternarOrdenacao('situacaoRisco')}
                      className="px-6 py-3.5 cursor-pointer hover:text-slate-800 select-none font-poppins"
                    >
                      <div className="flex items-center gap-1">
                        Impacto na Concessão
                        {campoOrdenacao === 'situacaoRisco' && (ordemAsc ? ' ▲' : ' ▼')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {gruposPaginados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        <p className="font-poppins text-base font-semibold text-slate-600">Nenhum registro encontrado</p>
                        <p className="text-xs text-slate-400 mt-1">Tente ajustar os filtros ou selecionar "Todos os Status" para visualizar o histórico de baixadas.</p>
                        <button
                          onClick={limparFiltros}
                          className="mt-3 px-3 py-1.5 bg-[#e8f3fa] text-[#004b87] hover:bg-[#004b87] hover:text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          Redefinir Filtros
                        </button>
                      </td>
                    </tr>
                  ) : (
                    gruposPaginados.map((g) => {
                      const isAtiva = g.status === 'ATIVA';
                      const temMultiplos = g.itens.length > 1;
                      const expandido = gruposExpandidos.has(g.idGrupo);

                      return (
                        <tr key={g.idGrupo} className="hover:bg-[#e8f3fa]/20 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-800 align-top">
                            <div className="flex items-center gap-2">
                              <span>{g.clienteNome || 'Cliente'}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                {g.tipoPessoa}
                              </span>
                            </div>
                            {g.documento && (
                              <span className="block text-xs font-normal text-slate-400 font-mono mt-0.5">
                                Documento: {formatarCpfCnpj(g.documento)}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-semibold align-top">
                            <span
                              className={`inline-block px-2 py-0.5 text-xs rounded border ${
                                g.tipoCodigo === 'FRAUDE'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : g.tipoCodigo === 'BLOQUEIO_JUDICIAL'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {g.tipoCodigo}
                            </span>
                          </td>

                          {/* COLUNA DE VALOR COM CAIXA DE EXPANSÃO NÍTIDA E ESPAÇOSA */}
                          <td className="px-6 py-4 text-slate-900 font-medium align-top">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-900 font-mono text-sm whitespace-nowrap">
                                  {formatarMoeda(g.valorTotal)}
                                </span>
                                {temMultiplos && (
                                  <button
                                    type="button"
                                    onClick={() => alternarExpansao(g.idGrupo)}
                                    className="p-1 text-slate-400 hover:text-[#004b87] hover:bg-[#e8f3fa] rounded-md transition-all cursor-pointer inline-flex items-center justify-center shrink-0"
                                    title={expandido ? 'Ocultar lançamentos individuais' : 'Ver lançamentos que compõem este valor total'}
                                  >
                                    <svg
                                      className={`w-3.5 h-3.5 transform transition-transform duration-200 ${
                                        expandido ? 'rotate-180 text-[#004b87]' : ''
                                      }`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                )}
                                {temMultiplos && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                                    {g.itens.length}x
                                  </span>
                                )}
                              </div>

                              {/* CAIXA DE DRILL-DOWN FORMATADA SEM QUEBRA DE LINHAS */}
                              {temMultiplos && expandido && (
                                <div className="mt-2.5 min-w-[215px] bg-slate-50/95 border border-slate-200/90 rounded-xl p-2.5 shadow-2xs text-left animate-in fade-in duration-150">
                                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-poppins">
                                    <span>Lançamentos</span>
                                    <span>Subtotal</span>
                                  </div>
                                  <div className="space-y-1">
                                    {g.itens.map((item, idx) => (
                                      <div
                                        key={item.id || idx}
                                        className="flex items-center justify-between gap-3 text-xs py-0.5 font-mono"
                                      >
                                        <span className="text-slate-600 text-[11px] whitespace-nowrap">
                                          {formatarDataBR(item.dataOcorrencia)}
                                        </span>
                                        <span className="font-bold text-slate-800 text-[11px] whitespace-nowrap">
                                          {formatarMoeda(item.valor || 0)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-4 text-slate-700 font-mono text-xs font-medium align-top">
                            {formatarDataBR(g.dataOcorrencia)}
                          </td>
                          <td className="px-6 py-4 text-center align-top">
                            <span
                              className={`w-[78px] h-6 inline-flex items-center justify-center text-[11px] font-bold rounded-md border tracking-wide font-sans text-center ${
                                isAtiva
                                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                                  : 'bg-emerald-100 text-[#00874c] border-emerald-200'
                              }`}
                            >
                              {g.status}
                            </span>
                          </td>

                          {/* IMPACTO NA CONCESSÃO COM BADGE DA POLÍTICA APLICADA */}
                          <td className="px-6 py-4 align-top">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {g.bloqueante ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-300 font-bold text-[10px] uppercase font-poppins">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                                    Bloqueante
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px] uppercase font-poppins">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    Tolerado
                                  </span>
                                )}

                                {/* TAG DA VERSÃO DA POLÍTICA */}
                                {g.versaoPolitica && g.versaoPolitica !== 'N/A' && (
                                  <span
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#e8f3fa] text-[#004b87] border border-[#004b87]/20 font-mono"
                                    title="Versão da Política de Risco aplicada à época desta ocorrência"
                                  >
                                    Política {g.versaoPolitica}
                                  </span>
                                )}
                              </div>

                              <span
                                className={`block text-[11px] font-medium mt-0.5 ${
                                  g.bloqueante ? 'text-red-700' : 'text-slate-500'
                                }`}
                              >
                                {g.motivoBloqueio}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Totalizador no Rodapé */}
                {restricoesFiltradas.length > 0 && (
                  <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-semibold text-slate-800 text-xs">
                    <tr>
                      <td className="px-6 py-3.5 uppercase tracking-wider text-slate-500 font-poppins">
                        Total Filtrado ({restricoesFiltradas.length} itens)
                      </td>
                      <td className="px-6 py-3.5"></td>
                      <td className="px-6 py-3.5 text-[#004b87] font-bold text-sm font-poppins">
                        {formatarMoeda(valorTotalTabela)}
                      </td>
                      <td className="px-6 py-3.5" colSpan={3}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Página <strong className="text-slate-700">{paginaAtual}</strong> de{' '}
                  <strong className="text-slate-700">{totalPaginas}</strong>
                </span>
                <div className="flex gap-1.5">
                  <button
                    disabled={paginaAtual === 1}
                    onClick={() => setPaginaAtual((p) => Math.max(p - 1, 1))}
                    className="px-3 py-1 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={paginaAtual === totalPaginas}
                    onClick={() => setPaginaAtual((p) => Math.min(p + 1, totalPaginas))}
                    className="px-3 py-1 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Seguinte
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};