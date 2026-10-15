# ZAIN Code AI

A privacy-conscious coding assistant starter built with React, Vite, and Express.

## Features

- Local Ollama model support (default provider; no API bill)
- Optional Gemini API provider (requires your own key and is subject to Google's current free-tier limits and terms)
- Model/provider selector
- Code generation with simple Python syntax checks and optional test cases
- Keys are read from the backend environment only; never place secrets in frontend code

## Requirements

- Node.js 20+ recommended
- Ollama installed and running, with a code model pulled (default: `qwen2.5-coder:7b`)

## Setup

1. Copy `.env.example` to `.env` and edit only if you choose a cloud provider.
2. Install dependencies: `npm install`
3. Start the backend: `npm run backend`
4. In a second terminal start the frontend: `npm run dev`
5. Open the local URL printed by Vite.

## Privacy and safety

Local Ollama requests stay on your machine. If you select Gemini, prompts are sent to Google's API and are subject to its current terms and data practices. Do not paste passwords, tokens, or private keys into prompts. Generated code is not a security sandbox; run untrusted code only in a properly isolated environment.

## Limitations

This starter does not include ChatGPT or DeepSeek API integration by default, since those APIs may incur charges. Gemini free tier is not guaranteed for all models or usage levels; check current terms and quotas before use.
