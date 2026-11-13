import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Camera,
  Upload,
  Sparkles,
  Flame,
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
} from 'lucide-react';
import { HQItem, Seller, ConditionGrade, DiscountProposal, Order } from '../types.ts';
import { formatBRL, getConditionInfo, normalizeFranchiseName } from '../utils/comicLogic.ts';
import {
  SUPABASE_SQL_SCHEMA,
  getSupabaseCredentials,
  saveSupabaseCredentials,
  normalizeSupabaseUrl,
  isSecretSupabaseKey,
} from '../utils/supabaseClient.ts';
import { compressFileToBase64, compressImageBase64 } from '../utils/imageCompressor.ts';
import { HQMasterLogo } from './HQMasterLogo.tsx';

interface AdminPageProps {
  onBackToStore: () => void;
  hqs: HQItem[];
  onAddHQ: (hq: Omit<HQItem, 'id' | 'createdAt'>) => void;
  onUpdateHQ: (hq: HQItem) => void;
  onDeleteHQ: (id: string) => void;
  onResetToDemoHQs: () => void;
  onClearDemoHQs: () => void;
  sellers: Seller[];
  onAddSeller: (seller: Omit<Seller, 'id' | 'totalSales' | 'totalEarnings' | 'active' | 'joinedAt'>) => void;
  onDeleteSeller?: (id: string) => void;
  onUpdateSellerPassword?: (sellerId: string, newPass: string) => void;
  onUpdateOwnerProfile?: (updatedSeller: Seller) => void;
  currentSeller: Seller | null;
  onLoginSeller: (email: string, pass: string) => boolean;
  onLogoutSeller: () => void;
  proposals: DiscountProposal[];
  onUpdateProposalApproval: (proposalId: string, sellerId: string, decision: 'accepted' | 'declined') => void;
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

export const AdminPage: React.FC<AdminPageProps> = ({
  onBackToStore,
  hqs,
  onAddHQ,
  onUpdateHQ,
  onDeleteHQ,
  onClearDemoHQs,
  sellers,
  onAddSeller,
  onDeleteSeller,
  onUpdateSellerPassword,
  onUpdateOwnerProfile,
  currentSeller,
  onLoginSeller,
  onLogoutSeller,
  proposals,
  onUpdateProposalApproval,
  orders,
  onUpdateOrderTracking,
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
  const [formPublisher, setFormPublisher] = useState<'Marvel' | 'DC Comics' | 'Panini' | 'Editora Abril' | 'Image Comics' | 'Dark Horse' | 'Outra'>('Editora Abril');
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
  const [formIs1Real, setFormIs1Real] = useState(false);
  const [formSellerId, setFormSellerId] = useState(currentSeller?.id || 'master');

  // Master Owner Profile State
  const masterSeller = sellers.find((s) => s.role === 'master') || currentSeller;
  const [ownerName, setOwnerName] = useState(masterSeller?.name || 'Neto');
  const [ownerStoreName, setOwnerStoreName] = useState(masterSeller?.storeName || 'HQ Master');
  const [ownerEmail, setOwnerEmail] = useState(masterSeller?.email || 'neto.mmp@gmail.com');
  const [ownerPhone, setOwnerPhone] = useState(masterSeller?.phone || '');
  const [ownerCpfCnpj, setOwnerCpfCnpj] = useState(masterSeller?.cpfCnpj || '');
  const [ownerCep, setOwnerCep] = useState(masterSeller?.cep || '01310-100');
  const [ownerStreet, setOwnerStreet] = useState(masterSeller?.street || 'Avenida Paulista');
  const [ownerNumber, setOwnerNumber] = useState(masterSeller?.number || '');
  const [ownerComplement, setOwnerComplement] = useState(masterSeller?.complement || '');
  const [ownerNeighborhood, setOwnerNeighborhood] = useState(masterSeller?.neighborhood || 'Bela Vista');
  const [ownerCity, setOwnerCity] = useState(masterSeller?.city || 'São Paulo');
  const [ownerState, setOwnerState] = useState(masterSeller?.state || 'SP');
  const [ownerPixKeyType, setOwnerPixKeyType] = useState<'cpf' | 'email' | 'phone' | 'random'>(masterSeller?.pixKeyType || 'email');
  const [ownerPixKey, setOwnerPixKey] = useState(masterSeller?.pixKey || 'neto.mmp@gmail.com');
  const [ownerBankName, setOwnerBankName] = useState(masterSeller?.bankName || '');
  const [ownerAccountHolder, setOwnerAccountHolder] = useState(masterSeller?.accountHolder || 'Neto MMP');
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

  // Collaborator Registration inside Admin
  const [cName, setCName] = useState('');
  const [cStoreName, setCStoreName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPassword, setCPassword] = useState('');
  const [cCep, setCCep] = useState('01310-100');
  const [cAddress, setCAddress] = useState('');
  const [copiedPartnerId, setCopiedPartnerId] = useState<string | null>(null);

  useEffect(() => {
    if (currentSeller) {
      setFormSellerId(currentSeller.id);
    }
  }, [currentSeller]);

  // Keep owner form synced when cloud data loads from Supabase
  useEffect(() => {
    if (masterSeller && masterSeller.role === 'master') {
      setOwnerName(masterSeller.name || 'Neto');
      setOwnerStoreName(masterSeller.storeName || 'HQ Master');
      setOwnerEmail(masterSeller.email || 'neto.mmp@gmail.com');
      setOwnerPhone(masterSeller.phone || '');
      setOwnerCpfCnpj(masterSeller.cpfCnpj || '');
      setOwnerCep(masterSeller.cep || '01310-100');
      setOwnerStreet(masterSeller.street || '');
      setOwnerNumber(masterSeller.number || '');
      setOwnerComplement(masterSeller.complement || '');
      setOwnerNeighborhood(masterSeller.neighborhood || '');
      setOwnerCity(masterSeller.city || '');
      setOwnerState(masterSeller.state || '');
      setOwnerPixKeyType(masterSeller.pixKeyType || 'email');
      setOwnerPixKey(masterSeller.pixKey || masterSeller.email || 'neto.mmp@gmail.com');
      setOwnerBankName(masterSeller.bankName || '');
      setOwnerAccountHolder(masterSeller.accountHolder || masterSeller.name || 'Neto MMP');
    }
  }, [masterSeller?.id, masterSeller?.name, masterSeller?.email, masterSeller?.cep, masterSeller?.pixKey, masterSeller?.address]);

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
      const customKey = (localStorage.getItem('hq_master_gemini_key') || '').trim();

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
          const pubLower = String(d.publisher).toLowerCase();
          if (pubLower.includes('abril')) setFormPublisher('Editora Abril');
          else if (pubLower.includes('panini')) setFormPublisher('Panini');
          else if (pubLower.includes('marvel')) setFormPublisher('Marvel');
          else if (pubLower.includes('dc')) setFormPublisher('DC Comics');
          else if (pubLower.includes('image')) setFormPublisher('Image Comics');
          else if (pubLower.includes('dark horse')) setFormPublisher('Dark Horse');
          else setFormPublisher('Outra');
        }
        setFormSeries(d.series || formSeries);
        setFormIssueNumber(d.issueNumber || formIssueNumber);
        setFormYear(Number(d.yearEstimate) || formYear);
        setFormPrice(Number(d.suggestedPrice) || formPrice);

        if (d.unitPrice) setFormUnitPrice(Number(d.unitPrice));
        if (d.bundlePrice) setFormBundlePrice(Number(d.bundlePrice));
        if (d.isCollection !== undefined) setFormIsCollection(Boolean(d.isCollection));
        if (d.collectionCount) setFormCollectionCount(Number(d.collectionCount));
        if (d.allowsUnitPurchase !== undefined) setFormAllowsUnitPurchase(Boolean(d.allowsUnitPurchase));

        if (d.conditionGradeSuggestion) {
          setFormCondition(d.conditionGradeSuggestion as ConditionGrade);
        }

        const matchedFranchise = normalizeFranchiseName(d.franchiseCategory || 'Quadrinhos', existingFranchises);
        setFormFranchise(matchedFranchise);

        const isNew = !existingFranchises.includes(matchedFranchise);
        setAiAnalysisFeedback(
          d.isCollection
            ? `Coleção identificada (${d.collectionCount} edições)! Sugerido lote a ${formatBRL(d.bundlePrice)} ou avulso a ${formatBRL(d.unitPrice)} cada.`
            : `Capa reconhecida com sucesso! Personagem: "${matchedFranchise}" ${isNew ? '(Nova Categoria Criada)' : ''}.`
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

  // Save Owner Profile Data
  const handleSaveOwnerProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSeller) return;

    const fullAddress = `${ownerStreet}, nº ${ownerNumber || 'S/N'}${ownerComplement ? ` (${ownerComplement})` : ''} - ${ownerNeighborhood}, ${ownerCity}/${ownerState}`;

    const updatedSeller: Seller = {
      ...currentSeller,
      name: ownerName,
      storeName: ownerStoreName,
      email: ownerEmail,
      phone: ownerPhone,
      cpfCnpj: ownerCpfCnpj,
      cep: ownerCep,
      address: fullAddress,
      street: ownerStreet,
      number: ownerNumber,
      complement: ownerComplement,
      neighborhood: ownerNeighborhood,
      city: ownerCity,
      state: ownerState,
      pixKeyType: ownerPixKeyType,
      pixKey: ownerPixKey,
      bankName: ownerBankName,
      accountHolder: ownerAccountHolder,
      password: ownerNewPassword.trim() ? ownerNewPassword.trim() : currentSeller.password,
      totalSales: 0,
      totalEarnings: 0,
    };

    if (onUpdateOwnerProfile) {
      onUpdateOwnerProfile(updatedSeller);
    }

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

  // Create Partner
  const handleCreatePartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName || !cEmail || !cPassword) {
      alert('Preencha nome, e-mail e senha do parceiro.');
      return;
    }

    onAddSeller({
      name: cName,
      storeName: cStoreName || `${cName} Quadrinhos`,
      email: cEmail,
      role: 'partner',
      password: cPassword,
      cep: cCep || '01310-100',
      address: cAddress || 'São Paulo - SP',
    });

    setCName('');
    setCStoreName('');
    setCEmail('');
    setCPassword('');
    setCCep('01310-100');
    setCAddress('');
    alert('Colaborador cadastrado com sucesso! Você já pode copiar os dados e enviar a ele.');
  };

  const copyPartnerAccess = (partner: Seller) => {
    const text = `*Bem-vindo ao HQ Master!*\n\nOlá ${partner.name}, seu acesso como parceiro ao nosso acervo está pronto:\n\n*Acesse:* ${window.location.origin}\n*E-mail:* ${partner.email}\n*Senha:* ${partner.password}\n\nFaça login no botão "Área do Colecionador / Admin" para cadastrar e gerenciar seus gibis. Boas vendas!`;
    navigator.clipboard.writeText(text);
    setCopiedPartnerId(partner.id);
    setTimeout(() => setCopiedPartnerId(null), 2500);
  };

  // Publish HQ
  const handleSubmitNewHQ = (e: React.FormEvent) => {
    e.preventDefault();

    if (formImages.length === 0) {
      alert('Tire ou envie ao menos 1 foto real da capa.');
      return;
    }

    if (!formTitle || !formSeries) {
      alert('Preencha o título e a série da revista.');
      return;
    }

    const currentPublisher = sellers.find((s) => s.id === formSellerId) || currentSeller;

    onAddHQ({
      title: formTitle,
      description: formDescription || 'Exemplar com miolo completo, páginas íntegras e preservadas para leitura.',
      publisher: formPublisher,
      series: formSeries,
      franchiseCategory: formFranchise || 'Quadrinhos',
      issueNumber: formIssueNumber || '01',
      year: formYear,
      condition: formCondition,
      conditionDetails: formConditionDetails,
      hasAllPages: true,
      cleaningNote: 'Higienizada e inspecionada',
      price: formIsCollection ? formBundlePrice : formPrice,
      unitPrice: formUnitPrice,
      bundlePrice: formBundlePrice,
      allowsUnitPurchase: formAllowsUnitPurchase,
      isRareSpecial1Real: formIs1Real,
      isCollection: formIsCollection,
      collectionCount: formIsCollection ? formCollectionCount : 1,
      images: formImages,
      sellerId: formSellerId,
      sellerName: currentPublisher?.storeName || currentPublisher?.name || 'HQ Master',
      sellerAddress: currentPublisher?.address || 'São Paulo - SP',
      sellerCep: currentPublisher?.cep || '01310-100',
      featured: true,
      sold: false,
    });

    // Reset Form
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
    setFormIs1Real(false);
    setAiAnalysisFeedback(null);
    setAiAnalysisError(null);

    alert('Revista publicada com sucesso no catálogo!');
    setActiveTab('catalog');
  };

  // Only external partner sellers
  const externalPartners = sellers.filter((s) => s.role !== 'master');

  return (
    <div className="min-h-screen bg-[#0b0d13] text-zinc-100 flex flex-col font-['Inter']">
      {/* Top Bar */}
      <header className="bg-[#0f121a] border-b border-zinc-800/90 py-3.5 px-4 sm:px-6 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToStore}
              className="text-zinc-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 px-3 py-1.5 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar à Loja</span>
            </button>
            <div className="hidden sm:block">
              <HQMasterLogo size="sm" />
            </div>
          </div>

          {currentSeller && (
            <div className="flex items-center gap-2 sm:gap-3 text-xs flex-wrap">
              {supabaseStatus && (
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 ${
                    supabaseStatus.tablesReady
                      ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white'
                  }`}
                  title={supabaseStatus.message}
                >
                  <Database className="w-3 h-3" />
                  <span>
                    {supabaseStatus.syncing
                      ? 'Sincronizando...'
                      : supabaseStatus.tablesReady
                      ? 'Nuvem Supabase Ativa'
                      : 'Modo Local'}
                  </span>
                </button>
              )}

              <span className="text-zinc-300">
                Olá, <strong className="text-white">{currentSeller.name}</strong>{' '}
                <span className="text-amber-400 font-bold">
                  ({currentSeller.role === 'master' ? '👑 Proprietário / Dono Master' : currentSeller.storeName})
                </span>
              </span>

              <button
                onClick={onLogoutSeller}
                className="text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/80 px-2.5 py-1 rounded-lg transition-colors"
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      {!currentSeller ? (
        // CLEAN & SECURE LOGIN VIEW
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-sm bg-[#111520] border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <HQMasterLogo size="lg" />
              </div>
              <div>
                <h1 className="text-lg font-black text-white font-['Space_Grotesk']">
                  HQ Master — Acesso Administrativo
                </h1>
                <p className="text-xs text-zinc-400">
                  Painel de gestão de acervo, precificação e estoque.
                </p>
              </div>
            </div>

            {loginError && (
              <div className="bg-rose-950/60 border border-rose-800 text-rose-300 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleDoLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="seu-email@dominio.com"
                  className="w-full bg-zinc-950 border border-zinc-700/90 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-700/90 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold py-3 rounded-xl text-xs transition-transform active:scale-95 shadow-lg flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Entrar no Painel
              </button>
            </form>
          </div>
        </div>
      ) : (
        // AUTHENTICATED DASHBOARD
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-zinc-800 text-xs font-semibold scrollbar-none">
            <button
              onClick={() => setActiveTab('new-hq')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'new-hq'
                  ? 'bg-amber-500 text-black font-bold shadow'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Publicar Revista (com IA)</span>
            </button>

            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'catalog'
                  ? 'bg-amber-500 text-black font-bold shadow'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Catálogo & Estoque ({hqs.length})</span>
            </button>

            {/* NEW TAB: DADOS DO DONO / MEU PERFIL (Neto) */}
            {currentSeller.role === 'master' && (
              <button
                onClick={() => setActiveTab('owner-profile')}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                  activeTab === 'owner-profile'
                    ? 'bg-amber-500 text-black font-bold shadow'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Meu Perfil / Dados do Dono</span>
              </button>
            )}

            {/* Exclusive Tab: Collaborators Management (Master Only) */}
            {currentSeller.role === 'master' && (
              <button
                onClick={() => setActiveTab('collaborators')}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                  activeTab === 'collaborators'
                    ? 'bg-amber-500 text-black font-bold shadow'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Colaboradores ({externalPartners.length})</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('sales')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'sales'
                  ? 'bg-amber-500 text-black font-bold shadow'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Vendas & Pedidos ({orders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('proposals')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'proposals'
                  ? 'bg-amber-500 text-black font-bold shadow'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Propostas de Desconto ({proposals.length})</span>
            </button>

            {/* Exclusive Tab: Keys & Settings (Master Only) */}
            {currentSeller.role === 'master' && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                  activeTab === 'settings'
                    ? 'bg-amber-500 text-black font-bold shadow'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configurações & Chaves</span>
              </button>
            )}
          </div>

          {/* TAB: MEU PERFIL / DADOS DO DONO (Neto MMP) */}
          {activeTab === 'owner-profile' && currentSeller.role === 'master' && (
            <div className="bg-[#111520] border border-zinc-800 rounded-3xl p-5 sm:p-7 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-white font-['Space_Grotesk'] flex items-center gap-2">
                    <User className="w-5 h-5 text-amber-400" />
                    Dados do Proprietário & Responsável (HQ Master)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Seus dados pessoais, endereço de postagem nos Correios e chave PIX para recebimento direto das vendas da loja.
                  </p>
                </div>
                {ownerSavedMsg && (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1.5 rounded-xl flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Dados salvos com sucesso!
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveOwnerProfile} className="space-y-5">
                {/* Identification */}
                <div className="bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800 space-y-3">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    1. Identificação do Responsável
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Nome do Responsável *</label>
                      <input
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Neto"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Nome da Loja Oficial *</label>
                      <input
                        type="text"
                        value={ownerStoreName}
                        onChange={(e) => setOwnerStoreName(e.target.value)}
                        placeholder="HQ Master"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">E-mail de Login *</label>
                      <input
                        type="email"
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                        placeholder="neto.mmp@gmail.com"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Telefone / WhatsApp</label>
                      <input
                        type="text"
                        value={ownerPhone}
                        onChange={(e) => setOwnerPhone(e.target.value)}
                        placeholder="(11) 98765-4321"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">CPF ou CNPJ (para etiquetas dos Correios)</label>
                      <input
                        type="text"
                        value={ownerCpfCnpj}
                        onChange={(e) => setOwnerCpfCnpj(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Alterar Senha de Administrador</label>
                      <input
                        type="password"
                        value={ownerNewPassword}
                        onChange={(e) => setOwnerNewPassword(e.target.value)}
                        placeholder="Deixe em branco para manter a atual"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Postal Origin Address */}
                <div className="bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800 space-y-3">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    2. Endereço de Origem das Postagens (Cálculo de Frete)
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">CEP de Origem *</label>
                      <div className="flex gap-2 max-w-sm">
                        <input
                          type="text"
                          maxLength={9}
                          value={ownerCep}
                          onChange={(e) => setOwnerCep(e.target.value)}
                          placeholder="01310-100"
                          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                          required
                        />
                        <button
                          type="button"
                          onClick={handleLookupOwnerCep}
                          disabled={lookingUpOwnerCep}
                          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 border border-zinc-700"
                        >
                          <Search className="w-3.5 h-3.5" />
                          {lookingUpOwnerCep ? 'Buscando...' : 'Buscar CEP'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] text-zinc-400 mb-1">Logradouro / Rua</label>
                        <input
                          type="text"
                          value={ownerStreet}
                          onChange={(e) => setOwnerStreet(e.target.value)}
                          placeholder="Av. Paulista"
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">Número</label>
                        <input
                          type="text"
                          value={ownerNumber}
                          onChange={(e) => setOwnerNumber(e.target.value)}
                          placeholder="1000"
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">Bairro</label>
                        <input
                          type="text"
                          value={ownerNeighborhood}
                          onChange={(e) => setOwnerNeighborhood(e.target.value)}
                          placeholder="Bela Vista"
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">Cidade</label>
                        <input
                          type="text"
                          value={ownerCity}
                          onChange={(e) => setOwnerCity(e.target.value)}
                          placeholder="São Paulo"
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">UF (Estado)</label>
                        <input
                          type="text"
                          maxLength={2}
                          value={ownerState}
                          onChange={(e) => setOwnerState(e.target.value.toUpperCase())}
                          placeholder="SP"
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white uppercase font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* PIX Receiving Account */}
                <div className="bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800 space-y-3">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    3. Dados para Recebimento via PIX (Exibidos no Checkout da Loja)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Tipo de Chave PIX</label>
                      <select
                        value={ownerPixKeyType}
                        onChange={(e) => setOwnerPixKeyType(e.target.value as any)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="email">E-mail</option>
                        <option value="cpf">CPF / CNPJ</option>
                        <option value="phone">Telefone</option>
                        <option value="random">Chave Aleatória</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Chave PIX da Loja *</label>
                      <input
                        type="text"
                        value={ownerPixKey}
                        onChange={(e) => setOwnerPixKey(e.target.value)}
                        placeholder="neto.mmp@gmail.com"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Nome do Titular da Conta</label>
                      <input
                        type="text"
                        value={ownerAccountHolder}
                        onChange={(e) => setOwnerAccountHolder(e.target.value)}
                        placeholder="Neto MMP"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Banco (Opcional)</label>
                      <input
                        type="text"
                        value={ownerBankName}
                        onChange={(e) => setOwnerBankName(e.target.value)}
                        placeholder="Ex: Nubank / Itaú / Inter"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold px-6 py-3 rounded-xl text-xs shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Salvar Dados do Responsável
                </button>
              </form>
            </div>
          )}

          {/* TAB 1: NOVA PUBLICAÇÃO (Com Câmera, Lotes e Leitura IA) */}
          {activeTab === 'new-hq' && (
            <div className="bg-[#111520] border border-zinc-800 rounded-3xl p-5 sm:p-7 space-y-6">
              <div>
                <h3 className="text-base font-black text-white font-['Space_Grotesk']">
                  Cadastrar Revista ou Lote de Coleção
                </h3>
                <p className="text-xs text-zinc-400">
                  Fotografe uma capa individual ou várias capas de uma coleção. A IA reconhecerá o título, ano, número, precificará o exemplar e sugerirá desconto se for lote.
                </p>
              </div>

              {/* Photo Capture and Upload Section */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-zinc-300">
                  Fotos das Capas / Exemplares ({formImages.length} fotos carregadas)
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow"
                  >
                    <Camera className="w-4 h-4" />
                    Abrir Câmera do Dispositivo
                  </button>

                  <label className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer border border-zinc-700">
                    <Upload className="w-4 h-4 text-amber-400" />
                    Carregar Fotos do Dispositivo
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
                      className="text-zinc-400 hover:text-rose-400 text-xs px-2 py-1"
                    >
                      Limpar fotos
                    </button>
                  )}
                </div>

                {/* Camera Modal */}
                {cameraActive && (
                  <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 max-w-md mx-auto space-y-3">
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
                        className="bg-amber-500 text-black font-bold px-5 py-2 rounded-xl text-xs"
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
                        className="text-zinc-400 hover:text-white text-xs px-3"
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
                          className="w-20 h-28 object-cover rounded-lg border border-zinc-700"
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
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-transform active:scale-95"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      {analyzingWithAI ? 'Lendo Capas com IA...' : 'Analisar e Preencher Automaticamente com IA'}
                    </button>
                  </div>
                )}

                {aiAnalysisFeedback && (
                  <div className="bg-purple-950/40 border border-purple-800/60 p-3 rounded-xl text-xs text-purple-200 flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{aiAnalysisFeedback}</span>
                  </div>
                )}

                {aiAnalysisError && (
                  <div className="bg-rose-950/60 border border-rose-800 p-3.5 rounded-xl text-xs text-rose-200 space-y-1.5 animate-in fade-in">
                    <div className="flex items-center gap-2 font-bold text-rose-300">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Aviso de Leitura da IA</span>
                    </div>
                    <p>{aiAnalysisError}</p>
                    <p className="text-[11px] text-zinc-400 pt-1">
                      Você pode preencher os campos manualmente abaixo ou configurar sua chave do Gemini na aba <strong>Configurações & Chaves</strong>.
                    </p>
                  </div>
                )}
              </div>

              {/* Publication Form */}
              <form onSubmit={handleSubmitNewHQ} className="space-y-4 pt-4 border-t border-zinc-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Título do Anúncio *
                    </label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Ex: Coleção Homem-Aranha Clássico (10 Edições) ou O Incrível Hulk #42"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Série da Revista *
                    </label>
                    <input
                      type="text"
                      value={formSeries}
                      onChange={(e) => setFormSeries(e.target.value)}
                      placeholder="Ex: Grandes Heróis Marvel"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Personagem / Categoria da Coleção
                    </label>
                    <input
                      type="text"
                      value={formFranchise}
                      onChange={(e) => setFormFranchise(e.target.value)}
                      placeholder="Ex: Homem-Aranha, Batman, Wolverine"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Editora
                    </label>
                    <select
                      value={formPublisher}
                      onChange={(e) => setFormPublisher(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white"
                    >
                      <option value="Editora Abril">Editora Abril</option>
                      <option value="Panini">Panini</option>
                      <option value="Marvel">Marvel</option>
                      <option value="DC Comics">DC Comics</option>
                      <option value="Image Comics">Image Comics</option>
                      <option value="Dark Horse">Dark Horse</option>
                      <option value="Outra">Outra / EBAL / Bloch</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Número da Edição (ou Intervalo)
                    </label>
                    <input
                      type="text"
                      value={formIssueNumber}
                      onChange={(e) => setFormIssueNumber(e.target.value)}
                      placeholder="Ex: #01 ou #01 ao #10"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Ano de Publicação
                    </label>
                    <input
                      type="number"
                      value={formYear}
                      onChange={(e) => setFormYear(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Estado de Conservação
                    </label>
                    <select
                      value={formCondition}
                      onChange={(e) => setFormCondition(e.target.value as ConditionGrade)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white"
                    >
                      <option value="otimo">Ótimo (Grampos bons, sem dobras marcantes)</option>
                      <option value="bom">Bom (Sem oxidação grave, marcas leves normais de tempo)</option>
                      <option value="ruim">Ruim (Marcas de dobras ou desgastes visíveis)</option>
                      <option value="leitura">Apenas para Leitura (Desgaste severo, miolo 100% completo)</option>
                    </select>
                  </div>

                  {/* Lot & Pricing Options */}
                  <div className="sm:col-span-2 bg-zinc-950/70 p-4 rounded-2xl border border-zinc-800 space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isCollectionCheck"
                        checked={formIsCollection}
                        onChange={(e) => setFormIsCollection(e.target.checked)}
                        className="accent-amber-500 w-4 h-4 rounded"
                      />
                      <label htmlFor="isCollectionCheck" className="text-xs font-bold text-white cursor-pointer">
                        Este anúncio é uma Coleção / Lote com múltiplas edições
                      </label>
                    </div>

                    {formIsCollection ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div>
                          <label className="block text-[11px] text-zinc-400 mb-1">
                            Qtd de Edições no Lote
                          </label>
                          <input
                            type="number"
                            min={2}
                            value={formCollectionCount}
                            onChange={(e) => setFormCollectionCount(Number(e.target.value))}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-zinc-400 mb-1">
                            Preço do Lote Fechado (com Desconto) *
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
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-amber-400 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-zinc-400 mb-1">
                            Preço por Edição Avulsa
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={formUnitPrice}
                            onChange={(e) => setFormUnitPrice(Number(e.target.value))}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-200"
                          />
                        </div>

                        <div className="sm:col-span-3 flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="allowsUnitCheck"
                            checked={formAllowsUnitPurchase}
                            onChange={(e) => setFormAllowsUnitPurchase(e.target.checked)}
                            className="accent-amber-500 w-3.5 h-3.5"
                          />
                          <label htmlFor="allowsUnitCheck" className="text-xs text-zinc-300">
                            Permitir que o cliente compre exemplares avulsos além do pacote fechado
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-xs">
                        <label className="block text-[11px] text-zinc-400 mb-1">
                          Preço da Revista (R$) *
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={formPrice}
                          onChange={(e) => setFormPrice(Number(e.target.value))}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-amber-400 font-bold"
                          required
                        />
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Sinopse e Detalhes
                    </label>
                    <textarea
                      rows={3}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Breve descrição da edição, arco e roteiro."
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold py-3.5 rounded-xl text-xs transition-transform active:scale-95 shadow-lg flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Publicar HQ no Catálogo Oficial
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: CATÁLOGO & ESTOQUE */}
          {activeTab === 'catalog' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-white font-['Space_Grotesk']">
                    Catálogo e Estoque Ativo ({hqs.length} revistas)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Gerencie os exemplares cadastrados por você e seus parceiros.
                  </p>
                </div>
              </div>

              {hqs.length === 0 ? (
                <div className="bg-[#111520] border border-zinc-800 rounded-3xl p-12 text-center space-y-3">
                  <Package className="w-10 h-10 text-zinc-700 mx-auto" />
                  <p className="text-xs text-zinc-400">Nenhuma revista cadastrada no momento.</p>
                  <button
                    onClick={() => setActiveTab('new-hq')}
                    className="bg-amber-500 text-black font-bold px-4 py-2 rounded-xl text-xs"
                  >
                    Cadastrar Primeira Revista
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {hqs.map((hq) => (
                    <div
                      key={hq.id}
                      className="bg-[#111520] border border-zinc-800 rounded-2xl p-3.5 space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <img
                          src={hq.images[0] || 'https://images.unsplash.com/photo-1601645191163-3fc0d5d34e35?auto=format&fit=crop&w=400&q=80'}
                          alt={hq.title}
                          className="w-full h-44 object-cover rounded-xl bg-zinc-950 border border-zinc-800"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-white truncate">{hq.title}</h4>
                          <span className="text-[11px] text-zinc-400 block">{hq.publisher} • {hq.year}</span>
                          <span className="text-xs font-black text-amber-400 font-['Space_Grotesk'] block mt-1">
                            {formatBRL(hq.price)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-zinc-800 pt-2 text-xs">
                        <span className="text-[10px] text-zinc-500">
                          {hq.sellerName}
                        </span>
                        <button
                          onClick={() => {
                            if (confirm(`Excluir ${hq.title}?`)) onDeleteHQ(hq.id);
                          }}
                          className="text-zinc-500 hover:text-rose-400 p-1"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GESTÃO DE COLABORADORES */}
          {activeTab === 'collaborators' && currentSeller.role === 'master' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black text-white font-['Space_Grotesk']">
                  Gestão de Parceiros & Colaboradores Externos
                </h3>
                <p className="text-xs text-zinc-400">
                  Cadastre seus parceiros para venderem no catálogo da HQ Master. O repasse e controle financeiro fica sob sua responsabilidade.
                </p>
              </div>

              {/* Master Owner Notice */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-amber-300">
                  <User className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Proprietário Master:</strong> {currentSeller.name} ({currentSeller.email}) — Seus dados, CEP de envio e chave Pix são gerenciados na aba <strong>"Meu Perfil / Dados do Dono"</strong>.
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('owner-profile')}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-3 py-1.5 rounded-lg text-xs shrink-0"
                >
                  Abrir Meu Perfil
                </button>
              </div>

              {/* Form to create collaborator */}
              <div className="bg-[#111520] border border-zinc-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  Cadastrar Novo Colaborador Parceiro
                </h4>

                <form onSubmit={handleCreatePartner} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Nome do Parceiro *</label>
                    <input
                      type="text"
                      value={cName}
                      onChange={(e) => setCName(e.target.value)}
                      placeholder="Ex: Carlos Mendes"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Nome do Box / Banca do Parceiro</label>
                    <input
                      type="text"
                      value={cStoreName}
                      onChange={(e) => setCStoreName(e.target.value)}
                      placeholder="Ex: Gibiteca Vintage RJ"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">E-mail de Login do Parceiro *</label>
                    <input
                      type="email"
                      value={cEmail}
                      onChange={(e) => setCEmail(e.target.value)}
                      placeholder="parceiro@email.com"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Senha Gerada por Você para ele *</label>
                    <input
                      type="text"
                      value={cPassword}
                      onChange={(e) => setCPassword(e.target.value)}
                      placeholder="Crie a senha do parceiro"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">CEP de Postagem do Parceiro</label>
                    <input
                      type="text"
                      value={cCep}
                      onChange={(e) => setCCep(e.target.value)}
                      placeholder="20040-002"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Cidade / Estado</label>
                    <input
                      type="text"
                      value={cAddress}
                      onChange={(e) => setCAddress(e.target.value)}
                      placeholder="Rio de Janeiro - RJ"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="sm:col-span-2 pt-1">
                    <button
                      type="submit"
                      className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Cadastrar Colaborador & Gerar Acesso
                    </button>
                  </div>
                </form>
              </div>

              {/* List of collaborators */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wide">
                  Colaboradores Parceiros Registrados ({externalPartners.length})
                </h4>

                {externalPartners.length === 0 ? (
                  <div className="border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 text-xs bg-[#10141f]">
                    Nenhum colaborador externo cadastrado ainda. Use o formulário acima para adicionar parceiros.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {externalPartners.map((s) => (
                      <div key={s.id} className="bg-[#111520] border border-zinc-800 rounded-2xl p-4 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <strong className="text-white text-sm">{s.storeName}</strong>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                            Colaborador
                          </span>
                        </div>

                        <div className="text-zinc-400">Responsável: {s.name}</div>
                        <div className="text-zinc-400">Login: <code className="text-zinc-200 font-mono">{s.email}</code></div>
                        <div className="text-zinc-400">Senha: <code className="text-amber-300 font-mono">{s.password || '••••••'}</code></div>
                        <div className="text-zinc-500 text-[11px]">Origem: {s.address} • CEP {s.cep}</div>

                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                          <button
                            type="button"
                            onClick={() => copyPartnerAccess(s)}
                            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2.5 py-1 rounded-lg flex items-center gap-1"
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
                              className="text-zinc-500 hover:text-rose-400 p-1"
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
                <h3 className="text-base font-black text-white font-['Space_Grotesk']">
                  Vendas, Pedidos & Códigos de Rastreio
                </h3>
                <p className="text-xs text-zinc-400">
                  Visualize os pedidos realizados, dados de entrega e libere os repasses aos colaboradores parceiros.
                </p>
              </div>

              {orders.length === 0 ? (
                <div className="border border-zinc-800 rounded-3xl p-12 text-center text-zinc-500 text-xs bg-[#10141f]">
                  Nenhum pedido realizado até o momento. Todos os dados são reais e serão gerados conforme os clientes efetuam compras na loja.
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((ord) => (
                    <div key={ord.id} className="bg-[#111520] border border-zinc-800 rounded-2xl p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-white text-sm">Pedido #{ord.orderNumber}</span>
                          <span className="text-zinc-400 text-xs block">
                            Destinatário: {ord.buyerName} ({ord.buyerEmail}) • Tel: {ord.buyerPhone || 'N/I'}
                          </span>
                          <span className="text-zinc-500 text-[11px] block">
                            Endereço: {ord.buyerAddress}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-amber-400 font-black text-base font-['Space_Grotesk'] block">
                            {formatBRL(ord.total)}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold uppercase">{ord.status}</span>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-1 text-xs border-t border-zinc-800/80 pt-2 text-zinc-300">
                        {ord.items.map((i, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{i.title} (Vendedor: {i.sellerName})</span>
                            <span className="font-semibold text-zinc-200">{formatBRL(i.price)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Tracking */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/80 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-400">Rastreio Correios:</span>
                          <code className="text-amber-300 font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                            {ord.trackingCode}
                          </code>
                        </div>

                        {currentSeller.role === 'master' && (
                          <div>
                            {ord.payoutReleasedToPartners ? (
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
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

          {/* TAB 5: PROPOSTAS DE DESCONTO */}
          {activeTab === 'proposals' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-black text-white font-['Space_Grotesk']">
                  Propostas de Desconto em Pacotes
                </h3>
                <p className="text-xs text-zinc-400">
                  Propostas enviadas por colecionadores comprando pacotes de revistas. Requer aprovação dos vendedores envolvidos.
                </p>
              </div>

              {proposals.length === 0 ? (
                <div className="border border-zinc-800 rounded-3xl p-12 text-center text-zinc-500 text-xs bg-[#10141f]">
                  Nenhuma proposta de desconto pendente no momento.
                </div>
              ) : (
                <div className="space-y-3">
                  {proposals.map((prop) => (
                    <div key={prop.id} className="bg-[#111520] border border-zinc-800 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-white text-sm">Colecionador: {prop.buyerName}</span>
                          <span className="text-zinc-400 text-xs block">{prop.buyerEmail}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-zinc-400 line-through block">{formatBRL(prop.originalTotal)}</span>
                          <span className="text-emerald-400 font-black text-base font-['Space_Grotesk'] block">
                            Proposta: {formatBRL(prop.proposedTotal)}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                        <button
                          onClick={() => onUpdateProposalApproval(prop.id, currentSeller.id, 'accepted')}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded-xl text-xs"
                        >
                          Aceitar Desconto
                        </button>
                        <button
                          onClick={() => onUpdateProposalApproval(prop.id, currentSeller.id, 'declined')}
                          className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1 rounded-xl text-xs"
                        >
                          Recusar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: CONFIGURAÇÕES & CHAVES */}
          {activeTab === 'settings' && currentSeller.role === 'master' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black text-white font-['Space_Grotesk']">
                  Configurações das Chaves & Integrações
                </h3>
                <p className="text-xs text-zinc-400">
                  Área privativa do proprietário (Neto). Configure e armazene suas chaves para IA, pagamentos Mercado Pago e banco de dados Supabase.
                </p>
              </div>

              {/* Form for API Keys */}
              <div className="bg-[#111520] border border-zinc-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    Chaves da IA Gemini e Mercado Pago
                  </h4>
                  {keysSavedMsg && (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <Check className="w-4 h-4" /> Chaves salvas com segurança no painel!
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveKeys} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-zinc-300">
                        Chave da API Google Gemini (GEMINI_API_KEY)
                      </label>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
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
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                    />

                    {/* Format Indicator (Supports 2026 AQ. Authentication Keys & Classic AIzaSy Keys) */}
                    {geminiKeyInput.trim().length > 0 && (
                      <div className="mt-1.5 text-[11px]">
                        {/^aq\./i.test(geminiKeyInput.trim()) || /^aq[a-z0-9_-]{10,}/i.test(geminiKeyInput.trim()) ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Formato válido: Chave de Autenticação Google AI Studio (padrão 2026: AQ.).
                          </span>
                        ) : geminiKeyInput.trim().startsWith('AIzaSy') ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Formato válido: Chave Clássica Google Gemini (AIzaSy).
                          </span>
                        ) : geminiKeyInput.trim().startsWith('APP_USR-') || geminiKeyInput.trim().startsWith('TEST-') ? (
                          <span className="text-rose-400 font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Atenção: Esta chave pertence ao Mercado Pago (APP_USR-/TEST-). Cole-a no campo Mercado Pago logo abaixo.
                          </span>
                        ) : (
                          <span className="text-amber-400 font-semibold flex items-center gap-1">
                            <Info className="w-3.5 h-3.5" /> Clique em &quot;Testar Conexão com Gemini&quot; para validar sua chave diretamente no Google AI Studio.
                          </span>
                        )}
                      </div>
                    )}

                    {/* Test Key Button */}
                    <div className="pt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleTestGeminiKey}
                        disabled={testingAiKey || !geminiKeyInput.trim()}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        {testingAiKey ? 'Testando Conexão...' : 'Testar Conexão com Gemini'}
                      </button>

                      {testAiResult && (
                        <span className={`text-xs font-semibold ${testAiResult.valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {testAiResult.valid ? '✅ Conexão bem-sucedida!' : `❌ ${testAiResult.message}`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Mercado Pago Access Token (MERCADO_PAGO_ACCESS_TOKEN)
                    </label>
                    <input
                      type="text"
                      value={mpTokenInput}
                      onChange={(e) => setMpTokenInput(e.target.value)}
                      placeholder="APP_USR-... ou TEST-..."
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                    />
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Token obtido no painel de desenvolvedor do Mercado Pago.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-4 py-2 rounded-xl text-xs shadow"
                  >
                    Salvar Chaves no Painel
                  </button>
                </form>
              </div>

              {/* Supabase Connection */}
              <div className="bg-[#111520] border border-zinc-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    Banco de Dados Supabase (PostgreSQL & Storage)
                  </h4>
                  {sbSavedMsg && (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <Check className="w-4 h-4" /> Conexão salva com sucesso!
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveSupabaseConfig} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Project URL do Supabase (sem /rest/v1/)
                    </label>
                    <input
                      type="text"
                      value={sbUrl}
                      onChange={(e) => setSbUrl(e.target.value)}
                      onBlur={() => setSbUrl(normalizeSupabaseUrl(sbUrl))}
                      placeholder="https://xyz.supabase.co"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
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
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                    {isSecretSupabaseKey(sbKey) && (
                      <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-start gap-1">
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
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${testingSupabase ? 'animate-spin' : ''}`} />
                      Testar Conexão
                    </button>
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedSql ? 'SQL Copiado!' : 'Copiar Código SQL para Criar Tabelas'}
                    </button>
                  </div>

                  {(sbTestResult || supabaseStatus) && (
                    <div
                      className={`sm:col-span-2 p-3 rounded-xl border text-xs ${
                        (sbTestResult?.tablesReady ?? supabaseStatus?.tablesReady)
                          ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                          : 'bg-amber-950/40 border-amber-700/60 text-amber-200'
                      }`}
                    >
                      <strong>Status do Banco: </strong>
                      {sbTestResult?.message || supabaseStatus?.message}
                    </div>
                  )}
                </form>

                <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 text-[11px] text-zinc-400 space-y-1">
                  <strong className="text-zinc-200 block">Passo importante para salvar tudo na nuvem (inclusive na Vercel):</strong>
                  <p>1. No painel do seu projeto Supabase, abra <strong>SQL Editor → New Query</strong>, cole o SQL abaixo e clique em <strong>RUN</strong>.</p>
                  <p>2. Em <strong>Project Settings → API Keys</strong> (ou Data API), copie a <strong>Project URL</strong> base (ex: <code className="text-zinc-200">https://xxx.supabase.co</code>, sem <code className="text-zinc-200">/rest/v1/</code>) e a chave pública <strong>Publishable key</strong> (<code className="text-emerald-300">sb_publishable_...</code>) ou legado <strong>anon public</strong> (<code className="text-emerald-300">eyJ...</code>). <strong>Nunca use a Secret key (sb_secret_...)</strong> no navegador.</p>
                  <p>3. Para funcionar automaticamente para todos os seus clientes na Vercel, cadastre também <code className="text-amber-300">VITE_SUPABASE_URL</code>, <code className="text-amber-300">VITE_SUPABASE_ANON_KEY</code> (usando a chave pública), <code className="text-amber-300">GEMINI_API_KEY</code> e <code className="text-amber-300">MERCADO_PAGO_ACCESS_TOKEN</code> nas <strong>Environment Variables</strong> da Vercel.</p>
                </div>

                <pre className="bg-zinc-950 p-3 rounded-xl text-[11px] text-zinc-400 font-mono overflow-x-auto max-h-40 border border-zinc-800">
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
