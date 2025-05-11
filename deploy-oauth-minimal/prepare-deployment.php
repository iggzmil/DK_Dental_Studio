<?php
/**
 * Deployment preparation script
 * 
 * This script prepares a deployment package with all necessary files
 * while excluding sensitive data and temporary files
 */

// Configuration
$sourcePath = __DIR__;
$packageName = 'dk-dental-google-reviews';
$version = date('Ymd');
$outputPath = __DIR__ . "/{$packageName}-{$version}.zip";

// Files and directories to include
$includes = [
    'api',
    'vendor/google/oauth/auth.php',
    'vendor/google/oauth/callback.php',
    'vendor/google/oauth/token.php',
    'vendor/google/oauth/example.php',
    'vendor/google/oauth/index.php',
    'vendor/google/oauth/README.md',
    'vendor/google/oauth/.gitignore',
    'google-auth.php',
    'index.php',
    'README.md',
];

// Directories to create in the package
$directories = [
    'cache',
    'vendor/google/oauth/secure',
];

// Create ZIP archive
$zip = new ZipArchive();
if ($zip->open($outputPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
    die("Failed to create ZIP archive: $outputPath");
}

// Add files to the archive
foreach ($includes as $item) {
    $itemPath = $sourcePath . '/' . $item;
    
    if (is_dir($itemPath)) {
        // Add all files in the directory
        addDirToZip($zip, $itemPath, basename($itemPath));
    } else if (file_exists($itemPath)) {
        // Add single file
        $zip->addFile($itemPath, basename($item));
        echo "Added file: $item\n";
    } else {
        echo "Warning: File not found: $item\n";
    }
}

// Create empty directories
foreach ($directories as $dir) {
    $zip->addEmptyDir($dir);
    echo "Created directory: $dir\n";
}

// Create a note about the cache directory
$cacheReadme = "This directory is used for caching Google Reviews data to improve performance.\n";
$zip->addFromString('cache/README.txt', $cacheReadme);

// Create a note about the secure directory
$secureReadme = "This directory is used for storing OAuth tokens securely.\n";
$secureReadme .= "Ensure this directory has restricted permissions (chmod 700).\n";
$zip->addFromString('vendor/google/oauth/secure/README.txt', $secureReadme);

// Add deployment instructions
$deploymentInstructions = <<<EOT
# Deployment Instructions

1. Upload all files to your web server
2. Set proper permissions:
   - `chmod 700 vendor/google/oauth/secure`
   - `chmod 755 cache`
3. Visit `google-auth.php` in your browser
4. Log in with the admin password
5. Complete the Google authorization process
6. Test that reviews are loading by visiting your website

If you encounter issues:
- Check server logs for detailed error messages
- Ensure all paths and URLs match your server configuration
- Verify that your Google API credentials are correctly configured

For more details, see the README.md file.
EOT;

$zip->addFromString('DEPLOYMENT_INSTRUCTIONS.md', $deploymentInstructions);

// Close the archive
$zip->close();

echo "Deployment package created: $outputPath\n";

/**
 * Add a directory to the ZIP archive
 */
function addDirToZip($zip, $dir, $zipDir) {
    // Create the directory
    $zip->addEmptyDir($zipDir);
    
    // Loop through all files and subdirectories
    $files = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir),
        RecursiveIteratorIterator::LEAVES_ONLY
    );
    
    foreach ($files as $file) {
        // Skip directories (they are added automatically when adding files)
        if ($file->isDir()) {
            continue;
        }
        
        $filePath = $file->getRealPath();
        $relativePath = substr($filePath, strlen(dirname($dir)) + 1);
        
        // Skip certain files
        if (shouldExcludeFile($relativePath)) {
            continue;
        }
        
        // Add file to archive
        $zip->addFile($filePath, $relativePath);
        echo "Added file: $relativePath\n";
    }
}

/**
 * Check if a file should be excluded from the package
 */
function shouldExcludeFile($file) {
    // List of patterns to exclude
    $excludePatterns = [
        '/\.git/',
        '/\.gitignore$/',
        '/secure\/.*\.json$/',
        '/cache\/.*\.json$/',
        '/\.env$/',
        '/\.DS_Store$/',
        '/Thumbs\.db$/',
        '/.*\.log$/',
        '/.*\.zip$/',
        '/.*\.tmp$/',
        '/.*\.temp$/',
    ];
    
    // Check each pattern
    foreach ($excludePatterns as $pattern) {
        if (preg_match($pattern, $file)) {
            return true;
        }
    }
    
    return false;
}
?> 