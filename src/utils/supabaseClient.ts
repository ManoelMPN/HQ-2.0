import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { HQItem, Seller, Order, DiscountProposal } from '../types.ts';

// Local storage keys for custom user-configured credentials
const STORAGE_KEY_URL = 'bancahq_supabase_url';
const STORAGE_KEY_KEY = 'bancahq_supabase_anon_key';

export function normalizeSupabaseUrl(rawUrl: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '';
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProto);
    return parsed.origin;
  } catch {
    return trimmed.replace(/\/rest\/v1\/?.*$/i, '').replace(/\/+$/, '');
  }
}

export function isSecretSupabaseKey(rawKey: string): boolean {
  const key = (rawKey || '').trim();
  if (!key) return false;
  if (key.startsWith('sb_secret_')) return true;
  if (key.startsWith('eyJ') && key.split('.').length === 3) {
    try {
      const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload?.role === 'service_role') return true;
    } catch {
      // ignore decode error
    }
  }
  return false;
}

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) || '' : '';
  const localKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) || '' : '';

  return {
    url: normalizeSupabaseUrl(localUrl || envUrl),
    anonKey: (localKey || envKey).trim(),
  };
}

let supabaseInstance: SupabaseClient | null = null;

export function saveSupabaseCredentials(url: string, anonKey: string) {
  const normalizedUrl = normalizeSupabaseUrl(url);
  if (typeof window !== 'undefined') {
    if (normalizedUrl) localStorage.setItem(STORAGE_KEY_URL, normalizedUrl);
    else localStorage.removeItem(STORAGE_KEY_URL);

    if (anonKey.trim()) localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
    else localStorage.removeItem(STORAGE_KEY_KEY);
  }
  // Reset cached client so next getSupabase() uses the newly saved credentials
  supabaseInstance = null;
}

export function getSupabase(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey || isSecretSupabaseKey(anonKey)) {
    return null;
  }
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, anonKey);
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return supabaseInstance;
}

// ---------- ROW MAPPERS (TS <-> Postgres) ----------

function mapSellerToRow(s: Seller, includeExtended = true) {
  const base: Record<string, any> = {
    id: s.id,
    name: s.name,
    store_name: s.storeName,
    email: s.email,
    role: s.role,
    password: s.password || 'admin',
    cep: s.cep || '01310-100',
    address: s.address || 'São Paulo - SP',
    total_sales: s.totalSales || 0,
    total_earnings: s.totalEarnings || 0,
    active: s.active ?? true,
    created_at: s.joinedAt || new Date().toISOString(),
  };

  if (includeExtended) {
    Object.assign(base, {
      phone: s.phone || '',
      cpf_cnpj: s.cpfCnpj || '',
      street: s.street || '',
      number: s.number || '',
      neighborhood: s.neighborhood || '',
      city: s.city || '',
      state: s.state || '',
      complement: s.complement || '',
      pix_key_type: s.pixKeyType || 'email',
      pix_key: s.pixKey || s.email || '',
      bank_name: s.bankName || '',
      account_holder: s.accountHolder || s.name || '',
    });
  }

  return base;
}

function mapRowToSeller(row: any): Seller {
  return {
    id: row.id,
    name: row.name,
    storeName: row.store_name || row.name,
    email: row.email,
    role: row.role === 'master' ? 'master' : 'partner',
    password: row.password,
    phone: row.phone || '',
    cpfCnpj: row.cpf_cnpj || '',
    cep: row.cep || '01310-100',
    address: row.address || '',
    street: row.street || '',
    number: row.number || '',
    neighborhood: row.neighborhood || '',
    city: row.city || '',
    state: row.state || '',
    complement: row.complement || '',
    pixKeyType: row.pix_key_type || 'email',
    pixKey: row.pix_key || row.email || '',
    bankName: row.bank_name || '',
    accountHolder: row.account_holder || row.name || '',
    totalSales: Number(row.total_sales || 0),
    totalEarnings: Number(row.total_earnings || 0),
    active: row.active ?? true,
    joinedAt: row.created_at || new Date().toISOString(),
  };
}

function mapHQToRow(hq: HQItem, includeExtended = true) {
  const base: Record<string, any> = {
    id: hq.id,
    title: hq.title,
    description: hq.description || '',
    publisher: hq.publisher,
    series: hq.series,
    franchise_category: hq.franchiseCategory,
    issue_number: hq.issueNumber || '01',
    year: Number(hq.year) || 1990,
    condition: hq.condition,
    condition_details: hq.conditionDetails || '',
    has_all_pages: hq.hasAllPages ?? true,
    cleaning_note: hq.cleaningNote || '',
    price: Number(hq.price) || 0,
    is_rare_special_1real: Boolean(hq.isRareSpecial1Real),
    is_collection: Boolean(hq.isCollection),
    collection_count: Number(hq.collectionCount) || 1,
    images: Array.isArray(hq.images) ? hq.images : [],
    seller_id: hq.sellerId || 'master',
    seller_name: hq.sellerName || 'HQ Master',
    seller_address: '',
    seller_cep: '',
    featured: Boolean(hq.featured),
    sold: Boolean(hq.sold),
    created_at: hq.createdAt || new Date().toISOString(),
  };

  if (includeExtended) {
    Object.assign(base, {
      unit_price: hq.unitPrice ?? hq.price,
      bundle_price: hq.bundlePrice ?? hq.price,
      allows_unit_purchase: Boolean(hq.allowsUnitPurchase),
    });
  }

  return base;
}

function mapRowToHQ(row: any): HQItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    publisher: row.publisher || 'Outra',
    series: row.series || '',
    franchiseCategory: row.franchise_category || 'Quadrinhos',
    issueNumber: row.issue_number || '01',
    year: Number(row.year || 1990),
    condition: row.condition || 'bom',
    conditionDetails: row.condition_details || '',
    hasAllPages: row.has_all_pages ?? true,
    cleaningNote: row.cleaning_note || '',
    price: Number(row.price || 0),
    unitPrice: row.unit_price !== undefined && row.unit_price !== null ? Number(row.unit_price) : Number(row.price || 0),
    bundlePrice: row.bundle_price !== undefined && row.bundle_price !== null ? Number(row.bundle_price) : Number(row.price || 0),
    allowsUnitPurchase: Boolean(row.allows_unit_purchase),
    isRareSpecial1Real: Boolean(row.is_rare_special_1real),
    isCollection: Boolean(row.is_collection),
    collectionCount: Number(row.collection_count || 1),
    images: Array.isArray(row.images) ? row.images : [],
    sellerId: row.seller_id || 'master',
    sellerName: row.seller_name || 'HQ Master',
    sellerAddress: '',
    sellerCep: '',
    featured: Boolean(row.featured),
    sold: Boolean(row.sold),
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapOrderToRow(o: Order, includeExtended = true) {
  const base: Record<string, any> = {
    id: o.id,
    order_number: o.orderNumber,
    buyer_name: o.buyerName,
    buyer_email: o.buyerEmail,
    buyer_cep: o.buyerCep,
    buyer_address: o.buyerAddress,
    items: o.items,
    shipping_method: o.shippingMethod,
    shipping_cost: Number(o.shippingCost || 0),
    subtotal: Number(o.subtotal || 0),
    discount: Number(o.discount || 0),
    total: Number(o.total || 0),
    payment_method: o.paymentMethod || 'pix',
    mercadopago_preference_id: o.mercadopagoPreferenceId || '',
    status: o.status || 'pending_payment',
    tracking_code: o.trackingCode || '',
    payout_released_to_partners: Boolean(o.payoutReleasedToPartners),
    created_at: o.createdAt || new Date().toISOString(),
  };

  if (includeExtended) {
    Object.assign(base, {
      buyer_phone: o.buyerPhone || '',
      buyer_cpf: o.buyerCpf || '',
      buyer_street: o.buyerStreet || '',
      buyer_number: o.buyerNumber || '',
      buyer_neighborhood: o.buyerNeighborhood || '',
      buyer_city: o.buyerCity || '',
      buyer_state: o.buyerState || '',
      buyer_complement: o.buyerComplement || '',
      mercadopago_payment_link: o.mercadopagoPaymentLink || '',
      pix_copia_e_cola: o.pixCopiaECola || '',
    });
  }

  return base;
}

function mapRowToOrder(row: any): Order {
  return {
    id: row.id,
    orderNumber: row.order_number || row.id,
    buyerName: row.buyer_name,
    buyerEmail: row.buyer_email,
    buyerPhone: row.buyer_phone || '',
    buyerCpf: row.buyer_cpf || '',
    buyerCep: row.buyer_cep || '',
    buyerAddress: row.buyer_address || '',
    buyerStreet: row.buyer_street || '',
    buyerNumber: row.buyer_number || '',
    buyerNeighborhood: row.buyer_neighborhood || '',
    buyerCity: row.buyer_city || '',
    buyerState: row.buyer_state || '',
    buyerComplement: row.buyer_complement || '',
    items: Array.isArray(row.items) ? row.items : [],
    shippingMethod: row.shipping_method || 'PAC',
    shippingCost: Number(row.shipping_cost || 0),
    subtotal: Number(row.subtotal || 0),
    discount: Number(row.discount || 0),
    total: Number(row.total || 0),
    paymentMethod: row.payment_method || 'pix',
    mercadopagoPreferenceId: row.mercadopago_preference_id || '',
    mercadopagoPaymentLink: row.mercadopago_payment_link || '',
    pixCopiaECola: row.pix_copia_e_cola || '',
    status: row.status || 'pending_payment',
    trackingCode: row.tracking_code || '',
    payoutReleasedToPartners: Boolean(row.payout_released_to_partners),
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapProposalToRow(p: DiscountProposal) {
  return {
    id: p.id,
    buyer_name: p.buyerName,
    buyer_email: p.buyerEmail,
    buyer_phone: p.buyerPhone || '',
    item_ids: p.itemIds,
    items_summary: p.itemsSummary,
    original_total: Number(p.originalTotal || 0),
    proposed_total: Number(p.proposedTotal || 0),
    seller_approvals: p.sellerApprovals,
    status: p.status,
    buyer_message: p.buyerMessage || '',
    created_at: p.createdAt || new Date().toISOString(),
  };
}

function mapRowToProposal(row: any): DiscountProposal {
  return {
    id: row.id,
    buyerName: row.buyer_name,
    buyerEmail: row.buyer_email,
    buyerPhone: row.buyer_phone || '',
    itemIds: Array.isArray(row.item_ids) ? row.item_ids : [],
    itemsSummary: Array.isArray(row.items_summary) ? row.items_summary : [],
    originalTotal: Number(row.original_total || 0),
    proposedTotal: Number(row.proposed_total || 0),
    sellerApprovals: row.seller_approvals || {},
    status: row.status || 'pending',
    buyerMessage: row.buyer_message || '',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

// ---------- STORAGE IMAGE UPLOAD (Optional if bucket exists) ----------

async function uploadDataUrlIfPossible(sb: SupabaseClient, dataUrl: string, pathKey: string): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return dataUrl;
  try {
    const match = dataUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/i);
    if (!match) return dataUrl;

    const mimeType = match[1];
    const base64Body = match[2];
    const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';

    const byteCharacters = atob(base64Body);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([new Uint8Array(byteNumbers)], { type: mimeType });

    const filePath = `${pathKey}.${ext}`;
    const { error } = await sb.storage.from('comic-covers').upload(filePath, blob, {
      contentType: mimeType,
      upsert: true,
    });

    if (error) {
      // Bucket may not exist or lack public policy; silently keep compressed base64 in JSONB
      return dataUrl;
    }

    const { data: publicUrlData } = sb.storage.from('comic-covers').getPublicUrl(filePath);
    return publicUrlData?.publicUrl || dataUrl;
  } catch {
    return dataUrl;
  }
}

// ---------- CRUD OPERATIONS WITH RESILIENT SCHEMA FALLBACK ----------

export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  tablesReady: boolean;
  message: string;
}> {
  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey) {
    return {
      connected: false,
      tablesReady: false,
      message: 'Informe a Project URL (ex: https://xxx.supabase.co) e a Publishable / Anon Public Key do Supabase.',
    };
  }

  if (isSecretSupabaseKey(anonKey)) {
    return {
      connected: false,
      tablesReady: false,
      message: 'Você inseriu uma Secret Key (sb_secret_... ou service_role), que é bloqueada no navegador por segurança. No Supabase, vá em Settings → API Keys e copie a chave pública (Publishable key "sb_publishable_..." ou anon public "eyJ...").',
    };
  }

  const sb = getSupabase();
  if (!sb) {
    return {
      connected: false,
      tablesReady: false,
      message: 'Não foi possível inicializar a conexão com o Supabase. Verifique a URL.',
    };
  }

  try {
    const [hqRes, sellerRes, orderRes] = await Promise.all([
      sb.from('hqs').select('id').limit(1),
      sb.from('sellers').select('id').limit(1),
      sb.from('orders').select('id').limit(1),
    ]);

    const firstError = hqRes.error || sellerRes.error || orderRes.error;
    if (firstError) {
      const msg = firstError.message || '';
      if (msg.includes('Forbidden use of secret API key')) {
        return {
          connected: false,
          tablesReady: false,
          message: 'Você inseriu a Secret Key do Supabase. Substitua pela Publishable Key (sb_publishable_...) ou Anon Public Key (eyJ...) em Settings → API Keys no Supabase.',
        };
      }
      if (msg.includes('does not exist') || msg.includes('schema cache') || firstError.code === '42P01' || firstError.code === 'PGRST205') {
        return {
          connected: true,
          tablesReady: false,
          message: 'Conectado ao Supabase, mas as tabelas ainda não foram criadas! Copie o código SQL abaixo e execute no SQL Editor do seu painel Supabase.',
        };
      }
      if (msg.includes('JWT') || msg.includes('Invalid API key') || firstError.code === '401') {
        return {
          connected: false,
          tablesReady: false,
          message: `Chave pública ou URL do Supabase inválida: ${msg}`,
        };
      }
      return {
        connected: false,
        tablesReady: false,
        message: `Erro no Supabase: ${msg}`,
      };
    }

    return {
      connected: true,
      tablesReady: true,
      message: 'Supabase conectado e tabelas verificadas! Todas as alterações serão salvas na nuvem.',
    };
  } catch (err: any) {
    return {
      connected: false,
      tablesReady: false,
      message: `Falha de rede ao conectar no Supabase: ${err?.message || 'Verifique a URL'}`,
    };
  }
}

export async function fetchAllFromSupabase(): Promise<{
  ok: boolean;
  sellers?: Seller[];
  hqs?: HQItem[];
  orders?: Order[];
  proposals?: DiscountProposal[];
  error?: string;
}> {
  const sb = getSupabase();
  if (!sb) return { ok: false };

  try {
    const [sellersRes, hqsRes, ordersRes, proposalsRes] = await Promise.all([
      sb.from('sellers').select('*'),
      sb.from('hqs').select('*').order('created_at', { ascending: false }),
      sb.from('orders').select('*').order('created_at', { ascending: false }),
      sb.from('discount_proposals').select('*').order('created_at', { ascending: false }),
    ]);

    if (sellersRes.error || hqsRes.error) {
      return {
        ok: false,
        error: sellersRes.error?.message || hqsRes.error?.message,
      };
    }

    return {
      ok: true,
      sellers: (sellersRes.data || []).map(mapRowToSeller),
      hqs: (hqsRes.data || []).map(mapRowToHQ),
      orders: (ordersRes.data || []).map(mapRowToOrder),
      proposals: (proposalsRes.data || []).map(mapRowToProposal),
    };
  } catch (err: any) {
    return { ok: false, error: err?.message };
  }
}

export async function upsertSellerToSupabase(seller: Seller): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false };

  const { error } = await sb.from('sellers').upsert(mapSellerToRow(seller, true), { onConflict: 'id' });
  if (error) {
    // Retry with core columns if extended columns weren't added yet
    const retry = await sb.from('sellers').upsert(mapSellerToRow(seller, false), { onConflict: 'id' });
    if (retry.error) return { ok: false, error: retry.error.message };
  }
  return { ok: true };
}

export async function deleteSellerFromSupabase(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from('sellers').delete().eq('id', id);
}

export async function upsertHQToSupabase(hq: HQItem): Promise<{ ok: boolean; hq: HQItem; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, hq };

  // Try uploading images to Supabase Storage bucket 'comic-covers' if available
  const uploadedImages = await Promise.all(
    (hq.images || []).map((img, idx) => uploadDataUrlIfPossible(sb, img, `${hq.id}-${idx}`))
  );
  const hqWithUrls: HQItem = { ...hq, images: uploadedImages };

  const { error } = await sb.from('hqs').upsert(mapHQToRow(hqWithUrls, true), { onConflict: 'id' });
  if (error) {
    const retry = await sb.from('hqs').upsert(mapHQToRow(hqWithUrls, false), { onConflict: 'id' });
    if (retry.error) return { ok: false, hq: hqWithUrls, error: retry.error.message };
  }
  return { ok: true, hq: hqWithUrls };
}

export async function deleteHQFromSupabase(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from('hqs').delete().eq('id', id);
}

export async function upsertOrderToSupabase(order: Order): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false };

  const { error } = await sb.from('orders').upsert(mapOrderToRow(order, true), { onConflict: 'id' });
  if (error) {
    const retry = await sb.from('orders').upsert(mapOrderToRow(order, false), { onConflict: 'id' });
    if (retry.error) return { ok: false, error: retry.error.message };
  }
  return { ok: true };
}

export async function upsertProposalToSupabase(proposal: DiscountProposal): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false };

  const { error } = await sb.from('discount_proposals').upsert(mapProposalToRow(proposal), { onConflict: 'id' });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export const SUPABASE_SQL_SCHEMA = `-- HQ MASTER - SCHEMA OFICIAL PARA SUPABASE POSTGRESQL
-- Copie e cole este código no menu "SQL Editor" do seu painel Supabase e clique em RUN.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Vendedores, Proprietário e Colaboradores
CREATE TABLE IF NOT EXISTS public.sellers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    store_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'partner' CHECK (role IN ('master', 'partner')),
    password TEXT NOT NULL,
    phone TEXT,
    cpf_cnpj TEXT,
    cep TEXT,
    address TEXT,
    street TEXT,
    number TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    complement TEXT,
    pix_key_type TEXT DEFAULT 'email',
    pix_key TEXT,
    bank_name TEXT,
    account_holder TEXT,
    total_sales INT DEFAULT 0,
    total_earnings NUMERIC(10,2) DEFAULT 0.00,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela Principal de HQs e Lotes
CREATE TABLE IF NOT EXISTS public.hqs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    publisher TEXT NOT NULL,
    series TEXT NOT NULL,
    franchise_category TEXT NOT NULL,
    issue_number TEXT,
    year INT NOT NULL,
    condition TEXT NOT NULL CHECK (condition IN ('otimo', 'bom', 'ruim', 'leitura')),
    condition_details TEXT,
    has_all_pages BOOLEAN DEFAULT true,
    cleaning_note TEXT DEFAULT 'Higienizada e inspecionada',
    price NUMERIC(10,2) NOT NULL,
    unit_price NUMERIC(10,2),
    bundle_price NUMERIC(10,2),
    allows_unit_purchase BOOLEAN DEFAULT false,
    is_rare_special_1real BOOLEAN DEFAULT false,
    is_collection BOOLEAN DEFAULT false,
    collection_count INT DEFAULT 1,
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    seller_id TEXT REFERENCES public.sellers(id) ON DELETE SET NULL,
    seller_name TEXT NOT NULL,
    seller_address TEXT,
    seller_cep TEXT,
    featured BOOLEAN DEFAULT false,
    sold BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Propostas de Desconto
CREATE TABLE IF NOT EXISTS public.discount_proposals (
    id TEXT PRIMARY KEY,
    buyer_name TEXT NOT NULL,
    buyer_email TEXT NOT NULL,
    buyer_phone TEXT,
    item_ids JSONB NOT NULL,
    items_summary JSONB NOT NULL,
    original_total NUMERIC(10,2) NOT NULL,
    proposed_total NUMERIC(10,2) NOT NULL,
    seller_approvals JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    buyer_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Pedidos e Vendas
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    buyer_name TEXT NOT NULL,
    buyer_email TEXT NOT NULL,
    buyer_phone TEXT,
    buyer_cpf TEXT,
    buyer_cep TEXT NOT NULL,
    buyer_address TEXT NOT NULL,
    buyer_street TEXT,
    buyer_number TEXT,
    buyer_neighborhood TEXT,
    buyer_city TEXT,
    buyer_state TEXT,
    buyer_complement TEXT,
    items JSONB NOT NULL,
    shipping_method TEXT NOT NULL,
    shipping_cost NUMERIC(10,2) DEFAULT 0.00,
    subtotal NUMERIC(10,2) NOT NULL,
    discount NUMERIC(10,2) DEFAULT 0.00,
    total NUMERIC(10,2) NOT NULL,
    payment_method TEXT NOT NULL,
    mercadopago_preference_id TEXT,
    mercadopago_payment_link TEXT,
    pix_copia_e_cola TEXT,
    status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'paid', 'shipping', 'delivered')),
    tracking_code TEXT,
    payout_released_to_partners BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Garantir colunas novas caso as tabelas já tenham sido criadas anteriormente
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS number TEXT;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS complement TEXT;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS pix_key_type TEXT DEFAULT 'email';
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS pix_key TEXT;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS account_holder TEXT;

ALTER TABLE public.hqs ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2);
ALTER TABLE public.hqs ADD COLUMN IF NOT EXISTS bundle_price NUMERIC(10,2);
ALTER TABLE public.hqs ADD COLUMN IF NOT EXISTS allows_unit_purchase BOOLEAN DEFAULT false;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_cpf TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_street TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_neighborhood TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_city TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_state TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_complement TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS mercadopago_payment_link TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pix_copia_e_cola TEXT;

-- 6. Configurar Políticas RLS (Row Level Security)
ALTER TABLE public.hqs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura pública de HQs" ON public.hqs;
DROP POLICY IF EXISTS "Inserção autenticada de HQs" ON public.hqs;
CREATE POLICY "Leitura pública de HQs" ON public.hqs FOR SELECT USING (true);
CREATE POLICY "Inserção autenticada de HQs" ON public.hqs FOR ALL USING (true);

ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura de vendedores" ON public.sellers;
DROP POLICY IF EXISTS "Modificação de vendedores" ON public.sellers;
CREATE POLICY "Leitura de vendedores" ON public.sellers FOR SELECT USING (true);
CREATE POLICY "Modificação de vendedores" ON public.sellers FOR ALL USING (true);

ALTER TABLE public.discount_proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Propostas de desconto livres" ON public.discount_proposals;
CREATE POLICY "Propostas de desconto livres" ON public.discount_proposals FOR ALL USING (true);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso a pedidos" ON public.orders;
CREATE POLICY "Acesso a pedidos" ON public.orders FOR ALL USING (true);
`;
