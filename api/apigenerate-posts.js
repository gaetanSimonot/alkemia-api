// Fichier: api/generate-posts.js
// Fonction API pour Vercel - Génération de posts Alkemia

export default async function handler(req, res) {
  // Autoriser les requêtes CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Gérer la requête OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Vérifier que c'est bien une requête POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
  }

  try {
    const { characterName, provider = 'openai' } = req.body;
    
    if (!characterName) {
      return res.status(400).json({ error: 'Nom du personnage requis' });
    }

    // Récupérer les clés API depuis les variables d'environnement Vercel
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    if (provider === 'openai' && !OPENAI_API_KEY) {
      return res.status(500).json({ error: 'Clé API OpenAI non configurée sur le serveur' });
    }

    if (provider === 'anthropic' && !ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'Clé API Anthropic non configurée sur le serveur' });
    }

    const prompt = `Tu es un expert en pop culture et figurines. Pour le personnage "${characterName}", génère 3 messages courts et engageants pour les réseaux sociaux d'une boutique de figurines STL 3D.

Format de réponse OBLIGATOIRE en JSON:
{
  "context": "Brève description du personnage et son univers",
  "messages": {
    "discord": "Message engageant avec référence à l'univers du personnage pour Discord",
    "instagram": "Message visuel et inspirant pour Instagram", 
    "tiktok": "Message court et dynamique pour TikTok"
  }
}

Règles:
- Inclure une référence à l'univers du personnage
- Être enthousiaste et engageant
- Adapter le ton à chaque plateforme
- Garder les messages courts (1-2 phrases)
- Répondre UNIQUEMENT avec le JSON, sans texte supplémentaire`;

    let response;
    
    if (provider === 'openai') {
      // Appel à l'API OpenAI
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'Tu réponds uniquement en JSON valide, sans texte additionnel.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!openaiResponse.ok) {
        const error = await openaiResponse.json();
        throw new Error(error.error?.message || 'Erreur API OpenAI');
      }

      const data = await openaiResponse.json();
      const content = data.choices[0].message.content;
      
      // Extraire le JSON de la réponse
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        response = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Format de réponse invalide');
      }
      
    } else if (provider === 'anthropic') {
      // Appel à l'API Anthropic
      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-opus-20240229',
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!anthropicResponse.ok) {
        const error = await anthropicResponse.json();
        throw new Error(error.error?.message || 'Erreur API Anthropic');
      }

      const data = await anthropicResponse.json();
      const content = data.content[0].text;
      
      // Extraire le JSON de la réponse
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        response = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Format de réponse invalide');
      }
    }

    // Retourner la réponse
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Erreur lors de la génération:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la génération des posts',
      details: error.message 
    });
  }
}