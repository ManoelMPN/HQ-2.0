import React from 'react';
import { BookOpen, ShoppingBag, Search, ShieldCheck, UserCheck, PlusCircle } from 'lucide-react';
import { CartItem, FilterState, Seller } from '../types.ts';
import { formatBRL } from '../utils/comicLogic.ts';

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
  onOpenPartnerModal,
  currentSeller,
  onLogoutSeller,
}) => {
  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalCartValue = cart.reduce((acc, item) => acc + item.hq.price * item.quantity, 0);

  return (
    <header className="sticky top-0 z-40 bg-[#0d1017]/95 backdrop-blur-md border-b border-zinc-800/80 shadow-2xl">
      {/* Top micro announcement bar */}
      <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 py-1.5 px-4 text-xs font-semibold text-black tracking-wide">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-black/20 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-amber-100">
              Autenticidade
            </span>
            <span className="hidden sm:inline text-white/95 font-medium">
              Revistas higienizadas exclusivamente a seco com pano limpo • 100% das páginas garantidas
            </span>
            <span className="sm:hidden text-white/95 font-medium">
              100% páginas garantidas • Higienizadas a seco
            </span>
          </div>

          <div className="flex items-center gap-4 text-white text-xs">
            <button
              onClick={onOpenPartnerModal}
              className="hover:underline flex items-center gap-1 font-bold text-amber-200"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Anunciar no Acervo
            </button>
            <span className="text-white/40 hidden md:inline">|</span>
            <span className="text-white/90 hidden md:inline">Envio com Rastreio p/ Todo o Brasil</span>
          </div>
        </div>
      </div>

      {/* Main navigation row */}
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-3">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 p-0.5 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform flex items-center justify-center">
              <div className="w-full h-full bg-[#0b0d13] rounded-[10px] flex items-center justify-center">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl sm:text-2xl tracking-tighter text-white font-['Space_Grotesk']">
                  BANCA<span className="text-amber-400">HQ</span>
                </span>
                <span className="text-[10px] bg-amber-500/15 text-amber-300 font-semibold px-1.5 py-0.5 rounded border border-amber-500/30">
                  Gibiteca
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Revistas em Quadrinhos Clássicas & Coleções
              </p>
            </div>
          </a>
        </div>

        {/* Search bar */}
        <div className="flex-1 max-w-xl mx-2 hidden md:block">
          <div className="relative">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onUpdateFilters({ search: e.target.value })}
              placeholder="Buscar por herói, título, arco, edição (ex: Homem-Aranha, #12)..."
              className="w-full bg-zinc-900/90 border border-zinc-700/80 rounded-full py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
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
                <span className="sm:hidden">Painel</span>
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
              <span className="hidden sm:inline">Painel Administrativo</span>
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
            placeholder="Buscar HQs, formatinhos, heróis..."
            className="w-full bg-zinc-900 border border-zinc-700/80 rounded-full py-2 pl-9 pr-4 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>
    </header>
  );
};
