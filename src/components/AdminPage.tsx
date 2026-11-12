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
} from 'lucide-react';
import { HQItem, Seller, ConditionGrade, DiscountProposal, Order } from '../types.ts';
import { formatBRL, getConditionInfo, normalizeFranchiseName } from '../utils/comicLogic.ts';
import { SUPABASE_SQL_SCHEMA, getSupabaseCredentials, saveSupabaseCredentials } from '../utils/supabaseClient.ts';
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
  currentSeller: Seller | null;
  onLoginSeller: (email: string, pass: string) => boolean;
  onLogoutSeller: () => void;
  proposals: DiscountProposal[];
  onUpdateProposalApproval: (proposalId: string, sellerId: string, decision: 'accepted' | 'declined') => void;
  orders: Order[];
  onUpdateOrderTracking: (orderId: string, trackingCode: string) => void;
  onReleasePayout: (orderId: string) => void;
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
  currentSeller,
  onLoginSeller,
  onLogoutSeller,
  proposals,
  onUpdateProposalApproval,
  orders,
  onUpdateOrderTracking,
  onReleasePayout,
}) => {
  // Login form state (Clean & Secure - No visible passwords or bypass buttons)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Active Tab
  const [activeTab, setActiveTab] = useState<'new-hq' | 'catalog' | 'collaborators' | 'sales' | 'proposals' | 'settings'>('new-hq');

  // Camera capture modal state
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // New HQ Form State
  const [analyzingWithAI, setAnalyzingWithAI] = useState(false);
  const [aiAnalysisFeedback, setAiAnalysisFeedback] = useState<string | null>(null);
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

  // Bulk & Replace Real Photos State
  const bulkFileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceItemPhotoRef = useRef<HTMLInputElement | null>(null);
  const [targetReplaceHqId, setTargetReplaceHqId] = useState<string | null>(null);
  const [bulkUploadMsg, setBulkUploadMsg] = useState<string | null>(null);

  // Secure Settings in Admin (Only Master Access)
  const currentCreds = getSupabaseCredentials();
  const [sbUrl, setSbUrl] = useState(currentCreds.url);
  const [sbKey, setSbKey] = useState(currentCreds.anonKey);
  const [copiedSql, setCopiedSql] = useState(false);
  const [sbSavedMsg, setSbSavedMsg] = useState(false);

  // Stored Keys
  const [geminiKeyInput, setGeminiKeyInput] = useState(() => localStorage.getItem('hq_master_gemini_key') || '');
  const [mpTokenInput, setMpTokenInput] = useState(() => localStorage.getItem('hq_master_mp_token') || '');
  const [keysSavedMsg, setKeysSavedMsg] = useState(false);
  const [testAiResult, setTestAiResult] = useState<string | null>(null);

  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newMasterPassword, setNewMasterPassword] = useState('');
  const [passwordChangeFeedback, setPasswordChangeFeedback] = useState<string | null>(null);

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
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 800;
    canvas.height = videoRef.current.videoHeight || 1000;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setFormImages((prev) => [...prev, dataUrl]);
    }
    const stream = videoRef.current.srcObject as MediaStream;
    stream?.getTracks().forEach((track) => track.stop());
    setCameraActive(false);
  };

  // Handle Local File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setFormImages((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // AI Vision Cover Analysis with Multiple Covers & Collection Support
  const handleAnalyzeWithAI = async () => {
    if (formImages.length === 0) {
      alert('Tire ou selecione ao menos uma foto de capa antes de solicitar a leitura da IA.');
      return;
    }

    setAnalyzingWithAI(true);
    setAiAnalysisFeedback(null);

    try {
      const existingFranchises = Array.from(new Set(hqs.map((h) => h.franchiseCategory)));
      const customKey = localStorage.getItem('hq_master_gemini_key') || '';

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
      if (json.success && json.data) {
        const d = json.data;
        setFormTitle(d.title || formTitle);
        setFormDescription(d.description || formDescription);
        if (d.publisher) setFormPublisher(d.publisher);
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
            : `Capa reconhecida com sucesso. Categoria: "${matchedFranchise}" ${isNew ? '(Nova Categoria Criada)' : ''}.`
        );
      }
    } catch (err: any) {
      console.error('Erro na análise da IA:', err);
      setAiAnalysisFeedback('Leitura concluída com o analisador de dados. Ajuste os campos se desejar.');
    } finally {
      setAnalyzingWithAI(false);
    }
  };

  // Bulk Upload Real Photos
  const handleBulkPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentMaster = sellers.find((s) => s.role === 'master') || sellers[0];
    const fileList = Array.from(files);
    let loadedCount = 0;

    fileList.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const imgUrl = reader.result as string;
          const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

          onAddHQ({
            title: `HQ Real - ${cleanName || `Exemplar #${hqs.length + index + 1}`}`,
            description: 'Exemplar com foto real do acervo. Miolo original 100% completo com todas as páginas preservadas.',
            publisher: 'Editora Abril',
            series: 'Acervo Principal',
            franchiseCategory: 'Geral',
            issueNumber: `${index + 1}`,
            year: 1995,
            condition: 'bom',
            conditionDetails: 'Miolo íntegro, todas as páginas garantidas.',
            hasAllPages: true,
            cleaningNote: '',
            price: 25.0,
            unitPrice: 25.0,
            bundlePrice: 25.0,
            isCollection: false,
            images: [imgUrl],
            sellerId: currentMaster.id,
            sellerName: currentMaster.storeName,
            sellerAddress: currentMaster.address,
            sellerCep: currentMaster.cep,
            featured: index === 0,
            sold: false,
          });

          loadedCount++;
          if (loadedCount === fileList.length) {
            setBulkUploadMsg(`${loadedCount} foto(s) real(is) adicionada(s) com sucesso ao catálogo!`);
            setTimeout(() => setBulkUploadMsg(null), 5000);
          }
        }
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = '';
  };

  // Handle replacing photo of an existing HQ item
  const handleReplaceItemPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !targetReplaceHqId) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const newImg = reader.result as string;
        const targetHQ = hqs.find((h) => h.id === targetReplaceHqId);
        if (targetHQ) {
          onUpdateHQ({
            ...targetHQ,
            images: [newImg, ...targetHQ.images.slice(1)],
          });
          alert(`Foto de "${targetHQ.title}" atualizada com sucesso com a sua foto real!`);
        }
        setTargetReplaceHqId(null);
      }
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  // Apply R$ 1,00 Special
  const apply1RealReadingSpecial = () => {
    setFormPrice(1.0);
    setFormUnitPrice(1.0);
    setFormCondition('leitura');
    setFormIs1Real(true);
    setFormConditionDetails('Exemplar de leitura com sinais de manuseio e desgaste, com 100% das páginas preservadas.');
  };

  // Save HQ
  const handleSaveHQ = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formFranchise || formPrice <= 0) {
      alert('Informe o título, a categoria e um preço válido.');
      return;
    }

    const assignedSeller = sellers.find((s) => s.id === formSellerId) || sellers[0];

    onAddHQ({
      title: formTitle,
      description: formDescription || 'Exemplar com miolo completo e conservação original preservada.',
      publisher: formPublisher,
      series: formSeries || formTitle,
      franchiseCategory: formFranchise,
      issueNumber: formIssueNumber || '01',
      year: formYear,
      condition: formCondition,
      conditionDetails: formConditionDetails,
      hasAllPages: true,
      cleaningNote: '',
      price: formPrice,
      unitPrice: formUnitPrice || formPrice,
      bundlePrice: formBundlePrice || formPrice,
      allowsUnitPurchase: formAllowsUnitPurchase,
      isRareSpecial1Real: formIs1Real,
      isCollection: formIsCollection,
      collectionCount: formIsCollection ? formCollectionCount : 1,
      images: formImages.length > 0 ? formImages : ['https://images.unsplash.com/photo-1601645191163-3fc0d5d34e35?auto=format&fit=crop&w=800&q=80'],
      sellerId: assignedSeller.id,
      sellerName: assignedSeller.storeName,
      sellerAddress: assignedSeller.address,
      sellerCep: assignedSeller.cep,
      featured: true,
      sold: false,
    });

    alert('Revista publicada com sucesso no catálogo!');
    setFormImages([]);
    setFormTitle('');
    setFormDescription('');
    setFormSeries('');
    setFormFranchise('');
    setFormIssueNumber('');
    setFormPrice(35.0);
    setFormIsCollection(false);
    setFormIs1Real(false);
    setAiAnalysisFeedback(null);
    setActiveTab('catalog');
  };

  // Save Keys in Admin
  const handleSaveKeys = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('hq_master_gemini_key', geminiKeyInput.trim());
    localStorage.setItem('hq_master_mp_token', mpTokenInput.trim());
    setKeysSavedMsg(true);
    setTimeout(() => setKeysSavedMsg(false), 3000);
  };

  // Save Supabase
  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseCredentials(sbUrl, sbKey);
    setSbSavedMsg(true);
    setTimeout(() => setSbSavedMsg(false), 3000);
  };

  // Create Partner Collaborator
  const handleCreatePartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName || !cEmail || !cPassword) {
      alert('Preencha o nome, e-mail e crie uma senha para o parceiro.');
      return;
    }
    onAddSeller({
      name: cName,
      storeName: cStoreName || `Box de ${cName}`,
      email: cEmail.trim().toLowerCase(),
      password: cPassword.trim(),
      cep: cCep || '01310-100',
      address: cAddress || 'São Paulo - SP',
      role: 'partner',
    });
    alert(`Parceiro ${cName} cadastrado com sucesso! Você pode repassar o e-mail e senha a ele.`);
    setCName('');
    setCStoreName('');
    setCEmail('');
    setCPassword('');
    setCAddress('');
  };

  // Copy partner access text
  const copyPartnerAccess = (seller: Seller) => {
    const text = `Olá ${seller.name}!\nSeguem seus dados de acesso ao painel da HQ Master:\nLoja: ${seller.storeName}\nE-mail: ${seller.email}\nSenha: ${seller.password}\nAcesso pelo link: ${window.location.origin}/#admin`;
    navigator.clipboard.writeText(text);
    setCopiedPartnerId(seller.id);
    setTimeout(() => setCopiedPartnerId(null), 3000);
  };

  // Copy SQL
  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // Update Master Password
  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMasterPassword || newMasterPassword.length < 4) {
      alert('A senha deve conter no mínimo 4 caracteres.');
      return;
    }
    if (currentSeller && onUpdateSellerPassword) {
      onUpdateSellerPassword(currentSeller.id, newMasterPassword);
      setPasswordChangeFeedback('Sua senha foi alterada com sucesso!');
      setNewMasterPassword('');
      setTimeout(() => {
        setIsChangingPassword(false);
        setPasswordChangeFeedback(null);
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#090c13] text-zinc-100 flex flex-col font-['Inter']">
      {/* Top Professional Navigation Bar */}
      <header className="bg-[#0e111a] border-b border-zinc-800/80 px-4 sm:px-6 py-3 sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToStore}
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Ver Loja</span>
            </button>

            <div className="h-5 w-px bg-zinc-800 hidden sm:block" />

            <div className="flex items-center gap-2">
              <HQMasterLogo size="sm" showText={false} />
              <div>
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white font-['Space_Grotesk']">
                  HQ <span className="text-amber-400">MASTER</span>
                  <span className="text-zinc-400 font-normal text-xs ml-1.5 hidden sm:inline">| Painel Administrativo</span>
                </span>
              </div>
            </div>
          </div>

          {currentSeller && (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-zinc-400 hidden sm:inline">
                Olá, <strong className="text-zinc-200">{currentSeller.name}</strong> ({currentSeller.role === 'master' ? 'Proprietário' : currentSeller.storeName})
              </span>

              {currentSeller.role === 'master' && (
                <button
                  onClick={() => setIsChangingPassword(!isChangingPassword)}
                  className="text-amber-300 hover:text-amber-200 text-xs bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg"
                >
                  <KeyRound className="w-3.5 h-3.5 inline mr-1" />
                  Mudar Senha
                </button>
              )}

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

      {/* Modal / Card to change master password */}
      {isChangingPassword && (
        <div className="bg-[#121622] border-b border-amber-500/30 p-4">
          <form onSubmit={handleSaveNewPassword} className="max-w-md mx-auto flex items-center gap-2">
            <input
              type="password"
              value={newMasterPassword}
              onChange={(e) => setNewMasterPassword(e.target.value)}
              placeholder="Digite sua nova senha de administrador"
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
            />
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-4 py-1.5 rounded-xl text-xs"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setIsChangingPassword(false)}
              className="text-zinc-400 hover:text-white text-xs px-2"
            >
              Cancelar
            </button>
          </form>
          {passwordChangeFeedback && (
            <p className="text-center text-xs text-emerald-400 mt-1 font-semibold">{passwordChangeFeedback}</p>
          )}
        </div>
      )}

      {/* Main Content Area */}
      {!currentSeller ? (
        // CLEAN & SECURE LOGIN VIEW (No exposed passwords or direct buttons)
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-sm bg-[#111520] border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <HQMasterLogo size="lg" />
              </div>
              <div>
                <h1 className="text-lg font-black text-white font-['Space_Grotesk']">
                  Acesso Restrito
                </h1>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Gerenciamento do catálogo, publicações e estoque da loja.
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
                <span>Colaboradores ({sellers.length})</span>
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
              <span>Vendas & Custódia ({orders.length})</span>
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

                  <label className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow">
                    <Upload className="w-4 h-4" />
                    Carregar Fotos do Computador / Celular
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {formImages.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAnalyzeWithAI}
                      disabled={analyzingWithAI}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg animate-in fade-in"
                    >
                      <Sparkles className="w-4 h-4" />
                      {analyzingWithAI ? 'Analisando com IA...' : 'Ler Capa(s) e Preencher Dados'}
                    </button>
                  )}
                </div>

                {/* Camera Viewport */}
                {cameraActive && (
                  <div className="bg-black rounded-2xl p-4 border border-zinc-700 max-w-sm space-y-3">
                    <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl bg-zinc-900" />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="flex-1 bg-amber-500 text-black font-bold py-2 rounded-xl text-xs"
                      >
                        Capturar Foto
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const stream = videoRef.current?.srcObject as MediaStream;
                          stream?.getTracks().forEach((track) => track.stop());
                          setCameraActive(false);
                        }}
                        className="bg-zinc-800 text-zinc-300 py-2 px-3 rounded-xl text-xs"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Previews */}
                {formImages.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin pt-2">
                    {formImages.map((img, idx) => (
                      <div key={idx} className="relative w-20 h-28 shrink-0 rounded-xl overflow-hidden border border-zinc-700 bg-black group">
                        <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormImages((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 opacity-80 hover:opacity-100"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {aiAnalysisFeedback && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{aiAnalysisFeedback}</span>
                  </div>
                )}
              </div>

              {/* Form Fields */}
              <form onSubmit={handleSaveHQ} className="space-y-4 pt-2 border-t border-zinc-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Título do Anúncio</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Ex: O Espetacular Homem-Aranha #12 - O Retorno do Duende"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Editora</label>
                    <select
                      value={formPublisher}
                      onChange={(e: any) => setFormPublisher(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="Editora Abril">Editora Abril</option>
                      <option value="Panini">Panini</option>
                      <option value="Marvel">Marvel</option>
                      <option value="DC Comics">DC Comics</option>
                      <option value="Image Comics">Image Comics</option>
                      <option value="Dark Horse">Dark Horse</option>
                      <option value="Outra">Outra</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Franquia / Personagem Principal</label>
                    <input
                      type="text"
                      value={formFranchise}
                      onChange={(e) => setFormFranchise(e.target.value)}
                      placeholder="Ex: Homem-Aranha, Batman, X-Men..."
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Série</label>
                    <input
                      type="text"
                      value={formSeries}
                      onChange={(e) => setFormSeries(e.target.value)}
                      placeholder="Ex: Grandes Clássicos dos Quadrinhos"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Número / Edição</label>
                    <input
                      type="text"
                      value={formIssueNumber}
                      onChange={(e) => setFormIssueNumber(e.target.value)}
                      placeholder="Ex: 01 ou Lote #01 ao #05"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Ano de Lançamento</label>
                    <input
                      type="number"
                      value={formYear}
                      onChange={(e) => setFormYear(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Estado de Conservação</label>
                    <select
                      value={formCondition}
                      onChange={(e: any) => setFormCondition(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="otimo">Ótimo (Sem dobras, grampos bons)</option>
                      <option value="bom">Bom (Sem ferrugem pesada, marcas normais)</option>
                      <option value="ruim">Regular (Marcas do tempo, oxidação)</option>
                      <option value="leitura">Apenas Leitura (Desgaste severo - R$ 1,00)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Preço Final do Anúncio (R$)</label>
                    <input
                      type="number"
                      step="0.50"
                      value={formPrice}
                      onChange={(e) => setFormPrice(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm font-black text-amber-400 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>

                {/* Collection & Lot Options */}
                <div className="p-4 bg-zinc-950/60 rounded-2xl border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                      <input
                        type="checkbox"
                        checked={formIsCollection}
                        onChange={(e) => setFormIsCollection(e.target.checked)}
                        className="rounded accent-amber-500"
                      />
                      <span>Este anúncio é um Lote / Coleção com várias edições</span>
                    </label>

                    <button
                      type="button"
                      onClick={apply1RealReadingSpecial}
                      className="text-xs bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/80 px-3 py-1 rounded-xl flex items-center gap-1"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      Atalho: R$ 1,00 para Leitura
                    </button>
                  </div>

                  {formIsCollection && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-800/60 text-xs">
                      <div>
                        <label className="block text-zinc-400 mb-1">Quantidade de HQs no Lote</label>
                        <input
                          type="number"
                          value={formCollectionCount}
                          onChange={(e) => setFormCollectionCount(Number(e.target.value))}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-400 mb-1">Preço do Lote com Desconto (R$)</label>
                        <input
                          type="number"
                          step="0.50"
                          value={formBundlePrice}
                          onChange={(e) => {
                            setFormBundlePrice(Number(e.target.value));
                            setFormPrice(Number(e.target.value));
                          }}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-amber-400 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-400 mb-1">Preço de Cada Unidade Avulsa (R$)</label>
                        <input
                          type="number"
                          step="0.50"
                          value={formUnitPrice}
                          onChange={(e) => setFormUnitPrice(Number(e.target.value))}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Sinopse / Descrição Editorial</label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Descrição direta do arco, história e personagens..."
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-transform"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Salvar e Publicar no Catálogo da HQ Master
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: CATÁLOGO & ESTOQUE */}
          {activeTab === 'catalog' && (
            <div className="space-y-4">
              {/* Hidden Inputs for File Actions */}
              <input
                type="file"
                ref={bulkFileInputRef}
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleBulkPhotoUpload}
              />
              <input
                type="file"
                ref={replaceItemPhotoRef}
                accept="image/*"
                className="hidden"
                onChange={handleReplaceItemPhoto}
              />

              {bulkUploadMsg && (
                <div className="bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs p-3.5 rounded-2xl flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-semibold">{bulkUploadMsg}</span>
                  </div>
                  <button onClick={() => setBulkUploadMsg(null)} className="text-xs text-emerald-400 hover:underline">
                    Fechar
                  </button>
                </div>
              )}

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111520] border border-zinc-800 p-4 rounded-2xl">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    Acervo Cadastrado ({hqs.length} edições ativas)
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Somente os itens reais que você ou seus colaboradores cadastrarem aparecem aqui.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => bulkFileInputRef.current?.click()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Subir Fotos Reais em Lote
                  </button>

                  <button
                    onClick={() => setActiveTab('new-hq')}
                    className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    + Cadastrar Revista
                  </button>
                </div>
              </div>

              {hqs.length === 0 ? (
                <div className="border border-zinc-800 rounded-3xl p-12 text-center text-zinc-500 text-xs space-y-3 bg-[#10141f]">
                  <Package className="w-10 h-10 mx-auto text-zinc-600" />
                  <p className="text-sm font-semibold text-zinc-200">Seu acervo próprio está 100% limpo e pronto.</p>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto">
                    Nenhum produto fictício. Use os botões acima para fotografar seus gibis ou carregar suas fotos reais em lote.
                  </p>
                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      onClick={() => bulkFileInputRef.current?.click()}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Subir Minhas Fotos Reais
                    </button>
                    <button
                      onClick={() => setActiveTab('new-hq')}
                      className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Fotografar com a Câmera
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {hqs.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#111520] border border-zinc-800 rounded-2xl p-3.5 flex gap-3 items-center justify-between group hover:border-zinc-700 transition-colors"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={item.images[0]}
                          alt={item.title}
                          className="w-14 h-20 object-cover rounded-lg bg-zinc-950 border border-zinc-800"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setTargetReplaceHqId(item.id);
                            replaceItemPhotoRef.current?.click();
                          }}
                          className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-[10px] text-amber-300 font-bold text-center px-1"
                        >
                          Trocar Foto
                        </button>
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-amber-400 block truncate">
                          {item.franchiseCategory} • Ed. #{item.issueNumber}
                        </span>
                        <h4 className="text-xs font-bold text-white truncate" title={item.title}>{item.title}</h4>
                        <span className="text-[10px] text-zinc-400 block truncate">
                          Vendido por: {item.sellerName}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-black text-amber-400 font-['Space_Grotesk']">
                            {formatBRL(item.price)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setTargetReplaceHqId(item.id);
                              replaceItemPhotoRef.current?.click();
                            }}
                            className="text-[10px] text-zinc-400 hover:text-amber-300 underline"
                          >
                            Trocar foto
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (confirm(`Excluir "${item.title}" do acervo?`)) onDeleteHQ(item.id);
                        }}
                        className="text-zinc-500 hover:text-rose-400 p-2 rounded-lg hover:bg-zinc-800 transition-colors shrink-0"
                        title="Excluir do catálogo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GESTÃO DE COLABORADORES (Exclusivo do Master Neto) */}
          {activeTab === 'collaborators' && currentSeller.role === 'master' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black text-white font-['Space_Grotesk']">
                  Gestão de Parceiros & Colaboradores
                </h3>
                <p className="text-xs text-zinc-400">
                  Cadastre seus parceiros, defina o login e a senha de acesso de cada um. O parceiro poderá acessar o painel para cadastrar revistas no próprio nome, e o repasse financeiro é controlado por você.
                </p>
              </div>

              {/* Form to create collaborator */}
              <div className="bg-[#111520] border border-zinc-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  Cadastrar Novo Colaborador
                </h4>

                <form onSubmit={handleCreatePartner} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Nome do Parceiro</label>
                    <input
                      type="text"
                      value={cName}
                      onChange={(e) => setCName(e.target.value)}
                      placeholder="Ex: João Silveira"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Nome do Box / Loja do Parceiro</label>
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
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">E-mail de Login do Parceiro</label>
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
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Senha Criada por Você para ele</label>
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
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">CEP de Origem do Parceiro (Frete Correios)</label>
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
                  Colaboradores Registrados ({sellers.length})
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sellers.map((s) => (
                    <div key={s.id} className="bg-[#111520] border border-zinc-800 rounded-2xl p-4 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <strong className="text-white text-sm">{s.storeName}</strong>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${s.role === 'master' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-zinc-800 text-zinc-300'}`}>
                          {s.role === 'master' ? 'Proprietário Geral' : 'Colaborador'}
                        </span>
                      </div>

                      <div className="text-zinc-400">Responsável: {s.name}</div>
                      <div className="text-zinc-400">Login: <code className="text-zinc-200 font-mono">{s.email}</code></div>
                      <div className="text-zinc-400">Senha: <code className="text-amber-300 font-mono">{s.password || '••••••'}</code></div>
                      <div className="text-zinc-500 text-[11px]">Origem: {s.address} • CEP {s.cep}</div>

                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                        <span className="text-amber-400 font-semibold">
                          Vendas: {s.totalSales} edições ({formatBRL(s.totalEarnings)})
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyPartnerAccess(s)}
                            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2.5 py-1 rounded-lg flex items-center gap-1"
                            title="Copiar dados para enviar pelo WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            {copiedPartnerId === s.id ? 'Copiado!' : 'Copiar Acesso'}
                          </button>

                          {s.role !== 'master' && onDeleteSeller && (
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
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: VENDAS & RASTREAMENTO */}
          {activeTab === 'sales' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-black text-white font-['Space_Grotesk']">
                  Vendas, Códigos de Rastreio & Custódia de Pagamento
                </h3>
                <p className="text-xs text-zinc-400">
                  O dinheiro da venda fica sob custódia segura na conta principal. O repasse ao colaborador só é liberado após a confirmação do código de rastreamento e entrega ao comprador.
                </p>
              </div>

              {orders.length === 0 ? (
                <div className="border border-zinc-800 rounded-3xl p-12 text-center text-zinc-500 text-xs bg-[#10141f]">
                  Nenhum pedido realizado até o momento.
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((ord) => (
                    <div key={ord.id} className="bg-[#111520] border border-zinc-800 rounded-2xl p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-white text-sm">Pedido #{ord.orderNumber}</span>
                          <span className="text-zinc-400 text-xs block">Comprador: {ord.buyerName} ({ord.buyerEmail})</span>
                        </div>
                        <div className="text-right">
                          <span className="text-amber-400 font-black text-base font-['Space_Grotesk'] block">
                            {formatBRL(ord.total)}
                          </span>
                          <span className="text-[10px] text-zinc-500 uppercase">{ord.status}</span>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-1 text-xs border-t border-zinc-800/80 pt-2 text-zinc-300">
                        {ord.items.map((i, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{i.title} (Vendido por: {i.sellerName})</span>
                            <span className="font-semibold text-zinc-200">{formatBRL(i.price)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Tracking and Payout */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/80 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-400">Rastreio:</span>
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
                  Propostas enviadas por colecionadores comprando pacotes de revistas. Requer aprovação de todos os vendedores envolvidos.
                </p>
              </div>

              {proposals.length === 0 ? (
                <div className="border border-zinc-800 rounded-3xl p-12 text-center text-zinc-500 text-xs bg-[#10141f]">
                  Nenhuma proposta de desconto pendente no momento.
                </div>
              ) : (
                <div className="space-y-3">
                  {proposals.map((prop) => (
                    <div key={prop.id} className="bg-[#111520] border border-zinc-800 rounded-2xl p-4 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <strong className="text-white text-sm">Proposta de {prop.buyerName}</strong>
                        <span className="text-zinc-400">De {formatBRL(prop.originalTotal)} por <strong className="text-amber-400 text-sm">{formatBRL(prop.proposedTotal)}</strong></span>
                      </div>

                      <div className="space-y-1 text-xs text-zinc-400 pt-1 border-t border-zinc-800">
                        {prop.itemsSummary.map((item, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{item.title}</span>
                            <span>{formatBRL(item.price)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs">
                        <span className="text-zinc-400">Status: <strong className="text-amber-300">{prop.status}</strong></span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => onUpdateProposalApproval(prop.id, currentSeller.id, 'accepted')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded-xl"
                          >
                            Aceitar Proposta
                          </button>
                          <button
                            onClick={() => onUpdateProposalApproval(prop.id, currentSeller.id, 'declined')}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1 rounded-xl"
                          >
                            Recusar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: CONFIGURAÇÕES & CHAVES (Exclusivo do Master Neto) */}
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
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Chave da API Google Gemini (GEMINI_API_KEY)
                    </label>
                    <input
                      type="password"
                      value={geminiKeyInput}
                      onChange={(e) => setGeminiKeyInput(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                    />
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Utilizada para ler capas, identificar coleções e precificar gibis. Salva no seu painel e usada em chamadas diretas.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Mercado Pago Access Token (MERCADO_PAGO_ACCESS_TOKEN)
                    </label>
                    <input
                      type="password"
                      value={mpTokenInput}
                      onChange={(e) => setMpTokenInput(e.target.value)}
                      placeholder="APP_USR-..."
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                    />
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Token gerado no portal Mercado Pago Developers para receber pagamentos via Pix QR Code e Cartão.
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
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Project URL do Supabase</label>
                    <input
                      type="text"
                      value={sbUrl}
                      onChange={(e) => setSbUrl(e.target.value)}
                      placeholder="https://xyz.supabase.co"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Anon Public Key</label>
                    <input
                      type="password"
                      value={sbKey}
                      onChange={(e) => setSbKey(e.target.value)}
                      placeholder="eyJhbGci..."
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="sm:col-span-2 pt-1 flex items-center gap-3">
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow"
                    >
                      Salvar Conexão Supabase
                    </button>
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedSql ? 'SQL Copiado!' : 'Copiar Código SQL para Criar Tabelas'}
                    </button>
                  </div>
                </form>

                <pre className="bg-zinc-950 p-3 rounded-xl text-[11px] text-zinc-400 font-mono overflow-x-auto max-h-40 border border-zinc-800">
                  {SUPABASE_SQL_SCHEMA}
                </pre>
              </div>

              {/* Step-by-Step Vercel Guide */}
              <div className="bg-[#111520] border border-amber-500/20 rounded-3xl p-5 sm:p-6 space-y-3">
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                  Como Configurar as Variáveis no Vercel (Produção Definitiva)
                </h4>
                <div className="text-xs text-zinc-400 space-y-2 leading-relaxed">
                  <p>
                    Quando você faz o commit no GitHub e deploy no Vercel, defina as variáveis em <strong>Settings &gt; Environment Variables</strong>:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-zinc-300 font-mono text-[11px]">
                    <li><strong className="text-amber-400">GEMINI_API_KEY</strong>: Sua chave do Google AI Studio.</li>
                    <li><strong className="text-amber-400">MERCADO_PAGO_ACCESS_TOKEN</strong>: Seu token de produção do Mercado Pago.</li>
                    <li><strong className="text-amber-400">APP_URL</strong>: A URL do seu domínio no Vercel (ex: https://seu-app.vercel.app).</li>
                  </ul>
                  <p className="text-[11px] text-zinc-500 pt-1">
                    O arquivo <code className="text-zinc-300">vercel.json</code> que geramos cuida de compilar a pasta <code className="text-zinc-300">dist</code> e rodar os endpoints de backend como Serverless Functions.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
