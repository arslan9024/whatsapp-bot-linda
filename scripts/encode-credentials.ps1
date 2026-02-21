# Encode credentials to base64 for .env migration
cd "c:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda"

$credentials = @{
  'PowerAgent' = 'code/GoogleAPI/keys.json'
  'Goraha' = 'code/GoogleAPI/keys-goraha.json'
}

$encoded = @{}

foreach ($account in $credentials.Keys) {
  $path = $credentials[$account]
  if (Test-Path $path) {
    $content = Get-Content -Path $path -Raw
    $base64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($content))
    $encoded[$account] = $base64
    Write-Host "✅ $account encoded: $($base64.Length) characters"
  } else {
    Write-Host "❌ File not found: $path"
  }
}

# Output for manual .env update
Write-Host "`n═══════════════════════════════════════════════════════════════"
Write-Host "ADD THESE TO .env (REPLACE EXISTING ENTRIES):"
Write-Host "═══════════════════════════════════════════════════════════════`n"

foreach ($account in $encoded.Keys) {
  $varName = "GOOGLE_ACCOUNT_$($account.ToUpper())_KEYS_BASE64"
  Write-Host "$varName=`n$($encoded[$account])`n"
}

# Save to temporary files for easier copying
$encoded['PowerAgent'] | Out-File -FilePath "/tmp/poweragent.base64" -NoNewline -Encoding UTF8
$encoded['Goraha'] | Out-File -FilePath "/tmp/goraha.base64" -NoNewline -Encoding UTF8

Write-Host "`n✅ Base64 files saved to /tmp/ for reference`n"
