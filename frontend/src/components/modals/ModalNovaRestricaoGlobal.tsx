import React, { useState, useMemo, useRef, useEffect } from 'react';
import { restricaoService } from '../../services/restricaoService';
import type { Cliente } from '../../services/clienteService';

interface ModalNovaRestricaoGlobalProps {
  aberto: boolean;
  clientes: Cliente[];
  onFechar: () => void;
  onSucesso: () => void;
}

export const ModalNovaRestricaoGlobal: React.FC<ModalNovaRestricaoGlobalProps> = ({
  aberto,
  clientes,
  onFechar,
  onSucesso,
}) => {
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [buscaCliente, setBuscaCliente] = useState<string>('');
  const [dropdownAberto, setDropdownAberto] = useState<boolean>(false);

  const [tipoCodigo, setTipoCodigo] = useState<string>('INADIMPLENCIA');
  const [valor, setValor] = useState<string>('');
  const [dataOcorrencia, setDataOcorrencia] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [salvando, setSalvando] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (aberto) {
      setClienteSelecionado(null);
      setBuscaCliente('');
      setDropdownAberto(false);
      setTipoCodigo('INADIMPLENCIA');
      setValor('');
      setDataOcorrencia(new Date().toISOString().split('T')[0]);
      setErro(null);
    }
  }, [aberto]);

  useEffect(() => {
    const handleClickFora = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  const sugestoesClientes = useMemo(() => {
    const termo = buscaCliente.trim().toLowerCase();
    if (termo.length < 2) return [];

    const digitos = buscaCliente.replace(/\D/g, '');

    return clientes
      .filter((c) => {
        const matchNome = (c.nome || '').toLowerCase().includes(termo);
        const docDigitos = (c.documento || '').replace(/\D/g, '');
        const matchDoc =
          (c.documento || '').toLowerCase().includes(termo) ||
          (digitos.length > 0 && docDigitos.includes(digitos));
        return matchNome || matchDoc;
      })
      .slice(0, 5);
  }, [clientes, buscaCliente]);

  if (!aberto) return null;

  const extrairMensagemErro = (err: any): string => {
    if (!err.response) return 'Sem conexão com o servidor da API.';
    const data = err.response.data;

    if (Array.isArray(data?.errors) && data.errors.length > 0) {
      return data.errors.map((e: any) => e.defaultMessage || `${e.field}: inválido`).join(' | ');
    }
    if (data?.errors && typeof data.errors === 'object') {
      return Object.entries(data.errors).map(([k, v]) => `${k}: ${v}`).join(' | ');
    }
    if (typeof data?.message === 'string' && data.message.trim()) return data.message;
    if (typeof data?.error === 'string' && data.error.trim()) return data.error;
    if (typeof data === 'string' && data.trim()) return data;

    return 'Erro 400 (Bad Request): Dados inválidos para o servidor.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteSelecionado) {
      setErro('Por favor, selecione um cliente válido.');
      return;
    }

    setSalvando(true);
    setErro(null);

    // Payload alinhado com o RestricaoRequestDTO do Spring Boot
    const payload: any = {
      clienteId: clienteSelecionado.id,
      tipoRestricaoCodigo: tipoCodigo, // Campo exato exigido pelo backend
      tipoCodigo: tipoCodigo,          // Fallback para retrocompatibilidade
      valor: tipoCodigo === 'INADIMPLENCIA' ? (parseFloat(valor) || 0) : null,
      dataOcorrencia,
    };

    try {
      await restricaoService.criar(payload);
      onSucesso();
      onFechar();
    } catch (err: any) {
      console.error('Falha detalhada ao cadastrar restrição:', err.response?.data || err);
      setErro(extrairMensagemErro(err));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-[#081c30]/70 backdrop-blur-xs transition-opacity"
        onClick={onFechar}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-lg overflow-hidden font-sans z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between text-left">
          <div>
            <h3 className="font-poppins text-base font-bold text-slate-800 tracking-tight">
              Nova Restrição Financeira
            </h3>
            <p className="text-xs text-slate-500">
              Vincule um apontamento de risco normativo a um proponente.
            </p>
          </div>
          <button
            onClick={onFechar}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg leading-relaxed">
              {erro}
            </div>
          )}

          {/* 1. SELEÇÃO DE CLIENTE COM AUTOCOMPLETE */}
          <div ref={dropdownRef} className="relative">
            <label className="block text-xs font-poppins font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Cliente Vinculado <span className="text-red-500">*</span>
            </label>

            {clienteSelecionado ? (
              <div className="p-3 bg-[#e8f3fa]/50 border border-[#004b87]/30 rounded-xl flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 font-poppins truncate">
                    {clienteSelecionado.nome}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {clienteSelecionado.tipoPessoa === 'PJ' ? 'CNPJ: ' : 'CPF: '}
                    {clienteSelecionado.documento}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setClienteSelecionado(null);
                    setBuscaCliente('');
                  }}
                  className="text-xs font-semibold text-[#004b87] hover:text-[#003a6b] font-poppins px-2 py-1 rounded hover:bg-white transition-colors"
                >
                  Alterar
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={buscaCliente}
                  onFocus={() => {
                    if (buscaCliente.trim().length >= 2) setDropdownAberto(true);
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBuscaCliente(val);
                    setDropdownAberto(val.trim().length >= 2);
                  }}
                  placeholder="Pesquise por CPF/CNPJ ou Nome..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all"
                />

                {dropdownAberto && buscaCliente.trim().length >= 2 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {sugestoesClientes.length === 0 ? (
                      <p className="p-3 text-center text-xs text-slate-400">
                        Nenhum cliente localizado.
                      </p>
                    ) : (
                      sugestoesClientes.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setClienteSelecionado(c);
                            setDropdownAberto(false);
                            setErro(null);
                          }}
                          className="w-full px-3 py-2.5 text-left hover:bg-[#e8f3fa]/50 transition-colors flex items-center justify-between group"
                        >
                          <div>
                            <p className="text-xs font-semibold text-slate-800 group-hover:text-[#004b87]">
                              {c.nome}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              {c.documento}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {c.tipoPessoa || 'PF'}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. TIPO DE RESTRIÇÃO */}
          <div>
            <label className="block text-xs font-poppins font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Tipo de Restrição
            </label>
            <select
              value={tipoCodigo}
              onChange={(e) => setTipoCodigo(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all"
            >
              <option value="INADIMPLENCIA">Inadimplência Financeira</option>
              <option value="FRAUDE">Suspeita / Fraude Identificada</option>
              <option value="BLOQUEIO_JUDICIAL">Bloqueio Judicial / BacenJud</option>
            </select>
          </div>

          {/* 3. VALOR (SE INADIMPLÊNCIA) */}
          {tipoCodigo === 'INADIMPLENCIA' && (
            <div>
              <label className="block text-xs font-poppins font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Valor do Débito (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="Ex: 1500.00"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all font-mono"
              />
            </div>
          )}

          {/* 4. DATA DA OCORRÊNCIA */}
          <div>
            <label className="block text-xs font-poppins font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Data da Ocorrência
            </label>
            <input
              type="date"
              value={dataOcorrencia}
              onChange={(e) => setDataOcorrencia(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all"
            />
          </div>

          {/* Ações */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onFechar}
              disabled={salvando}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando || !clienteSelecionado}
              className="px-5 py-2 bg-[#004b87] hover:bg-[#003a6b] text-white rounded-xl text-xs font-semibold font-poppins transition-all shadow-xs disabled:opacity-50 active:scale-[0.99] flex items-center gap-1.5"
            >
              {salvando ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Cadastrando...
                </>
              ) : (
                'Cadastrar Restrição'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};