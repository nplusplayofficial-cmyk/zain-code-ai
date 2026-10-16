# ZAIN Code AI — free backend setup

The frontend is hosted on GitHub Pages. GitHub Pages cannot run the Express API, so the API is implemented as a Cloudflare Worker. The Worker keeps provider keys on the server and supports Gemini plus OpenAI-compatible providers.

## One-time account setup

1. Create/sign in to a Cloudflare account and open **Workers & Pages**.
2. Find your Cloudflare **Account ID** in the account overview.
3. Create an API token with permission to edit/deploy Workers (Workers Scripts: Edit; Account Settings: Read if requested by the dashboard).
4. In this GitHub repository open **Settings → Secrets and variables → Actions**:
   - Add repository secret `CLOUDFLARE_API_TOKEN` with the token.
   - Add repository secret `CLOUDFLARE_ACCOUNT_ID` with your Account ID.
   - Add repository secret `GEMINI_API_KEY` with your Gemini key.
5. In the same page open **Variables** and add `VITE_API_BASE_URL` with your Worker URL, for example `https://zain-code-ai-api.<your-cloudflare-subdomain>.workers.dev`. Do not include a trailing slash.
6. Open **Actions → Deploy ZAIN API to Cloudflare Workers → Run workflow**. Wait for the green check.
7. The Pages workflow runs automatically when code is pushed. To rebuild the frontend after setting `VITE_API_BASE_URL`, open **Actions → Deploy ZAIN Code AI to GitHub Pages → Run workflow**.

## Verify

Open `https://<your-worker-url>/api/health`. It should return JSON with `"status":"ok"` and `"providers":{"gemini":true,...}`.

## Secrets and cost

Never commit API keys or place them in frontend source. Cloudflare Worker free usage limits and Gemini API quotas apply; they may change. The Worker does not execute generated code, so its response explicitly says tests were not run. Cloudflare account signup or verification requirements can vary by account.
