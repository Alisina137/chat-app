# Chat App (React + Vite + Firebase)

## Features
- Google sign-in (Firebase Auth)
- Protected `/chats` route (redirects to login if signed out)
- Global chat room backed by Firestore (`messages` collection)
- Send/receive messages in real time

## Getting started

Install dependencies:

```bash
npm install
```

Start dev server:

```bash
npm run dev
```

## Environment variables (recommended)

This project supports Vite env vars. Copy `.env.example` to `.env` and fill in values:

```bash
copy .env.example .env
```

The app will still run without a `.env` because it falls back to the existing Firebase config in `src/firebase.js`.

## Notes
- The Facebook button is disabled by default because it expects a separate backend at `http://localhost:5000`. You can show it by setting `VITE_ENABLE_FACEBOOK_AUTH=true`.

## Firestore security rules
If you see `"permission denied"` when adding members or deleting chats, you need to deploy Firestore rules that allow those operations.

This repo includes an example rules file: `firestore.rules.example`.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

# chat-app
