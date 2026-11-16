import React from 'react';
import { ShoppingBag, Search, ShieldCheck, UserCheck, MessageSquare, Sun, Moon } from 'lucide-react';
import { CartItem, FilterState, Seller } from '../types.ts';
import { formatBRL } from '../utils/comicLogic.ts';
import { GeekGridLogo } from './HQMasterLogo.tsx';

interface HeaderProps {
  cart: CartItem[];
  onOpenCart: () => void;
  filters: FilterState;
  onUpdateFilters: (updates: Partial<FilterState>) => void;
  onNavigateToAdmin: () => void;
  onOpenPartnerModal: () => void;
  currentSeller: Seller | null;
  onLogoutSeller: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  cart,
  onOpenCart,
  filters,
  onUpdateFilters,
  onNavigateToAdmin,
  onOpenPartnerModal,
  currentSeller,
  onLogoutSeller,
  theme,
  onToggleTheme,
}) => {
  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalCartValue = cart.reduce((acc, item) => acc + item.hq.price * item.quantity, 0);

  return (
    <header className="sticky top-0 z-40 bg-[var(--gg-bg)]/95 backdrop-blur-md border-b border-[var(--gg-border)] transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
        {/* Clean Brand Mark */}
        <a href="#" className="flex items-center shrink-0">
          <GeekGridLogo size="md" />
        </a>

        {/* Search bar (Desktop) */}
        <div className="flex-1 max-w-xl mx-2 hidden md:block">
          <div className="relative">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onUpdateFilters({ search: e.target.value })}
              placeholder="Buscar por título, série, livro, action figure ou nº..."
              className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-xl py-2 pl-10 pr-8 text-xs sm:text-sm text-[var(--gg-text-strong)] placeholder-[var(--gg-text-subtle)] focus:outline-none focus:border-amber-500 transition-colors"
            />
            <Search className="w-4 h-4 text-[var(--gg-text-subtle)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            {filters.search && (
              <button
                type="button"
                onClick={() => onUpdateFilters({ search: '' })}
                aria-label="Limpar busca"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--gg-text-muted)] hover:text-[var(--gg-text-strong)]"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Seller Registration CTA */}
          <button
            type="button"
            onClick={onOpenPartnerModal}
            className="hidden lg:flex items-center gap-1.5 text-[var(--gg-text-muted)] hover:text-[var(--gg-accent-text)] px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[var(--gg-accent-text)]" />
            <span>Quero vender</span>
          </button>

          {/* Stylish Theme Switcher */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
            className="relative flex items-center gap-1.5 bg-[var(--gg-surface)] hover:bg-[var(--gg-surface-2)] border border-[var(--gg-border)] text-[var(--gg-text)] px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95"
          >
            <span className="relative w-4 h-4 flex items-center justify-center">
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700 transition-transform duration-300" />
              )}
            </span>
            <span className="hidden xl:inline text-[11px] font-semibold">
              {theme === 'dark' ? 'Claro' : 'Escuro'}
            </span>
          </button>

          {/* Admin access button */}
          {currentSeller ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onNavigateToAdmin}
                className="flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-[var(--gg-accent-text)] border border-amber-500/30 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                title="Ir para o Painel Administrativo"
              >
                <UserCheck className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline max-w-[110px] truncate">
                  {currentSeller.role === 'master' ? 'Painel' : currentSeller.storeName}
                </span>
                <span className="sm:hidden">Painel</span>
              </button>
              <button
                type="button"
                onClick={onLogoutSeller}
                className="text-[11px] sm:text-xs text-[var(--gg-text-muted)] hover:text-[var(--gg-text-strong)] px-1.5 py-1 hidden sm:inline"
                title="Sair"
              >
                Sair
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onNavigateToAdmin}
              className="flex items-center gap-1.5 bg-[var(--gg-surface)] hover:bg-[var(--gg-surface-2)] text-[var(--gg-text-strong)] border border-[var(--gg-border)] px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-[var(--gg-accent-text)] shrink-0" />
              <span className="hidden sm:inline">Área do Lojista</span>
              <span className="sm:hidden">Entrar</span>
            </button>
          )}

          {/* Cart Button */}
          <button
            type="button"
            onClick={onOpenCart}
            aria-label="Abrir carrinho de compras"
            className="relative flex items-center gap-1.5 sm:gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-2.5 sm:px-3.5 py-1.5 rounded-xl transition-colors active:scale-95"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span className="text-xs hidden sm:inline">Carrinho</span>
            {totalCartCount > 0 && (
              <span className="bg-zinc-950 text-amber-300 text-[11px] font-bold px-1.5 py-0.5 rounded-md tabular-nums">
                {totalCartCount}
              </span>
            )}
            {totalCartValue > 0 && (
              <span className="text-xs hidden lg:inline font-bold border-l border-zinc-950/20 pl-2 tabular-nums">
                {formatBRL(totalCartValue)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile search + quick action bar */}
      <div className="px-3 pb-2.5 md:hidden flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onUpdateFilters({ search: e.target.value })}
            placeholder="Buscar HQs, livros, colecionáveis..."
            className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-xl py-2 pl-9 pr-4 text-xs text-[var(--gg-text-strong)] placeholder-[var(--gg-text-subtle)] focus:outline-none focus:border-amber-500"
          />
          <Search className="w-3.5 h-3.5 text-[var(--gg-text-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
        <button
          type="button"
          onClick={onOpenPartnerModal}
          className="shrink-0 bg-[var(--gg-surface)] border border-[var(--gg-border)] text-[var(--gg-text)] hover:border-amber-500/60 px-2.5 py-2 rounded-xl text-[11px] font-semibold flex items-center gap-1"
        >
          <MessageSquare className="w-3.5 h-3.5 text-[var(--gg-accent-text)]" />
          <span>Vender</span>
        </button>
      </div>
    </header>
  );
};
