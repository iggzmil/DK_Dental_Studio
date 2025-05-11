<?php
/**
 * Token Verification Script
 * 
 * This script checks if the token file exists and can be read
 * It should only be accessible to administrators
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Define the absolute path to the token file
$tokenFile = '/var/www/DK_Dental_Studio/vendor/google/oauth/secure/google_refresh_token.json';

echo "<h1>Token File Verification</h1>";

// Check if the file exists
if (file_exists($tokenFile)) {
    echo "<p style='color:green;'>✓ Token file exists at: " . htmlspecialchars($tokenFile) . "</p>";
    
    // Check if the file is readable
    if (is_readable($tokenFile)) {
        echo "<p style='color:green;'>✓ Token file is readable</p>";
        
        // Try to read the file
        try {
            $tokenData = json_decode(file_get_contents($tokenFile), true);
            if (is_array($tokenData)) {
                echo "<p style='color:green;'>✓ Token file contains valid JSON data</p>";
                
                // Check if the token contains required fields
                if (isset($tokenData['access_token'])) {
                    echo "<p style='color:green;'>✓ Access token found in file</p>";
                    echo "<p>Access token starts with: " . substr($tokenData['access_token'], 0, 10) . "...</p>";
                } else {
                    echo "<p style='color:red;'>✗ No access token found in file</p>";
                }
                
                if (isset($tokenData['refresh_token'])) {
                    echo "<p style='color:green;'>✓ Refresh token found in file</p>";
                } else {
                    echo "<p style='color:red;'>✗ No refresh token found in file</p>";
                }
                
                if (isset($tokenData['expires_in'])) {
                    echo "<p style='color:green;'>✓ Token expiration information found</p>";
                } else {
                    echo "<p style='color:red;'>✗ No token expiration information found</p>";
                }
            } else {
                echo "<p style='color:red;'>✗ Token file does not contain valid JSON data</p>";
            }
        } catch (Exception $e) {
            echo "<p style='color:red;'>✗ Error reading token file: " . htmlspecialchars($e->getMessage()) . "</p>";
        }
    } else {
        echo "<p style='color:red;'>✗ Token file is not readable</p>";
        echo "<p>File permissions: " . substr(sprintf('%o', fileperms($tokenFile)), -4) . "</p>";
    }
} else {
    echo "<p style='color:red;'>✗ Token file does not exist at: " . htmlspecialchars($tokenFile) . "</p>";
    
    // Check if the directory exists
    $tokenDir = dirname($tokenFile);
    if (file_exists($tokenDir)) {
        echo "<p style='color:green;'>✓ Directory exists: " . htmlspecialchars($tokenDir) . "</p>";
        
        // Check if the directory is readable
        if (is_readable($tokenDir)) {
            echo "<p style='color:green;'>✓ Directory is readable</p>";
            
            // List files in the directory
            echo "<p>Files in directory:</p>";
            echo "<ul>";
            $files = scandir($tokenDir);
            foreach ($files as $file) {
                if ($file != "." && $file != "..") {
                    echo "<li>" . htmlspecialchars($file) . "</li>";
                }
            }
            echo "</ul>";
        } else {
            echo "<p style='color:red;'>✗ Directory is not readable</p>";
        }
    } else {
        echo "<p style='color:red;'>✗ Directory does not exist: " . htmlspecialchars($tokenDir) . "</p>";
    }
}

// Show server information
echo "<h2>Server Information</h2>";
echo "<p>PHP Version: " . phpversion() . "</p>";
echo "<p>Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "</p>";
echo "<p>Script Path: " . __FILE__ . "</p>";
echo "<p>Current Directory: " . getcwd() . "</p>";
?> 