import React, { useState, useEffect } from 'react';
import { clienteService, type Cliente } from '../../services/clienteService';

interface ModalClienteProps {
  aberto: boolean;
  clienteParaEditar?: Cliente | null;
  onFechar: () => void;
  onSucesso: () => void;
}

// Lista oficial com todas as Unidades da Federação
const ESTADOS_BRASIL = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
];

const formatarCpf = (valor: string): string => {
  const digitos = valor.replace(/\D/g, '').slice(0, 11);
  return digitos
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2') .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const formatarCnpjAlfanumerico = (valor: string): string => {
  const limpo = valor.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 14);
  return limpo
    .replace(/^([A-Z0-9]{2})([A-Z0-9])/, '$1.$2')
    .replace(/^([A-Z0-9]{2})\.([A-Z0-9]{3})([A-Z0-9])/, '$1.$2.$3')
    .replace(/\.([A-Z0-9]{3})([A-Z0-9])/, '.$1/$2') .replace(/\/([A-Z0-9]{4})([A-Z0-9]{1,2})$/, '$1-$2');
};

export const formatarTelefone = (valor: string): string => {
  const digitos = (valor || '').replace(/\D/g, '').slice(0, 11);
  if (digitos.length <= 10) {
    return digitos
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digitos
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
};

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const ModalCliente: React.FC<ModalClienteProps> = ({
  aberto,
  clienteParaEditar,
  onFechar,
  onSucesso,
}) => {
  const [nome, setNome] = useState('');
  const [tipoPessoa, setTipoPessoa] = useState<'PF' | 'PJ'>('PF');
  const [documento, setDocumento] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');

  // Endereço detalhado
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [cep, setCep] = useState('');

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tentouSalvar, setTentouSalvar] = useState(false);

  const modoEdicao = Boolean(clienteParaEditar);

  useEffect(() => {
    if (aberto) {
      if (clienteParaEditar) {
        setNome(clienteParaEditar.nome || '');
        const tipo = (clienteParaEditar.tipoPessoa || (clienteParaEditar.documento.length > 11 ? 'PJ' : 'PF')) as 'PF' | 'PJ';
        setTipoPessoa(tipo);
        setDocumento(
          tipo === 'PJ'
            ? formatarCnpjAlfanumerico(clienteParaEditar.documento || '')
            : formatarCpf(clienteParaEditar.documento || '')
        );
        setEmail(clienteParaEditar.email || '');
        setTelefone(formatarTelefone(clienteParaEditar.telefone || ''));
        setLogradouro(clienteParaEditar.logradouro || '');
        setNumero(clienteParaEditar.numero || '');
        setComplemento(clienteParaEditar.complemento || '');
        setBairro(clienteParaEditar.bairro || '');
        setCidade(clienteParaEditar.cidade || '');
        setUf(clienteParaEditar.uf?.toUpperCase() || '');
        setCep(clienteParaEditar.cep || '');
      } else {
        setNome('');
        setTipoPessoa('PF');
        setDocumento('');
        setEmail('');
        setTelefone('');
        setLogradouro('');
        setNumero('');
        setComplemento('');
        setBairro('');
        setCidade('');
        setUf('');
        setCep('');
      }
      setErro(null);
      setSalvando(false);
      setTentouSalvar(false);
    }
  }, [aberto, clienteParaEditar]);

  if (!aberto) return null;

  const lidarComMudancaDocumento = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (tipoPessoa === 'PF') {
      const digitos = raw.replace(/\D/g, '').slice(0, 11);
      setDocumento(formatarCpf(digitos));
    } else {
      const limpo = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 14);
      setDocumento(formatarCnpjAlfanumerico(limpo));
    }
  };

  const lidarComMudancaTipo = (novoTipo: 'PF' | 'PJ') => {
    setTipoPessoa(novoTipo);
    if (novoTipo === 'PF') {
      const digitos = documento.replace(/\D/g, '').slice(0, 11);
      setDocumento(formatarCpf(digitos));
    } else {
      const limpo = documento.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 14);
      setDocumento(formatarCnpjAlfanumerico(limpo));
    }
  };

  const campoVazio = (valor: string) => valor.trim() === '';
  const emailValido = REGEX_EMAIL.test(email.trim());

  const obterEstiloInput = (invalido: boolean, customFont: string = 'font-sans') => {
    if (tentouSalvar && invalido) {
      return `w-full px-3.5 py-2.5 bg-red-50/40 border border-red-400 text-red-900 rounded-xl text-xs placeholder-red-300 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 transition-all ${customFont}`;
    }
    return `w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all ${customFont}`;
  };

  const obterEstiloInputEndereco = (invalido: boolean) => {
    if (tentouSalvar && invalido) {
      return 'w-full px-3 py-2 bg-red-50/40 border border-red-400 text-red-900 rounded-lg text-xs placeholder-red-300 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 transition-all';
    }
    return 'w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTentouSalvar(true);
    setErro(null);

    const camposObrigatoriosPreenchidos =
      !campoVazio(nome) &&
      !campoVazio(documento) &&
      !campoVazio(email) &&
      !campoVazio(telefone) &&
      !campoVazio(logradouro) &&
      !campoVazio(numero) &&
      !campoVazio(complemento) &&
      !campoVazio(bairro) &&
      !campoVazio(cidade) &&
      !campoVazio(uf) &&
      !campoVazio(cep);

    if (!camposObrigatoriosPreenchidos) {
      setErro('Por favor, preencha todos os campos destacados em vermelho.');
      return;
    }

    if (!emailValido) {
      setErro('Por favor, informe um endereço de e-mail válido (ex.: usuario@dominio.com).');
      return;
    }

    const docLimpo = documento.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    if (tipoPessoa === 'PF' && docLimpo.length !== 11) {
      setErro('O CPF deve conter exatamente 11 dígitos numéricos.');
      return;
    }
    if (tipoPessoa === 'PJ' && docLimpo.length !== 14) {
      setErro('O CNPJ deve conter exatamente 14 caracteres.');
      return;
    }

    setSalvando(true);

    const payload: any = {
      nome: nome.trim(),
      documento: docLimpo,
      tipoPessoa,
      email: email.trim(),
      telefone: telefone.replace(/\D/g, '').trim(),
      logradouro: logradouro.trim(),
      numero: numero.trim(),
      complemento: complemento.trim(),
      bairro: bairro.trim(),
      cidade: cidade.trim(),
      uf: uf.trim().toUpperCase(),
      cep: cep.replace(/\D/g, '').trim(),
    };

    try {
      if (modoEdicao && clienteParaEditar?.id) {
        await clienteService.atualizar(clienteParaEditar.id, payload);
      } else {
        await clienteService.criar(payload);
      }

      onSucesso();
      onFechar();
    } catch (err: any) {
      console.error('Falha ao salvar cliente:', err);
      const data = err.response?.data;

      let msg = 'Erro ao registrar cliente. Verifique se os dados estão preenchidos corretamente.';
      if (data?.errors && Array.isArray(data.errors)) {
        msg = data.errors.map((e: any) => e.defaultMessage || e).join('; ');
      } else if (data?.message) {
        msg = data.message;
      } else if (data?.error) {
        msg = data.error;
      }

      setErro(msg);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-[#081c30]/70 backdrop-blur-xs transition-opacity" onClick={onFechar} />

      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-xl max-h-[90vh] overflow-y-auto font-sans z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="sticky top-0 bg-white/95 backdrop-blur-xs p-5 border-b border-slate-100 flex items-center justify-between z-10">
          <div>
            <h3 className="font-poppins text-base font-bold text-slate-800 tracking-tight">
              {modoEdicao ? 'Atualizar Dados do Proponente' : 'Novo Cliente'}
            </h3>
            <p className="text-xs text-slate-500">
              Dados cadastrais e canais de contato
            </p>
          </div>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4 text-left">
          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{erro}</span>
            </div>
          )}

          {/* Nome Completo / Razão Social */}
          <div>
            <label className="block text-xs font-poppins font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              {tipoPessoa === 'PJ' ? 'Razão Social / Nome Fantasia' : 'Nome Completo'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder={tipoPessoa === 'PJ' ? 'Ex.: Comercial Vitória LTDA' : 'Ex.: Maria Souza'}
              className={obterEstiloInput(campoVazio(nome))}
            />
            {tentouSalvar && campoVazio(nome) && (
              <span className="text-[10px] text-red-600 font-medium mt-1 block">
                Preenchimento obrigatório
              </span>
            )}
          </div>

          {/* Tipo e Documento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-poppins font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Tipo <span className="text-red-500">*</span>
              </label>
              <select
                value={tipoPessoa}
                onChange={(e) => lidarComMudancaTipo(e.target.value as 'PF' | 'PJ')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all font-sans"
              >
                <option value="PF">Pessoa Física (PF)</option>
                <option value="PJ">Pessoa Jurídica (PJ)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-poppins font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                {tipoPessoa === 'PF' ? 'CPF' : 'CNPJ'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={documento}
                onChange={lidarComMudancaDocumento}
                placeholder={tipoPessoa === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                className={obterEstiloInput(campoVazio(documento), 'font-mono tracking-wide')}
              />
              {tentouSalvar && campoVazio(documento) && (
                <span className="text-[10px] text-red-600 font-medium mt-1 block">
                  Preenchimento obrigatório
                </span>
              )}
            </div>
          </div>

          {/* Telefone e E-mail */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-poppins font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Telefone / WhatsApp (Negociação) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={telefone}
                onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                placeholder="(27) 99999-9999"
                className={obterEstiloInput(campoVazio(telefone), 'font-mono')}
              />
              {tentouSalvar && campoVazio(telefone) && (
                <span className="text-[10px] text-red-600 font-medium mt-1 block">
                  Preenchimento obrigatório
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-poppins font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                E-mail <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@dominio.com.br"
                className={obterEstiloInput(campoVazio(email) || !emailValido)}
              />
              {tentouSalvar && campoVazio(email) && (
                <span className="text-[10px] text-red-600 font-medium mt-1 block">
                  Preenchimento obrigatório
                </span>
              )}
              {tentouSalvar && !campoVazio(email) && !emailValido && (
                <span className="text-[10px] text-red-600 font-medium mt-1 block">
                  Informe um e-mail válido (ex.: usuario@dominio.com)
                </span>
              )}
            </div>
          </div>

          {/* DADOS DE ENDEREÇO ESTRUTURADO */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-poppins font-bold uppercase tracking-wider text-[#004b87] mb-2.5">
              Endereço Residencial / Comercial
            </h4>

            {/* Logradouro e Número */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-poppins font-semibold text-slate-500 uppercase mb-1">
                  Logradouro (Rua, Av.) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={logradouro}
                  onChange={(e) => setLogradouro(e.target.value)}
                  placeholder="Ex.: Av. Princesa Isabel"
                  className={obterEstiloInputEndereco(campoVazio(logradouro))}
                />
                {tentouSalvar && campoVazio(logradouro) && (
                  <span className="text-[10px] text-red-600 font-medium mt-1 block">
                    Preenchimento obrigatório
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-poppins font-semibold text-slate-500 uppercase mb-1">
                  Número <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="Ex.: 574"
                  className={obterEstiloInputEndereco(campoVazio(numero))}
                />
                {tentouSalvar && campoVazio(numero) && (
                  <span className="text-[10px] text-red-600 font-medium mt-1 block">
                    Preenchimento obrigatório
                  </span>
                )}
              </div>
            </div>

            {/* Complemento e Bairro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-poppins font-semibold text-slate-500 uppercase mb-1">
                  Complemento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  placeholder="Ex.: Apto 302, Bloco B"
                  className={obterEstiloInputEndereco(campoVazio(complemento))}
                />
                {tentouSalvar && campoVazio(complemento) && (
                  <span className="text-[10px] text-red-600 font-medium mt-1 block">
                    Preenchimento obrigatório
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-poppins font-semibold text-slate-500 uppercase mb-1">
                  Bairro <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Ex.: Centro"
                  className={obterEstiloInputEndereco(campoVazio(bairro))}
                />
                {tentouSalvar && campoVazio(bairro) && (
                  <span className="text-[10px] text-red-600 font-medium mt-1 block">
                    Preenchimento obrigatório
                  </span>
                )}
              </div>
            </div>

            {/* Cidade, UF (Seletor com Estados) e CEP */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-poppins font-semibold text-slate-500 uppercase mb-1">
                  Cidade <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Ex.: Vitória"
                  className={obterEstiloInputEndereco(campoVazio(cidade))}
                />
                {tentouSalvar && campoVazio(cidade) && (
                  <span className="text-[10px] text-red-600 font-medium mt-1 block">
                    Preenchimento obrigatório
                  </span>
                )}
              </div>

              {/* Seletor de Estados (UF) */}
              <div>
                <label className="block text-[11px] font-poppins font-semibold text-slate-500 uppercase mb-1">
                  UF <span className="text-red-500">*</span>
                </label>
                <select
                  value={uf}
                  onChange={(e) => setUf(e.target.value)}
                  className={
                    tentouSalvar && campoVazio(uf)
                      ? 'w-full px-2.5 py-2 bg-red-50/40 border border-red-400 text-red-900 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 transition-all'
                      : 'w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all'
                  }
                >
                  <option value="">UF</option>
                  {ESTADOS_BRASIL.map((estado) => (
                    <option key={estado.sigla} value={estado.sigla}>
                      {estado.sigla} - {estado.nome}
                    </option>
                  ))}
                </select>
                {tentouSalvar && campoVazio(uf) && (
                  <span className="text-[10px] text-red-600 font-medium mt-1 block">
                    Obrigatório
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-poppins font-semibold text-slate-500 uppercase mb-1">
                  CEP <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={9}
                  value={cep}
                  onChange={(e) => {
                    const digitos = e.target.value.replace(/\D/g, '').slice(0, 8);
                    const formatado = digitos.replace(/^(\d{5})(\d)/, '$1-$2');
                    setCep(formatado);
                  }}
                  placeholder="29010-904"
                  className={
                    tentouSalvar && campoVazio(cep)
                      ? 'w-full px-3 py-2 bg-red-50/40 border border-red-400 text-red-900 rounded-lg text-xs placeholder-red-300 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 transition-all font-mono'
                      : 'w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004b87] focus:border-[#004b87] focus:bg-white transition-all font-mono'
                  }
                />
                {tentouSalvar && campoVazio(cep) && (
                  <span className="text-[10px] text-red-600 font-medium mt-1 block">
                    Obrigatório
                  </span>
                )}
              </div>
            </div>
          </div>

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
              disabled={salvando}
              className="px-5 py-2 bg-[#004b87] hover:bg-[#003a6b] text-white rounded-xl text-xs font-semibold font-poppins transition-all shadow-xs disabled:opacity-50 active:scale-[0.99] flex items-center gap-1.5"
            >
              {salvando ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Salvando...
                </>
              ) : modoEdicao ? (
                'Salvar Alterações'
              ) : (
                'Cadastrar Proponente'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};