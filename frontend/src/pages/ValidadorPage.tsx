import React, { useState, useEffect } from 'react';
import { ModalNovaRestricao } from '../components/modals/ModalNovaRestricao';
import { motorService, type ParecerDecisao } from '../services/motorService';
import { restricaoService, type RestricaoResponseDTO } from '../services/restricaoService';
import { clienteService, type Cliente } from '../services/clienteService';

export const ValidadorPage: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<string>('');
  const [clienteAtual, setClienteAtual] = useState<Cliente | null>(null);
  const [decisao, setDecisao] = useState<ParecerDecisao | null>(null);
  const [restricoes, setRestricoes] = useState<RestricaoResponseDTO[]>([]);
  const [carregando, setCarregando] = useState<boolean>(false);
  const [modalRestricaoAberto, setModalRestricaoAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarClientes();
  }, []);

  const carregarClientes = async () => {
    try {
      const data = await clienteService.listarTodos();
      const lista: Cliente[] = Array.isArray(data) ? data : [];
      setClientes(lista);

      if (lista.length > 0) {
        setClienteSelecionadoId(lista[0].id);
        setClienteAtual(lista[0]);
        avaliarCliente(lista[0].id, lista[0]);
      }
    } catch (e) {
      console.error('Erro ao carregar lista de clientes:', e);
      setClientes([]);
    }
  };

  const avaliarCliente = async (id: string, clienteObj?: Cliente) => {
    if (!id) return;
    setCarregando(true);
    setErro(null);

    const cli = clienteObj || clientes.find((c) => c.id === id) || null;
    setClienteAtual(cli);

    try {
      const resRestricoes = await restricaoService.listarPorCliente(id);
      setRestricoes(Array.isArray(resRestricoes) ? resRestricoes : []);
    } catch (e: any) {
      console.error('Falha ao listar restrições:', e?.response || e);
    }

    try {
      const resDecisao = await motorService.avaliar(id);
      setDecisao(resDecisao);
    } catch (e: any) {
      console.error('Falha ao avaliar no motor:', e?.response || e);
      setErro(e.response?.data?.message || 'Erro ao processar as regras de negócio.');
    } finally {
      setCarregando(false);
    }
  };

  const handleDarBaixa = async (restricaoId: string) => {
    try {
      await restricaoService.darBaixa(restricaoId);
      if (clienteSelecionadoId) {
        avaliarCliente(clienteSelecionadoId, clienteAtual || undefined);
      }
    } catch (e) {
      console.error('Erro ao dar baixa:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* SEARCH / CLIENT SELECTOR BOX */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-800 mb-1">Avaliar Transação do Cliente</h3>
        <p className="text-sm text-slate-500 mb-4">
          Selecione ou busque o cliente para processar as regras de restrição financeira em tempo real.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            avaliarCliente(clienteSelecionadoId);
          }}
          className="flex flex-col md:flex-row gap-3"
        >
          <div className="relative flex-1">
            <select
              value={clienteSelecionadoId}
              onChange={(e) => {
                const novoId = e.target.value;
                setClienteSelecionadoId(novoId);
                const selecionado = clientes.find((c) => c.id === novoId);
                setClienteAtual(selecionado || null);
                avaliarCliente(novoId, selecionado);
              }}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            >
              {Array.isArray(clientes) &&
                clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} ({c.documento})
                  </option>
                ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={carregando}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {carregando ? 'Avaliando...' : 'Avaliar Transação'}
          </button>
        </form>
      </section>

      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-medium">
          {erro}
        </div>
      )}

      {/* DECISION RESULT CARD */}
      {decisao && (
        <section
          className={`border rounded-xl p-6 shadow-sm transition-all ${decisao.bloqueado
              ? 'bg-red-50/60 border-red-200'
              : 'bg-emerald-50/60 border-emerald-200'
            }`}
        >
          <div
            className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${decisao.bloqueado ? 'border-red-200/80' : 'border-emerald-200/80'
              }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`p-2.5 text-white rounded-lg shadow-md ${decisao.bloqueado
                    ? 'bg-red-600 shadow-red-600/20'
                    : 'bg-emerald-600 shadow-emerald-600/20'
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <div>
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${decisao.bloqueado ? 'text-red-600' : 'text-emerald-600'
                    }`}
                >
                  Resultado da Avaliação
                </span>
                <h4
                  className={`text-2xl font-extrabold ${decisao.bloqueado ? 'text-red-900' : 'text-emerald-900'
                    }`}
                >
                  {decisao.bloqueado ? 'BLOQUEADO' : 'LIBERADO'}
                </h4>
              </div>
            </div>
            <span
              className={`px-3 py-1 text-xs font-semibold rounded-full border self-start md:self-auto ${decisao.bloqueado
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}
            >
              Decisão Automática (Engine v1)
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-slate-500 block text-xs">Cliente / Razão Social</span>
              <span className="font-semibold text-slate-800">{clienteAtual?.nome || 'Não informado'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-xs">Documento</span>
              <span className="font-semibold text-slate-800">{clienteAtual?.documento || '---'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-xs">Tipo de Pessoa</span>
              <span className="font-semibold text-slate-800">
                {clienteAtual?.tipoPessoa === 'PJ' ? 'Pessoa Jurídica (PJ)' : 'Pessoa Física (PF)'}
              </span>
            </div>
          </div>

          <div
            className={`mt-4 bg-white border rounded-lg p-4 ${decisao.bloqueado ? 'border-red-200' : 'border-emerald-200'
              }`}
          >
            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              {decisao.bloqueado ? 'Justificativa do Bloqueio:' : 'Parecer de Conformidade:'}
            </h5>
            <ul className="space-y-1">
              {decisao.motivos && decisao.motivos.length > 0 ? (
                decisao.motivos.map((m, idx) => (
                  <li
                    key={idx}
                    className={`text-sm font-medium ${decisao.bloqueado ? 'text-red-700' : 'text-emerald-700'
                      }`}
                  >
                    • {m}
                  </li>
                ))
              ) : (
                <li className="text-sm font-medium text-emerald-700">
                  Nenhuma restrição impeditiva encontrada
                </li>
              )}
            </ul>
          </div>
        </section>
      )}

      {/* ACTIVE RESTRICTIONS TABLE */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Histórico de Restrições Registradas</h3>
            <p className="text-sm text-slate-500">
              Total de ocorrências: <strong className="text-slate-700">{restricoes.length}</strong> registadas.
            </p>
          </div>
          <button
            onClick={() => setModalRestricaoAberto(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-lg transition-colors flex items-center gap-2 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Incluir Nova Restrição
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">Tipo de Restrição</th>
                <th className="px-6 py-3.5">Valor Atrasado</th>
                <th className="px-6 py-3.5">Data Ocorrência</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {restricoes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
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
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${r.tipoCodigo === 'FRAUDE'
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
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${isAtiva
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isAtiva ? (
                          <button
                            onClick={() => handleDarBaixa(r.id)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-medium text-xs rounded-lg transition-colors"
                          >
                            Dar Baixa
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-3 py-1.5 bg-slate-100 text-slate-400 font-medium text-xs rounded-lg cursor-not-allowed"
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

      {/* MODAL DE NOVA RESTRIÇÃO */}
      <ModalNovaRestricao
        aberto={modalRestricaoAberto}
        clienteId={clienteSelecionadoId}
        clienteNome={clienteAtual?.nome || ''}
        onFechar={() => setModalRestricaoAberto(false)}
        onSucesso={() => avaliarCliente(clienteSelecionadoId, clienteAtual || undefined)}
      />
    </div>
  );
};