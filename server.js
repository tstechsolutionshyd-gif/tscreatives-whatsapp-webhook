const express = require("express");
const axios = require("axios");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  try {
    const message =
      req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (message) {
      const from = message.from;
      const text = message.text?.body;

      console.log("Incoming:", text);

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `
You are the AI sales assistant for TS Creatives & Digital Solutions.

Your job is to:
- Reply professionally on WhatsApp
- Help customers choose services
- Convert leads into clients
- Speak friendly and confidently
- Keep replies short and attractive

Services:
1. Logo Design
2. Branding
3. Social Media Marketing
4. Meta Ads
5. WhatsApp Automation
6. Website Development
7. School Admission Campaigns
8. Video Editing
9. Google My Business Optimization

Pricing:
- Logo Design starts at ₹999
- Social Media Management starts at ₹4999/month
- Website Development starts at ₹9999
- WhatsApp Automation starts at ₹14999

Rules:
- Always greet warmly
- Use emojis professionally
- Encourage users to contact for details
- Try to convert the conversation into a lead
- Keep messages concise for WhatsApp
`
          },
          {
            role: "user",
            content: text,
          },
        ],
      });

      const reply =
        aiResponse.choices[0].message.content;

      await axios.post(
        `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: "whatsapp",
          to: from,
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

      console.log("Reply sent:", reply);
    }

    res.sendStatus(200);
  } catch (error) {
    console.log(
      error.response?.data || error.message
    );

    res.sendStatus(500);
  }
});

app.listen(process.env.PORT || 10000, () => {
  console.log("Server running on port 10000");
});
