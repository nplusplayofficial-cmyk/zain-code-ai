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
