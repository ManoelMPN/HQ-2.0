import React from 'react';
import { Filter, RotateCcw, Flame, Layers, Sparkles, Building2, Calendar, ShieldCheck, Tag } from 'lucide-react';
import { FilterState, Seller } from '../types.ts';

interface ComicFiltersProps {
  filters: FilterState;
  onUpdateFilters: (updates: Partial<FilterState>) => void;
  onResetFilters: () => void;
  availablePublishers: string[];
  availableFranchises: string[];
  sellers: Seller[];
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
    filters.onlyOneReal ||
    filters.sellerId !== 'all';

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-lg mb-6">
      {/* Header of filters bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-zinc-800 text-amber-400">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Filtros Avançados de Acervo
            </h3>
            <p className="text-[11px] text-zinc-400">
              Encontrados: <strong className="text-amber-400">{totalResultsCount}</strong> edições disponíveis
            </p>
          </div>
        </div>

        {/* Quick Highlights / Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1 Real Call Button */}
          <button
            onClick={() => onUpdateFilters({ onlyOneReal: !filters.onlyOneReal })}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
              filters.onlyOneReal
                ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-900/40 ring-2 ring-rose-500/30'
                : 'bg-zinc-800 hover:bg-zinc-750 text-rose-300 border-zinc-700 hover:border-rose-500/50'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-400 fill-current" />
            HQs a partir de R$ 1,00
          </button>

          {/* Lotes / Coleções completas toggle */}
          <button
            onClick={() => onUpdateFilters({ type: filters.type === 'collection' ? 'all' : 'collection' })}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
              filters.type === 'collection'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-900/40'
                : 'bg-zinc-800 hover:bg-zinc-750 text-indigo-300 border-zinc-700 hover:border-indigo-500/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Lotes e Coleções Fechadas
          </button>

          {/* Reset Filters */}
          {isFiltered && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white px-2 py-1 hover:underline"
            >
              <RotateCcw className="w-3 h-3" />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Select drop-down row on same page */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
        {/* Editora */}
        <div>
          <label className="block text-[11px] font-semibold text-zinc-400 mb-1 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-amber-400" /> Editora
          </label>
          <select
            value={filters.publisher}
            onChange={(e) => onUpdateFilters({ publisher: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">Todas as Editoras</option>
            {availablePublishers.map((pub) => (
              <option key={pub} value={pub}>
                {pub}
              </option>
            ))}
          </select>
        </div>

        {/* Franquia / Personagem Agrupado pela IA */}
        <div>
          <label className="block text-[11px] font-semibold text-zinc-400 mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" /> Coleção / Herói
          </label>
          <select
            value={filters.franchise}
            onChange={(e) => onUpdateFilters({ franchise: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">Todos os Personagens</option>
            {availableFranchises.map((fr) => (
              <option key={fr} value={fr}>
                {fr}
              </option>
            ))}
          </select>
        </div>

        {/* Estado de Conservação */}
        <div>
          <label className="block text-[11px] font-semibold text-zinc-400 mb-1 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-amber-400" /> Estado
          </label>
          <select
            value={filters.condition}
            onChange={(e) => onUpdateFilters({ condition: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">Todos os Estados</option>
            <option value="otimo">Ótimo (Sem dobras, grampos firmes)</option>
            <option value="bom">Bom (Sem ferrugem, marcas de uso)</option>
            <option value="ruim">Ruim (Marcas do tempo, oxidação)</option>
            <option value="leitura">Apenas p/ Leitura (a partir R$ 1)</option>
          </select>
        </div>

        {/* Ano / Década */}
        <div>
          <label className="block text-[11px] font-semibold text-zinc-400 mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-amber-400" /> Época / Década
          </label>
          <select
            value={filters.yearDecade}
            onChange={(e) => onUpdateFilters({ yearDecade: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">Todas as Épocas</option>
            <option value="70s">Anos 70 (Vintage / Raros)</option>
            <option value="80s">Anos 80 (Formatos Clássicos Abril)</option>
            <option value="90s">Anos 90 (Sagas Históricas)</option>
            <option value="2000s">Anos 2000 (Início Panini)</option>
            <option value="recent">2010 até Atual</option>
          </select>
        </div>

        {/* Vendedor / Parceiro */}
        <div>
          <label className="block text-[11px] font-semibold text-zinc-400 mb-1 flex items-center gap-1">
            <Tag className="w-3 h-3 text-amber-400" /> Vendedor
          </label>
          <select
            value={filters.sellerId}
            onChange={(e) => onUpdateFilters({ sellerId: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">Todos os Vendedores</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.storeName} ({s.role === 'master' ? 'Mestre' : 'Parceiro'})
              </option>
            ))}
          </select>
        </div>

        {/* Ordenar por */}
        <div>
          <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
            Ordenar Por
          </label>
          <select
            value={filters.sortBy}
            onChange={(e) => onUpdateFilters({ sortBy: e.target.value as any })}
            className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 font-medium"
          >
            <option value="featured">Destaques do Acervo</option>
            <option value="price-asc">Menor Preço (a partir R$ 1)</option>
            <option value="price-desc">Maior Preço (Peças Raras)</option>
            <option value="year-desc">Ano Mais Antigo</option>
            <option value="newest">Cadastrados Recentemente</option>
          </select>
        </div>
      </div>
    </div>
  );
};
