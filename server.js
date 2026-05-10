const express = require("express");
const axios = require("axios");
const OpenAI = require("openai");
const path = require("path");

const app = express();

app.use(express.json());

/* =========================
   FRONTEND BUILD SERVE
========================= */

app.use(express.static(path.join(__dirname, "dist")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

/* =========================
   OPENAI
========================= */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* =========================
   ENV VARIABLES
========================= */

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

/* =========================
   WEBHOOK VERIFY
========================= */

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ WEBHOOK VERIFIED");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

/* =========================
   WEBHOOK RECEIVE MESSAGE
========================= */

app.post("/webhook", async (req, res) => {
  try {
    console.log(
      "📩 Incoming Webhook:",
      JSON.stringify(req.body, null, 2)
    );

    const message =
      req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) {
      return res.sendStatus(200);
    }

    const from = message.from;
    const text = message.text?.body || "";

    console.log("📨 Message:", text);

    /* =========================
       OPENAI RESPONSE
    ========================= */

    const aiResponse =
      await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `
You are the official AI sales assistant for TS Creatives & Digital Solutions Hyderabad.

Your goals:
- Convert leads into customers
- Reply professionally
- Sound premium and modern
- Keep replies short for WhatsApp
- Use emojis professionally
- Promote services naturally

Services:
• Logo Design
• Branding
• Social Media Marketing
• Meta Ads
• WhatsApp Automation
• Website Development
• Video Editing
• School Marketing
• Google Business Optimization

Pricing:
• Logo Design ₹999+
• Social Media ₹4999/month
• Website ₹9999+
• WhatsApp Automation ₹14999+

Rules:
- Be friendly
- Keep replies concise
- Ask qualifying questions
- Push user toward booking service
- Mention TS Creatives branding naturally
`,
          },
          {
            role: "user",
            content: text,
          },
        ],
      });

    const reply =
      aiResponse.choices?.[0]?.message?.content ||
      "Thank you for contacting TS Creatives 🚀";

    console.log("🤖 AI Reply:", reply);

    /* =========================
       SEND WHATSAPP MESSAGE
    ========================= */

    await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: from,
        type: "text",
        text: {
          body: reply,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ WhatsApp Reply Sent");
    res.sendStatus(200);
  } catch (error) {
    console.error(
      "❌ ERROR:",
      error.response?.data || error.message
    );

    res.sendStatus(500);
  }
});

/* =========================
   FALLBACK ROUTE
========================= */

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
