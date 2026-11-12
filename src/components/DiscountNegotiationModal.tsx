import React, { useState } from 'react';
import { X, MessageSquareQuote, CheckCircle, AlertCircle, Sparkles, Send } from 'lucide-react';
import { CartItem, DiscountProposal } from '../types.ts';
import { formatBRL } from '../utils/comicLogic.ts';

interface DiscountNegotiationModalProps {
  isOpen: boolean;
  cart: CartItem[];
  subtotal: number;
  distinctSellersCount: number;
  onClose: () => void;
  onSubmitProposal: (proposalData: Omit<DiscountProposal, 'id' | 'createdAt' | 'status' | 'sellerApprovals'>) => void;
}

export const DiscountNegotiationModal: React.FC<DiscountNegotiationModalProps> = ({
  isOpen,
  cart,
  subtotal,
  distinctSellersCount,
  onClose,
  onSubmitProposal,
}) => {
  if (!isOpen) return null;
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [proposedTotal, setProposedTotal] = useState(Math.round(subtotal * 0.85)); // 15% discount suggested
  const [buyerMessage, setBuyerMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const discountPercent = Math.round(((subtotal - proposedTotal) / subtotal) * 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName || !buyerEmail || proposedTotal <= 0) return;

    const itemsSummary = cart.map((c) => ({
      id: c.hq.id,
      title: c.hq.title,
      price: c.hq.price,
      sellerId: c.hq.sellerId,
      sellerName: c.hq.sellerName,
    }));

    onSubmitProposal({
      buyerName,
      buyerEmail,
      buyerPhone,
      itemIds: cart.map((c) => c.hq.id),
      itemsSummary,
      originalTotal: subtotal,
      proposedTotal: Number(proposedTotal),
      buyerMessage,
    });

    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#10131c] border border-zinc-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black text-white font-['Space_Grotesk']">
              Proposta Enviada com Sucesso!
            </h3>
            <p className="text-xs text-zinc-300 max-w-sm mx-auto leading-relaxed">
              Sua oferta de <strong className="text-amber-400">{formatBRL(proposedTotal)}</strong> para as {cart.length} edições foi encaminhada diretamente aos vendedores responsáveis.
            </p>
            <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 text-[11px] text-zinc-400 text-left">
              Como funciona: Cada vendedor avalia sua parte no painel seguro. Assim que todos aprovarem, você receberá a confirmação por e-mail com o link de pagamento com o desconto aplicado!
            </div>
            <button
              onClick={onClose}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-2.5 rounded-xl text-xs transition-colors"
            >
              Entendido, Fechar
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-2 text-amber-400">
              <MessageSquareQuote className="w-5 h-5" />
              <h3 className="text-lg font-black text-white font-['Space_Grotesk']">
                Negociação Discreta de Pacote de HQs
              </h3>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed mb-4">
              Você selecionou <strong className="text-white">{cart.length} edições</strong> no carrinho. 
              {distinctSellersCount > 1
                ? ` Elas pertencem a ${distinctSellersCount} vendedores diferentes. Todos os envolvidos receberão sua proposta e a negociação só será fechada se todos concordarem.`
                : ' A proposta será avaliada diretamente pelo vendedor no painel sem intermediários.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-zinc-900/80 p-3.5 rounded-2xl border border-zinc-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Valor Original do Pacote</span>
                  <span className="text-zinc-300 line-through font-bold text-sm">{formatBRL(subtotal)}</span>
                </div>
                <div className="text-right">
                  <span className="text-amber-400 block text-[10px] uppercase font-bold">Desconto Solicitado</span>
                  <span className="text-emerald-400 font-extrabold text-sm">{discountPercent > 0 ? `${discountPercent}% OFF` : 'Sem desconto'}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Sua Proposta de Valor Total (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-bold">R$</span>
                  <input
                    type="number"
                    min="1"
                    max={subtotal}
                    step="0.50"
                    value={proposedTotal}
                    onChange={(e) => setProposedTotal(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2 pl-9 pr-4 text-sm font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <span className="text-[11px] text-zinc-500 mt-0.5 block">
                  Economia solicitada: {formatBRL(Math.max(0, subtotal - proposedTotal))}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Seu Nome</label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Ex: João Colecionador"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Seu E-mail</label>
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Telefone / WhatsApp (Opcional)</label>
                <input
                  type="text"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Mensagem aos Vendedores (Opcional)</label>
                <textarea
                  rows={2}
                  value={buyerMessage}
                  onChange={(e) => setBuyerMessage(e.target.value)}
                  placeholder="Ex: Gostaria de fechar o lote todo para envio imediato!"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-amber-500/10"
              >
                <Send className="w-4 h-4" />
                Enviar Proposta aos Vendedores
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
