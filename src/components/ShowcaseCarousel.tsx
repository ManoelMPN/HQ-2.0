import React, { useRef } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, Layers, BookOpen } from 'lucide-react';
import { HQItem } from '../types.ts';
import { formatBRL, formatIssueLabel, getConditionInfo } from '../utils/comicLogic.ts';

interface ShowcaseCarouselProps {
  featuredHQs: HQItem[];
  onSelectHQ: (hq: HQItem) => void;
  onAddToCart: (hq: HQItem) => void;
}

export const ShowcaseCarousel: React.FC<ShowcaseCarouselProps> = ({
  featuredHQs,
  onSelectHQ,
  onAddToCart,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -360 : 360;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  if (!featuredHQs.length) return null;

  return (
    <div className="relative my-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <h2 className="font-display text-lg font-bold text-white tracking-tight">
            Selecionados da Geek Grid
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Rolar para esquerda"
            className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Rolar para direita"
            className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scroll-smooth scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {featuredHQs.map((hq) => {
          const conditionMeta = getConditionInfo(hq.condition);
          const cover = hq.images?.[0] || '';

          return (
            <div
              key={hq.id}
              className="w-[280px] sm:w-[300px] shrink-0 snap-start bg-[#121419] hover:bg-[#171a21] border border-zinc-800/80 hover:border-amber-500/40 rounded-2xl p-3.5 transition-all flex flex-col justify-between group"
            >
              <div>
                <div
                  onClick={() => onSelectHQ(hq)}
                  className="relative aspect-[3/4] w-full rounded-xl overflow-hidden cursor-pointer bg-[#0b0c0f] border border-zinc-800/80 mb-3"
                >
                  {cover ? (
                    <img
                      src={cover}
                      alt={hq.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700">
                      <BookOpen className="w-8 h-8" />
                    </div>
                  )}

                  {hq.isCollection && (
                    <div className="absolute top-2 left-2">
                      <span className="text-[10px] font-semibold bg-zinc-950/85 text-amber-300 px-2 py-0.5 rounded-md border border-zinc-800 flex items-center gap-1 tabular-nums">
                        <Layers className="w-3 h-3" /> Lote ({hq.collectionCount})
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-zinc-400 truncate">
                    <span className="text-amber-400 font-semibold">{hq.franchiseCategory}</span>
                    <span className="mx-1.5 text-zinc-600">·</span>
                    <span>{formatIssueLabel(hq.issueNumber)}</span>
                    <span className="mx-1.5 text-zinc-600">·</span>
                    <span>{conditionMeta.label}</span>
                  </div>

                  <h3
                    onClick={() => onSelectHQ(hq)}
                    className="font-display text-sm font-bold text-white line-clamp-1 group-hover:text-amber-300 cursor-pointer transition-colors"
                  >
                    {hq.title}
                  </h3>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                <div className="font-display text-base font-bold text-white tabular-nums">
                  {formatBRL(hq.price)}
                </div>
                <button
                  type="button"
                  onClick={() => onAddToCart(hq)}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors"
                >
                  Comprar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
