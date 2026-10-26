# DAMAC HILLS 2 - DATA MIGRATION (PowerShell)
param([int]$Limit = 50)

$API = 'http://localhost:5000/api/v1/damac'
$FNAMES = 'Ahmed','Mohammed','Fatima','Aisha','Ali','Sara','Omar','Zainab','Hassan','Noor','Ibrahim','Layla','Khalid','Maryam','Abdullah','Hana'
$LNAMES = 'Al Maktoum','Al Mansouri','Al Qassimi','Al Muhairi','Al Khaleej','Al Marri','Al Abri','Al Ketbi'
$PHONES = '+971501','+971502','+971503', '+971504','+971505'

function Random-Phone { $p = $PHONES | Get-Random; return "$p$(Get-Random -Min 1000000 -Max 9999999)" }
function Random-Email { param($f,$l); $d = 'gmail.com','yahoo.com','outlook.com' | Get-Random; return "$($f.ToLower()).$($l.ToLower())@$d" }

function New-Owner($i) {
    $fn = $FNAMES | Get-Random
    $ln = $LNAMES | Get-Random
    return @{
        firstName = $fn
        lastName = $ln
        primaryPhone = Random-Phone
        email = Random-Email $fn $ln
        ownerId = "OWNER-$('{0:D6}' -f $i)"
        status = 'active'
        verified = ((Get-Random) -gt 0.2)
        properties = Get-Random -Min 1 -Max 5
        notes = 'DAMAC resident'
    }
}

function New-Contact($id, $name, $i) {
    return @{
        contactId = "CONTACT-$('{0:D6}' -f $i)"
        ownerId = $id
        contactType = 'whatsapp'
        name = $name
        phone = Random-Phone
        email = Random-Email 'contact' $name
        status = 'active'
        notes = 'Via WhatsApp Bot Linda'
    }
}

function Post-Owner($data) {
    try {
        $r = Invoke-WebRequest -Uri "$API/owners" -Method POST -ContentType 'application/json' `
            -Body ($data | ConvertTo-Json) -UseBasicParsing -ErrorAction Stop
        $j = $r.Content | ConvertFrom-Json
        return @{ ok = $true; id = $j.data._id }
    }
    catch { return @{ ok = $false; err = $_.Exception.Message } }
}

function Post-Contact($data) {
    try {
        $r = Invoke-WebRequest -Uri "$API/contacts" -Method POST -ContentType 'application/json' `
            -Body ($data | ConvertTo-Json) -UseBasicParsing -ErrorAction Stop
        return @{ ok = $true }
    }
    catch { return @{ ok = $false; err = $_.Exception.Message } }
}

function Get-Count() {
    try {
        $r = Invoke-WebRequest -Uri "$API/owners?limit=1" -UseBasicParsing -ErrorAction Stop
        $j = $r.Content | ConvertFrom-Json
        return $j.pagination.total
    }
    catch { return 0 }
}

Write-Host "`n╔════════════════════════════════════════════════════════════════╗"
Write-Host "║            DAMAC HILLS 2 - DATA MIGRATION EXECUTION          ║"
Write-Host "╚════════════════════════════════════════════════════════════════╝`n"

$before = Get-Count
Write-Host "📊 Before:  $before owners"

$time = Measure-Command {
    $good = 0; $bad = 0
    for ($i = 1; $i -le $Limit; $i++) {
        if ($i % 25 -eq 0) { Write-Host "  [$i/$Limit] Processing..." }
        $owner = New-Owner($i)
        $res = Post-Owner($owner)
        if ($res.ok) {
            $good++
            $contact = New-Contact($res.id, "$($owner.firstName) $($owner.lastName)", $i)
            Post-Contact($contact) | Out-Null
        }
        else { $bad++ }
    }
}

$after = Get-Count
$loaded = $after - $before

Write-Host "⏱️  Duration: $([Math]::Round($time.TotalSeconds, 1))s"
Write-Host "✓ Created:  $good records"
Write-Host "✗ Failed:   $bad records"
Write-Host "📊 After:   $after owners"
Write-Host "➕ Loaded:  $loaded owners"
Write-Host "✅ Success: $(if ($loaded -gt 0) { 'PASS' } else { 'FAIL' })`n"

exit 0
