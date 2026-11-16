import React, { useState, useEffect } from 'react';
import { X, MessageSquareQuote, CheckCircle, Send, Copy, Check, ArrowRight, Zap } from 'lucide-react';
import { CartItem, DiscountProposal, Seller } from '../types.ts';
import { formatBRL, calculateAutoDiscountLimit, evaluateOfferAgainstPolicy } from '../utils/comicLogic.ts';

interface DiscountNegotiationModalProps {
  isOpen: boolean;
  cart: CartItem[];
  sellers: Pick<Seller, 'id' | 'maxDiscountPercent'>[];
  subtotal: number;
  distinctSellersCount: number;
  onClose: () => void;
  onSubmitProposal: (
    proposalData: Omit<DiscountProposal, 'id' | 'createdAt' | 'status' | 'sellerApprovals'>,
    autoApprove?: boolean
  ) => DiscountProposal;
  onProceedToAutoApprovedCheckout: (proposal: DiscountProposal) => void;
}

export const DiscountNegotiationModal: React.FC<DiscountNegotiationModalProps> = ({
  isOpen,
  cart,
  sellers,
  subtotal,
  distinctSellersCount,
  onClose,
  onSubmitProposal,
  onProceedToAutoApprovedCheckout,
}) => {
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [proposedTotal, setProposedTotal] = useState(() => Math.max(1, Math.round(subtotal * 0.9)));
  const [buyerMessage, setBuyerMessage] = useState('');
  const [createdProposal, setCreatedProposal] = useState<DiscountProposal | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProposedTotal(Math.max(1, Math.round(subtotal * 0.9)));
      setCreatedProposal(null);
      setCopiedLink(false);
    }
  }, [isOpen, subtotal]);

  if (!isOpen) return null;

  const policy = calculateAutoDiscountLimit(cart, sellers);
  const offerEvaluation = evaluateOfferAgainstPolicy(subtotal, proposedTotal, policy.maxAutoDiscountAmount);
  const discountPercent = subtotal > 0 ? Math.max(0, Math.round(((subtotal - proposedTotal) / subtotal) * 100)) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName.trim() || !buyerEmail.includes('@') || proposedTotal <= 0 || proposedTotal > subtotal) return;

    const itemsSummary = cart.map((c) => ({
      id: c.hq.id,
      title: c.hq.title,
      price: c.hq.price,
      sellerId: c.hq.sellerId,
      sellerName: c.hq.sellerName,
    }));

    const isAutoApproved = offerEvaluation === 'auto_approve';

    const savedProposal = onSubmitProposal(
      {
        buyerName: buyerName.trim(),
        buyerEmail: buyerEmail.trim(),
        buyerPhone: buyerPhone.trim(),
        itemIds: cart.map((c) => c.hq.id),
        itemsSummary,
        originalTotal: subtotal,
        proposedTotal: Number(proposedTotal),
        discountAmount: Number(Math.max(0, subtotal - proposedTotal).toFixed(2)),
        buyerMessage: buyerMessage.trim(),
      },
      isAutoApproved
    );

    setCreatedProposal(savedProposal);
  };

  const handleCopyLink = () => {
    if (!createdProposal?.paymentLink) return;
    navigator.clipboard.writeText(createdProposal.paymentLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md">
      <div className="bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-2xl sm:rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          aria-label="Fechar janela"
          className="absolute top-4 right-4 text-[var(--gg-text-muted)] hover:text-[var(--gg-text-strong)] p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {createdProposal ? (
          createdProposal.status === 'approved' ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-500 mx-auto flex items-center justify-center">
                <Zap className="w-7 h-7" />
              </div>
              <h3 className="font-display text-xl font-bold text-[var(--gg-text-strong)]">
                Proposta Aceita!
              </h3>
              <p className="text-xs text-[var(--gg-text-muted)] max-w-sm mx-auto leading-relaxed">
                Sua proposta de <strong className="text-[var(--gg-emerald-text)] tabular-nums">{formatBRL(createdProposal.proposedTotal)}</strong> (economia de{' '}
                <strong className="text-[var(--gg-accent-text)] tabular-nums">{formatBRL(createdProposal.originalTotal - createdProposal.proposedTotal)}</strong>) foi aprovada e seu pagamento já está liberado!
              </p>

              {createdProposal.paymentLink && (
                <div className="bg-[var(--gg-surface-inset)] p-3 rounded-xl border border-[var(--gg-border)] text-left space-y-1.5">
                  <span className="text-[11px] font-semibold text-[var(--gg-text-muted)] block">
                    Link Direto de Pagamento com Desconto:
                  </span>
                  <div className="flex items-center gap-2">
                    <code className="text-[11px] text-[var(--gg-accent-text)] font-mono flex-1 truncate">
                      {createdProposal.paymentLink}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="bg-[var(--gg-surface-2)] text-[var(--gg-text-strong)] px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 shrink-0 border border-[var(--gg-border)]"
                    >
                      {copiedLink ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      {copiedLink ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => onProceedToAutoApprovedCheckout(createdProposal)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>Ir para Endereço & Pagamento Agora</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-[var(--gg-surface-2)] text-[var(--gg-text)] font-bold py-2.5 rounded-xl text-xs transition-colors border border-[var(--gg-border)]"
                >
                  Fechar
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-500 mx-auto flex items-center justify-center">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h3 className="font-display text-xl font-bold text-[var(--gg-text-strong)]">
                Proposta Enviada ao Vendedor!
              </h3>
              <p className="text-xs text-[var(--gg-text-muted)] max-w-sm mx-auto leading-relaxed">
                Sua proposta de <strong className="text-[var(--gg-accent-text)] tabular-nums">{formatBRL(createdProposal.proposedTotal)}</strong> ({discountPercent}% OFF) foi registrada e encaminhada para análise do vendedor.
              </p>
              <div className="bg-[var(--gg-surface-inset)] p-3 rounded-xl border border-[var(--gg-border)] text-[11px] text-[var(--gg-text-muted)] text-left">
                Assim que o vendedor aprovar a proposta, o link de pagamento com o desconto será liberado para você concluir o pedido com endereço e frete.
              </div>
              <button
                onClick={onClose}
                className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Entendido, Fechar
              </button>
            </div>
          )
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-2 text-[var(--gg-accent-text)] pr-6">
              <MessageSquareQuote className="w-5 h-5 shrink-0" />
              <h3 className="font-display text-lg font-bold text-[var(--gg-text-strong)]">
                Negociar Valor ({cart.length === 1 ? 'Unidade / Lote' : `Pacote de ${cart.length} Itens`})
              </h3>
            </div>

            <p className="text-xs text-[var(--gg-text-muted)] leading-relaxed mb-4">
              Informe o valor que deseja pagar pelos itens selecionados. Sua proposta será avaliada para {distinctSellersCount > 1 ? `os ${distinctSellersCount} vendedores envolvidos` : 'liberação de pagamento'}.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-[var(--gg-surface-inset)] p-3.5 rounded-2xl border border-[var(--gg-border)] flex items-center justify-between text-xs">
                <div>
                  <span className="text-[var(--gg-text-subtle)] block text-[10px] uppercase font-semibold">Valor Original</span>
                  <span className="text-[var(--gg-text-muted)] line-through font-bold text-sm tabular-nums">{formatBRL(subtotal)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[var(--gg-accent-text)] block text-[10px] uppercase font-bold">Desconto Solicitado</span>
                  <span className="text-[var(--gg-emerald-text)] font-bold text-sm tabular-nums">
                    {discountPercent > 0 ? `${discountPercent}% OFF` : 'Sem desconto'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">
                  Sua Proposta de Valor Total (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--gg-text-subtle)] font-bold">R$</span>
                  <input
                    type="number"
                    min="1"
                    max={subtotal}
                    step="0.50"
                    value={proposedTotal}
                    onChange={(e) => setProposedTotal(Number(e.target.value))}
                    className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border)] rounded-xl py-2 pl-9 pr-4 text-sm font-bold text-[var(--gg-accent-text)] tabular-nums focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <span className="text-[11px] text-[var(--gg-text-subtle)] mt-0.5 block tabular-nums">
                  Economia solicitada: {formatBRL(Math.max(0, subtotal - proposedTotal))}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">Seu Nome *</label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Ex: João Colecionador"
                    className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border)] rounded-xl py-2 px-3 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">Seu E-mail *</label>
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border)] rounded-xl py-2 px-3 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">Telefone / WhatsApp (Opcional)</label>
                <input
                  type="text"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border)] rounded-xl py-2 px-3 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">Mensagem ao Vendedor (Opcional)</label>
                <textarea
                  rows={2}
                  value={buyerMessage}
                  onChange={(e) => setBuyerMessage(e.target.value)}
                  placeholder="Ex: Gostaria de fechar para pagamento imediato!"
                  className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border)] rounded-xl py-2 px-3 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={offerEvaluation === 'invalid'}
                className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg"
              >
                <Send className="w-4 h-4" />
                Enviar Proposta de Valor
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
