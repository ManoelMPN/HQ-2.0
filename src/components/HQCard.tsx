import React from 'react';
import { Layers, Flame, CheckCircle, Camera, ShoppingBag, Eye, Store } from 'lucide-react';
import { HQItem } from '../types.ts';
import { formatBRL, getConditionInfo } from '../utils/comicLogic.ts';

interface HQCardProps {
  hq: HQItem;
  onSelect: (hq: HQItem) => void;
  onAddToCart: (hq: HQItem) => void;
  isInCart: boolean;
}

export const HQCard: React.FC<HQCardProps> = ({
  hq,
  onSelect,
  onAddToCart,
  isInCart,
}) => {
  const conditionMeta = getConditionInfo(hq.condition);
  const coverImage = hq.images[0] || 'https://images.unsplash.com/photo-1601645191163-3fc0d5d34e35?auto=format&fit=crop&w=600&q=80';
  const photoCount = hq.images.length;

  return (
    <div className="bg-zinc-900/95 hover:bg-zinc-850 border border-zinc-800 hover:border-amber-500/50 rounded-2xl p-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 flex flex-col justify-between group">
      <div>
        {/* Cover presentation */}
        <div
          onClick={() => onSelect(hq)}
          className="relative aspect-[3/4.2] w-full rounded-xl overflow-hidden cursor-pointer bg-zinc-950 border border-zinc-800/80 mb-3 group/cover"
        >
          <img
            src={coverImage}
            alt={hq.title}
            className="w-full h-full object-cover group-hover/cover:scale-105 transition-transform duration-500"
            loading="lazy"
          />

          {/* Vignette overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40 pointer-events-none" />

          {/* Top floating tags */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none">
            <span className="text-[10px] font-black uppercase tracking-wider bg-black/85 backdrop-blur-md text-zinc-100 px-2 py-0.5 rounded border border-white/10 shadow">
              {hq.publisher}
            </span>

            {/* Photo count indicator */}
            {photoCount > 1 && (
              <span className="text-[10px] font-bold bg-black/80 backdrop-blur-md text-amber-300 px-1.5 py-0.5 rounded flex items-center gap-1 border border-amber-500/30">
                <Camera className="w-3 h-3" /> {photoCount} fotos
              </span>
            )}
          </div>

          {/* Special badges */}
          <div className="absolute top-8 left-2 flex flex-col gap-1 pointer-events-none">
            {hq.isCollection && (
              <span className="text-[10px] font-extrabold bg-indigo-600 text-white px-2 py-0.5 rounded shadow-lg flex items-center gap-1">
                <Layers className="w-3 h-3" /> Lote ({hq.collectionCount} HQs)
              </span>
            )}

            {hq.isRareSpecial1Real && (
              <span className="text-[10px] font-black bg-rose-600 text-white px-2 py-0.5 rounded shadow-lg flex items-center gap-1 animate-pulse">
                <Flame className="w-3 h-3" /> R$ 1,00
              </span>
            )}
          </div>

          {/* Bottom badge row on cover */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shadow-sm ${conditionMeta.badgeClass}`}>
              {conditionMeta.label}
            </span>

            <span className="text-[9px] font-semibold bg-emerald-950/80 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-700/50 flex items-center gap-0.5">
              <CheckCircle className="w-2.5 h-2.5" /> 100% Páginas
            </span>
          </div>
        </div>

        {/* Comic Metadata */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              {hq.franchiseCategory}
            </span>
            <span className="text-zinc-400 font-medium">
              Ed. #{hq.issueNumber} • {hq.year}
            </span>
          </div>

          <h3
            onClick={() => onSelect(hq)}
            className="text-sm font-bold text-white line-clamp-2 group-hover:text-amber-300 cursor-pointer transition-colors leading-snug"
          >
            {hq.title}
          </h3>

          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
            {hq.description}
          </p>

          {/* Sold By Attribution */}
          <div className="pt-1 flex items-center gap-1.5 text-[11px] text-zinc-400">
            <Store className="w-3 h-3 text-zinc-500 shrink-0" />
            <span className="truncate">
              Vendido por: <strong className="text-zinc-200 font-medium">{hq.sellerName}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Footer: Price and Add to Cart */}
      <div className="mt-3.5 pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] text-zinc-500 uppercase font-semibold">Preço</div>
          <div className="text-lg font-black text-amber-400 font-['Space_Grotesk'] leading-tight">
            {formatBRL(hq.price)}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onSelect(hq)}
            aria-label={`Ver detalhes de ${hq.title}`}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
            title="Ver fotos e detalhes"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            onClick={() => onAddToCart(hq)}
            aria-label={`Adicionar ${hq.title} ao carrinho`}
            className={`flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-xl transition-all active:scale-95 shadow-md ${
              isInCart
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-500 hover:bg-amber-400 text-black'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{isInCart ? 'No Carrinho' : 'Comprar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
