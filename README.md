# Ai-tune-and-refine

This is a hobby project to learn **TypeScript**, **APIs**, **React**, a simple **full-stack architecture** (frontend on GitHub Pages + backend on Cloudflare Workers), and **AI**.

The main goal is to implement a clean chat wrapper around the **Google Gemini API**.  
Planned features include tuning AI responses and allowing users to edit parts of an assistant message to get a better explanation for a specific word or topic from the response.

## Live Demo

Frontend: https://shinahov.github.io/Ai-tune-and-refine/

## Current Status

- The demo currently supports basic chatting.
- The model is set to `gemma-3-1b-it` for testing purposes (low cost, i have no money). Larger models will be used later when billing is enabled.
- The UI style/components are based on the `assistant-ui` library.

## Architecture

Monorepo:
- `frontend/` — Vite + React + TypeScript, deployed to GitHub Pages
- `backend/` — Cloudflare Worker that proxies requests to the Google Generative Language API
