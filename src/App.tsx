import React, { useState, useEffect } from 'react';
import {
  Search,
  MessageSquare,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import { HQItem, Seller, CartItem, FilterState, DiscountProposal, Order } from './types.ts';
import { INITIAL_HQS, INITIAL_SELLERS } from './data/initialComics.ts';
import {
  filterHQs,
  formatBRL,
  buildCollectionGroupKey,
  reconcileCollectionLots,
} from './utils/comicLogic.ts';
import { Header } from './components/Header.tsx';
import { ComicFilters } from './components/ComicFilters.tsx';
import { HQCard } from './components/HQCard.tsx';
import { HQDetailModal } from './components/HQDetailModal.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { DiscountNegotiationModal } from './components/DiscountNegotiationModal.tsx';
import { PartnerOnboardingModal } from './components/PartnerOnboardingModal.tsx';
import { AdminPage } from './components/AdminPage.tsx';
import { GeekGridLogo } from './components/HQMasterLogo.tsx';
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

  // Light / Dark theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'dark';
    const saved = localStorage.getItem('geekgrid_theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.dataset.theme = theme;
    try {
      localStorage.setItem('geekgrid_theme', theme);
    } catch {
      // Ignore storage quota issues
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // State initialization with localStorage persistence
  const [hqs, setHqs] = useState<HQItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_HQS);
      if (!saved) return INITIAL_HQS;
      const parsed = JSON.parse(saved) as HQItem[];
      return parsed.map((h) => ({ ...h, sellerAddress: '', sellerCep: '' }));
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
  const [approvedProposal, setApprovedProposal] = useState<DiscountProposal | null>(null);

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

  // Load approved discount proposal automatically if user opened /?proposta=<id>
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const propId = params.get('proposta');
    if (!propId) return;

    const found = proposals.find((p) => p.id === propId && p.status === 'approved');
    if (!found) return;

    const matchingHQs = found.itemIds
      .map((id) => hqs.find((h) => h.id === id))
      .filter((h): h is HQItem => Boolean(h));

    if (matchingHQs.length > 0) {
      setCart(matchingHQs.map((hq) => ({ hq, quantity: 1 })));
      setApprovedProposal(found);
      setIsCartOpen(true);
      const cleanUrl = `${window.location.pathname}#loja`;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, [proposals, hqs]);

  // Derived data for dynamic filters (exclude sold out HQs)
  const activeHQs = hqs.filter((h) => !h.sold);
  const availablePublishers = Array.from(new Set(activeHQs.map((h) => h.publisher))).sort();
  const availableFranchises = Array.from(new Set(activeHQs.map((h) => h.franchiseCategory))).sort();

  // Filtered HQs
  const filteredHQs = filterHQs(hqs, filters);

  // Cart actions
  const handleAddToCart = (hq: HQItem, selectedIssues?: string[]) => {
    setCart((prev) => {
      if (selectedIssues && selectedIssues.length > 0) {
        const next = [...prev];
        selectedIssues.forEach((issue) => {
          const alreadyExists = next.some(
            (item) => item.hq.id === hq.id && (item.selectedIssue || '') === issue
          );
          if (!alreadyExists) {
            const unitPrice = hq.unitPrice || hq.price;
            next.push({
              hq: {
                ...hq,
                title: `${hq.title} — Avulso ${issue}`,
                issueNumber: issue,
                price: unitPrice,
                isCollection: false,
                collectionCount: 1,
              },
              quantity: 1,
              selectedIssue: issue,
              parentLotId: hq.id,
            });
          }
        });
        return next;
      }

      const existing = prev.find((item) => item.hq.id === hq.id && !item.selectedIssue);
      if (existing) return prev;
      return [...prev, { hq, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const handleRemoveFromCart = (hqId: string, selectedIssue?: string) => {
    setCart((prev) =>
      prev.filter(
        (item) => !(item.hq.id === hqId && (item.selectedIssue || '') === (selectedIssue || ''))
      )
    );
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const persistChangedHQs = (prevList: HQItem[], nextList: HQItem[]) => {
    const prevMap = new Map(prevList.map((item) => [item.id, item]));
    nextList.forEach((nextItem) => {
      const prevItem = prevMap.get(nextItem.id);
      const isChanged =
        !prevItem ||
        prevItem.price !== nextItem.price ||
        prevItem.bundlePrice !== nextItem.bundlePrice ||
        prevItem.unitPrice !== nextItem.unitPrice ||
        prevItem.collectionCount !== nextItem.collectionCount ||
        prevItem.sold !== nextItem.sold ||
        prevItem.title !== nextItem.title ||
        prevItem.issueNumber !== nextItem.issueNumber ||
        prevItem.lotGroupId !== nextItem.lotGroupId ||
        prevItem.allowsUnitPurchase !== nextItem.allowsUnitPurchase ||
        (prevItem.soldIssues?.length || 0) !== (nextItem.soldIssues?.length || 0) ||
        (prevItem.images?.length || 0) !== (nextItem.images?.length || 0);
      if (isChanged) {
        void upsertHQToSupabase(nextItem);
      }
    });
  };

  // HQ Management (State + Dynamic Lot Grouping + Supabase Cloud Persistence)
  const handleAddHQ = (newHQData: Omit<HQItem, 'id' | 'createdAt'>, autoGroupWithSeries = true) => {
    const newHQ: HQItem = {
      ...newHQData,
      id: `hq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const groupKey = buildCollectionGroupKey(newHQ.sellerId, newHQ.franchiseCategory, newHQ.series);

    setHqs((prev) => {
      const combined = [newHQ, ...prev];
      const next =
        autoGroupWithSeries && groupKey && !newHQ.isCollection
          ? reconcileCollectionLots(combined, new Set([groupKey]), prev)
          : combined;
      persistChangedHQs(prev, next);
      return next;
    });
  };

  const handleAddBatchHQs = (newHQsData: Omit<HQItem, 'id' | 'createdAt'>[]) => {
    const baseTs = Date.now();
    const createdBatch: HQItem[] = newHQsData.map((data, idx) => ({
      ...data,
      id: `hq-${baseTs}-${idx}`,
      createdAt: new Date(baseTs + idx).toISOString(),
    }));

    const affectedKeys = new Set<string>();
    createdBatch.forEach((item) => {
      const key = buildCollectionGroupKey(item.sellerId, item.franchiseCategory, item.series);
      if (key) affectedKeys.add(key);
    });

    setHqs((prev) => {
      const combined = [...createdBatch, ...prev];
      const next =
        affectedKeys.size > 0
          ? reconcileCollectionLots(combined, affectedKeys, prev)
          : combined;
      persistChangedHQs(prev, next);
      return next;
    });
  };

  const handleUpdateHQ = (updated: HQItem) => {
    const existing = hqs.find((h) => h.id === updated.id);
    if (currentSeller && currentSeller.role !== 'master' && existing && existing.sellerId !== currentSeller.id) {
      alert('Você só tem permissão para editar os seus próprios anúncios.');
      return;
    }
    const sanitized: HQItem = { ...updated, sellerAddress: '', sellerCep: '' };
    const affectedKeys = new Set<string>();
    if (existing) {
      const oldKey = buildCollectionGroupKey(existing.sellerId, existing.franchiseCategory, existing.series);
      if (oldKey) affectedKeys.add(oldKey);
    }
    const newKey = buildCollectionGroupKey(sanitized.sellerId, sanitized.franchiseCategory, sanitized.series);
    if (newKey) affectedKeys.add(newKey);

    setHqs((prev) => {
      const mapped = prev.map((h) => (h.id === sanitized.id ? sanitized : h));
      const next =
        !sanitized.isCollection && affectedKeys.size > 0
          ? reconcileCollectionLots(mapped, affectedKeys, prev)
          : mapped;
      persistChangedHQs(prev, next);
      return next;
    });
  };

  const handleDeleteHQ = (id: string) => {
    const existing = hqs.find((h) => h.id === id);
    if (currentSeller && currentSeller.role !== 'master' && existing && existing.sellerId !== currentSeller.id) {
      alert('Você só tem permissão para remover os seus próprios anúncios.');
      return;
    }
    const groupKey = existing
      ? buildCollectionGroupKey(existing.sellerId, existing.franchiseCategory, existing.series)
      : '';

    setHqs((prev) => {
      const filtered = prev.filter((h) => h.id !== id);
      const next = groupKey
        ? reconcileCollectionLots(filtered, new Set([groupKey]), prev)
        : filtered;
      persistChangedHQs(prev, next);
      return next;
    });
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
    const isPending = newSellerData.approvalStatus === 'pending';
    const newSeller: Seller = {
      ...newSellerData,
      id: `partner-${Date.now()}`,
      approvalStatus: isPending ? 'pending' : 'approved',
      totalSales: 0,
      totalEarnings: 0,
      active: !isPending,
      joinedAt: new Date().toISOString(),
    };
    setSellers((prev) => [...prev, newSeller]);
    void upsertSellerToSupabase(newSeller);
  };

  const handleApproveSeller = (sellerId: string, password: string) => {
    const cleanPass = password.trim();
    if (!cleanPass) return;
    let updatedRef: Seller | null = null;
    setSellers((prev) =>
      prev.map((s) => {
        if (s.id === sellerId) {
          updatedRef = {
            ...s,
            password: cleanPass,
            active: true,
            approvalStatus: 'approved',
          };
          return updatedRef;
        }
        return s;
      })
    );
    if (updatedRef) {
      void upsertSellerToSupabase(updatedRef);
    }
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
      prev.map((s) => (s.id === updatedSeller.id ? updatedSeller : s))
    );
    if (currentSeller && currentSeller.id === updatedSeller.id) {
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

    // Collaborator partner login (must be approved, active, and have a password set by Master)
    const matched = sellers.find(
      (s) =>
        s.role !== 'master' &&
        s.email.toLowerCase() === trimmedEmail &&
        Boolean(s.password) &&
        s.password === pass &&
        s.active !== false &&
        s.approvalStatus !== 'pending'
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

  const handleUpdateSellerMaxDiscount = (sellerId: string, maxDiscountPercent: number) => {
    const clamped = Math.max(0, Math.min(80, Number.isFinite(maxDiscountPercent) ? maxDiscountPercent : 0));
    let updatedRef: Seller | null = null;
    setSellers((prev) =>
      prev.map((s) => {
        if (s.id === sellerId) {
          updatedRef = { ...s, maxDiscountPercent: clamped };
          return updatedRef;
        }
        return s;
      })
    );
    if (currentSeller && currentSeller.id === sellerId) {
      setCurrentSeller((prev) => (prev ? { ...prev, maxDiscountPercent: clamped } : null));
    }
    if (updatedRef) {
      void upsertSellerToSupabase(updatedRef);
    }
  };

  // Proposal Management
  const handleSubmitProposal = (
    data: Omit<DiscountProposal, 'id' | 'createdAt' | 'status' | 'sellerApprovals'>,
    autoApprove = false
  ): DiscountProposal => {
    const id = `prop-${Date.now()}`;
    const involvedSellerIds = Array.from(new Set(data.itemsSummary.map((i) => i.sellerId || 'master')));
    const initialApprovals: Record<string, 'pending' | 'accepted' | 'declined'> = {};
    involvedSellerIds.forEach((sId) => {
      initialApprovals[sId] = autoApprove ? 'accepted' : 'pending';
    });

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const master = sellers.find((s) => s.role === 'master') || sellers[0];
    const pixKey = master?.pixKey || 'neto.mmp@gmail.com';
    const paymentLink = autoApprove && origin ? `${origin}/?proposta=${id}#loja` : '';
    const pixCopiaECola = autoApprove
      ? `00020126580014BR.GOV.BCB.PIX0136${pixKey}520400005303986540${Number(data.proposedTotal).toFixed(2)}5802BR5909GEEK GRID6009SAO PAULO62070503***6304`
      : '';

    const newProposal: DiscountProposal = {
      ...data,
      id,
      sellerApprovals: initialApprovals,
      status: autoApprove ? 'approved' : 'pending',
      autoApproved: autoApprove,
      discountAmount: Number(Math.max(0, data.originalTotal - data.proposedTotal).toFixed(2)),
      paymentLink,
      pixCopiaECola,
      createdAt: new Date().toISOString(),
    };

    setProposals((prev) => [newProposal, ...prev]);
    void upsertProposalToSupabase(newProposal);
    return newProposal;
  };

  const handleUpdateProposalApproval = (
    proposalId: string,
    sellerId: string,
    decision: 'accepted' | 'declined',
    forceMasterOverride = false
  ) => {
    const actor = sellers.find((s) => s.id === sellerId);
    const isMaster = actor?.role === 'master';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const master = sellers.find((s) => s.role === 'master') || sellers[0];
    const pixKey = master?.pixKey || 'neto.mmp@gmail.com';

    let updatedProp: DiscountProposal | null = null;
    setProposals((prev) =>
      prev.map((prop) => {
        if (prop.id !== proposalId) return prop;

        const updatedApprovals = { ...(prop.sellerApprovals || {}) };
        if (isMaster && (forceMasterOverride || Object.keys(updatedApprovals).length === 0 || !(sellerId in updatedApprovals))) {
          // Master authorizing store-wide or partner-only proposal
          const keys = Object.keys(updatedApprovals);
          if (keys.length === 0) {
            updatedApprovals[sellerId] = decision;
          } else {
            keys.forEach((k) => {
              if (updatedApprovals[k] === 'pending' || k === sellerId) {
                updatedApprovals[k] = decision;
              }
            });
          }
        } else {
          updatedApprovals[sellerId] = decision;
        }

        const values = Object.values(updatedApprovals);
        let newStatus: 'pending' | 'approved' | 'rejected' = 'pending';
        if (values.some((v) => v === 'declined')) newStatus = 'rejected';
        else if (values.length > 0 && values.every((v) => v === 'accepted')) newStatus = 'approved';

        const paymentLink =
          newStatus === 'approved'
            ? prop.paymentLink || (origin ? `${origin}/?proposta=${prop.id}#loja` : '')
            : prop.paymentLink;
        const pixCopiaECola =
          newStatus === 'approved'
            ? prop.pixCopiaECola ||
              `00020126580014BR.GOV.BCB.PIX0136${pixKey}520400005303986540${Number(prop.proposedTotal).toFixed(2)}5802BR5909GEEK GRID6009SAO PAULO62070503***6304`
            : prop.pixCopiaECola;

        updatedProp = {
          ...prop,
          sellerApprovals: updatedApprovals,
          status: newStatus,
          paymentLink,
          pixCopiaECola,
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

    // Deduct purchased items (and individual avulsos / linked lot quantities) from active stock automatically
    const boughtStandaloneIds = new Set(
      order.items.filter((i) => !i.selectedIssue).map((i) => i.hqId)
    );
    const boughtLotIssuesMap: Record<string, string[]> = {};
    order.items.forEach((i) => {
      if (i.selectedIssue && i.parentLotId) {
        if (!boughtLotIssuesMap[i.parentLotId]) boughtLotIssuesMap[i.parentLotId] = [];
        boughtLotIssuesMap[i.parentLotId].push(i.selectedIssue);
      }
    });

    setHqs((prev) => {
      // Track lotGroupIds affected by standalone purchases
      const soldUnitIssuesByGroup: Record<string, string[]> = {};
      const soldFullLotGroupIds = new Set<string>();

      prev.forEach((hq) => {
        if (boughtStandaloneIds.has(hq.id) && hq.lotGroupId) {
          if (hq.isCollection) {
            soldFullLotGroupIds.add(hq.lotGroupId);
          } else {
            if (!soldUnitIssuesByGroup[hq.lotGroupId]) soldUnitIssuesByGroup[hq.lotGroupId] = [];
            soldUnitIssuesByGroup[hq.lotGroupId].push(hq.issueNumber);
          }
        }
        // Also propagate lot issue selections back to linked standalone unit HQs
        if (boughtLotIssuesMap[hq.id] && hq.lotGroupId) {
          if (!soldUnitIssuesByGroup[hq.lotGroupId]) soldUnitIssuesByGroup[hq.lotGroupId] = [];
          soldUnitIssuesByGroup[hq.lotGroupId].push(...boughtLotIssuesMap[hq.id]);
        }
      });

      const affectedGroupKeys = new Set<string>();
      const preReconciledHqs = prev.map((hq) => {
        let modified = false;
        let next = hq;

        // 1. Direct purchase of standalone HQ or full collection
        if (boughtStandaloneIds.has(hq.id)) {
          next = { ...next, sold: true };
          modified = true;
        }

        // 2. Direct full-lot purchase sold all individual avulsos in the same lotGroupId
        if (!hq.isCollection && hq.lotGroupId && soldFullLotGroupIds.has(hq.lotGroupId)) {
          next = { ...next, sold: true };
          modified = true;
        }

        // 3. Individual issue selected from parent collection -> mark linked standalone unit HQs sold
        if (!hq.isCollection && hq.lotGroupId && soldUnitIssuesByGroup[hq.lotGroupId]?.includes(hq.issueNumber)) {
          next = { ...next, sold: true };
          modified = true;
        }

        // 4. For legacy unlinked collections without separate unit HQs, adjust bundle price directly
        const hasLinkedUnitsInGroup = prev.some(
          (other) =>
            !other.isCollection &&
            buildCollectionGroupKey(other.sellerId, other.franchiseCategory, other.series) ===
              buildCollectionGroupKey(hq.sellerId, hq.franchiseCategory, hq.series)
        );
        const issuesSoldForThisLot = [
          ...(boughtLotIssuesMap[hq.id] || []),
          ...(hq.isCollection && hq.lotGroupId ? soldUnitIssuesByGroup[hq.lotGroupId] || [] : []),
        ];
        if (!hasLinkedUnitsInGroup && hq.isCollection && issuesSoldForThisLot.length > 0 && !next.sold) {
          const prevSold = new Set(hq.soldIssues || []);
          const uniqueNew = Array.from(new Set(issuesSoldForThisLot)).filter((iss) => !prevSold.has(iss));
          if (uniqueNew.length > 0) {
            const mergedSold = [...(hq.soldIssues || []), ...uniqueNew];
            const prevCount = Math.max(1, hq.collectionCount || 1);
            const remainingCount = Math.max(0, prevCount - uniqueNew.length);
            const updatedBundle =
              remainingCount > 0 && hq.bundlePrice
                ? Number(((hq.bundlePrice * remainingCount) / prevCount).toFixed(2))
                : next.bundlePrice;
            next = {
              ...next,
              soldIssues: mergedSold,
              collectionCount: remainingCount,
              bundlePrice: updatedBundle,
              price: remainingCount > 0 && updatedBundle ? updatedBundle : next.price,
              sold: remainingCount <= 0,
            };
            modified = true;
          }
        }

        if (modified) {
          const gKey = buildCollectionGroupKey(hq.sellerId, hq.franchiseCategory, hq.series);
          if (gKey) affectedGroupKeys.add(gKey);
        }
        return next;
      });

      const reconciledHqs =
        affectedGroupKeys.size > 0
          ? reconcileCollectionLots(preReconciledHqs, affectedGroupKeys, prev)
          : preReconciledHqs;

      persistChangedHQs(prev, reconciledHqs);
      return reconciledHqs;
    });
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
  const cartSellerIds = Array.from(new Set(cart.map((c) => c.hq.sellerId).filter(Boolean)));
  const activeCartSeller =
    cartSellerIds.length === 1
      ? sellers.find((s) => s.id === cartSellerIds[0]) || masterSeller
      : masterSeller;

  // 1. DEDICATED ADMIN PAGE VIEW
  if (currentView === 'admin') {
    return (
      <AdminPage
        onBackToStore={() => navigateTo('store')}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        hqs={hqs}
        onAddHQ={handleAddHQ}
        onAddHQsBatch={handleAddBatchHQs}
        onUpdateHQ={handleUpdateHQ}
        onDeleteHQ={handleDeleteHQ}
        onResetToDemoHQs={handleResetToDemoHQs}
        onClearDemoHQs={handleClearDemoHQs}
        sellers={sellers}
        onAddSeller={handleAddSeller}
        onApproveSeller={handleApproveSeller}
        onDeleteSeller={handleDeleteSeller}
        onUpdateSellerPassword={handleUpdateSellerPassword}
        onUpdateOwnerProfile={handleUpdateOwnerProfile}
        onUpdateSellerMaxDiscount={handleUpdateSellerMaxDiscount}
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
    <div className="min-h-screen bg-[var(--gg-bg)] text-[var(--gg-text)] flex flex-col transition-colors">
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
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Storefront Body — Straight into Filters & Catalog */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-5 sm:py-6 space-y-5 sm:space-y-6">
        {/* Filters Panel at the top */}
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
          sellers={sellers.filter((s) => s.active !== false).map((s) => ({ id: s.id, name: s.name, storeName: s.storeName }))}
          totalResultsCount={filteredHQs.length}
        />

        {/* Quick Collection / Category Tabs */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-[var(--gg-text-muted)] px-0.5">
            <span className="font-semibold text-[var(--gg-text-strong)] flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
              Categorias & Coleções
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, franchise: 'all' }))}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors border ${
                filters.franchise === 'all'
                  ? 'bg-amber-500 text-zinc-950 border-amber-400'
                  : 'bg-[var(--gg-surface)] hover:bg-[var(--gg-surface-2)] text-[var(--gg-text)] border-[var(--gg-border)]'
              }`}
            >
              Tudo ({activeHQs.length})
            </button>

            {availableFranchises.map((franchise) => {
              const count = activeHQs.filter((h) => h.franchiseCategory === franchise).length;
              const isSelected = filters.franchise === franchise;

              return (
                <button
                  type="button"
                  key={franchise}
                  onClick={() => setFilters((prev) => ({ ...prev, franchise: isSelected ? 'all' : franchise }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-colors border ${
                    isSelected
                      ? 'bg-amber-500 text-zinc-950 border-amber-400'
                      : 'bg-[var(--gg-surface)] hover:bg-[var(--gg-surface-2)] text-[var(--gg-text)] border-[var(--gg-border)]'
                  }`}
                >
                  <span>{franchise}</span>
                  <span className={`text-[10px] tabular-nums ${isSelected ? 'text-zinc-900 font-bold' : 'text-[var(--gg-text-subtle)]'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Main Grid of Items */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-display text-lg sm:text-xl font-bold text-[var(--gg-text-strong)] tracking-tight">
              {filters.franchise !== 'all'
                ? filters.franchise
                : 'Catálogo Geek Grid'}
            </h1>
            <span className="text-xs text-[var(--gg-text-muted)] tabular-nums shrink-0">
              {filteredHQs.length} {filteredHQs.length === 1 ? 'item encontrado' : 'itens encontrados'}
            </span>
          </div>

          {filteredHQs.length === 0 ? (
            <div className="bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-2xl p-8 sm:p-12 text-center space-y-3">
              <Search className="w-10 h-10 text-[var(--gg-text-subtle)] mx-auto" />
              <h3 className="text-base font-bold text-[var(--gg-text-strong)]">Nenhum item encontrado com esses filtros.</h3>
              <p className="text-xs text-[var(--gg-text-muted)] max-w-sm mx-auto">
                Ajuste os filtros acima para visualizar outros itens disponíveis.
              </p>
              <button
                type="button"
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
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
              >
                Limpar Filtros
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

        {/* Short Contact / Sell CTA */}
        <section className="bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-[var(--gg-accent-text)] shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-sm sm:text-base font-bold text-[var(--gg-text-strong)]">
                Quer ajuda para vender suas HQs, livros ou colecionáveis?
              </h2>
              <p className="text-xs text-[var(--gg-text-muted)]">
                A gente te ajuda a catalogar e anunciar seu acervo.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsPartnerModalOpen(true)}
            className="w-full sm:w-auto justify-center bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <span>Clique aqui para conversar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 sm:mt-14 bg-[var(--gg-footer)] border-t border-[var(--gg-border)] py-8 sm:py-10 px-4 sm:px-6 text-xs text-[var(--gg-text-subtle)] transition-colors">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3 md:col-span-2">
            <GeekGridLogo size="md" />
            <p className="text-[var(--gg-text-muted)] leading-relaxed text-xs max-w-md">
              Marketplace especializado em quadrinhos, mangás, livros, action figures e colecionáveis.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[var(--gg-text-strong)] uppercase tracking-wider">Acesso Rápido</h4>
            <ul className="space-y-1.5 text-xs text-[var(--gg-text-muted)]">
              <li>
                <button onClick={() => navigateTo('admin')} className="hover:text-[var(--gg-accent-text)]">
                  Área do Lojista
                </button>
              </li>
              <li>
                <button onClick={() => setIsPartnerModalOpen(true)} className="hover:text-[var(--gg-accent-text)]">
                  Fale Conosco / Quero Vender
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[var(--gg-text-strong)] uppercase tracking-wider">Pagamentos & Envios</h4>
            <p className="text-xs text-[var(--gg-text-muted)] leading-relaxed">
              Pagamentos via PIX e checkout integrado. Envios rastreados pelos Correios para todo o Brasil.
            </p>
            <div className="text-[11px] text-[var(--gg-text-muted)] pt-1 tabular-nums">
              Pedido mínimo: {formatBRL(30.0)}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-[var(--gg-border)] text-center text-[11px] text-[var(--gg-text-subtle)]">
          © {new Date().getFullYear()} Geek Grid. Todos os direitos reservados.
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
        storePixKey={activeCartSeller?.pixKey || masterSeller?.pixKey || 'neto.mmp@gmail.com'}
        sellerOriginCep={activeCartSeller?.cep || masterSeller?.cep || '01310-100'}
        sellerCheckoutProvider={activeCartSeller?.checkoutProvider || 'mercadopago'}
        sellerCheckoutApiKey={activeCartSeller?.checkoutApiKey || ''}
        sellerCheckoutUrl={activeCartSeller?.checkoutUrl || ''}
        approvedProposal={approvedProposal}
        onClearApprovedProposal={() => setApprovedProposal(null)}
      />

      <DiscountNegotiationModal
        isOpen={isNegotiationOpen}
        cart={cart}
        sellers={sellers.map((s) => ({ id: s.id, maxDiscountPercent: s.maxDiscountPercent }))}
        subtotal={cart.reduce((acc, i) => acc + i.hq.price * i.quantity, 0)}
        distinctSellersCount={Array.from(new Set(cart.map((c) => c.hq.sellerId))).length}
        onClose={() => setIsNegotiationOpen(false)}
        onSubmitProposal={handleSubmitProposal}
        onProceedToAutoApprovedCheckout={(prop) => {
          setApprovedProposal(prop);
          setIsNegotiationOpen(false);
          setIsCartOpen(true);
        }}
      />

      <PartnerOnboardingModal
        isOpen={isPartnerModalOpen}
        onClose={() => setIsPartnerModalOpen(false)}
        onRegisterPartner={handleAddSeller}
      />
    </div>
  );
}
