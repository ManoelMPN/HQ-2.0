import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();

app.use(express.json({ limit: '40mb' }));
app.use(express.urlencoded({ extended: true, limit: '40mb' }));

/**
 * Validates whether a key matches known Google Gemini / AI Studio key formats:
 * - New 2026 Google AI Studio Authentication Keys: start with "AQ." (case-insensitive)
 * - Classic Google Gemini API Keys: start with "AIzaSy"
 */
function classifyGeminiKey(rawKey: string): {
  isRecognized: boolean;
  keyType: 'aq_auth_2026' | 'aiza_classic' | 'other_service' | 'unknown';
  warning?: string;
} {
  const key = (rawKey || '').trim();
  if (!key) {
    return { isRecognized: false, keyType: 'unknown', warning: 'Chave vazia.' };
  }

  if (/^aq\./i.test(key) || /^aq[a-z0-9_-]{10,}/i.test(key)) {
    return { isRecognized: true, keyType: 'aq_auth_2026' };
  }

  if (key.startsWith('AIzaSy')) {
    return { isRecognized: true, keyType: 'aiza_classic' };
  }

  if (key.startsWith('APP_USR-') || key.startsWith('TEST-')) {
    return {
      isRecognized: false,
      keyType: 'other_service',
      warning: 'Esta chave começa com APP_USR-/TEST-, que pertence ao Mercado Pago e não ao Google Gemini.',
    };
  }

  if (key.startsWith('eyJ') || key.startsWith('sb_')) {
    return {
      isRecognized: false,
      keyType: 'other_service',
      warning: 'Esta chave parece ser um token JWT / Supabase, não uma chave do Google Gemini.',
    };
  }

  return { isRecognized: true, keyType: 'unknown' };
}

function createAiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const envGeminiKey = (process.env.GEMINI_API_KEY || '').trim();
const defaultAiClient: GoogleGenAI | null = envGeminiKey ? createAiClient(envGeminiKey) : null;

async function generateCoverAnalysisWithGemini(
  client: GoogleGenAI,
  imageParts: Array<{ inlineData: { mimeType: string; data: string } }>,
  systemInstruction: string,
  userPrompt: string,
  responseSchema: any
): Promise<{ text: string; modelUsed: string }> {
  const candidateModels = ['gemini-4-hydrogen', 'gemini-2.5-flash'];
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: {
          parts: [...imageParts, { text: userPrompt }],
        },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema,
        },
      });

      if (response.text) {
        return { text: response.text, modelUsed: model };
      }
    } catch (err: any) {
      lastError = err;
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('api key') || msg.includes('unauthorized') || msg.includes('permission') || msg.includes('401') || msg.includes('403')) {
        throw err;
      }
      console.warn(`Model ${model} failed in api/index.ts:`, err?.message);
    }
  }

  throw lastError || new Error('Nenhum modelo Gemini retornou resposta.');
}

// 0. Test & Validate Gemini API Key endpoint
app.post('/api/gemini/validate-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    const cleanKey = (apiKey || '').trim();

    if (!cleanKey) {
      return res.status(400).json({
        valid: false,
        error: 'Chave não informada.',
      });
    }

    const check = classifyGeminiKey(cleanKey);
    if (!check.isRecognized && check.keyType === 'other_service') {
      return res.status(400).json({
        valid: false,
        isInvalidFormat: true,
        error: check.warning,
      });
    }

    const testClient = createAiClient(cleanKey);
    const candidateModels = ['gemini-4-hydrogen', 'gemini-2.5-flash'];
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const response = await testClient.models.generateContent({
          model,
          contents: 'Responda apenas: OK',
        });
        if (response.text) {
          return res.json({
            valid: true,
            model,
            keyFormat: check.keyType === 'aq_auth_2026' ? 'Chave de Autenticação Google AI Studio (AQ.)' : 'Chave Google Gemini',
            message: `Chave validada e conectada com sucesso ao modelo ${model}!`,
          });
        }
      } catch (err: any) {
        lastError = err;
        const msg = (err?.message || '').toLowerCase();
        if (msg.includes('api key') || msg.includes('unauthorized') || msg.includes('permission') || msg.includes('401') || msg.includes('403')) {
          throw err;
        }
      }
    }

    throw lastError || new Error('Não foi possível validar a chave com a API do Google.');
  } catch (err: any) {
    return res.status(400).json({
      valid: false,
      error: `Erro ao validar chave com o Google: ${err?.message || 'Chave inválida ou sem permissão'}`,
    });
  }
});

// 1. Gemini Vision Cover Analysis (Single or Multi-cover Lot Recognition)
app.post('/api/gemini/analyze-cover', async (req, res) => {
  try {
    const {
      imageBase64,
      imagesBase64 = [],
      mimeType = 'image/jpeg',
      existingFranchises = [],
    } = req.body;

    const allImages: string[] = [];
    if (Array.isArray(imagesBase64) && imagesBase64.length > 0) {
      allImages.push(...imagesBase64);
    } else if (imageBase64) {
      allImages.push(imageBase64);
    }

    if (allImages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nenhuma foto enviada para análise.',
      });
    }

    const customApiKey = ((req.headers['x-gemini-api-key'] as string) || '').trim();
    const effectiveKey = customApiKey || envGeminiKey;

    if (!effectiveKey) {
      return res.status(400).json({
        success: false,
        needsKey: true,
        error: 'Chave do Google Gemini não configurada. Cole sua chave (AQ.... ou AIzaSy...) na aba "Configurações & Chaves" do Painel Admin.',
      });
    }

    const check = classifyGeminiKey(effectiveKey);
    if (!check.isRecognized && check.keyType === 'other_service') {
      return res.status(400).json({
        success: false,
        isInvalidFormat: true,
        error: check.warning,
      });
    }

    const clientToUse = customApiKey || !defaultAiClient ? createAiClient(effectiveKey) : defaultAiClient;

    const franchisesPrompt = existingFranchises.length > 0
      ? `Categorias já existentes no catálogo: [${existingFranchises.join(', ')}]. Se o item pertencer a uma dessas franquias/temas, reutilize exatamente esse nome. Caso seja novo, crie uma categoria clara (ex: "Homem-Aranha", "Batman", "Livros de Fantasia", "Star Wars", "Dragon Ball", "Board Games", "Action Figures").`
      : 'Defina uma categoria clara para o tema, universo ou franquia principal do item (ex: "Homem-Aranha", "Batman", "Star Wars", "Livros", "Dragon Ball", "Action Figures", "Turma da Mônica").';

    const systemInstruction = `Você é um perito catalogador e avaliador de itens geeks e colecionáveis no Brasil — incluindo histórias em quadrinhos (HQs), mangás, livros, action figures, estatuetas, Funko Pop, cards, board games e colecionáveis em geral.
Sua tarefa é ler e identificar COM PRECISÃO ABSOLUTA o que está na(s) foto(s) enviada(s) (${allImages.length} imagem/imagens).

REGRAS OBRIGATÓRIAS DE FIDELIDADE À IMAGEM:
1. IDENTIFIQUE O ITEM REAL: pode ser HQ, mangá, livro, action figure, Funko Pop, card ou outro colecionável. Leia todos os textos visíveis na capa, lombada, caixa ou embalagem: título exato, subtítulo/personagem, número REAL da edição/volume/modelo impresso na capa ou caixa, fabricante/editora (Abril, Panini, JBC, Darkside, Intrínseca, Companhia das Letras, Bandai, Hasbro, Funko, Mattel, NECA, Hot Toys, Lego, etc.) e data/ano se visível.
2. NÚMERO REAL DA EDIÇÃO/MODELO: nunca invente "#01" por padrão. Leia o número real que aparece na capa (ex: "#12", "#45", "Vol. 3", "#01 ao #05"). Se for livro único, action figure ou item sem numeração sequencial, use "Única" ou o número/escala do modelo (ex: "1/10", "#452").
3. NÃO INVENTE nem use dados genéricos. Descreva exatamente o item fotografado.
4. ${franchisesPrompt}
5. PREÇO E LOTES:
   - Estime o valor médio real de mercado brasileiro (em BRL) considerando raridade, tipo do produto e estado aparente na foto.
   - Se houver múltiplos itens ou foto de lote/coleção, avalie o preço unitário individual justo e calcule o preço do lote fechado com 15% a 25% de desconto.
   - Se for item único, unitPrice e bundlePrice devem ter o mesmo valor do suggestedPrice.
6. DESCRIÇÃO: Escreva 2 a 3 frases objetivas descrevendo especificamente o item, edição/versão ou personagem mostrado na foto e o estado visual observado (capa, caixa, pintura ou páginas).`;

    const imageParts = allImages.slice(0, 6).map((b64) => {
      const detectedMime = b64.match(/^data:(image\/[\w+.-]+);base64,/i)?.[1] || mimeType;
      const cleanData = b64.replace(/^data:image\/[^;]+;base64,/i, '');
      return {
        inlineData: {
          mimeType: detectedMime,
          data: cleanData,
        },
      };
    });

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Título ou nome exato do item identificado (HQ, livro, mangá, action figure, etc.) + número real se houver' },
        publisher: { type: Type.STRING, description: 'Editora ou marca/fabricante real visível na peça ou embalagem (ex: Editora Abril, Panini, JBC, Companhia das Letras, Darkside, Bandai, Funko, Hasbro, NECA, etc.)' },
        series: { type: Type.STRING, description: 'Nome exato da série, linha, coleção ou autor' },
        franchiseCategory: { type: Type.STRING, description: 'Franquia, personagem, gênero literário ou linha colecionável principal' },
        issueNumber: { type: Type.STRING, description: 'Número real lido na capa/caixa (ex: #42, Vol. 2, #01 ao #05) ou Única se não numerado' },
        yearEstimate: { type: Type.INTEGER, description: 'Ano real ou aproximado de lançamento do item identificado' },
        suggestedPrice: { type: Type.NUMBER, description: 'Preço justo de mercado brasileiro em BRL' },
        unitPrice: { type: Type.NUMBER, description: 'Preço unitário por item em BRL' },
        bundlePrice: { type: Type.NUMBER, description: 'Preço do lote fechado com desconto em BRL (igual ao unitário se 1 item)' },
        isCollection: { type: Type.BOOLEAN, description: 'true se houver múltiplos itens/fotos de lote, false se item único' },
        collectionCount: { type: Type.INTEGER, description: 'Quantidade de itens identificados' },
        allowsUnitPurchase: { type: Type.BOOLEAN, description: 'true se for lote e permitir venda avulsa' },
        description: { type: Type.STRING, description: 'Descrição específica do item e estado visual observado na foto' },
        conditionGradeSuggestion: { type: Type.STRING, description: 'otimo, bom, ruim ou leitura conforme estado visível na foto' },
        keyCharacters: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Personagens ou elementos centrais visíveis' },
      },
      required: [
        'title',
        'publisher',
        'series',
        'franchiseCategory',
        'issueNumber',
        'yearEstimate',
        'suggestedPrice',
        'description',
        'conditionGradeSuggestion',
      ],
    };

    let result: { text: string; modelUsed: string };
    try {
      result = await generateCoverAnalysisWithGemini(
        clientToUse,
        imageParts,
        systemInstruction,
        `Identifique exatamente qual item geek/colecionável (HQ, mangá, livro, action figure, Funko, card, board game ou lote) está nesta(s) ${allImages.length} imagem(ns). Leia os textos reais, número exato da capa/caixa, marca/editora, ano, estado visual e sugira preço realista em BRL.`,
        responseSchema
      );
    } catch (genErr: any) {
      console.error('Gemini vision API error in api/index.ts:', genErr);
      return res.status(400).json({
        success: false,
        error: `Erro na leitura pela IA Gemini: ${genErr?.message || 'Verifique se a chave está correta e ativa no Google AI Studio.'}`,
        details: genErr?.message,
      });
    }

    const parsed = JSON.parse(result.text);
    const isNewCollection = !existingFranchises.some(
      (f: string) => f.toLowerCase() === (parsed.franchiseCategory || '').toLowerCase()
    );

    const isCol = Boolean(parsed.isCollection ?? (allImages.length > 1));
    const count = Number(parsed.collectionCount) || (allImages.length > 1 ? allImages.length : 1);
    const unit = Number(parsed.unitPrice || parsed.suggestedPrice || 25.0);
    const bundle = Number(parsed.bundlePrice || (isCol ? Math.round(unit * count * 0.8) : unit));

    return res.json({
      success: true,
      source: result.modelUsed,
      data: {
        ...parsed,
        isCollection: isCol,
        collectionCount: count,
        unitPrice: unit,
        bundlePrice: bundle,
        suggestedPrice: isCol ? bundle : unit,
        allowsUnitPurchase: parsed.allowsUnitPurchase ?? isCol,
        isNewCollectionCategory: isNewCollection,
      },
    });
  } catch (error: any) {
    console.error('Error in analyze-cover route:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro interno ao processar a imagem da HQ.',
    });
  }
});

// 2. Dynamic Mercado Pago / PIX Checkout Preference
app.post('/api/mercadopago/create-preference', async (req, res) => {
  try {
    const { items, buyer, shippingCost = 0, discount = 0, storePixKey = 'neto.mmp@gmail.com' } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'Nenhum item informado para pagamento.' });
    }

    if (!buyer || !buyer.name || !buyer.email || !buyer.cep || !buyer.street || !buyer.number || !buyer.city || !buyer.state) {
      return res.status(400).json({
        error: 'Endereço incompleto. Todos os campos de entrega são obrigatórios para emissão do pedido.',
      });
    }

    const subtotal = items.reduce(
      (acc: number, item: any) => acc + Number(item.price) * (item.quantity || 1),
      0
    );

    const numericDiscount = Math.max(0, Number(discount) || 0);
    const discountedSubtotal = Math.max(1, subtotal - numericDiscount);
    const discountRatio = subtotal > 0 ? discountedSubtotal / subtotal : 1;
    const total = Math.max(1, discountedSubtotal + Number(shippingCost || 0));
    const orderId = `GG-${Date.now().toString().slice(-6)}`;

    const customMpToken = ((req.headers['x-mp-access-token'] as string) || '').trim();
    const mpAccessToken = customMpToken || (process.env.MERCADO_PAGO_ACCESS_TOKEN || '').trim();

    if (mpAccessToken && (mpAccessToken.startsWith('APP_USR-') || mpAccessToken.startsWith('TEST-'))) {
      try {
        const preferencePayload = {
          items: items.map((i: any) => ({
            id: i.id || i.hqId,
            title: numericDiscount > 0 ? `${i.title} (c/ Desconto Negociado)` : i.title,
            unit_price: Number((Number(i.price) * discountRatio).toFixed(2)),
            quantity: i.quantity || 1,
            currency_id: 'BRL',
          })),
          shipments: {
            cost: Number(shippingCost),
            mode: 'not_specified',
          },
          payer: {
            name: buyer.name,
            email: buyer.email,
            phone: {
              number: buyer.phone || '',
            },
            identification: {
              type: 'CPF',
              number: (buyer.cpf || '').replace(/\D/g, ''),
            },
            address: {
              street_name: buyer.street,
              street_number: Number(buyer.number) || 1,
              zip_code: buyer.cep.replace(/\D/g, ''),
            },
          },
          external_reference: orderId,
        };

        const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mpAccessToken}`,
          },
          body: JSON.stringify(preferencePayload),
        });

        if (mpRes.ok) {
          const mpData = await mpRes.json();
          return res.json({
            success: true,
            mode: 'live_mercadopago',
            preferenceId: mpData.id,
            initPoint: mpData.init_point || mpData.sandbox_init_point,
            orderId,
            total,
            pixKey: storePixKey,
          });
        }
      } catch (err: any) {
        console.warn('Mercado Pago API preference call error:', err?.message);
      }
    }

    const pixPayload = `00020126580014BR.GOV.BCB.PIX0136${storePixKey}520400005303986540${total.toFixed(2)}5802BR5909GEEK GRID6009SAO PAULO62070503***6304`;

    return res.json({
      success: true,
      mode: 'in_store_pix',
      preferenceId: `PIX-${orderId}`,
      initPoint: null,
      orderId,
      total,
      pixKey: storePixKey,
      pixQrCode: pixPayload,
      message: 'Pedido registrado com sucesso. Efetue o pagamento via PIX para envio imediato.',
    });
  } catch (error: any) {
    console.error('Error creating checkout preference:', error);
    return res.status(500).json({ error: error.message || 'Erro ao gerar checkout.' });
  }
});

// 3. Freight calculation
app.post('/api/frete/calcular', (req, res) => {
  try {
    const { buyerCep, sellerCep = '01310-100', itemCount = 1 } = req.body;

    if (!buyerCep || buyerCep.replace(/\D/g, '').length < 8) {
      return res.status(400).json({ error: 'CEP do comprador inválido.' });
    }

    const cleanBuyer = buyerCep.replace(/\D/g, '');
    const cleanSeller = sellerCep.replace(/\D/g, '');
    const isSameState = cleanBuyer.substring(0, 2) === cleanSeller.substring(0, 2);

    const basePac = isSameState ? 14.9 : 24.5;
    const baseSedex = isSameState ? 22.9 : 39.8;
    const extraWeight = Math.max(0, (itemCount - 1) * 1.8);

    const pacCost = Number((basePac + extraWeight).toFixed(2));
    const sedexCost = Number((baseSedex + extraWeight).toFixed(2));

    return res.json({
      success: true,
      buyerCep: cleanBuyer,
      sellerCep: cleanSeller,
      options: [
        {
          code: 'PAC',
          name: 'Correios PAC (Econômico)',
          price: pacCost,
          days: isSameState ? '3 a 5 dias úteis' : '6 a 10 dias úteis',
          insuranceIncluded: true,
        },
        {
          code: 'SEDEX',
          name: 'Correios SEDEX (Expresso)',
          price: sedexCost,
          days: isSameState ? '1 a 2 dias úteis' : '2 a 4 dias úteis',
          insuranceIncluded: true,
        },
      ],
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao calcular frete.' });
  }
});

export default app;
