const { google } = require("googleapis");
const prisma = require("../prismaClient");
const { classifyEmail } = require("./ai/classifier");

function cleanEmailBody(text) {
  text = text.replace(/https?:\/\/\S+/g, "");
  text = text.replace(/\s+/g, " ");
  text = text.replace(/‌/g, "");
  return text.trim();
}

async function fetchTrialEmails(accessToken, userId) {

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth });

  const query = "unsubscribe";

  const res = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 5,
  });

  const messages = res.data.messages || [];
  const emailDetails = [];

  for (const msg of messages) {

    const email = await gmail.users.messages.get({
      userId: "me",
      id: msg.id,
    });

    const headers = email.data.payload.headers;
    const subjectHeader = headers.find(h => h.name === "Subject");
    const fromHeader = headers.find(h => h.name === "From");

    let senderName = "Unknown";
    if (fromHeader?.value) {
      senderName = fromHeader.value
        .split("<")[0]
        .trim()
        .replace(/"/g, "");
    }

    let body = "";
    const parts = email.data.payload.parts;

    if (parts) {
      const textPart = parts.find(part => part.mimeType === "text/plain");
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
        body = cleanEmailBody(body);
      }
    }

    if (!body) continue;

    console.log(`Classifying email from: ${senderName}`);
    const aiResult = await classifyEmail(body, senderName);
    console.log(`Result: ${aiResult.classification} (${aiResult.confidence}%)`);

    const shouldSave = [
      "ACTIVE_TRIAL",
      "ACTIVE_SUBSCRIPTION",
      "BILLING_NOTICE",
    ].includes(aiResult.classification);

    if (shouldSave) {
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
          userId,
        },
      });
    }

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

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return emailDetails;
}

module.exports = fetchTrialEmails;