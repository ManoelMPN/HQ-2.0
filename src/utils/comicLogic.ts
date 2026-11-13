import { ConditionGrade, FilterState, HQItem, CartItem } from '../types.ts';

export const MIN_ORDER_VALUE = 30.0; // R$ 30,00 pedido mínimo para checkout

export function formatBRL(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}

export function getConditionInfo(condition: ConditionGrade) {
  switch (condition) {
    case 'otimo':
      return {
        label: 'Ótimo Estado',
        badgeClass: 'bg-emerald-950 text-emerald-300 border-emerald-700/60',
        shortDesc: 'Grampos originais e firmes, sem dobraduras, marcas mínimas de manuseio.',
        fullDesc: 'Revista muito bem conservada para colecionadores exigentes. Grampos limpos e firmes, miolo firme, sem rasgos ou rabiscos. Todas as páginas intactas.',
      };
    case 'bom':
      return {
        label: 'Bom Estado',
        badgeClass: 'bg-blue-950 text-blue-300 border-blue-700/60',
        shortDesc: 'Sem grampos oxidados, mas com pequenas marcas de leitura na capa.',
        fullDesc: 'Revista íntegra e sem oxidação pesada nos grampos. Apresenta marcas naturais de leitura ou leve amarelamento do papel pela idade. Todas as páginas intactas.',
      };
    case 'ruim':
      return {
        label: 'Estado Regular / Marcas do Tempo',
        badgeClass: 'bg-amber-950 text-amber-300 border-amber-700/60',
        shortDesc: 'Grampos com oxidação, dobras ou pequenas perdas superficiais na capa.',
        fullDesc: 'Exemplar com desgaste visível: grampos oxidados, dobras nas pontas ou desgaste superficial por uso ou traça. Integralmente legível, com todas as páginas intactas.',
      };
    case 'leitura':
      return {
        label: 'Apenas para Leitura (Brechó HQ)',
        badgeClass: 'bg-rose-950 text-rose-300 border-rose-700/60',
        shortDesc: 'Capa soltando/desgastada, grampo oxidado, porém completa para leitura.',
        fullDesc: 'Ideal para quem busca ler a história gastando pouco (a partir de R$ 1,00). Pode ter capa solta, marcas de fita adesiva antiga ou desgaste severo, mas GARANTIMOS 100% das páginas para leitura completa.',
      };
  }
}

export function normalizeFranchiseName(rawName: string, existingFranchises: string[]): string {
  const clean = rawName.trim();
  if (!clean) return 'Outros Clássicos';

  // Check case-insensitive match in existing franchises
  const existingMatch = existingFranchises.find(
    (f) => f.toLowerCase() === clean.toLowerCase()
  );
  if (existingMatch) return existingMatch;

  // Normalized common comic hero mappings in Brazilian market
  const lower = clean.toLowerCase();
  if (lower.includes('aranha') || lower.includes('spider-man') || lower.includes('peter parker')) {
    return 'Homem-Aranha';
  }
  if (lower.includes('batman') || lower.includes('cavaleiro das trevas') || lower.includes('gotham')) {
    return 'Batman';
  }
  if (lower.includes('superman') || lower.includes('super-homem') || lower.includes('clark kent') || lower.includes('homem de aço')) {
    return 'Superman';
  }
  if (lower.includes('justiceiro') || lower.includes('punisher')) {
    return 'Justiceiro';
  }
  if (lower.includes('x-men') || lower.includes('wolverine') || lower.includes('mutante')) {
    return 'X-Men';
  }
  if (lower.includes('vingadores') || lower.includes('avengers') || lower.includes('capitão américa') || lower.includes('homem de ferro')) {
    return 'Vingadores';
  }
  if (lower.includes('liga da justiça') || lower.includes('justice league')) {
    return 'Liga da Justiça';
  }
  if (lower.includes('mônica') || lower.includes('cebolinha') || lower.includes('cascão') || lower.includes('mauricio')) {
    return 'Turma da Mônica';
  }

  // Capitalize words nicely
  return clean
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function groupHQsByFranchise(hqs: HQItem[]) {
  const map: Record<string, { count: number; items: HQItem[]; publisher: string }> = {};

  for (const hq of hqs) {
    const key = hq.franchiseCategory || 'Diversos';
    if (!map[key]) {
      map[key] = { count: 0, items: [], publisher: hq.publisher };
    }
    map[key].count += 1;
    map[key].items.push(hq);
  }

  return Object.entries(map).map(([franchise, data]) => ({
    franchise,
    count: data.count,
    items: data.items,
    publisher: data.publisher,
  }));
}

export function filterHQs(hqs: HQItem[], filters: FilterState): HQItem[] {
  return hqs.filter((hq) => {
    // Text search (title, series, franchise, description, issue number)
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      const matchText =
        hq.title.toLowerCase().includes(q) ||
        hq.series.toLowerCase().includes(q) ||
        hq.franchiseCategory.toLowerCase().includes(q) ||
        hq.description.toLowerCase().includes(q) ||
        hq.issueNumber.toLowerCase().includes(q);
      if (!matchText) return false;
    }

    // Publisher
    if (filters.publisher && filters.publisher !== 'all' && hq.publisher !== filters.publisher) {
      return false;
    }

    // Franchise
    if (filters.franchise && filters.franchise !== 'all' && hq.franchiseCategory !== filters.franchise) {
      return false;
    }

    // Condition
    if (filters.condition && filters.condition !== 'all' && hq.condition !== filters.condition) {
      return false;
    }

    // Year Decade
    if (filters.yearDecade && filters.yearDecade !== 'all') {
      if (filters.yearDecade === '70s' && (hq.year < 1970 || hq.year > 1979)) return false;
      if (filters.yearDecade === '80s' && (hq.year < 1980 || hq.year > 1989)) return false;
      if (filters.yearDecade === '90s' && (hq.year < 1990 || hq.year > 1999)) return false;
      if (filters.yearDecade === '2000s' && (hq.year < 2000 || hq.year > 2009)) return false;
      if (filters.yearDecade === 'recent' && hq.year < 2010) return false;
    }

    // Type (Single vs Collection)
    if (filters.type === 'single' && hq.isCollection) return false;
    if (filters.type === 'collection' && !hq.isCollection) return false;

    // Price Max
    if (filters.priceMax !== null && hq.price > filters.priceMax) {
      return false;
    }

    // Only R$ 1,00 calls
    if (filters.onlyOneReal && (!hq.isRareSpecial1Real && hq.price > 1.0)) {
      return false;
    }

    // Seller
    if (filters.sellerId && filters.sellerId !== 'all' && hq.sellerId !== filters.sellerId) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    switch (filters.sortBy) {
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'year-desc':
        return b.year - a.year;
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'featured':
      default:
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });
}

export function calculateCartTotals(
  items: CartItem[],
  discount: number = 0,
  shippingCost: number = 0
) {
  const subtotal = items.reduce((acc, item) => acc + item.hq.price * item.quantity, 0);
  const totalItemsCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const isMinimumOrderMet = subtotal >= MIN_ORDER_VALUE;
  const remainingToMinOrder = Math.max(0, MIN_ORDER_VALUE - subtotal);
  const finalTotal = Math.max(0, subtotal - discount + shippingCost);

  // Group items by seller for multi-vendor logistics
  const sellerGroups: Record<string, { sellerName: string; items: CartItem[]; subtotal: number }> = {};
  for (const item of items) {
    const sId = item.hq.sellerId || 'master';
    if (!sellerGroups[sId]) {
      sellerGroups[sId] = {
        sellerName: item.hq.sellerName || 'Banca Principal',
        items: [],
        subtotal: 0,
      };
    }
    sellerGroups[sId].items.push(item);
    sellerGroups[sId].subtotal += item.hq.price * item.quantity;
  }

  const distinctSellersCount = Object.keys(sellerGroups).length;

  return {
    subtotal,
    totalItemsCount,
    isMinimumOrderMet,
    remainingToMinOrder,
    discount,
    shippingCost,
    finalTotal,
    sellerGroups,
    distinctSellersCount,
  };
}

export function evaluateProposalStatus(
  sellerApprovals: Record<string, 'pending' | 'accepted' | 'declined'>
): 'pending' | 'approved' | 'rejected' {
  const statuses = Object.values(sellerApprovals);
  if (statuses.length === 0) return 'pending';
  if (statuses.some((s) => s === 'declined')) return 'rejected';
  if (statuses.every((s) => s === 'accepted')) return 'approved';
  return 'pending';
}

export interface PostalFreightOption {
  code: string;
  name: string;
  price: number;
  days: string;
  insuranceIncluded: boolean;
}

export function calculateAccurateFreight(
  buyerCep: string,
  sellerCep: string = '01310-100',
  itemCount: number = 1
): PostalFreightOption[] | null {
  const cleanBuyer = buyerCep.replace(/\D/g, '');
  const cleanSeller = sellerCep.replace(/\D/g, '');

  if (cleanBuyer.length < 8) {
    return null;
  }

  const buyerPrefix = parseInt(cleanBuyer.substring(0, 2), 10);
  const sellerPrefix = parseInt(cleanSeller.substring(0, 2), 10);

  const isSameMetro = Math.floor(buyerPrefix / 10) === Math.floor(sellerPrefix / 10) && Math.abs(buyerPrefix - sellerPrefix) <= 4;
  const isSameState = (buyerPrefix <= 19 && sellerPrefix <= 19) || (buyerPrefix >= 20 && buyerPrefix <= 28 && sellerPrefix >= 20 && sellerPrefix <= 28);

  let basePac = 26.50;
  let baseSedex = 42.00;
  let pacDays = '6 a 9 dias úteis';
  let sedexDays = '2 a 4 dias úteis';

  if (isSameMetro) {
    basePac = 14.90;
    baseSedex = 19.90;
    pacDays = '2 a 4 dias úteis';
    sedexDays = '1 a 2 dias úteis';
  } else if (isSameState) {
    basePac = 19.80;
    baseSedex = 28.50;
    pacDays = '4 a 6 dias úteis';
    sedexDays = '2 a 3 dias úteis';
  } else if (buyerPrefix <= 39 && sellerPrefix <= 39) {
    basePac = 24.90;
    baseSedex = 38.00;
    pacDays = '5 a 8 dias úteis';
    sedexDays = '2 a 4 dias úteis';
  } else if (buyerPrefix >= 80 && buyerPrefix <= 99) {
    basePac = 28.90;
    baseSedex = 46.00;
    pacDays = '6 a 9 dias úteis';
    sedexDays = '3 a 5 dias úteis';
  } else if (buyerPrefix >= 40 && buyerPrefix <= 65) {
    basePac = 32.50;
    baseSedex = 54.00;
    pacDays = '8 a 12 dias úteis';
    sedexDays = '3 a 6 dias úteis';
  } else {
    basePac = 38.00;
    baseSedex = 68.00;
    pacDays = '10 a 16 dias úteis';
    sedexDays = '4 a 7 dias úteis';
  }

  const additionalWeightFactor = Math.max(0, (itemCount - 1) * 1.5);

  return [
    {
      code: 'PAC',
      name: 'Correios PAC (Econômico)',
      price: Number((basePac + additionalWeightFactor).toFixed(2)),
      days: pacDays,
      insuranceIncluded: true,
    },
    {
      code: 'SEDEX',
      name: 'Correios SEDEX (Expresso)',
      price: Number((baseSedex + additionalWeightFactor).toFixed(2)),
      days: sedexDays,
      insuranceIncluded: true,
    },
    {
      code: 'RETIRADA',
      name: 'Retirada com o Vendedor (Sem custo)',
      price: 0.0,
      days: 'A combinar após confirmação',
      insuranceIncluded: false,
    },
  ];
}
