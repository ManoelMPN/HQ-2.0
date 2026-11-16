import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBRL,
  formatIssueLabel,
  getConditionInfo,
  normalizeFranchiseName,
  groupHQsByFranchise,
  filterHQs,
  calculateCartTotals,
  evaluateProposalStatus,
  calculateAutoDiscountLimit,
  evaluateOfferAgainstPolicy,
  calculateAccurateFreight,
  parseIssueNumbersFromRange,
  buildCollectionGroupKey,
  reconcileCollectionLots,
  MIN_ORDER_VALUE,
} from './comicLogic.ts';
import { HQItem, CartItem, FilterState } from '../types.ts';

const mockHQs: HQItem[] = [
  {
    id: 'hq-1',
    title: 'O Espetacular Homem-Aranha #120',
    description: 'Batalha clássica contra o Duende Verde',
    publisher: 'Editora Abril',
    series: 'O Espetacular Homem-Aranha',
    franchiseCategory: 'Homem-Aranha',
    issueNumber: '120',
    year: 1989,
    condition: 'bom',
    hasAllPages: true,
    cleaningNote: 'Limpa exclusivamente com pano seco e macio',
    price: 35.0,
    isCollection: false,
    images: ['cover1.jpg'],
    sellerId: 'master',
    sellerName: 'Banca do Mestre',
    featured: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'hq-2',
    title: 'Superman: A Morte do Superman #01',
    description: 'Edição histórica do confronto com Apocalypse',
    publisher: 'Editora Abril',
    series: 'Superman',
    franchiseCategory: 'Superman',
    issueNumber: '01',
    year: 1993,
    condition: 'otimo',
    hasAllPages: true,
    cleaningNote: 'Limpa exclusivamente com pano seco e macio',
    price: 75.0,
    isCollection: false,
    images: ['cover2.jpg'],
    sellerId: 'partner-1',
    sellerName: 'Sebo Vintage HQ',
    featured: true,
    createdAt: '2026-01-02T00:00:00Z',
  },
  {
    id: 'hq-3',
    title: 'Homem-Aranha: A Saga do Clone Lote 15 Edições',
    description: 'Coleção completa da saga clássica dos anos 90',
    publisher: 'Panini',
    series: 'Homem-Aranha',
    franchiseCategory: 'Homem-Aranha',
    issueNumber: 'Lote 1-15',
    year: 1995,
    condition: 'ruim',
    hasAllPages: true,
    cleaningNote: 'Limpa exclusivamente com pano seco e macio',
    price: 120.0,
    isCollection: true,
    collectionCount: 15,
    images: ['lot1.jpg'],
    sellerId: 'master',
    sellerName: 'Banca do Mestre',
    featured: false,
    createdAt: '2026-01-03T00:00:00Z',
  },
  {
    id: 'hq-4',
    title: 'O Justiceiro #04 - Apenas para Ler',
    description: 'Capa com marcas e grampo gasto, 100% legível',
    publisher: 'Editora Abril',
    series: 'O Justiceiro',
    franchiseCategory: 'Justiceiro',
    issueNumber: '04',
    year: 1991,
    condition: 'leitura',
    hasAllPages: true,
    cleaningNote: 'Limpa exclusivamente com pano seco e macio',
    price: 1.0,
    isRareSpecial1Real: true,
    isCollection: false,
    images: ['cover4.jpg'],
    sellerId: 'partner-1',
    sellerName: 'Sebo Vintage HQ',
    featured: false,
    createdAt: '2026-01-04T00:00:00Z',
  },
];

test('formatBRL formats Brazilian Real correctly', () => {
  const result = formatBRL(35.5);
  assert.ok(result.includes('35,50'));
  assert.ok(result.includes('R$'));
});

test('getConditionInfo returns valid grades and assurances', () => {
  const otimo = getConditionInfo('otimo');
  assert.equal(otimo.label, 'Ótimo Estado');
  assert.ok(otimo.fullDesc.includes('Todas as páginas intactas'));

  const leitura = getConditionInfo('leitura');
  assert.equal(leitura.label, 'Apenas para Leitura');
  assert.ok(leitura.fullDesc.includes('100% das páginas'));
});

test('formatIssueLabel normalizes cover issue and edition numbers without double hashes', () => {
  assert.equal(formatIssueLabel('##01'), '#01');
  assert.equal(formatIssueLabel('12'), '#12');
  assert.equal(formatIssueLabel('#01 ao #29'), '#01 ao #29');
  assert.equal(formatIssueLabel('Vol. 3'), 'Vol. 3');
  assert.equal(formatIssueLabel(''), 'Única');
});

test('normalizeFranchiseName groups hero names dynamically', () => {
  const existing = ['Homem-Aranha', 'Superman', 'Batman'];
  assert.equal(normalizeFranchiseName('homem-aranha', existing), 'Homem-Aranha');
  assert.equal(normalizeFranchiseName('Spider-Man Amazing', existing), 'Homem-Aranha');
  assert.equal(normalizeFranchiseName('Punisher War Journal', existing), 'Justiceiro');
  assert.equal(normalizeFranchiseName('Novos Vingadores', existing), 'Vingadores');
  assert.equal(normalizeFranchiseName('Inédito Herói', existing), 'Inédito Herói');
});

test('groupHQsByFranchise clusters items into collections', () => {
  const groups = groupHQsByFranchise(mockHQs);
  assert.ok(groups.length >= 3);
  const spidermanGroup = groups.find((g) => g.franchise === 'Homem-Aranha');
  assert.ok(spidermanGroup);
  assert.equal(spidermanGroup.count, 2);
});

test('filterHQs filters by publisher, condition, and 1-real flag', () => {
  const defaultFilters: FilterState = {
    search: '',
    publisher: 'Editora Abril',
    franchise: 'all',
    condition: 'all',
    yearDecade: 'all',
    type: 'all',
    priceMax: null,
    onlyOneReal: false,
    sellerId: 'all',
    sortBy: 'featured',
  };

  const abrilResults = filterHQs(mockHQs, defaultFilters);
  assert.equal(abrilResults.length, 3);

  // Filter 1 real
  const oneRealResults = filterHQs(mockHQs, { ...defaultFilters, publisher: 'all', onlyOneReal: true });
  assert.equal(oneRealResults.length, 1);
  assert.equal(oneRealResults[0].id, 'hq-4');

  // Filter collection
  const collections = filterHQs(mockHQs, { ...defaultFilters, publisher: 'all', type: 'collection' });
  assert.equal(collections.length, 1);
  assert.equal(collections[0].id, 'hq-3');
});

test('calculateCartTotals calculates subtotal and enforces min order threshold', () => {
  const cart: CartItem[] = [
    { hq: mockHQs[3], quantity: 1 }, // R$ 1,00
  ];

  const underMin = calculateCartTotals(cart, 0, 15.0);
  assert.equal(underMin.subtotal, 1.0);
  assert.equal(underMin.isMinimumOrderMet, false);
  assert.equal(underMin.remainingToMinOrder, MIN_ORDER_VALUE - 1.0);

  // Add more items to meet min order
  cart.push({ hq: mockHQs[0], quantity: 1 }); // R$ 35,00
  const overMin = calculateCartTotals(cart, 5.0, 15.0);
  assert.equal(overMin.subtotal, 36.0);
  assert.equal(overMin.isMinimumOrderMet, true);
  assert.equal(overMin.remainingToMinOrder, 0);
  assert.equal(overMin.finalTotal, 36.0 - 5.0 + 15.0);
  assert.equal(overMin.distinctSellersCount, 2);
});

test('evaluateProposalStatus requires all sellers to accept', () => {
  assert.equal(
    evaluateProposalStatus({ master: 'accepted', 'partner-1': 'accepted' }),
    'approved'
  );

  assert.equal(
    evaluateProposalStatus({ master: 'accepted', 'partner-1': 'pending' }),
    'pending'
  );

  assert.equal(
    evaluateProposalStatus({ master: 'accepted', 'partner-1': 'declined' }),
    'rejected'
  );
});

test('calculateAccurateFreight calculates postal costs based on Brazilian CEP zones', () => {
  const spLocal = calculateAccurateFreight('01310-100', '01310-100', 1);
  assert.ok(spLocal);
  assert.equal(spLocal[0].code, 'PAC');
  assert.equal(spLocal[0].price, 14.90);

  const nordeste = calculateAccurateFreight('40000-000', '01310-100', 2);
  assert.ok(nordeste);
  assert.ok(nordeste[0].price > 30);
});

test('calculateAutoDiscountLimit and evaluateOfferAgainstPolicy handle store and per-item max discounts', () => {
  const sellers = [
    { id: 'master', maxDiscountPercent: 10 },
    { id: 'partner-1', maxDiscountPercent: 15 },
  ];

  // Store-wide fallback: 10% of 100 = 10 -> min auto-accepted = 90
  const cartStoreDefault: CartItem[] = [
    { hq: { ...mockHQs[0], price: 100, maxDiscountPercent: null }, quantity: 1 },
  ];
  const limit1 = calculateAutoDiscountLimit(cartStoreDefault, sellers);
  assert.equal(limit1.maxAutoDiscountAmount, 10);
  assert.equal(limit1.minAutoAcceptedTotal, 90);
  assert.equal(evaluateOfferAgainstPolicy(100, 92, limit1.maxAutoDiscountAmount), 'auto_approve');
  assert.equal(evaluateOfferAgainstPolicy(100, 85, limit1.maxAutoDiscountAmount), 'requires_seller_review');

  // Per-item override: 20% overrides store 10%
  const cartItemOverride: CartItem[] = [
    { hq: { ...mockHQs[0], price: 100, maxDiscountPercent: 20 }, quantity: 1 },
  ];
  const limit2 = calculateAutoDiscountLimit(cartItemOverride, sellers);
  assert.equal(limit2.maxAutoDiscountAmount, 20);
  assert.equal(evaluateOfferAgainstPolicy(100, 80, limit2.maxAutoDiscountAmount), 'auto_approve');
  assert.equal(evaluateOfferAgainstPolicy(100, 75, limit2.maxAutoDiscountAmount), 'requires_seller_review');

  // Zero discount limit forces seller review
  const limitZero = calculateAutoDiscountLimit(
    [{ hq: { ...mockHQs[0], price: 100, maxDiscountPercent: 0 }, quantity: 1 }],
    sellers
  );
  assert.equal(limitZero.hasAutoAcceptEnabled, false);
  assert.equal(evaluateOfferAgainstPolicy(100, 95, limitZero.maxAutoDiscountAmount), 'requires_seller_review');
});

test('filterHQs hides sold items and parseIssueNumbersFromRange expands ranges properly', () => {
  const withSold = [
    ...mockHQs,
    { ...mockHQs[0], id: 'hq-sold', sold: true },
  ];

  const defaultFilters: FilterState = {
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
  };

  const visible = filterHQs(withSold, defaultFilters);
  assert.equal(visible.length, mockHQs.length);
  assert.ok(!visible.some((h) => h.id === 'hq-sold'));

  assert.deepEqual(parseIssueNumbersFromRange('#01 ao #05', 5), ['#01', '#02', '#03', '#04', '#05']);
  assert.deepEqual(parseIssueNumbersFromRange('1-3', 3), ['#01', '#02', '#03']);
  assert.deepEqual(parseIssueNumbersFromRange('#02, #07, #12', 3), ['#02', '#07', '#12']);
  assert.deepEqual(parseIssueNumbersFromRange('', 3), ['#01', '#02', '#03']);
});

test('reconcileCollectionLots groups only same seller + character + series and updates price dynamically on additions and sales', () => {
  const baseUnit: Omit<HQItem, 'id' | 'issueNumber' | 'price' | 'sellerId' | 'series' | 'franchiseCategory'> = {
    title: 'Homem-Aranha 2099',
    description: 'Edição clássica',
    publisher: 'Editora Abril',
    year: 1994,
    condition: 'bom',
    hasAllPages: true,
    cleaningNote: 'Conferido',
    isCollection: false,
    images: ['cover-a.jpg'],
    sellerName: 'Geek Grid',
    createdAt: '2026-01-01T00:00:00Z',
  };

  const u1: HQItem = {
    ...baseUnit,
    id: 'u1',
    title: 'Homem-Aranha 2099 #01',
    franchiseCategory: 'Homem-Aranha',
    series: 'Homem-Aranha 2099',
    issueNumber: '#01',
    price: 20,
    unitPrice: 20,
    sellerId: 'master',
    images: ['c1.jpg'],
  };

  // Same seller, same character, DIFFERENT series -> must NOT group
  const diffSeries: HQItem = {
    ...baseUnit,
    id: 'u-diff-series',
    title: 'O Espetacular Homem-Aranha #10',
    franchiseCategory: 'Homem-Aranha',
    series: 'O Espetacular Homem-Aranha',
    issueNumber: '#10',
    price: 30,
    unitPrice: 30,
    sellerId: 'master',
    images: ['c-diff.jpg'],
  };

  // DIFFERENT seller, same character + same series -> must NOT group
  const diffSeller: HQItem = {
    ...baseUnit,
    id: 'u-diff-seller',
    title: 'Homem-Aranha 2099 #01',
    franchiseCategory: 'Homem-Aranha',
    series: 'Homem-Aranha 2099',
    issueNumber: '#01',
    price: 22,
    unitPrice: 22,
    sellerId: 'partner-99',
    sellerName: 'Outro Vendedor',
    images: ['c-other.jpg'],
  };

  // Day 1: 1 item per group -> 0 lots created
  const keyMaster2099 = buildCollectionGroupKey('master', 'Homem-Aranha', 'Homem-Aranha 2099');
  const day1 = reconcileCollectionLots([u1, diffSeries, diffSeller], new Set([keyMaster2099]));
  assert.equal(day1.filter((i) => i.isCollection && !i.sold).length, 0);

  // Day 2: seller adds #02 of Homem-Aranha 2099 -> auto-groups into 2-item lot of R$ 45
  const u2: HQItem = {
    ...baseUnit,
    id: 'u2',
    title: 'Homem-Aranha 2099 #02',
    franchiseCategory: 'Homem-Aranha',
    series: 'Homem-Aranha 2099',
    issueNumber: '#02',
    price: 25,
    unitPrice: 25,
    sellerId: 'master',
    images: ['c2.jpg'],
  };

  const day2 = reconcileCollectionLots([u2, ...day1], new Set([keyMaster2099]), day1);
  const lotDay2 = day2.find((i) => i.isCollection && !i.sold);
  assert.ok(lotDay2);
  assert.equal(lotDay2.collectionCount, 2);
  assert.equal(lotDay2.price, 45);
  assert.equal(lotDay2.sellerId, 'master');
  assert.equal(lotDay2.issueNumber, '#01, #02');

  // Day 3: seller scans #03 of same collection (R$ 30) -> lot price rises to R$ 75
  const u3: HQItem = {
    ...baseUnit,
    id: 'u3',
    title: 'Homem-Aranha 2099 #03',
    franchiseCategory: 'Homem-Aranha',
    series: 'Homem-Aranha 2099',
    issueNumber: '#03',
    price: 30,
    unitPrice: 30,
    sellerId: 'master',
    images: ['c3.jpg'],
  };

  const day3 = reconcileCollectionLots([u3, ...day2], new Set([keyMaster2099]), day2);
  const lotDay3 = day3.find((i) => i.isCollection && !i.sold);
  assert.ok(lotDay3);
  assert.equal(lotDay3.collectionCount, 3);
  assert.equal(lotDay3.price, 75);
  assert.equal(lotDay3.issueNumber, '#01, #02, #03');

  // Buyer buys #02 (R$ 25) -> lot updates removing #02, price becomes R$ 50
  const afterSalePreReconcile = day3.map((i) => (i.id === 'u2' ? { ...i, sold: true } : i));
  const afterSale = reconcileCollectionLots(afterSalePreReconcile, new Set([keyMaster2099]), day3);
  const lotAfterSale = afterSale.find((i) => i.isCollection && !i.sold);
  assert.ok(lotAfterSale);
  assert.equal(lotAfterSale.collectionCount, 2);
  assert.equal(lotAfterSale.price, 50);
  assert.equal(lotAfterSale.issueNumber, '#01, #03');

  // Buyer buys #01 (R$ 20) -> only 1 item (#03) remains, so dynamic lot closes
  const afterSecondSale = reconcileCollectionLots(
    afterSale.map((i) => (i.id === 'u1' ? { ...i, sold: true } : i)),
    new Set([keyMaster2099]),
    afterSale
  );
  assert.equal(afterSecondSale.filter((i) => i.isCollection && !i.sold).length, 0);
  assert.equal(afterSecondSale.find((i) => i.id === 'u3')?.sold, undefined);
});
