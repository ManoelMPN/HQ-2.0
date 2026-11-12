import React from 'react';
import { ShoppingBag, Search, ShieldCheck, UserCheck } from 'lucide-react';
import { CartItem, FilterState, Seller } from '../types.ts';
import { formatBRL } from '../utils/comicLogic.ts';
import { HQMasterLogo } from './HQMasterLogo.tsx';

interface HeaderProps {
  cart: CartItem[];
  onOpenCart: () => void;
  filters: FilterState;
  onUpdateFilters: (updates: Partial<FilterState>) => void;
  onNavigateToAdmin: () => void;
  onOpenPartnerModal: () => void;
  currentSeller: Seller | null;
  onLogoutSeller: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  cart,
  onOpenCart,
  filters,
  onUpdateFilters,
  onNavigateToAdmin,
  currentSeller,
  onLogoutSeller,
}) => {
  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalCartValue = cart.reduce((acc, item) => acc + item.hq.price * item.quantity, 0);

  return (
    <header className="sticky top-0 z-40 bg-[#0a0d14]/95 backdrop-blur-md border-b border-zinc-800/80 shadow-2xl">
      {/* Top subtle info row */}
      <div className="bg-[#101420] border-b border-zinc-800/60 py-1.5 px-4 text-xs text-zinc-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span className="text-[11px] text-zinc-300 font-medium">
              Acervo de Revistas em Quadrinhos Clássicas & Coleções Completas
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="text-zinc-400 text-[11px] hidden sm:inline">
              Envio com Rastreio Seguro para Todo o Brasil
            </span>
          </div>
        </div>
      </div>

      {/* Main navigation row */}
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-3.5 flex items-center justify-between gap-3">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <a href="#" className="flex items-center gap-2.5">
            <HQMasterLogo size="md" />
          </a>
        </div>

        {/* Search bar */}
        <div className="flex-1 max-w-xl mx-2 hidden md:block">
          <div className="relative">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onUpdateFilters({ search: e.target.value })}
              placeholder="Buscar por herói, série, título ou número da edição..."
              className="w-full bg-zinc-900/90 border border-zinc-700/80 rounded-full py-2 pl-10 pr-4 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
            />
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            {filters.search && (
              <button
                onClick={() => onUpdateFilters({ search: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Admin access button */}
          {currentSeller ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onNavigateToAdmin}
                className="flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                title="Ir para o Painel Administrativo"
              >
                <UserCheck className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {currentSeller.role === 'master' ? 'Painel Admin' : currentSeller.storeName}
                </span>
                <span className="sm:hidden">Admin</span>
              </button>
              <button
                onClick={onLogoutSeller}
                className="text-xs text-zinc-400 hover:text-zinc-200 px-1 py-1"
                title="Sair"
              >
                Sair
              </button>
            </div>
          ) : (
            <button
              onClick={onNavigateToAdmin}
              className="flex items-center gap-1.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Painel Admin</span>
              <span className="sm:hidden">Admin</span>
            </button>
          )}

          {/* Cart Button */}
          <button
            onClick={onOpenCart}
            aria-label="Abrir carrinho de compras"
            className="relative flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold px-3.5 py-1.5 rounded-xl shadow-md transition-all active:scale-95"
          >
            <ShoppingBag className="w-4 h-4 text-black" />
            <span className="text-xs hidden sm:inline">Carrinho</span>
            {totalCartCount > 0 && (
              <span className="bg-black text-amber-300 text-[11px] font-black px-1.5 py-0.5 rounded-full ml-0.5">
                {totalCartCount}
              </span>
            )}
            {totalCartValue > 0 && (
              <span className="text-xs hidden lg:inline font-black border-l border-black/20 pl-2">
                {formatBRL(totalCartValue)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile search input */}
      <div className="px-4 pb-2.5 md:hidden">
        <div className="relative">
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onUpdateFilters({ search: e.target.value })}
            placeholder="Buscar por herói, série, título..."
            className="w-full bg-zinc-900 border border-zinc-700/80 rounded-full py-2 pl-9 pr-4 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>
    </header>
  );
};
