const cron = require("node-cron");
const nodemailer = require("nodemailer");
const prisma = require("../prismaClient");

// Create email transporter using Gmail
function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SENDER_EMAIL,
      pass: process.env.SENDER_PASS,
    },
  });
}

// Send reminder email to user
async function sendReminderEmail(toEmail, subscription) {
  const transporter = createTransporter();

  const daysLeft = subscription.trialEndDate
    ? Math.ceil(
        (new Date(subscription.trialEndDate) - new Date()) /
        (1000 * 60 * 60 * 24)
      )
    : null;

  await transporter.sendMail({
    from: `"SubTracker" <${process.env.SENDER_EMAIL}>`,
    to: toEmail,
    subject: `⚠️ ${subscription.service} trial expires in ${daysLeft} days`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #FFA500;">⚠️ Trial Expiring Soon</h2>
        <p>Your <strong>${subscription.service}</strong> trial is expiring in <strong>${daysLeft} days</strong>.</p>
        ${subscription.price ? `<p>Price after trial: <strong>${subscription.price}</strong></p>` : ""}
        <p>If you don't want to be charged, cancel before the trial ends.</p>
        <a href="https://www.google.com/search?q=cancel+${subscription.service}+subscription"
           style="background:#FFA500;color:#000;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;margin-top:10px;">
          Cancel ${subscription.service}
        </a>
        <p style="margin-top:20px;color:#999;font-size:12px;">Sent by SubTracker — your subscription intelligence system.</p>
      </div>
    `,
  });

  console.log(`Reminder sent for ${subscription.service}`);
}

// Main cron job — runs every day at 9 AM
function startReminderCron() {
  cron.schedule("0 9 * * *", async () => {
    console.log("Running daily reminder check...");

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    // Find subscriptions expiring in next 3 days
    // where reminder hasn't been sent yet
    const expiring = await prisma.subscription.findMany({
      where: {
        status: "active",
        reminderSent: false,
        trialEndDate: {
          lte: threeDaysFromNow,
          gte: new Date(),
        },
      },
    });

    console.log(`Found ${expiring.length} expiring subscriptions`);

    for (const sub of expiring) {

      try {
        // Send to your own email for now
        // Later this will use the logged-in user's email
        await sendReminderEmail(
          process.env.SENDER_EMAIL,
          sub
        );

        // Mark reminder as sent so it doesn't send again
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { reminderSent: true },
        });

      } catch (error) {
        console.error(
          `Failed to send reminder for ${sub.service}:`,
          error
        );
      }
    }
  });

  console.log("Reminder cron job started — runs daily at 9 AM");
}

module.exports = startReminderCron;