const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function classify(body, senderName) {
  try {
    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a strict email classification AI. Always respond with valid JSON only. No markdown, no explanation, just JSON.",
        },
        {
          role: "user",
          content: `
You are an AI that analyzes subscription and trial emails.

Sender: ${senderName}
Email body:
---
${body.slice(0, 3000)}
---

Classify this email into ONE category:
- PROMOTIONAL_OFFER = user is being invited to try something, marketing email
- ACTIVE_TRIAL = user has ALREADY started a trial AND email confirms it with specific dates or account details. NOT marketing or welcome emails.
- ACTIVE_SUBSCRIPTION = user is actively subscribed or was billed
- BILLING_NOTICE = invoice, payment due, payment reminder
- NEWSLETTER = informational content, no subscription action
- UNKNOWN = cannot determine

IMPORTANT: If the email is a welcome or onboarding email without billing details, classify as PROMOTIONAL_OFFER not ACTIVE_TRIAL.

Also extract:
- serviceName: the product or service name
- trialEndDate: YYYY-MM-DD or null
- price: like "$15.99/month" or null
- autoRenew: true or false

Return ONLY this JSON:
{
  "classification": "ONE_OF_THE_CATEGORIES",
  "confidence": 0-100,
  "serviceName": "string or null",
  "trialEndDate": "YYYY-MM-DD or null",
  "price": "string or null",
  "autoRenew": true or false,
  "reason": "one sentence"
}
`,
        },
      ],
      temperature: 0.1,
    });

    const text = response.choices[0].message.content;
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);

  } catch (error) {
    console.error("Groq classification error:", error.message);
    return {
      classification: "UNKNOWN",
      confidence: 0,
      serviceName: null,
      trialEndDate: null,
      price: null,
      autoRenew: false,
      reason: "Classification failed",
    };
  }
}

module.exports = { classify };