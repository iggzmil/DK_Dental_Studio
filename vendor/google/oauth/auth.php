<?php
/**
 * OAuth Authorization Page for DK Dental Studio
 * 
 * This page initiates the OAuth flow for Google API access
 * This version is designed to work with minimal dependencies
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

// Define the client credentials
$clientId = '593699947617-hulnksmaqujj6o0j1sob13klorehtspt.apps.googleusercontent.com';
$clientSecret = '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';

// Ensure the redirect URI matches exactly what's configured in Google Cloud Console
// Remove any extra slashes or path elements that might cause mismatch
$redirectUri = 'https://dkdstudio.aaa-city.com/vendor/google/oauth/callback.php';

// Include both Business Profile and Calendar scopes
$scope = 'https://www.googleapis.com/auth/business.manage https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.send';

// Log redirect URI for debugging
error_log('Using redirect URI: ' . $redirectUri);

// Skip the Google API Client and create the auth URL directly
$authUrl = 'https://accounts.google.com/o/oauth2/auth'
    . '?response_type=code'
    . '&client_id=' . urlencode($clientId)
    . '&redirect_uri=' . urlencode($redirectUri)
    . '&scope=' . urlencode($scope)
    . '&access_type=offline'
    . '&prompt=consent';

// Log additional debugging information
error_log('Generated OAuth URL: ' . $authUrl);
error_log('Server HTTP_HOST: ' . $_SERVER['HTTP_HOST']);
error_log('Client ID: ' . $clientId);

// Display authorization instructions
?>
<!DOCTYPE html>
<html>
<head>
    <title>DK Dental Studio - Google API Authorization</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        .container { border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
        .btn { display: inline-block; background: #0d6efd; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        .debug { background: #f8f9fa; border: 1px solid #ddd; padding: 10px; margin-top: 20px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Google API Authorization</h1>
        <p>This page will help you authorize DK Dental Studio's website to access your Google Calendar and Gmail services.</p>
        <p><strong>Important:</strong> You only need to complete this process once. After authorization, the website will be able to access your calendar and send emails on your behalf.</p>
        <p>Click the button below to start the authorization process:</p>
        <p><a href="<?php echo $authUrl; ?>" class="btn">Authorize Google Access</a></p>
        <p>After clicking, you'll be redirected to Google's sign-in page. Sign in with the Google account that manages your business profile.</p>
        
        <div class="debug">
            <p><strong>Debug Information:</strong></p>
            <p>Client ID: <?php echo htmlspecialchars(substr($clientId, 0, 10) . '...'); ?></p>
            <p>Redirect URI: <?php echo htmlspecialchars($redirectUri); ?></p>
            <p>Scope: <?php echo htmlspecialchars($scope); ?></p>
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