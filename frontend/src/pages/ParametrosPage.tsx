import React, { useState, useEffect } from 'react';
import { politicaService, type PoliticaRiscoDTO } from '../services/politicaService';

export const formatarDataHoraBR = (isoStr?: string | null): string => {
  if (!isoStr) return 'Vigente';
  const data = new Date(isoStr);
  if (isNaN(data.getTime())) return isoStr;

  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  const hora = String(data.getHours()).padStart(2, '0');
  const min = String(data.getMinutes()).padStart(2, '0');

  return `${dia}/${mes}/${ano} às ${hora}:${min}`;
};

export const ParametrosPage: React.FC = () => {
  const [politicas, setPoliticas] = useState<PoliticaRiscoDTO[]>([]);
  const [politicaVigente, setPoliticaVigente] = useState<PoliticaRiscoDTO | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Estados do Formulário de Atualização
  const [novoTeto, setNovoTeto] = useState<string>('5.000,00');
  const [novoDiasAtraso, setNovoDiasAtraso] = useState<number>(90);
  const [justificativa, setJustificativa] = useState<string>('');
  const [salvando, setSalvando] = useState<boolean>(false);

  useEffect(() => {
    carregarPoliticas();
  }, []);

  const carregarPoliticas = async () => {
    setCarregando(true);
    try {
      const lista = await politicaService.listarTodas();
      setPoliticas(lista);
      const vigente = lista.find((p) => p.ativo && p.vigenciaFim === null) || lista[0];
      setPoliticaVigente(vigente);
      if (vigente) {
        setNovoTeto(
          new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
            vigente.tetoInadimplencia
          )
        );
        setNovoDiasAtraso(vigente.diasAtrasoMaximo);
      }
    } catch (e) {
      console.error('Erro ao carregar parâmetros normativos:', e);
    } finally {
      setCarregando(false);
    }
  };

  const handleMascaraMoeda = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = (Number(raw) || 0) / 100;
    setNovoTeto(
      new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num)
    );
  };

  const parseMoeda = (valorStr: string): number => {
    const limpo = valorStr.replace(/\./g, '').replace(',', '.');
    return Number(limpo) || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tetoNum = parseMoeda(novoTeto);

    if (tetoNum <= 0) {
      alert('Informe um valor de teto financeiro válido.');
      return;
    }

    if (novoDiasAtraso <= 0) {
      alert('Informe um prazo máximo de atraso em dias válido.');
      return;
    }

    if (!justificativa.trim()) {
      alert('A justificativa normativa é obrigatória para fins de auditoria.');
      return;
    }

    setSalvando(true);
    try {
      await politicaService.cadastrarNovaVersao({
        tetoInadimplencia: tetoNum,
        diasAtrasoMaximo: novoDiasAtraso,
        justificativa: justificativa.trim(),
        criadoPor: 'analista@bantestes.com.br',
      });

      setSucesso('Nova política homologada com sucesso! A regra passa a valer para novas transações a partir deste momento.');
      setJustificativa('');
      await carregarPoliticas();
      setTimeout(() => setSucesso(null), 6000);
    } catch (err) {
      console.error('Falha ao atualizar parâmetros:', err);
      alert('Erro ao salvar nova versão da política.');
    } finally {
      setSalvando(false);
    }
  };

  const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

  return (
    <div className="space-y-6 font-sans">
      {/* CABEÇALHO DA TELA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h2 className="font-poppins text-xl font-bold text-slate-800 tracking-tight">
            Parâmetros &amp; Políticas de Crédito
          </h2>
          <p className="text-sm text-slate-500">
            Definição de tetos normativos e versionamento com princípio de iretroatividade temporal.
          </p>
        </div>
      </div>

      {sucesso && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-[#00874c] rounded-xl text-sm font-semibold flex items-center gap-2 text-left shadow-2xs font-poppins">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          {sucesso}
        </div>
      )}

      {/* BLOCO A: PARÂMETROS VIGENTES EM PRODUÇÃO (2 COLUNAS EQUILIBRADAS) */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-poppins block">
              Regra Vigente do Motor
            </span>
            <h3 className="text-lg font-bold text-[#14213D] font-poppins flex items-center gap-2">
              Política Homologada ({politicaVigente?.versao || 'v1.0'})
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-50 text-[#00874c] border border-emerald-200">
                ATIVO EM PRODUÇÃO
              </span>
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Vigência desde: <strong className="text-slate-700">{formatarDataHoraBR(politicaVigente?.vigenciaInicio)}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <div className="p-4.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block font-poppins font-medium">Teto Financeiro de Inadimplência</span>
            <span className="text-2xl font-extrabold text-[#004b87] font-poppins block mt-1">
              {formatarMoeda(politicaVigente?.tetoInadimplencia || 5000)}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">Bloqueia operações que ultrapassem o montante</span>
          </div>

          <div className="p-4.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block font-poppins font-medium">Atraso Temporal Máximo</span>
            <span className="text-2xl font-extrabold text-amber-700 font-poppins block mt-1">
              {politicaVigente?.diasAtrasoMaximo || 90} dias
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">Teto de tolerância cronológica de parcelas</span>
          </div>
        </div>
      </section>

      {/* BLOCO B: FORMULÁRIO DE PROGRAMAÇÃO DA NOVA REGRA */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs text-left">
        <div className="mb-4">
          <h3 className="font-poppins text-base font-bold text-slate-800">
            Programar Nova Versão da Política
          </h3>
          <p className="text-xs text-slate-500">
            Atualize os parâmetros normativos respeitando o princípio de conformidade e não-retroatividade.
          </p>
        </div>

        {/* FAIXA DE ALERTA DE NÃO-RETROATIVIDADE */}
        <div className="mb-5 p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-left flex items-start gap-3">
          <div className="w-6 h-6 rounded-md bg-amber-200 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="text-xs font-bold text-amber-900 font-poppins uppercase tracking-wide">
              Cláusula de Iretroatividade Normativa
            </h4>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
              Transações e avaliações já registradas com datas anteriores à homologação <strong>não serão penalizadas e nem abonadas</strong>. O motor de decisão aplicará o novo corte exclusivamente a eventos e consultas realizados após a data/hora da nova versão.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase font-poppins mb-1.5">
                Novo Limite de Valor para Inadimplência (R$)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-xs font-bold text-slate-400 font-mono pointer-events-none">
                  R$
                </span>
                <input
                  type="text"
                  value={novoTeto}
                  onChange={handleMascaraMoeda}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all font-mono"
                  placeholder="5.000,00"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase font-poppins mb-1.5">
                Novo Limite de Atraso de Pagamento (Dias)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={novoDiasAtraso}
                onChange={(e) => setNovoDiasAtraso(Number(e.target.value) || 0)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all font-mono"
                placeholder="90"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase font-poppins mb-1.5">
              Justificativa Normativa / Parecer do Comitê de Risco
            </label>
            <textarea
              rows={2}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva a ata, reunião de diretoria ou resolução que fundamentou esta alteração..."
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={salvando}
              className="px-5 py-2.5 bg-[#004b87] hover:bg-[#003a6b] text-white font-poppins font-medium text-xs rounded-xl transition-all shadow-xs active:scale-[0.99] flex items-center gap-2 disabled:opacity-50"
            >
              {salvando ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-4 h-4 text-[#009ee3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              )}
              Homologar e Iniciar Vigência
            </button>
          </div>
        </form>
      </section>

      {/* BLOCO C: HISTÓRICO DE AUDITORIA DAS POLÍTICAS */}
      <section className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden text-left">
        <div className="p-6 border-b border-slate-200">
          <h3 className="font-poppins text-base font-bold text-slate-800 tracking-tight">
            Trilha de Auditoria &amp; Versionamento Normativo
          </h3>
          <p className="text-sm text-slate-500">
            Registro histórico de todos os limites aplicados ao motor de conformidade.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider font-semibold font-poppins">
              <tr>
                <th className="px-6 py-3.5">Versão</th>
                <th className="px-6 py-3.5">Teto Inadimplência</th>
                <th className="px-6 py-3.5">Dias Atraso</th>
                <th className="px-6 py-3.5">Início da Vigência</th>
                <th className="px-6 py-3.5">Fim da Vigência</th>
                <th className="px-6 py-3.5">Responsável / Parecer</th>
                <th className="px-6 py-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {carregando ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-[#004b87] border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p className="text-xs">Carregando histórico de parâmetros...</p>
                  </td>
                </tr>
              ) : politicas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    Nenhuma política cadastrada.
                  </td>
                </tr>
              ) : (
                politicas.map((pol) => {
                  const isVigente = pol.ativo && pol.vigenciaFim === null;
                  return (
                    <tr key={pol.id} className="hover:bg-[#e8f3fa]/20 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 font-mono text-xs">
                        {pol.versao}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {formatarMoeda(pol.tetoInadimplencia)}
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-mono text-xs">
                        {pol.diasAtrasoMaximo} dias
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                        {formatarDataHoraBR(pol.vigenciaInicio)}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                        {pol.vigenciaFim ? formatarDataHoraBR(pol.vigenciaFim) : '— (Atual)'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="block text-xs font-semibold text-slate-800">
                          {pol.criadoPor}
                        </span>
                        <span className="block text-[11px] text-slate-400 mt-0.5 line-clamp-1" title={pol.justificativa}>
                          {pol.justificativa}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`w-[78px] h-6 inline-flex items-center justify-center text-[10px] font-bold rounded-md border tracking-wide font-sans text-center ${
                            isVigente
                              ? 'bg-emerald-100 text-[#00874c] border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {isVigente ? 'VIGENTE' : 'ENCERRADA'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};