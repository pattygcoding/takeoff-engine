# Takeoff Engine

A basic React.js application (built with [Vite](https://vite.dev/)) that displays "Hello World" on the front page.

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

3. Open the URL shown in the terminal (typically `http://localhost:5173`) in your browser. You should see "Hello World".

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
   git commit -m "Initial commit: React hello world app"
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

