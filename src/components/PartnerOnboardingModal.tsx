import React, { useState } from 'react';
import { X, Handshake, ShieldAlert, CheckCircle, Store, Send, MapPin } from 'lucide-react';
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
  const [password, setPassword] = useState('');
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !acceptedTerms) return;

    onRegisterPartner({
      name,
      storeName: storeName || `Acervo de ${name}`,
      email,
      password: password || '123456',
      cep,
      address,
      role: 'partner',
    });

    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#10131c] border border-zinc-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black text-white font-['Space_Grotesk']">
              Cadastro de Parceiro Registrado!
            </h3>
            <p className="text-xs text-zinc-300 max-w-sm mx-auto leading-relaxed">
              Sua loja <strong className="text-amber-400">{storeName}</strong> foi cadastrada. A administração da BancaHQ liberou seu acesso ao painel com seu e-mail e senha!
            </p>
            <button
              onClick={onClose}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-2.5 rounded-xl text-xs"
            >
              Começar a Anunciar HQs
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-2 text-amber-400">
              <Handshake className="w-5 h-5" />
              <h3 className="text-lg font-black text-white font-['Space_Grotesk']">
                Anuncie Suas HQs Conosco
              </h3>
            </div>

            {/* Crucial Escrow & Safety Policy */}
            <div className="bg-amber-950/20 border border-amber-600/40 rounded-2xl p-3.5 mb-4 space-y-2 text-xs text-amber-200/90">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Como Funciona a Parceria & Repasse Financeiro:
              </div>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-zinc-300 leading-relaxed">
                <li>Você ganha acesso ao painel exclusivo para fotografar suas revistas e catalogar com leitura visual de capas.</li>
                <li>Cada anúncio exibirá com destaque: <strong className="text-white">"Vendido por: [Nome da Sua Loja]"</strong>.</li>
                <li><strong className="text-amber-300">Repasse Seguro:</strong> A administração financeira é centralizada e o pagamento das suas vendas é repassado após o comprador receber a encomenda com rastreamento confirmado.</li>
                <li>Nosso compromisso de honra: higienização a seco e garantia de 100% de páginas presentes.</li>
              </ul>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Seu Nome</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Carlos Gibis"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Nome da Sua Loja / Banca</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Ex: Gibiteca Vintage"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Seu E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@parceiro.com"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Senha de Acesso</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Crie uma senha"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">CEP de Origem (Para Frete)</label>
                  <input
                    type="text"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    placeholder="Ex: 01310-100"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Cidade / Estado</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ex: São Paulo - SP"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                    required
                  />
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
                <span className="text-[11px] text-zinc-400 leading-tight">
                  Concordo com os termos de repasse financeiro após entrega confirmada e declaro que todas as minhas HQs contêm 100% das páginas para leitura.
                </span>
              </label>

              <button
                type="submit"
                disabled={!acceptedTerms}
                className={`w-full font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg ${
                  acceptedTerms
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
                Cadastrar Minha Banca de Parceiro
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
