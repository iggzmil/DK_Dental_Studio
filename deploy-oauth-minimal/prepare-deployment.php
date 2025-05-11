<?php
/**
 * Deployment Preparation Script
 * 
 * This script verifies that all necessary files are present and working,
 * then creates a deployment-ready ZIP archive.
 */

// Start with a clean output buffer
ob_start();

echo "==================================================\n";
echo "DK Dental Studio OAuth Deployment Verification\n";
echo "==================================================\n\n";

$issues = [];

// Check if our custom Auth interface exists
if (!file_exists(__DIR__ . '/vendor/google/apiclient/src/Auth/GetUniverseDomainInterface.php')) {
    $issues[] = "Missing GetUniverseDomainInterface.php file";
} else {
    echo "✓ GetUniverseDomainInterface.php found\n";
}

// Check if our custom Auth implementation exists
if (!file_exists(__DIR__ . '/vendor/google/apiclient/src/Auth/UniverseDomain.php')) {
    $issues[] = "Missing UniverseDomain.php file";
} else {
    echo "✓ UniverseDomain.php found\n";
}

// Check if basic Google Client files exist
if (!file_exists(__DIR__ . '/vendor/google/apiclient/src/Client.php')) {
    $issues[] = "Missing Google Client.php file";
} else {
    echo "✓ Google Client.php found\n";
}

// Check if main auth and callback scripts exist
if (!file_exists(__DIR__ . '/owner-auth.php')) {
    $issues[] = "Missing owner-auth.php file";
} else {
    echo "✓ owner-auth.php found\n";
}

if (!file_exists(__DIR__ . '/owner-callback.php')) {
    $issues[] = "Missing owner-callback.php file";
} else {
    echo "✓ owner-callback.php found\n";
}

// Check if autoload.php exists
if (!file_exists(__DIR__ . '/vendor/autoload.php')) {
    $issues[] = "Missing autoload.php file";
} else {
    echo "✓ autoload.php found\n";
}

// Check if secure directory is writable
$secureDir = __DIR__ . '/secure';
if (!file_exists($secureDir)) {
    mkdir($secureDir, 0700, true);
    echo "✓ Created secure directory\n";
} else {
    echo "✓ Secure directory exists\n";
}

if (!is_writable($secureDir)) {
    $issues[] = "Secure directory is not writable";
} else {
    echo "✓ Secure directory is writable\n";
}

echo "\n";

// Test loading the Google Client class
try {
    require_once __DIR__ . '/vendor/autoload.php';
    new Google\Client();
    echo "✓ Successfully loaded Google\\Client class\n";
} catch (Throwable $e) {
    $issues[] = "Error loading Google\\Client: " . $e->getMessage();
}

echo "\n";

// Show summary
if (count($issues) > 0) {
    echo "Issues found:\n";
    foreach ($issues as $issue) {
        echo "! " . $issue . "\n";
    }
    echo "\nPlease fix these issues before deploying.\n";
} else {
    echo "All checks passed! Your deployment is ready.\n";
    
    // Create a ZIP archive for deployment
    $zipFile = __DIR__ . '/dk-dental-oauth-deployment.zip';
    
    try {
        $zip = new ZipArchive();
        if ($zip->open($zipFile, ZipArchive::CREATE | ZipArchive::OVERWRITE) === TRUE) {
            echo "\nCreating deployment archive...\n";
            
            // Add all files in the directory (except the ZIP itself and any temp files)
            $files = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator(__DIR__),
                RecursiveIteratorIterator::LEAVES_ONLY
            );
            
            foreach ($files as $name => $file) {
                if (!$file->isDir()) {
                    $filePath = $file->getRealPath();
                    $relativePath = substr($filePath, strlen(__DIR__) + 1);
                    
                    // Skip the ZIP file itself and any temp files
                    if ($relativePath !== 'dk-dental-oauth-deployment.zip' && 
                        !preg_match('/^\._/', basename($relativePath)) &&
                        !preg_match('/^\.git/', $relativePath)) {
                        $zip->addFile($filePath, $relativePath);
                        echo "  Added: $relativePath\n";
                    }
                }
            }
            
            $zip->close();
            echo "\nZIP archive created successfully: dk-dental-oauth-deployment.zip\n";
            echo "Upload this file to your server and extract it into your web directory.\n";
        } else {
            echo "\nFailed to create ZIP archive.\n";
        }
    } catch (Exception $e) {
        echo "\nError creating ZIP archive: " . $e->getMessage() . "\n";
    }
}

// Output the buffer
$output = ob_get_clean();
echo $output;

// Save the output to a log file
file_put_contents(__DIR__ . '/deployment-check.log', $output);
echo "Log saved to deployment-check.log\n"; 