# Mango Business Management System — Claude Code Context

## Project Overview
A full-stack React + Supabase business management web application for a live mango retail business. Currently in active production use. Deployed on Netlify at management-console-975310.netlify.app.

## Tech Stack
- Frontend: React 18, Vite, React Router v6, Tailwind CSS v3
- Backend: Supabase (PostgreSQL, Auth, Edge Functions)
- Charts: Recharts
- Export: SheetJS, jsPDF
- Hosting: Netlify
- State: React Context API (AppContext + ThemeContext)

## CRITICAL — Never Modify These Files
- src/supabaseClient.js
- src/context/AppContext.jsx
- src/utils/calculations.js
- src/utils/exportHelpers.js
- src/utils/formatCurrency.js
- src/context/ThemeContext.jsx
- supabase/schema.sql

## Important Project Details
- Dark mode uses Tailwind darkMode: 'class' strategy — ThemeContext toggles 'dark' class on html element
- All currency formatted using toLocaleString('en-IN') with ₹ symbol
- Supabase credentials are in src/supabaseClient.js — never commit this file, it is in .gitignore
- The _redirects file in public/ must never be removed — it handles Netlify SPA routing
- Quantity inputs support 0.5 dozen increments throughout the app
- Two Supabase projects exist: real (uijkwfiathigirtprwxe) and demo (qijydtrpbgqicqvhvxgb)

## Build Command
npm run build

## Development Command
npm run dev

## Deployment
Drag dist/ folder to Netlify after every build. Never deploy the demo credentials to the real site.

## Current Task
Converting this React app to a PWA (Progressive Web App) so it can be installed on Android and iPhone home screens. Must not break any existing functionality.
