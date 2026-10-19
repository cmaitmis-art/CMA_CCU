$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $rootDir) { $rootDir = Get-Location }

$frontendDir = Join-Path $rootDir "frontend"
$backendDir = Join-Path $rootDir "backend"
$stagingDir = Join-Path $rootDir "dist_cpanel"
$zipFile = Join-Path $rootDir "ccu_cpanel_deployment.zip"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Packaging CMA CCU for cPanel Deployment [ccu.cma.lk]" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Clean previous builds
Write-Host "`n1. Cleaning previous staging build and zip..." -ForegroundColor Yellow
if (Test-Path $stagingDir) { Remove-Item $stagingDir -Recurse -Force }
if (Test-Path $zipFile) { Remove-Item $zipFile -Force }
New-Item -ItemType Directory -Path $stagingDir | Out-Null

# 2. Build Frontend
Write-Host "`n2. Building React frontend with Vite..." -ForegroundColor Yellow
Push-Location $frontendDir
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed!" }
} finally {
    Pop-Location
}

# 3. Copy Backend files
Write-Host "`n3. Copying backend files to staging..." -ForegroundColor Yellow
robocopy "$backendDir" "$stagingDir" /E /XD node_modules .git /XF *.zip
if ($LASTEXITCODE -ge 8) { throw "Robocopy backend failed with code $LASTEXITCODE" }

# Ensure uploads directory structure exists
$subUploads = @("agm", "avatars", "cfiles", "complaints", "reports")
foreach ($sub in $subUploads) {
    New-Item -ItemType Directory -Force -Path (Join-Path $stagingDir "uploads\$sub") | Out-Null
}

# 4. Copy Frontend dist to public/ and root
Write-Host "`n4. Copying frontend build into staging public and root folders..." -ForegroundColor Yellow
$publicDir = Join-Path $stagingDir "public"
New-Item -ItemType Directory -Path $publicDir -Force | Out-Null
robocopy (Join-Path $frontendDir "dist") $publicDir /E
if ($LASTEXITCODE -ge 8) { throw "Robocopy frontend to public failed with code $LASTEXITCODE" }

# Also copy index.html and assets directly to root so Apache DocumentRoot gets updated
Copy-Item (Join-Path $frontendDir "dist\index.html") -Destination (Join-Path $stagingDir "index.html") -Force
$bgImg = Join-Path $frontendDir "dist\colombo-bg.jpg"
if (Test-Path $bgImg) {
    Copy-Item $bgImg -Destination (Join-Path $stagingDir "colombo-bg.jpg") -Force
}
$rootAssetsDir = Join-Path $stagingDir "assets"
New-Item -ItemType Directory -Path $rootAssetsDir -Force | Out-Null
robocopy (Join-Path $frontendDir "dist\assets") $rootAssetsDir /E
if ($LASTEXITCODE -ge 8) { throw "Robocopy frontend assets to root failed with code $LASTEXITCODE" }

# 5. Include cPanel environment file & Database SQL dump
Write-Host "`n5. Including environment and database dump..." -ForegroundColor Yellow
$envCpanel = Join-Path $frontendDir ".env.cpanel"
if (Test-Path $envCpanel) {
    Copy-Item -Path $envCpanel -Destination (Join-Path $stagingDir ".env.cpanel") -Force
    Copy-Item -Path $envCpanel -Destination (Join-Path $stagingDir ".env") -Force
}

$dbDir = Join-Path $stagingDir "db"
New-Item -ItemType Directory -Path $dbDir -Force | Out-Null
$sqlDump = Join-Path $backendDir "data\cma_backup.sql"
if (Test-Path $sqlDump) {
    Copy-Item -Path $sqlDump -Destination (Join-Path $dbDir "cma_db.sql") -Force
}

# 6. Create deployment zip
Write-Host "`n6. Compressing into deployment package: $zipFile..." -ForegroundColor Yellow
Compress-Archive -Path "$stagingDir\*" -DestinationPath $zipFile -CompressionLevel Optimal

$zipInfo = Get-Item $zipFile
$sizeMB = [math]::Round($zipInfo.Length / 1MB, 2)

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "Deployment package successfully created!" -ForegroundColor Green
Write-Host "File: $zipFile ($sizeMB MB)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

