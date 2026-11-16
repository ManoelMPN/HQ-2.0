import React, { useState } from 'react';
import { Layers, Camera, ShoppingBag, Eye, Store, BookOpen } from 'lucide-react';
import { HQItem } from '../types.ts';
import { formatBRL, formatIssueLabel, getConditionInfo } from '../utils/comicLogic.ts';

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
  const [imgError, setImgError] = useState(false);
  const conditionMeta = getConditionInfo(hq.condition);
  const coverImage = hq.images?.[0] || '';
  const photoCount = hq.images?.length || 0;
  const issueLabel = formatIssueLabel(hq.issueNumber);

  return (
    <article className="bg-[var(--gg-surface)] hover:bg-[var(--gg-surface-2)] border border-[var(--gg-border)] hover:border-amber-500/50 rounded-2xl p-3 sm:p-3.5 transition-all duration-200 flex flex-col justify-between group shadow-sm">
      <div>
        {/* Cover / Product Photo */}
        <div
          onClick={() => onSelect(hq)}
          className="relative aspect-[3/4] w-full rounded-xl overflow-hidden cursor-pointer bg-[var(--gg-surface-inset)] border border-[var(--gg-border)] mb-3"
        >
          {coverImage && !imgError ? (
            <img
              src={coverImage}
              alt={hq.title}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[var(--gg-text-subtle)] p-4 text-center">
              <BookOpen className="w-8 h-8 opacity-60" />
              <span className="text-[11px] font-medium line-clamp-2">{hq.title}</span>
            </div>
          )}

          {/* Subtle corner indicator only when collection or multiple photos */}
          {(hq.isCollection || photoCount > 1) && (
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
              {hq.isCollection ? (
                <span className="text-[10px] font-semibold bg-zinc-950/85 backdrop-blur-sm text-amber-300 px-2 py-0.5 rounded-md border border-zinc-700/80 flex items-center gap-1 tabular-nums">
                  <Layers className="w-3 h-3" /> Lote ({hq.collectionCount})
                </span>
              ) : (
                <span />
              )}

              {photoCount > 1 && (
                <span className="text-[10px] font-medium bg-zinc-950/85 backdrop-blur-sm text-zinc-200 px-1.5 py-0.5 rounded-md border border-zinc-800 flex items-center gap-1 tabular-nums">
                  <Camera className="w-3 h-3 text-amber-400" /> {photoCount}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Clean Unboxed Typographic Metadata */}
        <div className="space-y-1.5">
          <div className="text-[11px] text-[var(--gg-text-muted)] truncate">
            <span className="text-[var(--gg-accent-text)] font-semibold">{hq.franchiseCategory}</span>
            <span className="mx-1.5 opacity-50">·</span>
            <span>{hq.publisher}</span>
            <span className="mx-1.5 opacity-50">·</span>
            <span className="font-mono text-[var(--gg-text-strong)]">{issueLabel}</span>
            <span className="mx-1.5 opacity-50">·</span>
            <span className="tabular-nums">{hq.year}</span>
          </div>

          <h3
            onClick={() => onSelect(hq)}
            className="font-display text-sm font-bold text-[var(--gg-text-strong)] line-clamp-2 group-hover:text-[var(--gg-accent-text)] cursor-pointer transition-colors leading-snug"
          >
            {hq.title}
          </h3>

          <p className="text-xs text-[var(--gg-text-muted)] line-clamp-2 leading-relaxed">
            {hq.description}
          </p>

          {/* Quiet Condition + Seller Attribution */}
          <div className="pt-1 flex items-center justify-between gap-2 text-[11px] text-[var(--gg-text-subtle)]">
            <span className="truncate flex items-center gap-1">
              <Store className="w-3 h-3 shrink-0" />
              <span className="text-[var(--gg-text)] truncate">{hq.sellerName}</span>
            </span>
            <span className="shrink-0 text-[var(--gg-text-muted)]">{conditionMeta.label}</span>
          </div>
        </div>
      </div>

      {/* Footer: Price and Add to Cart */}
      <div className="mt-3.5 pt-3 border-t border-[var(--gg-border)] flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] text-[var(--gg-text-subtle)] uppercase tracking-wider font-medium">Preço</div>
          <div className="font-display text-base sm:text-lg font-bold text-[var(--gg-text-strong)] tabular-nums leading-tight truncate">
            {formatBRL(hq.price)}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onSelect(hq)}
            aria-label={`Ver detalhes de ${hq.title}`}
            className="p-2 rounded-xl bg-[var(--gg-surface-2)] hover:border-amber-500/50 border border-[var(--gg-border)] text-[var(--gg-text)] hover:text-[var(--gg-text-strong)] transition-colors"
            title="Ver fotos e detalhes"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onAddToCart(hq)}
            aria-label={`Adicionar ${hq.title} ao carrinho`}
            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 sm:px-3 py-2 rounded-xl transition-colors active:scale-95 ${
              isInCart
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{isInCart ? 'No Carrinho' : 'Comprar'}</span>
          </button>
        </div>
      </div>
    </article>
  );
};
