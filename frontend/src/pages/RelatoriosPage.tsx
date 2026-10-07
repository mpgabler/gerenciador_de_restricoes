import React, { useState, useEffect } from 'react';
import { restricaoService, type RestricaoResponseDTO } from '../services/restricaoService';
import { clienteService, type Cliente } from '../services/clienteService';

export const RelatoriosPage: React.FC = () => {
  const [restricoes, setRestricoes] = useState<RestricaoResponseDTO[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const [resRestricoes, resClientes] = await Promise.all([
        restricaoService.listarTodas().catch(() => []),
        clienteService.listarTodos().catch(() => []),
      ]);
      setRestricoes(resRestricoes);
      setClientes(resClientes);
    } catch (e) {
      console.error('Falha ao carregar relatórios:', e);
    } finally {
      setCarregando(false);
    }
  };

  // Cálculos analíticos
  const totalRestricoes = restricoes.length;
  const restricoesAtivas = restricoes.filter((r) => r.status === 'ATIVA');
  const restricoesBaixadas = restricoes.filter((r) => r.status === 'BAIXADA');

  const volumeInadimplenciaAtiva = restricoesAtivas
    .filter((r) => r.tipoCodigo === 'INADIMPLENCIA')
    .reduce((acc, r) => acc + (r.valor || 0), 0);

  const totalFraudesAtivas = restricoesAtivas.filter((r) => r.tipoCodigo === 'FRAUDE').length;
  const totalJudiciaisAtivas = restricoesAtivas.filter((r) => r.tipoCodigo === 'BLOQUEIO_JUDICIAL').length;
  const totalInadimplenciasAtivas = restricoesAtivas.filter((r) => r.tipoCodigo === 'INADIMPLENCIA').length;

  const taxaRegularizacao = totalRestricoes > 0
    ? ((restricoesBaixadas.length / totalRestricoes) * 100).toFixed(1)
    : '0.0';

  const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

  return (
    <div className="space-y-6">
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Relatórios & Visão de Risco</h2>
          <p className="text-sm text-slate-500">Métricas analíticas e consolidação das restrições financeiras ativas.</p>
        </div>
        <button
          onClick={carregarDados}
          className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-lg transition-colors flex items-center gap-2 self-start sm:self-auto shadow-xs"
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Atualizar Dados
        </button>
      </div>

      {carregando ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
          Carregando indicadores analíticos...
        </div>
      ) : (
        <>
          {/* CARDS DE INDICADORES (KPIS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">Exposição Financeira</span>
              <p className="text-2xl font-bold text-slate-900 mt-2">{formatarMoeda(volumeInadimplenciaAtiva)}</p>
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-block mt-2">
                Inadimplências ativas
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">Ocorrências Críticas</span>
              <p className="text-2xl font-bold text-red-700 mt-2">{totalFraudesAtivas + totalJudiciaisAtivas}</p>
              <p className="text-xs text-slate-500 mt-2">
                {totalFraudesAtivas} fraudes e {totalJudiciaisAtivas} judiciais ativas
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">Taxa de Regularização</span>
              <p className="text-2xl font-bold text-emerald-700 mt-2">{taxaRegularizacao}%</p>
              <p className="text-xs text-slate-500 mt-2">
                {restricoesBaixadas.length} de {totalRestricoes} resolvidas
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">Base de Clientes</span>
              <p className="text-2xl font-bold text-slate-900 mt-2">{clientes.length}</p>
              <p className="text-xs text-slate-500 mt-2">Clientes monitorados</p>
            </div>
          </div>

          {/* DISTRIBUIÇÃO E GRÁFICO VISUAL DE BARRAS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <h3 className="text-base font-semibold text-slate-800 mb-1">Distribuição de Restrições Ativas</h3>
              <p className="text-xs text-slate-500 mb-6">Contagem de registros vigentes por classificação de risco.</p>

              <div className="space-y-4 text-sm">
                <div>
                  <div className="flex justify-between font-medium mb-1">
                    <span className="text-slate-700 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Inadimplências
                    </span>
                    <span className="text-slate-900 font-semibold">{totalInadimplenciasAtivas}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div
                      className="bg-amber-500 h-2.5 rounded-full transition-all"
                      style={{
                        width: `${restricoesAtivas.length > 0 ? (totalInadimplenciasAtivas / restricoesAtivas.length) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-medium mb-1">
                    <span className="text-slate-700 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Fraudes
                    </span>
                    <span className="text-slate-900 font-semibold">{totalFraudesAtivas}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div
                      className="bg-red-500 h-2.5 rounded-full transition-all"
                      style={{
                        width: `${restricoesAtivas.length > 0 ? (totalFraudesAtivas / restricoesAtivas.length) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-medium mb-1">
                    <span className="text-slate-700 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Bloqueios Judiciais
                    </span>
                    <span className="text-slate-900 font-semibold">{totalJudiciaisAtivas}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div
                      className="bg-purple-500 h-2.5 rounded-full transition-all"
                      style={{
                        width: `${restricoesAtivas.length > 0 ? (totalJudiciaisAtivas / restricoesAtivas.length) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-800 mb-1">Resumo de Conformidade Operacional</h3>
                <p className="text-xs text-slate-500 mb-4">Critérios das regras de negócio do motor ativo.</p>
                
                <ul className="space-y-3 text-xs text-slate-600">
                  <li className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <strong className="text-slate-800 block text-sm mb-0.5">Regra de Fraude</strong>
                    Bloqueio instantâneo e irrestrito para qualquer transação vinculada a clientes com fraudes ativas.
                  </li>
                  <li className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <strong className="text-slate-800 block text-sm mb-0.5">Regra de Inadimplência</strong>
                    Bloqueio automático se o montante acumulado for superior a R$ 5.000,00 ou se o atraso ultrapassar 90 dias.
                  </li>
                </ul>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-400 flex justify-between items-center">
                <span>Motor v1.0 • Spring Boot Data Engine</span>
                <span className="text-emerald-600 font-semibold">Regras Homologadas</span>
              </div>
            </section>
          </div>

          {/* TABELA DE OCORRÊNCIAS MAIS RECENTES */}
          <section className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-800">Últimas Ocorrências Registradas no Sistema</h3>
              <p className="text-sm text-slate-500">Monitoramento em lote de todos os clientes.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-6 py-3.5">Cliente</th>
                    <th className="px-6 py-3.5">Tipo</th>
                    <th className="px-6 py-3.5">Valor</th>
                    <th className="px-6 py-3.5">Data Ocorrência</th>
                    <th className="px-6 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {restricoes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                        Nenhuma restrição registrada no sistema.
                      </td>
                    </tr>
                  ) : (
                    restricoes.slice(0, 5).map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-800">{r.clienteNome || 'Cliente'}</td>
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
                        <td className="px-6 py-4 text-slate-500">{r.dataOcorrencia}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded ${
                              r.status === 'ATIVA'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};