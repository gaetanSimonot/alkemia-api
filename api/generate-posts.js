// api/generate-posts.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée. Utilisez POST." });
  }

  try {
    const { characterName } = req.body;

    if (!characterName) {
      return res.status(400).json({ error: "Nom du personnage requis" });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Tu réponds uniquement en JSON valide." },
        { role: "user", content: `Personnage: ${characterName}` },
      ],
    });

    const output = completion.choices[0].message?.content || "{}";
    const json = JSON.parse(output);

    res.status(200).json(json);
  } catch (err) {
    console.error("Erreur API:", err);
    res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
