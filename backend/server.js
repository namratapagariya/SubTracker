require("dotenv").config();
const fetchTrialEmails = require("./services/gmail.service");
const startReminderCron = require("./services/reminder.service");
const express = require("express");
const cors = require("cors");
const passport = require("passport");
const session = require("express-session");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const prisma = require("./prismaClient");

const app = express();

// Track scanning status per user
let scanningStatus = {};

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.BACKEND_URL 
  ? `${process.env.BACKEND_URL}/auth/google/callback`
  : "http://localhost:5000/auth/google/callback",
  },
  async (accessToken, refreshToken, profile, done) => {

    // Save or update user in database
    const user = await prisma.user.upsert({
      where: { id: profile.id },
      update: {
        name: profile.displayName,
        email: profile.emails?.[0]?.value || "",
      },
      create: {
        id: profile.id,
        name: profile.displayName,
        email: profile.emails?.[0]?.value || "",
      },
    });

    // Mark scanning as started
    scanningStatus[user.id] = true;

    // Scan runs in background — redirect happens immediately
    fetchTrialEmails(accessToken, user.id).then(emails => {
      console.log(emails);
      scanningStatus[user.id] = false;
    }).catch(err => {
      console.error("Scan error:", err);
      scanningStatus[user.id] = false;
    });

    return done(null, { profile, userId: user.id });
  }
));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

app.get("/", (req, res) => {
  res.send("Server running");
});

// Returns scanning status for logged in user
app.get("/scan-status", (req, res) => {
  if (!req.user) return res.json({ scanning: false });
  const userId = req.user.profile.id;
  res.json({ scanning: scanningStatus[userId] || false });
});

// Returns logged in user's name and email
app.get("/me", (req, res) => {
  if (req.user) {
    res.json({
      name: req.user.profile.displayName,
      email: req.user.profile.emails?.[0]?.value,
    });
  } else {
    res.json({ name: null, email: null });
  }
});

app.get("/auth/google",
  passport.authenticate("google", {
    scope: [
      "profile",
      "email",
      "https://www.googleapis.com/auth/gmail.readonly"
    ],
    accessType: "offline",
    prompt: "consent",
  })
);

app.get("/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/"
  }),
  (req, res) => {
    res.redirect("http://localhost:5173?scanned=true");
  }
);

// Only returns subscriptions for the logged in user
app.get("/subscriptions", async (req, res) => {
  try {
    if (!req.user) return res.json([]);
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: req.user.profile.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(subscriptions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch subscriptions" });
  }
});

// Only clears subscriptions for the logged in user
app.delete("/subscriptions/clear", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Not logged in" });
    await prisma.subscription.deleteMany({
      where: { userId: req.user.profile.id },
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to clear" });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startReminderCron();
});