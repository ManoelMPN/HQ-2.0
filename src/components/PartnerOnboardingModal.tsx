import React, { useState } from 'react';
import { X, Handshake, CheckCircle, Send, Search, MapPin } from 'lucide-react';
import { Seller } from '../types.ts';

interface PartnerOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterPartner: (partner: Omit<Seller, 'id' | 'totalSales' | 'totalEarnings' | 'active' | 'joinedAt'>) => void;
}

export const PartnerOnboardingModal: React.FC<PartnerOnboardingModalProps> = ({
  isOpen,
  onClose,
  onRegisterPartner,
}) => {
  const [name, setName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [stateUf, setStateUf] = useState('');
  const [lookingUpCep, setLookingUpCep] = useState(false);
  const [cepFeedback, setCepFeedback] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleLookupCep = async (cepValue?: string) => {
    const raw = (cepValue || cep).replace(/\D/g, '');
    if (raw.length !== 8) {
      setCepFeedback('O CEP precisa ter 8 dígitos.');
      return;
    }
    setLookingUpCep(true);
    setCepFeedback(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepFeedback('CEP não encontrado nos Correios.');
      } else {
        setCep(`${raw.slice(0, 5)}-${raw.slice(5)}`);
        setStreet(data.logradouro || '');
        setNeighborhood(data.bairro || '');
        setCity(data.localidade || '');
        setStateUf((data.uf || '').toUpperCase());
        setCepFeedback(null);
      }
    } catch {
      setCepFeedback('Falha ao buscar CEP. Preencha o endereço manualmente.');
    } finally {
      setLookingUpCep(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !storeName.trim() || !email.trim() || !cep.trim() || !street.trim() || !city.trim() || !acceptedTerms) {
      return;
    }

    const formattedAddress = `${street.trim()}, nº ${number.trim() || 'S/N'}${complement.trim() ? ` (${complement.trim()})` : ''} - ${neighborhood.trim() || 'Centro'}, ${city.trim()}/${stateUf.trim().toUpperCase()}`;

    onRegisterPartner({
      name: name.trim(),
      storeName: storeName.trim(),
      email: email.trim(),
      approvalStatus: 'pending',
      password: '',
      cep: cep.trim(),
      address: formattedAddress,
      street: street.trim(),
      number: number.trim(),
      complement: complement.trim(),
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      state: stateUf.trim().toUpperCase(),
      role: 'partner',
    });

    setSubmitted(true);
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setName('');
    setStoreName('');
    setEmail('');
    setCep('');
    setStreet('');
    setNumber('');
    setComplement('');
    setNeighborhood('');
    setCity('');
    setStateUf('');
    setAcceptedTerms(false);
    setCepFeedback(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md">
      <div className="bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-2xl sm:rounded-3xl w-full max-w-xl p-5 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={handleResetAndClose}
          aria-label="Fechar janela"
          className="absolute top-4 right-4 text-[var(--gg-text-muted)] hover:text-[var(--gg-text-strong)] p-1 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 flex items-center justify-center mx-auto">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h3 className="font-display text-xl font-bold text-[var(--gg-text-strong)]">
              Solicitação de Cadastro Enviada!
            </h3>
            <p className="text-xs text-[var(--gg-text-muted)] max-w-sm mx-auto leading-relaxed">
              Os dados da loja <strong className="text-[var(--gg-accent-text)]">{storeName}</strong> foram registrados. A administração irá criar a sua senha de acesso e liberar o seu painel em breve.
            </p>
            <button
              type="button"
              onClick={handleResetAndClose}
              className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold py-2.5 rounded-xl text-xs transition-colors"
            >
              Fechar e Voltar à Loja
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="pr-6">
              <div className="flex items-center gap-2 mb-1 text-[var(--gg-accent-text)]">
                <Handshake className="w-5 h-5 shrink-0" />
                <h3 className="font-display text-lg font-bold text-[var(--gg-text-strong)]">
                  Cadastro de Novo Vendedor
                </h3>
              </div>
              <p className="text-xs text-[var(--gg-text-muted)] leading-relaxed">
                Preencha seus dados completos e o endereço de postagem. A senha de acesso será gerada pelo administrador após a conferência do cadastro.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Carlos Eduardo Mendes"
                    className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border)] rounded-xl py-2 px-3 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">
                    Nome da Loja (que aparecerá no site) *
                  </label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Ex: Acervo Vintage"
                    className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border)] rounded-xl py-2 px-3 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">
                  E-mail para Acesso ao Painel *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border)] rounded-xl py-2 px-3 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* Full Shipping Origin Address */}
              <div className="bg-[var(--gg-surface-inset)] border border-[var(--gg-border)] rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--gg-accent-text)]">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Endereço Completo de Onde Será Realizado o Envio</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[var(--gg-text-muted)] mb-1">
                    CEP de Envio *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={9}
                      value={cep}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCep(val);
                        setCepFeedback(null);
                        if (val.replace(/\D/g, '').length === 8) {
                          void handleLookupCep(val);
                        }
                      }}
                      placeholder="00000-000"
                      className="flex-1 bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-xl py-2 px-3 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => handleLookupCep()}
                      disabled={lookingUpCep}
                      className="bg-[var(--gg-surface-2)] hover:opacity-90 text-[var(--gg-text-strong)] px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--gg-border)] flex items-center gap-1 shrink-0"
                    >
                      <Search className="w-3.5 h-3.5" />
                      {lookingUpCep ? 'Buscando...' : 'Buscar CEP'}
                    </button>
                  </div>
                  {cepFeedback && <p className="text-[11px] text-rose-500 mt-1">{cepFeedback}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-[var(--gg-text-muted)] mb-1">
                      Rua / Logradouro *
                    </label>
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Ex: Avenida Paulista"
                      className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-xl py-2 px-3 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--gg-text-muted)] mb-1">
                      Número *
                    </label>
                    <input
                      type="text"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="123"
                      className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-xl py-2 px-3 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--gg-text-muted)] mb-1">
                      Complemento (opcional)
                    </label>
                    <input
                      type="text"
                      value={complement}
                      onChange={(e) => setComplement(e.target.value)}
                      placeholder="Sala, Apto, Bloco"
                      className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-xl py-2 px-3 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--gg-text-muted)] mb-1">
                      Bairro *
                    </label>
                    <input
                      type="text"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Centro"
                      className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-xl py-2 px-3 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-[var(--gg-text-muted)] mb-1">
                      Cidade *
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="São Paulo"
                      className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-xl py-2 px-3 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--gg-text-muted)] mb-1">
                      Estado (UF) *
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      value={stateUf}
                      onChange={(e) => setStateUf(e.target.value.toUpperCase())}
                      placeholder="SP"
                      className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-xl py-2 px-3 text-xs text-[var(--gg-text-strong)] uppercase font-bold focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 accent-amber-500"
                  required
                />
                <span className="text-[11px] text-[var(--gg-text-muted)] leading-tight">
                  Concordo com os termos da plataforma e garanto a veracidade do endereço de postagem e dos itens anunciados. Seus dados pessoais ficam restritos à administração.
                </span>
              </label>

              <button
                type="submit"
                disabled={!acceptedTerms}
                className={`w-full font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors ${
                  acceptedTerms
                    ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                    : 'bg-[var(--gg-surface-2)] text-[var(--gg-text-subtle)] cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
                Enviar Cadastro de Vendedor
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
