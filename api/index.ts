import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Shared server-side Gemini client
const geminiApiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (geminiApiKey) {
  aiClient = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  return res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    geminiConfigured: !!geminiApiKey,
    mercadopagoConfigured: !!process.env.MERCADO_PAGO_ACCESS_TOKEN,
  });
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

    // Collect all image base64 strings
    const allImages: string[] = [];
    if (Array.isArray(imagesBase64) && imagesBase64.length > 0) {
      allImages.push(...imagesBase64);
    } else if (imageBase64) {
      allImages.push(imageBase64);
    }

    if (allImages.length === 0) {
      return res.status(400).json({ error: 'Nenhuma foto enviada para análise.' });
    }

    // Allow key from header or environment
    const customApiKey = req.headers['x-gemini-api-key'] as string;
    const activeKey = customApiKey || process.env.GEMINI_API_KEY;

    let localAiClient = aiClient;
    if (customApiKey && (!localAiClient || customApiKey !== process.env.GEMINI_API_KEY)) {
      localAiClient = new GoogleGenAI({
        apiKey: customApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }

    const franchisesPrompt = existingFranchises.length > 0
      ? `Categorias existentes no acervo: [${existingFranchises.join(', ')}]. Se o gibi pertencer a uma dessas, use exatamente o mesmo nome. Caso seja inédito (ex: Justiceiro, Demolidor, Spawn, Batman), crie uma nova categoria concisa.`
      : 'Crie uma categoria concisa para o personagem ou franquia principal (ex: "Homem-Aranha", "Batman", "Superman", "Justiceiro", "X-Men").';

    const systemInstruction = `Você é um avaliador e historiador de revistas em quadrinhos no Brasil (Editora Abril, Panini, EBAL, Mythos, etc.).
Analise a capa ou conjunto de capas enviadas (${allImages.length} imagem/imagens) e retorne estritamente um JSON estruturado.
Regras de Precificação e Lotes:
1. Se houver mais de uma capa ou se a capa mostrar um lote/coleção, identifique se faz sentido vender como Lote Completo (coleção/saga sequencial).
2. Forneça o preço da UNIDADE individual e o PREÇO DO LOTE COMPLETO com desconto justo de colecionador (aproximadamente 15% a 25% de desconto no lote).
3. Se for uma edição avulsa única, o preço unitário e o preço total serão o mesmo.
4. Gere uma sinopse direta, profissional e atraente (2 a 3 frases no máximo), focada no arco e personagens, sem frases clichês ou menções repetitivas de limpeza.`;

    if (localAiClient) {
      try {
        const imageParts = allImages.slice(0, 5).map((b64) => ({
          inlineData: {
            mimeType,
            data: b64.replace(/^data:image\/\w+;base64,/, ''),
          },
        }));

        const response = await localAiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: {
            parts: [
              ...imageParts,
              {
                text: `Analise estas ${allImages.length} foto(s) de gibi(s) para catalogação na loja HQ Master. Identifique franquia, série, número, ano, estado de conservação, preço unitário e preço de lote com desconto se for coleção.`,
              },
            ],
          },
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: 'Título comercial do anúncio' },
                publisher: { type: Type.STRING, description: 'Editora responsável' },
                series: { type: Type.STRING, description: 'Série da revista' },
                franchiseCategory: { type: Type.STRING, description: 'Franquia ou personagem' },
                issueNumber: { type: Type.STRING, description: 'Número da edição ou intervalo de edições' },
                yearEstimate: { type: Type.INTEGER, description: 'Ano aproximado de lançamento' },
                suggestedPrice: { type: Type.NUMBER, description: 'Preço total do anúncio em BRL' },
                unitPrice: { type: Type.NUMBER, description: 'Preço por exemplar avulso em BRL' },
                bundlePrice: { type: Type.NUMBER, description: 'Preço promocional do lote completo em BRL' },
                isCollection: { type: Type.BOOLEAN, description: 'Se é um lote ou coleção com múltiplas edições' },
                collectionCount: { type: Type.INTEGER, description: 'Quantidade de edições na coleção' },
                allowsUnitPurchase: { type: Type.BOOLEAN, description: 'Se permite comprar avulso além do lote' },
                description: { type: Type.STRING, description: 'Descrição direta e concisa da história' },
                conditionGradeSuggestion: { type: Type.STRING, description: 'Grau sugerido: otimo, bom, ruim ou leitura' },
                keyCharacters: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Personagens' },
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
            },
          },
        });

        const rawText = response.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          const isNewCollection = !existingFranchises.some(
            (f: string) => f.toLowerCase() === (parsed.franchiseCategory || '').toLowerCase()
          );

          const isCol = parsed.isCollection ?? (allImages.length > 1);
          const count = parsed.collectionCount || (allImages.length > 1 ? allImages.length : 1);
          const unit = parsed.unitPrice || parsed.suggestedPrice;
          const bundle = parsed.bundlePrice || (isCol ? Math.round(unit * count * 0.82) : unit);

          return res.json({
            success: true,
            source: 'gemini-3.8-flash',
            data: {
              ...parsed,
              isCollection: isCol,
              collectionCount: count,
              unitPrice: unit,
              bundlePrice: bundle,
              allowsUnitPurchase: parsed.allowsUnitPurchase ?? isCol,
              isNewCollectionCategory: isNewCollection,
            },
          });
        }
      } catch (geminiErr: any) {
        console.warn('Gemini vision API error in serverless handler:', geminiErr?.message);
      }
    }

    // Heuristic Fallback
    const fallbackFranchise = existingFranchises.length > 0 ? existingFranchises[0] : 'Homem-Aranha';
    const isMulti = allImages.length > 1;
    const unitFallback = 25.0;
    const countFallback = isMulti ? allImages.length : 1;
    const bundleFallback = isMulti ? Math.round(unitFallback * countFallback * 0.8) : unitFallback;

    return res.json({
      success: true,
      source: 'heuristic-analyzer',
      data: {
        title: isMulti
          ? `Lote Coleção: ${fallbackFranchise} (${countFallback} Edições Completas)`
          : `Revista Clássica: ${fallbackFranchise} - Edição Especial`,
        publisher: 'Editora Abril',
        series: `${fallbackFranchise} Clássico`,
        franchiseCategory: fallbackFranchise,
        issueNumber: isMulti ? `Lote #01 ao #${countFallback}` : '#01',
        yearEstimate: 1992,
        suggestedPrice: bundleFallback,
        unitPrice: unitFallback,
        bundlePrice: bundleFallback,
        isCollection: isMulti,
        collectionCount: countFallback,
        allowsUnitPurchase: isMulti,
        description: 'Exemplar histórico preservado com miolo original 100% completo e cores autênticas.',
        conditionGradeSuggestion: 'bom',
        isNewCollectionCategory: false,
        keyCharacters: [fallbackFranchise],
      },
    });
  } catch (error: any) {
    console.error('Error analyzing cover:', error);
    return res.status(500).json({ error: error.message || 'Erro ao analisar a capa da HQ.' });
  }
});

// 2. Dynamic Mercado Pago Preference
app.post('/api/mercadopago/create-preference', async (req, res) => {
  try {
    const { items, buyer, shippingCost = 0, discount = 0 } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'Nenhum item informado para pagamento.' });
    }

    const subtotal = items.reduce(
      (acc: number, item: any) => acc + Number(item.price) * (item.quantity || 1),
      0
    );

    const total = Math.max(1, subtotal - discount + shippingCost);
    const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const orderId = `HQ-${Date.now()}`;

    if (mpAccessToken) {
      try {
        const preferencePayload = {
          items: items.map((i: any) => ({
            id: i.id || i.hqId,
            title: i.title,
            unit_price: Number(i.price),
            quantity: i.quantity || 1,
            currency_id: 'BRL',
          })),
          shipments: {
            cost: Number(shippingCost),
            mode: 'not_specified',
          },
          payer: {
            name: buyer?.name || 'Comprador HQ',
            email: buyer?.email || 'comprador@bancahq.com',
          },
          back_urls: {
            success: `${process.env.APP_URL || 'http://localhost:3000'}/?status=success&orderId=${orderId}`,
            failure: `${process.env.APP_URL || 'http://localhost:3000'}/?status=failure`,
            pending: `${process.env.APP_URL || 'http://localhost:3000'}/?status=pending`,
          },
          auto_return: 'approved',
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
          });
        }
      } catch (err: any) {
        console.warn('Mercado Pago API error:', err?.message);
      }
    }

    const mockInitPoint = `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=HQ-SIM-${orderId}`;
    return res.json({
      success: true,
      mode: 'sandbox_simulation',
      preferenceId: `PREF-${orderId}`,
      initPoint: mockInitPoint,
      orderId,
      total,
      pixQrCode: `00020126580014BR.GOV.BCB.PIX0136bancahq-pix-chave-chave-2026520400005303986540${total.toFixed(2)}5802BR5915BANCA HQ SAAS6009SAO PAULO62070503***6304`,
      message: 'Preferência gerada na hora dinamicamente para o carrinho.',
    });
  } catch (error: any) {
    console.error('Error creating preference:', error);
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
        {
          code: 'RETIRADA',
          name: 'Retirar com o Vendedor (Sem custo)',
          price: 0.0,
          days: 'A combinar após confirmação',
          insuranceIncluded: false,
        },
      ],
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao calcular frete.' });
  }
});

export default app;
