require("dotenv").config();
const { classifyEmail } = require("./services/ai/classifier");

// Fake subscription email bodies to test classifier
const testEmails = [
  {
    senderName: "Notion",
    body: `
      Hi Namrata, your free trial has started.
      Your 14-day trial of Notion Pro begins today.
      After your trial ends on June 1, 2026, you will be
      automatically charged $15.99/month.
      You can cancel anytime before June 1 to avoid being charged.
      Manage your subscription at notion.so/settings.
    `,
  },
  {
    senderName: "Netflix",
    body: `
      Your Netflix membership has been renewed.
      Amount charged: $15.49
      Date: May 19, 2026
      Plan: Standard
      Your next billing date is June 19, 2026.
      To manage your membership visit netflix.com/account.
    `,
  },
  {
    senderName: "LinkedIn",
    body: `
      Hi Namrata, start your 1 month free trial of LinkedIn Premium.
      Get unlimited profile views, InMail credits and more.
      Try Premium free for 1 month. Cancel anytime.
      This is a limited time offer just for you.
    `,
  },
];

async function runTest() {
  console.log("Testing classifier with sample emails...\n");

  for (const email of testEmails) {
    console.log(`--- Testing: ${email.senderName} ---`);
    const result = await classifyEmail(email.body, email.senderName);
    console.log(JSON.stringify(result, null, 2));
    console.log("");

    // Wait 2 seconds between calls to avoid rate limit
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

runTest();