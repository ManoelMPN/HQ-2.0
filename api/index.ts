import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();

app.use(express.json({ limit: '40mb' }));
app.use(express.urlencoded({ extended: true, limit: '40mb' }));

// Shared server-side Gemini client
const geminiApiKey = process.env.GEMINI_API_KEY;
let defaultAiClient: GoogleGenAI | null = null;

if (geminiApiKey && geminiApiKey.startsWith('AIzaSy')) {
  defaultAiClient = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
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

    if (!cleanKey.startsWith('AIzaSy')) {
      return res.status(400).json({
        valid: false,
        isInvalidFormat: true,
        error: `A chave informada ("${cleanKey.substring(0, 8)}...") tem formato incorreto para o Google Gemini. As chaves oficiais do Gemini começam com "AIzaSy" (39 caracteres). A sua chave informada começa com "${cleanKey.substring(0, 3)}", o que indica que é um token do Mercado Pago, Mercado Livre ou OAuth. Obtenha sua chave gratuita do Gemini em: https://aistudio.google.com/app/apikey`,
      });
    }

    const testClient = new GoogleGenAI({ apiKey: cleanKey });
    const response = await testClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Responda apenas: OK',
    });

    if (response.text) {
      return res.json({
        valid: true,
        message: 'Chave oficial do Google Gemini conectada e validada com sucesso!',
      });
    }

    return res.status(400).json({
      valid: false,
      error: 'Não foi possível validar a chave com a API do Google.',
    });
  } catch (err: any) {
    return res.status(400).json({
      valid: false,
      error: `Erro ao validar chave com o Google: ${err.message || 'Chave inválida ou sem permissão'}`,
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

    const customApiKey = (req.headers['x-gemini-api-key'] as string || '').trim();
    const effectiveKey = customApiKey || process.env.GEMINI_API_KEY || '';
    const cleanKey = effectiveKey.trim();

    if (!cleanKey) {
      return res.status(400).json({
        success: false,
        needsKey: true,
        error: 'Chave do Google Gemini não configurada. Adicione sua chave (começando com "AIzaSy...") na aba "Configurações & Chaves" do Painel Admin.',
      });
    }

    if (!cleanKey.startsWith('AIzaSy')) {
      return res.status(400).json({
        success: false,
        isInvalidFormat: true,
        error: `A chave informada ("${cleanKey.substring(0, 8)}...") tem formato incorreto para o Google Gemini. As chaves oficiais do Gemini começam com "AIzaSy" (39 caracteres). A sua chave informada começa com "${cleanKey.substring(0, 3)}", indicando que é um token do Mercado Pago, Mercado Livre ou OAuth. Obtenha sua chave gratuita do Gemini em: https://aistudio.google.com/app/apikey`,
      });
    }

    let clientToUse = defaultAiClient;
    if (!clientToUse || customApiKey) {
      clientToUse = new GoogleGenAI({
        apiKey: cleanKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }

    const franchisesPrompt = existingFranchises.length > 0
      ? `Categorias existentes no acervo: [${existingFranchises.join(', ')}]. Se o gibi pertencer a uma dessas, use exatamente o mesmo nome. Caso seja inédito (ex: Justiceiro, Demolidor, Spawn, Batman, Wolverine), crie uma nova categoria concisa.`
      : 'Crie uma categoria concisa para o personagem ou franquia principal (ex: "Homem-Aranha", "Batman", "Superman", "Justiceiro", "Wolverine", "X-Men", "Turma da Mônica").';

    const systemInstruction = `Você é um perito avaliador e historiador de revistas em quadrinhos no Brasil (Editora Abril, Panini, EBAL, Mythos, Rio Gráfica, etc.).
Analise atentamente as fotos das capas enviadas (${allImages.length} imagem/imagens).
Leia os textos na capa: nome do personagem, logotipo, número da edição, editora e ano de publicação.
${franchisesPrompt}

Regras Cruciais de Precificação e Lotes:
1. Se houver mais de uma capa ou a foto mostrar um lote/coleção, identifique se faz sentido vender como Lote Completo (coleção/saga sequencial).
2. Calcule o preço da UNIDADE individual (ex: R$ 20 a R$ 45 dependendo da raridade) e o PREÇO DO LOTE COMPLETO com desconto justo de colecionador (aproximadamente 15% a 25% de desconto no lote).
3. Se for edição avulsa única, o preço unitário e o preço total devem ser idênticos.
4. Escreva uma sinopse autêntica e direta da HQ (2 frases), citando o arco e vilões. NUNCA use frases clichês nem menções repetitivas de pano seco.`;

    const imageParts = allImages.slice(0, 6).map((b64) => ({
      inlineData: {
        mimeType,
        data: b64.replace(/^data:image\/\w+;base64,/, ''),
      },
    }));

    let rawText = '';
    try {
      const response = await clientToUse.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            ...imageParts,
            {
              text: `Analise cuidadosamente estas fotos reais de capas de gibi para catalogação na loja HQ Master. Extraia os dados reais impressos na capa (personagem, título, editora, número da edição, ano aproximado, estado de conservação visível, preço unitário e lote com desconto se for coleção).`,
            },
          ],
        },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Título comercial real do anúncio baseado na capa' },
              publisher: { type: Type.STRING, description: 'Editora real identificada (Editora Abril, Panini, Marvel, DC Comics, etc.)' },
              series: { type: Type.STRING, description: 'Série da revista' },
              franchiseCategory: { type: Type.STRING, description: 'Franquia ou personagem principal' },
              issueNumber: { type: Type.STRING, description: 'Número da edição ou intervalo de edições' },
              yearEstimate: { type: Type.INTEGER, description: 'Ano aproximado de lançamento' },
              suggestedPrice: { type: Type.NUMBER, description: 'Preço total do anúncio em BRL' },
              unitPrice: { type: Type.NUMBER, description: 'Preço por exemplar avulso em BRL' },
              bundlePrice: { type: Type.NUMBER, description: 'Preço promocional do lote completo em BRL' },
              isCollection: { type: Type.BOOLEAN, description: 'Se é um lote ou coleção com múltiplas edições' },
              collectionCount: { type: Type.INTEGER, description: 'Quantidade de edições na coleção' },
              allowsUnitPurchase: { type: Type.BOOLEAN, description: 'Se permite comprar avulso além do lote' },
              description: { type: Type.STRING, description: 'Descrição direta e concisa da história e contexto' },
              conditionGradeSuggestion: { type: Type.STRING, description: 'Grau sugerido: otimo, bom, ruim ou leitura' },
              keyCharacters: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Personagens identificados' },
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

      rawText = response.text || '';
    } catch (genErr: any) {
      console.error('Gemini vision API error in api/index.ts:', genErr);
      return res.status(400).json({
        success: false,
        error: `A análise por IA falhou: ${genErr?.message || 'Verifique a chave do Gemini'}.`,
        details: genErr?.message,
      });
    }

    if (!rawText) {
      return res.status(500).json({
        success: false,
        error: 'A IA do Gemini não retornou dados para a imagem enviada.',
      });
    }

    const parsed = JSON.parse(rawText);
    const isNewCollection = !existingFranchises.some(
      (f: string) => f.toLowerCase() === (parsed.franchiseCategory || '').toLowerCase()
    );

    const isCol = parsed.isCollection ?? (allImages.length > 1);
    const count = parsed.collectionCount || (allImages.length > 1 ? allImages.length : 1);
    const unit = parsed.unitPrice || parsed.suggestedPrice || 25.0;
    const bundle = parsed.bundlePrice || (isCol ? Math.round(unit * count * 0.8) : unit);

    return res.json({
      success: true,
      source: 'gemini-2.5-flash',
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

    // Strict Delivery Address Validation
    if (!buyer || !buyer.name || !buyer.email || !buyer.cep || !buyer.street || !buyer.number || !buyer.city || !buyer.state) {
      return res.status(400).json({
        error: 'Endereço incompleto. Todos os campos de entrega são obrigatórios para emissão do pedido.',
      });
    }

    const subtotal = items.reduce(
      (acc: number, item: any) => acc + Number(item.price) * (item.quantity || 1),
      0
    );

    const total = Math.max(1, subtotal - discount + shippingCost);
    const orderId = `HQM-${Date.now().toString().slice(-6)}`;

    const mpAccessToken = (process.env.MERCADO_PAGO_ACCESS_TOKEN || '').trim();

    // If user provided a real Mercado Pago Access Token
    if (mpAccessToken && (mpAccessToken.startsWith('APP_USR-') || mpAccessToken.startsWith('TEST-'))) {
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

    // In-Store Direct PIX & Order confirmation (Zero black screens, clear in-store UI)
    const pixPayload = `00020126580014BR.GOV.BCB.PIX0136${storePixKey}520400005303986540${total.toFixed(2)}5802BR5915HQ MASTER COMICS6009SAO PAULO62070503***6304`;

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
