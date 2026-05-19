require("dotenv").config();
const nodemailer = require("nodemailer");

async function testEmail() {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SENDER_EMAIL,
      pass: process.env.SENDER_PASS,
    },
  });

  await transporter.sendMail({
    from: `"SubTracker" <${process.env.SENDER_EMAIL}>`,
    to: process.env.SENDER_EMAIL,
    subject: "⚠️ Notion trial expires in 3 days",
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
        <h2 style="color:#FFA500;">⚠️ Trial Expiring Soon</h2>
        <p>Your <strong>Notion</strong> trial is expiring in <strong>3 days</strong>.</p>
        <p>Price after trial: <strong>$15.99/mo</strong></p>
        <p>If you don't want to be charged, cancel before the trial ends.</p>
        <a href="https://www.google.com/search?q=cancel+Notion+subscription"
           style="background:#FFA500;color:#000;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;margin-top:10px;">
          Cancel Notion
        </a>
        <p style="margin-top:20px;color:#999;font-size:12px;">Sent by SubTracker</p>
      </div>
    `,
  });

  console.log("Test email sent! Check your inbox.");
}

testEmail();