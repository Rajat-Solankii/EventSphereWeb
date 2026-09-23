const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSy_dummy_key");
const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

router.post('/generate-template', async (req, res) => {
  try {
    const { prompt, mode, context } = req.body; // mode is 'ticket' or 'cover'
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const canvasWidth = mode === 'cover' ? 900 : 800;
    const canvasHeight = mode === 'cover' ? 500 : 450;
    
    // Fallbacks if context is omitted
    const eventTitle = context?.title || "Event Title";
    const eventDate = context?.date || "Event Date";
    const eventVenue = context?.venue || "Event Venue";

    const systemPrompt = `You are an expert event designer. Create a JSON schema for a visually stunning, premium event ${mode} template based on the following user prompt: "${prompt}".
    
    The actual event details are:
    Title: "${eventTitle}"
    Date: "${eventDate}"
    Venue: "${eventVenue}"
    
    Use these exact event details when creating the text elements! Do not use generic placeholders like "Event Title".

The canvas dimensions are ${canvasWidth}x${canvasHeight} pixels.
Your output MUST be a valid JSON object matching this schema exactly (no markdown formatting, just raw JSON). Do NOT wrap in \`\`\`json.

{
  "canvasBg": "#hexcolor", // Choose a rich, aesthetic base color
  "bgGradient": "linear-gradient(...)", // Optional CSS gradient for the background
  "bgOverlayOpacity": 0.4, // float between 0 and 1 (if a background image were to be used)
  "unsplashQuery": "aesthetic neon party", // IMPORTANT: A 2-3 word search query to fetch a real background photo from Unsplash that matches the vibe. Leave empty if a solid color is better.
  "elements": [
    {
      "id": "generated-element-uuid", // generate a random string ID
      "type": "text", // "text", "shape", or "icon"
      // Position and dimensions (make sure they fit within ${canvasWidth}x${canvasHeight}):
      "x": 50, "y": 50, "width": 400, "height": 80,
      "rotation": 0, "opacity": 1,
      // For TEXT:
      "content": "Example Text", "color": "#ffffff", "fontSize": 48, 
      "fontWeight": "bold", // "normal" or "bold" or "600"
      "fontFamily": "Inter", // "Inter", "Outfit", "Playfair Display", "Arial"
      "textAlign": "left", "bgColor": "transparent",
      // For SHAPE:
      "shape": "rect", // "rect", "rounded", "circle", "line", "dashed", "triangle", "diamond", "badge"
      "borderRadius": "8px", "border": "none",
      // For ICON:
      "iconType": "star" // "calendar", "clock", "mappin", "user", "star", "heart", "zap", "tag", "arrow"
    }
  ]
}

Important Rules:
1. Include 1 main title text element, 1-2 subtitle/info text elements.
2. Include aesthetic decorative shapes (e.g., circles, lines, or neon shapes) in the background.
3. Coordinate the colors brilliantly (e.g. cyberpunk = dark bg, neon pink/cyan text and shapes; corporate = clean white/blue, etc).
4. Do NOT include a "qrcode" element. That will be added automatically later if it's a ticket.
5. Provide ONLY the raw JSON string in your response. No explanation.`;

    const result = await model.generateContent(systemPrompt);
    let responseText = result.response.text();
    
    // Clean up if it returned markdown json blocks
    if (responseText.includes('\`\`\`json')) {
      responseText = responseText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '');
    }
    if (responseText.includes('\`\`\`')) {
      responseText = responseText.replace(/\`\`\`/g, '');
    }
    
    const templateData = JSON.parse(responseText.trim());
    res.json(templateData);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ error: 'Failed to generate template', details: error.message, stack: error.stack });
  }
});

module.exports = router;
