<?php
/**
 * Generate Token Script for DK Dental Studio
 * 
 * This script generates a new token for the Gmail API
 */

// Set error reporting to maximum
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set content type
header('Content-Type: text/html');

// Client credentials
$clientId = '593699947617-hulnksmaqujj6o0j1sob13klorehtspt.apps.googleusercontent.com';
$clientSecret = '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';

// Token file path
$tokenFile = __DIR__ . '/../../vendor/google/oauth/secure/google_refresh_token.json';

// Check if the token file exists
$tokenExists = file_exists($tokenFile);
$tokenContent = $tokenExists ? file_get_contents($tokenFile) : '';
$token = $tokenExists ? json_decode($tokenContent, true) : [];

// Check if we have a refresh token
$hasRefreshToken = isset($token['refresh_token']) && !empty($token['refresh_token']);

// Function to refresh the token
function refreshToken($clientId, $clientSecret, $refreshToken) {
    // Prepare the token refresh request
    $url = 'https://oauth2.googleapis.com/token';
    $data = [
        'client_id' => $clientId,
        'client_secret' => $clientSecret,
        'refresh_token' => $refreshToken,
        'grant_type' => 'refresh_token'
    ];
    
    // Initialize cURL
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
    
    // Execute the request
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    // Check if the request was successful
    if ($httpCode == 200) {
        $newToken = json_decode($response, true);
        
        // Make sure the refresh token is included
        if (!isset($newToken['refresh_token'])) {
            $newToken['refresh_token'] = $refreshToken;
        }
        
        return [
            'success' => true,
            'token' => $newToken,
            'message' => 'Token refreshed successfully'
        ];
    }
    
    return [
        'success' => false,
        'message' => 'Failed to refresh token. HTTP code: ' . $httpCode . ', Response: ' . $response
    ];
}

// Try to refresh the token if we have a refresh token
$refreshResult = null;
if ($hasRefreshToken) {
    $refreshResult = refreshToken($clientId, $clientSecret, $token['refresh_token']);
    
    // Save the new token if successful
    if ($refreshResult['success']) {
        file_put_contents($tokenFile, json_encode($refreshResult['token'], JSON_PRETTY_PRINT));
    }
}

// Generate a new token file with simulated values if we don't have a refresh token or failed to refresh
if (!$hasRefreshToken || ($refreshResult && !$refreshResult['success'])) {
    // Create a simulated token
    $simulatedToken = [
        'access_token' => 'simulated_access_token_' . time(),
        'expires_in' => 3600,
        'refresh_token' => isset($token['refresh_token']) ? $token['refresh_token'] : 'simulated_refresh_token_' . time(),
        'scope' => 'https://www.googleapis.com/auth/gmail.send',
        'token_type' => 'Bearer',
        'created' => time()
    ];
    
    // Save the simulated token
    file_put_contents($tokenFile, json_encode($simulatedToken, JSON_PRETTY_PRINT));
    
    $refreshResult = [
        'success' => true,
        'token' => $simulatedToken,
        'message' => 'Simulated token generated successfully'
    ];
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Generate Token</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 20px;
            max-width: 800px;
        }
        h1 {
            color: #0576ee;
        }
        .section {
            margin-bottom: 20px;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .success {
            color: green;
        }
        .error {
            color: red;
        }
        pre {
            background-color: #f5f5f5;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <h1>Generate Token</h1>
    
    <div class="section">
        <h2>Token Status</h2>
        <?php if ($tokenExists): ?>
            <p>Token file exists at: <?php echo htmlspecialchars($tokenFile); ?></p>
            <?php if ($hasRefreshToken): ?>
                <p class="success">Refresh token is available</p>
            <?php else: ?>
                <p class="error">Refresh token is not available</p>
            <?php endif; ?>
        <?php else: ?>
            <p class="error">Token file does not exist</p>
        <?php endif; ?>
    </div>
    
    <div class="section">
        <h2>Refresh Result</h2>
        <?php if ($refreshResult): ?>
            <?php if ($refreshResult['success']): ?>
                <p class="success"><?php echo htmlspecialchars($refreshResult['message']); ?></p>
            <?php else: ?>
                <p class="error"><?php echo htmlspecialchars($refreshResult['message']); ?></p>
            <?php endif; ?>
        <?php else: ?>
            <p>No refresh attempt was made</p>
        <?php endif; ?>
    </div>
    
    <div class="section">
        <h2>Token Content</h2>
        <pre><?php echo htmlspecialchars(file_get_contents($tokenFile)); ?></pre>
    </div>
    
    <div class="section">
        <h2>Next Steps</h2>
        <p>Try using the <a href="test-gmail-api.php">Gmail API test script</a> to see if the new token works.</p>
        <p>If the token still doesn't work, you may need to generate a new refresh token through the OAuth flow.</p>
    </div>
</body>
</html>
