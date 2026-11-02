# One-time: makes the setup code (used once on your phone to create your passcode)
# and asks for your Gemini API key. Both are stored as Cloudflare secrets.
Set-Location $PSScriptRoot
$chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
$bytes = New-Object byte[] 10
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$code = -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
$code | npx.cmd --yes wrangler@4 secret put SETUP_CODE
Write-Output ''
Write-Output '================================================'
Write-Output "  Your one-time setup code:  $code"
Write-Output '  (type it on your phone when Hub asks for it)'
Write-Output '================================================'
Write-Output ''
Write-Output 'Next: paste your Gemini API key when asked, then press Enter.'
Write-Output '(It will not show on screen. Get one at aistudio.google.com/apikey)'
npx.cmd --yes wrangler@4 secret put GEMINI_API_KEY
Write-Output ''
Write-Output "Done. Open https://hub.arjun-hub.workers.dev on your iPhone and enter the setup code: $code"
