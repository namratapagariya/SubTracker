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
  ].join(" OR ");

  // Step 1: Get matching message IDs
  const res = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 5,
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

  // Remove email part inside <>
  serviceName = fromHeader.value
    .split("<")[0]
    .trim();

  // Remove quotes if present
  serviceName = serviceName.replace(/"/g, "");
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
    const priceMatch = body.match(/\$\d+(\.\d+)?/);

    // Detect trial
    const hasTrial = /free trial/i.test(body);

    // Detect auto renewal
    const autoRenew =
      /automatically charge|automatically enrolled/i.test(body);
    await prisma.subscription.create({
  data: {

    service: serviceName,

    subject:
      subjectHeader?.value || "No Subject",

    price: priceMatch
      ? priceMatch[0]
      : null,

    trialDetected: hasTrial,

    autoRenew,
  },
});
    emailDetails.push({
      id: msg.id,
      
      service: serviceName,

      subject: subjectHeader?.value || "No Subject",

      from: fromHeader?.value || "Unknown Sender",

      snippet: email.data.snippet,

      trialDetected: hasTrial,

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