import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBRL,
  getConditionInfo,
  normalizeFranchiseName,
  groupHQsByFranchise,
  filterHQs,
  calculateCartTotals,
  evaluateProposalStatus,
  calculateAccurateFreight,
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
  assert.equal(leitura.label, 'Apenas para Leitura (Brechó HQ)');
  assert.ok(leitura.fullDesc.includes('100% das páginas'));
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

