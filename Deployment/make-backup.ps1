# BUD Office — бекап проєкту (без node_modules і без старих zip)
$ErrorActionPreference = "Stop"
$root = "F:\BUD_office"
$date = Get-Date -Format "yyyy-MM-dd_HH-mm"
$zipName = "BUD_office_backup_$date.zip"
$dest = Join-Path $root $zipName

Push-Location $root

# Збираємо тільки потрібні папки/файли (без node_modules всередині Backend/Frontend)
$tempDir = Join-Path $env:TEMP "bud_backup_$date"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Копіюємо Backend без node_modules
$backendDest = Join-Path $tempDir "Backend"
New-Item -ItemType Directory -Path $backendDest -Force | Out-Null
Get-ChildItem -Path "Backend" -Exclude "node_modules" | Copy-Item -Destination $backendDest -Recurse -Force
if (Test-Path "Backend\node_modules") {
  Write-Host "Backend: node_modules skipped"
}

# Копіюємо Frontend без node_modules
$frontendDest = Join-Path $tempDir "Frontend"
New-Item -ItemType Directory -Path $frontendDest -Force | Out-Null
Get-ChildItem -Path "Frontend" -Exclude "node_modules" | Copy-Item -Destination $frontendDest -Recurse -Force
if (Test-Path "Frontend\node_modules") {
  Write-Host "Frontend: node_modules skipped"
}

# Решта папок і файлів у корені (крім інших zip і node_modules)
Get-ChildItem -Directory | Where-Object { $_.Name -notin @("Backend","Frontend","node_modules") } | ForEach-Object {
  Copy-Item -Path $_.FullName -Destination (Join-Path $tempDir $_.Name) -Recurse -Force
}
Get-ChildItem -File | Where-Object { $_.Name -notmatch '^BUD_office_backup_.*\.zip$' } | ForEach-Object {
  Copy-Item -Path $_.FullName -Destination (Join-Path $tempDir $_.Name) -Force
}

# Архівуємо
Write-Host "Creating archive..."
Compress-Archive -Path (Join-Path $tempDir "*") -DestinationPath $dest -Force

# Прибираємо тимчасову папку
Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue

Pop-Location
$sizeMB = [math]::Round((Get-Item $dest).Length / 1MB, 2)
Write-Host "Done: $zipName ($sizeMB MB)"
Write-Host "Path: $dest"
