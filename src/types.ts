export type ConditionGrade = 'otimo' | 'bom' | 'ruim' | 'leitura';

export interface HQItem {
  id: string;
  title: string;
  description: string;
  publisher: 'Marvel' | 'DC Comics' | 'Panini' | 'Editora Abril' | 'Image Comics' | 'Dark Horse' | 'Outra';
  series: string;
  franchiseCategory: string; // e.g. "Homem-Aranha", "Batman", "Superman", "Justiceiro", etc.
  issueNumber: string;
  year: number;
  condition: ConditionGrade;
  conditionDetails?: string;
  hasAllPages: boolean; // Always true as requested
  cleaningNote: string; // "Limpa exclusivamente com pano seco e macio"
  price: number;
  unitPrice?: number;
  bundlePrice?: number;
  allowsUnitPurchase?: boolean;
  maxDiscountPercent?: number | null;
  isRareSpecial1Real?: boolean;
  isCollection: boolean; // Single issue or entire collection/lot
  collectionCount?: number;
  lotGroupId?: string;
  soldIssues?: string[];
  images: string[];
  sellerId: string;
  sellerName: string;
  sellerAddress?: string;
  sellerCep?: string;
  featured?: boolean;
  sold?: boolean;
  createdAt: string;
}

export interface Seller {
  id: string;
  name: string;
  storeName: string;
  email: string;
  role: 'master' | 'partner';
  password?: string;
  phone?: string;
  cpfCnpj?: string;
  cep: string;
  address: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  complement?: string;
  pixKeyType?: 'cpf' | 'email' | 'phone' | 'random';
  pixKey?: string;
  bankName?: string;
  accountHolder?: string;
  maxDiscountPercent?: number;
  totalSales: number;
  totalEarnings: number;
  active: boolean;
  joinedAt: string;
}

export interface CartItem {
  hq: HQItem;
  quantity: number;
  selectedIssue?: string;
  parentLotId?: string;
}

export interface DiscountProposal {
  id: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  itemIds: string[];
  itemsSummary: { id: string; title: string; price: number; sellerId: string; sellerName: string }[];
  originalTotal: number;
  proposedTotal: number;
  sellerApprovals: Record<string, 'pending' | 'accepted' | 'declined'>;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  buyerMessage?: string;
  autoApproved?: boolean;
  discountAmount?: number;
  paymentLink?: string;
  pixCopiaECola?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  buyerCpf?: string;
  buyerCep: string;
  buyerAddress: string;
  buyerStreet?: string;
  buyerNumber?: string;
  buyerNeighborhood?: string;
  buyerCity?: string;
  buyerState?: string;
  buyerComplement?: string;
  items: {
    hqId: string;
    title: string;
    price: number;
    sellerId: string;
    sellerName: string;
    image: string;
    selectedIssue?: string;
    parentLotId?: string;
  }[];
  shippingMethod: 'PAC' | 'SEDEX' | 'Retirada';
  shippingCost: number;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'mercadopago' | 'pix';
  mercadopagoPreferenceId?: string;
  mercadopagoPaymentLink?: string;
  pixQrCode?: string;
  pixCopiaECola?: string;
  status: 'pending_payment' | 'paid' | 'shipping' | 'delivered';
  trackingCode?: string;
  payoutReleasedToPartners: boolean;
  createdAt: string;
}

export interface FilterState {
  search: string;
  publisher: string;
  franchise: string;
  condition: string;
  yearDecade: string;
  type: 'all' | 'single' | 'collection';
  priceMax: number | null;
  onlyOneReal: boolean;
  sellerId: string;
  sortBy: 'featured' | 'price-asc' | 'price-desc' | 'year-desc' | 'newest';
}

export interface AICoverAnalysisResult {
  title: string;
  publisher: 'Marvel' | 'DC Comics' | 'Panini' | 'Editora Abril' | 'Image Comics' | 'Dark Horse' | 'Outra';
  series: string;
  franchiseCategory: string;
  issueNumber: string;
  yearEstimate: number;
  suggestedPrice: number;
  description: string;
  conditionGradeSuggestion: ConditionGrade;
  isNewCollectionCategory: boolean;
  keyCharacters: string[];
}
