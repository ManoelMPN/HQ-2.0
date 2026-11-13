import { HQItem, Seller } from '../types.ts';

// Master Administrator (Store Owner: Neto - HQ Master)
export const INITIAL_SELLERS: Seller[] = [
  {
    id: 'master',
    name: 'Neto',
    storeName: 'HQ Master',
    email: 'neto.mmp@gmail.com',
    role: 'master',
    password: 'admin',
    phone: '',
    cpfCnpj: '',
    cep: '01310-100', // CEP padrão da HQ Master (ajustável no painel)
    address: 'São Paulo - SP',
    street: 'Avenida Paulista',
    number: '',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    complement: '',
    pixKeyType: 'email',
    pixKey: 'neto.mmp@gmail.com',
    bankName: '',
    accountHolder: 'Neto MMP',
    totalSales: 0,
    totalEarnings: 0,
    active: true,
    joinedAt: '2026-01-01T00:00:00Z',
  },
];

// O catálogo começa 100% limpo, sem produtos fictícios.
// O acervo é alimentado exclusivamente pelo Neto e seus parceiros cadastrados.
export const INITIAL_HQS: HQItem[] = [];
