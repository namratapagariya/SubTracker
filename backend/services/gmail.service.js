const { google } = require("googleapis");
const prisma = require("../prismaClient");
const { classifyEmail } = require("./ai/classifier");

// Cleans raw email text before sending to Gemini
function cleanEmailBody(text) {
  text = text.replace(/https?:\/\/\S+/g, "");
  text = text.replace(/\s+/g, " ");
  text = text.replace(/‌/g, "");
  return text.trim();
}

async function fetchTrialEmails(accessToken) {

  // Step 1 — Connect to Gmail using the user's OAuth token
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth });

  // Step 2 — Search Gmail for subscription-related emails
  // These keywords cast a wide net — Gemini will filter the real ones
  const query = [
    "free trial",
    "trial ends",
    "trial period",
    "subscription begins",
    "billing",
    "invoice",
    "charged",
    "membership",
  ].join(" OR ");

  const res = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 10,
  });

  const messages = res.data.messages || [];
  const emailDetails = [];

  // Step 3 — Loop through each email
  for (const msg of messages) {

    const email = await gmail.users.messages.get({
      userId: "me",
      id: msg.id,
    });

    const headers = email.data.payload.headers;

    // Extract subject and sender from email headers
    const subjectHeader = headers.find(h => h.name === "Subject");
    const fromHeader = headers.find(h => h.name === "From");

    // Clean up sender name — remove the email address part
    // e.g. "Notion <no-reply@notion.so>" becomes "Notion"
    let senderName = "Unknown";
    if (fromHeader?.value) {
      senderName = fromHeader.value.split("<")[0].trim().replace(/"/g, "");
    }

    // Step 4 — Extract plain text body from email
    let body = "";
    const parts = email.data.payload.parts;

    if (parts) {
      const textPart = parts.find(part => part.mimeType === "text/plain");
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
        body = cleanEmailBody(body);
      }
    }

    // Skip emails with no readable body
    if (!body) continue;

    // Step 5 — Send email to Gemini for classification
    console.log(`Classifying email from: ${senderName}`);
    const aiResult = await classifyEmail(body, senderName);
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`Result: ${aiResult.classification} (${aiResult.confidence}%)`);

    // Step 6 — Only save real subscriptions, ignore promotions and newsletters
    const shouldSave = [
      "ACTIVE_TRIAL",
      "ACTIVE_SUBSCRIPTION",
      "BILLING_NOTICE",
    ].includes(aiResult.classification);

    if (shouldSave) {

      // upsert = update if exists, create if not
      // gmailMsgId prevents saving the same email twice
      await prisma.subscription.upsert({
        where: { gmailMsgId: msg.id },
        update: {},
        create: {
          gmailMsgId: msg.id,
          service: aiResult.serviceName || senderName,
          subject: subjectHeader?.value || "No Subject",
          price: aiResult.price || null,
          trialEndDate: aiResult.trialEndDate
            ? new Date(aiResult.trialEndDate)
            : null,
          trialDetected: aiResult.classification === "ACTIVE_TRIAL",
          autoRenew: aiResult.autoRenew || false,
          classification: aiResult.classification,
          confidence: aiResult.confidence || 0,
          status: "active",
        },
      });
    }

    // Step 7 — Return all scanned emails to terminal for debugging
    emailDetails.push({
      id: msg.id,
      service: aiResult.serviceName || senderName,
      subject: subjectHeader?.value || "No Subject",
      from: fromHeader?.value || "Unknown",
      classification: aiResult.classification,
      confidence: aiResult.confidence,
      trialEndDate: aiResult.trialEndDate,
      price: aiResult.price,
      autoRenew: aiResult.autoRenew,
      saved: shouldSave,
    });
  }

  return emailDetails;
}

module.exports = fetchTrialEmails;