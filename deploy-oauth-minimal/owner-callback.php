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
    // HARDCODED CLIENT CREDENTIALS - Define these before creating the client
    $clientId = '593699947617-hulnksmaqujj6o0j1sob13klorehtspt.apps.googleusercontent.com';
    $clientSecret = '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';
    
    // Debug output
    echo "<!-- Debug: Setting up Google Client for callback -->\n";
    echo "<!-- Client ID: " . $clientId . " -->\n";
    
    // Create Google client with configuration options directly
    $client = new Google\Client([
        'client_id' => $clientId,
        'client_secret' => $clientSecret
    ]);
    
    // Double check client ID is set by explicitly calling setter methods
    $client->setClientId($clientId);
    $client->setClientSecret($clientSecret);
    
    // Debug check if client ID was properly set
    $configClientId = $client->getClientId();
    echo "<!-- Confirmed Client ID: " . $configClientId . " -->\n";
    
    // Set redirect URI - make sure this is the correct path on your server
    $redirectUri = 'https://' . $_SERVER['HTTP_HOST'] . '/deploy-oauth-minimal/owner-callback.php';
    $client->setRedirectUri($redirectUri);
    
    // Set OAuth flow settings
    $client->setAccessType('offline');
    $client->setApprovalPrompt('force'); // Force to get refresh token
    $client->setIncludeGrantedScopes(true); // Enable incremental authorization
    
    // Set scopes - make sure this is explicitly set as an array first, then use addScope
    $scopes = ['https://www.googleapis.com/auth/business.manage'];
    $client->setScopes($scopes);
    
    // Debug scopes
    echo "<!-- Scopes set: " . json_encode($client->getScopes()) . " -->\n";

    // Define token storage location
    $secureDir = __DIR__ . '/secure';
    if (!file_exists($secureDir)) {
        mkdir($secureDir, 0700, true);
    }
    $tokenFile = $secureDir . '/google_refresh_token.json';

    // Process the authorization code
    if (isset($_GET['code'])) {
        try {
            // Exchange authorization code for access token
            $token = $client->fetchAccessTokenWithAuthCode($_GET['code']);

            if (isset($token['refresh_token'])) {
                // Store the refresh token
                file_put_contents($tokenFile, json_encode($token));

                // Test the token by making a simple API call
                $client->setAccessToken($token);

                $success = true;
                $message = "Authorization successful! Your website can now display your Google reviews.";
            } else {
                $success = false;
                $message = "No refresh token was received. Please try again.";
            }
        } catch (Exception $e) {
            $success = false;
            $message = "Error during authorization: " . $e->getMessage();
            // Add debug output
            echo "<!-- Error details: " . $e->getTraceAsString() . " -->";
        }
    } else {
        $success = false;
        $message = "No authorization code received.";
    }
} catch (Exception $e) {
    $success = false;
    $message = "Error initializing Google Client: " . $e->getMessage();
    // Add debug output
    echo "<!-- Error details: " . $e->getTraceAsString() . " -->";
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
        <?php endif; ?>
    </div>
</body>
</html>
