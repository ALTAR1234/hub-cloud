# Hub (cloud)

A passcode-protected phone web app on Cloudflare Workers: Jarvis (Gemini), news, TV, a Listener-style music library and games, working even when the PC is off.

## Run

```
npx wrangler deploy
```

Secrets (GEMINI_API_KEY, SETUP_CODE, SYNC_TOKEN) are set with `wrangler secret put` and never committed.
