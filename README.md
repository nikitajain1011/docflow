# StrategyAI

StrategyAI is a deployable web app that converts pasted customer reviews or feedback into a concise product strategy brief using the Groq API.

## Features

- Paste customer feedback into a focused analysis workspace
- Generate a structured brief with top pain points, opportunity areas, priority scores, and product direction
- Keeps the Groq API key server-side
- Runs locally with plain Node.js
- Deploys cleanly to Vercel as a live URL

## Local setup

1. Set your OpenAI API key:

   ```powershell
   $env:GROQ_API_KEY="your_api_key_here"
   ```

2. Start the app:

   ```powershell
   npm run dev
   ```

3. Open `http://localhost:3000`.

The app uses Groq model `llama-3.3-70b-versatile`.

## Deploy to a live URL

1. Push this folder to a GitHub repository.
2. Import the repository in Vercel.
3. Add an environment variable named `GROQ_API_KEY`.
4. Deploy. Vercel will serve `public/index.html` and the serverless function at `/api/analyze`.
