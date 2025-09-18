// api/generate-posts.js
import OpenAI from "openai";

export default async function handler(req, res) {
  // Autoriser CORS (utile si tu testes en local)
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée. Utilisez POST." });
  }

  try {
    const { characterName, provider = "openai", systemPrompt, userPrompt } = req.body;

    if (!characterName) {
      return res.status(400).json({ error: "Nom du personnage requis" });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    if (provider === "openai" && !OPENAI_API_KEY) {
      return res.status(500).json({ error: "Clé API OpenAI non configurée sur le serveur" });
    }

    if (provider === "anthropic" && !ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "Clé API Anthropic non configurée sur le serveur" });
    }

    let response;

    if (provider === "openai") {
      const client = new OpenAI({ apiKey: OPENAI_API_KEY });

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt || "Tu réponds uniquement en JSON valide." },
          { role: "user", content: userPrompt || `Personnage: "${characterName}"` }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const content = completion.choices[0].message?.content || "{}";

      // Extraire le JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        response = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Format de réponse invalide");
      }

    } else if (provider === "anthropic") {
      const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-opus-20240229",
          max_tokens: 500,
          messages: [
            { role: "system", content: systemPrompt || "Tu réponds uniquement en JSON valide." },
            { role: "user", content: userPrompt || `Personnage: "${characterName}"` }
          ],
        }),
      });

      if (!anthropicResponse.ok) {
        const error = await anthropicResponse.json();
        throw new Error(error.error?.message || "Erreur API Anthropic");
      }

      const data = await anthropicResponse.json();
      const content = data.content[0].text;

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        response = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Format de réponse invalide");
      }
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error("Erreur lors de la génération:", error);
    return res.status(500).json({
      error: "Erreur lors de la génération des posts",
      details: error.message,
    });
  }
}
