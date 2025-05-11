<?php
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
ini_set('display_errors', 1);

// Ensure only authenticated users can access this page
if (!isset($_SESSION['authenticated'])) {
    header('Location: auth.php');
    exit;
}

// Define client credentials
$clientId = '976666616562-c4s3nfesuu7drrt6nmghnb6qc6cteers.apps.googleusercontent.com';
$clientSecret = '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';
$redirectUri = 'https://dkdstudio.aaa-city.com/vendor/google/oauth/callback.php';

// Define token storage location
$secureDir = dirname(__FILE__) . '/secure';
if (!file_exists($secureDir)) {
    mkdir($secureDir, 0700, true);
}
$tokenFile = $secureDir . '/google_refresh_token.json';

$success = false;
$message = "";

// Process the authorization code
if (isset($_GET['code'])) {
    $code = $_GET['code'];
    
    // Log the received code (partial for security)
    $codeLength = strlen($code);
    error_log('Received authorization code: ' . substr($code, 0, 5) . '...' . substr($code, -5) . " (Length: $codeLength)");
    
    // Exchange authorization code for access token using cURL
    $tokenUrl = 'https://oauth2.googleapis.com/token';
    $postData = [
        'code' => $code,
        'client_id' => $clientId,
        'client_secret' => $clientSecret,
        'redirect_uri' => $redirectUri,
        'grant_type' => 'authorization_code'
    ];
    
    // Initialize cURL session
    $ch = curl_init($tokenUrl);
    
    // Set cURL options
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
    
    // Execute cURL request
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    
    // Close cURL session
    curl_close($ch);
    
    // Log raw response for debugging
    error_log("Token exchange HTTP code: $httpCode");
    if ($curlError) {
        error_log("cURL error: $curlError");
    }
    
    // Process the response
    if ($httpCode == 200) {
        $token = json_decode($response, true);
        
        // Debug token response
        error_log('Token response keys: ' . implode(', ', array_keys($token)));
        
        if (isset($token['refresh_token'])) {
            // Store the refresh token
            file_put_contents($tokenFile, $response);
            
            $success = true;
            $message = "Authorization successful! Your website can now display your Google reviews.";
            
            // Log success
            error_log('OAuth flow completed successfully. Refresh token obtained.');
        } else {
            $success = false;
            $message = "No refresh token was received. Please try again.";
            
            // Log error
            error_log('OAuth token response did not contain refresh_token: ' . $response);
        }
    } else {
        $success = false;
        $message = "Error during token exchange (HTTP $httpCode). Please try again.";
        
        // Log error
        error_log('Token exchange error: ' . $response);
    }
} else if (isset($_GET['error'])) {
    $success = false;
    $message = "Authorization error: " . htmlspecialchars($_GET['error']);
    if (isset($_GET['error_description'])) {
        $message .= " - " . htmlspecialchars($_GET['error_description']);
    }
    
    // Log error
    error_log('OAuth error: ' . $_GET['error'] . (isset($_GET['error_description']) ? " - " . $_GET['error_description'] : ""));
} else {
    $success = false;
    $message = "No authorization code received.";
    
    // Log error
    error_log('No authorization code received in callback. Query string: ' . $_SERVER['QUERY_STRING']);
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
        <div class="<?php echo $success ? 'success' : 'error'; ?>">
            <h2><?php echo $success ? 'Success!' : 'Error'; ?></h2>
            <p><?php echo $message; ?></p>
        </div>
        <?php if ($success): ?>
            <div>
                <h3>What happens now?</h3>
                <p>Your website is now connected to your Google Business Profile. You don't need to do anything else.</p>
                <p>Google reviews will automatically appear on your website's testimonial section.</p>
                <p>You can safely close this window and return to your website.</p>
            </div>
        <?php else: ?>
            <p><a href="auth.php">Try again</a></p>
            <div class="debug">
                <p><strong>Debug Information:</strong></p>
                <p>Query String: <?php echo htmlspecialchars($_SERVER['QUERY_STRING']); ?></p>
                <?php if (isset($_GET['error'])): ?>
                    <p>Error: <?php echo htmlspecialchars($_GET['error']); ?></p>
                <?php endif; ?>
                <?php if (isset($_GET['error_description'])): ?>
                    <p>Error Description: <?php echo htmlspecialchars($_GET['error_description']); ?></p>
                <?php endif; ?>
            </div>
        <?php endif; ?>
    </div>
</body>
</html> 