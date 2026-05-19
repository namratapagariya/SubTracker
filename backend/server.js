require("dotenv").config();
const fetchTrialEmails = require("./services/gmail.service");
const express = require("express");
const cors = require("cors");
const passport = require("passport");
const session = require("express-session");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const prisma = require("./prismaClient");
const app = express();

app.use(cors());

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
    callbackURL: "http://localhost:5000/auth/google/callback",
  },
  async (accessToken, refreshToken, profile, done) => {
    const emails = await fetchTrialEmails(accessToken);

console.log(emails);

return done(null, {
  profile,
  emails,
});
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

app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email","https://www.googleapis.com/auth/gmail.readonly"]
  })
);

app.get("/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/"
  }),
  (req, res) => {
  res.redirect("http://localhost:5173");
}
);

const PORT = process.env.PORT || 5000;
app.get("/subscriptions", async (req, res) => {

  try {

    const subscriptions =
      await prisma.subscription.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });

    res.json(subscriptions);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Failed to fetch subscriptions",
    });
  }
});
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});