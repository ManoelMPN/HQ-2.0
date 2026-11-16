import React from 'react';
import { SlidersHorizontal, RotateCcw, Layers, Sparkles, Building2, Calendar, ShieldCheck, Tag } from 'lucide-react';
import { FilterState, Seller } from '../types.ts';

interface ComicFiltersProps {
  filters: FilterState;
  onUpdateFilters: (updates: Partial<FilterState>) => void;
  onResetFilters: () => void;
  availablePublishers: string[];
  availableFranchises: string[];
  sellers: Pick<Seller, 'id' | 'name' | 'storeName'>[];
  totalResultsCount: number;
}

export const ComicFilters: React.FC<ComicFiltersProps> = ({
  filters,
  onUpdateFilters,
  onResetFilters,
  availablePublishers,
  availableFranchises,
  sellers,
  totalResultsCount,
}) => {
  const isFiltered =
    filters.search ||
    filters.publisher !== 'all' ||
    filters.franchise !== 'all' ||
    filters.condition !== 'all' ||
    filters.yearDecade !== 'all' ||
    filters.type !== 'all' ||
    filters.priceMax !== null ||
    filters.sellerId !== 'all';

  return (
    <section
      aria-label="Filtros do catálogo"
      className="bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-2xl p-3.5 sm:p-5 transition-colors shadow-sm"
    >
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[var(--gg-border)]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[var(--gg-surface-2)] border border-[var(--gg-border)] text-[var(--gg-accent-text)] shrink-0">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold text-[var(--gg-text-strong)] tracking-tight">
              Filtrar Acervo
            </h2>
            <p className="text-[11px] text-[var(--gg-text-muted)] tabular-nums">
              <strong className="text-[var(--gg-accent-text)] font-semibold">{totalResultsCount}</strong>{' '}
              {totalResultsCount === 1 ? 'item disponível' : 'itens disponíveis'}
            </p>
          </div>
        </div>

        {/* Format & Reset controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onUpdateFilters({ type: filters.type === 'single' ? 'all' : 'single' })}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
              filters.type === 'single'
                ? 'bg-amber-500 text-zinc-950 border-amber-400'
                : 'bg-[var(--gg-surface-2)] hover:border-amber-500/40 text-[var(--gg-text)] border-[var(--gg-border)]'
            }`}
          >
            Itens Avulsos
          </button>

          <button
            type="button"
            onClick={() => onUpdateFilters({ type: filters.type === 'collection' ? 'all' : 'collection' })}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
              filters.type === 'collection'
                ? 'bg-amber-500 text-zinc-950 border-amber-400'
                : 'bg-[var(--gg-surface-2)] hover:border-amber-500/40 text-[var(--gg-text)] border-[var(--gg-border)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Lotes e Coleções
          </button>

          {isFiltered && (
            <button
              type="button"
              onClick={onResetFilters}
              className="flex items-center gap-1 text-xs text-[var(--gg-text-muted)] hover:text-[var(--gg-text-strong)] px-2.5 py-1.5 rounded-xl hover:bg-[var(--gg-surface-2)] transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Responsive Filter selectors grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 pt-3.5">
        <div>
          <label className="text-[11px] font-medium text-[var(--gg-text-muted)] mb-1 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-[var(--gg-accent-text)]" /> Editora / Marca
          </label>
          <select
            value={filters.publisher}
            onChange={(e) => onUpdateFilters({ publisher: e.target.value })}
            className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border)] rounded-xl px-2.5 py-2 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500"
          >
            <option value="all">Todas</option>
            {availablePublishers.map((pub) => (
              <option key={pub} value={pub}>
                {pub}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-medium text-[var(--gg-text-muted)] mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[var(--gg-accent-text)]" /> Coleção / Tema
          </label>
          <select
            value={filters.franchise}
            onChange={(e) => onUpdateFilters({ franchise: e.target.value })}
            className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border)] rounded-xl px-2.5 py-2 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500"
          >
            <option value="all">Todas</option>
            {availableFranchises.map((fr) => (
              <option key={fr} value={fr}>
                {fr}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-medium text-[var(--gg-text-muted)] mb-1 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-[var(--gg-accent-text)]" /> Conservação
          </label>
          <select
            value={filters.condition}
            onChange={(e) => onUpdateFilters({ condition: e.target.value })}
            className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border)] rounded-xl px-2.5 py-2 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500"
          >
            <option value="all">Todos</option>
            <option value="otimo">Ótimo Estado</option>
            <option value="bom">Bom Estado</option>
            <option value="ruim">Estado Regular</option>
            <option value="leitura">Apenas para Leitura</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-medium text-[var(--gg-text-muted)] mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-[var(--gg-accent-text)]" /> Época / Ano
          </label>
          <select
            value={filters.yearDecade}
            onChange={(e) => onUpdateFilters({ yearDecade: e.target.value })}
            className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border)] rounded-xl px-2.5 py-2 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500"
          >
            <option value="all">Todas</option>
            <option value="70s">Anos 70</option>
            <option value="80s">Anos 80</option>
            <option value="90s">Anos 90</option>
            <option value="2000s">Anos 2000</option>
            <option value="recent">2010 até Atual</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-medium text-[var(--gg-text-muted)] mb-1 flex items-center gap-1">
            <Tag className="w-3 h-3 text-[var(--gg-accent-text)]" /> Vendedor
          </label>
          <select
            value={filters.sellerId}
            onChange={(e) => onUpdateFilters({ sellerId: e.target.value })}
            className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border)] rounded-xl px-2.5 py-2 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500"
          >
            <option value="all">Todos</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.storeName || s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-medium text-[var(--gg-text-muted)] mb-1 block">
            Ordenar por
          </label>
          <select
            value={filters.sortBy}
            onChange={(e) => onUpdateFilters({ sortBy: e.target.value as any })}
            className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border)] rounded-xl px-2.5 py-2 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500 font-medium"
          >
            <option value="featured">Relevância</option>
            <option value="price-asc">Menor Preço</option>
            <option value="price-desc">Maior Preço</option>
            <option value="year-desc">Mais Recentes (Ano)</option>
            <option value="newest">Recém-cadastrados</option>
          </select>
        </div>
      </div>
    </section>
  );
};
