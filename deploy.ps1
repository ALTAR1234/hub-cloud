# Uploads the TV and PC-game lists, then deploys Hub to Cloudflare.
Set-Location $PSScriptRoot
npx.cmd --yes wrangler@4 kv key put --binding HUB tv --path sync/tv.json --remote
npx.cmd --yes wrangler@4 kv key put --binding HUB pcgames --path sync/pcgames.json --remote
npx.cmd --yes wrangler@4 deploy
