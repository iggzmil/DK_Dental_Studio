<?php
/**
 * Access Token Provider API
 * 
 * This script provides a valid access token to the client-side JavaScript
 * It uses the server-side OAuth implementation to get and refresh tokens as needed
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set headers for JSON response
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Access-Control-Allow-Origin: *'); // Allow cross-origin requests

// Use the absolute path based on the server environment
$tokenFile = '/var/www/DK_Dental_Studio/vendor/google/oauth/secure/google_refresh_token.json';
$tokenExists = file_exists($tokenFile);

// Log the token path for debugging
error_log('Looking for token file at: ' . $tokenFile);
error_log('Token file exists: ' . ($tokenExists ? 'Yes' : 'No'));

// Try to read the token directly
$accessToken = null;
if ($tokenExists && is_readable($tokenFile)) {
    try {
        $tokenData = json_decode(file_get_contents($tokenFile), true);
        if (isset($tokenData['access_token'])) {
            $accessToken = $tokenData['access_token'];
            error_log('Access token read directly from file');
        }
    } catch (Exception $e) {
        error_log('Error reading token file directly: ' . $e->getMessage());
    }
}

// If direct reading failed, try using the token helper
if (!$accessToken) {
    error_log('Direct token read failed, trying token helper');
    
    // Include the token helper
    require_once __DIR__ . '/../vendor/google/oauth/token.php';
    
    // Get a valid access token
    $accessToken = getGoogleAccessToken();
    
    // Log the result
    error_log('Access token retrieved via helper: ' . ($accessToken ? 'Yes' : 'No'));
}

// Prepare the response
$response = [];

if ($accessToken) {
    // Return a successful response with the token
    $response = [
        'success' => true,
        'access_token' => $accessToken
    ];
    
    // Log success
    error_log('Access token provided to client');
} else {
    // Return an error response with debugging info
    $response = [
        'success' => false,
        'error' => 'No valid access token available',
        'message' => 'OAuth authorization may be required. Please contact the administrator.',
        'debug' => [
            'token_file_path' => $tokenFile,
            'token_file_exists' => $tokenExists,
            'current_dir' => __DIR__,
            'server_path' => $_SERVER['DOCUMENT_ROOT']
        ]
    ];
    
    // Log the error
    error_log('Failed to provide access token to client - no valid token available');
    
    // Set HTTP status code
    http_response_code(401); // Unauthorized
}

// Output the response as JSON
echo json_encode($response);
?> 