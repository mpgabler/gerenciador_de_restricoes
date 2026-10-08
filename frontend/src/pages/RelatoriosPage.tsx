import React, { useState, useEffect, useMemo } from 'react';
import { restricaoService, type RestricaoResponseDTO } from '../services/restricaoService';
import { clienteService, type Cliente } from '../services/clienteService';

type CampoOrdenacao = 'clienteNome' | 'tipoCodigo' | 'valor' | 'dataOcorrencia' | 'status';

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

export const RelatoriosPage: React.FC = () => {
  const [restricoes, setRestricoes] = useState<RestricaoResponseDTO[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);

  // 1. Estados de Filtros e Busca
  const [busca, setBusca] = useState<string>('');
  const [tipoFiltro, setTipoFiltro] = useState<string>('TODOS');
  const [statusFiltro, setStatusFiltro] = useState<string>('TODOS');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [atalhoAtivo, setAtalhoAtivo] = useState<string>('todos');

  // 2. Estados da Tabela (Ordenação e Paginação)
  const [campoOrdenacao, setCampoOrdenacao] = useState<CampoOrdenacao>('dataOcorrencia');
  const [ordemAsc, setOrdemAsc] = useState<boolean>(false);
  const [paginaAtual, setPaginaAtual] = useState<number>(1);
  const itensPorPagina = 5;

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const [resRestricoes, resClientes] = await Promise.all([
        restricaoService.listarTodas ? restricaoService.listarTodas().catch(() => []) : Promise.resolve([]),
        clienteService.listarTodos().catch(() => []),
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
    } catch (e) {
      console.error('Falha ao carregar relatórios:', e);
      setRestricoes([]);
      setClientes([]);
    } finally {
      setCarregando(false);
    }
  };

  const listaSeguraClientes = useMemo(() => (Array.isArray(clientes) ? clientes : []), [clientes]);
  const listaSeguraRestricoes = useMemo(() => (Array.isArray(restricoes) ? restricoes : []), [restricoes]);

  // Mapeamento rápido de clientes por ID e por Nome
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

  // Atalhos rápidos de data
  const aplicarAtalhoPeriodo = (atalho: 'todos' | 'hoje' | '7dias' | 'mes' | 'ano') => {
    setAtalhoAtivo(atalho);
    const hoje = new Date();
    const hojeFormatado = hoje.toISOString().split('T')[0];

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
      setDataInicio(d7.toISOString().split('T')[0]);
      setDataFim(hojeFormatado);
      return;
    }

    if (atalho === 'mes') {
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      setDataInicio(inicioMes.toISOString().split('T')[0]);
      setDataFim(hojeFormatado);
      return;
    }

    if (atalho === 'ano') {
      const inicioAno = new Date(hoje.getFullYear(), 0, 1);
      setDataInicio(inicioAno.toISOString().split('T')[0]);
      setDataFim(hojeFormatado);
      return;
    }
  };

  const limparFiltros = () => {
    setBusca('');
    setTipoFiltro('TODOS');
    setStatusFiltro('TODOS');
    setDataInicio('');
    setDataFim('');
    setAtalhoAtivo('todos');
    setPaginaAtual(1);
  };

  // Filtragem combinada resiliente
  const restricoesFiltradas = useMemo(() => {
    const termoBusca = busca.trim().toLowerCase();
    const termoAlfanumerico = busca.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    return listaSeguraRestricoes.filter((r) => {
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

      let atendeData = true;
      if (dataInicio && r.dataOcorrencia && r.dataOcorrencia < dataInicio) atendeData = false;
      if (dataFim && r.dataOcorrencia && r.dataOcorrencia > dataFim) atendeData = false;

      return atendeBusca && atendeTipo && atendeStatus && atendeData;
    });
  }, [listaSeguraRestricoes, mapaClientes, mapaClientesPorNome, busca, tipoFiltro, statusFiltro, dataInicio, dataFim]);

  // Ordenação dinâmica
  const restricoesOrdenadas = useMemo(() => {
    return [...restricoesFiltradas].sort((a, b) => {
      let valorA: any = a[campoOrdenacao];
      let valorB: any = b[campoOrdenacao];

      if (campoOrdenacao === 'valor') {
        valorA = a.valor || 0;
        valorB = b.valor || 0;
      } else {
        valorA = (valorA || '').toString().toLowerCase();
        valorB = (valorB || '').toString().toLowerCase();
      }

      if (valorA < valorB) return ordemAsc ? -1 : 1;
      if (valorA > valorB) return ordemAsc ? 1 : -1;
      return 0;
    });
  }, [restricoesFiltradas, campoOrdenacao, ordemAsc]);

  // Paginação
  const totalPaginas = Math.ceil(restricoesOrdenadas.length / itensPorPagina) || 1;
  const restricoesPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return restricoesOrdenadas.slice(inicio, inicio + itensPorPagina);
  }, [restricoesOrdenadas, paginaAtual]);

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

  const totalFraudesAtivas = ativasFiltradas.filter((r) => r?.tipoCodigo === 'FRAUDE').length;
  const totalJudiciaisAtivas = ativasFiltradas.filter((r) => r?.tipoCodigo === 'BLOQUEIO_JUDICIAL').length;
  const totalInadimplenciasAtivas = ativasFiltradas.filter((r) => r?.tipoCodigo === 'INADIMPLENCIA').length;

  const taxaRegularizacao = totalFiltradas > 0
    ? ((baixadasFiltradas.length / totalFiltradas) * 100).toFixed(1)
    : '0.0';

  const valorTotalTabela = restricoesFiltradas.reduce((acc, r) => acc + (r?.valor || 0), 0);

  const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

  // Exportação CSV
  const exportarCSV = () => {
    const cabecalho = ['Cliente', 'Documento', 'Tipo', 'Valor (R$)', 'Data Ocorrencia', 'Status'];
    const linhas = restricoesFiltradas.map((r) => {
      const doc = formatarCpfCnpj(obterDocCliente(r));
      return [
        `"${r.clienteNome || 'Cliente'}"`,
        `"${doc}"`,
        `"${r.tipoCodigo}"`,
        (r.valor || 0).toFixed(2),
        `"${r.dataOcorrencia || ''}"`,
        `"${r.status}"`,
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

  // Impressão A4
  const imprimirRelatorioCompleto = () => {
    const dataHoraEmissao = new Date().toLocaleString('pt-BR');
    const periodoTexto = (dataInicio || dataFim)
      ? `${dataInicio || 'Início'} até ${dataFim || 'Hoje'}`
      : 'Todo o Histórico';

    const linhasHtml = restricoesFiltradas.map((r) => {
      const doc = formatarCpfCnpj(obterDocCliente(r)) || '-';
      const valorBRL = formatarMoeda(r.valor || 0);
      const statusColor = r.status === 'ATIVA' ? '#b45309' : '#00874c';

      return `
        <tr>
          <td><strong>${r.clienteNome || 'Cliente'}</strong></td>
          <td style="font-family: monospace;">${doc}</td>
          <td>${r.tipoCodigo}</td>
          <td style="text-align: right; font-weight: bold;">${valorBRL}</td>
          <td style="text-align: center;">${r.dataOcorrencia || '—'}</td>
          <td style="text-align: center; font-weight: bold; color: ${statusColor};">${r.status}</td>
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
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #081c30; margin: 0; padding: 12px; font-size: 11px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2.5px solid #004b87; padding-bottom: 8px; margin-bottom: 14px; }
          .header h1 { font-size: 18px; margin: 0; color: #002855; font-weight: 700; letter-spacing: -0.5px; }
          .header p { margin: 2px 0 0; color: #64748b; font-size: 10px; }
          .kpis { display: flex; gap: 8px; margin-bottom: 14px; }
          .kpi-box { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; background: #f8fafc; }
          .kpi-title { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold; }
          .kpi-value { font-size: 15px; font-weight: bold; margin-top: 3px; color: #081c30; }
          .filtros { font-size: 10px; background: #e8f3fa; padding: 6px 10px; border-radius: 4px; margin-bottom: 14px; color: #002855; border: 1px solid #cbd5e1; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          th { background: #f1f5f9; text-align: left; padding: 6px 8px; border-bottom: 1.5px solid #cbd5e1; font-size: 9px; text-transform: uppercase; color: #002855; }
          td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) td { background-color: #f8fafc; }
          .tfoot td { font-weight: bold; background: #e8f3fa; border-top: 2px solid #004b87; font-size: 11px; color: #002855; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>BANESTES • RISK & COMPLIANCE</h1>
            <p>Relatório Analítico de Apontamentos e Restrições de Crédito</p>
          </div>
          <div style="text-align: right; font-size: 10px; color: #64748b;">
            Emissão: ${dataHoraEmissao}<br />
            Total: ${restricoesFiltradas.length} registros
          </div>
        </div>

        <div class="filtros">
          <strong>Filtros Aplicados:</strong> Período: ${periodoTexto} | Classificação: ${tipoFiltro} | Status: ${statusFiltro} | Busca: ${busca || 'Nenhuma'}
        </div>

        <div class="kpis">
          <div class="kpi-box">
            <div class="kpi-title">Exposição Ativa</div>
            <div class="kpi-value">${formatarMoeda(volumeInadimplenciaAtiva)}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-title">Ocorrências Críticas</div>
            <div class="kpi-value" style="color: #b91c1c;">${totalFraudesAtivas + totalJudiciaisAtivas}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-title">Taxa Regularização</div>
            <div class="kpi-value" style="color: #00874c;">${taxaRegularizacao}%</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-title">Total Filtrado</div>
            <div class="kpi-value" style="color: #004b87;">${formatarMoeda(valorTotalTabela)}</div>
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
            </tr>
          </thead>
          <tbody>
            ${linhasHtml || '<tr><td colspan="6" style="text-align: center; padding: 20px;">Nenhum registro encontrado.</td></tr>'}
          </tbody>
          <tfoot>
            <tr class="tfoot">
              <td colspan="3">TOTAL GERAL FILTRADO (${restricoesFiltradas.length} itens)</td>
              <td style="text-align: right; color: #004b87;">${formatarMoeda(valorTotalTabela)}</td>
              <td colspan="2"></td>
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
          <h2 className="font-poppins text-xl font-bold text-slate-800 tracking-tight">Relatórios & Inteligência de Risco</h2>
          <p className="text-sm text-slate-500">
            Painel analítico e auditoria de conformidade financeira das operações.
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
        {/* ATALHOS RÁPIDOS DE DATA */}
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

        {/* INPUTS DE FILTRAGEM */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
              Classificação
            </label>
            <select
              value={tipoFiltro}
              onChange={(e) => {
                setTipoFiltro(e.target.value);
                setPaginaAtual(1);
              }}
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
              Status Operacional
            </label>
            <select
              value={statusFiltro}
              onChange={(e) => {
                setStatusFiltro(e.target.value);
                setPaginaAtual(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="ATIVA">Ativa</option>
              <option value="BAIXADA">Baixada (Regularizada)</option>
            </select>
          </div>

          <div className="min-w-0">
            <label className="block text-[11px] font-poppins font-semibold text-slate-500 uppercase mb-1">
              Início
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

          <div className="min-w-0">
            <label className="block text-[11px] font-poppins font-semibold text-slate-500 uppercase mb-1">
              Fim
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => {
                setDataFim(e.target.value);
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
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-block mt-2">
                Inadimplências ativas no filtro
              </span>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs">
              <span className="font-poppins text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Ocorrências Críticas
              </span>
              <p className="font-poppins text-2xl font-bold text-red-700 mt-2">{totalFraudesAtivas + totalJudiciaisAtivas}</p>
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

            <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs">
              <span className="font-poppins text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Amostra Filtrada
              </span>
              <p className="font-poppins text-2xl font-bold text-[#081c30] mt-2">{totalFiltradas}</p>
              <p className="text-xs text-slate-500 mt-2">
                Total de {listaSeguraClientes.length} clientes cadastrados
              </p>
            </div>
          </div>

          {/* 3. VISUALIZAÇÃO GRÁFICA */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
            <section className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs">
              <h3 className="font-poppins text-base font-bold text-slate-800 mb-1">Distribuição de Restrições Ativas</h3>
              <p className="text-xs text-slate-500 mb-6">Contagem de registros vigentes por classificação de risco no recorte atual.</p>

              <div className="space-y-4 text-sm">
                <div>
                  <div className="flex justify-between font-medium mb-1">
                    <span className="text-slate-700 flex items-center gap-1.5 font-poppins text-xs font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Inadimplências
                    </span>
                    <span className="text-slate-900 font-semibold font-poppins">{totalInadimplenciasAtivas}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div
                      className="bg-amber-500 h-2.5 rounded-full transition-all"
                      style={{
                        width: `${ativasFiltradas.length > 0 ? (totalInadimplenciasAtivas / ativasFiltradas.length) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-medium mb-1">
                    <span className="text-slate-700 flex items-center gap-1.5 font-poppins text-xs font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Fraudes
                    </span>
                    <span className="text-slate-900 font-semibold font-poppins">{totalFraudesAtivas}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div
                      className="bg-red-500 h-2.5 rounded-full transition-all"
                      style={{
                        width: `${ativasFiltradas.length > 0 ? (totalFraudesAtivas / ativasFiltradas.length) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-medium mb-1">
                    <span className="text-slate-700 flex items-center gap-1.5 font-poppins text-xs font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Bloqueios Judiciais
                    </span>
                    <span className="text-slate-900 font-semibold font-poppins">{totalJudiciaisAtivas}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div
                      className="bg-purple-500 h-2.5 rounded-full transition-all"
                      style={{
                        width: `${ativasFiltradas.length > 0 ? (totalJudiciaisAtivas / ativasFiltradas.length) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="font-poppins text-base font-bold text-slate-800 mb-1">Parâmetros das Regras de Negócio</h3>
                <p className="text-xs text-slate-500 mb-4">Critérios normativos avaliados pelo motor de decisão do Banestes.</p>

                <ul className="space-y-3 text-xs text-slate-600">
                  <li className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <strong className="text-[#081c30] font-poppins block text-sm mb-0.5">Política de Fraude & Bloqueio Judicial</strong>
                    Bloqueio compulsório para qualquer proposta caso haja apontamento ativo registrado no CPF/CNPJ.
                  </li>
                  <li className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <strong className="text-[#081c30] font-poppins block text-sm mb-0.5">Teto Financeiro e Temporal de Inadimplência</strong>
                    Bloqueio automático se o montante acumulado for superior a R$ 5.000,00 ou se o atraso exceder 90 dias.
                  </li>
                </ul>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-400 flex justify-between items-center">
                <span>Motor v1.0 • Validação Transacional</span>
                <span className="text-[#00874c] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00874c]"></span>
                  Engine Homologada
                </span>
              </div>
            </section>
          </div>

          {/* 4. TABELA DETALHADA COM ORDENAÇÃO E PAGINAÇÃO */}
          <section className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden text-left">
            <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-poppins text-base font-bold text-slate-800 tracking-tight">Registros Detalhados da Auditoria</h3>
                <p className="text-sm text-slate-500">
                  A exibir {restricoesPaginadas.length} de {restricoesFiltradas.length} apontamentos filtrados.
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
                        Data Ocorrência
                        {campoOrdenacao === 'dataOcorrencia' && (ordemAsc ? ' ▲' : ' ▼')}
                      </div>
                    </th>
                    <th
                      onClick={() => alternarOrdenacao('status')}
                      className="px-6 py-3.5 cursor-pointer hover:text-slate-800 select-none font-poppins"
                    >
                      <div className="flex items-center gap-1">
                        Status
                        {campoOrdenacao === 'status' && (ordemAsc ? ' ▲' : ' ▼')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {restricoesPaginadas.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        <p className="font-poppins text-base font-semibold text-slate-600">Nenhum registro encontrado</p>
                        <p className="text-xs text-slate-400 mt-1">Tente ajustar o intervalo de datas ou o termo pesquisado.</p>
                        <button
                          onClick={limparFiltros}
                          className="mt-3 px-3 py-1.5 bg-[#e8f3fa] text-[#004b87] hover:bg-[#004b87] hover:text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          Redefinir Filtros
                        </button>
                      </td>
                    </tr>
                  ) : (
                    restricoesPaginadas.map((r) => {
                      const doc = obterDocCliente(r);

                      return (
                        <tr key={r?.id || Math.random()} className="hover:bg-[#e8f3fa]/20 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-800">
                            {r.clienteNome || 'Cliente'}
                            {doc && (
                              <span className="block text-xs font-normal text-slate-400 font-mono">
                                Documento: {formatarCpfCnpj(doc)}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-semibold">
                            <span
                              className={`inline-block px-2 py-0.5 text-xs rounded border ${
                                r.tipoCodigo === 'FRAUDE'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : r.tipoCodigo === 'BLOQUEIO_JUDICIAL'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {r.tipoCodigo}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-900 font-medium">{formatarMoeda(r.valor || 0)}</td>
                          <td className="px-6 py-4 text-slate-500">{r.dataOcorrencia || '—'}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${
                                r.status === 'ATIVA'
                                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                                  : 'bg-emerald-100 text-[#00874c] border-emerald-200'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* LINHA DE TOTALIZADORES NO RODAPÉ */}
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
                      <td className="px-6 py-3.5" colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* CONTROLE DE PAGINAÇÃO */}
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