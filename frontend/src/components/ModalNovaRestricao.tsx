import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { restricaoService } from '../services/api';
import type { NovaRestricaoPayload } from '../types';

interface ModalNovaRestricaoProps {
  clienteId: string;
  clienteNome: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ModalNovaRestricao({
  clienteId,
  clienteNome,
  isOpen,
  onClose,
  onSuccess,
}: ModalNovaRestricaoProps) {
  const [tipoCodigo, setTipoCodigo] = useState<string>('INADIMPLENCIA');
  const [valor, setValor] = useState<string>('5500.00');
  const [dataOcorrencia, setDataOcorrencia] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [salvando, setSalvando] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);

    const payload: NovaRestricaoPayload = {
      clienteId,
      tipoRestricaoCodigo: tipoCodigo,
      valor: parseFloat(valor) || 0,
      dataOcorrencia,
    };

    try {
      await restricaoService.criar(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErro(err.response?.data?.erro || 'Erro ao cadastrar restrição.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white mb-1">Nova Restrição</h3>
        <p className="text-xs text-slate-400 mb-5">
          Cliente: <span className="text-slate-200 font-medium">{clienteNome}</span>
        </p>

        {erro && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Tipo de Restrição
            </label>
            <select
              value={tipoCodigo}
              onChange={(e) => setTipoCodigo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="INADIMPLENCIA">INADIMPLÊNCIA (Teto R$ 5.000 / 90 dias)</option>
              <option value="FRAUDE">FRAUDE (Bloqueio Imediato)</option>
              <option value="BLOQUEIO_JUDICIAL">BLOQUEIO JUDICIAL (Bloqueio Imediato)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Valor da Restrição (R$)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Data da Ocorrência
            </label>
            <input
              type="date"
              required
              value={dataOcorrencia}
              onChange={(e) => setDataOcorrencia(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Confirmar Restrição'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}