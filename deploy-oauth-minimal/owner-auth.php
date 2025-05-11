<?php
/**
 * OAuth Authorization Page for DK Dental Studio
 * 
 * This page initiates the OAuth flow for Google API access
 * This version is designed to work with the minimal Google API Client package
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
    // Create Google client object with minimal required settings for OAuth flow
    $client = new Google\Client();
    
    // Define the client credentials
    $clientId = '976666616562-c4s3nfesuu7drrt6nmghnb6qc6cteers.apps.googleusercontent.com';
    $clientSecret = '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';
    
    // Essential configuration options only
    $client->setClientId($clientId);
    $client->setClientSecret($clientSecret);
    $client->setRedirectUri('https://' . $_SERVER['HTTP_HOST'] . '/deploy-oauth-minimal/owner-callback.php');
    $client->setAccessType('offline');  // Request refresh token
    $client->setApprovalPrompt('force'); // Force consent screen to get refresh token
    
    // Add scope - explicitly using addScope instead of setScopes
    $client->addScope('https://www.googleapis.com/auth/business.manage');
    
    // Create the authorization URL
    $authUrl = $client->createAuthUrl();
    
    // Verify the URL contains a scope parameter
    if (strpos($authUrl, 'scope=') === false) {
        // Log the issue
        error_log('OAuth URL missing scope parameter: ' . $authUrl);
        
        // Try to manually construct a proper auth URL
        $manualAuthUrl = 'https://accounts.google.com/o/oauth2/auth?'
            . 'client_id=' . urlencode($clientId)
            . '&redirect_uri=' . urlencode('https://' . $_SERVER['HTTP_HOST'] . '/deploy-oauth-minimal/owner-callback.php')
            . '&response_type=code' 
            . '&scope=' . urlencode('https://www.googleapis.com/auth/business.manage')
            . '&access_type=offline'
            . '&approval_prompt=force';
        
        $authUrl = $manualAuthUrl;
    }
    
} catch (Exception $e) {
    // Display detailed error message for debugging
    echo "<h1>Error Details:</h1>";
    echo "<p><strong>Error Message:</strong> " . $e->getMessage() . "</p>";
    echo "<p><strong>Error Trace:</strong></p>";
    echo "<pre>" . $e->getTraceAsString() . "</pre>";
    exit;
}

// Display authorization instructions
?>
<!DOCTYPE html>
<html>
<head>
    <title>DK Dental Studio - Google Reviews Authorization</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        .container { border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
        .btn { display: inline-block; background: #0d6efd; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        .debug { background: #f8f9fa; border: 1px solid #ddd; padding: 10px; margin-top: 20px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Google Reviews Authorization</h1>
        <p>This page will help you authorize DK Dental Studio's website to access your Google Business Profile reviews.</p>
        <p><strong>Important:</strong> You only need to complete this process once. After authorization, the website will be able to display your Google reviews on the website.</p>
        <p>Click the button below to start the authorization process:</p>
        <p><a href="<?php echo $authUrl; ?>" class="btn">Authorize Google Access</a></p>
        <p>After clicking, you'll be redirected to Google's sign-in page. Sign in with the Google account that manages your business profile.</p>
        
        <div class="debug">
            <p><strong>Debug Information:</strong></p>
            <p>Client ID: <?php echo htmlspecialchars(substr($clientId, 0, 10) . '...'); ?></p>
            <p>Redirect URI: <?php echo htmlspecialchars('https://' . $_SERVER['HTTP_HOST'] . '/deploy-oauth-minimal/owner-callback.php'); ?></p>
            <p>Auth URL: <?php echo htmlspecialchars($authUrl); ?></p>
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
        <title>Owner Authentication</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 400px; margin: 100px auto; padding: 20px; }
            .form-container { border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
            input[type="password"] { width: 100%; padding: 10px; margin: 10px 0; }
            button { background: #0d6efd; color: white; border: none; padding: 10px 15px; cursor: pointer; }
        </style>
    </head>
    <body>
        <div class="form-container">
            <h2>Owner Authentication</h2>
            <p>This page is for the business owner only.</p>
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
