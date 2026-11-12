import React, { useState, useRef } from 'react';
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
  MessageSquareQuote,
  Eye,
  Trash2,
  Settings,
  CreditCard,
  KeyRound,
  RefreshCw,
  Info,
} from 'lucide-react';
import { HQItem, Seller, ConditionGrade, DiscountProposal, Order } from '../types.ts';
import { formatBRL, getConditionInfo, normalizeFranchiseName } from '../utils/comicLogic.ts';
import { SUPABASE_SQL_SCHEMA, getSupabaseCredentials, saveSupabaseCredentials } from '../utils/supabaseClient.ts';

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
  onResetToDemoHQs,
  onClearDemoHQs,
  sellers,
  onAddSeller,
  currentSeller,
  onLoginSeller,
  onLogoutSeller,
  proposals,
  onUpdateProposalApproval,
  orders,
  onUpdateOrderTracking,
  onReleasePayout,
}) => {
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Active Tab in Admin
  const [activeTab, setActiveTab] = useState<'new-hq' | 'catalog' | 'sales' | 'proposals' | 'partners' | 'integrations'>('new-hq');

  // Camera capture modal state
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // New HQ Form State
  const [analyzingWithAI, setAnalyzingWithAI] = useState(false);
  const [aiAnalysisFeedback, setAiAnalysisFeedback] = useState<string | null>(null);
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPublisher, setFormPublisher] = useState<any>('Editora Abril');
  const [formSeries, setFormSeries] = useState('');
  const [formFranchise, setFormFranchise] = useState('');
  const [formIssueNumber, setFormIssueNumber] = useState('');
  const [formYear, setFormYear] = useState<number>(1990);
  const [formPrice, setFormPrice] = useState<number>(35.0);
  const [formCondition, setFormCondition] = useState<ConditionGrade>('bom');
  const [formConditionDetails, setFormConditionDetails] = useState('');
  const [formIsCollection, setFormIsCollection] = useState(false);
  const [formCollectionCount, setFormCollectionCount] = useState<number>(1);
  const [formIs1Real, setFormIs1Real] = useState(false);
  const [formSellerId, setFormSellerId] = useState(currentSeller?.id || 'master');

  // Supabase Settings State
  const currentCreds = getSupabaseCredentials();
  const [sbUrl, setSbUrl] = useState(currentCreds.url);
  const [sbKey, setSbKey] = useState(currentCreds.anonKey);
  const [copiedSql, setCopiedSql] = useState(false);
  const [sbSavedMsg, setSbSavedMsg] = useState(false);

  // Partner Registration inside Admin
  const [pName, setPName] = useState('');
  const [pStoreName, setPStoreName] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pPassword, setPPassword] = useState('');
  const [pCep, setPCep] = useState('');
  const [pAddress, setPAddress] = useState('');

  // Bulk & Replace Real Photos State
  const bulkFileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceItemPhotoRef = useRef<HTMLInputElement | null>(null);
  const [targetReplaceHqId, setTargetReplaceHqId] = useState<string | null>(null);
  const [bulkUploadMsg, setBulkUploadMsg] = useState<string | null>(null);

  // Handle Bulk Upload of Real Photos
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
            description: 'Exemplar com foto real capturada e enviada pelo colecionador. 100% das páginas preservadas.',
            publisher: 'Editora Abril',
            series: 'Acervo Principal',
            franchiseCategory: 'Geral',
            issueNumber: `${index + 1}`,
            year: 1995,
            condition: 'bom',
            conditionDetails: 'Miolo íntegro, higienizado a seco com pano limpo.',
            hasAllPages: true,
            cleaningNote: 'Higienizada a seco exclusivamente com pano limpo.',
            price: 25.0,
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
            setTimeout(() => setBulkUploadMsg(null), 6000);
          }
        }
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = '';
  };

  // Handle replacing photo of a single HQ item
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
          alert(`Foto da HQ "${targetHQ.title}" substituída com sucesso pela sua foto real!`);
        }
        setTargetReplaceHqId(null);
      }
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  // Handle Login
  const handleDoLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const success = onLoginSeller(loginEmail, loginPassword);
    if (!success) {
      setLoginError('Credenciais não reconhecidas. Verifique o e-mail e a senha informados.');
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

  // AI Vision Cover Analysis
  const handleAnalyzeWithAI = async () => {
    if (formImages.length === 0) {
      alert('Tire ou selecione ao menos uma foto da capa antes de solicitar a leitura.');
      return;
    }

    setAnalyzingWithAI(true);
    setAiAnalysisFeedback(null);

    try {
      const existingFranchises = Array.from(new Set(hqs.map((h) => h.franchiseCategory)));
      const res = await fetch('/api/gemini/analyze-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: formImages[0],
          mimeType: 'image/jpeg',
          existingFranchises,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        setFormTitle(d.title || formTitle);
        setFormDescription(d.description || formDescription);
        setFormPublisher(d.publisher || formPublisher);
        setFormSeries(d.series || formSeries);
        setFormIssueNumber(d.issueNumber || formIssueNumber);
        setFormYear(Number(d.yearEstimate) || formYear);
        setFormPrice(Number(d.suggestedPrice) || formPrice);
        if (d.conditionGradeSuggestion) {
          setFormCondition(d.conditionGradeSuggestion as ConditionGrade);
        }

        const matchedFranchise = normalizeFranchiseName(d.franchiseCategory || 'Quadrinhos Clássicos', existingFranchises);
        setFormFranchise(matchedFranchise);

        const isNew = !existingFranchises.includes(matchedFranchise);
        setAiAnalysisFeedback(
          isNew
            ? `Capa reconhecida. Nova categoria sugerida e criada: "${matchedFranchise}".`
            : `Capa reconhecida. Edição vinculada à coleção existente: "${matchedFranchise}".`
        );
      }
    } catch (err: any) {
      console.error('Erro na análise:', err);
      setAiAnalysisFeedback('Leitura concluída. Verifique e ajuste os dados abaixo se necessário.');
    } finally {
      setAnalyzingWithAI(false);
    }
  };

  // Apply R$ 1,00 Special
  const apply1RealReadingSpecial = () => {
    setFormPrice(1.0);
    setFormCondition('leitura');
    setFormIs1Real(true);
    setFormConditionDetails('Exemplar de leitura com sinais de uso e desgaste temporal, com 100% das páginas preservadas para leitura.');
  };

  // Save HQ
  const handleSaveHQ = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formFranchise || formPrice <= 0) {
      alert('Informe o título, a categoria e um valor válido.');
      return;
    }

    const assignedSeller = sellers.find((s) => s.id === formSellerId) || sellers[0];

    onAddHQ({
      title: formTitle,
      description: formDescription || 'Exemplar com todas as páginas preservadas para leitura e coleção.',
      publisher: formPublisher,
      series: formSeries || formTitle,
      franchiseCategory: formFranchise,
      issueNumber: formIssueNumber || '01',
      year: formYear || 1990,
      condition: formCondition,
      conditionDetails: formConditionDetails,
      hasAllPages: true,
      cleaningNote: 'Higienizada delicadamente apenas com pano limpo e seco.',
      price: Number(formPrice),
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

    alert('Publicação salva com sucesso no catálogo!');
    setFormImages([]);
    setFormTitle('');
    setFormDescription('');
    setFormFranchise('');
    setFormSeries('');
    setFormIssueNumber('');
    setFormPrice(35.0);
    setFormIs1Real(false);
    setFormIsCollection(false);
    setAiAnalysisFeedback(null);
    setActiveTab('catalog');
  };

  // Copy SQL
  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseCredentials(sbUrl, sbKey);
    setSbSavedMsg(true);
    setTimeout(() => setSbSavedMsg(false), 3000);
  };

  const handleCreatePartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName || !pEmail) return;
    onAddSeller({
      name: pName,
      storeName: pStoreName || `Acervo de ${pName}`,
      email: pEmail,
      password: pPassword || '123',
      cep: pCep || '01310-100',
      address: pAddress || 'São Paulo - SP',
      role: 'partner',
    });
    alert('Vendedor parceiro cadastrado com sucesso!');
    setPName('');
    setPStoreName('');
    setPEmail('');
    setPPassword('');
    setPCep('');
    setPAddress('');
  };

  return (
    <div className="min-h-screen bg-[#0b0d13] text-zinc-100 flex flex-col font-['Inter']">
      {/* Top Professional Navigation Bar */}
      <header className="bg-[#0e1118] border-b border-zinc-800/80 px-4 sm:px-6 py-3.5 sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToStore}
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar à Loja Virtual</span>
            </button>

            <div className="h-5 w-px bg-zinc-800 hidden sm:block" />

            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white font-['Space_Grotesk']">
                  BancaHQ <span className="text-amber-400 font-normal text-xs sm:text-sm">| Painel Administrativo</span>
                </span>
                {currentSeller && (
                  <span className="text-[10px] bg-amber-500/15 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30 hidden md:inline-block">
                    {currentSeller.role === 'master' ? 'Administrador Central' : currentSeller.storeName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {currentSeller && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400 hidden sm:inline">
                Conectado como: <strong className="text-zinc-200">{currentSeller.email}</strong>
              </span>
              <button
                onClick={onLogoutSeller}
                className="text-xs text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-750 border border-zinc-700/80 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                Encerrar Sessão
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      {!currentSeller ? (
        // Login View
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md bg-[#11141d] border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-black text-white font-['Space_Grotesk']">
                Acesso Administrativo
              </h1>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Área restrita para gestão de catálogo, publicações, faturamento e integrações da loja.
              </p>
            </div>

            {loginError && (
              <div className="bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleDoLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  E-mail do Administrador ou Parceiro
                </label>
                <input
                  type="text"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="neto.mmp@gmail.com (ou digite apenas: admin)"
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
                  placeholder="admin (ou 123456)"
                  className="w-full bg-zinc-950 border border-zinc-700/90 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="p-3.5 bg-amber-500/10 rounded-2xl border border-amber-500/30 text-xs text-zinc-300 space-y-1.5">
                <div className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Credenciais de Administrador Master:
                </div>
                <div className="text-[11px] leading-relaxed">
                  <strong>E-mail:</strong> <code className="text-amber-300 font-mono bg-black/40 px-1 py-0.5 rounded">neto.mmp@gmail.com</code> ou <code className="text-amber-300 font-mono bg-black/40 px-1 py-0.5 rounded">admin</code>
                </div>
                <div className="text-[11px] leading-relaxed">
                  <strong>Senha:</strong> <code className="text-amber-300 font-mono bg-black/40 px-1 py-0.5 rounded">admin</code> (ou 123456)
                </div>
                <div className="text-[11px] text-zinc-400 pt-1 border-t border-amber-500/20">
                  <strong>Parceiros:</strong> <code className="text-zinc-300 font-mono">carlos@gibis90.com</code> / senha <code className="text-zinc-300 font-mono">123</code>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold py-3 rounded-xl text-xs transition-transform active:scale-95 shadow-lg flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Acessar Painel com Minhas Credenciais
              </button>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-[#11141d] px-2 text-zinc-500 font-bold">ou acesse com 1 clique</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onLoginSeller('neto.mmp@gmail.com', 'admin');
                }}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700 font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Entrar Direto como Administrador (Neto)
              </button>
            </form>
          </div>
        </div>
      ) : (
        // Authenticated Dashboard
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
          {/* Dashboard Navigation Tabs */}
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
              Publicar HQ com Leitor Visual
            </button>

            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'catalog'
                  ? 'bg-amber-500 text-black font-bold shadow'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Catálogo & Estoque ({hqs.length})
            </button>

            <button
              onClick={() => setActiveTab('sales')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'sales'
                  ? 'bg-amber-500 text-black font-bold shadow'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              Vendas & Rastreamento ({orders.length})
            </button>

            <button
              onClick={() => setActiveTab('proposals')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'proposals'
                  ? 'bg-amber-500 text-black font-bold shadow'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
              }`}
            >
              <MessageSquareQuote className="w-3.5 h-3.5" />
              Propostas de Desconto ({proposals.length})
            </button>

            {currentSeller.role === 'master' && (
              <button
                onClick={() => setActiveTab('partners')}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                  activeTab === 'partners'
                    ? 'bg-amber-500 text-black font-bold shadow'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Vendedores Parceiros ({sellers.length})
              </button>
            )}

            <button
              onClick={() => setActiveTab('integrations')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'integrations'
                  ? 'bg-amber-500 text-black font-bold shadow'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              Integrações & Conexões
            </button>
          </div>

          {/* Tab 1: Nova Publicação com Câmera e IA */}
          {activeTab === 'new-hq' && (
            <div className="space-y-6 max-w-4xl">
              {/* Photo Upload / Capture Box */}
              <div className="bg-[#11141d] border border-zinc-800 rounded-3xl p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Camera className="w-4 h-4 text-amber-400" />
                      1. Fotos da Revista ou Coleção (Suas Fotos Reais)
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Tire fotos pela câmera ou envie do seu aparelho. As fotos cadastradas aqui são gravadas no seu acervo e banco de dados.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Tirar Foto com a Câmera
                    </button>

                    <label className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer border border-zinc-700">
                      <Upload className="w-3.5 h-3.5" />
                      Upload de Arquivo
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Live Camera Viewfinder */}
                {cameraActive && (
                  <div className="bg-black rounded-2xl overflow-hidden p-3 border border-amber-500/50 space-y-3">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full max-h-72 object-cover rounded-xl mx-auto"
                    />
                    <div className="flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow"
                      >
                        <Camera className="w-4 h-4" />
                        Capturar Capa Agora
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const stream = videoRef.current?.srcObject as MediaStream;
                          stream?.getTracks().forEach((t) => t.stop());
                          setCameraActive(false);
                        }}
                        className="bg-zinc-800 text-zinc-400 hover:text-white px-3 py-2 rounded-xl text-xs"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Photos List */}
                {formImages.length > 0 ? (
                  <div className="space-y-3 pt-2">
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                      {formImages.map((img, idx) => (
                        <div key={idx} className="relative w-24 h-32 rounded-xl overflow-hidden border border-zinc-700 shrink-0 group">
                          <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setFormImages(formImages.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs opacity-90 hover:opacity-100"
                            title="Remover foto"
                          >
                            ✕
                          </button>
                          {idx === 0 && (
                            <span className="absolute bottom-1 left-1 bg-amber-500 text-black text-[9px] font-black px-1.5 rounded">
                              Capa
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800">
                      <div>
                        <span className="text-xs font-bold text-white block">
                          Reconhecimento da Capa por IA
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          Identifica título, ano, editora e agrupa na coleção certa.
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleAnalyzeWithAI}
                        disabled={analyzingWithAI}
                        className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-50"
                      >
                        <Sparkles className="w-4 h-4 text-black fill-current" />
                        {analyzingWithAI ? 'Processando Imagem...' : 'Ler Capa com Inteligência Visual'}
                      </button>
                    </div>

                    {aiAnalysisFeedback && (
                      <div className="bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs p-3 rounded-xl flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{aiAnalysisFeedback}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border border-dashed border-zinc-800 rounded-2xl p-6 text-center text-zinc-500 text-xs">
                    Nenhuma foto selecionada. Fotografe pela câmera ou selecione arquivos para iniciar.
                  </div>
                )}
              </div>

              {/* Form Details */}
              <form onSubmit={handleSaveHQ} className="bg-[#11141d] border border-zinc-800 rounded-3xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <h3 className="text-sm font-bold text-white">
                    2. Dados da Edição & Preço
                  </h3>

                  <button
                    type="button"
                    onClick={apply1RealReadingSpecial}
                    className="bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-700/60 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Flame className="w-3.5 h-3.5 text-rose-400 fill-current" />
                    Precificar como Peça de Leitura (R$ 1,00)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Título do Anúncio</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Ex: O Espetacular Homem-Aranha #12 - O Retorno do Duende Verde"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Coleção / Franquia de Agrupamento
                    </label>
                    <input
                      type="text"
                      value={formFranchise}
                      onChange={(e) => setFormFranchise(e.target.value)}
                      placeholder="Ex: Homem-Aranha, Batman, Superman, Justiceiro"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-500"
                      required
                    />
                    <span className="text-[10px] text-zinc-500">
                      Revistas do mesmo herói são agrupadas juntas na mesma coleção.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Editora</label>
                    <select
                      value={formPublisher}
                      onChange={(e) => setFormPublisher(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="Editora Abril">Editora Abril (Formatinhos Clássicos)</option>
                      <option value="Panini">Panini Comics</option>
                      <option value="Marvel">Marvel Comics</option>
                      <option value="DC Comics">DC Comics</option>
                      <option value="Image Comics">Image Comics</option>
                      <option value="Dark Horse">Dark Horse</option>
                      <option value="Outra">Outra / EBAL / Bloch</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Série / Título Principal</label>
                    <input
                      type="text"
                      value={formSeries}
                      onChange={(e) => setFormSeries(e.target.value)}
                      placeholder="Ex: O Espetacular Homem-Aranha"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">Edição</label>
                      <input
                        type="text"
                        value={formIssueNumber}
                        onChange={(e) => setFormIssueNumber(e.target.value)}
                        placeholder="#12"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">Ano</label>
                      <input
                        type="number"
                        value={formYear}
                        onChange={(e) => setFormYear(Number(e.target.value))}
                        placeholder="1989"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Lote / Coleção Fechada */}
                  <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white">
                      <input
                        type="checkbox"
                        checked={formIsCollection}
                        onChange={(e) => setFormIsCollection(e.target.checked)}
                        className="accent-indigo-500"
                      />
                      <span>Anúncio de Lote / Coleção Fechada?</span>
                    </label>
                    {formIsCollection && (
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">Quantidade de HQs no lote</label>
                        <input
                          type="number"
                          min="2"
                          value={formCollectionCount}
                          onChange={(e) => setFormCollectionCount(Number(e.target.value))}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Estado de Conservação com os 4 Graus */}
                  <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 space-y-2">
                    <label className="block text-xs font-semibold text-white">
                      Grau de Conservação
                    </label>
                    <select
                      value={formCondition}
                      onChange={(e) => setFormCondition(e.target.value as ConditionGrade)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="otimo">1. Ótimo (Grampos bons, sem dobras graves, marcas mínimas)</option>
                      <option value="bom">2. Bom (Sem grampos enferrujados, marcas na capa)</option>
                      <option value="ruim">3. Ruim (Grampos oxidados, dobras aparentes, desgaste por traça)</option>
                      <option value="leitura">4. Apenas para Leitura (Capa solta, marcas de cola, a partir de R$ 1)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Observações Honestadas do Exemplar
                    </label>
                    <input
                      type="text"
                      value={formConditionDetails}
                      onChange={(e) => setFormConditionDetails(e.target.value)}
                      placeholder="Ex: Capa com vinco suave, miolo firme e sem rabiscos. 100% das páginas preservadas."
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Descrição / Sinopse</label>
                    <textarea
                      rows={2}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Descrição editorial do arco de histórias e personagens..."
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Preço de Venda (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">R$</span>
                      <input
                        type="number"
                        step="0.50"
                        value={formPrice}
                        onChange={(e) => setFormPrice(Number(e.target.value))}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2 pl-9 pr-3 text-sm font-black text-amber-400 focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Vendido por</label>
                    <select
                      value={formSellerId}
                      onChange={(e) => setFormSellerId(e.target.value)}
                      disabled={currentSeller.role !== 'master'}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      {sellers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.storeName} ({s.role === 'master' ? 'Loja Principal' : `Parceiro: ${s.name}`})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-transform"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Salvar e Publicar na Loja
                </button>
              </form>
            </div>
          )}

          {/* Tab 2: Catálogo & Estoque */}
          {activeTab === 'catalog' && (
            <div className="space-y-4">
              {/* Photo Origin Clarification Banner */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs">Origem das Fotos & Gestão do Acervo</h4>
                    <p className="text-zinc-400 text-[11px] leading-relaxed mt-0.5">
                      As edições iniciais contêm fotos ilustrativas para você visualizar o visual da loja. 
                      Quando você tira fotos pela câmera ou envia arquivos, elas ficam salvas no seu banco de dados. 
                      Você pode limpar os exemplos de demonstração a qualquer momento.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      if (confirm('Deseja limpar as fotos de demonstração e deixar apenas as HQs que você cadastrar?')) {
                        onClearDemoHQs();
                      }
                    }}
                    className="bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/60 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Remover Exemplos e Deixar Só Minhas Fotos
                  </button>

                  <button
                    onClick={() => {
                      if (confirm('Deseja restaurar as HQs de exemplo de demonstração?')) {
                        onResetToDemoHQs();
                      }
                    }}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 p-1.5 rounded-xl text-xs transition-colors"
                    title="Restaurar dados de teste"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

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
                <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs p-3.5 rounded-2xl flex items-center justify-between shadow-lg animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-semibold">{bulkUploadMsg}</span>
                  </div>
                  <button
                    onClick={() => setBulkUploadMsg(null)}
                    className="text-xs text-emerald-400 hover:underline"
                  >
                    Fechar
                  </button>
                </div>
              )}

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#11141d] border border-zinc-800 p-3.5 rounded-2xl">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    Edições Publicadas no Acervo ({hqs.length})
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Você pode subir suas fotos reais em lote ou fotografar uma a uma.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => bulkFileInputRef.current?.click()}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-transform active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Subir Fotos Reais em Lote (PC/Celular)
                  </button>

                  <button
                    onClick={() => setActiveTab('new-hq')}
                    className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-transform active:scale-95"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    + Nova Revista (com IA)
                  </button>
                </div>
              </div>

              {hqs.length === 0 ? (
                <div className="border border-zinc-800 rounded-3xl p-12 text-center text-zinc-500 text-xs space-y-3">
                  <Package className="w-10 h-10 mx-auto text-zinc-600" />
                  <p className="text-sm font-semibold text-zinc-300">Seu catálogo está vazio e pronto para receber suas fotos reais.</p>
                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      onClick={() => bulkFileInputRef.current?.click()}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Subir Minhas Fotos Reais Agora
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
                      className="bg-[#11141d] border border-zinc-800 rounded-2xl p-3.5 flex gap-3 items-center justify-between group hover:border-zinc-700 transition-colors"
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
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-[10px] text-amber-300 font-bold text-center px-1"
                          title="Clique para substituir por uma foto real que você tirou"
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

          {/* Tab 3: Vendas & Rastreio */}
          {activeTab === 'sales' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Controle de Vendas, Rastreamento & Repasse Financeiro
                </h3>
                <p className="text-xs text-zinc-400">
                  O valor recebido fica sob custódia e só é repassado ao vendedor colaborador após a entrega ser confirmada ao comprador.
                </p>
              </div>

              {orders.length === 0 ? (
                <div className="border border-zinc-800 rounded-3xl p-12 text-center text-zinc-500 text-xs">
                  Nenhum pedido registrado até o momento.
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="bg-[#11141d] border border-zinc-800 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-black text-amber-400 block font-['Space_Grotesk']">
                            Pedido: {ord.orderNumber}
                          </span>
                          <span className="text-xs text-white">
                            Comprador: {ord.buyerName} ({ord.buyerEmail}) • CEP: {ord.buyerCep}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-base font-black text-white">
                            {formatBRL(ord.total)}
                          </span>
                          <span className="text-[10px] text-zinc-400 block">
                            Frete: {formatBRL(ord.shippingCost)} ({ord.shippingMethod})
                          </span>
                        </div>
                      </div>

                      <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-amber-400" />
                          <span className="font-semibold text-zinc-300">Código de Rastreamento:</span>
                          <input
                            type="text"
                            defaultValue={ord.trackingCode || ''}
                            onBlur={(e) => onUpdateOrderTracking(ord.id, e.target.value)}
                            placeholder="Ex: BR123456789SP"
                            className="bg-zinc-900 border border-zinc-700 px-2 py-1 rounded text-xs text-amber-300 font-mono font-bold"
                          />
                        </div>

                        {currentSeller.role === 'master' && (
                          <div>
                            {ord.payoutReleasedToPartners ? (
                              <span className="text-emerald-400 font-bold flex items-center gap-1 text-xs">
                                <CheckCircle2 className="w-4 h-4" /> Repasse Financeiro Concluído
                              </span>
                            ) : (
                              <button
                                onClick={() => onReleasePayout(ord.id)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-colors"
                              >
                                Liberar Repasse ao Parceiro
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

          {/* Tab 4: Propostas de Desconto */}
          {activeTab === 'proposals' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Propostas de Desconto para Pacotes ({proposals.length})
                </h3>
                <p className="text-xs text-zinc-400">
                  Ofertas enviadas por compradores para lotes com 2 ou mais edições. Quando envolve múltiplos vendedores, a aprovação é individual e unânime.
                </p>
              </div>

              {proposals.length === 0 ? (
                <div className="border border-zinc-800 rounded-3xl p-12 text-center text-zinc-500 text-xs">
                  Nenhuma proposta de desconto pendente no momento.
                </div>
              ) : (
                <div className="space-y-3">
                  {proposals.map((prop) => (
                    <div
                      key={prop.id}
                      className="bg-[#11141d] border border-zinc-800 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-white block">
                            {prop.buyerName} ({prop.buyerEmail})
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            Data: {new Date(prop.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[10px] text-zinc-500 block uppercase">Original / Proposta</span>
                            <span className="text-xs text-zinc-400 line-through mr-2">
                              {formatBRL(prop.originalTotal)}
                            </span>
                            <span className="text-sm font-black text-amber-400">
                              {formatBRL(prop.proposedTotal)}
                            </span>
                          </div>

                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                            prop.status === 'approved'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : prop.status === 'rejected'
                              ? 'bg-rose-950 text-rose-300 border-rose-800'
                              : 'bg-amber-950 text-amber-300 border-amber-800'
                          }`}>
                            {prop.status === 'approved' ? 'Aprovada' : prop.status === 'rejected' ? 'Recusada' : 'Aguardando Aprovação'}
                          </span>
                        </div>
                      </div>

                      <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 space-y-1 text-xs">
                        <span className="text-[11px] font-semibold text-zinc-400 block">Itens no Pacote:</span>
                        {prop.itemsSummary.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-zinc-300">
                            <span>• {item.title} ({item.sellerName})</span>
                            <span className="font-medium text-amber-400">{formatBRL(item.price)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800">
                        <div className="text-xs text-zinc-400">
                          Status dos Votos: {JSON.stringify(prop.sellerApprovals)}
                        </div>

                        {prop.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onUpdateProposalApproval(prop.id, currentSeller.id, 'accepted')}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs"
                            >
                              Aceitar Proposta
                            </button>
                            <button
                              onClick={() => onUpdateProposalApproval(prop.id, currentSeller.id, 'declined')}
                              className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs"
                            >
                              Recusar Proposta
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Gestão de Vendedores Parceiros */}
          {activeTab === 'partners' && currentSeller.role === 'master' && (
            <div className="space-y-6">
              <div className="bg-[#11141d] border border-zinc-800 rounded-3xl p-5 sm:p-6 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  Cadastrar Novo Vendedor Parceiro
                </h3>

                <form onSubmit={handleCreatePartner} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Nome do Parceiro</label>
                    <input
                      type="text"
                      value={pName}
                      onChange={(e) => setPName(e.target.value)}
                      placeholder="Ex: João da Silva"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Nome da Loja do Parceiro</label>
                    <input
                      type="text"
                      value={pStoreName}
                      onChange={(e) => setPStoreName(e.target.value)}
                      placeholder="Ex: Gibiteca Vintage SP"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">E-mail de Login</label>
                    <input
                      type="email"
                      value={pEmail}
                      onChange={(e) => setPEmail(e.target.value)}
                      placeholder="parceiro@email.com"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Senha de Acesso</label>
                    <input
                      type="password"
                      value={pPassword}
                      onChange={(e) => setPPassword(e.target.value)}
                      placeholder="Senha para o painel"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">CEP de Origem (Cálculo do Frete)</label>
                    <input
                      type="text"
                      value={pCep}
                      onChange={(e) => setPCep(e.target.value)}
                      placeholder="01310-100"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Cidade / Estado</label>
                    <input
                      type="text"
                      value={pAddress}
                      onChange={(e) => setPAddress(e.target.value)}
                      placeholder="São Paulo - SP"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="sm:col-span-2 pt-1">
                    <button
                      type="submit"
                      className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-4 py-2.5 rounded-xl text-xs"
                    >
                      Cadastrar e Liberar Acesso do Parceiro
                    </button>
                  </div>
                </form>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wide">
                  Vendedores Cadastrados ({sellers.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sellers.map((s) => (
                    <div key={s.id} className="bg-[#11141d] border border-zinc-800 rounded-2xl p-4 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <strong className="text-white text-sm">{s.storeName}</strong>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          {s.role === 'master' ? 'Loja Principal' : 'Parceiro'}
                        </span>
                      </div>
                      <div className="text-zinc-400">Responsável: {s.name} ({s.email})</div>
                      <div className="text-zinc-500 text-[11px]">Origem: {s.address} • CEP {s.cep}</div>
                      <div className="text-amber-400 font-semibold pt-1 border-t border-zinc-800">
                        Vendas Realizadas: {s.totalSales} edições ({formatBRL(s.totalEarnings)})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 6: Central de Integrações & Conexões (Mercado Livre, Supabase, Gemini) */}
          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black text-white font-['Space_Grotesk']">
                  Central de Conexões & Integrações
                </h3>
                <p className="text-xs text-zinc-400">
                  Acesso rápido para visualização e configuração dos serviços de Inteligência Artificial, Pagamentos e Banco de Dados.
                </p>
              </div>

              {/* Step by Step Guide Box */}
              <div className="bg-gradient-to-br from-[#121722] to-[#0d1017] border border-amber-500/30 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                    <CheckCircle2 className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white font-['Space_Grotesk']">
                      Passo a Passo para Colocar no Ar e Funcionando 100%
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Siga estas 4 etapas simples para configurar suas chaves e seu catálogo próprio:
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                  {/* Step 1 */}
                  <div className="bg-[#0b0d13]/90 border border-zinc-800 rounded-2xl p-4 space-y-1.5">
                    <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      Passo 1 • Supabase
                    </span>
                    <h4 className="text-xs font-bold text-white">Conectar seu Banco de Dados</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Acesse <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-amber-400 underline">supabase.com</a>, copie a <strong>Project URL</strong> e a <strong>Anon Key</strong> e salve no formulário abaixo. Em seguida, clique em <strong>Copiar Código SQL</strong> e execute no <em>SQL Editor</em> do Supabase.
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-[#0b0d13]/90 border border-zinc-800 rounded-2xl p-4 space-y-1.5">
                    <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      Passo 2 • IA Gemini
                    </span>
                    <h4 className="text-xs font-bold text-white">Reconhecimento de Capas Ativo</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      A IA <code className="text-emerald-400">gemini-3.8-flash</code> já está conectada via servidor seguro. Quando for subir para o <strong>Vercel</strong> ou servidor próprio, basta adicionar a variável de ambiente <code className="text-zinc-200">GEMINI_API_KEY</code>.
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-[#0b0d13]/90 border border-zinc-800 rounded-2xl p-4 space-y-1.5">
                    <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                      Passo 3 • Mercado Pago
                    </span>
                    <h4 className="text-xs font-bold text-white">Ativar Checkout Pix e Cartão</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      No portal <a href="https://www.mercadopago.com.br/developers" target="_blank" rel="noreferrer" className="text-blue-400 underline">Mercado Pago Developers</a>, pegue o seu <strong>Access Token</strong> (inicia com <code className="text-zinc-200">APP_USR-...</code>) e insira no <code className="text-zinc-200">.env</code> do servidor.
                    </p>
                  </div>

                  {/* Step 4 */}
                  <div className="bg-[#0b0d13]/90 border border-zinc-800 rounded-2xl p-4 space-y-1.5">
                    <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                      Passo 4 • Fotos Reais
                    </span>
                    <h4 className="text-xs font-bold text-white">Subir Suas Próprias Capas</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Vá na aba <strong>Catálogo</strong>, clique em <strong>Subir Fotos Reais em Lote</strong> para carregar todas as fotos do seu celular/PC de uma só vez, e clique em <strong>Remover Exemplos</strong> para exibir exclusivamente o seu estoque.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 Main Integration Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Gemini AI Vision */}
                <div className="bg-[#11141d] border border-zinc-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Google Gemini AI
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                        Ativo no Servidor
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Modelo <strong className="text-zinc-200">gemini-3.8-flash</strong> rodando no backend para reconhecimento de capas, agrupamento de coleções e avaliação histórica.
                    </p>
                  </div>
                  <div className="text-[11px] text-zinc-500 pt-2 border-t border-zinc-850">
                    A chave de API é injetada de forma segura nas variáveis de ambiente do servidor, protegendo suas credenciais contra vazamento no navegador.
                  </div>
                </div>

                {/* 2. Mercado Livre / Mercado Pago */}
                <div className="bg-[#11141d] border border-zinc-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-[#009ee3]" />
                        Mercado Livre / Pago
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                        Checkout Dinâmico
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Geração de preferência e links de checkout na hora com suporte a Pix QR Code e cartão de crédito.
                    </p>
                  </div>
                  <div className="text-[11px] text-zinc-500 pt-2 border-t border-zinc-850">
                    Definido via <code className="text-zinc-300">MERCADO_PAGO_ACCESS_TOKEN</code> no arquivo de ambiente do servidor.
                  </div>
                </div>

                {/* 3. Correios */}
                <div className="bg-[#11141d] border border-zinc-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-amber-400" />
                        Logística dos Correios
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                        Cálculo Automático
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Cálculo de PAC e SEDEX em tempo real por CEP de origem e destino, além de opção de retirada presencial.
                    </p>
                  </div>
                  <div className="text-[11px] text-zinc-500 pt-2 border-t border-zinc-850">
                    Origem padrão configurada no endereço e CEP do vendedor no painel.
                  </div>
                </div>
              </div>

              {/* Supabase Connection & SQL Editor Section */}
              <div className="bg-[#11141d] border border-zinc-800 rounded-3xl p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-400" />
                      Conexão com Banco de Dados Supabase (PostgreSQL & Storage)
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Informe os dados da sua conta Supabase para sincronização direta do acervo e armazenamento de capas.
                    </p>
                  </div>

                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Compatível com Vercel
                  </span>
                </div>

                <form onSubmit={handleSaveSupabaseConfig} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Project URL do Supabase</label>
                    <input
                      type="text"
                      value={sbUrl}
                      onChange={(e) => setSbUrl(e.target.value)}
                      placeholder="https://exemplo.supabase.co"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Anon Public Key (Chave Pública)</label>
                    <input
                      type="password"
                      value={sbKey}
                      onChange={(e) => setSbKey(e.target.value)}
                      placeholder="eyJhbGciOi..."
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center gap-3 pt-1">
                    <button
                      type="submit"
                      className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-4 py-2 rounded-xl text-xs"
                    >
                      Salvar Conexão do Supabase
                    </button>

                    {sbSavedMsg && (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <Check className="w-4 h-4" /> Configuração salva com sucesso!
                      </span>
                    )}
                  </div>
                </form>

                {/* SQL Code Box */}
                <div className="pt-4 border-t border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">Script SQL Pronto para o Supabase</h4>
                      <p className="text-[11px] text-zinc-400">
                        Copie e cole este código no menu <strong>SQL Editor</strong> do seu Supabase para criar as tabelas e permissões automaticamente.
                      </p>
                    </div>

                    <button
                      onClick={handleCopySql}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedSql ? 'Copiado!' : 'Copiar Código SQL'}
                    </button>
                  </div>

                  <pre className="bg-zinc-950 p-4 rounded-2xl text-[11px] text-zinc-300 font-mono overflow-x-auto max-h-56 border border-zinc-800 scrollbar-thin">
                    {SUPABASE_SQL_SCHEMA}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
