<?php
/**
 * OAuth Test Script
 * 
 * This script tests the OAuth implementation by checking if tokens are accessible
 * and if an API call can be made using them.
 */

// Start session for authentication
session_start();

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Simple password protection (use a more robust method in production)
if (!isset($_SESSION['authenticated'])) {
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['password'])) {
        // Verify password (use a secure method in production)
        if ($_POST['password'] === 'dk-dental-2024') { // Change this to a secure password
            $_SESSION['authenticated'] = true;
        } else {
            echo "Invalid password";
            showLoginForm();
            exit;
        }
    } else {
        showLoginForm();
        exit;
    }
}

// Include the token helper
require_once 'vendor/google/oauth/token.php';

// Get a valid access token
$accessToken = getGoogleAccessToken();

// Variables to track test results
$tokenExists = false;
$tokenValid = false;
$apiCallSuccess = false;
$apiResponse = '';
$errorMessage = '';

// Check if token exists
$tokenExists = ($accessToken !== null);

// If token exists, try making an API call
if ($tokenExists) {
    $tokenValid = true;
    
    try {
        // Simple API call to test the token
        $accountsUrl = 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts';
        $ch = curl_init($accountsUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $accessToken,
            'Content-Type: application/json'
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode == 200) {
            $apiCallSuccess = true;
            $apiResponse = $response;
        } else {
            $errorMessage = "API call failed with HTTP code $httpCode: $response";
        }
    } catch (Exception $e) {
        $errorMessage = "Exception: " . $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>OAuth Test - DK Dental Studio</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        .container { border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
        .success { color: green; background: #e8f5e9; padding: 10px; border-radius: 5px; }
        .error { color: red; background: #ffebee; padding: 10px; border-radius: 5px; }
        .warning { color: #ff9800; background: #fff3e0; padding: 10px; border-radius: 5px; }
        .test-item { margin-bottom: 15px; padding: 10px; border: 1px solid #eee; border-radius: 5px; }
        .response { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; font-family: monospace; }
    </style>
</head>
<body>
    <div class="container">
        <h1>OAuth Test Results</h1>
        
        <div class="test-item">
            <h3>OAuth Token Check</h3>
            <?php if ($tokenExists): ?>
                <div class="success">✓ OAuth token exists</div>
            <?php else: ?>
                <div class="error">✗ OAuth token not found. Please complete authorization first.</div>
                <p><a href="google-auth.php">Go to authorization page</a></p>
            <?php endif; ?>
        </div>
        
        <?php if ($tokenExists): ?>
            <div class="test-item">
                <h3>API Call Test</h3>
                <?php if ($apiCallSuccess): ?>
                    <div class="success">✓ API call successful</div>
                    <h4>Response:</h4>
                    <div class="response">
                        <pre><?php echo htmlspecialchars(json_encode(json_decode($apiResponse), JSON_PRETTY_PRINT)); ?></pre>
                    </div>
                <?php else: ?>
                    <div class="error">✗ API call failed</div>
                    <p>Error: <?php echo htmlspecialchars($errorMessage); ?></p>
                <?php endif; ?>
            </div>
        <?php endif; ?>
        
        <div class="test-item">
            <h3>Next Steps</h3>
            <?php if ($tokenExists && $apiCallSuccess): ?>
                <div class="success">
                    <p>✓ Everything is working correctly!</p>
                    <p>You can now implement your reviews API using the OAuth tokens.</p>
                </div>
            <?php elseif ($tokenExists): ?>
                <div class="warning">
                    <p>✓ OAuth token exists, but API call failed.</p>
                    <p>This might be due to an expired token or incorrect scope.</p>
                </div>
                <p><a href="google-auth.php">Re-authorize access</a></p>
            <?php else: ?>
                <div class="warning">
                    <p>✓ You need to complete the OAuth authorization process.</p>
                </div>
                <p><a href="google-auth.php">Go to authorization page</a></p>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>
<?php
function showLoginForm() {
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <title>OAuth Test - Authentication</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 400px; margin: 100px auto; padding: 20px; }
            .form-container { border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
            input[type="password"] { width: 100%; padding: 10px; margin: 10px 0; }
            button { background: #0d6efd; color: white; border: none; padding: 10px 15px; cursor: pointer; }
        </style>
    </head>
    <body>
        <div class="form-container">
            <h2>Authentication Required</h2>
            <p>This page is for administrators only.</p>
            <form method="post">
                <input type="password" name="password" placeholder="Enter password" required>
                <button type="submit">Login</button>
            </form>
        </div>
    </body>
    </html>
    <?php
}
?> 