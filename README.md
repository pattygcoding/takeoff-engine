# Takeoff Engine

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![React Router](https://img.shields.io/badge/React_Router-7-CA4245?logo=reactrouter&logoColor=white)](https://reactrouter.com/)
[![PapaParse](https://img.shields.io/badge/PapaParse-CSV_Parsing-8A2BE2)](https://www.papaparse.com/)
[![jsPDF](https://img.shields.io/badge/jsPDF-PDF_Export-EC1C24)](https://github.com/parallax/jsPDF)
[![Deployed on GitHub Pages](https://img.shields.io/badge/Deployed-GitHub_Pages-222?logo=github)](https://pattygcoding.github.io/takeoff-engine/)

A lightweight, client-side web application that turns raw construction takeoff CSVs into detailed pricing estimates and client-ready proposals. The entire app runs statically in the browser — no backend or database required — and is deployed for free on GitHub Pages.

**Live demo:** https://pattygcoding.github.io/takeoff-engine/

## What it does

Takeoff Engine walks a contractor through a simple 3-step workflow:

1. **Upload Takeoff** (`/`) — Drag-and-drop a CSV **or Excel (.xlsx/.xls)** export of your construction takeoff (system, item description, size/spec, quantity, unit, average trench depth). Includes client-side validation and downloadable sample CSV and Excel templates to get started quickly.
2. **Edit & Review** (`/edit`) — Fine-tune the imported data in an editable spreadsheet-style grid (add, edit, or delete line items inline). A slide-out **Pricing & Markup** drawer lets you set material unit costs, labor production rates, labor hourly rate, trench width, overhead %, contingency %, profit margin %, and mobilization/equipment costs. All pricing settings persist to `localStorage` so they're remembered between sessions.
3. **Results & Proposal** (`/results`) — View a full internal cost breakdown by system (material cost, labor hours/cost, equipment cost, overhead, contingency, profit, and final bid amount), or flip on **Client-Facing Proposal Mode** to hide internal markups and labor details and show a clean lump-sum summary. Export the results as a **PDF** or **CSV/Excel** file, or print directly from the browser.

Trenching and earthwork volumes are automatically calculated from quantity × average depth × trench width for linear-foot pipe items.

> 📄 **Non-technical client instructions:** see [`public/CLIENT_GUIDE.md`](./public/CLIENT_GUIDE.md) for a plain-language guide on how to fill out the CSV/Excel takeoff file, including required columns and the boundaries of what the import will and won't accept.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- npm (comes bundled with Node.js)
- A [GitHub](https://github.com/) account (for publishing the source code)

## Running the app locally

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Start the development server:

   ```powershell
   npm run dev
   ```

3. Open the URL shown in the terminal (typically `http://localhost:5173`) in your browser. Try uploading `public/sample_takeoff.csv` or `public/sample_takeoff.xlsx` (or download either sample template from within the app) to see it in action.

To create an optimized production build, run:

```powershell
npm run build
```

The output will be generated in the `dist` folder. You can preview the production build locally with:

```powershell
npm run preview
```

## Publishing the code to GitHub

If this folder is not yet connected to a GitHub repository, follow these steps:

1. Create a new (empty) repository on [GitHub](https://github.com/new). Do **not** initialize it with a README, `.gitignore`, or license, since this project already has them.

2. In a terminal, from the project root, initialize git (skip if already a git repo) and commit your files:

   ```powershell
   git init
   git add .
   git commit -m "Initial commit: Takeoff Engine app"
   ```

3. Add your GitHub repository as the remote origin (replace the URL with your own repository's URL):

   ```powershell
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   ```

4. Push your code to GitHub:

   ```powershell
   git branch -M main
   git push -u origin main
   ```

From now on, after making changes, you can publish updates with:

```powershell
git add .
git commit -m "Describe your changes"
git push
```

## Deploying the app to a website

There are several free ways to deploy this Vite/React app. Three popular options are **GitHub Pages**, **Vercel**, and **Netlify**.

### Option 1: Deploy with GitHub Pages

1. Install the `gh-pages` package as a dev dependency:

   ```powershell
   npm install --save-dev gh-pages
   ```

2. In `vite.config.js`, set the `base` option to your repository name (required for GitHub Pages project sites):

   ```js
   export default defineConfig({
     base: '/<your-repo-name>/',
     // ...other config
   })
   ```

3. Add the following scripts to your `package.json`:

   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```

4. Deploy the app:

   ```powershell
   npm run deploy
   ```

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

