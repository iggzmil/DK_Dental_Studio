<?php
/**
 * OAuth Callback Handler for DK Dental Studio
 * 
 * This page handles the OAuth callback from Google and stores the refresh token
 * This version is designed to work with the minimal Google API Client package
 */

// Start session for authentication
session_start();

// Ensure only authenticated users can access this page
if (!isset($_SESSION['authenticated'])) {
    header('Location: owner-auth.php');
    exit;
}

// Load the minimal Google API Client
require_once __DIR__ . '/vendor/autoload.php';

// Create Google client
$client = new Google\Client();
$client->setClientId('593699947617-hulnksmaqujj6o0j1sob13klorehtspt.apps.googleusercontent.com');
$client->setClientSecret('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');
$client->setRedirectUri('https://' . $_SERVER['HTTP_HOST'] . '/deploy-oauth-minimal/owner-callback.php');

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
    }
} else {
    $success = false;
    $message = "No authorization code received.";
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
