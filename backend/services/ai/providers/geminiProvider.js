const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function classify(body, senderName) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `
You are an AI that analyzes subscription and trial emails.

Sender: ${senderName}
Email body:
---
${body.slice(0, 3000)}
---

Classify this email into ONE category:
- PROMOTIONAL_OFFER = user is being invited to try something, marketing email
- ACTIVE_TRIAL = user has already started a trial
- ACTIVE_SUBSCRIPTION = user is actively subscribed or was billed
- BILLING_NOTICE = invoice, payment due, payment reminder
- NEWSLETTER = informational content, no subscription action
- UNKNOWN = cannot determine

Also extract:
- serviceName: the product or service name (e.g. "Notion", "Netflix")
- trialEndDate: the date the trial ends in YYYY-MM-DD format, or null
- price: price after trial like "$15.99/month", or null
- autoRenew: true if email mentions automatic renewal, false otherwise

Return ONLY this JSON, nothing else:
{
  "classification": "ONE_OF_THE_CATEGORIES",
  "confidence": 0-100,
  "serviceName": "string or null",
  "trialEndDate": "YYYY-MM-DD or null",
  "price": "string or null",
  "autoRenew": true or false,
  "reason": "one sentence explanation"
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    return parsed;

  } catch (error) {
    console.error("Gemini classification error:", error);
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