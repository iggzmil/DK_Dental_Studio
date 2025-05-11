<?php
/**
 * OAuth Callback Handler for DK Dental Studio
 * 
 * This page handles the OAuth callback from Google and stores the refresh token
 * This version is designed to work with the minimal Google API Client package
 */

// Start session for authentication
session_start();

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Ensure only authenticated users can access this page
if (!isset($_SESSION['authenticated'])) {
    header('Location: owner-auth.php');
    exit;
}

// Load the minimal Google API Client
require_once __DIR__ . '/vendor/autoload.php';

// Check if our custom Auth interface exists before proceeding
if (!interface_exists('Google\Auth\GetUniverseDomainInterface')) {
    // Create a fallback
    if (!file_exists(__DIR__ . '/vendor/google/apiclient/src/Auth/GetUniverseDomainInterface.php')) {
        echo "Error: Required interface files are missing. Please check your installation.";
        exit;
    }
}

try {
    // Create Google client with minimal configuration
    $client = new Google\Client();
    
    // Define client credentials
    $clientId = '976666616562-c4s3nfesuu7drrt6nmghnb6qc6cteers.apps.googleusercontent.com';
    $clientSecret = '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';
    
    // Configure client
    $client->setClientId($clientId);
    $client->setClientSecret($clientSecret);
    $client->setRedirectUri('https://' . $_SERVER['HTTP_HOST'] . '/deploy-oauth-minimal/owner-callback.php');
    $client->addScope('https://www.googleapis.com/auth/business.manage');

    // Define token storage location
    $secureDir = __DIR__ . '/secure';
    if (!file_exists($secureDir)) {
        mkdir($secureDir, 0700, true);
    }
    $tokenFile = $secureDir . '/google_refresh_token.json';

    // Process the authorization code
    if (isset($_GET['code'])) {
        try {
            // Log the received code (partial for security)
            $codeLength = strlen($_GET['code']);
            error_log('Received authorization code: ' . substr($_GET['code'], 0, 5) . '...' . substr($_GET['code'], -5) . " (Length: $codeLength)");
            
            // Exchange authorization code for access token
            $token = $client->fetchAccessTokenWithAuthCode($_GET['code']);
            
            // Debug token response
            error_log('Token response: ' . json_encode($token));

            if (isset($token['refresh_token'])) {
                // Store the refresh token
                file_put_contents($tokenFile, json_encode($token));

                // Test the token by making a simple API call
                $client->setAccessToken($token);

                $success = true;
                $message = "Authorization successful! Your website can now display your Google reviews.";
                
                // Log success
                error_log('OAuth flow completed successfully. Refresh token obtained.');
            } else {
                $success = false;
                $message = "No refresh token was received. Please try again.";
                
                // Log error
                error_log('OAuth token response did not contain refresh_token: ' . json_encode($token));
            }
        } catch (Exception $e) {
            $success = false;
            $message = "Error during authorization: " . $e->getMessage();
            
            // Log detailed error
            error_log('OAuth error: ' . $e->getMessage() . ' - ' . $e->getTraceAsString());
        }
    } else {
        $success = false;
        $message = "No authorization code received.";
        
        // Log error
        error_log('No authorization code received in callback. Query string: ' . $_SERVER['QUERY_STRING']);
    }
} catch (Exception $e) {
    $success = false;
    $message = "Error initializing Google Client: " . $e->getMessage();
    
    // Log error
    error_log('Error initializing Google Client: ' . $e->getMessage() . ' - ' . $e->getTraceAsString());
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
            <p><a href="owner-auth.php">Try again</a></p>
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
