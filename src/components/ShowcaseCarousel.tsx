import React, { useRef } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, Layers, Flame, BookOpen } from 'lucide-react';
import { HQItem } from '../types.ts';
import { formatBRL, getConditionInfo } from '../utils/comicLogic.ts';

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
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight font-['Space_Grotesk']">
              Destaques do Acervo & Coleções Históricas
            </h2>
            <p className="text-xs text-zinc-400">
              As melhores capas selecionadas, arcos completos e achados raros
            </p>
          </div>
        </div>

        {/* Carousel arrows */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => scroll('left')}
            aria-label="Rolar para esquerda"
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            aria-label="Rolar para direita"
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal scrolling strip */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scroll-smooth no-scrollbar scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {featuredHQs.map((hq) => {
          const conditionMeta = getConditionInfo(hq.condition);
          const cover = hq.images[0] || 'https://images.unsplash.com/photo-1601645191163-3fc0d5d34e35?auto=format&fit=crop&w=600&q=80';

          return (
            <div
              key={hq.id}
              className="w-[280px] sm:w-[320px] shrink-0 snap-start bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-amber-500/50 rounded-2xl p-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col justify-between group"
            >
              <div>
                {/* Cover with badges */}
                <div
                  onClick={() => onSelectHQ(hq)}
                  className="relative aspect-[3/4] w-full rounded-xl overflow-hidden cursor-pointer bg-zinc-950 border border-zinc-800/80 mb-3"
                >
                  <img
                    src={cover}
                    alt={hq.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />

                  {/* Gradient shadow for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                  {/* Top badges */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-black/80 backdrop-blur-sm text-zinc-200 px-2 py-0.5 rounded border border-white/10">
                      {hq.publisher}
                    </span>

                    {hq.isCollection ? (
                      <span className="text-[10px] font-extrabold bg-indigo-600 text-white px-2 py-0.5 rounded shadow flex items-center gap-1">
                        <Layers className="w-3 h-3" /> Lote ({hq.collectionCount} HQs)
                      </span>
                    ) : hq.isRareSpecial1Real ? (
                      <span className="text-[10px] font-black bg-rose-600 text-white px-2 py-0.5 rounded shadow flex items-center gap-1">
                        <Flame className="w-3 h-3" /> A R$ 1,00
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium bg-zinc-900/80 text-zinc-300 px-2 py-0.5 rounded">
                        Ano {hq.year}
                      </span>
                    )}
                  </div>

                  {/* Condition on cover bottom */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-block ${conditionMeta.badgeClass}`}>
                      {conditionMeta.label}
                    </span>
                  </div>
                </div>

                {/* Comic info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-bold">
                    <span>{hq.franchiseCategory}</span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-400">Ed. {hq.issueNumber}</span>
                  </div>

                  <h3
                    onClick={() => onSelectHQ(hq)}
                    className="text-sm font-bold text-white line-clamp-1 group-hover:text-amber-300 cursor-pointer transition-colors"
                  >
                    {hq.title}
                  </h3>

                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {hq.description}
                  </p>
                </div>
              </div>

              {/* Price and actions */}
              <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-semibold">Valor</div>
                  <div className="text-base font-extrabold text-amber-400 font-['Space_Grotesk']">
                    {formatBRL(hq.price)}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onSelectHQ(hq)}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                  >
                    Ver Capa
                  </button>
                  <button
                    onClick={() => onAddToCart(hq)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black transition-transform active:scale-95"
                  >
                    Comprar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
