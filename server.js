app.post("/api/send-campaign", async (req, res) => {
  try {
    const { campaign, customers } = req.body;

    if (!campaign || !customers?.length) {
      return res.status(400).json({
        error: "Campaign message or customers missing",
      });
    }

    for (const customer of customers) {
      await axios.post(
        `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: "whatsapp",
          to: customer.phone.replace(/\+/g, ""),
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

    res.json({
      success: true,
    });
  } catch (error) {
    console.log(error.response?.data || error.message);

    res.status(500).json({
      error: "Failed to send campaign",
    });
  }
});
