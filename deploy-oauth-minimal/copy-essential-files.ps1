# PowerShell script to copy essential files from the vendor directory to the deployment package
# This script assumes that the vendor directory is at C:\Contet Production\Web Design\DK_Dental\Lib\vendor

# Define source and destination directories
$sourceVendor = "C:\Contet Production\Web Design\DK_Dental\Lib\vendor"
$destVendor = ".\vendor"

# Create essential directories if they don't exist
$directories = @(
    ".\vendor\google\apiclient\src",
    ".\vendor\google\apiclient\src\Http",
    ".\vendor\google\apiclient\src\Service",
    ".\vendor\google\apiclient\src\AccessToken",
    ".\vendor\google\apiclient\src\AuthHandler",
    ".\vendor\google\apiclient-services\src\MyBusinessAccountManagement",
    ".\vendor\guzzlehttp\guzzle\src",
    ".\vendor\guzzlehttp\guzzle\src\Handler",
    ".\vendor\guzzlehttp\guzzle\src\Cookie",
    ".\vendor\guzzlehttp\guzzle\src\Exception",
    ".\vendor\guzzlehttp\promises\src",
    ".\vendor\guzzlehttp\psr7\src",
    ".\vendor\psr\http-message\src",
    ".\vendor\psr\http-client\src",
    ".\vendor\psr\cache\src",
    ".\vendor\psr\log\src"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -Path $dir -ItemType Directory -Force | Out-Null
        Write-Host "Created directory: $dir"
    }
}

# Copy essential Google API Client files
$googleApiClientFiles = @(
    "Client.php",
    "Service.php",
    "Http\REST.php",
    "Http\Batch.php",
    "AccessToken\Revoke.php",
    "AccessToken\Verify.php",
    "AuthHandler\AuthHandlerFactory.php"
)

foreach ($file in $googleApiClientFiles) {
    $sourcePath = Join-Path -Path $sourceVendor -ChildPath "google\apiclient\src\$file"
    $destPath = Join-Path -Path $destVendor -ChildPath "google\apiclient\src\$file"

    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $destPath -Force
        Write-Host "Copied: $file"
    } else {
        Write-Host "Warning: Source file not found: $sourcePath"
    }
}

# Copy essential Google API Services files
$googleApiServicesFiles = @(
    "MyBusinessAccountManagement.php"
)

foreach ($file in $googleApiServicesFiles) {
    $sourcePath = Join-Path -Path $sourceVendor -ChildPath "google\apiclient-services\src\$file"
    $destPath = Join-Path -Path $destVendor -ChildPath "google\apiclient-services\src\$file"

    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $destPath -Force
        Write-Host "Copied: $file"
    } else {
        Write-Host "Warning: Source file not found: $sourcePath"
    }
}

# Copy MyBusinessAccountManagement directory
$myBusinessDir = Join-Path -Path $sourceVendor -ChildPath "google\apiclient-services\src\MyBusinessAccountManagement"
$myBusinessDestDir = Join-Path -Path $destVendor -ChildPath "google\apiclient-services\src\MyBusinessAccountManagement"

if (!(Test-Path $myBusinessDestDir)) {
    New-Item -Path $myBusinessDestDir -ItemType Directory -Force | Out-Null
}

# Copy Resource directory
$resourceDir = Join-Path -Path $myBusinessDir -ChildPath "Resource"
$resourceDestDir = Join-Path -Path $myBusinessDestDir -ChildPath "Resource"

if (!(Test-Path $resourceDestDir)) {
    New-Item -Path $resourceDestDir -ItemType Directory -Force | Out-Null
}

# Copy all files in Resource directory
Copy-Item -Path "$resourceDir\*.php" -Destination $resourceDestDir -Force
Write-Host "Copied: MyBusinessAccountManagement\Resource\*.php"

# Copy all files in MyBusinessAccountManagement directory
Copy-Item -Path "$myBusinessDir\*.php" -Destination $myBusinessDestDir -Force
Write-Host "Copied: MyBusinessAccountManagement\*.php"

# Copy essential GuzzleHttp files
$guzzleFiles = @(
    "Client.php",
    "ClientInterface.php",
    "Handler\CurlHandler.php",
    "Handler\CurlFactory.php",
    "Handler\CurlFactoryInterface.php",
    "Handler\EasyHandle.php",
    "Handler\Proxy.php",
    "Handler\StreamHandler.php"
)

foreach ($file in $guzzleFiles) {
    $sourcePath = Join-Path -Path $sourceVendor -ChildPath "guzzlehttp\guzzle\src\$file"
    $destPath = Join-Path -Path $destVendor -ChildPath "guzzlehttp\guzzle\src\$file"

    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $destPath -Force
        Write-Host "Copied: $file"
    } else {
        Write-Host "Warning: Source file not found: $sourcePath"
    }
}

# Copy essential PSR HTTP Message files
$psrHttpMessageFiles = @(
    "MessageInterface.php",
    "RequestInterface.php",
    "ResponseInterface.php",
    "StreamInterface.php",
    "UriInterface.php"
)

foreach ($file in $psrHttpMessageFiles) {
    $sourcePath = Join-Path -Path $sourceVendor -ChildPath "psr\http-message\src\$file"
    $destPath = Join-Path -Path $destVendor -ChildPath "psr\http-message\src\$file"

    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $destPath -Force
        Write-Host "Copied: $file"
    } else {
        Write-Host "Warning: Source file not found: $sourcePath"
    }
}

Write-Host "Essential files copied successfully!"
Write-Host "The minimal OAuth package is now ready for deployment."
