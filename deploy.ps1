# DeepBreath 部署脚本
# 用法: 在 PowerShell 中运行此脚本
Set-Location $PSScriptRoot
Write-Host "Building..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Build failed!" -ForegroundColor Red; exit 1 }

Write-Host "Deploying..." -ForegroundColor Cyan
scp -i "$env:USERPROFILE\.ssh\id_ed25519" -r dist\* root@100.119.151.62:/var/www/deepbreath/app/
if ($LASTEXITCODE -eq 0) { Write-Host "Deployed successfully!" -ForegroundColor Green }
else { Write-Host "Deploy failed!" -ForegroundColor Red }
