import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Layers, Sparkles, Store, ShoppingBag, ChevronLeft, ChevronRight, Check, BookOpen } from 'lucide-react';
import { HQItem } from '../types.ts';
import { formatBRL, formatIssueLabel, getConditionInfo, parseIssueNumbersFromRange } from '../utils/comicLogic.ts';

interface HQDetailModalProps {
  hq: HQItem | null;
  onClose: () => void;
  onAddToCart: (hq: HQItem, selectedIssues?: string[]) => void;
  isInCart: boolean;
}

export const HQDetailModal: React.FC<HQDetailModalProps> = ({
  hq,
  onClose,
  onAddToCart,
  isInCart,
}) => {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [purchaseMode, setPurchaseMode] = useState<'lot' | 'unit'>('lot');
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setActivePhotoIdx(0);
    setPurchaseMode('lot');
    setSelectedIssues([]);
    setImgError(false);
  }, [hq?.id]);

  if (!hq) return null;

  const conditionMeta = getConditionInfo(hq.condition);
  const images = hq.images && hq.images.length > 0 ? hq.images : [];
  const issueLabel = formatIssueLabel(hq.issueNumber);

  const nextPhoto = () => {
    setImgError(false);
    setActivePhotoIdx((prev) => (prev + 1) % images.length);
  };
  const prevPhoto = () => {
    setImgError(false);
    setActivePhotoIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  const canSelectAvulso = Boolean(hq.isCollection && hq.allowsUnitPurchase && hq.unitPrice && hq.unitPrice > 0);
  const soldSet = new Set(hq.soldIssues || []);
  const allLotIssues = hq.isCollection
    ? parseIssueNumbersFromRange(hq.issueNumber, hq.collectionCount || 1)
    : [];
  const availableIssues = allLotIssues.filter((issue) => !soldSet.has(issue));

  const lotDisplayPrice = hq.bundlePrice || hq.price;
  const unitDisplayPrice = hq.unitPrice || hq.price;
  const effectiveCheckoutPrice =
    purchaseMode === 'unit' && canSelectAvulso
      ? unitDisplayPrice * selectedIssues.length
      : lotDisplayPrice;

  const toggleIssue = (issue: string) => {
    setSelectedIssues((prev) =>
      prev.includes(issue) ? prev.filter((item) => item !== issue) : [...prev, issue]
    );
  };

  const canConfirmPurchase =
    !hq.isCollection || purchaseMode === 'lot' || (purchaseMode === 'unit' && selectedIssues.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-black/75 backdrop-blur-md">
      <div className="bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-2xl sm:rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl relative flex flex-col">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar modal"
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-20 w-9 h-9 rounded-full bg-[var(--gg-surface-2)] hover:opacity-85 text-[var(--gg-text-muted)] hover:text-[var(--gg-text-strong)] border border-[var(--gg-border)] flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 p-4 sm:p-7">
          {/* Photos Gallery Column */}
          <div className="md:col-span-5 flex flex-col gap-3">
            <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-[var(--gg-surface-inset)] border border-[var(--gg-border)]">
              {images.length > 0 && !imgError ? (
                <img
                  src={images[activePhotoIdx]}
                  alt={`${hq.title} - Foto ${activePhotoIdx + 1}`}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[var(--gg-text-subtle)] p-6 text-center">
                  <BookOpen className="w-10 h-10 opacity-60" />
                  <span className="text-xs">{hq.title}</span>
                </div>
              )}

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prevPhoto}
                    aria-label="Foto anterior"
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-opacity"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={nextPhoto}
                    aria-label="Próxima foto"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-opacity"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {images.length > 0 && (
                <div className="absolute bottom-2.5 right-2.5 bg-black/80 backdrop-blur-md text-zinc-200 text-xs px-2.5 py-1 rounded-lg font-medium border border-zinc-700 tabular-nums">
                  {activePhotoIdx + 1} de {images.length}
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => {
                      setImgError(false);
                      setActivePhotoIdx(idx);
                    }}
                    className={`w-14 h-18 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                      idx === activePhotoIdx
                        ? 'border-amber-500'
                        : 'border-[var(--gg-border)] opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Miniatura ${idx + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-[var(--gg-emerald-text)] flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <div>
                <strong className="block font-semibold">Procedência Verificada</strong>
                <span className="text-[var(--gg-text-muted)] text-[11px]">
                  Item conferido integralmente antes do envio.
                </span>
              </div>
            </div>
          </div>

          {/* Details Column */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--gg-text-muted)] mb-2 pr-8">
                <span className="font-semibold text-[var(--gg-text-strong)] uppercase tracking-wide">
                  {hq.publisher}
                </span>
                <span className="opacity-50">·</span>
                <span className="text-[var(--gg-accent-text)] font-medium flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> {hq.franchiseCategory}
                </span>
                {hq.isCollection && (
                  <>
                    <span className="opacity-50">·</span>
                    <span className="text-[var(--gg-text-strong)] font-semibold flex items-center gap-1 tabular-nums">
                      <Layers className="w-3.5 h-3.5 text-[var(--gg-accent-text)]" /> Lote ({hq.collectionCount} itens)
                    </span>
                  </>
                )}
              </div>

              <h2 className="font-display text-lg sm:text-2xl font-bold text-[var(--gg-text-strong)] leading-tight mb-3">
                {hq.title}
              </h2>

              <div className="grid grid-cols-2 gap-2.5 text-xs text-[var(--gg-text)] mb-4 bg-[var(--gg-surface-inset)] p-3.5 rounded-xl border border-[var(--gg-border)]">
                <div className="min-w-0">
                  <span className="text-[var(--gg-text-subtle)] block text-[10px] uppercase font-semibold">Série / Linha</span>
                  <span className="font-medium text-[var(--gg-text-strong)] break-words">{hq.series}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-[var(--gg-text-subtle)] block text-[10px] uppercase font-semibold">Edição / Modelo</span>
                  <span className="font-medium text-[var(--gg-text-strong)] font-mono break-words">{issueLabel}</span>
                </div>
                <div>
                  <span className="text-[var(--gg-text-subtle)] block text-[10px] uppercase font-semibold">Ano</span>
                  <span className="font-medium text-[var(--gg-text-strong)] tabular-nums">{hq.year}</span>
                </div>
                <div>
                  <span className="text-[var(--gg-text-subtle)] block text-[10px] uppercase font-semibold">Integridade</span>
                  <span className="font-medium text-[var(--gg-emerald-text)]">100% Conferido</span>
                </div>
              </div>

              {/* Unit vs Collection Option Selector */}
              {hq.isCollection && (
                <div className="p-3.5 bg-[var(--gg-surface-inset)] rounded-2xl border border-amber-500/35 text-xs space-y-3 mb-4">
                  <span className="font-bold text-[var(--gg-accent-text)] block">
                    Escolha como deseja comprar:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPurchaseMode('lot')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        purchaseMode === 'lot'
                          ? 'bg-[var(--gg-surface)] border-amber-500 ring-1 ring-amber-500/40'
                          : 'bg-[var(--gg-surface-2)] border-[var(--gg-border)] opacity-80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] uppercase font-bold text-[var(--gg-accent-text)]">
                          Lote Completo
                        </span>
                        {purchaseMode === 'lot' && <Check className="w-3.5 h-3.5 text-[var(--gg-accent-text)]" />}
                      </div>
                      <strong className="text-[var(--gg-text-strong)] text-sm block tabular-nums">{formatBRL(lotDisplayPrice)}</strong>
                      <span className="text-[10px] text-[var(--gg-text-muted)] block mt-0.5">
                        Pacote inteiro ({hq.collectionCount} itens)
                      </span>
                    </button>

                    {canSelectAvulso && (
                      <button
                        type="button"
                        onClick={() => {
                          setPurchaseMode('unit');
                          if (selectedIssues.length === 0 && availableIssues.length > 0) {
                            setSelectedIssues([availableIssues[0]]);
                          }
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          purchaseMode === 'unit'
                            ? 'bg-[var(--gg-surface)] border-emerald-500 ring-1 ring-emerald-500/40'
                            : 'bg-[var(--gg-surface-2)] border-[var(--gg-border)]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] uppercase font-bold text-[var(--gg-emerald-text)]">
                            Avulso (1 por 1)
                          </span>
                          {purchaseMode === 'unit' && <Check className="w-3.5 h-3.5 text-[var(--gg-emerald-text)]" />}
                        </div>
                        <strong className="text-[var(--gg-text-strong)] text-sm block tabular-nums">{formatBRL(unitDisplayPrice)}</strong>
                        <span className="text-[10px] text-[var(--gg-text-muted)] block mt-0.5">
                          Escolha as edições ({availableIssues.length} disponíveis)
                        </span>
                      </button>
                    )}
                  </div>

                  {canSelectAvulso && purchaseMode === 'unit' && (
                    <div className="bg-[var(--gg-surface)] border border-emerald-500/35 rounded-xl p-3 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-[var(--gg-emerald-text)]">
                          Selecione as unidades desejadas:
                        </span>
                        <span className="text-[var(--gg-text-muted)] tabular-nums">
                          {selectedIssues.length} selecionada(s)
                        </span>
                      </div>

                      {availableIssues.length === 0 ? (
                        <p className="text-[11px] text-rose-500">
                          Todas as unidades avulsas deste lote já foram vendidas.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                          {availableIssues.map((issue) => {
                            const selected = selectedIssues.includes(issue);
                            return (
                              <button
                                key={issue}
                                type="button"
                                onClick={() => toggleIssue(issue)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer font-mono ${
                                  selected
                                    ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                                    : 'bg-[var(--gg-surface-2)] text-[var(--gg-text)] border-[var(--gg-border)]'
                                }`}
                              >
                                {issue}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {selectedIssues.length > 0 && (
                        <div className="flex items-center justify-between pt-2 border-t border-[var(--gg-border)] text-[11px] gap-2">
                          <span className="text-[var(--gg-text-muted)] truncate">
                            Edições: <strong className="text-[var(--gg-text-strong)]">{selectedIssues.join(', ')}</strong>
                          </span>
                          <span className="font-bold text-[var(--gg-emerald-text)] tabular-nums shrink-0">
                            {formatBRL(effectiveCheckoutPrice)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5 mb-4">
                <h4 className="text-xs font-semibold text-[var(--gg-text-muted)] uppercase tracking-wide">
                  Descrição
                </h4>
                <p className="text-sm text-[var(--gg-text)] leading-relaxed bg-[var(--gg-surface-inset)] p-3.5 rounded-xl border border-[var(--gg-border)]">
                  {hq.description}
                </p>
              </div>

              {/* Condition breakdown */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-[var(--gg-text-muted)] uppercase tracking-wide">
                    Estado de Conservação
                  </h4>
                  <span className="text-xs font-semibold text-[var(--gg-accent-text)]">
                    {conditionMeta.label}
                  </span>
                </div>

                <div className="bg-[var(--gg-surface-inset)] p-3.5 rounded-xl border border-[var(--gg-border)] text-xs text-[var(--gg-text)] space-y-1.5">
                  <p>{conditionMeta.fullDesc}</p>
                  {hq.conditionDetails && (
                    <div className="text-[11px] text-[var(--gg-accent-text)] pt-1.5 border-t border-[var(--gg-border)] font-medium">
                      <strong>Observações:</strong> {hq.conditionDetails}
                    </div>
                  )}
                </div>
              </div>

              {/* Seller attribution (name only) */}
              <div className="flex items-center bg-[var(--gg-surface-inset)] p-3 rounded-xl border border-[var(--gg-border)] text-xs text-[var(--gg-text-muted)]">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-[var(--gg-accent-text)]" />
                  <div>
                    <span className="text-[10px] text-[var(--gg-text-subtle)] block uppercase">Vendido por</span>
                    <strong className="text-[var(--gg-text-strong)]">{hq.sellerName}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Checkout Action */}
            <div className="pt-4 border-t border-[var(--gg-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs text-[var(--gg-text-muted)] block font-medium">
                  {purchaseMode === 'unit' && canSelectAvulso
                    ? `${selectedIssues.length} Avulso(s)`
                    : hq.isCollection
                    ? 'Valor do Lote'
                    : 'Valor'}
                </span>
                <span className="font-display text-2xl font-bold text-[var(--gg-accent-text)] tabular-nums">
                  {formatBRL(effectiveCheckoutPrice)}
                </span>
              </div>

              <button
                type="button"
                disabled={!canConfirmPurchase}
                onClick={() => {
                  onAddToCart(hq, purchaseMode === 'unit' && canSelectAvulso ? selectedIssues : undefined);
                  onClose();
                }}
                className={`flex items-center justify-center gap-2 font-bold px-6 py-3 rounded-xl transition-colors active:scale-95 w-full sm:w-auto ${
                  !canConfirmPurchase
                    ? 'bg-[var(--gg-surface-2)] text-[var(--gg-text-subtle)] cursor-not-allowed'
                    : isInCart && purchaseMode === 'lot'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>
                  {!canConfirmPurchase
                    ? 'Selecione ao menos 1 unidade'
                    : purchaseMode === 'unit' && canSelectAvulso
                    ? `Adicionar ${selectedIssues.length} Avulso(s)`
                    : isInCart
                    ? 'No Carrinho'
                    : 'Adicionar ao Carrinho'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
