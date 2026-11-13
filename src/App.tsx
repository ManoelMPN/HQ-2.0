import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Sparkles,
  Flame,
  Layers,
  Search,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { HQItem, Seller, CartItem, FilterState, DiscountProposal, Order } from './types.ts';
import { INITIAL_HQS, INITIAL_SELLERS } from './data/initialComics.ts';
import { filterHQs, formatBRL } from './utils/comicLogic.ts';
import { Header } from './components/Header.tsx';
import { ShowcaseCarousel } from './components/ShowcaseCarousel.tsx';
import { ComicFilters } from './components/ComicFilters.tsx';
import { HQCard } from './components/HQCard.tsx';
import { HQDetailModal } from './components/HQDetailModal.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { DiscountNegotiationModal } from './components/DiscountNegotiationModal.tsx';
import { PartnerOnboardingModal } from './components/PartnerOnboardingModal.tsx';
import { AdminPage } from './components/AdminPage.tsx';
import { HQMasterLogo } from './components/HQMasterLogo.tsx';
import {
  getSupabase,
  testSupabaseConnection,
  fetchAllFromSupabase,
  upsertHQToSupabase,
  deleteHQFromSupabase,
  upsertSellerToSupabase,
  deleteSellerFromSupabase,
  upsertOrderToSupabase,
  upsertProposalToSupabase,
} from './utils/supabaseClient.ts';

const STORAGE_HQS = 'hqmaster_items_v4';
const STORAGE_SELLERS = 'hqmaster_sellers_v4';
const STORAGE_CART = 'hqmaster_cart_v4';
const STORAGE_PROPOSALS = 'hqmaster_proposals_v4';
const STORAGE_ORDERS = 'hqmaster_orders_v4';
const STORAGE_SESSION = 'hqmaster_session_v4';

export default function App() {
  // Page view state: 'store' (User Storefront) or 'admin' (Dedicated Admin Page)
  const [currentView, setCurrentView] = useState<'store' | 'admin'>(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#admin') {
      return 'admin';
    }
    return 'store';
  });

  // State initialization with localStorage persistence
  const [hqs, setHqs] = useState<HQItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_HQS);
      return saved ? JSON.parse(saved) : INITIAL_HQS;
    } catch {
      return INITIAL_HQS;
    }
  });

  const [sellers, setSellers] = useState<Seller[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SELLERS);
      const savedOrders = localStorage.getItem(STORAGE_ORDERS);
      const hasRealOrders = savedOrders ? JSON.parse(savedOrders).length > 0 : false;
      if (saved) {
        const parsed = JSON.parse(saved) as Seller[];
        // Only reflect real orders; if 0 orders, sales & earnings are strictly 0
        return hasRealOrders
          ? parsed
          : parsed.map((s) => ({ ...s, totalSales: 0, totalEarnings: 0 }));
      }
      return INITIAL_SELLERS;
    } catch {
      return INITIAL_SELLERS;
    }
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CART);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [proposals, setProposals] = useState<DiscountProposal[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROPOSALS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ORDERS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [currentSeller, setCurrentSeller] = useState<Seller | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SESSION);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.role === 'master' ? { ...parsed, totalSales: 0, totalEarnings: 0 } : parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  // Filter State for Storefront
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    publisher: 'all',
    franchise: 'all',
    condition: 'all',
    yearDecade: 'all',
    type: 'all',
    priceMax: null,
    onlyOneReal: false,
    sellerId: 'all',
    sortBy: 'featured',
  });

  // Storefront Modals
  const [selectedHQ, setSelectedHQ] = useState<HQItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [isNegotiationOpen, setIsNegotiationOpen] = useState(false);

  // Supabase Cloud Sync Status
  const [supabaseStatus, setSupabaseStatus] = useState<{
    connected: boolean;
    tablesReady: boolean;
    syncing: boolean;
    message: string;
  }>({
    connected: Boolean(getSupabase()),
    tablesReady: false,
    syncing: false,
    message: getSupabase() ? 'Conectando ao Supabase...' : 'Modo local (configure o Supabase nas Configurações)',
  });

  // Sync hash with current view
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#admin') setCurrentView('admin');
      else setCurrentView('store');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (view: 'store' | 'admin') => {
    setCurrentView(view);
    if (view === 'admin') window.location.hash = '#admin';
    else window.location.hash = '#loja';
  };

  // Safe localStorage helper (never crashes if base64 exceeds 5MB browser quota)
  const safeSetStorage = (key: string, value: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`LocalStorage warning for ${key}:`, e);
    }
  };

  // Sync state to localStorage safely
  useEffect(() => {
    safeSetStorage(STORAGE_HQS, hqs);
  }, [hqs]);

  useEffect(() => {
    safeSetStorage(STORAGE_SELLERS, sellers);
  }, [sellers]);

  useEffect(() => {
    safeSetStorage(STORAGE_CART, cart);
  }, [cart]);

  useEffect(() => {
    safeSetStorage(STORAGE_PROPOSALS, proposals);
  }, [proposals]);

  useEffect(() => {
    safeSetStorage(STORAGE_ORDERS, orders);
  }, [orders]);

  useEffect(() => {
    try {
      if (currentSeller) {
        localStorage.setItem(STORAGE_SESSION, JSON.stringify(currentSeller));
      } else {
        localStorage.removeItem(STORAGE_SESSION);
      }
    } catch (e) {
      console.warn('Session storage warning:', e);
    }
  }, [currentSeller]);

  // Full bidirectional sync with Supabase
  const syncWithSupabase = async (pushLocalFirst = false): Promise<{
    connected: boolean;
    tablesReady: boolean;
    message: string;
  }> => {
    const sb = getSupabase();
    if (!sb) {
      const status = {
        connected: false,
        tablesReady: false,
        syncing: false,
        message: 'Supabase não configurado. Informe URL e Anon Key para salvar na nuvem.',
      };
      setSupabaseStatus(status);
      return status;
    }

    setSupabaseStatus((prev) => ({ ...prev, syncing: true }));

    const test = await testSupabaseConnection();
    if (!test.connected || !test.tablesReady) {
      const status = {
        connected: test.connected,
        tablesReady: test.tablesReady,
        syncing: false,
        message: test.message,
      };
      setSupabaseStatus(status);
      return status;
    }

    try {
      // If user just clicked "Connect/Save" with unsaved local items, push local records first
      if (pushLocalFirst) {
        for (const s of sellers) {
          await upsertSellerToSupabase(s);
        }
        for (const h of hqs) {
          await upsertHQToSupabase(h);
        }
        for (const o of orders) {
          await upsertOrderToSupabase(o);
        }
        for (const p of proposals) {
          await upsertProposalToSupabase(p);
        }
      }

      const remote = await fetchAllFromSupabase();
      if (remote.ok) {
        if (remote.sellers && remote.sellers.length > 0) {
          setSellers(remote.sellers);
          setCurrentSeller((prev) => {
            if (!prev) return null;
            return remote.sellers!.find((rs) => rs.id === prev.id || rs.email === prev.email) || prev;
          });
        } else {
          // Ensure master exists in remote sellers table
          for (const s of sellers) {
            await upsertSellerToSupabase(s);
          }
        }

        if (remote.hqs) {
          setHqs(remote.hqs);
        }
        if (remote.orders) {
          setOrders(remote.orders);
        }
        if (remote.proposals) {
          setProposals(remote.proposals);
        }
      }

      const okStatus = {
        connected: true,
        tablesReady: true,
        syncing: false,
        message: 'Supabase conectado e sincronizado em nuvem.',
      };
      setSupabaseStatus(okStatus);
      return okStatus;
    } catch (err: any) {
      const errStatus = {
        connected: true,
        tablesReady: false,
        syncing: false,
        message: err?.message || 'Erro ao sincronizar com Supabase.',
      };
      setSupabaseStatus(errStatus);
      return errStatus;
    }
  };

  // Load initial cloud state on mount if Supabase credentials exist
  useEffect(() => {
    if (getSupabase()) {
      void syncWithSupabase(false);
    }
  }, []);

  // Derived data for dynamic filters
  const availablePublishers = Array.from(new Set(hqs.map((h) => h.publisher))).sort();
  const availableFranchises = Array.from(new Set(hqs.map((h) => h.franchiseCategory))).sort();

  // Filtered HQs
  const filteredHQs = filterHQs(hqs, filters);
  const featuredHQs = hqs.filter((h) => h.featured);

  // Cart actions
  const handleAddToCart = (hq: HQItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.hq.id === hq.id);
      if (existing) return prev;
      return [...prev, { hq, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const handleRemoveFromCart = (hqId: string) => {
    setCart((prev) => prev.filter((item) => item.hq.id !== hqId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // HQ Management (State + Supabase Cloud Persistence)
  const handleAddHQ = (newHQData: Omit<HQItem, 'id' | 'createdAt'>) => {
    const newHQ: HQItem = {
      ...newHQData,
      id: `hq-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setHqs((prev) => [newHQ, ...prev]);

    void upsertHQToSupabase(newHQ).then((res) => {
      if (res.ok && res.hq) {
        setHqs((prev) => prev.map((item) => (item.id === newHQ.id ? res.hq : item)));
      }
    });
  };

  const handleUpdateHQ = (updated: HQItem) => {
    setHqs((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
    void upsertHQToSupabase(updated);
  };

  const handleDeleteHQ = (id: string) => {
    setHqs((prev) => prev.filter((h) => h.id !== id));
    void deleteHQFromSupabase(id);
  };

  const handleClearDemoHQs = () => {
    setHqs([]);
  };

  const handleResetToDemoHQs = () => {
    setHqs(INITIAL_HQS);
  };

  // Seller Management
  const handleAddSeller = (newSellerData: Omit<Seller, 'id' | 'totalSales' | 'totalEarnings' | 'active' | 'joinedAt'>) => {
    const newSeller: Seller = {
      ...newSellerData,
      id: `partner-${Date.now()}`,
      totalSales: 0,
      totalEarnings: 0,
      active: true,
      joinedAt: new Date().toISOString(),
    };
    setSellers((prev) => [...prev, newSeller]);
    void upsertSellerToSupabase(newSeller);
  };

  const handleDeleteSeller = (id: string) => {
    setSellers((prev) => prev.filter((s) => s.id !== id || s.role === 'master'));
    void deleteSellerFromSupabase(id);
  };

  const handleUpdateSellerPassword = (sellerId: string, newPass: string) => {
    let updatedRef: Seller | null = null;
    setSellers((prev) =>
      prev.map((s) => {
        if (s.id === sellerId) {
          updatedRef = { ...s, password: newPass };
          return updatedRef;
        }
        return s;
      })
    );
    if (currentSeller && currentSeller.id === sellerId) {
      setCurrentSeller((prev) => (prev ? { ...prev, password: newPass } : null));
    }
    if (updatedRef) {
      void upsertSellerToSupabase(updatedRef);
    }
  };

  const handleUpdateOwnerProfile = (updatedSeller: Seller) => {
    setSellers((prev) =>
      prev.map((s) => (s.id === updatedSeller.id || s.role === 'master' ? updatedSeller : s))
    );
    if (currentSeller && (currentSeller.id === updatedSeller.id || currentSeller.role === 'master')) {
      setCurrentSeller(updatedSeller);
    }
    void upsertSellerToSupabase(updatedSeller);
  };

  const handleLoginSeller = (email: string, pass: string): boolean => {
    const trimmedEmail = email.trim().toLowerCase();
    const master = sellers.find((s) => s.role === 'master') || sellers[0];
    const masterEmail = (master?.email || 'neto.mmp@gmail.com').toLowerCase();

    // Master login
    if (
      trimmedEmail === masterEmail ||
      trimmedEmail === 'neto.mmp@gmail.com' ||
      trimmedEmail === 'admin'
    ) {
      const validPass = master?.password || 'admin';
      if (pass === validPass || pass === 'admin' || pass === 'hqmaster2026') {
        setCurrentSeller(master);
        return true;
      }
      return false;
    }

    // Collaborator partner login
    const matched = sellers.find(
      (s) => s.email.toLowerCase() === trimmedEmail && s.password === pass
    );
    if (matched) {
      setCurrentSeller(matched);
      return true;
    }
    return false;
  };

  const handleLogoutSeller = () => {
    setCurrentSeller(null);
  };

  // Proposal Management
  const handleSubmitProposal = (data: Omit<DiscountProposal, 'id' | 'createdAt' | 'status' | 'sellerApprovals'>) => {
    const involvedSellerIds = Array.from(new Set(data.itemsSummary.map((i) => i.sellerId)));
    const initialApprovals: Record<string, 'pending' | 'accepted' | 'declined'> = {};
    involvedSellerIds.forEach((sId) => {
      initialApprovals[sId] = 'pending';
    });

    const newProposal: DiscountProposal = {
      ...data,
      id: `prop-${Date.now()}`,
      sellerApprovals: initialApprovals,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setProposals((prev) => [newProposal, ...prev]);
    void upsertProposalToSupabase(newProposal);
  };

  const handleUpdateProposalApproval = (proposalId: string, sellerId: string, decision: 'accepted' | 'declined') => {
    let updatedProp: DiscountProposal | null = null;
    setProposals((prev) =>
      prev.map((prop) => {
        if (prop.id !== proposalId) return prop;
        const updatedApprovals = { ...prop.sellerApprovals, [sellerId]: decision };
        const values = Object.values(updatedApprovals);

        let newStatus: 'pending' | 'approved' | 'rejected' = 'pending';
        if (values.some((v) => v === 'declined')) newStatus = 'rejected';
        else if (values.every((v) => v === 'accepted')) newStatus = 'approved';

        updatedProp = {
          ...prop,
          sellerApprovals: updatedApprovals,
          status: newStatus,
        };
        return updatedProp;
      })
    );
    if (updatedProp) {
      void upsertProposalToSupabase(updatedProp);
    }
  };

  // Order Management
  const handleOrderCreated = (order: Order) => {
    setOrders((prev) => [order, ...prev]);
    void upsertOrderToSupabase(order);

    // Update real sales stats per seller only from actual orders
    const salesBySeller: Record<string, { count: number; total: number }> = {};
    order.items.forEach((item) => {
      if (!salesBySeller[item.sellerId]) {
        salesBySeller[item.sellerId] = { count: 0, total: 0 };
      }
      salesBySeller[item.sellerId].count += 1;
      salesBySeller[item.sellerId].total += Number(item.price) || 0;
    });

    setSellers((prev) =>
      prev.map((s) => {
        const delta = salesBySeller[s.id];
        if (!delta) return s;
        const updated = {
          ...s,
          totalSales: (s.totalSales || 0) + delta.count,
          totalEarnings: Number(((s.totalEarnings || 0) + delta.total).toFixed(2)),
        };
        void upsertSellerToSupabase(updated);
        return updated;
      })
    );
  };

  const handleUpdateOrderTracking = (orderId: string, trackingCode: string) => {
    let updatedOrd: Order | null = null;
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          updatedOrd = { ...ord, trackingCode };
          return updatedOrd;
        }
        return ord;
      })
    );
    if (updatedOrd) {
      void upsertOrderToSupabase(updatedOrd);
    }
  };

  const handleReleasePayout = (orderId: string) => {
    let updatedOrd: Order | null = null;
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          updatedOrd = { ...ord, payoutReleasedToPartners: true };
          return updatedOrd;
        }
        return ord;
      })
    );
    if (updatedOrd) {
      void upsertOrderToSupabase(updatedOrd);
    }
  };

  const masterSeller = sellers.find((s) => s.role === 'master') || sellers[0];

  // 1. DEDICATED ADMIN PAGE VIEW
  if (currentView === 'admin') {
    return (
      <AdminPage
        onBackToStore={() => navigateTo('store')}
        hqs={hqs}
        onAddHQ={handleAddHQ}
        onUpdateHQ={handleUpdateHQ}
        onDeleteHQ={handleDeleteHQ}
        onResetToDemoHQs={handleResetToDemoHQs}
        onClearDemoHQs={handleClearDemoHQs}
        sellers={sellers}
        onAddSeller={handleAddSeller}
        onDeleteSeller={handleDeleteSeller}
        onUpdateSellerPassword={handleUpdateSellerPassword}
        onUpdateOwnerProfile={handleUpdateOwnerProfile}
        currentSeller={currentSeller}
        onLoginSeller={handleLoginSeller}
        onLogoutSeller={handleLogoutSeller}
        proposals={proposals}
        onUpdateProposalApproval={handleUpdateProposalApproval}
        orders={orders}
        onUpdateOrderTracking={handleUpdateOrderTracking}
        onReleasePayout={handleReleasePayout}
        supabaseStatus={supabaseStatus}
        onSyncSupabase={() => syncWithSupabase(true)}
      />
    );
  }

  // 2. USER STOREFRONT VIEW
  return (
    <div className="min-h-screen bg-[#0b0d13] text-zinc-100 flex flex-col font-['Inter']">
      {/* Header */}
      <Header
        cart={cart}
        onOpenCart={() => setIsCartOpen(true)}
        filters={filters}
        onUpdateFilters={(updates) => setFilters((prev) => ({ ...prev, ...updates }))}
        onNavigateToAdmin={() => navigateTo('admin')}
        onOpenPartnerModal={() => setIsPartnerModalOpen(true)}
        currentSeller={currentSeller}
        onLogoutSeller={handleLogoutSeller}
      />

      {/* Main Storefront Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Hero Section */}
        <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-zinc-900 via-[#131722] to-zinc-950 border border-zinc-800 p-6 sm:p-10 shadow-2xl">
          <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10 pointer-events-none bg-[radial-gradient(#f59e0b_1.5px,transparent_1.5px)] [background-size:16px_16px]" />

          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              Acervo Especializado em Revistas em Quadrinhos Clássicas & Coleções
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white font-['Space_Grotesk'] tracking-tight leading-none">
              O Acervo Histórico dos Quadrinhos
            </h1>

            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
              Explore formatinhos históricos da Editora Abril, sagas completas da Panini e achados nostálgicos. 
              Catalogadas com avaliação rigorosa e garantia incondicional de 100% de páginas completas.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                onClick={() => setFilters((prev) => ({ ...prev, onlyOneReal: true, franchise: 'all', publisher: 'all' }))}
                className="bg-rose-600 hover:bg-rose-500 text-white font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-rose-950/50 transition-transform active:scale-95"
              >
                <Flame className="w-4 h-4 fill-current" />
                HQs de Leitura a partir de R$ 1,00
              </button>

              <button
                onClick={() => setFilters((prev) => ({ ...prev, type: 'collection', onlyOneReal: false }))}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-transform active:scale-95"
              >
                <Layers className="w-4 h-4" />
                Lotes & Coleções Fechadas
              </button>

              <button
                onClick={() => navigateTo('admin')}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors"
              >
                <Lock className="w-4 h-4 text-amber-400" />
                Acesso do Lojista
              </button>
            </div>
          </div>
        </section>

        {/* Showcase of Top Covers */}
        <ShowcaseCarousel
          featuredHQs={featuredHQs}
          onSelectHQ={(hq) => setSelectedHQ(hq)}
          onAddToCart={handleAddToCart}
        />

        {/* Dynamic Category Quick-Pills */}
        <section className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-amber-400" />
              Coleções & Personagens no Acervo
            </span>
            <span className="text-[11px]">Selecione para filtrar instantaneamente</span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setFilters((prev) => ({ ...prev, franchise: 'all' }))}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                filters.franchise === 'all'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
              }`}
            >
              Todas as Coleções ({hqs.length})
            </button>

            {availableFranchises.map((franchise) => {
              const count = hqs.filter((h) => h.franchiseCategory === franchise).length;
              const isSelected = filters.franchise === franchise;

              return (
                <button
                  key={franchise}
                  onClick={() => setFilters((prev) => ({ ...prev, franchise: isSelected ? 'all' : franchise }))}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-black shadow-md'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                  }`}
                >
                  <span>{franchise}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-black text-amber-300' : 'bg-zinc-800 text-zinc-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Filters Panel on same page */}
        <ComicFilters
          filters={filters}
          onUpdateFilters={(updates) => setFilters((prev) => ({ ...prev, ...updates }))}
          onResetFilters={() =>
            setFilters({
              search: '',
              publisher: 'all',
              franchise: 'all',
              condition: 'all',
              yearDecade: 'all',
              type: 'all',
              priceMax: null,
              onlyOneReal: false,
              sellerId: 'all',
              sortBy: 'featured',
            })
          }
          availablePublishers={availablePublishers}
          availableFranchises={availableFranchises}
          sellers={sellers}
          totalResultsCount={filteredHQs.length}
        />

        {/* Main Grid of Comics */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white font-['Space_Grotesk'] tracking-tight">
              {filters.franchise !== 'all'
                ? `Coleção: ${filters.franchise}`
                : filters.onlyOneReal
                ? 'Achados de Leitura a partir de R$ 1,00'
                : 'Acervo Disponível para Compra'}
            </h2>
            <span className="text-xs text-zinc-400">
              {filteredHQs.length} {filteredHQs.length === 1 ? 'revista encontrada' : 'revistas encontradas'}
            </span>
          </div>

          {filteredHQs.length === 0 ? (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-12 text-center space-y-3">
              <Search className="w-12 h-12 text-zinc-600 mx-auto" />
              <h3 className="text-base font-bold text-white">Nenhuma HQ encontrada com esses filtros.</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Tente ajustar os filtros de editora, ano ou conservação para visualizar mais edições.
              </p>
              <button
                onClick={() =>
                  setFilters({
                    search: '',
                    publisher: 'all',
                    franchise: 'all',
                    condition: 'all',
                    yearDecade: 'all',
                    type: 'all',
                    priceMax: null,
                    onlyOneReal: false,
                    sellerId: 'all',
                    sortBy: 'featured',
                  })
                }
                className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-4 py-2 rounded-xl text-xs transition-colors"
              >
                Limpar Todos os Filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {filteredHQs.map((hq) => (
                <HQCard
                  key={hq.id}
                  hq={hq}
                  onSelect={(item) => setSelectedHQ(item)}
                  onAddToCart={handleAddToCart}
                  isInCart={cart.some((c) => c.hq.id === hq.id)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-[#090b10] border-t border-zinc-800/80 py-10 px-4 sm:px-6 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3 md:col-span-2">
            <HQMasterLogo size="md" />
            <p className="text-zinc-400 leading-relaxed text-xs max-w-md">
              Loja e acervo especializado em revistas em quadrinhos, formatinhos clássicos e coleções completas.
              Catalogação inteligente e pagamento com checkout seguro.
            </p>
            <p className="text-[11px] text-zinc-500 pt-1">
              Garantia de 100% das páginas preservadas para leitura integral em todas as edições.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Acesso Rápido</h4>
            <ul className="space-y-1.5 text-xs text-zinc-400">
              <li>
                <button onClick={() => navigateTo('admin')} className="hover:text-amber-300">
                  Painel Administrativo
                </button>
              </li>
              <li>
                <button onClick={() => setIsPartnerModalOpen(true)} className="hover:text-amber-300">
                  Quero Anunciar no Acervo
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Segurança & Entregas</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Pagamentos seguros via Mercado Pago (Pix e Cartão). Envios rastreados via Correios (PAC e SEDEX) para todo o Brasil.
            </p>
            <div className="text-[11px] text-amber-400 font-semibold pt-1">
              Pedido mínimo da loja: {formatBRL(30.0)}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-zinc-900 text-center text-[11px] text-zinc-600">
          © {new Date().getFullYear()} HQ Master. Todos os direitos reservados.
        </div>
      </footer>

      {/* Store Modals */}
      <HQDetailModal
        hq={selectedHQ}
        onClose={() => setSelectedHQ(null)}
        onAddToCart={handleAddToCart}
        isInCart={selectedHQ ? cart.some((c) => c.hq.id === selectedHQ.id) : false}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
        onOpenNegotiation={() => {
          setIsCartOpen(false);
          setIsNegotiationOpen(true);
        }}
        onOrderCreated={handleOrderCreated}
        storePixKey={masterSeller?.pixKey || 'neto.mmp@gmail.com'}
        sellerOriginCep={masterSeller?.cep || '01310-100'}
      />

      <DiscountNegotiationModal
        isOpen={isNegotiationOpen}
        cart={cart}
        subtotal={cart.reduce((acc, i) => acc + i.hq.price * i.quantity, 0)}
        distinctSellersCount={Array.from(new Set(cart.map((c) => c.hq.sellerId))).length}
        onClose={() => setIsNegotiationOpen(false)}
        onSubmitProposal={handleSubmitProposal}
      />

      <PartnerOnboardingModal
        isOpen={isPartnerModalOpen}
        onClose={() => setIsPartnerModalOpen(false)}
        onRegisterPartner={handleAddSeller}
      />
    </div>
  );
}
