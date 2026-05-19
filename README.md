# SubTracker — AI-Powered Subscription Intelligence

> Never get surprise-charged again. SubTracker scans your Gmail, detects active trials and subscriptions using Gemini AI, and alerts you before you get billed.

## What It Does

- Connects to your Gmail via Google OAuth
- Scans emails and classifies them using Gemini AI
- Detects active trials, subscriptions, and billing notices
- Shows days remaining before trial ends
- Sends email reminders 3 days before you get charged
- Displays monthly spend with USD / INR / GBP currency switching
- One-click cancel search for any subscription

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Auth | Google OAuth 2.0 + Passport.js |
| Email Scanning | Gmail API |
| AI Classification | Google Gemini 2.0 Flash |
| Database | Prisma ORM + SQLite |
| Reminders | node-cron + Nodemailer |

## Architecture
Gmail API
↓
gmail.service.js — fetches emails
↓
classifier.js — routes to AI provider
↓
geminiProvider.js — classifies with Gemini
↓
Prisma — saves to SQLite
↓
React Dashboard — displays results
↓
node-cron — sends reminder emails daily

## AI Classification

Each email is classified into one of:

| Type | Meaning |
|------|---------|
| `ACTIVE_TRIAL` | User is currently on a free trial |
| `ACTIVE_SUBSCRIPTION` | User is actively subscribed or billed |
| `BILLING_NOTICE` | Invoice or payment confirmation |
| `PROMOTIONAL_OFFER` | Marketing email — ignored |
| `NEWSLETTER` | Informational — ignored |

Only real subscriptions are saved. Promotional emails are filtered out automatically.

## Pluggable AI Architecture

The classifier is provider-agnostic. To swap Gemini for OpenAI or Claude, change one line in `classifier.js`:

```javascript
// Currently using Gemini
const activeProvider = geminiProvider;

// Switch to OpenAI — change only this line
const activeProvider = openaiProvider;
```

## Getting Started

### Prerequisites
- Node.js v18+
- Google Cloud project with Gmail API enabled
- Gemini API key — free at [aistudio.google.com](https://aistudio.google.com)

### Setup

1. Clone the repo
```bash
git clone https://github.com/namratapagariya/SubTracker.git
cd SubTracker
```

2. Install dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
```

3. Create `backend/.env` using the provided `.env.example` file and fill in your keys

4. Run database migration
```bash
cd backend
npx prisma migrate dev --name init
```

5. Start the app
```bash
# Terminal 1 — backend
cd backend && node server.js

# Terminal 2 — frontend
cd frontend && npm run dev
```

6. Open `http://localhost:5173` and click **Scan Gmail**

## Project Structure

```
SubTracker/
├── backend/
│   ├── services/
│   │   ├── ai/
│   │   │   ├── classifier.js          # Provider router
│   │   │   └── providers/
│   │   │       └── geminiProvider.js  # Gemini integration
│   │   ├── gmail.service.js           # Gmail API + email parsing
│   │   └── reminder.service.js        # Cron job + Nodemailer
│   ├── prisma/
│   │   └── schema.prisma              # Database schema
│   ├── server.js                      # Express server + OAuth
│   └── prismaClient.js                # Prisma client
└── frontend/
    └── src/
        ├── App.jsx                    # Dashboard + currency switcher
        └── App.css                    # Bloomberg glass styling
```
## Features In Detail

**Smart Email Classification**
Gemini AI understands email context — distinguishes between "Start your free trial" (promotional) and "Your trial has started" (active trial). Confidence score included with every classification.

**Duplicate Prevention**
Uses Gmail message ID as unique key — rescanning never creates duplicate entries.

**Currency Switching**
Live conversion between USD, INR, and GBP. All prices update instantly including monthly total.

**Automated Reminders**
Cron job runs daily at 9 AM. Sends email warning 3 days before any trial expires. reminderSent flag prevents duplicate notifications.

## Roadmap

- [ ] Deploy to Railway + Vercel
- [ ] Multi-user support with proper User model
- [ ] FastAPI wrapper for Python AI ecosystem
- [ ] Chrome extension for one-click cancel
- [ ] PostgreSQL for production database

## Skills Demonstrated

`OAuth 2.0` `Gmail API` `LLM Integration` `Prompt Engineering` `REST APIs` `Prisma ORM` `React` `Node.js` `Cron Jobs` `Full Stack Engineering`

---

Built by [Namrata Pagariya](https://github.com/namratapagariya)
