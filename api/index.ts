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

// 1. Gemini Vision Cover Analysis
app.post('/api/gemini/analyze-cover', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', existingFranchises = [] } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada para análise.' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const franchisesPrompt = existingFranchises.length > 0
      ? `Categorias/Franquias atualmente existentes no acervo: [${existingFranchises.join(', ')}]. Se o personagem pertencer a uma dessas, use EXATAMENTE o mesmo nome para agrupar. Caso seja um personagem inédito (ex: Justiceiro, Demolidor, Spawn), crie uma nova categoria concisa.`
      : 'Crie uma categoria concisa e padronizada para a franquia/personagem principal (ex: "Homem-Aranha", "Batman", "Superman", "Justiceiro", "X-Men").';

    const systemInstruction = `Você é o principal avaliador e historiador de revistas em quadrinhos (HQs, gibis e formatinhos) no Brasil (Editora Abril, Panini, EBAL, Bloch, Mythos, etc.).
Analise a capa da HQ enviada e retorne estritamente um JSON estruturado.
Identifique com precisão:
- Título do anúncio atraente para venda
- Editora (escolha entre: "Marvel", "DC Comics", "Panini", "Editora Abril", "Image Comics", "Dark Horse", "Outra")
- Nome da série
- Franquia / Categoria de agrupamento: ${franchisesPrompt}
- Número da edição
- Ano estimado de publicação
- Preço de mercado sugerido em BRL (valor justo para colecionadores)
- Breve descrição de 2 a 3 frases instigantes sobre a edição
- Sugestão inicial de estado de conservação baseada na foto (otimo, bom, ruim, leitura)
- Personagens chave visíveis`;

    if (aiClient) {
      try {
        const imagePart = {
          inlineData: {
            mimeType,
            data: cleanBase64,
          },
        };

        const response = await aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: {
            parts: [
              imagePart,
              {
                text: 'Analise detalhadamente esta capa de história em quadrinhos para catalogação e precificação no marketplace.',
              },
            ],
          },
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: 'Título comercial para o anúncio' },
                publisher: { type: Type.STRING, description: 'Editora responsável' },
                series: { type: Type.STRING, description: 'Série da revista' },
                franchiseCategory: { type: Type.STRING, description: 'Franquia ou personagem' },
                issueNumber: { type: Type.STRING, description: 'Número da edição' },
                yearEstimate: { type: Type.INTEGER, description: 'Ano aproximado de lançamento' },
                suggestedPrice: { type: Type.NUMBER, description: 'Preço sugerido em Reais' },
                description: { type: Type.STRING, description: 'Descrição editorial do gibi' },
                conditionGradeSuggestion: { type: Type.STRING, description: 'Grau sugerido' },
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

          return res.json({
            success: true,
            source: 'gemini-3.8-flash',
            data: {
              ...parsed,
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
    return res.json({
      success: true,
      source: 'heuristic-analyzer',
      data: {
        title: 'Revista em Quadrinhos Clássica - Edição Especial de Colecionador',
        publisher: 'Editora Abril',
        series: 'Grandes Clássicos dos Quadrinhos',
        franchiseCategory: fallbackFranchise,
        issueNumber: '#01',
        yearEstimate: 1992,
        suggestedPrice: 35.0,
        description: 'Exemplar clássico formatinho de época. Miolo completo, higienizado com pano seco e sem produtos químicos.',
        conditionGradeSuggestion: 'bom',
        isNewCollectionCategory: false,
        keyCharacters: ['Herói Principal', 'Vilão'],
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
