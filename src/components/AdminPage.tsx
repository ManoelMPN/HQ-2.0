import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  Layers,
  Store,
  ShieldCheck,
  Package,
  Users,
  Database,
  Lock,
  Copy,
  Check,
  AlertCircle,
  Truck,
  Eye,
  Trash2,
  Settings,
  CreditCard,
  KeyRound,
  RefreshCw,
  Info,
  DollarSign,
  Share2,
  User,
  MapPin,
  Search,
  ExternalLink,
  Pencil,
  Percent,
  Zap,
  Sun,
  Moon,
  Globe,
  Shield,
} from 'lucide-react';
import { HQItem, Seller, ConditionGrade, DiscountProposal, Order, CheckoutProvider } from '../types.ts';
import {
  formatBRL,
  normalizeFranchiseName,
  parseIssueNumbersFromRange,
  buildCollectionGroupKey,
} from '../utils/comicLogic.ts';
import {
  SUPABASE_SQL_SCHEMA,
  getSupabaseCredentials,
  saveSupabaseCredentials,
  normalizeSupabaseUrl,
  isSecretSupabaseKey,
} from '../utils/supabaseClient.ts';
import { compressFileToBase64, compressImageBase64 } from '../utils/imageCompressor.ts';
import { GeekGridLogo } from './HQMasterLogo.tsx';

interface AdminPageProps {
  onBackToStore: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  hqs: HQItem[];
  onAddHQ: (hq: Omit<HQItem, 'id' | 'createdAt'>, autoGroupWithSeries?: boolean) => void;
  onAddHQsBatch?: (hqs: Omit<HQItem, 'id' | 'createdAt'>[]) => void;
  onUpdateHQ: (hq: HQItem) => void;
  onDeleteHQ: (id: string) => void;
  onResetToDemoHQs: () => void;
  onClearDemoHQs: () => void;
  sellers: Seller[];
  onAddSeller: (seller: Omit<Seller, 'id' | 'totalSales' | 'totalEarnings' | 'active' | 'joinedAt'>) => void;
  onApproveSeller?: (sellerId: string, password: string) => void;
  onDeleteSeller?: (id: string) => void;
  onUpdateSellerPassword?: (sellerId: string, newPass: string) => void;
  onUpdateOwnerProfile?: (updatedSeller: Seller) => void;
  onUpdateSellerMaxDiscount?: (sellerId: string, maxDiscountPercent: number) => void;
  currentSeller: Seller | null;
  onLoginSeller: (email: string, pass: string) => boolean;
  onLogoutSeller: () => void;
  proposals: DiscountProposal[];
  onUpdateProposalApproval: (
    proposalId: string,
    sellerId: string,
    decision: 'accepted' | 'declined',
    forceMasterOverride?: boolean
  ) => void;
  orders: Order[];
  onUpdateOrderTracking: (orderId: string, trackingCode: string) => void;
  onReleasePayout: (orderId: string) => void;
  supabaseStatus?: {
    connected: boolean;
    tablesReady: boolean;
    syncing: boolean;
    message: string;
  };
  onSyncSupabase?: () => Promise<{ connected: boolean; tablesReady: boolean; message: string }>;
}

const CHECKOUT_PROVIDERS: Array<{
  id: CheckoutProvider;
  label: string;
  hint: string;
}> = [
  { id: 'mercadopago', label: 'Mercado Pago', hint: 'Checkout Pro, PIX imediato, saldo e cartão.' },
  { id: 'pagseguro', label: 'PagSeguro / PagBank', hint: 'Gateway nacional tradicional com link e PIX.' },
  { id: 'asaas', label: 'Asaas Pagamentos', hint: 'Cobranças avulsas, PIX automatizado e boletos.' },
  { id: 'efipay', label: 'Efí Pay (Gerencianet)', hint: 'PIX com tarifa reduzida e API simples.' },
  { id: 'stripe', label: 'Stripe Checkout', hint: 'Link de pagamento e cartões nacionais/internacionais.' },
  { id: 'pix_direto', label: 'PIX Direto / Link Próprio', hint: 'Usa sua chave PIX e link externo próprio.' },
];

export const AdminPage: React.FC<AdminPageProps> = ({
  onBackToStore,
  theme,
  onToggleTheme,
  hqs,
  onAddHQ,
  onAddHQsBatch,
  onUpdateHQ,
  onDeleteHQ,
  sellers,
  onAddSeller,
  onApproveSeller,
  onDeleteSeller,
  onUpdateOwnerProfile,
  onUpdateSellerMaxDiscount,
  currentSeller,
  onLoginSeller,
  onLogoutSeller,
  proposals,
  onUpdateProposalApproval,
  orders,
  onReleasePayout,
  supabaseStatus,
  onSyncSupabase,
}) => {
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Active Tab
  const [activeTab, setActiveTab] = useState<'new-hq' | 'catalog' | 'owner-profile' | 'collaborators' | 'sales' | 'proposals' | 'settings'>('new-hq');

  // Camera capture modal state
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // New HQ Form State
  const [analyzingWithAI, setAnalyzingWithAI] = useState(false);
  const [aiAnalysisFeedback, setAiAnalysisFeedback] = useState<string | null>(null);
  const [aiAnalysisError, setAiAnalysisError] = useState<string | null>(null);
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPublisher, setFormPublisher] = useState<string>('Editora Abril');
  const [formSeries, setFormSeries] = useState('');
  const [formFranchise, setFormFranchise] = useState('');
  const [formIssueNumber, setFormIssueNumber] = useState('');
  const [formYear, setFormYear] = useState<number>(1990);
  const [formPrice, setFormPrice] = useState<number>(35.0);
  const [formUnitPrice, setFormUnitPrice] = useState<number>(25.0);
  const [formBundlePrice, setFormBundlePrice] = useState<number>(35.0);
  const [formAllowsUnitPurchase, setFormAllowsUnitPurchase] = useState<boolean>(false);
  const [formCondition, setFormCondition] = useState<ConditionGrade>('bom');
  const [formConditionDetails, setFormConditionDetails] = useState('');
  const [formIsCollection, setFormIsCollection] = useState(false);
  const [formCollectionCount, setFormCollectionCount] = useState<number>(1);
  const [saleMode, setSaleMode] = useState<'single' | 'lot_only' | 'lot_and_units'>('single');
  const [formIs1Real, setFormIs1Real] = useState(false);
  const [formMaxDiscountPercent, setFormMaxDiscountPercent] = useState<string>('');
  const [autoGroupSameCollection, setAutoGroupSameCollection] = useState<boolean>(true);
  const [editingHQId, setEditingHQId] = useState<string | null>(null);
  const [formSellerId, setFormSellerId] = useState(currentSeller?.id || 'master');

  // Seller Profile State (shared by BOTH Master and Partner Collaborators for their own profile)
  const [ownerName, setOwnerName] = useState(currentSeller?.name || '');
  const [ownerStoreName, setOwnerStoreName] = useState(currentSeller?.storeName || '');
  const [ownerEmail, setOwnerEmail] = useState(currentSeller?.email || '');
  const [ownerPhone, setOwnerPhone] = useState(currentSeller?.phone || '');
  const [ownerCpfCnpj, setOwnerCpfCnpj] = useState(currentSeller?.cpfCnpj || '');
  const [ownerCep, setOwnerCep] = useState(currentSeller?.cep || '');
  const [ownerStreet, setOwnerStreet] = useState(currentSeller?.street || '');
  const [ownerNumber, setOwnerNumber] = useState(currentSeller?.number || '');
  const [ownerComplement, setOwnerComplement] = useState(currentSeller?.complement || '');
  const [ownerNeighborhood, setOwnerNeighborhood] = useState(currentSeller?.neighborhood || '');
  const [ownerCity, setOwnerCity] = useState(currentSeller?.city || '');
  const [ownerState, setOwnerState] = useState(currentSeller?.state || '');
  const [ownerPixKeyType, setOwnerPixKeyType] = useState<'cpf' | 'email' | 'phone' | 'random'>(currentSeller?.pixKeyType || 'email');
  const [ownerPixKey, setOwnerPixKey] = useState(currentSeller?.pixKey || '');
  const [ownerBankName, setOwnerBankName] = useState(currentSeller?.bankName || '');
  const [ownerAccountHolder, setOwnerAccountHolder] = useState(currentSeller?.accountHolder || '');
  const [ownerMaxDiscountPercent, setOwnerMaxDiscountPercent] = useState<number>(currentSeller?.maxDiscountPercent ?? 10);
  const [ownerCheckoutProvider, setOwnerCheckoutProvider] = useState<CheckoutProvider>(currentSeller?.checkoutProvider || 'mercadopago');
  const [ownerCheckoutPublicKey, setOwnerCheckoutPublicKey] = useState(currentSeller?.checkoutPublicKey || '');
  const [ownerCheckoutApiKey, setOwnerCheckoutApiKey] = useState(currentSeller?.checkoutApiKey || '');
  const [ownerCheckoutUrl, setOwnerCheckoutUrl] = useState(currentSeller?.checkoutUrl || '');
  const [ownerGeminiApiKey, setOwnerGeminiApiKey] = useState(currentSeller?.geminiApiKey || '');
  const [ownerNewPassword, setOwnerNewPassword] = useState('');
  const [ownerSavedMsg, setOwnerSavedMsg] = useState(false);
  const [lookingUpOwnerCep, setLookingUpOwnerCep] = useState(false);

  // Secure Settings in Admin (Only Master Access)
  const currentCreds = getSupabaseCredentials();
  const [sbUrl, setSbUrl] = useState(currentCreds.url);
  const [sbKey, setSbKey] = useState(currentCreds.anonKey);
  const [copiedSql, setCopiedSql] = useState(false);
  const [sbSavedMsg, setSbSavedMsg] = useState(false);
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [sbTestResult, setSbTestResult] = useState<{ connected: boolean; tablesReady: boolean; message: string } | null>(null);

  // Stored Keys
  const [geminiKeyInput, setGeminiKeyInput] = useState(() => localStorage.getItem('hq_master_gemini_key') || '');
  const [mpTokenInput, setMpTokenInput] = useState(() => localStorage.getItem('hq_master_mp_token') || '');
  const [keysSavedMsg, setKeysSavedMsg] = useState(false);
  const [testingAiKey, setTestingAiKey] = useState(false);
  const [testAiResult, setTestAiResult] = useState<{ valid: boolean; message: string } | null>(null);

  // Collaborator Registration inside Admin (full shipping address, same as partner form + password)
  const [cName, setCName] = useState('');
  const [cStoreName, setCStoreName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPassword, setCPassword] = useState('');
  const [cCep, setCCep] = useState('');
  const [cStreet, setCStreet] = useState('');
  const [cNumber, setCNumber] = useState('');
  const [cComplement, setCComplement] = useState('');
  const [cNeighborhood, setCNeighborhood] = useState('');
  const [cCity, setCCity] = useState('');
  const [cState, setCState] = useState('');
  const [cMaxDiscount, setCMaxDiscount] = useState<number>(10);
  const [lookingUpPartnerCep, setLookingUpPartnerCep] = useState(false);
  const [partnerCepError, setPartnerCepError] = useState<string | null>(null);
  const [copiedPartnerId, setCopiedPartnerId] = useState<string | null>(null);
  const [pendingPasswords, setPendingPasswords] = useState<Record<string, string>>({});

  // Store-wide discount & proposal controls
  const [storeDiscountInput, setStoreDiscountInput] = useState<number>(currentSeller?.maxDiscountPercent ?? 10);
  const [storeDiscountSavedMsg, setStoreDiscountSavedMsg] = useState(false);
  const [copiedPropId, setCopiedPropId] = useState<string | null>(null);

  useEffect(() => {
    if (currentSeller) {
      setFormSellerId(currentSeller.id);
      setStoreDiscountInput(currentSeller.maxDiscountPercent ?? 10);
      setOwnerName(currentSeller.name || '');
      setOwnerStoreName(currentSeller.storeName || '');
      setOwnerEmail(currentSeller.email || '');
      setOwnerPhone(currentSeller.phone || '');
      setOwnerCpfCnpj(currentSeller.cpfCnpj || '');
      setOwnerCep(currentSeller.cep || '');
      setOwnerStreet(currentSeller.street || '');
      setOwnerNumber(currentSeller.number || '');
      setOwnerComplement(currentSeller.complement || '');
      setOwnerNeighborhood(currentSeller.neighborhood || '');
      setOwnerCity(currentSeller.city || '');
      setOwnerState(currentSeller.state || '');
      setOwnerPixKeyType(currentSeller.pixKeyType || 'email');
      setOwnerPixKey(currentSeller.pixKey || currentSeller.email || '');
      setOwnerBankName(currentSeller.bankName || '');
      setOwnerAccountHolder(currentSeller.accountHolder || currentSeller.name || '');
      setOwnerMaxDiscountPercent(currentSeller.maxDiscountPercent ?? 10);
      setOwnerCheckoutProvider(currentSeller.checkoutProvider || 'mercadopago');
      setOwnerCheckoutPublicKey(currentSeller.checkoutPublicKey || '');
      setOwnerCheckoutApiKey(currentSeller.checkoutApiKey || '');
      setOwnerCheckoutUrl(currentSeller.checkoutUrl || '');
      setOwnerGeminiApiKey(currentSeller.geminiApiKey || '');
      setOwnerNewPassword('');
    }
  }, [currentSeller]);

  // Handle Login
  const handleDoLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const success = onLoginSeller(loginEmail, loginPassword);
    if (!success) {
      setLoginError('E-mail ou senha incorretos. Acesso restrito a usuários autorizados.');
    }
  };

  // Start Camera
  const startCamera = async () => {
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Falha ao abrir câmera:', err);
      alert('Não foi possível inicializar a câmera neste dispositivo. Utilize a opção de upload de fotos.');
      setCameraActive(false);
    }
  };

  // Capture Photo from Camera
  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 800;
    canvas.height = videoRef.current.videoHeight || 1000;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const compressed = await compressImageBase64(rawDataUrl, 1200, 0.82);
      setFormImages((prev) => [...prev, compressed]);
    }
    const stream = videoRef.current.srcObject as MediaStream;
    stream?.getTracks().forEach((track) => track.stop());
    setCameraActive(false);
  };

  // Handle Local File Upload with Auto-compression
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        const compressed = await compressFileToBase64(file, 1200, 0.82);
        setFormImages((prev) => [...prev, compressed]);
      } catch (err) {
        console.error('Erro ao comprimir imagem:', err);
      }
    }
  };

  // AI Vision Cover Analysis
  const handleAnalyzeWithAI = async () => {
    if (formImages.length === 0) {
      alert('Tire ou selecione ao menos uma foto de capa antes de solicitar a leitura da IA.');
      return;
    }

    setAnalyzingWithAI(true);
    setAiAnalysisFeedback(null);
    setAiAnalysisError(null);

    try {
      const existingFranchises = Array.from(new Set(hqs.map((h) => h.franchiseCategory)));
      const customKey = (
        currentSeller?.geminiApiKey ||
        localStorage.getItem('hq_master_gemini_key') ||
        ''
      ).trim();

      const res = await fetch('/api/gemini/analyze-cover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(customKey ? { 'x-gemini-api-key': customKey } : {}),
        },
        body: JSON.stringify({
          imagesBase64: formImages,
          mimeType: 'image/jpeg',
          existingFranchises,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setAiAnalysisError(
          json.error || 'A IA não conseguiu ler a capa. Verifique a chave de API na aba "Configurações & Chaves".'
        );
        return;
      }

      if (json.data) {
        const d = json.data;
        setFormTitle(d.title || formTitle);
        setFormDescription(d.description || formDescription);
        if (d.publisher) {
          const pubTrimmed = String(d.publisher).trim();
          const pubLower = pubTrimmed.toLowerCase();
          if (pubLower.includes('abril')) setFormPublisher('Editora Abril');
          else if (pubLower.includes('panini')) setFormPublisher('Panini');
          else if (pubLower === 'marvel' || pubLower.includes('marvel comics')) setFormPublisher('Marvel');
          else if (pubLower === 'dc' || pubLower.includes('dc comics')) setFormPublisher('DC Comics');
          else if (pubLower.includes('image')) setFormPublisher('Image Comics');
          else if (pubLower.includes('dark horse')) setFormPublisher('Dark Horse');
          else if (pubTrimmed) setFormPublisher(pubTrimmed);
        }
        setFormSeries(d.series || formSeries);
        setFormIssueNumber(d.issueNumber || formIssueNumber);
        setFormYear(Number(d.yearEstimate) || formYear);
        setFormPrice(Number(d.suggestedPrice) || formPrice);

        if (d.unitPrice) setFormUnitPrice(Number(d.unitPrice));
        if (d.bundlePrice) setFormBundlePrice(Number(d.bundlePrice));
        if (d.collectionCount) setFormCollectionCount(Number(d.collectionCount));
        if (d.isCollection) {
          const allowsUnits = d.allowsUnitPurchase !== false;
          setFormIsCollection(true);
          setFormAllowsUnitPurchase(allowsUnits);
          setSaleMode(allowsUnits ? 'lot_and_units' : 'lot_only');
        } else {
          setFormIsCollection(false);
          setFormAllowsUnitPurchase(false);
          setSaleMode('single');
        }

        if (d.conditionGradeSuggestion) {
          setFormCondition(d.conditionGradeSuggestion as ConditionGrade);
        }

        const matchedFranchise = normalizeFranchiseName(d.franchiseCategory || 'Colecionáveis', existingFranchises);
        setFormFranchise(matchedFranchise);

        const isNew = !existingFranchises.includes(matchedFranchise);
        setAiAnalysisFeedback(
          d.isCollection
            ? `Lote identificado (${d.collectionCount} itens)! Sugerido lote a ${formatBRL(d.bundlePrice)} ou avulso a ${formatBRL(d.unitPrice)} cada.`
            : `Item reconhecido com sucesso! Categoria: "${matchedFranchise}" ${isNew ? '(Nova Categoria Criada)' : ''}.`
        );
      }
    } catch (err: any) {
      console.error('Erro na análise da IA:', err);
      setAiAnalysisError('Erro de conexão com o servidor de IA. Verifique sua conexão e a chave do Gemini.');
    } finally {
      setAnalyzingWithAI(false);
    }
  };

  // ViaCEP Lookup for Owner
  const handleLookupOwnerCep = async () => {
    const raw = ownerCep.replace(/\D/g, '');
    if (raw.length !== 8) {
      alert('O CEP deve conter 8 dígitos.');
      return;
    }
    setLookingUpOwnerCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setOwnerStreet(data.logradouro || '');
        setOwnerNeighborhood(data.bairro || '');
        setOwnerCity(data.localidade || '');
        setOwnerState(data.uf || '');
        setOwnerCep(`${raw.slice(0, 5)}-${raw.slice(5)}`);
      } else {
        alert('CEP não encontrado.');
      }
    } catch {
      alert('Falha ao consultar CEP online.');
    } finally {
      setLookingUpOwnerCep(false);
    }
  };

  // Save Logged Seller Profile Data (Personal, Address, PIX, Checkout & API Keys)
  const handleSaveOwnerProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSeller) return;

    const fullAddress = `${ownerStreet || ''}${ownerNumber ? `, nº ${ownerNumber}` : ''}${ownerComplement ? ` (${ownerComplement})` : ''}${ownerNeighborhood ? ` - ${ownerNeighborhood}` : ''}${ownerCity ? `, ${ownerCity}/${ownerState}` : ''}`.trim();

    const updatedSeller: Seller = {
      ...currentSeller,
      name: ownerName.trim(),
      storeName: ownerStoreName.trim() || ownerName.trim(),
      email: ownerEmail.trim(),
      phone: ownerPhone.trim(),
      cpfCnpj: ownerCpfCnpj.trim(),
      cep: ownerCep.trim(),
      address: fullAddress || currentSeller.address,
      street: ownerStreet.trim(),
      number: ownerNumber.trim(),
      complement: ownerComplement.trim(),
      neighborhood: ownerNeighborhood.trim(),
      city: ownerCity.trim(),
      state: ownerState.trim().toUpperCase(),
      pixKeyType: ownerPixKeyType,
      pixKey: ownerPixKey.trim(),
      bankName: ownerBankName.trim(),
      accountHolder: ownerAccountHolder.trim(),
      maxDiscountPercent: Number(ownerMaxDiscountPercent) || 0,
      checkoutProvider: ownerCheckoutProvider,
      checkoutPublicKey: ownerCheckoutPublicKey.trim(),
      checkoutApiKey: ownerCheckoutApiKey.trim(),
      checkoutUrl: ownerCheckoutUrl.trim(),
      geminiApiKey: ownerGeminiApiKey.trim(),
      password: ownerNewPassword.trim() ? ownerNewPassword.trim() : currentSeller.password,
    };

    if (onUpdateOwnerProfile) {
      onUpdateOwnerProfile(updatedSeller);
    }

    setOwnerNewPassword('');
    setOwnerSavedMsg(true);
    setTimeout(() => setOwnerSavedMsg(false), 3000);
  };

  // Test Gemini Key Live
  const handleTestGeminiKey = async () => {
    const key = geminiKeyInput.trim();
    if (!key) {
      alert('Digite a chave para testar.');
      return;
    }

    setTestingAiKey(true);
    setTestAiResult(null);

    try {
      const res = await fetch('/api/gemini/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setTestAiResult({ valid: true, message: data.message });
      } else {
        setTestAiResult({ valid: false, message: data.error || 'Chave inválida.' });
      }
    } catch (err: any) {
      setTestAiResult({ valid: false, message: 'Erro de conexão ao testar a chave.' });
    } finally {
      setTestingAiKey(false);
    }
  };

  // Save Keys
  const handleSaveKeys = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanGemini = geminiKeyInput.trim();
    const cleanMp = mpTokenInput.trim();

    localStorage.setItem('hq_master_gemini_key', cleanGemini);
    localStorage.setItem('hq_master_mp_token', cleanMp);

    setKeysSavedMsg(true);
    setTimeout(() => setKeysSavedMsg(false), 3000);
  };

  // Save & Immediately Sync Supabase Config
  const handleSaveSupabaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = normalizeSupabaseUrl(sbUrl);
    const cleanKey = sbKey.trim();
    setSbUrl(cleanUrl);
    setSbKey(cleanKey);
    saveSupabaseCredentials(cleanUrl, cleanKey);
    setSbSavedMsg(true);
    setTimeout(() => setSbSavedMsg(false), 3000);

    if (onSyncSupabase) {
      setTestingSupabase(true);
      try {
        const res = await onSyncSupabase();
        setSbTestResult(res);
      } finally {
        setTestingSupabase(false);
      }
    }
  };

  const handleTestAndSyncSupabase = async () => {
    const cleanUrl = normalizeSupabaseUrl(sbUrl);
    const cleanKey = sbKey.trim();
    setSbUrl(cleanUrl);
    setSbKey(cleanKey);
    saveSupabaseCredentials(cleanUrl, cleanKey);
    if (!onSyncSupabase) return;
    setTestingSupabase(true);
    try {
      const res = await onSyncSupabase();
      setSbTestResult(res);
    } finally {
      setTestingSupabase(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  // ViaCEP lookup for Collaborator Registration
  const handleLookupPartnerCep = async (cepToTest?: string) => {
    const raw = (cepToTest ?? cCep).replace(/\D/g, '');
    if (raw.length !== 8) {
      setPartnerCepError('O CEP deve ter 8 dígitos numéricos.');
      return;
    }

    setLookingUpPartnerCep(true);
    setPartnerCepError(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const data = await res.json();
      if (data.erro) {
        setPartnerCepError('CEP não encontrado nos Correios.');
      } else {
        setCCep(`${raw.slice(0, 5)}-${raw.slice(5)}`);
        setCStreet(data.logradouro || '');
        setCNeighborhood(data.bairro || '');
        setCCity(data.localidade || '');
        setCState((data.uf || '').toUpperCase());
      }
    } catch {
      setPartnerCepError('Falha ao consultar CEP. Preencha o endereço manualmente.');
    } finally {
      setLookingUpPartnerCep(false);
    }
  };

  // Create Partner
  const handleCreatePartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim() || !cStoreName.trim() || !cEmail.trim() || !cPassword.trim()) {
      alert('Preencha nome completo, nome da loja, e-mail e senha de acesso do parceiro.');
      return;
    }

    const composedAddress = `${cStreet.trim() || 'Brasil'}${cNumber.trim() ? `, nº ${cNumber.trim()}` : ''}${cComplement.trim() ? ` (${cComplement.trim()})` : ''}${cNeighborhood.trim() ? ` - ${cNeighborhood.trim()}` : ''}${cCity.trim() ? `, ${cCity.trim()}/${cState.trim().toUpperCase()}` : ''}`;

    onAddSeller({
      name: cName.trim(),
      storeName: cStoreName.trim(),
      email: cEmail.trim(),
      role: 'partner',
      approvalStatus: 'approved',
      password: cPassword.trim(),
      cep: cCep.trim() || '01310-100',
      address: composedAddress,
      street: cStreet.trim(),
      number: cNumber.trim(),
      complement: cComplement.trim(),
      neighborhood: cNeighborhood.trim(),
      city: cCity.trim(),
      state: cState.trim().toUpperCase(),
      maxDiscountPercent: Number(cMaxDiscount) || 0,
    });

    setCName('');
    setCStoreName('');
    setCEmail('');
    setCPassword('');
    setCCep('');
    setCStreet('');
    setCNumber('');
    setCComplement('');
    setCNeighborhood('');
    setCCity('');
    setCState('');
    setCMaxDiscount(10);
    setPartnerCepError(null);
    alert('Colaborador cadastrado com sucesso! Você já pode copiar os dados e enviar a ele.');
  };

  const copyPartnerAccess = (partner: Seller) => {
    const text = `*Bem-vindo à Geek Grid!*\n\nOlá ${partner.name}, seu acesso para a loja *${partner.storeName}* está pronto:\n\n*Acesse:* ${window.location.origin}/#admin\n*E-mail:* ${partner.email}\n*Senha:* ${partner.password}\n\nFaça login para cadastrar e gerenciar seu acervo. Boas vendas!`;
    navigator.clipboard.writeText(text);
    setCopiedPartnerId(partner.id);
    setTimeout(() => setCopiedPartnerId(null), 2500);
  };

  const resetHQForm = () => {
    setEditingHQId(null);
    setFormImages([]);
    setFormTitle('');
    setFormDescription('');
    setFormSeries('');
    setFormFranchise('');
    setFormIssueNumber('');
    setFormYear(1990);
    setFormPrice(35.0);
    setFormUnitPrice(25.0);
    setFormBundlePrice(35.0);
    setFormAllowsUnitPurchase(false);
    setFormIsCollection(false);
    setFormCollectionCount(1);
    setSaleMode('single');
    setFormIs1Real(false);
    setFormMaxDiscountPercent('');
    setAiAnalysisFeedback(null);
    setAiAnalysisError(null);
  };

  const handleStartEditHQ = (hq: HQItem) => {
    if (!currentSeller) return;
    if (currentSeller.role !== 'master' && hq.sellerId !== currentSeller.id) {
      alert('Você só tem permissão para editar os seus próprios anúncios.');
      return;
    }

    const editIsCollection = Boolean(hq.isCollection);
    const editAllowsUnits = Boolean(hq.allowsUnitPurchase);

    setEditingHQId(hq.id);
    setFormImages(hq.images || []);
    setFormTitle(hq.title);
    setFormDescription(hq.description || '');
    setFormPublisher(hq.publisher);
    setFormSeries(hq.series);
    setFormFranchise(hq.franchiseCategory || '');
    setFormIssueNumber(hq.issueNumber || '');
    setFormYear(hq.year || 1990);
    setFormPrice(hq.price || 0);
    setFormUnitPrice(hq.unitPrice ?? hq.price ?? 0);
    setFormBundlePrice(hq.bundlePrice ?? hq.price ?? 0);
    setFormAllowsUnitPurchase(editAllowsUnits);
    setFormCondition(hq.condition || 'bom');
    setFormConditionDetails(hq.conditionDetails || '');
    setFormIsCollection(editIsCollection);
    setFormCollectionCount(hq.collectionCount || 1);
    setSaleMode(editIsCollection ? (editAllowsUnits ? 'lot_and_units' : 'lot_only') : 'single');
    setFormIs1Real(Boolean(hq.isRareSpecial1Real));
    setFormMaxDiscountPercent(
      hq.maxDiscountPercent !== undefined && hq.maxDiscountPercent !== null ? String(hq.maxDiscountPercent) : ''
    );
    setFormSellerId(hq.sellerId);
    setAiAnalysisFeedback(null);
    setAiAnalysisError(null);
    setActiveTab('new-hq');
  };

  // Publish or Update HQ
  const handleSubmitNewHQ = (e: React.FormEvent) => {
    e.preventDefault();

    if (formImages.length === 0) {
      alert('Tire ou envie ao menos 1 foto real da capa.');
      return;
    }

    if (!formTitle || !formSeries) {
      alert('Preencha o título e a série/linha do item.');
      return;
    }

    const parsedMaxDiscount =
      formMaxDiscountPercent.trim() === ''
        ? null
        : Math.max(0, Math.min(80, Number(formMaxDiscountPercent)));

    if (editingHQId) {
      const existing = hqs.find((h) => h.id === editingHQId);
      if (!existing) return;
      if (currentSeller && currentSeller.role !== 'master' && existing.sellerId !== currentSeller.id) {
        alert('Você só tem permissão para editar os seus próprios anúncios.');
        return;
      }

      onUpdateHQ({
        ...existing,
        title: formTitle,
        description: formDescription || 'Item conferido, em ótimo estado de conservação conforme fotos reais.',
        publisher: formPublisher || 'Outra',
        series: formSeries,
        franchiseCategory: formFranchise || 'Colecionáveis',
        issueNumber: formIssueNumber.trim() || 'Única',
        year: formYear,
        condition: formCondition,
        conditionDetails: formConditionDetails,
        price: formIsCollection ? formBundlePrice : formPrice,
        unitPrice: formUnitPrice,
        bundlePrice: formBundlePrice,
        allowsUnitPurchase: formAllowsUnitPurchase,
        maxDiscountPercent: parsedMaxDiscount,
        isRareSpecial1Real: false,
        isCollection: formIsCollection,
        collectionCount: formIsCollection ? formCollectionCount : 1,
        images: formImages,
        sellerAddress: '',
        sellerCep: '',
      });

      resetHQForm();
      alert('Anúncio atualizado com sucesso!');
      setActiveTab('catalog');
      return;
    }

    const targetSellerId = currentSeller?.role === 'master' ? formSellerId : currentSeller?.id || 'master';
    const currentPublisher = sellers.find((s) => s.id === targetSellerId) || currentSeller;

    const basePayload = {
      description: formDescription || 'Item conferido, em ótimo estado de conservação conforme fotos reais.',
      publisher: formPublisher || 'Outra',
      series: formSeries,
      franchiseCategory: formFranchise || 'Colecionáveis',
      year: formYear,
      condition: formCondition,
      conditionDetails: formConditionDetails,
      hasAllPages: true,
      cleaningNote: 'Item inspecionado e conferido',
      maxDiscountPercent: parsedMaxDiscount,
      isRareSpecial1Real: false,
      sellerId: targetSellerId,
      sellerName: currentPublisher?.storeName || currentPublisher?.name || 'Geek Grid',
      sellerAddress: '',
      sellerCep: '',
      featured: true,
      sold: false,
    };

    if (saleMode === 'lot_and_units') {
      const targetCount = Math.max(2, Number(formCollectionCount) || 2);
      const issuesList = parseIssueNumbersFromRange(formIssueNumber, targetCount);
      const lotGroupId = `lot-${Date.now()}`;

      const lotItem: Omit<HQItem, 'id' | 'createdAt'> = {
        ...basePayload,
        title: formTitle,
        issueNumber: formIssueNumber || `${issuesList[0]} ao ${issuesList[issuesList.length - 1]}`,
        price: formBundlePrice,
        unitPrice: formUnitPrice,
        bundlePrice: formBundlePrice,
        allowsUnitPurchase: true,
        isCollection: true,
        collectionCount: issuesList.length,
        lotGroupId,
        soldIssues: [],
        images: formImages,
      };

      const unitItems: Omit<HQItem, 'id' | 'createdAt'>[] = issuesList.map((issue, idx) => ({
        ...basePayload,
        title: `${formTitle} — Avulso ${issue}`,
        issueNumber: issue,
        price: formUnitPrice,
        unitPrice: formUnitPrice,
        bundlePrice: formBundlePrice,
        allowsUnitPurchase: false,
        isCollection: false,
        collectionCount: 1,
        lotGroupId,
        images: formImages[idx] ? [formImages[idx]] : formImages,
        featured: false,
      }));

      const batch = [lotItem, ...unitItems];
      if (onAddHQsBatch) {
        onAddHQsBatch(batch);
      } else {
        batch.forEach((item) => onAddHQ(item));
      }

      resetHQForm();
      alert(`Publicado com sucesso: 1 anúncio para o Lote + ${unitItems.length} anúncios avulsos (1 por 1) vinculados ao estoque!`);
      setActiveTab('catalog');
      return;
    }

    onAddHQ(
      {
        ...basePayload,
        title: formTitle,
        issueNumber: formIssueNumber.trim() || 'Única',
        price: saleMode === 'lot_only' ? formBundlePrice : formPrice,
        unitPrice: formUnitPrice,
        bundlePrice: formBundlePrice,
        allowsUnitPurchase: false,
        isCollection: saleMode === 'lot_only',
        collectionCount: saleMode === 'lot_only' ? Math.max(2, formCollectionCount || 2) : 1,
        images: formImages,
      },
      saleMode === 'single' ? autoGroupSameCollection : false
    );

    resetHQForm();
    alert('Item publicado com sucesso no catálogo!');
    setActiveTab('catalog');
  };

  // Only external partner sellers
  const externalPartners = sellers.filter((s) => s.role !== 'master');
  const pendingPartners = externalPartners.filter(
    (s) => s.approvalStatus === 'pending' || s.active === false
  );
  const activePartners = externalPartners.filter(
    (s) => s.approvalStatus !== 'pending' && s.active !== false
  );

  return (
    <div className="min-h-screen bg-[var(--gg-bg)] text-[var(--gg-text)] flex flex-col transition-colors">
      {/* Top Bar */}
      <header className="bg-[var(--gg-surface)] border-b border-[var(--gg-border)] py-3 px-3 sm:px-6 sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onBackToStore}
              className="text-[var(--gg-text-muted)] hover:text-[var(--gg-text-strong)] flex items-center gap-1.5 text-xs font-semibold bg-[var(--gg-surface-2)] hover:bg-[var(--gg-border)] border border-[var(--gg-border)] px-3 py-1.5 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar à Loja</span>
            </button>
            <div className="hidden sm:block">
              <GeekGridLogo size="sm" />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-xs flex-wrap">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--gg-surface-2)] hover:bg-[var(--gg-border)] border border-[var(--gg-border)] text-[var(--gg-text)] font-semibold transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span className="hidden sm:inline">{theme === 'dark' ? 'Claro' : 'Escuro'}</span>
            </button>

            {currentSeller && (
              <>
                <span className="text-[var(--gg-text-muted)]">
                  Olá, <strong className="text-[var(--gg-text-strong)]">{currentSeller.name}</strong>{' '}
                  <span className="text-[var(--gg-accent-text)] font-bold">
                    ({currentSeller.role === 'master' ? 'Master' : currentSeller.storeName})
                  </span>
                </span>

                <button
                  onClick={onLogoutSeller}
                  className="text-[var(--gg-text-muted)] hover:text-[var(--gg-text-strong)] bg-[var(--gg-surface-2)] hover:bg-[var(--gg-border)] border border-[var(--gg-border)] px-2.5 py-1.5 rounded-xl font-semibold transition-colors"
                >
                  Sair
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {!currentSeller ? (
        // CLEAN & SECURE LOGIN VIEW
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-sm bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <GeekGridLogo size="lg" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[var(--gg-text-strong)] font-display">
                  Acesso Administrativo
                </h1>
                <p className="text-xs text-[var(--gg-text-muted)]">
                  Painel de gestão de acervo, precificação e checkout.
                </p>
              </div>
            </div>

            {loginError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleDoLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="seu-email@dominio.com"
                  className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--gg-text-strong)] focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold py-3 rounded-xl text-xs transition-transform active:scale-95 shadow-lg flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Entrar no Painel
              </button>
            </form>
          </div>
        </div>
      ) : (
        // AUTHENTICATED DASHBOARD
        <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-5 sm:space-y-6">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 border-b border-[var(--gg-border)] text-xs font-semibold scrollbar-none">
            <button
              onClick={() => setActiveTab('new-hq')}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'new-hq'
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow'
                  : 'text-[var(--gg-text-muted)] hover:text-[var(--gg-text-strong)] hover:bg-[var(--gg-surface-2)]'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Publicar Item (com IA)</span>
            </button>

            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'catalog'
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow'
                  : 'text-[var(--gg-text-muted)] hover:text-[var(--gg-text-strong)] hover:bg-[var(--gg-surface-2)]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Catálogo & Estoque ({currentSeller.role === 'master' ? hqs.length : hqs.filter((h) => h.sellerId === currentSeller.id).length})</span>
            </button>

            {/* PERFIL & CHECKOUT/API INDEPENDENT CONFIG (FOR BOTH MASTER AND COLLABORATORS) */}
            <button
              onClick={() => setActiveTab('owner-profile')}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'owner-profile'
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow'
                  : 'text-[var(--gg-text-muted)] hover:text-[var(--gg-text-strong)] hover:bg-[var(--gg-surface-2)]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Meu Perfil & Pagamentos</span>
            </button>

            {/* Exclusive Tab: Collaborators Management (Master Only) */}
            {currentSeller.role === 'master' && (
              <button
                onClick={() => setActiveTab('collaborators')}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                  activeTab === 'collaborators'
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow'
                    : 'text-[var(--gg-text-muted)] hover:text-[var(--gg-text-strong)] hover:bg-[var(--gg-surface-2)]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Colaboradores ({activePartners.length})</span>
                {pendingPartners.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold tabular-nums">
                    +{pendingPartners.length}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={() => setActiveTab('sales')}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'sales'
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow'
                  : 'text-[var(--gg-text-muted)] hover:text-[var(--gg-text-strong)] hover:bg-[var(--gg-surface-2)]'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Vendas & Pedidos ({orders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('proposals')}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'proposals'
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow'
                  : 'text-[var(--gg-text-muted)] hover:text-[var(--gg-text-strong)] hover:bg-[var(--gg-surface-2)]'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Propostas de Desconto ({proposals.length})</span>
            </button>

            {/* Exclusive Tab: Keys & Settings (Master Only) */}
            {currentSeller.role === 'master' && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                  activeTab === 'settings'
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow'
                    : 'text-[var(--gg-text-muted)] hover:text-[var(--gg-text-strong)] hover:bg-[var(--gg-surface-2)]'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configurações & Chaves</span>
              </button>
            )}
          </div>

          {/* TAB: MEU PERFIL & PAGAMENTOS (MASTER & COLABORADORES) */}
          {activeTab === 'owner-profile' && (
            <div className="bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-2xl sm:rounded-3xl p-4 sm:p-7 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[var(--gg-text-strong)] font-display flex items-center gap-2">
                    <User className="w-5 h-5 text-[var(--gg-accent-text)]" />
                    Meu Perfil, Endereço de Envio & Checkout ({currentSeller.storeName})
                  </h3>
                  <p className="text-xs text-[var(--gg-text-muted)]">
                    Configure seus dados da loja, endereço de postagem, chave PIX, provedor de checkout e chaves de API de forma independente.
                  </p>
                </div>
                {ownerSavedMsg && (
                  <span className="text-xs font-bold text-[var(--gg-emerald-text)] bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Perfil & pagamentos salvos!
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveOwnerProfile} className="space-y-5">
                {/* 1. Identification */}
                <div className="bg-[var(--gg-surface-inset)] p-4 rounded-2xl border border-[var(--gg-border)] space-y-3">
                  <h4 className="text-xs font-bold text-[var(--gg-accent-text)] uppercase tracking-wider">
                    1. Identificação do Responsável & Loja
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">Nome Completo *</label>
                      <input
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Seu nome completo"
                        className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">Nome da Loja (aparecerá no site) *</label>
                      <input
                        type="text"
                        value={ownerStoreName}
                        onChange={(e) => setOwnerStoreName(e.target.value)}
                        placeholder="Ex: Gibiteca Colecionador"
                        className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">E-mail de Login *</label>
                      <input
                        type="email"
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">Telefone / WhatsApp</label>
                      <input
                        type="text"
                        value={ownerPhone}
                        onChange={(e) => setOwnerPhone(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">CPF ou CNPJ (para etiquetas dos Correios)</label>
                      <input
                        type="text"
                        value={ownerCpfCnpj}
                        onChange={(e) => setOwnerCpfCnpj(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">Alterar Senha de Acesso</label>
                      <input
                        type="password"
                        value={ownerNewPassword}
                        onChange={(e) => setOwnerNewPassword(e.target.value)}
                        placeholder="Deixe em branco para manter a atual"
                        className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)]"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Postal Origin Address */}
                <div className="bg-[var(--gg-surface-inset)] p-4 rounded-2xl border border-[var(--gg-border)] space-y-3">
                  <h4 className="text-xs font-bold text-[var(--gg-accent-text)] uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    2. Endereço Completo de Origem das Postagens
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">CEP de Origem *</label>
                      <div className="flex gap-2 max-w-sm">
                        <input
                          type="text"
                          maxLength={9}
                          value={ownerCep}
                          onChange={(e) => setOwnerCep(e.target.value)}
                          placeholder="01310-100"
                          className="flex-1 bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)] font-mono"
                          required
                        />
                        <button
                          type="button"
                          onClick={handleLookupOwnerCep}
                          disabled={lookingUpOwnerCep}
                          className="bg-[var(--gg-surface-2)] hover:bg-[var(--gg-border)] text-[var(--gg-text-strong)] px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 border border-[var(--gg-border)]"
                        >
                          <Search className="w-3.5 h-3.5" />
                          {lookingUpOwnerCep ? 'Buscando...' : 'Buscar CEP'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">Logradouro / Rua</label>
                        <input
                          type="text"
                          value={ownerStreet}
                          onChange={(e) => setOwnerStreet(e.target.value)}
                          placeholder="Rua / Avenida"
                          className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">Número</label>
                        <input
                          type="text"
                          value={ownerNumber}
                          onChange={(e) => setOwnerNumber(e.target.value)}
                          placeholder="1000"
                          className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">Complemento</label>
                        <input
                          type="text"
                          value={ownerComplement}
                          onChange={(e) => setOwnerComplement(e.target.value)}
                          placeholder="Sala / Apto"
                          className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">Bairro</label>
                        <input
                          type="text"
                          value={ownerNeighborhood}
                          onChange={(e) => setOwnerNeighborhood(e.target.value)}
                          placeholder="Centro"
                          className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">Cidade</label>
                        <input
                          type="text"
                          value={ownerCity}
                          onChange={(e) => setOwnerCity(e.target.value)}
                          placeholder="São Paulo"
                          className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">UF (Estado)</label>
                        <input
                          type="text"
                          maxLength={2}
                          value={ownerState}
                          onChange={(e) => setOwnerState(e.target.value.toUpperCase())}
                          placeholder="SP"
                          className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)] uppercase font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. PIX Receiving Account & Auto Discount */}
                <div className="bg-[var(--gg-surface-inset)] p-4 rounded-2xl border border-[var(--gg-border)] space-y-3">
                  <h4 className="text-xs font-bold text-[var(--gg-emerald-text)] uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    3. Recebimento PIX & Desconto Automático
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">Tipo de Chave PIX</label>
                      <select
                        value={ownerPixKeyType}
                        onChange={(e) => setOwnerPixKeyType(e.target.value as any)}
                        className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)]"
                      >
                        <option value="email">E-mail</option>
                        <option value="cpf">CPF / CNPJ</option>
                        <option value="phone">Telefone</option>
                        <option value="random">Chave Aleatória</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">Chave PIX da Sua Loja *</label>
                      <input
                        type="text"
                        value={ownerPixKey}
                        onChange={(e) => setOwnerPixKey(e.target.value)}
                        placeholder="seu-pix@email.com ou CPF"
                        className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)] font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">Nome do Titular da Conta</label>
                      <input
                        type="text"
                        value={ownerAccountHolder}
                        onChange={(e) => setOwnerAccountHolder(e.target.value)}
                        placeholder="Nome do titular"
                        className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">Banco (Opcional)</label>
                      <input
                        type="text"
                        value={ownerBankName}
                        onChange={(e) => setOwnerBankName(e.target.value)}
                        placeholder="Ex: Nubank / Itaú / Inter"
                        className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)]"
                      />
                    </div>

                    <div className="sm:col-span-2 pt-2 border-t border-[var(--gg-border)]">
                      <label className="block text-[11px] text-[var(--gg-text)] font-semibold mb-1">
                        Desconto Máximo Automático da Sua Loja (%)
                      </label>
                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          type="number"
                          min={0}
                          max={80}
                          value={ownerMaxDiscountPercent}
                          onChange={(e) => setOwnerMaxDiscountPercent(Number(e.target.value))}
                          className="w-28 bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-accent-text)] font-bold"
                        />
                        <span className="text-[11px] text-[var(--gg-text-muted)]">
                          Propostas de compradores até esse limite são aceitas automaticamente e geram pagamento imediato.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Independent Checkout & API Keys */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Independent Checkout Card */}
                  <div className="bg-[var(--gg-surface-inset)] p-4 rounded-2xl border border-[var(--gg-border)] space-y-3">
                    <h4 className="text-xs font-bold text-[var(--gg-accent-text)] uppercase tracking-wider flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" />
                      4A. Checkout Independente (Gateway / Link)
                    </h4>
                    <p className="text-[11px] text-[var(--gg-text-muted)] leading-relaxed">
                      Escolha seu provedor de pagamento ou informe um link próprio de checkout. Funciona mesmo sem chave de API secreta.
                    </p>

                    <div>
                      <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">Provedor / Gateway Preferido</label>
                      <select
                        value={ownerCheckoutProvider}
                        onChange={(e) => setOwnerCheckoutProvider(e.target.value as CheckoutProvider)}
                        className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)]"
                      >
                        {CHECKOUT_PROVIDERS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-[var(--gg-text-subtle)] mt-1">
                        {CHECKOUT_PROVIDERS.find((p) => p.id === ownerCheckoutProvider)?.hint}
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">Public Key / Client ID do Checkout (Opcional)</label>
                      <input
                        type="text"
                        value={ownerCheckoutPublicKey}
                        onChange={(e) => setOwnerCheckoutPublicKey(e.target.value)}
                        placeholder="APP_USR-... ou pk_live_..."
                        className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)] font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">Link / URL de Checkout Externo (Opcional)</label>
                      <input
                        type="url"
                        value={ownerCheckoutUrl}
                        onChange={(e) => setOwnerCheckoutUrl(e.target.value)}
                        placeholder="https://link.mercadopago.com.br/sualoja ou PagBank/Stripe"
                        className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)] font-mono"
                      />
                    </div>
                  </div>

                  {/* Independent API Key Card */}
                  <div className="bg-[var(--gg-surface-inset)] p-4 rounded-2xl border border-[var(--gg-border)] space-y-3">
                    <h4 className="text-xs font-bold text-[var(--gg-emerald-text)] uppercase tracking-wider flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5" />
                      4B. Chaves de API Próprias (Independentes)
                    </h4>
                    <p className="text-[11px] text-[var(--gg-text-muted)] leading-relaxed">
                      Configure sua chave secreta de API para checkout transparente/dinâmico ou sua chave Gemini para ler capas por conta própria.
                    </p>

                    <div>
                      <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">
                        Chave Secreta / Access Token da API de Pagamento ({CHECKOUT_PROVIDERS.find((p) => p.id === ownerCheckoutProvider)?.label})
                      </label>
                      <input
                        type="password"
                        value={ownerCheckoutApiKey}
                        onChange={(e) => setOwnerCheckoutApiKey(e.target.value)}
                        placeholder="APP_USR-... / Token PagBank / Asaas / sk_live_..."
                        className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)] font-mono"
                      />
                      <span className="text-[10px] text-[var(--gg-text-subtle)] block mt-1">
                        Armazenada apenas no seu perfil de vendedor para receber direto na sua conta.
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">
                        Chave API Google Gemini Própria (Opcional)
                      </label>
                      <input
                        type="password"
                        value={ownerGeminiApiKey}
                        onChange={(e) => setOwnerGeminiApiKey(e.target.value)}
                        placeholder="AIzaSy... (deixe vazio para usar a chave padrão da loja)"
                        className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)] font-mono"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold px-6 py-3 rounded-xl text-xs shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Salvar Perfil, Checkout & Chaves
                </button>
              </form>
            </div>
          )}

          {/* TAB 1: NOVA PUBLICAÇÃO / EDIÇÃO */}
          {activeTab === 'new-hq' && (
            <div className="bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-2xl sm:rounded-3xl p-4 sm:p-7 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-[var(--gg-text-strong)] font-display">
                    {editingHQId ? 'Editar Anúncio Publicado' : 'Cadastrar Item, HQ ou Lote'}
                  </h3>
                  <p className="text-xs text-[var(--gg-text-muted)]">
                    {editingHQId
                      ? 'Atualize valores, descrição, limite de desconto automático ou fotos do seu anúncio.'
                      : 'Fotografe HQs, livros, mangás, action figures, estátuas, cards ou colecionáveis. A IA lê o título, marca/editora, número real, ano e sugere preço.'}
                  </p>
                </div>
                {editingHQId && (
                  <button
                    type="button"
                    onClick={() => {
                      resetHQForm();
                      setActiveTab('catalog');
                    }}
                    className="bg-[var(--gg-surface-2)] hover:bg-[var(--gg-border)] text-[var(--gg-text)] px-3 py-1.5 rounded-xl text-xs font-semibold border border-[var(--gg-border)]"
                  >
                    Cancelar Edição
                  </button>
                )}
              </div>

              {/* Photo Capture and Upload Section */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-[var(--gg-text)]">
                  Fotos das Capas / Exemplares ({formImages.length} fotos carregadas)
                </label>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow"
                  >
                    <Camera className="w-4 h-4" />
                    Abrir Câmera
                  </button>

                  <label className="bg-[var(--gg-surface-2)] hover:bg-[var(--gg-border)] text-[var(--gg-text-strong)] font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer border border-[var(--gg-border)]">
                    <Upload className="w-4 h-4 text-[var(--gg-accent-text)]" />
                    Carregar Fotos
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {formImages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormImages([])}
                      className="text-[var(--gg-text-muted)] hover:text-rose-500 text-xs px-2 py-1"
                    >
                      Limpar fotos
                    </button>
                  )}
                </div>

                {/* Camera Modal */}
                {cameraActive && (
                  <div className="bg-[var(--gg-surface-inset)] p-4 rounded-2xl border border-[var(--gg-border)] max-w-md mx-auto space-y-3">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-64 object-cover rounded-xl bg-black"
                    />
                    <div className="flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="bg-amber-500 text-zinc-950 font-bold px-5 py-2 rounded-xl text-xs"
                      >
                        Tirar Foto
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const stream = videoRef.current?.srcObject as MediaStream;
                          stream?.getTracks().forEach((track) => track.stop());
                          setCameraActive(false);
                        }}
                        className="text-[var(--gg-text-muted)] hover:text-[var(--gg-text-strong)] text-xs px-3"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Previews of Captured Photos */}
                {formImages.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto py-2">
                    {formImages.map((img, idx) => (
                      <div key={idx} className="relative group shrink-0">
                        <img
                          src={img}
                          alt={`Capa ${idx + 1}`}
                          className="w-20 h-28 object-cover rounded-lg border border-[var(--gg-border-strong)]"
                        />
                        <button
                          type="button"
                          onClick={() => setFormImages((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-1 shadow hover:bg-rose-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* AI Trigger Button */}
                {formImages.length > 0 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleAnalyzeWithAI}
                      disabled={analyzingWithAI}
                      className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-transform active:scale-95"
                    >
                      <Sparkles className="w-4 h-4" />
                      {analyzingWithAI ? 'Analisando Imagens com IA...' : 'Analisar e Preencher Automaticamente com IA'}
                    </button>
                  </div>
                )}

                {aiAnalysisFeedback && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-xs text-[var(--gg-emerald-text)] flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{aiAnalysisFeedback}</span>
                  </div>
                )}

                {aiAnalysisError && (
                  <div className="bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl text-xs text-rose-500 space-y-1.5 animate-in fade-in">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Aviso de Leitura da IA</span>
                    </div>
                    <p>{aiAnalysisError}</p>
                    <p className="text-[11px] text-[var(--gg-text-muted)] pt-1">
                      Você pode preencher os campos manualmente abaixo ou configurar a chave do Gemini no seu perfil / configurações.
                    </p>
                  </div>
                )}
              </div>

              {/* Publication Form */}
              <form onSubmit={handleSubmitNewHQ} className="space-y-4 pt-4 border-t border-[var(--gg-border)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">
                      Título do Anúncio *
                    </label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Ex: Homem-Aranha 2099 #12, O Iluminado ou Action Figure Batman"
                      className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl px-3.5 py-2 text-xs text-[var(--gg-text-strong)]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">
                      Série / Linha / Coleção *
                    </label>
                    <input
                      type="text"
                      value={formSeries}
                      onChange={(e) => setFormSeries(e.target.value)}
                      placeholder="Ex: Homem-Aranha 2099, Grandes Heróis Marvel"
                      className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl px-3.5 py-2 text-xs text-[var(--gg-text-strong)]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">
                      Personagem / Franquia / Tema
                    </label>
                    <input
                      type="text"
                      value={formFranchise}
                      onChange={(e) => setFormFranchise(e.target.value)}
                      placeholder="Ex: Homem-Aranha, Livros, Action Figures, Star Wars"
                      className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl px-3.5 py-2 text-xs text-[var(--gg-text-strong)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">
                      Editora / Fabricante
                    </label>
                    <input
                      type="text"
                      list="geekgrid-publishers"
                      value={formPublisher}
                      onChange={(e) => setFormPublisher(e.target.value)}
                      placeholder="Ex: Editora Abril, Panini, Bandai, Hasbro, Darkside"
                      className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl px-3.5 py-2 text-xs text-[var(--gg-text-strong)]"
                    />
                    <datalist id="geekgrid-publishers">
                      <option value="Editora Abril" />
                      <option value="Panini" />
                      <option value="JBC" />
                      <option value="Marvel" />
                      <option value="DC Comics" />
                      <option value="Image Comics" />
                      <option value="Dark Horse" />
                      <option value="Darkside Books" />
                      <option value="Companhia das Letras" />
                      <option value="Intrínseca" />
                      <option value="Hasbro" />
                      <option value="Bandai" />
                      <option value="Funko" />
                      <option value="Mattel" />
                      <option value="NECA" />
                      <option value="Hot Toys" />
                      <option value="Lego" />
                      <option value="Outra" />
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">
                      Nº Real da Edição / Vol. / Modelo
                    </label>
                    <input
                      type="text"
                      value={formIssueNumber}
                      onChange={(e) => setFormIssueNumber(e.target.value)}
                      placeholder="Ex: #12, Vol. 3, 1/10, Única ou 12, 14, 19"
                      className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl px-3.5 py-2 text-xs text-[var(--gg-text-strong)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">
                      Ano de Lançamento
                    </label>
                    <input
                      type="number"
                      value={formYear}
                      onChange={(e) => setFormYear(Number(e.target.value))}
                      className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl px-3.5 py-2 text-xs text-[var(--gg-text-strong)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">
                      Estado de Conservação
                    </label>
                    <select
                      value={formCondition}
                      onChange={(e) => setFormCondition(e.target.value as ConditionGrade)}
                      className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl px-3.5 py-2 text-xs text-[var(--gg-text-strong)]"
                    >
                      <option value="otimo">Ótimo (Grampos bons, sem dobras marcantes)</option>
                      <option value="bom">Bom (Sem oxidação grave, marcas leves normais de tempo)</option>
                      <option value="ruim">Ruim (Marcas de dobras ou desgastes visíveis)</option>
                      <option value="leitura">Apenas para Leitura (Desgaste severo, miolo 100% completo)</option>
                    </select>
                  </div>

                  {/* Sale Mode & Pricing Options */}
                  <div className="sm:col-span-2 bg-[var(--gg-surface-inset)] p-4 rounded-2xl border border-[var(--gg-border)] space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-[var(--gg-text-strong)] mb-2">
                        Formato de Anúncio & Venda
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSaleMode('single');
                            setFormIsCollection(false);
                            setFormAllowsUnitPurchase(false);
                          }}
                          className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                            saleMode === 'single'
                              ? 'bg-amber-500/15 border-amber-500 text-[var(--gg-text-strong)] shadow'
                              : 'bg-[var(--gg-surface)] border-[var(--gg-border)] text-[var(--gg-text-muted)] hover:text-[var(--gg-text-strong)]'
                          }`}
                        >
                          <strong className="block text-[var(--gg-accent-text)]">Unidade Avulsa</strong>
                          <span className="text-[11px] text-[var(--gg-text-muted)]">Agrupa automaticamente com itens da mesma série</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSaleMode('lot_only');
                            setFormIsCollection(true);
                            setFormAllowsUnitPurchase(false);
                            if (formCollectionCount < 2) setFormCollectionCount(Math.max(2, formImages.length || 2));
                          }}
                          className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                            saleMode === 'lot_only'
                              ? 'bg-amber-500/15 border-amber-500 text-[var(--gg-text-strong)] shadow'
                              : 'bg-[var(--gg-surface)] border-[var(--gg-border)] text-[var(--gg-text-muted)] hover:text-[var(--gg-text-strong)]'
                          }`}
                        >
                          <strong className="block text-[var(--gg-accent-text)]">Vender Apenas no Lote</strong>
                          <span className="text-[11px] text-[var(--gg-text-muted)]">Coleção fechada (sem avulso)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSaleMode('lot_and_units');
                            setFormIsCollection(true);
                            setFormAllowsUnitPurchase(true);
                            if (formCollectionCount < 2) setFormCollectionCount(Math.max(2, formImages.length || 2));
                          }}
                          className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                            saleMode === 'lot_and_units'
                              ? 'bg-emerald-500/15 border-emerald-500 text-[var(--gg-text-strong)] shadow'
                              : 'bg-[var(--gg-surface)] border-[var(--gg-border)] text-[var(--gg-text-muted)] hover:text-[var(--gg-text-strong)]'
                          }`}
                        >
                          <strong className="block text-[var(--gg-emerald-text)]">Lote + Avulsos (1 por 1)</strong>
                          <span className="text-[11px] text-[var(--gg-text-muted)]">Gera 1 anúncio do lote e 1 de cada unidade</span>
                        </button>
                      </div>
                    </div>

                    {saleMode !== 'single' ? (
                      <div className="space-y-3 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">
                              Qtd de Itens no Lote
                            </label>
                            <input
                              type="number"
                              min={2}
                              value={formCollectionCount}
                              onChange={(e) => setFormCollectionCount(Math.max(2, Number(e.target.value)))}
                              className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-1.5 text-xs text-[var(--gg-text-strong)]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">
                              Preço do Lote Fechado (R$) *
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              value={formBundlePrice}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setFormBundlePrice(val);
                                setFormPrice(val);
                              }}
                              className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-1.5 text-xs text-[var(--gg-accent-text)] font-bold"
                            />
                          </div>
                          {saleMode === 'lot_and_units' && (
                            <div>
                              <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">
                                Preço por Unidade Avulsa (R$) *
                              </label>
                              <input
                                type="number"
                                step="0.5"
                                value={formUnitPrice}
                                onChange={(e) => setFormUnitPrice(Number(e.target.value))}
                                className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-1.5 text-xs text-[var(--gg-emerald-text)] font-bold"
                              />
                            </div>
                          )}
                        </div>

                        {saleMode === 'lot_and_units' && !editingHQId && (() => {
                          const previewIssues = parseIssueNumbersFromRange(formIssueNumber, Math.max(2, formCollectionCount || 2));
                          return (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-[11px] text-[var(--gg-text)] space-y-1.5">
                              <div className="font-bold text-[var(--gg-emerald-text)]">
                                Publicação Sincronizada: 1 Lote + {previewIssues.length} Anúncios Avulsos
                              </div>
                              <p className="text-[var(--gg-text-muted)]">
                                Serão criados o Lote Completo ({formatBRL(formBundlePrice)}) e um anúncio individual por unidade ({formatBRL(formUnitPrice)} cada). Ao vender 1 unidade, o lote reorganiza valor e itens automaticamente:
                              </p>
                              <div className="flex flex-wrap gap-1 pt-1">
                                {previewIssues.map((iss) => (
                                  <span key={iss} className="bg-[var(--gg-surface)] border border-[var(--gg-border)] px-2 py-0.5 rounded text-[10px] font-mono text-[var(--gg-accent-text)]">
                                    {iss}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="space-y-3 pt-2">
                        <div className="max-w-xs">
                          <label className="block text-[11px] text-[var(--gg-text-muted)] mb-1">
                            Preço do Item (R$) *
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={formPrice}
                            onChange={(e) => setFormPrice(Number(e.target.value))}
                            className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-accent-text)] font-bold"
                            required
                          />
                        </div>

                        {/* Smart Series & Seller Auto-Grouping Control */}
                        {!editingHQId && (() => {
                          const targetSellerId = currentSeller?.role === 'master' ? formSellerId : currentSeller?.id || 'master';
                          const currentKey = buildCollectionGroupKey(
                            targetSellerId,
                            formFranchise || 'Colecionáveis',
                            formSeries
                          );
                          const existingMatches = currentKey
                            ? hqs.filter(
                                (item) =>
                                  !item.sold &&
                                  !item.isCollection &&
                                  buildCollectionGroupKey(item.sellerId, item.franchiseCategory, item.series) === currentKey
                              )
                            : [];

                          return (
                            <div className="bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-xl p-3 space-y-2">
                              <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                                <input
                                  type="checkbox"
                                  checked={autoGroupSameCollection}
                                  onChange={(e) => setAutoGroupSameCollection(e.target.checked)}
                                  className="mt-0.5 rounded border-[var(--gg-border-strong)] text-amber-500 focus:ring-amber-500"
                                />
                                <span>
                                  <strong className="block text-[var(--gg-text-strong)]">
                                    Agrupar automaticamente ao lote da mesma coleção/personagem deste vendedor
                                  </strong>
                                  <span className="text-[11px] text-[var(--gg-text-muted)]">
                                    {existingMatches.length > 0 && formSeries.trim()
                                      ? `Encontrada(s) ${existingMatches.length} edição(ões) da coleção "${formSeries}" no seu estoque! O lote será atualizado e o valor somado automaticamente.`
                                      : 'Se você escanear outro item da mesma coleção hoje ou em outro dia, ele será somado ao mesmo lote automaticamente (nunca mistura vendedores ou coleções diferentes).'}
                                  </span>
                                </span>
                              </label>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Per-unit / Per-lot Auto-Accept Max Discount */}
                    <div className="pt-3 border-t border-[var(--gg-border)] grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--gg-text)] mb-1">
                          Desconto Máximo Automático deste Item / Lote (%)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={80}
                          value={formMaxDiscountPercent}
                          onChange={(e) => setFormMaxDiscountPercent(e.target.value)}
                          placeholder={`Padrão da loja (${currentSeller?.maxDiscountPercent ?? 10}%)`}
                          className="w-full bg-[var(--gg-surface)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-1.5 text-xs text-[var(--gg-emerald-text)] font-bold"
                        />
                      </div>
                      <p className="text-[11px] text-[var(--gg-text-muted)] leading-relaxed">
                        Deixe em branco para usar o % padrão da sua loja ({currentSeller?.maxDiscountPercent ?? 10}%), ou defina um % específico (ex: 15% para lote, 0% para não dar desconto automático).
                      </p>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">
                      Descrição e Detalhes
                    </label>
                    <textarea
                      rows={3}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Detalhes da edição, autor, escala, embalagem ou histórico do item."
                      className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl p-3 text-xs text-[var(--gg-text-strong)]"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold py-3.5 rounded-xl text-xs transition-transform active:scale-95 shadow-lg flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {editingHQId ? 'Salvar Alterações do Anúncio' : 'Publicar Item no Catálogo Oficial'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: CATÁLOGO & ESTOQUE */}
          {activeTab === 'catalog' && (() => {
            const visibleCatalogHQs =
              currentSeller.role === 'master'
                ? hqs
                : hqs.filter((hq) => hq.sellerId === currentSeller.id);

            return (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-[var(--gg-text-strong)] font-display tabular-nums">
                      {currentSeller.role === 'master'
                        ? `Catálogo e Estoque Ativo (${visibleCatalogHQs.length} itens)`
                        : `Meus Anúncios (${visibleCatalogHQs.length} itens)`}
                    </h3>
                    <p className="text-xs text-[var(--gg-text-muted)]">
                      {currentSeller.role === 'master'
                        ? 'Gerencie todos os itens cadastrados na loja e pelos seus parceiros.'
                        : 'Você visualiza, edita e remove apenas os seus próprios anúncios publicados.'}
                    </p>
                  </div>
                </div>

                {visibleCatalogHQs.length === 0 ? (
                  <div className="bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-2xl p-8 sm:p-12 text-center space-y-3">
                    <Package className="w-10 h-10 text-[var(--gg-text-subtle)] mx-auto" />
                    <p className="text-xs text-[var(--gg-text-muted)]">Você ainda não possui nenhum item publicado.</p>
                    <button
                      onClick={() => {
                        resetHQForm();
                        setActiveTab('new-hq');
                      }}
                      className="bg-amber-500 text-zinc-950 font-bold px-4 py-2 rounded-xl text-xs"
                    >
                      Cadastrar Primeiro Item
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {visibleCatalogHQs.map((hq) => {
                      const canManageHQ = currentSeller.role === 'master' || hq.sellerId === currentSeller.id;
                      return (
                        <div
                          key={hq.id}
                          className={`bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-2xl p-3.5 space-y-3 flex flex-col justify-between ${hq.sold ? 'opacity-60' : ''}`}
                        >
                          <div className="space-y-2">
                            <div className="relative">
                              {hq.images[0] ? (
                                <img
                                  src={hq.images[0]}
                                  alt={hq.title}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-44 object-cover rounded-xl bg-[var(--gg-surface-inset)] border border-[var(--gg-border)]"
                                />
                              ) : (
                                <div className="w-full h-44 rounded-xl bg-[var(--gg-surface-inset)] border border-[var(--gg-border)] flex items-center justify-center text-[var(--gg-text-subtle)]">
                                  <Package className="w-8 h-8" />
                                </div>
                              )}
                              {hq.sold && (
                                <span className="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded shadow">
                                  Vendido / Sem Estoque
                                </span>
                              )}
                              {hq.isCollection && !hq.sold && (
                                <span className="absolute top-2 left-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                                  Lote ({hq.collectionCount || 2})
                                </span>
                              )}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-[var(--gg-text-strong)] truncate">{hq.title}</h4>
                              <span className="text-[11px] text-[var(--gg-text-muted)] block tabular-nums">{hq.series} · {hq.year}</span>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs font-bold text-[var(--gg-accent-text)] font-display tabular-nums">
                                  {formatBRL(hq.price)}
                                </span>
                                {hq.maxDiscountPercent !== undefined && hq.maxDiscountPercent !== null && (
                                  <span className="text-[10px] font-semibold bg-emerald-500/10 text-[var(--gg-emerald-text)] border border-emerald-500/30 px-1.5 py-0.5 rounded tabular-nums">
                                    Desc. auto {hq.maxDiscountPercent}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-[var(--gg-border)] pt-2 text-xs">
                            <span className="text-[10px] text-[var(--gg-text-subtle)] truncate max-w-[140px]">
                              {hq.sellerName}
                            </span>

                            {canManageHQ && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditHQ(hq)}
                                  className="text-[var(--gg-text-muted)] hover:text-[var(--gg-accent-text)] p-1"
                                  title="Editar anúncio"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Excluir ${hq.title}?`)) onDeleteHQ(hq.id);
                                  }}
                                  className="text-[var(--gg-text-subtle)] hover:text-rose-500 p-1"
                                  title="Excluir anúncio"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 3: GESTÃO DE COLABORADORES */}
          {activeTab === 'collaborators' && currentSeller.role === 'master' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-[var(--gg-text-strong)] font-display">
                  Gestão de Parceiros & Colaboradores Externos
                </h3>
                <p className="text-xs text-[var(--gg-text-muted)]">
                  Aprove solicitações recebidas pelo site definindo uma senha de acesso ou cadastre novos colaboradores diretamente abaixo.
                </p>
              </div>

              {/* Pending Applications from Public Storefront ("Quero Vender") */}
              {pendingPartners.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-3">
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--gg-accent-text)] flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Solicitações Pendentes de Novos Vendedores ({pendingPartners.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {pendingPartners.map((p) => (
                      <div key={p.id} className="bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-2xl p-4 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-sm text-[var(--gg-text-strong)]">{p.storeName}</strong>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-[var(--gg-accent-text)]">
                            Aguardando Senha
                          </span>
                        </div>
                        <div className="text-[var(--gg-text-muted)] space-y-0.5">
                          <div><strong>Nome Completo:</strong> {p.name}</div>
                          <div><strong>E-mail de Login:</strong> <code className="font-mono text-[var(--gg-text-strong)]">{p.email}</code></div>
                          <div><strong>Endereço de Envio:</strong> {p.address} • CEP {p.cep}</div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[var(--gg-border)]">
                          <input
                            type="text"
                            value={pendingPasswords[p.id] || ''}
                            onChange={(e) =>
                              setPendingPasswords((prev) => ({ ...prev, [p.id]: e.target.value }))
                            }
                            placeholder="Crie uma senha para aprovar..."
                            className="flex-1 bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--gg-text-strong)]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const pw = (pendingPasswords[p.id] || '').trim();
                              if (!pw) {
                                alert('Digite uma senha para aprovar este vendedor.');
                                return;
                              }
                              onApproveSeller?.(p.id, pw);
                              setPendingPasswords((prev) => {
                                const copy = { ...prev };
                                delete copy[p.id];
                                return copy;
                              });
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs whitespace-nowrap"
                          >
                            Criar Senha & Aprovar
                          </button>
                          {onDeleteSeller && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Recusar e excluir solicitação de ${p.name}?`)) onDeleteSeller(p.id);
                              }}
                              className="text-rose-500 hover:bg-rose-500/10 border border-rose-500/30 px-2.5 py-2 rounded-xl text-xs font-semibold"
                            >
                              Recusar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Form to create collaborator (same fields as public signup + Master-assigned password, no personal Master data) */}
              <div className="bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
                <h4 className="text-sm font-bold text-[var(--gg-text-strong)] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[var(--gg-accent-text)]" />
                  Cadastrar Novo Colaborador Parceiro
                </h4>

                <form onSubmit={handleCreatePartner} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      value={cName}
                      onChange={(e) => setCName(e.target.value)}
                      placeholder="Nome completo do colaborador"
                      className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl px-3.5 py-2 text-xs text-[var(--gg-text-strong)]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">Nome da Loja (que aparecerá no site) *</label>
                    <input
                      type="text"
                      value={cStoreName}
                      onChange={(e) => setCStoreName(e.target.value)}
                      placeholder="Ex: Gibiteca Vintage RJ"
                      className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl px-3.5 py-2 text-xs text-[var(--gg-text-strong)]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">E-mail de Login do Colaborador *</label>
                    <input
                      type="email"
                      value={cEmail}
                      onChange={(e) => setCEmail(e.target.value)}
                      placeholder="parceiro@email.com"
                      className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl px-3.5 py-2 text-xs text-[var(--gg-text-strong)]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">Senha de Acesso (criada por você) *</label>
                    <input
                      type="text"
                      value={cPassword}
                      onChange={(e) => setCPassword(e.target.value)}
                      placeholder="Crie a senha do colaborador"
                      className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl px-3.5 py-2 text-xs text-[var(--gg-text-strong)] font-mono"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2 pt-2 border-t border-[var(--gg-border)] space-y-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--gg-accent-text)] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      Endereço Completo de Envio das Postagens
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">CEP de Envio *</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={9}
                            value={cCep}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCCep(val);
                              setPartnerCepError(null);
                              if (val.replace(/\D/g, '').length === 8) {
                                void handleLookupPartnerCep(val);
                              }
                            }}
                            placeholder="00000-000"
                            className="flex-1 bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)] font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => handleLookupPartnerCep()}
                            disabled={lookingUpPartnerCep}
                            className="bg-[var(--gg-surface-2)] hover:bg-[var(--gg-border)] text-[var(--gg-text-strong)] px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--gg-border)] flex items-center gap-1"
                          >
                            <Search className="w-3.5 h-3.5" />
                            {lookingUpPartnerCep ? '...' : 'CEP'}
                          </button>
                        </div>
                        {partnerCepError && (
                          <p className="text-[11px] text-rose-500 mt-1">{partnerCepError}</p>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">Rua / Logradouro *</label>
                        <input
                          type="text"
                          value={cStreet}
                          onChange={(e) => setCStreet(e.target.value)}
                          placeholder="Rua, Avenida..."
                          className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)]"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">Número *</label>
                        <input
                          type="text"
                          value={cNumber}
                          onChange={(e) => setCNumber(e.target.value)}
                          placeholder="123"
                          className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">Complemento</label>
                        <input
                          type="text"
                          value={cComplement}
                          onChange={(e) => setCComplement(e.target.value)}
                          placeholder="Apto, Bloco, Sala..."
                          className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">Bairro *</label>
                        <input
                          type="text"
                          value={cNeighborhood}
                          onChange={(e) => setCNeighborhood(e.target.value)}
                          placeholder="Bairro"
                          className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)]"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">Cidade *</label>
                        <input
                          type="text"
                          value={cCity}
                          onChange={(e) => setCCity(e.target.value)}
                          placeholder="Cidade"
                          className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">Estado (UF) *</label>
                        <input
                          type="text"
                          maxLength={2}
                          value={cState}
                          onChange={(e) => setCState(e.target.value.toUpperCase())}
                          placeholder="SP"
                          className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)] uppercase font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">
                          Desc. Máx. Automático (%)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={80}
                          value={cMaxDiscount}
                          onChange={(e) => setCMaxDiscount(Number(e.target.value))}
                          className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-emerald-text)] font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="sm:col-span-2 pt-1">
                    <button
                      type="submit"
                      className="w-full sm:w-auto justify-center bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Cadastrar Colaborador & Gerar Acesso
                    </button>
                  </div>
                </form>
              </div>

              {/* List of active collaborators */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[var(--gg-text-muted)] uppercase tracking-wide">
                  Colaboradores Ativos Registrados ({activePartners.length})
                </h4>

                {activePartners.length === 0 ? (
                  <div className="border border-[var(--gg-border)] rounded-2xl p-8 text-center text-[var(--gg-text-subtle)] text-xs bg-[var(--gg-surface)]">
                    Nenhum colaborador externo ativo ainda.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activePartners.map((s) => (
                      <div key={s.id} className="bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-2xl p-4 space-y-2 text-xs">
                        <div className="flex justify-between items-center gap-2">
                          <strong className="text-[var(--gg-text-strong)] text-sm">{s.storeName}</strong>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--gg-surface-2)] text-[var(--gg-text)] border border-[var(--gg-border)]">
                            {CHECKOUT_PROVIDERS.find((p) => p.id === (s.checkoutProvider || 'mercadopago'))?.label || 'Colaborador'}
                          </span>
                        </div>

                        <div className="text-[var(--gg-text-muted)]">Nome Completo: {s.name}</div>
                        <div className="text-[var(--gg-text-muted)]">Login: <code className="text-[var(--gg-text-strong)] font-mono">{s.email}</code></div>
                        <div className="text-[var(--gg-text-muted)]">Senha: <code className="text-[var(--gg-accent-text)] font-mono">{s.password || '••••••'}</code></div>
                        <div className="text-[var(--gg-text-subtle)] text-[11px]">Origem: {s.address} • CEP {s.cep}</div>

                        <div className="flex items-center justify-between pt-2 border-t border-[var(--gg-border)]">
                          <button
                            type="button"
                            onClick={() => copyPartnerAccess(s)}
                            className="text-xs bg-[var(--gg-surface-2)] hover:bg-[var(--gg-border)] text-[var(--gg-text-strong)] border border-[var(--gg-border)] px-2.5 py-1.5 rounded-lg flex items-center gap-1"
                            title="Copiar dados para enviar pelo WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            {copiedPartnerId === s.id ? 'Copiado!' : 'Copiar Acesso para WhatsApp'}
                          </button>

                          {onDeleteSeller && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Remover o colaborador ${s.name}?`)) onDeleteSeller(s.id);
                              }}
                              className="text-[var(--gg-text-subtle)] hover:text-rose-500 p-1"
                              title="Remover colaborador"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: VENDAS & RASTREAMENTO */}
          {activeTab === 'sales' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-[var(--gg-text-strong)] font-display">
                  Vendas, Pedidos & Códigos de Rastreio
                </h3>
                <p className="text-xs text-[var(--gg-text-muted)]">
                  Visualize os pedidos realizados, dados de entrega e acompanhe os códigos de envio.
                </p>
              </div>

              {orders.length === 0 ? (
                <div className="border border-[var(--gg-border)] rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center text-[var(--gg-text-subtle)] text-xs bg-[var(--gg-surface)]">
                  Nenhum pedido realizado até o momento. Todos os dados são reais e serão gerados conforme os clientes efetuam compras na loja.
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((ord) => (
                    <div key={ord.id} className="bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-2xl p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-[var(--gg-text-strong)] text-sm">Pedido #{ord.orderNumber}</span>
                          <span className="text-[var(--gg-text-muted)] text-xs block">
                            Destinatário: {ord.buyerName} ({ord.buyerEmail}) • Tel: {ord.buyerPhone || 'N/I'}
                          </span>
                          <span className="text-[var(--gg-text-subtle)] text-[11px] block">
                            Endereço: {ord.buyerAddress}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[var(--gg-accent-text)] font-bold text-base font-display tabular-nums block">
                            {formatBRL(ord.total)}
                          </span>
                          <span className="text-[10px] text-[var(--gg-emerald-text)] font-bold uppercase">{ord.status}</span>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-1 text-xs border-t border-[var(--gg-border)] pt-2 text-[var(--gg-text)]">
                        {ord.items.map((i, idx) => (
                          <div key={idx} className="flex justify-between gap-2">
                            <span className="truncate">{i.title} (Vendedor: {i.sellerName})</span>
                            <span className="font-semibold text-[var(--gg-text-strong)] shrink-0">{formatBRL(i.price)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Tracking */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--gg-border)] text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--gg-text-muted)]">Rastreio Correios:</span>
                          <code className="text-[var(--gg-accent-text)] font-mono bg-[var(--gg-surface-inset)] px-2 py-0.5 rounded border border-[var(--gg-border)]">
                            {ord.trackingCode}
                          </code>
                        </div>

                        {currentSeller.role === 'master' && (
                          <div>
                            {ord.payoutReleasedToPartners ? (
                              <span className="text-[var(--gg-emerald-text)] font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> Repasse Financeiro Liberado
                              </span>
                            ) : (
                              <button
                                onClick={() => onReleasePayout(ord.id)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs"
                              >
                                Confirmar Entrega e Liberar Repasse
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PROPOSTAS DE DESCONTO & DESCONTO AUTOMÁTICO */}
          {activeTab === 'proposals' && (() => {
            const visibleProposals =
              currentSeller.role === 'master'
                ? proposals
                : proposals.filter(
                    (p) =>
                      p.itemsSummary.some((i) => i.sellerId === currentSeller.id) ||
                      currentSeller.id in (p.sellerApprovals || {})
                  );

            return (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-bold text-[var(--gg-text-strong)] font-display">
                    Propostas de Desconto & Aprovação Automática
                  </h3>
                  <p className="text-xs text-[var(--gg-text-muted)]">
                    Defina o desconto máximo automático da sua loja. Ofertas acima desse limite aparecem aqui para você aprovar e liberar o link de pagamento.
                  </p>
                </div>

                {/* Store-wide Max Discount Card */}
                <div className="bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2 text-sm font-bold text-[var(--gg-text-strong)]">
                      <Percent className="w-4 h-4 text-[var(--gg-emerald-text)]" />
                      <span>Desconto Máximo Automático da Loja ({currentSeller.storeName})</span>
                    </div>
                    <p className="text-[11px] text-[var(--gg-text-muted)] leading-relaxed">
                      Qualquer proposta até este percentual é aceita automaticamente e já gera o link de pagamento para o comprador. (Você também pode definir um % diferente em cada item ou lote individual.)
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={80}
                      value={storeDiscountInput}
                      onChange={(e) => setStoreDiscountInput(Number(e.target.value))}
                      className="w-20 bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-emerald-text)] font-bold text-center"
                    />
                    <span className="text-xs font-bold text-[var(--gg-text-muted)]">%</span>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateSellerMaxDiscount?.(currentSeller.id, storeDiscountInput);
                        setStoreDiscountSavedMsg(true);
                        setTimeout(() => setStoreDiscountSavedMsg(false), 2500);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs"
                    >
                      {storeDiscountSavedMsg ? 'Salvo!' : 'Salvar Limite'}
                    </button>
                  </div>
                </div>

                {visibleProposals.length === 0 ? (
                  <div className="border border-[var(--gg-border)] rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center text-[var(--gg-text-subtle)] text-xs bg-[var(--gg-surface)]">
                    Nenhuma proposta de desconto recebida até o momento.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleProposals.map((prop) => {
                      const pctRequested =
                        prop.originalTotal > 0
                          ? Math.round(((prop.originalTotal - prop.proposedTotal) / prop.originalTotal) * 100)
                          : 0;
                      const myApproval = prop.sellerApprovals?.[currentSeller.id];

                      return (
                        <div key={prop.id} className="bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-2xl p-4 space-y-3">
                          <div className="flex flex-wrap justify-between items-start gap-2">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-[var(--gg-text-strong)] text-sm">Colecionador: {prop.buyerName}</span>
                                {prop.status === 'approved' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-[var(--gg-emerald-text)] border border-emerald-500/30 flex items-center gap-1">
                                    {prop.autoApproved ? <Zap className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                    {prop.autoApproved ? 'Aceita Automaticamente' : 'Aprovada — Link Gerado'}
                                  </span>
                                )}
                                {prop.status === 'rejected' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/30">
                                    Recusada
                                  </span>
                                )}
                                {prop.status === 'pending' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-[var(--gg-accent-text)] border border-amber-500/30">
                                    Aguardando Aprovação
                                  </span>
                                )}
                              </div>
                              <span className="text-[var(--gg-text-muted)] text-xs block">
                                {prop.buyerEmail} {prop.buyerPhone ? `• ${prop.buyerPhone}` : ''}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-xs text-[var(--gg-text-subtle)] line-through block">{formatBRL(prop.originalTotal)}</span>
                              <span className="text-[var(--gg-emerald-text)] font-bold text-base font-display tabular-nums block">
                                Proposta: {formatBRL(prop.proposedTotal)} ({pctRequested}% OFF)
                              </span>
                            </div>
                          </div>

                          {/* Items included */}
                          {prop.itemsSummary && prop.itemsSummary.length > 0 && (
                            <div className="bg-[var(--gg-surface-inset)] border border-[var(--gg-border)] rounded-xl p-2.5 space-y-1 text-[11px] text-[var(--gg-text)]">
                              {prop.itemsSummary.map((item, idx) => (
                                <div key={idx} className="flex justify-between gap-2">
                                  <span className="truncate">
                                    {item.title} <span className="text-[var(--gg-text-subtle)]">({item.sellerName})</span>
                                  </span>
                                  <span className="font-semibold text-[var(--gg-text-strong)] shrink-0">{formatBRL(item.price)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {prop.buyerMessage && (
                            <p className="text-xs text-[var(--gg-text)] italic bg-[var(--gg-surface-2)] px-3 py-2 rounded-xl border border-[var(--gg-border)]">
                              &ldquo;{prop.buyerMessage}&rdquo;
                            </p>
                          )}

                          {/* Approved Payment Link Box */}
                          {prop.status === 'approved' && prop.paymentLink && (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 space-y-2 text-xs">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-bold text-[var(--gg-emerald-text)]">Link de Pagamento com Desconto Liberado:</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(prop.paymentLink || '');
                                      setCopiedPropId(prop.id);
                                      setTimeout(() => setCopiedPropId(null), 2500);
                                    }}
                                    className="bg-[var(--gg-surface)] hover:bg-[var(--gg-surface-2)] text-[var(--gg-text-strong)] border border-[var(--gg-border)] px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1"
                                  >
                                    {copiedPropId === prop.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    {copiedPropId === prop.id ? 'Link Copiado!' : 'Copiar Link'}
                                  </button>
                                  <a
                                    href={`https://wa.me/${(prop.buyerPhone || '').replace(/\D/g, '')}?text=${encodeURIComponent(
                                      `Olá ${prop.buyerName}! Sua proposta de ${formatBRL(prop.proposedTotal)} na Geek Grid foi APROVADA! Finalize seu pedido com entrega pelo link: ${prop.paymentLink}`
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                    Enviar no WhatsApp
                                  </a>
                                </div>
                              </div>
                              <code className="block text-[11px] text-[var(--gg-accent-text)] font-mono truncate bg-[var(--gg-surface)] px-2.5 py-1.5 rounded-lg border border-[var(--gg-border)]">
                                {prop.paymentLink}
                              </code>
                            </div>
                          )}

                          {/* Action Buttons when Pending */}
                          {prop.status === 'pending' && (
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--gg-border)]">
                              <span className="text-[11px] text-[var(--gg-text-muted)]">
                                {myApproval === 'accepted' && currentSeller.role !== 'master'
                                  ? 'Você já aceitou sua parte — aguardando outro vendedor.'
                                  : 'Clique abaixo para aprovar e gerar o link de pagamento:'}
                              </span>

                              <div className="flex flex-wrap gap-2">
                                {(currentSeller.role === 'master' || myApproval !== 'accepted') && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onUpdateProposalApproval(
                                          prop.id,
                                          currentSeller.id,
                                          'accepted',
                                          currentSeller.role === 'master'
                                        )
                                      }
                                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs transition-colors"
                                    >
                                      Aceitar Desconto & Gerar Link
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onUpdateProposalApproval(
                                          prop.id,
                                          currentSeller.id,
                                          'declined',
                                          currentSeller.role === 'master'
                                        )
                                      }
                                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs transition-colors"
                                    >
                                      Recusar
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 6: CONFIGURAÇÕES & CHAVES */}
          {activeTab === 'settings' && currentSeller.role === 'master' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-[var(--gg-text-strong)] font-display">
                  Configurações das Chaves & Integrações
                </h3>
                <p className="text-xs text-[var(--gg-text-muted)]">
                  Área administrativa global. Configure e armazene suas chaves padrão para IA, pagamentos e banco de dados Supabase.
                </p>
              </div>

              {/* Form for API Keys */}
              <div className="bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-5 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-[var(--gg-text-strong)] flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[var(--gg-accent-text)]" />
                    Chaves Globais da IA Gemini e Mercado Pago
                  </h4>
                  {keysSavedMsg && (
                    <span className="text-xs font-bold text-[var(--gg-emerald-text)] flex items-center gap-1">
                      <Check className="w-4 h-4" /> Chaves salvas com segurança no painel!
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveKeys} className="space-y-4">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <label className="text-xs font-semibold text-[var(--gg-text)]">
                        Chave da API Google Gemini (GEMINI_API_KEY)
                      </label>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[var(--gg-accent-text)] hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Obter Chave Gratuita no Google AI Studio
                      </a>
                    </div>
                    <input
                      type="text"
                      value={geminiKeyInput}
                      onChange={(e) => {
                        setGeminiKeyInput(e.target.value);
                        setTestAiResult(null);
                      }}
                      placeholder="AQ.Ab8RN... ou AIzaSy..."
                      className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl px-3.5 py-2 text-xs text-[var(--gg-text-strong)] font-mono"
                    />

                    {/* Format Indicator */}
                    {geminiKeyInput.trim().length > 0 && (
                      <div className="mt-1.5 text-[11px]">
                        {/^aq\./i.test(geminiKeyInput.trim()) || /^aq[a-z0-9_-]{10,}/i.test(geminiKeyInput.trim()) ? (
                          <span className="text-[var(--gg-emerald-text)] font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Formato válido: Chave de Autenticação Google AI Studio (AQ.).
                          </span>
                        ) : geminiKeyInput.trim().startsWith('AIzaSy') ? (
                          <span className="text-[var(--gg-emerald-text)] font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Formato válido: Chave Clássica Google Gemini (AIzaSy).
                          </span>
                        ) : geminiKeyInput.trim().startsWith('APP_USR-') || geminiKeyInput.trim().startsWith('TEST-') ? (
                          <span className="text-rose-500 font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Atenção: Esta chave pertence ao Mercado Pago (APP_USR-/TEST-). Cole-a no campo de pagamento logo abaixo.
                          </span>
                        ) : (
                          <span className="text-[var(--gg-accent-text)] font-semibold flex items-center gap-1">
                            <Info className="w-3.5 h-3.5" /> Clique em &quot;Testar Conexão com Gemini&quot; para validar sua chave diretamente no Google AI Studio.
                          </span>
                        )}
                      </div>
                    )}

                    {/* Test Key Button */}
                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleTestGeminiKey}
                        disabled={testingAiKey || !geminiKeyInput.trim()}
                        className="bg-[var(--gg-surface-2)] hover:bg-[var(--gg-border)] text-[var(--gg-text-strong)] border border-[var(--gg-border)] font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[var(--gg-accent-text)]" />
                        {testingAiKey ? 'Testando Conexão...' : 'Testar Conexão com Gemini'}
                      </button>

                      {testAiResult && (
                        <span className={`text-xs font-semibold ${testAiResult.valid ? 'text-[var(--gg-emerald-text)]' : 'text-rose-500'}`}>
                          {testAiResult.valid ? '✅ Conexão bem-sucedida!' : `❌ ${testAiResult.message}`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">
                      Mercado Pago Access Token Padrão (MERCADO_PAGO_ACCESS_TOKEN)
                    </label>
                    <input
                      type="text"
                      value={mpTokenInput}
                      onChange={(e) => setMpTokenInput(e.target.value)}
                      placeholder="APP_USR-... ou TEST-..."
                      className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl px-3.5 py-2 text-xs text-[var(--gg-text-strong)] font-mono"
                    />
                    <p className="text-[11px] text-[var(--gg-text-subtle)] mt-1">
                      Usado como fallback quando o vendedor não informar uma chave própria no perfil dele.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-4 py-2 rounded-xl text-xs shadow"
                  >
                    Salvar Chaves no Painel
                  </button>
                </form>
              </div>

              {/* Supabase Connection */}
              <div className="bg-[var(--gg-surface)] border border-[var(--gg-border)] rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-[var(--gg-text-strong)] flex items-center gap-2">
                    <Database className="w-4 h-4 text-[var(--gg-emerald-text)]" />
                    Banco de Dados Supabase (PostgreSQL & Storage)
                  </h4>
                  {sbSavedMsg && (
                    <span className="text-xs font-bold text-[var(--gg-emerald-text)] flex items-center gap-1">
                      <Check className="w-4 h-4" /> Conexão salva com sucesso!
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveSupabaseConfig} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">
                      Project URL do Supabase (sem /rest/v1/)
                    </label>
                    <input
                      type="text"
                      value={sbUrl}
                      onChange={(e) => setSbUrl(e.target.value)}
                      onBlur={() => setSbUrl(normalizeSupabaseUrl(sbUrl))}
                      placeholder="https://xyz.supabase.co"
                      className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--gg-text)] mb-1">
                      Publishable / Anon Public Key (NÃO use Secret Key)
                    </label>
                    <input
                      type="password"
                      value={sbKey}
                      onChange={(e) => {
                        setSbKey(e.target.value);
                        setSbTestResult(null);
                      }}
                      placeholder="sb_publishable_... ou eyJhbGci..."
                      className="w-full bg-[var(--gg-surface-inset)] border border-[var(--gg-border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--gg-text-strong)] font-mono"
                    />
                    {isSecretSupabaseKey(sbKey) && (
                      <p className="text-[11px] text-rose-500 font-semibold mt-1 flex items-start gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>
                          Você colou a <strong>Secret Key</strong> (sb_secret_... ou service_role), que o Supabase bloqueia no navegador! Copie a <strong>Publishable key (sb_publishable_...)</strong> ou <strong>anon public (eyJ...)</strong>.
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2 pt-1 flex flex-wrap items-center gap-2.5">
                    <button
                      type="submit"
                      disabled={testingSupabase}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow disabled:opacity-60"
                    >
                      {testingSupabase ? 'Conectando e Sincronizando...' : 'Salvar e Sincronizar com Supabase'}
                    </button>
                    <button
                      type="button"
                      onClick={handleTestAndSyncSupabase}
                      disabled={testingSupabase}
                      className="bg-[var(--gg-surface-2)] hover:bg-[var(--gg-border)] text-[var(--gg-text-strong)] border border-[var(--gg-border)] px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-[var(--gg-emerald-text)] ${testingSupabase ? 'animate-spin' : ''}`} />
                      Testar Conexão
                    </button>
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="bg-[var(--gg-surface-2)] hover:bg-[var(--gg-border)] text-[var(--gg-text-strong)] border border-[var(--gg-border)] px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      {copiedSql ? <Check className="w-3.5 h-3.5 text-[var(--gg-emerald-text)]" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedSql ? 'SQL Copiado!' : 'Copiar Código SQL para Criar Tabelas'}
                    </button>
                  </div>

                  {(sbTestResult || supabaseStatus) && (
                    <div
                      className={`sm:col-span-2 p-3 rounded-xl border text-xs ${
                        (sbTestResult?.tablesReady ?? supabaseStatus?.tablesReady)
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-[var(--gg-emerald-text)]'
                          : 'bg-amber-500/10 border-amber-500/30 text-[var(--gg-accent-text)]'
                      }`}
                    >
                      <strong>Status do Banco: </strong>
                      {sbTestResult?.message || supabaseStatus?.message}
                    </div>
                  )}
                </form>

                <div className="bg-[var(--gg-surface-inset)] border border-[var(--gg-border)] rounded-xl p-3 text-[11px] text-[var(--gg-text-muted)] space-y-1">
                  <strong className="text-[var(--gg-text-strong)] block">Passo importante para salvar tudo na nuvem (inclusive na Vercel):</strong>
                  <p>1. No painel do seu projeto Supabase, abra <strong>SQL Editor → New Query</strong>, cole o SQL abaixo e clique em <strong>RUN</strong>.</p>
                  <p>2. Em <strong>Project Settings → API Keys</strong> (ou Data API), copie a <strong>Project URL</strong> base (ex: <code className="text-[var(--gg-text-strong)]">https://xxx.supabase.co</code>, sem <code className="text-[var(--gg-text-strong)]">/rest/v1/</code>) e a chave pública <strong>Publishable key</strong> (<code className="text-[var(--gg-emerald-text)]">sb_publishable_...</code>) ou legado <strong>anon public</strong> (<code className="text-[var(--gg-emerald-text)]">eyJ...</code>). <strong>Nunca use a Secret key (sb_secret_...)</strong> no navegador.</p>
                  <p>3. Para funcionar automaticamente para todos os seus clientes na Vercel, cadastre também <code className="text-[var(--gg-accent-text)]">VITE_SUPABASE_URL</code>, <code className="text-[var(--gg-accent-text)]">VITE_SUPABASE_ANON_KEY</code> (usando a chave pública), <code className="text-[var(--gg-accent-text)]">GEMINI_API_KEY</code> e <code className="text-[var(--gg-accent-text)]">MERCADO_PAGO_ACCESS_TOKEN</code> nas <strong>Environment Variables</strong> da Vercel.</p>
                </div>

                <pre className="bg-[var(--gg-surface-inset)] p-3 rounded-xl text-[11px] text-[var(--gg-text-muted)] font-mono overflow-x-auto max-h-40 border border-[var(--gg-border)]">
                  {SUPABASE_SQL_SCHEMA}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
