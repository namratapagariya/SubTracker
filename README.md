
markdown# SubTracker — AI-Powered Subscription Intelligence

> Never get surprise-charged again. SubTracker scans your Gmail, detects active trials and subscriptions using Gemini AI, and alerts you before you get billed.

![SubTracker Dashboard](./screenshots/dashboard.png)

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

Only real subscriptions are saved to the database. Promotional emails are filtered out automatically.

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
- Gemini API key (free at aistudio.google.com)
- Gmail account

### Setup

1. Clone the repo
```bash
git clone https://github.com/namratapagariya/SubTracker.git
cd SubTracker
```

2. Install backend dependencies
```bash
cd backend
npm install
```

3. Install frontend dependencies
```bash
cd ../frontend
npm install
```

4. Create `backend/.env`
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SESSION_SECRET=any_random_string
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY=your_gemini_api_key
SENDER_EMAIL=your_gmail@gmail.com
SENDER_PASS=your_gmail_app_password
PORT=5000

5. Run database migration
```bash
cd backend
npx prisma migrate dev --name init
```

6. Start backend
```bash
node server.js
```

7. Start frontend
```bash
cd frontend
npm run dev
```

8. Open `http://localhost:5173` and click **Scan Gmail**

## Features In Detail

### Smart Email Classification
Uses Gemini AI to understand email context — distinguishes between "Start your free trial" (promotional) and "Your trial has started" (active trial). Confidence score included with every classification.

### Duplicate Prevention
Uses Gmail message ID as unique key — rescanning never creates duplicate entries.

### Currency Switching
Live conversion between USD, INR, and GBP on the dashboard. All prices update instantly including monthly total.

### Automated Reminders
Cron job runs daily at 9 AM. Sends email warning 3 days before any trial expires. `reminderSent` flag prevents duplicate notifications.

## Project Structure
SubTracker/
├── backend/
│   ├── services/
│   │   ├── ai/
│   │   │   ├── classifier.js
│   │   │   └── providers/
│   │   │       └── geminiProvider.js
│   │   ├── gmail.service.js
│   │   └── reminder.service.js
│   ├── prisma/
│   │   └── schema.prisma
│   ├── server.js
│   └── prismaClient.js
├── frontend/
│   └── src/
│       ├── App.jsx
│       └── App.css
└── README.md

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
Paste this into your README.md. Then commit:
