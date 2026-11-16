import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  MessageSquareQuote,
  ArrowRight,
  ArrowLeft,
  Truck,
  QrCode,
  Copy,
  Check,
  MapPin,
  CreditCard,
  User,
  Search,
} from 'lucide-react';
import { CartItem, CheckoutProvider, DiscountProposal, Order } from '../types.ts';
import { formatBRL, formatIssueLabel, calculateAccurateFreight, PostalFreightOption } from '../utils/comicLogic.ts';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onRemoveItem: (hqId: string, selectedIssue?: string) => void;
  onClearCart: () => void;
  onOpenNegotiation: () => void;
  onOrderCreated: (order: Order) => void;
  storePixKey?: string;
  sellerOriginCep?: string;
  sellerCheckoutProvider?: CheckoutProvider;
  sellerCheckoutApiKey?: string;
  sellerCheckoutUrl?: string;
  approvedProposal?: DiscountProposal | null;
  onClearApprovedProposal?: () => void;
}

const MIN_ORDER_VALUE = 30.0;

const PROVIDER_LABELS: Record<CheckoutProvider, string> = {
  mercadopago: 'Mercado Pago',
  pagseguro: 'PagSeguro / PagBank',
  asaas: 'Asaas Pagamentos',
  efipay: 'Efí Pay',
  stripe: 'Stripe Checkout',
  pix_direto: 'PIX / Link Direto',
};

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onRemoveItem,
  onClearCart,
  onOpenNegotiation,
  onOrderCreated,
  storePixKey = 'neto.mmp@gmail.com',
  sellerOriginCep = '01310-100',
  sellerCheckoutProvider = 'mercadopago',
  sellerCheckoutApiKey = '',
  sellerCheckoutUrl = '',
  approvedProposal = null,
  onClearApprovedProposal,
}) => {
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'address' | 'payment' | 'confirmed'>('cart');

  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerCpf, setBuyerCpf] = useState('');
  const [buyerCep, setBuyerCep] = useState('');
  const [buyerStreet, setBuyerStreet] = useState('');
  const [buyerNumber, setBuyerNumber] = useState('');
  const [buyerComplement, setBuyerComplement] = useState('');
  const [buyerNeighborhood, setBuyerNeighborhood] = useState('');
  const [buyerCity, setBuyerCity] = useState('');
  const [buyerState, setBuyerState] = useState('');
  const [lookingUpCep, setLookingUpCep] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  const [shippingOptions, setShippingOptions] = useState<PostalFreightOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<PostalFreightOption | null>(null);
  const [loadingFreight, setLoadingFreight] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'mercadopago'>('pix');
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  const subtotal = cart.reduce((acc, item) => acc + item.hq.price * item.quantity, 0);
  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const negotiatedDiscount =
    approvedProposal && approvedProposal.status === 'approved'
      ? Math.max(0, Math.min(subtotal - 1, approvedProposal.originalTotal - approvedProposal.proposedTotal))
      : 0;
  const discountedSubtotal = Math.max(0, subtotal - negotiatedDiscount);
  const isMinimumOrderMet = subtotal >= MIN_ORDER_VALUE || Boolean(approvedProposal && approvedProposal.status === 'approved');
  const remainingToMinOrder = Math.max(0, MIN_ORDER_VALUE - subtotal);
  const shippingCost = selectedShipping?.price || 0;
  const finalTotal = Math.max(1, discountedSubtotal + shippingCost);
  const providerLabel = PROVIDER_LABELS[sellerCheckoutProvider] || 'Mercado Pago';

  useEffect(() => {
    if (approvedProposal && approvedProposal.status === 'approved') {
      if (approvedProposal.buyerName && !buyerName) setBuyerName(approvedProposal.buyerName);
      if (approvedProposal.buyerEmail && !buyerEmail) setBuyerEmail(approvedProposal.buyerEmail);
      if (approvedProposal.buyerPhone && !buyerPhone) setBuyerPhone(approvedProposal.buyerPhone);
    }
  }, [approvedProposal?.id]);

  useEffect(() => {
    if (!isOpen && checkoutStep === 'confirmed') {
      setCheckoutStep('cart');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLookupCep = async (cepToTest?: string) => {
    const raw = (cepToTest || buyerCep).replace(/\D/g, '');
    if (raw.length !== 8) {
      setAddressError('O CEP deve conter 8 dígitos numéricos.');
      return;
    }

    setLookingUpCep(true);
    setAddressError(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const data = await res.json();
      if (data.erro) {
        setAddressError('CEP não encontrado na base dos Correios.');
      } else {
        setBuyerStreet(data.logradouro || '');
        setBuyerNeighborhood(data.bairro || '');
        setBuyerCity(data.localidade || '');
        setBuyerState(data.uf || '');
        setBuyerCep(`${raw.slice(0, 5)}-${raw.slice(5)}`);
        recalculateFreight(raw);
      }
    } catch {
      setAddressError('Falha ao consultar CEP online. Preencha os campos manualmente.');
    } finally {
      setLookingUpCep(false);
    }
  };

  const recalculateFreight = (cleanCep: string) => {
    setLoadingFreight(true);
    try {
      const options = calculateAccurateFreight(cleanCep, sellerOriginCep, totalItemsCount) || [];
      setShippingOptions(options);
      if (options.length > 0 && (!selectedShipping || !options.some((o) => o.code === selectedShipping.code))) {
        setSelectedShipping(options[0]);
      }
    } finally {
      setLoadingFreight(false);
    }
  };

  const isAddressValid = () => {
    const cleanCep = buyerCep.replace(/\D/g, '');
    const cleanCpf = buyerCpf.replace(/\D/g, '');
    return (
      buyerName.trim().length >= 4 &&
      buyerEmail.includes('@') &&
      buyerPhone.replace(/\D/g, '').length >= 10 &&
      cleanCpf.length >= 11 &&
      cleanCep.length === 8 &&
      buyerStreet.trim().length > 0 &&
      buyerNumber.trim().length > 0 &&
      buyerNeighborhood.trim().length > 0 &&
      buyerCity.trim().length > 0 &&
      buyerState.trim().length === 2 &&
      selectedShipping !== null
    );
  };

  const getMissingAddressFields = () => {
    const missing: string[] = [];
    if (buyerName.trim().length < 4) missing.push('Nome Completo');
    if (!buyerEmail.includes('@')) missing.push('E-mail válido');
    if (buyerPhone.replace(/\D/g, '').length < 10) missing.push('Telefone / WhatsApp');
    if (buyerCpf.replace(/\D/g, '').length < 11) missing.push('CPF');
    if (buyerCep.replace(/\D/g, '').length !== 8) missing.push('CEP');
    if (!buyerStreet.trim()) missing.push('Rua');
    if (!buyerNumber.trim()) missing.push('Número');
    if (!buyerNeighborhood.trim()) missing.push('Bairro');
    if (!buyerCity.trim() || !buyerState.trim()) missing.push('Cidade e Estado');
    if (!selectedShipping) missing.push('Opção de Frete (PAC ou SEDEX)');
    return missing;
  };

  const handleConfirmOrder = async () => {
    if (!isAddressValid()) {
      alert('Por favor, preencha todos os campos obrigatórios do endereço e selecione o frete.');
      return;
    }

    setProcessingPayment(true);
    const orderNumber = `GG-${Date.now().toString().slice(-6)}`;
    const fullAddress = `${buyerStreet}, nº ${buyerNumber}${buyerComplement ? ` (${buyerComplement})` : ''} - ${buyerNeighborhood}, ${buyerCity}/${buyerState} - CEP: ${buyerCep}`;

    const newOrder: Order = {
      id: orderNumber,
      orderNumber,
      buyerName,
      buyerEmail,
      buyerPhone,
      buyerCpf,
      buyerCep,
      buyerAddress: fullAddress,
      buyerStreet,
      buyerNumber,
      buyerNeighborhood,
      buyerCity,
      buyerState,
      buyerComplement,
      items: cart.map((c) => ({
        hqId: c.hq.id,
        title: c.hq.title,
        price: c.hq.price,
        sellerId: c.hq.sellerId,
        sellerName: c.hq.sellerName,
        image: c.hq.images[0] || '',
        selectedIssue: c.selectedIssue,
        parentLotId: c.parentLotId,
      })),
      shippingMethod: (selectedShipping?.code as any) || 'PAC',
      shippingCost,
      subtotal,
      discount: negotiatedDiscount,
      total: finalTotal,
      paymentMethod,
      mercadopagoPaymentLink: sellerCheckoutUrl.trim() || undefined,
      pixCopiaECola: `00020126580014BR.GOV.BCB.PIX0136${storePixKey}520400005303986540${finalTotal.toFixed(2)}5802BR5909GEEK GRID6009SAO PAULO62070503***6304`,
      status: 'pending_payment',
      trackingCode: `BR${Math.floor(100000000 + Math.random() * 900000000)}SP`,
      payoutReleasedToPartners: false,
      createdAt: new Date().toISOString(),
    };

    try {
      const fallbackMpToken = (localStorage.getItem('hq_master_mp_token') || '').trim();
      const effectiveToken = sellerCheckoutApiKey.trim() || fallbackMpToken;

      if (sellerCheckoutProvider === 'mercadopago' || !sellerCheckoutUrl.trim()) {
        const res = await fetch('/api/mercadopago/create-preference', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(effectiveToken ? { 'x-mp-access-token': effectiveToken } : {}),
          },
          body: JSON.stringify({
            items: cart.map((c) => ({
              id: c.hq.id,
              title: c.hq.title,
              price: c.hq.price,
              quantity: c.quantity,
            })),
            buyer: {
              name: buyerName,
              email: buyerEmail,
              phone: buyerPhone,
              cpf: buyerCpf,
              cep: buyerCep,
              street: buyerStreet,
              number: buyerNumber,
              neighborhood: buyerNeighborhood,
              city: buyerCity,
              state: buyerState,
            },
            shippingCost,
            discount: negotiatedDiscount,
            storePixKey,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.initPoint) {
            newOrder.mercadopagoPaymentLink = data.initPoint;
            newOrder.mercadopagoPreferenceId = data.preferenceId;
          }
        }
      }
    } catch (e) {
      console.warn('API checkout logged offline, continuing in-store PIX order:', e);
    } finally {
      setCreatedOrder(newOrder);
      onOrderCreated(newOrder);
      onClearCart();
      onClearApprovedProposal?.();
      setCheckoutStep('confirmed');
      setProcessingPayment(false);
    }
  };

  const handleCopyPixCode = () => {
    const code = createdOrder?.pixCopiaECola || `00020126580014BR.GOV.BCB.PIX0136${storePixKey}520400005303986540${finalTotal.toFixed(2)}5802BR5909GEEK GRID6009SAO PAULO62070503***6304`;
    navigator.clipboard.writeText(code);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-lg bg-[var(--gg-surface)] border-l border-[var(--gg-border)] shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[var(--gg-border)] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-amber-500/15 text-[var(--gg-accent-text)] shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-base font-bold text-[var(--gg-text-strong)] truncate">
                  {checkoutStep === 'cart' && 'Seu Carrinho'}
                  {checkoutStep === 'address' && 'Endereço de Entrega'}
                  {checkoutStep === 'payment' && 'Forma de Pagamento'}
                  {checkoutStep === 'confirmed' && 'Pedido Confirmado!'}
                </h3>
                <span className="text-xs text-[var(--gg-text-muted)] tabular-nums block truncate">
                  {checkoutStep === 'cart' && `${totalItemsCount} ${totalItemsCount === 1 ? 'item selecionado' : 'itens selecionados'}`}
                  {checkoutStep === 'address' && 'Informe os dados para emissão e rastreio'}
                  {checkoutStep === 'payment' && `Total com frete: ${formatBRL(finalTotal)}`}
                  {checkoutStep === 'confirmed' && `Pedido #${createdOrder?.orderNumber}`}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Fechar carrinho"
              className="text-[var(--gg-text-muted)] hover:text-[var(--gg-text-strong)] p-1 rounded-lg transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* STEP 1: CART ITEMS LIST */}
            {checkoutStep === 'cart' && (
              <>
                {cart.length === 0 ? (
                  <div className="text-center py-16 space-y-3">
                    <ShoppingBag className="w-12 h-12 text-[var(--gg-text-subtle)] mx-auto" />
                    <p className="text-sm text-[var(--gg-text-muted)]">Seu carrinho está vazio.</p>
                    <button
                      onClick={onClose}
                      className="text-xs text-[var(--gg-accent-text)] font-bold hover:underline"
                    >
                      Explorar o Catálogo
                    </button>
                  </div>
                ) : (
                  <>
                    <div className={`p-3.5 rounded-2xl border text-xs ${
                      isMinimumOrderMet
                        ? 'bg-emerald-500/10 border-emerald-500/35 text-[var(--gg-emerald-text)]'
                        : 'bg-amber-500/10 border-amber-500/35 text-[var(--gg-accent-text)]'
                    }`}>
                      <div className="flex items-center justify-between font-bold mb-1 gap-2">
                        <span className="flex items-center gap-1.5">
                          {isMinimumOrderMet ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                          {isMinimumOrderMet ? 'Pedido Mínimo Atingido!' : `Pedido Mínimo: ${formatBRL(MIN_ORDER_VALUE)}`}
                        </span>
                        <span className="tabular-nums shrink-0">{formatBRL(subtotal)} / {formatBRL(MIN_ORDER_VALUE)}</span>
                      </div>

                      {!isMinimumOrderMet && (
                        <div className="space-y-1">
                          <div className="w-full bg-[var(--gg-border)] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-amber-500 h-full transition-all duration-300"
                              style={{ width: `${Math.min(100, (subtotal / MIN_ORDER_VALUE) * 100)}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-[var(--gg-text-muted)]">
                            Adicione mais <strong className="text-[var(--gg-text-strong)] tabular-nums">{formatBRL(remainingToMinOrder)}</strong> para liberar o checkout.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {cart.map((item) => (
                        <div
                          key={`${item.hq.id}-${item.selectedIssue || 'full'}`}
                          className="bg-[var(--gg-surface-inset)] border border-[var(--gg-border)] rounded-xl p-3 flex gap-3 items-center justify-between"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {item.hq.images[0] ? (
                              <img
                                src={item.hq.images[0]}
                                alt={item.hq.title}
                                referrerPolicy="no-referrer"
                                className="w-12 h-16 object-cover rounded-lg bg-[var(--gg-surface)] shrink-0 border border-[var(--gg-border)]"
                              />
                            ) : (
                              <div className="w-12 h-16 rounded-lg bg-[var(--gg-surface)] shrink-0 border border-[var(--gg-border)] flex items-center justify-center">
                                <ShoppingBag className="w-4 h-4 text-[var(--gg-text-subtle)]" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-[var(--gg-text-strong)] truncate">
                                {item.hq.title}
                              </h4>
                              <span className="text-[11px] text-[var(--gg-text-muted)] block truncate">
                                {item.selectedIssue
                                  ? `Avulso (${formatIssueLabel(item.selectedIssue)}) · ${item.hq.publisher}`
                                  : `${formatIssueLabel(item.hq.issueNumber)} · ${item.hq.publisher} (${item.hq.year})`}
                              </span>
                              <span className="text-[10px] text-[var(--gg-text-subtle)] block truncate">
                                Vendedor: <strong className="text-[var(--gg-text)]">{item.hq.sellerName}</strong>
                              </span>
                              <span className="font-display text-xs font-bold text-[var(--gg-accent-text)] tabular-nums">
                                {formatBRL(item.hq.price)}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => onRemoveItem(item.hq.id, item.selectedIssue)}
                            className="text-[var(--gg-text-subtle)] hover:text-rose-500 p-1.5 rounded-lg transition-colors shrink-0"
                            title="Remover do carrinho"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {negotiatedDiscount > 0 ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-2xl p-3 text-xs flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-[var(--gg-emerald-text)]">
                            <CheckCircle2 className="w-4 h-4" />
                            Desconto Aprovado Aplicado!
                          </div>
                          <span className="text-[11px] text-[var(--gg-text-muted)]">
                            Economia de <strong className="text-[var(--gg-emerald-text)] tabular-nums">{formatBRL(negotiatedDiscount)}</strong> liberada para pagamento.
                          </span>
                        </div>
                        {onClearApprovedProposal && (
                          <button
                            type="button"
                            onClick={onClearApprovedProposal}
                            className="text-[11px] text-[var(--gg-text-muted)] hover:text-[var(--gg-text-strong)] underline shrink-0"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    ) : (
                      cart.length >= 1 && (
                        <div className="bg-[var(--gg-surface-inset)] border border-amber-500/35 rounded-2xl p-3 text-xs flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-[var(--gg-accent-text)]">
                              <MessageSquareQuote className="w-4 h-4" />
                              {cart.length === 1 ? 'Negociar Desconto neste Item' : `Desconto para Pacote (${cart.length} itens)`}
                            </div>
                            <span className="text-[11px] text-[var(--gg-text-muted)]">
                              Envie sua proposta de valor para avaliação.
                            </span>
                          </div>
                          <button
                            onClick={onOpenNegotiation}
                            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-3 py-1.5 rounded-lg text-xs shrink-0 transition-colors"
                          >
                            Pedir Desconto
                          </button>
                        </div>
                      )
                    )}
                  </>
                )}
              </>
            )}

            {/* STEP 2: ADDRESS & DELIVERY FORM */}
            {checkoutStep === 'address' && (
              <div className="space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl flex items-start gap-2 text-xs text-[var(--gg-accent-text)]">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Preencha o endereço completo para envio seguro pelos Correios com seguro e código de rastreamento oficial.
                  </span>
                </div>

                <div className="bg-[var(--gg-surface-inset)] border border-[var(--gg-border)] rounded-2xl p-3.5 sm:p-4 space-y-3">
                  <h4 className="text-xs font-bold text-[var(--gg-text-strong)] uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[var(--gg-accent-text)]" />
                    Dados do Destinatário
                  </h4>

                  <div>
                    <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="Ex: Carlos Eduardo da Silva"
                      className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">E-mail (para rastreio) *</label>
                      <input
                        type="email"
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        placeholder="seu-email@gmail.com"
                        className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">WhatsApp / Telefone *</label>
                      <input
                        type="tel"
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value)}
                        placeholder="(11) 98765-4321"
                        className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">CPF (exigido pelos Correios) *</label>
                    <input
                      type="text"
                      maxLength={14}
                      value={buyerCpf}
                      onChange={(e) => setBuyerCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>

                <div className="bg-[var(--gg-surface-inset)] border border-[var(--gg-border)] rounded-2xl p-3.5 sm:p-4 space-y-3">
                  <h4 className="text-xs font-bold text-[var(--gg-text-strong)] uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[var(--gg-accent-text)]" />
                    Endereço de Entrega
                  </h4>

                  <div>
                    <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">CEP de Destino *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={9}
                        value={buyerCep}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBuyerCep(val);
                          if (val.replace(/\D/g, '').length === 8) {
                            handleLookupCep(val);
                          }
                        }}
                        placeholder="00000-000"
                        className="flex-1 bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500 font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => handleLookupCep()}
                        disabled={lookingUpCep}
                        className="bg-[var(--gg-surface-2)] text-[var(--gg-text-strong)] px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--gg-border)] flex items-center gap-1 shrink-0"
                      >
                        <Search className="w-3.5 h-3.5" />
                        {lookingUpCep ? '...' : 'Buscar CEP'}
                      </button>
                    </div>
                    {addressError && (
                      <p className="text-[11px] text-rose-500 mt-1">{addressError}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">Rua / Logradouro *</label>
                      <input
                        type="text"
                        value={buyerStreet}
                        onChange={(e) => setBuyerStreet(e.target.value)}
                        placeholder="Ex: Av. Paulista"
                        className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">Número *</label>
                      <input
                        type="text"
                        value={buyerNumber}
                        onChange={(e) => setBuyerNumber(e.target.value)}
                        placeholder="123"
                        className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500 font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">Complemento (opcional)</label>
                      <input
                        type="text"
                        value={buyerComplement}
                        onChange={(e) => setBuyerComplement(e.target.value)}
                        placeholder="Apto 42, Bloco B"
                        className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">Bairro *</label>
                      <input
                        type="text"
                        value={buyerNeighborhood}
                        onChange={(e) => setBuyerNeighborhood(e.target.value)}
                        placeholder="Bairro"
                        className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">Cidade *</label>
                      <input
                        type="text"
                        value={buyerCity}
                        onChange={(e) => setBuyerCity(e.target.value)}
                        placeholder="São Paulo"
                        className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">UF *</label>
                      <input
                        type="text"
                        maxLength={2}
                        value={buyerState}
                        onChange={(e) => setBuyerState(e.target.value.toUpperCase())}
                        placeholder="SP"
                        className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500 font-bold uppercase"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--gg-surface-inset)] border border-[var(--gg-border)] rounded-2xl p-3.5 sm:p-4 space-y-2.5">
                  <label className="text-xs font-bold text-[var(--gg-text-strong)] flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-[var(--gg-accent-text)]" />
                      Modalidade de Envio Correios *
                    </span>
                    {loadingFreight && <span className="text-[10px] text-[var(--gg-accent-text)]">Calculando frete...</span>}
                  </label>

                  {shippingOptions.length === 0 ? (
                    <p className="text-xs text-[var(--gg-text-muted)] italic">
                      Informe seu CEP acima para calcular prazos e valores oficiais do frete.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {shippingOptions.map((opt) => (
                        <label
                          key={opt.code}
                          className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                            selectedShipping?.code === opt.code
                              ? 'bg-amber-500/15 border-amber-500/60 text-[var(--gg-text-strong)] shadow-sm'
                              : 'bg-[var(--gg-surface)] border-[var(--gg-border)] text-[var(--gg-text)]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="shipping_sel"
                              checked={selectedShipping?.code === opt.code}
                              onChange={() => setSelectedShipping(opt)}
                              className="accent-amber-500"
                            />
                            <div>
                              <div className="font-bold text-[var(--gg-text-strong)]">{opt.name}</div>
                              <span className="text-[11px] text-[var(--gg-text-muted)]">{opt.days}</span>
                            </div>
                          </div>
                          <span className="font-display font-bold text-[var(--gg-accent-text)] tabular-nums text-sm shrink-0">
                            {formatBRL(opt.price)}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {!isAddressValid() && (
                  <div className="bg-[var(--gg-surface-inset)] p-3 rounded-xl border border-[var(--gg-border)] text-[11px] text-[var(--gg-text-muted)] space-y-1">
                    <span className="text-[var(--gg-accent-text)] font-bold block">Campos pendentes para liberar pagamento:</span>
                    <p>{getMissingAddressFields().join(', ')}</p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: PAYMENT METHOD */}
            {checkoutStep === 'payment' && (
              <div className="space-y-4">
                <div className="bg-[var(--gg-surface-inset)] border border-[var(--gg-border)] rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-[var(--gg-text-muted)]">
                    <span>Destinatário:</span>
                    <strong className="text-[var(--gg-text-strong)]">{buyerName}</strong>
                  </div>
                  <div className="flex justify-between items-start text-[var(--gg-text-muted)] gap-2">
                    <span>Entrega:</span>
                    <span className="text-right text-[var(--gg-text)] max-w-[240px]">
                      {buyerStreet}, nº {buyerNumber} - {buyerCity}/{buyerState} ({buyerCep})
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[var(--gg-text-muted)] border-t border-[var(--gg-border)] pt-2">
                    <span>Envio Escolhido:</span>
                    <span className="text-[var(--gg-text-strong)] font-semibold tabular-nums">{selectedShipping?.name} ({formatBRL(shippingCost)})</span>
                  </div>
                  <div className="flex justify-between items-center text-base font-bold text-[var(--gg-text-strong)] border-t border-[var(--gg-border)] pt-2">
                    <span>Total do Pedido:</span>
                    <span className="text-[var(--gg-accent-text)] font-display tabular-nums text-lg">{formatBRL(finalTotal)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={`py-3 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'pix'
                        ? 'bg-emerald-500/15 border-emerald-500 text-[var(--gg-emerald-text)] shadow-sm'
                        : 'bg-[var(--gg-surface-inset)] border-[var(--gg-border)] text-[var(--gg-text-muted)]'
                    }`}
                  >
                    <QrCode className="w-5 h-5" />
                    <span>PIX Instantâneo</span>
                    <span className="text-[10px] font-semibold">Despacho Prioritário</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mercadopago')}
                    className={`py-3 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'mercadopago'
                        ? 'bg-sky-500/15 border-sky-500 text-sky-500 shadow-sm'
                        : 'bg-[var(--gg-surface-inset)] border-[var(--gg-border)] text-[var(--gg-text-muted)]'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="truncate max-w-full">{providerLabel}</span>
                    <span className="text-[10px] text-[var(--gg-text-muted)]">Cartão / Checkout Online</span>
                  </button>
                </div>

                {paymentMethod === 'pix' && (
                  <div className="bg-[var(--gg-surface-inset)] border border-emerald-500/35 rounded-2xl p-4 text-center space-y-3">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-500/15 text-[var(--gg-emerald-text)] text-[11px] font-bold">
                      Chave Pix Recebedora
                    </span>

                    <div className="bg-white p-3 rounded-xl max-w-[180px] mx-auto text-black shadow-lg">
                      <QrCode className="w-32 h-32 mx-auto text-black" />
                      <span className="text-[10px] font-bold block mt-1 uppercase tracking-wider text-zinc-700 tabular-nums">
                        {formatBRL(finalTotal)}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] text-[var(--gg-text-muted)] block">Chave Pix:</label>
                      <div className="flex items-center gap-1.5 bg-[var(--gg-surface)] p-2 rounded-xl border border-[var(--gg-border)]">
                        <code className="text-xs text-[var(--gg-accent-text)] font-mono flex-1 truncate text-left">
                          {storePixKey}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(storePixKey);
                            setCopiedPix(true);
                            setTimeout(() => setCopiedPix(false), 2000);
                          }}
                          className="bg-[var(--gg-surface-2)] text-[var(--gg-text-strong)] px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border border-[var(--gg-border)]"
                        >
                          {copiedPix ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedPix ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-[var(--gg-text-muted)] leading-relaxed text-left">
                      <strong>Passo a passo:</strong> Abra o app do seu banco, escolha <em>Pix &gt; Transferir / Pagar</em>, insira a chave acima com o valor de <strong>{formatBRL(finalTotal)}</strong>. Em seguida, clique no botão abaixo para registrar o pedido.
                    </p>
                  </div>
                )}

                {paymentMethod === 'mercadopago' && (
                  <div className="bg-[var(--gg-surface-inset)] border border-sky-500/35 rounded-2xl p-4 text-center space-y-2.5">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-500 text-[11px] font-bold">
                      Checkout {providerLabel}
                    </span>
                    <p className="text-xs text-[var(--gg-text)] leading-relaxed text-left">
                      Ao confirmar o pedido abaixo, geramos automaticamente o link de pagamento via <strong>{providerLabel}</strong> para cartão de crédito, saldo ou PIX.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: ORDER CONFIRMED SCREEN */}
            {checkoutStep === 'confirmed' && createdOrder && (
              <div className="bg-[var(--gg-surface-inset)] border border-emerald-500/40 rounded-3xl p-5 sm:p-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/40">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h4 className="font-display text-xl font-bold text-[var(--gg-text-strong)]">
                    Pedido #{createdOrder.orderNumber} Registrado!
                  </h4>
                  <p className="text-xs text-[var(--gg-text-muted)]">
                    Obrigado pela compra na Geek Grid, <strong className="text-[var(--gg-text-strong)]">{createdOrder.buyerName}</strong>!
                  </p>
                </div>

                <div className="bg-[var(--gg-surface)] p-4 rounded-2xl border border-[var(--gg-border)] text-left space-y-2 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-[var(--gg-border)] gap-2">
                    <span className="text-[var(--gg-text-muted)]">Código de Rastreio Inicial:</span>
                    <code className="text-[var(--gg-accent-text)] font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {createdOrder.trackingCode}
                    </code>
                  </div>
                  <div className="flex justify-between text-[var(--gg-text)]">
                    <span className="text-[var(--gg-text-muted)]">Forma de Envio:</span>
                    <span>{createdOrder.shippingMethod} (Correios)</span>
                  </div>
                  <div className="flex justify-between text-[var(--gg-text)]">
                    <span className="text-[var(--gg-text-muted)]">Total do Pedido:</span>
                    <span className="font-bold text-[var(--gg-accent-text)] tabular-nums">{formatBRL(createdOrder.total)}</span>
                  </div>
                  <div className="pt-2 text-[var(--gg-text-muted)] text-[11px] border-t border-[var(--gg-border)]">
                    <span>Destino: {createdOrder.buyerAddress}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  {createdOrder.mercadopagoPaymentLink && (
                    <a
                      href={createdOrder.mercadopagoPaymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#009ee3] hover:brightness-110 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Pagar via Checkout {providerLabel}
                    </a>
                  )}

                  <button
                    onClick={handleCopyPixCode}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                  >
                    {copiedPix ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedPix ? 'Código Pix Copiado com Sucesso!' : 'Copiar Chave Pix para Pagamento'}
                  </button>

                  <button
                    onClick={() => {
                      setCheckoutStep('cart');
                      onClose();
                    }}
                    className="w-full bg-[var(--gg-surface-2)] text-[var(--gg-text)] font-semibold py-2.5 rounded-xl text-xs transition-colors border border-[var(--gg-border)]"
                  >
                    Voltar ao Catálogo
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cart Footer Navigation */}
          {checkoutStep !== 'confirmed' && cart.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-[var(--gg-border)] bg-[var(--gg-surface-inset)] space-y-3">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-[var(--gg-text-muted)]">
                  <span>Subtotal ({totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'}):</span>
                  <span className="text-[var(--gg-text-strong)] font-medium tabular-nums">{formatBRL(subtotal)}</span>
                </div>
                {negotiatedDiscount > 0 && (
                  <div className="flex justify-between text-[var(--gg-emerald-text)] font-semibold">
                    <span>Desconto Aprovado:</span>
                    <span className="tabular-nums">- {formatBRL(negotiatedDiscount)}</span>
                  </div>
                )}
                {shippingCost > 0 && (
                  <div className="flex justify-between text-[var(--gg-text-muted)]">
                    <span>Frete ({selectedShipping?.name}):</span>
                    <span className="text-[var(--gg-text-strong)] font-medium tabular-nums">{formatBRL(shippingCost)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-[var(--gg-text-strong)] pt-2 border-t border-[var(--gg-border)]">
                  <span>Total Geral:</span>
                  <span className="text-[var(--gg-accent-text)] font-display tabular-nums text-lg">
                    {formatBRL(finalTotal)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {checkoutStep !== 'cart' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (checkoutStep === 'payment') setCheckoutStep('address');
                      else if (checkoutStep === 'address') setCheckoutStep('cart');
                    }}
                    aria-label="Voltar etapa"
                    className="bg-[var(--gg-surface-2)] text-[var(--gg-text)] p-3 rounded-xl border border-[var(--gg-border)]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}

                {checkoutStep === 'cart' && (
                  <button
                    type="button"
                    onClick={() => setCheckoutStep('address')}
                    disabled={!isMinimumOrderMet}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      isMinimumOrderMet
                        ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 active:scale-95 cursor-pointer'
                        : 'bg-[var(--gg-surface-2)] text-[var(--gg-text-subtle)] cursor-not-allowed border border-[var(--gg-border)]'
                    }`}
                  >
                    {!isMinimumOrderMet ? (
                      <span>Mínimo R$ 30,00 para Finalizar</span>
                    ) : (
                      <>
                        <span>Informar Endereço & Frete</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}

                {checkoutStep === 'address' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isAddressValid()) {
                        alert(`Por favor, preencha os campos obrigatórios:\n- ${getMissingAddressFields().join('\n- ')}`);
                        return;
                      }
                      setCheckoutStep('payment');
                    }}
                    disabled={!isAddressValid()}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      isAddressValid()
                        ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 active:scale-95 cursor-pointer'
                        : 'bg-[var(--gg-surface-2)] text-[var(--gg-text-subtle)] cursor-not-allowed border border-[var(--gg-border)]'
                    }`}
                  >
                    <span>Ir para Forma de Pagamento</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {checkoutStep === 'payment' && (
                  <button
                    type="button"
                    onClick={handleConfirmOrder}
                    disabled={processingPayment}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 cursor-pointer transition-all"
                  >
                    {processingPayment ? (
                      <span>Confirmando Pedido...</span>
                    ) : (
                      <>
                        <span>Concluir Pedido ({formatBRL(finalTotal)})</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
