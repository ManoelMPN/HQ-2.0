import React, { useState } from 'react';
import { X, CheckCircle, ShieldCheck, HeartHandshake, Layers, Sparkles, Store, MapPin, Calendar, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import { HQItem } from '../types.ts';
import { formatBRL, getConditionInfo } from '../utils/comicLogic.ts';

interface HQDetailModalProps {
  hq: HQItem | null;
  onClose: () => void;
  onAddToCart: (hq: HQItem) => void;
  isInCart: boolean;
}

export const HQDetailModal: React.FC<HQDetailModalProps> = ({
  hq,
  onClose,
  onAddToCart,
  isInCart,
}) => {
  if (!hq) return null;

  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const conditionMeta = getConditionInfo(hq.condition);
  const images = hq.images.length > 0 ? hq.images : ['https://images.unsplash.com/photo-1601645191163-3fc0d5d34e35?auto=format&fit=crop&w=800&q=80'];

  const nextPhoto = () => setActivePhotoIdx((prev) => (prev + 1) % images.length);
  const prevPhoto = () => setActivePhotoIdx((prev) => (prev - 1 + images.length) % images.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f121a] border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl relative flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Fechar modal"
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-5 sm:p-7">
          {/* Photos Gallery Column */}
          <div className="md:col-span-5 flex flex-col gap-3">
            <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-black border border-zinc-800 shadow-xl group">
              <img
                src={images[activePhotoIdx]}
                alt={`${hq.title} - Foto ${activePhotoIdx + 1}`}
                className="w-full h-full object-contain"
              />

              {/* Prev / Next buttons if multiple photos */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    aria-label="Foto anterior"
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-opacity"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={nextPhoto}
                    aria-label="Próxima foto"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-opacity"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Photo counter */}
              <div className="absolute bottom-2.5 right-2.5 bg-black/80 backdrop-blur-md text-amber-300 text-xs px-2.5 py-1 rounded-full font-bold border border-amber-500/30">
                {activePhotoIdx + 1} de {images.length} fotos
              </div>
            </div>

            {/* Thumbnails list */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActivePhotoIdx(idx)}
                    className={`w-14 h-18 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                      idx === activePhotoIdx
                        ? 'border-amber-500 scale-105'
                        : 'border-zinc-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Guarantee badge under photos */}
            <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-3 text-xs text-emerald-300 flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <strong className="block font-semibold">Garantia 100% Páginas Completas</strong>
                <span className="text-zinc-300 text-[11px]">
                  Sem páginas faltantes, miolo íntegro para leitura integral.
                </span>
              </div>
            </div>
          </div>

          {/* Details Column */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-4">
            <div>
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-black uppercase tracking-wider bg-zinc-800 text-amber-300 px-2.5 py-1 rounded-lg border border-zinc-700">
                  {hq.publisher}
                </span>

                <span className="text-xs font-bold bg-amber-500/10 text-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Coleção: {hq.franchiseCategory}
                </span>

                {hq.isCollection && (
                  <span className="text-xs font-black bg-indigo-600 text-white px-2.5 py-1 rounded-lg shadow flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" /> Lote Completo ({hq.collectionCount} revistas)
                  </span>
                )}
              </div>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl font-black text-white font-['Space_Grotesk'] leading-tight mb-2">
                {hq.title}
              </h2>

              {/* Series and metadata */}
              <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300 mb-4 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Série / Título</span>
                  <span className="font-medium text-white">{hq.series}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Edição / Número</span>
                  <span className="font-medium text-white">#{hq.issueNumber}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Ano de Lançamento</span>
                  <span className="font-medium text-white">{hq.year}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Higienização</span>
                  <span className="font-medium text-emerald-400">Pano seco e limpo</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5 mb-4">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide">
                  Descrição & Sinopse
                </h4>
                <p className="text-sm text-zinc-200 leading-relaxed bg-zinc-950/40 p-3 rounded-xl border border-zinc-850">
                  {hq.description}
                </p>
              </div>

              {/* Condition breakdown */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide">
                    Estado de Conservação Declarado
                  </h4>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${conditionMeta.badgeClass}`}>
                    {conditionMeta.label}
                  </span>
                </div>

                <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 text-xs text-zinc-300 space-y-1.5">
                  <p>{conditionMeta.fullDesc}</p>
                  {hq.conditionDetails && (
                    <div className="text-[11px] text-amber-200/90 pt-1 border-t border-zinc-800/80 font-medium">
                      <strong>Observações do exemplar:</strong> {hq.conditionDetails}
                    </div>
                  )}
                </div>
              </div>

              {/* Seller attribution and Shipping location */}
              <div className="flex items-center justify-between bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase">Anunciado e Vendido por</span>
                    <strong className="text-zinc-100">{hq.sellerName}</strong>
                  </div>
                </div>

                {hq.sellerAddress && (
                  <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{hq.sellerAddress}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Checkout Action */}
            <div className="pt-4 border-t border-zinc-800 flex items-center justify-between gap-4">
              <div>
                <span className="text-xs text-zinc-400 block font-medium">Valor do Exemplar</span>
                <span className="text-2xl font-black text-amber-400 font-['Space_Grotesk']">
                  {formatBRL(hq.price)}
                </span>
              </div>

              <button
                onClick={() => {
                  onAddToCart(hq);
                  onClose();
                }}
                className={`flex items-center gap-2 font-bold px-6 py-3 rounded-xl transition-all active:scale-95 shadow-lg ${
                  isInCart
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{isInCart ? 'No Carrinho (Ver Carrinho)' : 'Adicionar ao Carrinho'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
