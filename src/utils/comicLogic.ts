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
        label: 'Apenas para Leitura',
        badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-800/60',
        shortDesc: 'Capa desgastada ou grampo oxidado, porém completa para leitura.',
        fullDesc: 'Ideal para quem busca ler a obra gastando menos. Pode ter desgaste visível ou marcas do tempo, mas garantimos 100% das páginas para leitura completa.',
      };
  }
}

export function formatIssueLabel(issueNumber?: string): string {
  const raw = (issueNumber || '').trim();
  if (!raw) return 'Única';

  // Collapse accidental repeated hashes like "##01" -> "#01"
  const collapsed = raw.replace(/#{2,}/g, '#');
  if (collapsed.startsWith('#')) return collapsed;

  // Preserve explicit words like "Vol. 3", "Edição Única", "Lote 1-15", "Escala 1/10"
  if (/^[a-zA-ZÀ-ÿ]/.test(collapsed)) {
    return collapsed;
  }

  return `#${collapsed}`;
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
    // Automatically hide sold items from storefront stock
    if (hq.sold) return false;

    // Text search (title, series, franchise, description, issue number)
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      const matchText =
        hq.title.toLowerCase().includes(q) ||
        hq.series.toLowerCase().includes(q) ||
        hq.franchiseCategory.toLowerCase().includes(q) ||
        hq.publisher.toLowerCase().includes(q) ||
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

    // Legacy 1-real filter flag
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
        sellerName: item.hq.sellerName || 'Geek Grid',
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

export function calculateAutoDiscountLimit(
  items: CartItem[],
  sellers: { id: string; maxDiscountPercent?: number }[]
) {
  const subtotal = Number(
    items.reduce((acc, item) => acc + item.hq.price * item.quantity, 0).toFixed(2)
  );

  let maxAutoDiscountAmount = 0;

  for (const item of items) {
    const seller = sellers.find((s) => s.id === item.hq.sellerId);
    const rawPct =
      item.hq.maxDiscountPercent !== undefined && item.hq.maxDiscountPercent !== null
        ? Number(item.hq.maxDiscountPercent)
        : Number(seller?.maxDiscountPercent ?? 0);
    const clampedPct = Math.max(0, Math.min(80, Number.isFinite(rawPct) ? rawPct : 0));
    maxAutoDiscountAmount += item.hq.price * item.quantity * (clampedPct / 100);
  }

  maxAutoDiscountAmount = Number(maxAutoDiscountAmount.toFixed(2));
  const minAutoAcceptedTotal = Number(Math.max(1, subtotal - maxAutoDiscountAmount).toFixed(2));
  const effectiveMaxDiscountPercent =
    subtotal > 0 ? Math.round((maxAutoDiscountAmount / subtotal) * 100) : 0;

  return {
    subtotal,
    maxAutoDiscountAmount,
    minAutoAcceptedTotal,
    effectiveMaxDiscountPercent,
    hasAutoAcceptEnabled: maxAutoDiscountAmount > 0,
  };
}

export function evaluateOfferAgainstPolicy(
  subtotal: number,
  proposedTotal: number,
  maxAutoDiscountAmount: number
): 'auto_approve' | 'requires_seller_review' | 'invalid' {
  if (!Number.isFinite(proposedTotal) || proposedTotal <= 0 || proposedTotal > subtotal) {
    return 'invalid';
  }
  if (maxAutoDiscountAmount <= 0) {
    return 'requires_seller_review';
  }
  const minAutoAcceptedTotal = Math.max(1, subtotal - maxAutoDiscountAmount);
  if (proposedTotal >= minAutoAcceptedTotal - 0.01) {
    return 'auto_approve';
  }
  return 'requires_seller_review';
}

export function parseIssueNumbersFromRange(issueInput: string, count: number): string[] {
  const safeCount = Math.max(1, Math.min(200, Math.round(count || 1)));
  const clean = (issueInput || '').trim();

  // Handle comma-separated explicit issues (e.g. "#01, #03, #07")
  if (clean.includes(',')) {
    const parts = clean
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => (s.startsWith('#') ? s : `#${s}`));
    if (parts.length > 0) return parts;
  }

  // Handle numeric range like "#01 ao #29", "1-15", "01 a 10"
  const rangeMatch = clean.match(/#?(\d+)\s*(?:ao|a|-|até|to)\s*#?(\d+)/i);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start && end - start <= 200) {
      const padLen = Math.max(2, rangeMatch[1].length);
      const list: string[] = [];
      for (let n = start; n <= end; n++) {
        list.push(`#${String(n).padStart(padLen, '0')}`);
      }
      return list;
    }
  }

  // Fallback: generate sequential #01 .. #N
  const startMatch = clean.match(/(\d+)/);
  const startNum = startMatch ? parseInt(startMatch[1], 10) : 1;
  const list: string[] = [];
  for (let i = 0; i < safeCount; i++) {
    list.push(`#${String(startNum + i).padStart(2, '0')}`);
  }
  return list;
}

function normalizeCollectionToken(raw: string): string {
  return (raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Only items sharing the exact same sellerId + character/theme (franchiseCategory) + series/collection
 * are allowed to be grouped together into a dynamic lot.
 */
export function buildCollectionGroupKey(
  sellerId: string,
  franchiseCategory: string,
  series: string
): string {
  const sId = (sellerId || 'master').trim().toLowerCase();
  const franchise = normalizeCollectionToken(franchiseCategory);
  const ser = normalizeCollectionToken(series);
  if (!ser) return '';
  return `${sId}::${franchise || 'geral'}::${ser}`;
}

/**
 * Reconciles dynamic collection lots across items from the SAME seller + character + series:
 * - When >= 2 unsold single units share (sellerId, franchiseCategory, series), groups/updates them into an active Lot item and raises the lot price accordingly.
 * - When 1 unit inside a lot is sold or removed, removes that unit's value, covers, and issue from the lot.
 * - When < 2 unsold units remain in a dynamic lot, marks that lot wrapper as sold so remaining single unit sells independently.
 */
export function reconcileCollectionLots(
  hqs: HQItem[],
  targetGroupKeys?: Set<string>,
  previousHqs?: HQItem[]
): HQItem[] {
  const result = hqs.map((item) => ({ ...item }));

  // Identify all candidate group keys present
  const groupKeysSet = new Set<string>();
  result.forEach((item) => {
    const key = buildCollectionGroupKey(item.sellerId, item.franchiseCategory, item.series);
    if (!key) return;
    if (!targetGroupKeys || targetGroupKeys.has(key) || (item.isCollection && item.allowsUnitPurchase && item.lotGroupId)) {
      groupKeysSet.add(key);
    }
  });

  const extraLotsToPrepend: HQItem[] = [];

  for (const key of groupKeysSet) {
    const matchingIndices: number[] = [];
    result.forEach((item, idx) => {
      if (buildCollectionGroupKey(item.sellerId, item.franchiseCategory, item.series) === key) {
        matchingIndices.push(idx);
      }
    });

    if (matchingIndices.length === 0) continue;

    const groupItems = matchingIndices.map((idx) => result[idx]);
    const activeUnits = groupItems
      .filter((item) => !item.isCollection && !item.sold)
      .sort((a, b) => formatIssueLabel(a.issueNumber).localeCompare(formatIssueLabel(b.issueNumber), undefined, { numeric: true }));

    // Closed lot_only bundles without linked unit items remain untouched
    const dynamicLots = groupItems.filter(
      (item) => item.isCollection && item.allowsUnitPurchase !== false && (Boolean(item.lotGroupId) || activeUnits.length >= 2)
    );
    const activeLot = dynamicLots.find((l) => !l.sold) || dynamicLots[0];

    // Check if there was explicit bundle discount ratio from previousHqs
    const prevSource = previousHqs || hqs;
    const prevGroupItems = prevSource.filter(
      (item) => buildCollectionGroupKey(item.sellerId, item.franchiseCategory, item.series) === key
    );
    const prevActiveUnits = prevGroupItems.filter((item) => !item.isCollection && !item.sold);
    const prevActiveLot = prevGroupItems.find(
      (item) => item.isCollection && !item.sold && item.allowsUnitPurchase !== false
    );
    const prevUnitsSum = prevActiveUnits.reduce(
      (sum, u) => sum + (Number(u.unitPrice ?? u.price) || 0),
      0
    );
    const prevLotPrice = prevActiveLot ? Number(prevActiveLot.bundlePrice ?? prevActiveLot.price) : 0;
    const discountRatio =
      prevActiveLot && prevUnitsSum > 0 && prevLotPrice > 0
        ? Math.min(1, Math.max(0.3, prevLotPrice / prevUnitsSum))
        : 1;

    if (activeUnits.length >= 2) {
      const slug = normalizeCollectionToken(key).replace(/[^a-z0-9]+/g, '-').slice(0, 40);
      const lotGroupId =
        activeLot?.lotGroupId ||
        activeUnits.find((u) => u.lotGroupId)?.lotGroupId ||
        `lot-${slug}`;

      // Attach lotGroupId to every active unit in the group
      matchingIndices.forEach((idx) => {
        if (!result[idx].isCollection && !result[idx].sold) {
          result[idx] = { ...result[idx], lotGroupId };
        }
      });

      const activeIssues = activeUnits.map((u) => formatIssueLabel(u.issueNumber));
      const sumUnits = Number(
        activeUnits.reduce((sum, u) => sum + (Number(u.unitPrice ?? u.price) || 0), 0).toFixed(2)
      );
      const newLotPrice = Number(Math.max(1, sumUnits * discountRatio).toFixed(2));
      const avgUnitPrice = Number((sumUnits / activeUnits.length).toFixed(2));

      const uniqueImages: string[] = [];
      activeUnits.forEach((u) => {
        (u.images || []).forEach((img) => {
          if (img && !uniqueImages.includes(img) && uniqueImages.length < 10) {
            uniqueImages.push(img);
          }
        });
      });

      const baseSample = activeUnits[0];
      const baseSeriesName = baseSample.series || baseSample.franchiseCategory || 'Coleção';
      const lotTitle = `${baseSeriesName} — Lote (${activeUnits.length} itens)`;
      const lotIssueLabel = activeIssues.join(', ');
      const soldIssuesInGroup = groupItems
        .filter((item) => !item.isCollection && item.sold)
        .map((u) => formatIssueLabel(u.issueNumber));

      if (activeLot) {
        const lotIdx = result.findIndex((r) => r.id === activeLot.id);
        if (lotIdx !== -1) {
          result[lotIdx] = {
            ...result[lotIdx],
            title: lotTitle,
            issueNumber: lotIssueLabel,
            price: newLotPrice,
            bundlePrice: newLotPrice,
            unitPrice: avgUnitPrice,
            collectionCount: activeUnits.length,
            allowsUnitPurchase: true,
            isCollection: true,
            lotGroupId,
            soldIssues: soldIssuesInGroup,
            sold: false,
            images: uniqueImages.length > 0 ? uniqueImages : result[lotIdx].images,
            year: Math.min(...activeUnits.map((u) => Number(u.year) || 2000)),
          };
        }
      } else {
        extraLotsToPrepend.push({
          id: `hq-lot-${slug}-${Date.now()}`,
          title: lotTitle,
          description: `Lote completo da coleção ${baseSeriesName} (${baseSample.franchiseCategory}) reunindo ${activeUnits.length} itens disponíveis de ${baseSample.sellerName}.`,
          publisher: baseSample.publisher,
          series: baseSample.series,
          franchiseCategory: baseSample.franchiseCategory,
          issueNumber: lotIssueLabel,
          year: Math.min(...activeUnits.map((u) => Number(u.year) || 2000)),
          condition: baseSample.condition,
          conditionDetails: baseSample.conditionDetails || '',
          hasAllPages: true,
          cleaningNote: baseSample.cleaningNote || 'Item inspecionado e conferido',
          price: newLotPrice,
          unitPrice: avgUnitPrice,
          bundlePrice: newLotPrice,
          allowsUnitPurchase: true,
          maxDiscountPercent: baseSample.maxDiscountPercent ?? null,
          isRareSpecial1Real: false,
          isCollection: true,
          collectionCount: activeUnits.length,
          lotGroupId,
          soldIssues: soldIssuesInGroup,
          images: uniqueImages,
          sellerId: baseSample.sellerId,
          sellerName: baseSample.sellerName,
          sellerAddress: '',
          sellerCep: '',
          featured: true,
          sold: false,
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      // Fewer than 2 unsold units remain: dissolve dynamic lot wrapper if present so standalone unit sells alone
      dynamicLots.forEach((lot) => {
        if (lot.lotGroupId) {
          const lotIdx = result.findIndex((r) => r.id === lot.id);
          if (lotIdx !== -1 && !result[lotIdx].sold) {
            result[lotIdx] = {
              ...result[lotIdx],
              collectionCount: activeUnits.length,
              sold: true,
            };
          }
        }
      });
    }
  }

  return [...extraLotsToPrepend, ...result];
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
