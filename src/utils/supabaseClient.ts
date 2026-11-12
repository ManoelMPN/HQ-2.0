import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Local storage keys for custom user-configured credentials
const STORAGE_KEY_URL = 'bancahq_supabase_url';
const STORAGE_KEY_KEY = 'bancahq_supabase_anon_key';

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) || '' : '';
  const localKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) || '' : '';

  return {
    url: localUrl || envUrl,
    anonKey: localKey || envKey,
  };
}

export function saveSupabaseCredentials(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    if (url) localStorage.setItem(STORAGE_KEY_URL, url.trim());
    else localStorage.removeItem(STORAGE_KEY_URL);

    if (anonKey) localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
    else localStorage.removeItem(STORAGE_KEY_KEY);
  }
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey) {
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

export const SUPABASE_SQL_SCHEMA = `-- BANCAHQ - SCHEMA OFICIAL PARA SUPABASE POSTGRESQL
-- Copie e cole este código diretamente no menu "SQL Editor" do seu painel Supabase.

-- 1. Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Vendedores e Colaboradores
CREATE TABLE IF NOT EXISTS public.sellers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    store_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'partner' CHECK (role IN ('master', 'partner')),
    password TEXT NOT NULL,
    cep TEXT,
    address TEXT,
    total_sales INT DEFAULT 0,
    total_earnings NUMERIC(10,2) DEFAULT 0.00,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela Principal de HQs e Revistas
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
    cleaning_note TEXT DEFAULT 'Limpa exclusivamente com pano seco e macio',
    price NUMERIC(10,2) NOT NULL,
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

-- 4. Tabela de Propostas de Desconto para Pacotes
CREATE TABLE IF NOT EXISTS public.discount_proposals (
    id TEXT PRIMARY KEY,
    buyer_name TEXT NOT NULL,
    buyer_email TEXT NOT NULL,
    buyer_phone TEXT,
    item_ids JSONB NOT NULL,
    items_summary JSONB NOT NULL,
    original_total NUMERIC(10,2) NOT NULL,
    proposed_total NUMERIC(10,2) NOT NULL,
    seller_approvals JSONB NOT NULL, -- Ex: {"master": "accepted", "partner-1": "pending"}
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    buyer_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Pedidos e Vendas
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    buyer_name TEXT NOT NULL,
    buyer_email TEXT NOT NULL,
    buyer_cep TEXT NOT NULL,
    buyer_address TEXT NOT NULL,
    items JSONB NOT NULL,
    shipping_method TEXT NOT NULL,
    shipping_cost NUMERIC(10,2) DEFAULT 0.00,
    subtotal NUMERIC(10,2) NOT NULL,
    discount NUMERIC(10,2) DEFAULT 0.00,
    total NUMERIC(10,2) NOT NULL,
    payment_method TEXT NOT NULL,
    mercadopago_preference_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'paid', 'shipping', 'delivered')),
    tracking_code TEXT,
    payout_released_to_partners BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Configurar Políticas RLS (Row Level Security) para Leitura Pública da Loja
ALTER TABLE public.hqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública de HQs" ON public.hqs FOR SELECT USING (true);
CREATE POLICY "Inserção autenticada de HQs" ON public.hqs FOR ALL USING (true);

ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura de vendedores" ON public.sellers FOR SELECT USING (true);
CREATE POLICY "Modificação de vendedores" ON public.sellers FOR ALL USING (true);

ALTER TABLE public.discount_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Propostas de desconto livres" ON public.discount_proposals FOR ALL USING (true);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso a pedidos" ON public.orders FOR ALL USING (true);

-- Criar Storage Bucket no Supabase:
-- Crie um bucket público chamado 'comic-covers' em Storage > New Bucket (Public).
`;
