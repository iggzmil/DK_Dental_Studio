<?php
/**
 * DK Dental OAuth Fix Script
 * 
 * This script helps diagnose and fix common issues with the OAuth implementation
 */

// Show all errors for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>DK Dental OAuth Diagnostic Tool</h1>";

// Function to display styled status message
function showStatus($test, $result, $details = '') {
    $color = $result ? 'green' : 'red';
    $status = $result ? 'PASSED' : 'FAILED';
    echo "<div style='margin-bottom: 10px;'>";
    echo "<strong>$test:</strong> <span style='color:$color'>$status</span>";
    if ($details) {
        echo "<br><span style='font-size: 0.9em; margin-left: 20px;'>$details</span>";
    }
    echo "</div>";
    return $result;
}

// Check for cURL installation
$curlInstalled = function_exists('curl_init');
showStatus('cURL Extension', $curlInstalled, 
    $curlInstalled 
        ? 'cURL is properly installed.' 
        : 'cURL is not installed or not enabled in PHP.'
);

// Check for allow_url_fopen (fallback for cURL)
$allowUrlFopen = ini_get('allow_url_fopen');
showStatus('allow_url_fopen', $allowUrlFopen, 
    $allowUrlFopen 
        ? 'File operations with URLs are enabled (fallback for cURL).' 
        : 'File operations with URLs are disabled. This is needed as a fallback if cURL is unavailable.'
);

// Check secure directory
$secureDirPath = __DIR__ . '/vendor/google/oauth/secure';
$secureDirExists = file_exists($secureDirPath);
$secureDirWritable = $secureDirExists && is_writable($secureDirPath);

showStatus('Secure Directory Exists', $secureDirExists, 
    $secureDirExists 
        ? "Directory exists at: $secureDirPath" 
        : "Directory does not exist at: $secureDirPath"
);

if ($secureDirExists) {
    showStatus('Secure Directory Writable', $secureDirWritable, 
        $secureDirWritable 
            ? "Directory is writable" 
            : "Directory exists but is not writable. Web server needs write permission."
    );
}

// Try to fix the issues if they exist
echo "<h2>Attempting to fix issues:</h2>";

// 1. Try to create secure directory if it doesn't exist
if (!$secureDirExists) {
    echo "<p>Attempting to create secure directory...</p>";
    
    try {
        if (@mkdir($secureDirPath, 0777, true)) {
            echo "<p style='color:green'>Successfully created directory!</p>";
            // Try to set more restrictive permissions
            @chmod($secureDirPath, 0755);
        } else {
            echo "<p style='color:red'>Failed to create directory. You may need to do this manually via FTP or SSH.</p>";
            echo "<p>Run these commands on your server:</p>";
            echo "<pre>mkdir -p $secureDirPath\nchmod 777 $secureDirPath</pre>";
        }
    } catch (Exception $e) {
        echo "<p style='color:red'>Error creating directory: " . $e->getMessage() . "</p>";
    }
}

// 2. Try to fix directory permissions if it's not writable
else if (!$secureDirWritable) {
    echo "<p>Attempting to make the secure directory writable...</p>";
    
    if (@chmod($secureDirPath, 0777)) {
        echo "<p style='color:green'>Successfully updated directory permissions!</p>";
    } else {
        echo "<p style='color:red'>Failed to update permissions. You need to do this manually:</p>";
        echo "<pre>chmod 777 $secureDirPath</pre>";
    }
}

// 3. If cURL is not available, provide code patches
if (!$curlInstalled) {
    echo "<h2>cURL Extension Missing</h2>";
    echo "<p>The cURL extension is required for the OAuth implementation. You have two options:</p>";
    
    echo "<h3>Option 1: Install cURL extension (Recommended)</h3>";
    echo "<p>Ask your hosting provider to enable the PHP cURL extension, or if you have server access:</p>";
    echo "<pre>sudo apt-get install php-curl\nsudo service apache2 restart</pre>";
    
    echo "<h3>Option 2: Update code to use file_get_contents as fallback</h3>";
    echo "<p>Edit the following files:</p>";
    
    // Generate code patches
    echo "<h4>1. Update vendor/google/oauth/callback.php</h4>";
    echo "<p>Find this code block (around line 56):</p>";
    echo "<pre style='background:#f8f8f8;padding:10px;border:1px solid #ddd;'>";
    echo htmlspecialchars('// Initialize cURL session
$ch = curl_init($tokenUrl);

// Set cURL options
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [\'Content-Type: application/x-www-form-urlencoded\']);

// Execute cURL request
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);

// Close cURL session
curl_close($ch);');
    echo "</pre>";
    
    echo "<p>Replace it with this code:</p>";
    echo "<pre style='background:#f8f8f8;padding:10px;border:1px solid #ddd;'>";
    echo htmlspecialchars('$response = null;
$httpCode = 0;
$curlError = \'\';

// Try cURL first if available
if (function_exists(\'curl_init\')) {
    // Initialize cURL session
    $ch = curl_init($tokenUrl);
    
    // Set cURL options
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [\'Content-Type: application/x-www-form-urlencoded\']);
    
    // Execute cURL request
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    
    // Close cURL session
    curl_close($ch);
} 
// Fall back to file_get_contents with stream context
else {
    error_log(\'cURL not available, using file_get_contents instead\');
    $options = [
        \'http\' => [
            \'header\'  => "Content-type: application/x-www-form-urlencoded\\r\\n",
            \'method\'  => \'POST\',
            \'content\' => http_build_query($postData)
        ]
    ];
    
    $context = stream_context_create($options);
    try {
        $response = file_get_contents($tokenUrl, false, $context);
        if ($response !== false) {
            $httpCode = 200;
        } else {
            $httpCode = 400;
            error_log(\'file_get_contents request failed\');
        }
    } catch (Exception $e) {
        error_log(\'Error in file_get_contents request: \' . $e->getMessage());
        $httpCode = 500;
    }
}');
    echo "</pre>";
    
    echo "<h4>2. Update vendor/google/oauth/token.php</h4>";
    echo "<p>Apply the same pattern in the refreshAccessToken() function.</p>";
    
    // Generate a download link for the fixed files
    echo "<h3>Fix Files Automatically</h3>";
    
    echo "<p>You can also download the fixed files here and upload them via FTP:</p>";
    echo "<ul>";
    echo "<li><a href='/fix-oauth-callback.php'>Download fixed callback.php</a></li>";
    echo "<li><a href='/fix-oauth-token.php'>Download fixed token.php</a></li>";
    echo "</ul>";
}

// Create the fixed callback.php file
if (!$curlInstalled) {
    $fixedCallbackContent = '<?php
/**
 * OAuth Callback Handler for DK Dental Studio
 * 
 * This page handles the OAuth callback from Google and stores the refresh token
 * This version uses a simplified approach without the API Client library
 */

// Start session for authentication
session_start();

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set(\'display_errors\', 1);

// Ensure only authenticated users can access this page
if (!isset($_SESSION[\'authenticated\'])) {
    header(\'Location: auth.php\');
    exit;
}

// Define client credentials
$clientId = \'593699947617-hulnksmaqujj6o0j1sob13klorehtspt.apps.googleusercontent.com\';
$clientSecret = \'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\';
$redirectUri = \'https://\' . $_SERVER[\'HTTP_HOST\'] . \'/vendor/google/oauth/callback.php\';

// Define token storage location
$secureDir = dirname(__FILE__) . \'/secure\';
if (!file_exists($secureDir)) {
    try {
        mkdir($secureDir, 0777, true); // Use 0777 permissions temporarily
        // After creating, try to set more restrictive permissions
        @chmod($secureDir, 0700);
    } catch (Exception $e) {
        error_log(\'Error creating secure directory: \' . $e->getMessage());
        // Use an alternative location if possible
        $secureDir = sys_get_temp_dir() . \'/dk_dental_oauth\';
        if (!file_exists($secureDir)) {
            @mkdir($secureDir, 0777, true);
        }
    }
}
$tokenFile = $secureDir . \'/google_refresh_token.json\';

$success = false;
$message = "";

// Process the authorization code
if (isset($_GET[\'code\'])) {
    $code = $_GET[\'code\'];
    
    // Log the received code (partial for security)
    $codeLength = strlen($code);
    error_log(\'Received authorization code: \' . substr($code, 0, 5) . \'...\' . substr($code, -5) . " (Length: $codeLength)");
    
    // Exchange authorization code for access token using cURL or file_get_contents
    $tokenUrl = \'https://oauth2.googleapis.com/token\';
    $postData = [
        \'code\' => $code,
        \'client_id\' => $clientId,
        \'client_secret\' => $clientSecret,
        \'redirect_uri\' => $redirectUri,
        \'grant_type\' => \'authorization_code\'
    ];
    
    $response = null;
    $httpCode = 0;
    $curlError = \'\';
    
    // Try cURL first if available
    if (function_exists(\'curl_init\')) {
        // Initialize cURL session
        $ch = curl_init($tokenUrl);
        
        // Set cURL options
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [\'Content-Type: application/x-www-form-urlencoded\']);
        
        // Execute cURL request
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        
        // Close cURL session
        curl_close($ch);
    } 
    // Fall back to file_get_contents with stream context
    else {
        error_log(\'cURL not available, using file_get_contents instead\');
        $options = [
            \'http\' => [
                \'header\'  => "Content-type: application/x-www-form-urlencoded\\r\\n",
                \'method\'  => \'POST\',
                \'content\' => http_build_query($postData)
            ]
        ];
        
        $context = stream_context_create($options);
        try {
            $response = file_get_contents($tokenUrl, false, $context);
            if ($response !== false) {
                $httpCode = 200;
            } else {
                $httpCode = 400;
                error_log(\'file_get_contents request failed\');
            }
        } catch (Exception $e) {
            error_log(\'Error in file_get_contents request: \' . $e->getMessage());
            $httpCode = 500;
        }
    }
    
    // Log raw response for debugging
    error_log("Token exchange HTTP code: $httpCode");
    if ($curlError) {
        error_log("cURL error: $curlError");
    }
    
    // Process the response
    if ($httpCode == 200) {
        $token = json_decode($response, true);
        
        // Debug token response
        error_log(\'Token response keys: \' . implode(\', \', array_keys($token)));
        
        if (isset($token[\'refresh_token\'])) {
            // Store the refresh token
            file_put_contents($tokenFile, $response);
            
            $success = true;
            $message = "Authorization successful! Your website can now display your Google reviews.";
            
            // Log success
            error_log(\'OAuth flow completed successfully. Refresh token obtained.\');
        } else {
            $success = false;
            $message = "No refresh token was received. Please try again.";
            
            // Log error
            error_log(\'OAuth token response did not contain refresh_token: \' . $response);
        }
    } else {
        $success = false;
        $message = "Error during token exchange (HTTP $httpCode). Please try again.";
        
        // Log error
        error_log(\'Token exchange error: \' . $response);
    }
} else if (isset($_GET[\'error\'])) {
    $success = false;
    $message = "Authorization error: " . htmlspecialchars($_GET[\'error\']);
    if (isset($_GET[\'error_description\'])) {
        $message .= " - " . htmlspecialchars($_GET[\'error_description\']);
    }
    
    // Log error
    error_log(\'OAuth error: \' . $_GET[\'error\'] . (isset($_GET[\'error_description\']) ? " - " . $_GET[\'error_description\'] : ""));
} else {
    $success = false;
    $message = "No authorization code received.";
    
    // Log error
    error_log(\'No authorization code received in callback. Query string: \' . $_SERVER[\'QUERY_STRING\']);
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>DK Dental Studio - Authorization Result</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        .container { border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
        .success { color: green; }
        .error { color: red; }
        .debug { background: #f8f9fa; border: 1px solid #ddd; padding: 10px; margin-top: 20px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Google Reviews Authorization Result</h1>
        <div class="<?php echo $success ? \'success\' : \'error\'; ?>">
            <h2><?php echo $success ? \'Success!\' : \'Error\'; ?></h2>
            <p><?php echo $message; ?></p>
        </div>
        <?php if ($success): ?>
            <div>
                <h3>What happens now?</h3>
                <p>Your website is now connected to your Google Business Profile. You don\'t need to do anything else.</p>
                <p>Google reviews will automatically appear on your website\'s testimonial section.</p>
                <p>You can safely close this window and return to your website.</p>
            </div>
        <?php else: ?>
            <p><a href="auth.php">Try again</a></p>
            <div class="debug">
                <p><strong>Debug Information:</strong></p>
                <p>Query String: <?php echo htmlspecialchars($_SERVER[\'QUERY_STRING\']); ?></p>
                <?php if (isset($_GET[\'error\'])): ?>
                    <p>Error: <?php echo htmlspecialchars($_GET[\'error\']); ?></p>
                <?php endif; ?>
                <?php if (isset($_GET[\'error_description\'])): ?>
                    <p>Error Description: <?php echo htmlspecialchars($_GET[\'error_description\']); ?></p>
                <?php endif; ?>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>';

    file_put_contents(__DIR__ . '/fix-oauth-callback.php', $fixedCallbackContent);

    // Create the fixed token.php file
    $fixedTokenContent = '<?php
/**
 * OAuth Token Helper for DK Dental Studio
 * 
 * This file provides functions to get and refresh tokens for Google API usage
 */

/**
 * Get a valid access token for Google API calls
 * 
 * @return string|null Access token or null if unable to get one
 */
function getGoogleAccessToken() {
    // Define token file location
    $secureDir = dirname(__FILE__) . \'/secure\';
    $tokenFile = $secureDir . \'/google_refresh_token.json\';
    
    // Check if token file exists
    if (!file_exists($tokenFile)) {
        error_log(\'Token file not found. OAuth authorization may be needed.\');
        return null;
    }
    
    // Load token data
    $tokenData = json_decode(file_get_contents($tokenFile), true);
    
    // Check if we need to refresh the token
    if (!isset($tokenData[\'access_token\']) || 
        !isset($tokenData[\'expires_in\']) || 
        !isset($tokenData[\'created\']) || 
        (isset($tokenData[\'created\']) && $tokenData[\'created\'] + $tokenData[\'expires_in\'] - 300 < time())) {
        
        // Token doesn\'t exist or is about to expire, refresh it
        if (isset($tokenData[\'refresh_token\'])) {
            $newToken = refreshAccessToken($tokenData[\'refresh_token\']);
            if ($newToken) {
                // Preserve the refresh token as it might not be included in response
                if (!isset($newToken[\'refresh_token\']) && isset($tokenData[\'refresh_token\'])) {
                    $newToken[\'refresh_token\'] = $tokenData[\'refresh_token\'];
                }
                
                // Add creation timestamp
                $newToken[\'created\'] = time();
                
                // Save updated token
                file_put_contents($tokenFile, json_encode($newToken));
                
                return $newToken[\'access_token\'];
            }
        }
        
        error_log(\'Failed to refresh access token\');
        return null;
    }
    
    // Return existing valid access token
    return $tokenData[\'access_token\'];
}

/**
 * Refresh an access token using the refresh token
 * 
 * @param string $refreshToken The refresh token
 * @return array|null New token data or null if refresh failed
 */
function refreshAccessToken($refreshToken) {
    // Define client credentials - use exact same values as auth.php and callback.php
    $clientId = \'593699947617-hulnksmaqujj6o0j1sob13klorehtspt.apps.googleusercontent.com\';
    $clientSecret = \'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\';
    
    // Set up token refresh request
    $tokenUrl = \'https://oauth2.googleapis.com/token\';
    $postData = [
        \'client_id\' => $clientId,
        \'client_secret\' => $clientSecret,
        \'refresh_token\' => $refreshToken,
        \'grant_type\' => \'refresh_token\'
    ];
    
    $response = null;
    $httpCode = 0;
    $curlError = \'\';
    
    // Try using cURL if available
    if (function_exists(\'curl_init\')) {
        // Initialize cURL session
        $ch = curl_init($tokenUrl);
        
        // Set cURL options
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [\'Content-Type: application/x-www-form-urlencoded\']);
        
        // Execute cURL request
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        
        // Close cURL session
        curl_close($ch);
    } 
    // Fall back to file_get_contents if cURL is not available
    else {
        error_log(\'cURL not available for token refresh, using file_get_contents instead\');
        $options = [
            \'http\' => [
                \'header\'  => "Content-type: application/x-www-form-urlencoded\\r\\n",
                \'method\'  => \'POST\',
                \'content\' => http_build_query($postData)
            ]
        ];
        
        $context = stream_context_create($options);
        try {
            $response = file_get_contents($tokenUrl, false, $context);
            if ($response !== false) {
                $httpCode = 200;
            } else {
                error_log(\'file_get_contents request failed for token refresh\');
                $httpCode = 400;
            }
        } catch (Exception $e) {
            error_log(\'Error in file_get_contents request: \' . $e->getMessage());
            $httpCode = 500;
        }
    }
    
    // Process the response
    if ($httpCode == 200) {
        return json_decode($response, true);
    } else {
        error_log("Token refresh error (HTTP $httpCode): $response");
        if ($curlError) {
            error_log("cURL error: $curlError");
        }
        return null;
    }
}
?>';

    file_put_contents(__DIR__ . '/fix-oauth-token.php', $fixedTokenContent);
}

echo "<h2>Next Steps</h2>";
if (!$curlInstalled) {
    echo "<p>1. <strong>Server fix (recommended):</strong> Ask your hosting provider to install the PHP cURL extension.</p>";
    echo "<p>2. <strong>Code fix (alternative):</strong> Download and use the fixed files that include fallback code for servers without cURL.</p>";
} 
if (!$secureDirExists || !$secureDirWritable) {
    echo "<p>Make sure the secure directory is created and has proper permissions. You can do this via FTP or ask your hosting provider.</p>";
}

echo "<p>After making these changes, try the OAuth process again by visiting: <a href='/google-auth.php'>/google-auth.php</a></p>"; 