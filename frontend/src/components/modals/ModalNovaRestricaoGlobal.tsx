import React, { useState } from 'react';
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
  const [clienteId, setClienteId] = useState<string>(clientes[0]?.id || '');
  const [tipoRestricao, setTipoRestricao] = useState<'FRAUDE' | 'INADIMPLENCIA' | 'BLOQUEIO_JUDICIAL'>('FRAUDE');
  const [valor, setValor] = useState<string>('');
  const [dataOcorrencia, setDataOcorrencia] = useState<string>(new Date().toISOString().split('T')[0]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!aberto) return null;

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/[^0-9,]/g, '');
    const partes = v.split(',');
    if (partes.length > 2) v = partes[0] + ',' + partes.slice(1).join('');
    if (partes[1] && partes[1].length > 2) v = partes[0] + ',' + partes[1].slice(0, 2);
    setValor(v);
  };

  const handleValorBlur = () => {
    if (!valor.trim()) return;
    const normalizado = valor.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalizado);
    if (!isNaN(num)) {
      setValor(
        num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId) {
      setErro('Selecione um cliente para vincular a restrição.');
      return;
    }

    setSalvando(true);
    setErro(null);

    const valorNumerico = parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0;

    try {
      await restricaoService.criar({
        clienteId,
        tipoRestricaoCodigo: tipoRestricao,
        valor: tipoRestricao === 'FRAUDE' ? 0 : valorNumerico,
        dataOcorrencia,
      });
      setValor('');
      onSucesso();
      onFechar();
    } catch (err: any) {
      console.error('Falha ao registar restrição:', err);
      setErro(err.response?.data?.message || 'Erro ao registrar restrição.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800 text-base">Nova Restrição Financeira</h3>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {erro}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Cliente Vinculado</label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="">Selecione um cliente...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} ({c.documento})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Tipo de Ocorrência</label>
            <select
              value={tipoRestricao}
              onChange={(e) => {
                const novoTipo = e.target.value as any;
                setTipoRestricao(novoTipo);
                if (novoTipo === 'FRAUDE') setValor('');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="FRAUDE">FRAUDE (Bloqueio Imediato)</option>
              <option value="INADIMPLENCIA">INADIMPLENCIA (Financeiro / Prazo)</option>
              <option value="BLOQUEIO_JUDICIAL">BLOQUEIO_JUDICIAL (Ordem Judicial)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Valor (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              disabled={tipoRestricao === 'FRAUDE'}
              placeholder="0,00"
              value={tipoRestricao === 'FRAUDE' ? '' : valor}
              onChange={handleValorChange}
              onBlur={handleValorBlur}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Data da Ocorrência</label>
            <input
              type="date"
              required
              value={dataOcorrencia}
              onChange={(e) => setDataOcorrencia(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onFechar}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Cadastrar Restrição'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};