<?php
/**
 * Token Debug Script
 * 
 * This script helps diagnose token access issues on the server
 * For security, this should be removed after debugging
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set content type to plain text for better readability
header('Content-Type: text/plain');

echo "=== TOKEN DEBUG SCRIPT ===\n\n";

// Define the token file path
$tokenFile = '/var/www/DK_Dental_Studio/vendor/google/oauth/secure/google_refresh_token.json';

echo "Token file path: $tokenFile\n";

// Check if the file exists
if (file_exists($tokenFile)) {
    echo "✓ Token file exists\n";
    
    // Check file permissions
    $perms = fileperms($tokenFile);
    $permsOctal = substr(sprintf('%o', $perms), -4);
    echo "File permissions: $permsOctal\n";
    
    // Check owner and group
    $owner = fileowner($tokenFile);
    $group = filegroup($tokenFile);
    echo "File owner ID: $owner\n";
    echo "File group ID: $group\n";
    
    // Check if the file is readable by the current process
    if (is_readable($tokenFile)) {
        echo "✓ Token file is readable by PHP\n";
        
        // Try to read the file
        try {
            $tokenData = json_decode(file_get_contents($tokenFile), true);
            if ($tokenData !== null) {
                echo "✓ Token file contains valid JSON\n";
                
                // Check token contents
                echo "\nToken contents summary:\n";
                foreach (array_keys($tokenData) as $key) {
                    echo "- $key: " . (is_string($tokenData[$key]) ? 
                        substr($tokenData[$key], 0, 10) . "..." : 
                        gettype($tokenData[$key])) . "\n";
                }
                
                // Check if token is expired
                if (isset($tokenData['expires_at'])) {
                    $expiresAt = $tokenData['expires_at'];
                    $now = time();
                    echo "\nToken expires at: " . date('Y-m-d H:i:s', $expiresAt) . "\n";
                    echo "Current time: " . date('Y-m-d H:i:s', $now) . "\n";
                    echo "Token " . ($expiresAt > $now ? "is valid" : "has expired") . "\n";
                }
            } else {
                echo "✗ Token file does not contain valid JSON\n";
                echo "Raw file contents (first 100 chars):\n";
                echo substr(file_get_contents($tokenFile), 0, 100) . "...\n";
            }
        } catch (Exception $e) {
            echo "✗ Error reading token file: " . $e->getMessage() . "\n";
        }
    } else {
        echo "✗ Token file is not readable by PHP\n";
    }
} else {
    echo "✗ Token file does not exist\n";
    
    // Check if the directory exists
    $tokenDir = dirname($tokenFile);
    if (file_exists($tokenDir)) {
        echo "✓ Parent directory exists: $tokenDir\n";
        
        // Check directory permissions
        $dirPerms = fileperms($tokenDir);
        $dirPermsOctal = substr(sprintf('%o', $dirPerms), -4);
        echo "Directory permissions: $dirPermsOctal\n";
        
        // Check if the directory is readable
        if (is_readable($tokenDir)) {
            echo "✓ Directory is readable\n";
            
            // List files in the directory
            echo "\nFiles in directory:\n";
            $files = scandir($tokenDir);
            foreach ($files as $file) {
                if ($file != "." && $file != "..") {
                    $filePath = "$tokenDir/$file";
                    $filePerms = substr(sprintf('%o', fileperms($filePath)), -4);
                    echo "- $file ($filePerms)\n";
                }
            }
        } else {
            echo "✗ Directory is not readable\n";
        }
    } else {
        echo "✗ Parent directory does not exist\n";
    }
}

// Check PHP process information
echo "\n=== PHP PROCESS INFO ===\n";
echo "PHP version: " . phpversion() . "\n";
echo "Current user: " . get_current_user() . "\n";
echo "Process ID: " . getmypid() . "\n";
echo "Document root: " . $_SERVER['DOCUMENT_ROOT'] . "\n";
echo "Script path: " . __FILE__ . "\n";
echo "Current directory: " . getcwd() . "\n";

// Check environment variables
echo "\n=== ENVIRONMENT VARIABLES ===\n";
$relevantVars = ['PATH', 'HOME', 'USER', 'DOCUMENT_ROOT', 'SCRIPT_FILENAME'];
foreach ($relevantVars as $var) {
    echo "$var: " . (getenv($var) ?: 'not set') . "\n";
}

// Check server configuration
echo "\n=== SERVER CONFIGURATION ===\n";
echo "Server software: " . $_SERVER['SERVER_SOFTWARE'] . "\n";
echo "Server name: " . $_SERVER['SERVER_NAME'] . "\n";
echo "Server protocol: " . $_SERVER['SERVER_PROTOCOL'] . "\n";
echo "Request time: " . date('Y-m-d H:i:s', $_SERVER['REQUEST_TIME']) . "\n";

echo "\n=== END OF DEBUG OUTPUT ===\n";
?> 