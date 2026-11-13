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
  Phone,
  FileText,
  Search,
} from 'lucide-react';
import { CartItem, DiscountProposal, Order } from '../types.ts';
import { formatBRL, calculateAccurateFreight, PostalFreightOption } from '../utils/comicLogic.ts';

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
  approvedProposal?: DiscountProposal | null;
  onClearApprovedProposal?: () => void;
}

const MIN_ORDER_VALUE = 30.0;

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
  approvedProposal = null,
  onClearApprovedProposal,
}) => {
  // Checkout Steps: 'cart' -> 'address' -> 'payment' -> 'confirmed'
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'address' | 'payment' | 'confirmed'>('cart');

  // Address & Contact State
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

  // Shipping
  const [shippingOptions, setShippingOptions] = useState<PostalFreightOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<PostalFreightOption | null>(null);
  const [loadingFreight, setLoadingFreight] = useState(false);

  // Payment & Order Confirmation State
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

  // Pre-fill buyer details when opening from an approved proposal link
  useEffect(() => {
    if (approvedProposal && approvedProposal.status === 'approved') {
      if (approvedProposal.buyerName && !buyerName) setBuyerName(approvedProposal.buyerName);
      if (approvedProposal.buyerEmail && !buyerEmail) setBuyerEmail(approvedProposal.buyerEmail);
      if (approvedProposal.buyerPhone && !buyerPhone) setBuyerPhone(approvedProposal.buyerPhone);
    }
  }, [approvedProposal?.id]);

  // Reset steps when closed
  useEffect(() => {
    if (!isOpen) {
      if (checkoutStep === 'confirmed') {
        setCheckoutStep('cart');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Auto ViaCEP lookup
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

        // Recalculate freight automatically
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

  // Address validation check
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

  // Finalize order
  const handleConfirmOrder = async () => {
    if (!isAddressValid()) {
      alert('Por favor, preencha todos os campos obrigatórios do endereço e selecione o frete.');
      return;
    }

    setProcessingPayment(true);
    const orderNumber = `HQM-${Date.now().toString().slice(-6)}`;
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
      pixCopiaECola: `00020126580014BR.GOV.BCB.PIX0136${storePixKey}520400005303986540${finalTotal.toFixed(2)}5802BR5915HQ MASTER COMICS6009SAO PAULO62070503***6304`,
      status: 'pending_payment',
      trackingCode: `BR${Math.floor(100000000 + Math.random() * 900000000)}SP`,
      payoutReleasedToPartners: false,
      createdAt: new Date().toISOString(),
    };

    try {
      const mpToken = (localStorage.getItem('hq_master_mp_token') || '').trim();
      const res = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(mpToken ? { 'x-mp-access-token': mpToken } : {}),
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
    const code = createdOrder?.pixCopiaECola || `00020126580014BR.GOV.BCB.PIX0136${storePixKey}520400005303986540${finalTotal.toFixed(2)}5802BR5915HQ MASTER COMICS6009SAO PAULO62070503***6304`;
    navigator.clipboard.writeText(code);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-lg bg-[#0f121a] border-l border-zinc-800 shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white font-['Space_Grotesk']">
                  {checkoutStep === 'cart' && 'Seu Carrinho de HQs'}
                  {checkoutStep === 'address' && 'Endereço de Entrega'}
                  {checkoutStep === 'payment' && 'Forma de Pagamento'}
                  {checkoutStep === 'confirmed' && 'Pedido Confirmado!'}
                </h3>
                <span className="text-xs text-zinc-400">
                  {checkoutStep === 'cart' && `${totalItemsCount} ${totalItemsCount === 1 ? 'revista selecionada' : 'revistas selecionadas'}`}
                  {checkoutStep === 'address' && 'Informe os dados para emissão e rastreio nos Correios'}
                  {checkoutStep === 'payment' && `Total com frete: ${formatBRL(finalTotal)}`}
                  {checkoutStep === 'confirmed' && `Pedido #${createdOrder?.orderNumber}`}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors"
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
                    <ShoppingBag className="w-12 h-12 text-zinc-700 mx-auto" />
                    <p className="text-sm text-zinc-400">Seu carrinho está vazio.</p>
                    <button
                      onClick={onClose}
                      className="text-xs text-amber-400 font-bold hover:underline"
                    >
                      Explorar o Acervo de HQs
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Minimum Order Alert */}
                    <div className={`p-3.5 rounded-2xl border text-xs ${
                      isMinimumOrderMet
                        ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                        : 'bg-amber-950/30 border-amber-800/50 text-amber-300'
                    }`}>
                      <div className="flex items-center justify-between font-bold mb-1">
                        <span className="flex items-center gap-1.5">
                          {isMinimumOrderMet ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                          {isMinimumOrderMet ? 'Pedido Mínimo Atingido!' : `Pedido Mínimo da Loja: ${formatBRL(MIN_ORDER_VALUE)}`}
                        </span>
                        <span>{formatBRL(subtotal)} / {formatBRL(MIN_ORDER_VALUE)}</span>
                      </div>

                      {!isMinimumOrderMet && (
                        <div className="space-y-1">
                          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-amber-500 h-full transition-all duration-300"
                              style={{ width: `${Math.min(100, (subtotal / MIN_ORDER_VALUE) * 100)}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-zinc-300">
                            Adicione mais <strong className="text-white">{formatBRL(remainingToMinOrder)}</strong> para liberar o checkout.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Items List */}
                    <div className="space-y-2.5">
                      {cart.map((item) => (
                        <div
                          key={`${item.hq.id}-${item.selectedIssue || 'full'}`}
                          className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 flex gap-3 items-center justify-between"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={item.hq.images[0] || 'https://images.unsplash.com/photo-1601645191163-3fc0d5d34e35?auto=format&fit=crop&w=200&q=80'}
                              alt={item.hq.title}
                              className="w-12 h-16 object-cover rounded-lg bg-zinc-950 shrink-0 border border-zinc-800"
                            />
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white truncate">
                                {item.hq.title}
                              </h4>
                              <span className="text-[11px] text-zinc-400 block">
                                {item.selectedIssue
                                  ? `Exemplar Avulso (${item.selectedIssue}) • ${item.hq.publisher}`
                                  : `Ed. #${item.hq.issueNumber} • ${item.hq.publisher} (${item.hq.year})`}
                              </span>
                              <span className="text-[10px] text-amber-400/90 block">
                                Vendedor: {item.hq.sellerName}
                              </span>
                              <span className="text-xs font-black text-amber-400 font-['Space_Grotesk']">
                                {formatBRL(item.hq.price)}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => onRemoveItem(item.hq.id, item.selectedIssue)}
                            className="text-zinc-500 hover:text-rose-400 p-1.5 rounded-lg transition-colors shrink-0"
                            title="Remover do carrinho"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Approved Discount Notice or Negotiation Trigger (Works for 1 unit, lot, or bundle) */}
                    {negotiatedDiscount > 0 ? (
                      <div className="bg-emerald-950/35 border border-emerald-600/50 rounded-2xl p-3 text-xs flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            Desconto Aprovado Aplicado!
                          </div>
                          <span className="text-[11px] text-zinc-300">
                            Economia de <strong className="text-emerald-400">{formatBRL(negotiatedDiscount)}</strong> liberada para pagamento.
                          </span>
                        </div>
                        {onClearApprovedProposal && (
                          <button
                            type="button"
                            onClick={onClearApprovedProposal}
                            className="text-[11px] text-zinc-400 hover:text-white underline shrink-0"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    ) : (
                      cart.length >= 1 && (
                        <div className="bg-gradient-to-r from-purple-950/40 via-zinc-900 to-purple-950/40 border border-purple-800/40 rounded-2xl p-3 text-xs flex items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-purple-300">
                              <MessageSquareQuote className="w-4 h-4" />
                              {cart.length === 1 ? 'Negociar Desconto neste Item' : `Desconto para Pacote (${cart.length} HQs)`}
                            </div>
                            <span className="text-[11px] text-zinc-400">
                              Ofertas dentro da margem da loja são aceitas na hora!
                            </span>
                          </div>
                          <button
                            onClick={onOpenNegotiation}
                            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs shrink-0 transition-colors"
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

            {/* STEP 2: ADDRESS & DELIVERY FORM (STRICT) */}
            {checkoutStep === 'address' && (
              <div className="space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl flex items-start gap-2 text-xs text-amber-300">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Preencha o endereço completo para envio seguro pelos Correios com seguro e código de rastreamento oficial.
                  </span>
                </div>

                {/* Buyer Personal Info */}
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    Dados do Destinatário
                  </h4>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="Ex: Carlos Eduardo da Silva"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">E-mail (para rastreio) *</label>
                      <input
                        type="email"
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        placeholder="seu-email@gmail.com"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">WhatsApp / Telefone *</label>
                      <input
                        type="tel"
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value)}
                        placeholder="(11) 98765-4321"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">CPF (exigido pelos Correios) *</label>
                    <input
                      type="text"
                      maxLength={14}
                      value={buyerCpf}
                      onChange={(e) => setBuyerCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    Endereço de Entrega
                  </h4>

                  {/* CEP with auto-lookup */}
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">CEP de Destino *</label>
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
                        className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => handleLookupCep()}
                        disabled={lookingUpCep}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-xl text-xs font-semibold border border-zinc-700 flex items-center gap-1"
                      >
                        <Search className="w-3.5 h-3.5" />
                        {lookingUpCep ? 'Buscando...' : 'Buscar CEP'}
                      </button>
                    </div>
                    {addressError && (
                      <p className="text-[11px] text-rose-400 mt-1">{addressError}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[11px] text-zinc-400 mb-1">Rua / Logradouro *</label>
                      <input
                        type="text"
                        value={buyerStreet}
                        onChange={(e) => setBuyerStreet(e.target.value)}
                        placeholder="Ex: Av. Paulista"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Número *</label>
                      <input
                        type="text"
                        value={buyerNumber}
                        onChange={(e) => setBuyerNumber(e.target.value)}
                        placeholder="123"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Complemento (opcional)</label>
                      <input
                        type="text"
                        value={buyerComplement}
                        onChange={(e) => setBuyerComplement(e.target.value)}
                        placeholder="Apto 42, Bloco B"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Bairro *</label>
                      <input
                        type="text"
                        value={buyerNeighborhood}
                        onChange={(e) => setBuyerNeighborhood(e.target.value)}
                        placeholder="Bairro"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[11px] text-zinc-400 mb-1">Cidade *</label>
                      <input
                        type="text"
                        value={buyerCity}
                        onChange={(e) => setBuyerCity(e.target.value)}
                        placeholder="São Paulo"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">UF *</label>
                      <input
                        type="text"
                        maxLength={2}
                        value={buyerState}
                        onChange={(e) => setBuyerState(e.target.value.toUpperCase())}
                        placeholder="SP"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold uppercase"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Shipping Selection */}
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-2.5">
                  <label className="text-xs font-bold text-white flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-amber-400" />
                      Modalidade de Envio Correios *
                    </span>
                    {loadingFreight && <span className="text-[10px] text-amber-400">Calculando frete...</span>}
                  </label>

                  {shippingOptions.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic">
                      Informe seu CEP acima para calcular prazos e valores oficiais do frete.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {shippingOptions.map((opt) => (
                        <label
                          key={opt.code}
                          className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                            selectedShipping?.code === opt.code
                              ? 'bg-amber-500/15 border-amber-500/60 text-white shadow-sm'
                              : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
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
                              <div className="font-bold text-zinc-100">{opt.name}</div>
                              <span className="text-[11px] text-zinc-400">{opt.days}</span>
                            </div>
                          </div>
                          <span className="font-black text-amber-400 font-['Space_Grotesk'] text-sm">
                            {formatBRL(opt.price)}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Validation Warnings */}
                {!isAddressValid() && (
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
                    <span className="text-amber-400 font-bold block">Campos pendentes para liberar pagamento:</span>
                    <p className="text-zinc-300">{getMissingAddressFields().join(', ')}</p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: PAYMENT METHOD (IN-STORE, ZERO BLACK SCREENS) */}
            {checkoutStep === 'payment' && (
              <div className="space-y-4">
                {/* Order Summary Recap */}
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-zinc-300">
                    <span>Destinatário:</span>
                    <strong className="text-white">{buyerName}</strong>
                  </div>
                  <div className="flex justify-between items-start text-zinc-400">
                    <span>Entrega:</span>
                    <span className="text-right text-zinc-200 max-w-[240px]">
                      {buyerStreet}, nº {buyerNumber} - {buyerCity}/{buyerState} ({buyerCep})
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-400 border-t border-zinc-800/80 pt-2">
                    <span>Envio Escolhido:</span>
                    <span className="text-zinc-200 font-semibold">{selectedShipping?.name} ({formatBRL(shippingCost)})</span>
                  </div>
                  <div className="flex justify-between items-center text-base font-black text-white border-t border-zinc-800/80 pt-2">
                    <span>Total do Pedido:</span>
                    <span className="text-amber-400 font-['Space_Grotesk'] text-lg">{formatBRL(finalTotal)}</span>
                  </div>
                </div>

                {/* Payment Selection Tabs */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={`py-3 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'pix'
                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 shadow-md'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <QrCode className="w-5 h-5 text-emerald-400" />
                    <span>PIX Instantâneo</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">Despacho Prioritário</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mercadopago')}
                    className={`py-3 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'mercadopago'
                        ? 'bg-sky-950/40 border-sky-500 text-sky-300 shadow-md'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-sky-400" />
                    <span>Mercado Pago</span>
                    <span className="text-[10px] text-zinc-400">Cartão / Saldo</span>
                  </button>
                </div>

                {/* PIX Payment Details */}
                {paymentMethod === 'pix' && (
                  <div className="bg-[#121622] border border-emerald-500/30 rounded-2xl p-4 text-center space-y-3">
                    <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold">
                      Chave Pix Oficial da Loja HQ Master
                    </span>

                    <div className="bg-white p-3 rounded-xl max-w-[180px] mx-auto text-black shadow-lg">
                      <QrCode className="w-32 h-32 mx-auto text-black" />
                      <span className="text-[10px] font-bold block mt-1 uppercase tracking-wider text-zinc-700">
                        {formatBRL(finalTotal)}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] text-zinc-400 block">Chave Pix da Loja:</label>
                      <div className="flex items-center gap-1.5 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                        <code className="text-xs text-amber-300 font-mono flex-1 truncate text-left">
                          {storePixKey}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(storePixKey);
                            setCopiedPix(true);
                            setTimeout(() => setCopiedPix(false), 2000);
                          }}
                          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1"
                        >
                          {copiedPix ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedPix ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-relaxed text-left">
                      <strong>Passo a passo:</strong> Abra o app do seu banco, escolha <em>Pix &gt; Transferir / Pagar</em>, insira a chave acima com o valor de <strong>{formatBRL(finalTotal)}</strong>. Em seguida, clique no botão abaixo para registrar o pedido e receber o código de rastreio.
                    </p>
                  </div>
                )}

                {/* Mercado Pago Option */}
                {paymentMethod === 'mercadopago' && (
                  <div className="bg-[#121622] border border-sky-500/30 rounded-2xl p-4 text-center space-y-3">
                    <span className="inline-block px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-400 text-[11px] font-bold">
                      Checkout Mercado Pago
                    </span>
                    <p className="text-xs text-zinc-300 leading-relaxed text-left">
                      O pedido será registrado com garantia de compra e proteção de entrega. Caso você prefira pagar com Cartão de Crédito ou Saldo Mercado Pago, confirme no botão abaixo.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: ORDER CONFIRMED SCREEN */}
            {checkoutStep === 'confirmed' && createdOrder && (
              <div className="bg-[#111520] border border-emerald-500/40 rounded-3xl p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-xl font-black text-white font-['Space_Grotesk']">
                    Pedido #{createdOrder.orderNumber} Registrado!
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Obrigado pela compra na HQ Master, <strong className="text-white">{createdOrder.buyerName}</strong>!
                  </p>
                </div>

                {/* Tracking & Details Box */}
                <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 text-left space-y-2 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                    <span className="text-zinc-400">Código de Rastreio Inicial:</span>
                    <code className="text-amber-400 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {createdOrder.trackingCode}
                    </code>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span className="text-zinc-400">Forma de Envio:</span>
                    <span>{createdOrder.shippingMethod} (Correios)</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span className="text-zinc-400">Total Pago:</span>
                    <span className="font-bold text-amber-400">{formatBRL(createdOrder.total)}</span>
                  </div>
                  <div className="pt-2 text-zinc-400 text-[11px] border-t border-zinc-800">
                    <span>Destino: {createdOrder.buyerAddress}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  {createdOrder.mercadopagoPaymentLink && (
                    <a
                      href={createdOrder.mercadopagoPaymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-gradient-to-r from-[#009ee3] to-[#0081ba] hover:brightness-110 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Pagar via Checkout Mercado Pago
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
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-2.5 rounded-xl text-xs transition-colors"
                  >
                    Voltar ao Catálogo de HQs
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cart Footer Navigation */}
          {checkoutStep !== 'confirmed' && cart.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-zinc-800 bg-zinc-950/95 space-y-3">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal ({totalItemsCount} HQs):</span>
                  <span className="text-white font-medium">{formatBRL(subtotal)}</span>
                </div>
                {negotiatedDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Desconto Aprovado:</span>
                    <span>- {formatBRL(negotiatedDiscount)}</span>
                  </div>
                )}
                {shippingCost > 0 && (
                  <div className="flex justify-between text-zinc-400">
                    <span>Frete ({selectedShipping?.name}):</span>
                    <span className="text-white font-medium">{formatBRL(shippingCost)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-zinc-800">
                  <span>Total Geral:</span>
                  <span className="text-amber-400 font-['Space_Grotesk'] text-lg">
                    {formatBRL(finalTotal)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {checkoutStep !== 'cart' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (checkoutStep === 'payment') setCheckoutStep('address');
                      else if (checkoutStep === 'address') setCheckoutStep('cart');
                    }}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-3 rounded-xl border border-zinc-700"
                    title="Voltar etapa"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}

                {checkoutStep === 'cart' && (
                  <button
                    type="button"
                    onClick={() => setCheckoutStep('address')}
                    disabled={!isMinimumOrderMet}
                    className={`flex-1 py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-xl transition-all ${
                      isMinimumOrderMet
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black active:scale-95 cursor-pointer'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
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
                    className={`flex-1 py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-xl transition-all ${
                      isAddressValid()
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black active:scale-95 cursor-pointer'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
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
                    className="flex-1 py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black active:scale-95 cursor-pointer transition-all"
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
