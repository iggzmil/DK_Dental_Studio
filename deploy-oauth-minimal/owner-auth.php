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
    // HARDCODED CLIENT CREDENTIALS - Define these before creating the client
    $clientId = '593699947617-hulnksmaqujj6o0j1sob13klorehtspt.apps.googleusercontent.com';
    $clientSecret = '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';
    
    // Debug output
    echo "<!-- Debug: Setting up Google Client -->\n";
    echo "<!-- Client ID: " . $clientId . " -->\n";
    echo "<!-- Client Secret: " . (empty($clientSecret) ? 'NOT SET' : 'IS SET') . " -->\n";
    
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
    
    // OAuth flow settings
    $client->setAccessType('offline');
    $client->setApprovalPrompt('force'); // Force to get refresh token
    $client->setIncludeGrantedScopes(true); // Enable incremental authorization
    $client->setScopes(['https://www.googleapis.com/auth/business.manage']);

    // Generate authorization URL
    $authUrl = $client->createAuthUrl();
    
    // Debug: check the OAuth2 service inside the client
    $reflectionClass = new ReflectionClass($client);
    $authProperty = $reflectionClass->getProperty('auth');
    $authProperty->setAccessible(true);
    $auth = $authProperty->getValue($client);
    
    echo "<!-- OAuth2 service initialized: " . ($auth ? 'YES' : 'NO') . " -->\n";
    
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
        
        <!-- Debug info (hidden in HTML comment) -->
        <!-- Redirect URI: <?php echo $redirectUri; ?> -->
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
