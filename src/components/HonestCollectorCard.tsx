import React, { useState } from 'react';
import { HeartHandshake, Sparkles, CheckCircle2, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';

export const HonestCollectorCard: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-gradient-to-r from-zinc-900/90 via-zinc-900/60 to-zinc-900/90 border border-amber-500/25 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden backdrop-blur-sm">
      {/* Subtle comic dot pattern accent in corner */}
      <div className="absolute right-0 top-0 bottom-0 w-32 opacity-5 pointer-events-none bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:12px_12px]" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5 sm:mt-0">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-amber-200 tracking-wide font-['Space_Grotesk']">
                Compromisso Honesto do Acervo
              </h3>
              <span className="text-[11px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> 100% Páginas Garantidas
              </span>
            </div>
            <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
              Não sou graduador profissional, mas descrevo cada exemplar com a maior sinceridade possível. 
              Todas as revistas são <strong className="text-amber-300 font-medium">limpas e higienizadas exclusivamente com pano limpo e seco</strong>, 
              sem produtos químicos que estraguem o papel antigo.
            </p>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 shrink-0 py-1 px-2.5 rounded-lg bg-zinc-800/80 border border-zinc-700 hover:border-amber-500/40 transition-colors"
        >
          <span>{expanded ? 'Ocultar Graus' : 'Ver Nossos 4 Graus de Conservação'}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded detailed breakdown of the 4 conditions defined by user */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs animate-in fade-in duration-200">
          <div className="bg-emerald-950/30 border border-emerald-700/40 rounded-xl p-3">
            <div className="flex items-center gap-1.5 font-bold text-emerald-300 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              1. Ótimo Estado
            </div>
            <p className="text-zinc-300 text-[11px] leading-relaxed">
              Grampos preservados e firmes, sem dobraduras graves ou marcas de uso tão aparentes. Muito bem cuidada.
            </p>
          </div>

          <div className="bg-blue-950/30 border border-blue-700/40 rounded-xl p-3">
            <div className="flex items-center gap-1.5 font-bold text-blue-300 mb-1">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              2. Bom Estado
            </div>
            <p className="text-zinc-300 text-[11px] leading-relaxed">
              Sem grampos enferrujados, porém com marcas naturais de leitura ou manuseio na capa. Páginas firmes.
            </p>
          </div>

          <div className="bg-amber-950/30 border border-amber-700/40 rounded-xl p-3">
            <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              3. Estado Regular / Ruim
            </div>
            <p className="text-zinc-300 text-[11px] leading-relaxed">
              Possíveis grampos enferrujados, dobras aparentes ou pequenas partes superficiais desgastadas por traça/tempo.
            </p>
          </div>

          <div className="bg-rose-950/30 border border-rose-700/40 rounded-xl p-3">
            <div className="flex items-center gap-1.5 font-bold text-rose-300 mb-1">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              4. Apenas para Leitura (Brechó)
            </div>
            <p className="text-zinc-300 text-[11px] leading-relaxed">
              Capas soltando, grampos oxidados ou marcas de cola. Preço mínimo a partir de R$ 1,00, com história 100% legível!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
