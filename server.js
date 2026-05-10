const express = require("express");
const axios = require("axios");
const OpenAI = require("openai");
const path = require("path");

const app = express();

app.use(express.json());

/*
========================================
STATIC FRONTEND
========================================
*/

app.use(express.static(path.join(__dirname, "dist")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

/*
========================================
ENV VARIABLES
========================================
*/

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/*
========================================
OPENAI
========================================
*/

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

/*
========================================
WEBHOOK VERIFY
========================================
*/

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

/*
========================================
INCOMING WHATSAPP MESSAGES
========================================
*/

app.post("/webhook", async (req, res) => {
  try {
    const message =
      req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) {
      return res.sendStatus(200);
    }

    const from = message.from;
    const text = message.text?.body || "";

    console.log("Incoming message:", text);

    /*
    ========================================
    GPT RESPONSE
    ========================================
    */

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
You are TS Creatives AI Assistant.

Business:
TS Creatives & Digital Marketing Hyderabad

Services:
- Logo Design
- Branding
- Social Media Marketing
- Meta Ads
- WhatsApp Automation
- Website Development
- Video Editing
- School Campaigns
- Google Business Optimization

Pricing:
- Logo Design ₹999+
- Social Media ₹4999/month
- Website ₹9999+
- WhatsApp Automation ₹14999+

Rules:
- Reply professionally
- Keep replies short
- Use emojis smartly
- Convert leads into customers
- Encourage users to contact TS Creatives
`,
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    const reply =
      aiResponse.choices[0].message.content ||
      "Thank you for contacting TS Creatives.";

    /*
    ========================================
    SEND WHATSAPP MESSAGE
    ========================================
    */

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

    console.log("Reply sent");

    return res.sendStatus(200);
  } catch (error) {
    console.log(
      "Webhook Error:",
      error.response?.data || error.message
    );

    return res.sendStatus(500);
  }
});

/*
========================================
SEND BULK CAMPAIGN
========================================
*/

app.post("/api/send-campaign", async (req, res) => {
  try {
    const { campaign, customers } = req.body;

    if (!campaign || !customers?.length) {
      return res.status(400).json({
        error: "Campaign or customers missing",
      });
    }

    for (const customer of customers) {
      const number = customer.phone
        .replace(/\+/g, "")
        .replace(/\s/g, "");

      await axios.post(
        `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: "whatsapp",
          to: number,
          type: "text",
          text: {
            body: campaign,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return res.json({
      success: true,
      message: "Campaign sent successfully",
    });
  } catch (error) {
    console.log(
      "Campaign Error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      error: "Failed to send campaign",
    });
  }
});

/*
========================================
REACT ROUTING FIX
========================================
*/

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

/*
========================================
START SERVER
========================================
*/

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
