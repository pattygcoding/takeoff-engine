# Takeoff Engine

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![React Router](https://img.shields.io/badge/React_Router-7-CA4245?logo=reactrouter&logoColor=white)](https://reactrouter.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth_%26_DB-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Express.js](https://img.shields.io/badge/Express.js-Backend_API-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![PapaParse](https://img.shields.io/badge/PapaParse-CSV_Parsing-8A2BE2)](https://www.papaparse.com/)
[![jsPDF](https://img.shields.io/badge/jsPDF-PDF_Export-EC1C24)](https://github.com/parallax/jsPDF)

A fast, responsive web application and SaaS platform for contractors, estimators, and engineers. It turns raw construction takeoff spreadsheets (CSV or Excel) into itemized cost breakdowns, earthwork/trenching volume estimates, and client-ready Word/PDF bid proposals.

---

## ⚡ Key Features

- **Multi-Step Guided Workflow**:
  1. **Upload Takeoff** (`/:username`) — Drag-and-drop CSV or Excel (`.xlsx`/`.xls`) files with automatic column detection, trench depth parsing, and data validation.
  2. **Interactive Spreadsheet Grid** (`/:username/edit`) — Inline cell editing, line item additions/deletions, real-time recalculations, and a slide-out **Pricing & Markup Drawer** (labor production rates, hourly wages, trench width, markups, overhead %, contingency %, profit margin %, mobilization).
  3. **Proposal & Estimating Hub** (`/:username/results`) — Real-time cost summaries by trade/system, internal breakdown vs. client-facing lump-sum toggle, printable view, high-resolution PDF export, Word `.docx` export, and Excel export.
- **Authentication & User Profiles**:
  - Secure native Supabase Auth with password encryption.
  - User profile persistence in PostgreSQL (`first_name`, `last_name`, `username`, `email`, `phone_number`).
  - Username-namespaced workspace routes (`/:username/*`).
- **Earthwork & Trench Volume Calculation Engine**:
  - Automatically calculates trench excavation cubic yardage for linear foot pipe items based on quantity $\times$ trench depth $\times$ configurable trench width.

> 📄 **Non-technical client instructions:** see [`public/CLIENT_GUIDE.md`](./public/CLIENT_GUIDE.md) for a plain-language guide on how to fill out takeoff files.

---

## 🛠️ Architecture

```
takeoff-engine/          # Frontend (React 19, Vite, Tailwind CSS, React Router 7)
takeoff-engine-backend/  # Backend (Express.js, Supabase Auth/PostgreSQL, Swagger UI)
buisness-goals/saas/     # SaaS monetization blueprint & roadmap
```

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or later recommended)
- npm (bundled with Node.js)
- Running instance of `takeoff-engine-backend` on port `5000`

### 2. Install & Run Frontend Locally
```powershell
# Navigate to frontend folder
cd takeoff-engine

# Install dependencies
npm install

# Start development server
npm run dev
```

App will run at `http://localhost:5173`.

### 3. Production Build
```powershell
npm run build
```

The optimized static build is generated in the `dist/` directory.

---

## 💳 Paddle Sandbox & Non-Prod Payment Testing Guide (US-018)

When testing upgrades in non-production (`VITE_PADDLE_ENVIRONMENT=sandbox`), use the following verified Paddle Sandbox test card credentials:

| Test Scenario | Card Number | Expiry | CVV | Postal Code | Expected Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Standard / Visa Success** | `4242 ···· ···· 4242` | Any future date (e.g. `12/28`) | `123` | `90210` / `SW1A 1AA` | **Success** (Subscription activated) |
| **Mastercard Success** | `5555 ···· ···· 4444` | Any future date | `123` | `10001` | **Success** (Subscription activated) |
| **Declined (Insufficient Funds)** | `4000 ···· ···· 0002` | Any future date | `123` | `90210` | **Declined** (`insufficient_funds`) |
| **Declined (Fraud / Risk Alert)** | `4000 ···· ···· 0005` | Any future date | `123` | `90210` | **Declined** (`risk_threshold_exceeded`) |
| **3D Secure Challenge** | `4000 ···· ···· 0006` | Any future date | `123` | `90210` | Triggers 3DS challenge popup |

### Local Webhook Testing & Forwarding
1. Start your local backend on port `5000`.
2. Start an `ngrok` tunnel: `ngrok http 5000`.
3. In your **Paddle Sandbox Dashboard** $\rightarrow$ **Developer Tools** $\rightarrow$ **Notifications**, set the webhook destination to `https://<your-ngrok-subdomain>.ngrok-free.app/api/webhooks/paddle`.
4. Alternatively, use the test endpoint `POST /api/billing/mock-webhook` with `{ "eventType": "subscription.created", "userId": "<UUID>" }` to test webhook event triggers without external network tunnels.


5. In your GitHub repository, go to **Settings > Pages** and set the source branch to `gh-pages`. Your site will be published at:

   ```
   https://<your-username>.github.io/<your-repo-name>/
   ```

### Option 2: Deploy with Vercel (recommended, zero-config)

1. Push your code to GitHub (see steps above).
2. Go to [vercel.com](https://vercel.com/) and sign in with your GitHub account.
3. Click **Add New... > Project**, then select your repository.
4. Vercel automatically detects the Vite framework preset. Leave the default build settings (`npm run build`, output directory `dist`).
5. Click **Deploy**. After a minute, Vercel will provide you with a live URL (e.g., `https://your-repo-name.vercel.app`).

Any future `git push` to your main branch will automatically trigger a new deployment.

### Option 3: Deploy with Netlify

1. Push your code to GitHub.
2. Go to [netlify.com](https://www.netlify.com/) and sign in with your GitHub account.
3. Click **Add new site > Import an existing project**, then select your repository.
4. Set the build command to `npm run build` and the publish directory to `dist`.
5. Click **Deploy site**. Netlify will give you a live URL once the build completes.

