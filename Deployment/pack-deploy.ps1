# BUD Office — запакувати deploy-package в zip для завантаження на сервер
$dest = "F:\BUD_office\Deployment\bud-office-deploy.zip"
$src = "F:\BUD_office\Deployment\deploy-package"

if (Test-Path $dest) { Remove-Item $dest -Force }
Compress-Archive -Path "$src\*" -DestinationPath $dest
Write-Host "Створено: $dest"
Write-Host "Завантаж на сервер, розпакуй, запусти: chmod +x deploy.sh && sudo ./deploy.sh"
