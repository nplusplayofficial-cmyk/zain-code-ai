# ZAIN Code AI

A privacy-conscious coding assistant built with React, Vite, and Express. The interface can generate code through a local Ollama model or a hosted AI provider that you explicitly select.

## Features

- Local Ollama / Qwen support for local-first use
- Optional Gemini, OpenRouter, Groq, OpenAI, and DeepSeek providers
- Provider API keys stay on the backend and must be configured as environment secrets
- Language selector, code-only mode, prompt history for the current browser session, copy output, and optional Python test cases
- Python syntax checking and optional sample-test execution
- GitHub Actions runs a frontend production build and backend API smoke tests

## Run locally

Requirements: Node.js 20+ and (for local AI) Ollama with a coding model installed.

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` if you want to configure environment values.
3. Start the backend in one terminal: `npm run backend`
4. Start the frontend in another terminal: `npm run dev`
5. Open the local URL printed by Vite.

For local Ollama, start Ollama and pull the model named in `OLLAMA_MODEL` (default: `qwen2.5-coder:7b`).

## Production / hosted deployment

Build the frontend with `npm run build`, then start the single web service with `npm start`. Express serves the built frontend and the `/api/*` endpoints on the same port, using the platform-provided `PORT` value. For Replit Deployments, use `npm run build` as the build command and `npm start` as the run command, then add your selected provider key in Replit Secrets. A preview/workspace is not the same as a deployed, always-on production service.

## Hosted provider setup

For a hosted environment such as Replit, add the key for the provider you choose in the platform's **Secrets / Environment variables** panel. Do not commit real keys to GitHub, put them in frontend variables, or share them in chat.

| Provider selection | Secret name | Default model |
|---|---|---|
| Gemini | `GEMINI_API_KEY` | `gemini-2.5-flash` |
| OpenRouter | `OPENROUTER_API_KEY` | `meta-llama/llama-3.3-70b-instruct:free` |
| Groq | `GROQ_API_KEY` | `qwen/qwen3-32b` |
| OpenAI | `OPENAI_API_KEY` | `gpt-4.1-mini` |
| DeepSeek | `DEEPSEEK_API_KEY` | `deepseek-chat` |

The model names can be overridden with the matching `*_MODEL` environment variable. Free availability, quotas, and model access vary by provider and can change. OpenAI API usage is billed separately from a ChatGPT subscription. A provider key is not included with this repository.

GitHub Pages builds the frontend with the correct `/zain-code-ai/` asset base using `.github/workflows/pages.yml`. In **Settings → Pages**, set the publishing source to **GitHub Actions** so the built `dist` folder is deployed; the legacy branch-based Pages source serves raw JSX source and can result in a blank page.

GitHub Pages is static hosting and cannot run the Express backend. To connect the Pages frontend to a separately hosted backend, set the repository Actions variable `VITE_API_BASE_URL` to the backend origin (for example `https://your-backend.example`, with no trailing slash) under **Settings → Secrets and variables → Actions → Variables**, then redeploy. The frontend calls `${VITE_API_BASE_URL}/api/health` and `${VITE_API_BASE_URL}/api/generate`; if the variable is empty, it falls back to same-origin `/api`. On the backend host, set `FRONTEND_ORIGIN=https://nplusplayofficial-cmyk.github.io` and the selected AI provider secret. Never put provider API keys in the frontend or GitHub Actions variables.

The backend defaults to Ollama when no provider is selected in the request. On a hosted environment without Ollama, choose a configured hosted provider in the app. The backend health endpoint reports which providers have keys configured without exposing the keys themselves.

## Privacy and safety

- Local Ollama requests stay on the machine running the backend.
- If you select a hosted provider, prompts and test cases are sent to that provider's API and are subject to its terms and data practices.
- Never put secrets in frontend code or in Git.
- Generated code is not a security sandbox. Do not execute untrusted code on a machine with sensitive data; test untrusted programs in a properly isolated environment.
- The current prompt history is held in browser memory and is not persistent account-based memory.

## Verification

Run `npm run build` for the production frontend build and `npm test` for backend API smoke tests. GitHub Actions runs both on pushes and pull requests to `main`.

## Current limitations

- Python is the only language that is syntax-checked and executed by the built-in test runner.
- Other languages receive generated code but are not compiled or executed by this starter.
- This repository does not include API keys, hosting credentials, or a guaranteed free AI quota.
