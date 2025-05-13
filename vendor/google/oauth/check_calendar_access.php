<?php
/**
 * Calendar Access Check for DK Dental Studio
 * 
 * This script checks if we have access to a specific Google Calendar
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

// Define client credentials
$clientId = '593699947617-hulnksmaqujj6o0j1sob13klorehtspt.apps.googleusercontent.com';
$clientSecret = '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';

// Define token storage location
$secureDir = dirname(__FILE__) . '/secure';
$tokenFile = $secureDir . '/google_refresh_token.json';

// Check if token file exists
if (!file_exists($tokenFile)) {
    displayError("No authorization token found. Please <a href='auth.php'>authorize access</a> first.");
    exit;
}

// Load the token
$tokenData = json_decode(file_get_contents($tokenFile), true);
if (!$tokenData || !isset($tokenData['access_token'])) {
    displayError("Invalid token data. Please <a href='auth.php'>reauthorize access</a>.");
    exit;
}

// Check if token is expired
$accessToken = $tokenData['access_token'];
$tokenExpiry = isset($tokenData['expires_in']) ? 
    (isset($tokenData['created']) ? $tokenData['created'] + $tokenData['expires_in'] : time() - 10) : 
    time() - 10;

// If token is expired, refresh it
if ($tokenExpiry <= time() && isset($tokenData['refresh_token'])) {
    $refreshToken = $tokenData['refresh_token'];
    
    // Refresh the token
    $tokenUrl = 'https://oauth2.googleapis.com/token';
    $postData = [
        'client_id' => $clientId,
        'client_secret' => $clientSecret,
        'refresh_token' => $refreshToken,
        'grant_type' => 'refresh_token'
    ];
    
    if (function_exists('curl_init')) {
        $ch = curl_init($tokenUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode == 200) {
            $newTokenData = json_decode($response, true);
            if (isset($newTokenData['access_token'])) {
                $accessToken = $newTokenData['access_token'];
                
                // Preserve the refresh token as it might not be included in the response
                $newTokenData['refresh_token'] = $refreshToken;
                $newTokenData['created'] = time();
                
                // Save the updated token
                file_put_contents($tokenFile, json_encode($newTokenData));
            } else {
                displayError("Failed to refresh token: Invalid response");
                exit;
            }
        } else {
            displayError("Failed to refresh token: HTTP error $httpCode");
            exit;
        }
    } else {
        displayError("cURL is required for token refresh");
        exit;
    }
}

// Calendar ID to check
$calendarId = 'info@dkdental.au';

// Try to get calendar metadata to check access
$calendarUrl = 'https://www.googleapis.com/calendar/v3/calendars/' . urlencode($calendarId);

$ch = curl_init($calendarUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $accessToken]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

// Process the response
$hasAccess = false;
$calendarDetails = null;
$errorMessage = '';

if ($httpCode == 200) {
    $hasAccess = true;
    $calendarDetails = json_decode($response, true);
} else {
    $errorData = json_decode($response, true);
    $errorMessage = isset($errorData['error']['message']) ? 
        $errorData['error']['message'] : 
        "HTTP error $httpCode" . ($error ? ": $error" : "");
}

// Display the result
?>
<!DOCTYPE html>
<html>
<head>
    <title>DK Dental Studio - Calendar Access Check</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        .container { border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
        .success { color: green; }
        .error { color: red; }
        .debug { background: #f8f9fa; border: 1px solid #ddd; padding: 10px; margin-top: 20px; font-family: monospace; }
        table { border-collapse: collapse; width: 100%; }
        table, th, td { border: 1px solid #ddd; }
        th, td { padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Google Calendar Access Check</h1>
        
        <?php if ($hasAccess): ?>
            <div class="success">
                <h2>Success!</h2>
                <p>You have access to the calendar: <?php echo htmlspecialchars($calendarId); ?></p>
            </div>
            
            <?php if ($calendarDetails): ?>
                <h3>Calendar Details:</h3>
                <table>
                    <tr>
                        <th>Property</th>
                        <th>Value</th>
                    </tr>
                    <?php foreach ($calendarDetails as $key => $value): ?>
                        <?php if (!is_array($value)): ?>
                            <tr>
                                <td><?php echo htmlspecialchars($key); ?></td>
                                <td><?php echo htmlspecialchars($value); ?></td>
                            </tr>
                        <?php endif; ?>
                    <?php endforeach; ?>
                </table>
            <?php endif; ?>
            
        <?php else: ?>
            <div class="error">
                <h2>Access Denied</h2>
                <p>You do not have access to the calendar: <?php echo htmlspecialchars($calendarId); ?></p>
                <p>Error: <?php echo htmlspecialchars($errorMessage); ?></p>
            </div>
            
            <div class="debug">
                <p><strong>Troubleshooting:</strong></p>
                <ol>
                    <li>Make sure the calendar ID is correct</li>
                    <li>Verify that the Google account you authorized has access to this calendar</li>
                    <li>Try <a href="auth.php">reauthorizing access</a> with the correct Google account</li>
                    <li>Check if the calendar exists and is shared with your account</li>
                </ol>
            </div>
        <?php endif; ?>
        
        <p><a href="auth.php">Return to Authorization Page</a></p>
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

function displayError($message) {
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <title>DK Dental Studio - Error</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
            .container { border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
            .error { color: red; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Error</h1>
            <div class="error">
                <p><?php echo $message; ?></p>
            </div>
        </div>
    </body>
    </html>
    <?php
}
?> 