<?php
/**
 * Token Test Script
 * 
 * This script checks if the OAuth token file exists and is accessible
 */

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Define possible token file locations
$locations = [
    __DIR__ . '/vendor/google/oauth/secure/google_refresh_token.json',
    dirname(__FILE__) . '/vendor/google/oauth/secure/google_refresh_token.json',
    $_SERVER['DOCUMENT_ROOT'] . '/vendor/google/oauth/secure/google_refresh_token.json',
    dirname(dirname(__FILE__)) . '/vendor/google/oauth/secure/google_refresh_token.json'
];

echo "<h1>Token File Test</h1>";
echo "<p>Testing various possible token file locations:</p>";
echo "<ul>";

foreach ($locations as $location) {
    echo "<li>Path: " . htmlspecialchars($location);
    
    if (file_exists($location)) {
        echo " - <span style='color:green'>EXISTS</span>";
        
        // Check if readable
        if (is_readable($location)) {
            echo " - <span style='color:green'>READABLE</span>";
            
            // Try to read contents
            try {
                $contents = file_get_contents($location);
                $data = json_decode($contents, true);
                
                if (is_array($data)) {
                    echo " - <span style='color:green'>VALID JSON</span>";
                    echo "<br>Keys: " . implode(", ", array_keys($data));
                    
                    // Check for required keys
                    $requiredKeys = ['refresh_token', 'access_token', 'expires_in', 'created'];
                    $missingKeys = [];
                    
                    foreach ($requiredKeys as $key) {
                        if (!isset($data[$key])) {
                            $missingKeys[] = $key;
                        }
                    }
                    
                    if (empty($missingKeys)) {
                        echo "<br><span style='color:green'>All required keys present</span>";
                        
                        // Check if token is expired
                        if (isset($data['created']) && isset($data['expires_in'])) {
                            $expiresAt = $data['created'] + $data['expires_in'];
                            $now = time();
                            
                            if ($expiresAt > $now) {
                                $minutesLeft = round(($expiresAt - $now) / 60);
                                echo "<br><span style='color:green'>Token valid for $minutesLeft more minutes</span>";
                            } else {
                                echo "<br><span style='color:red'>Token EXPIRED</span>";
                            }
                        }
                    } else {
                        echo "<br><span style='color:red'>Missing keys: " . implode(", ", $missingKeys) . "</span>";
                    }
                } else {
                    echo " - <span style='color:red'>INVALID JSON</span>";
                }
            } catch (Exception $e) {
                echo " - <span style='color:red'>ERROR READING: " . htmlspecialchars($e->getMessage()) . "</span>";
            }
        } else {
            echo " - <span style='color:red'>NOT READABLE</span>";
        }
    } else {
        echo " - <span style='color:red'>NOT FOUND</span>";
    }
    
    echo "</li>";
}

echo "</ul>";

// Try to include the token helper
echo "<h2>Testing token helper</h2>";

try {
    if (file_exists(__DIR__ . '/vendor/google/oauth/token.php')) {
        require_once __DIR__ . '/vendor/google/oauth/token.php';
        echo "<p style='color:green'>Token helper file found and included</p>";
        
        // Try to get a token
        $token = getGoogleAccessToken();
        
        if ($token) {
            echo "<p style='color:green'>Successfully retrieved access token!</p>";
            echo "<p>Token starts with: " . substr($token, 0, 10) . "...</p>";
        } else {
            echo "<p style='color:red'>Failed to retrieve access token</p>";
        }
    } else {
        echo "<p style='color:red'>Token helper file not found</p>";
    }
} catch (Exception $e) {
    echo "<p style='color:red'>Error: " . htmlspecialchars($e->getMessage()) . "</p>";
}

// Server environment info
echo "<h2>Server Environment</h2>";
echo "<p>Document Root: " . htmlspecialchars($_SERVER['DOCUMENT_ROOT']) . "</p>";
echo "<p>Current Script: " . htmlspecialchars($_SERVER['SCRIPT_FILENAME']) . "</p>";
echo "<p>Current Directory: " . htmlspecialchars(getcwd()) . "</p>";
echo "<p>PHP Version: " . phpversion() . "</p>";
?> 