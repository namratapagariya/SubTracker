const { google } = require("googleapis");
const prisma = require("../prismaClient");

function cleanEmailBody(text) {

  // Remove URLs
  text = text.replace(/https?:\/\/\S+/g, "");

  // Remove extra spaces
  text = text.replace(/\s+/g, " ");

  // Remove weird unicode spacing
  text = text.replace(/‌/g, "");

  // Remove common junk words
  const junkPatterns = [
    /unsubscribe/gi,
    /instagram/gi,
    /facebook/gi,
    /twitter/gi,
    /tiktok/gi,
    /contact us/gi,
    /manage preferences/gi,
  ];

  junkPatterns.forEach(pattern => {
    text = text.replace(pattern, "");
  });

  return text.trim();
}

async function fetchTrialEmails(accessToken) {

  const auth = new google.auth.OAuth2();

  auth.setCredentials({
    access_token: accessToken,
  });

  const gmail = google.gmail({
    version: "v1",
    auth,
  });

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

  // Step 1: Get matching message IDs
  const res = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 10,
  });

  const messages = res.data.messages || [];

  const emailDetails = [];

  // Step 2: Fetch each email fully
  for (const msg of messages) {

    const email = await gmail.users.messages.get({
      userId: "me",
      id: msg.id,
    });

    const headers = email.data.payload.headers;

    // Find Subject
    const subjectHeader = headers.find(
      h => h.name === "Subject"
    );

    // Find From
    const fromHeader = headers.find(
      h => h.name === "From"
    );

    // Extract clean service name
    let serviceName = "Unknown";

    if (fromHeader?.value) {

      serviceName = fromHeader.value
        .split("<")[0]
        .trim();

      serviceName =
        serviceName.replace(/"/g, "");
    }

    // Try to get plain text body
    let body = "";

    const parts = email.data.payload.parts;

    if (parts) {

      const textPart = parts.find(
        part => part.mimeType === "text/plain"
      );

      if (textPart?.body?.data) {

        body = Buffer.from(
          textPart.body.data,
          "base64"
        ).toString("utf-8");

        body = cleanEmailBody(body);
      }
    }

    // Extract price
    const priceMatch =
      body.match(/\$\d+(\.\d+)?/);

    // ------------------------
    // SMARTER SCORING SYSTEM
    // ------------------------

    let score = 0;

    // Strong indicators
    if (/charged/i.test(body)) score += 5;

    if (/invoice/i.test(body)) score += 5;

    if (/payment method/i.test(body)) score += 4;

    if (/billing/i.test(body)) score += 4;

    if (/renew/i.test(body)) score += 4;

    if (/membership/i.test(body)) score += 3;

    if (/subscription/i.test(body)) score += 3;

    if (/cancel anytime/i.test(body)) score += 2;

    // Weak indicators
    if (/free trial/i.test(body)) score += 1;

    if (/trial period/i.test(body)) score += 1;

    // Promotional indicators
    if (/special offer/i.test(body)) score -= 3;

    if (/limited time/i.test(body)) score -= 3;

    if (/take our poll/i.test(body)) score -= 5;

    if (/support for every sentence/i.test(body)) score -= 4;

    // Final classification
    const isLikelySubscription =
      score >= 6;

    // Auto renew detection
    const autoRenew =
      /automatically charge|automatically enrolled/i.test(body);

    // Only save if likely real subscription
    if (isLikelySubscription) {

      await prisma.subscription.create({
        data: {

          service: serviceName,

          subject:
            subjectHeader?.value || "No Subject",

          price: priceMatch
            ? priceMatch[0]
            : null,

          trialDetected:
            isLikelySubscription,

          autoRenew,
        },
      });
    }

    emailDetails.push({

      id: msg.id,

      service: serviceName,

      subject:
        subjectHeader?.value || "No Subject",

      from:
        fromHeader?.value || "Unknown Sender",

      snippet: email.data.snippet,

      confidenceScore: score,

      trialDetected:
        isLikelySubscription,

      price: priceMatch
        ? priceMatch[0]
        : "Not found",

      autoRenew,

      body,
    });
  }

  return emailDetails;
}

module.exports = fetchTrialEmails;