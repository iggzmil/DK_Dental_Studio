<?php
/**
 * Access Token Provider API
 * 
 * This script provides a valid access token to the client-side JavaScript
 * It uses the server-side OAuth implementation to get and refresh tokens as needed
 */

// Set headers for JSON response
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Include the token helper
require_once __DIR__ . '/../vendor/google/oauth/token.php';

// Get a valid access token
$accessToken = getGoogleAccessToken();

// Prepare the response
$response = [];

if ($accessToken) {
    // Return a successful response with the token
    $response = [
        'success' => true,
        'access_token' => $accessToken
    ];
    
    // Log success (remove in production)
    error_log('Access token provided to client');
} else {
    // Return an error response
    $response = [
        'success' => false,
        'error' => 'No valid access token available',
        'message' => 'OAuth authorization may be required. Please contact the administrator.'
    ];
    
    // Log the error
    error_log('Failed to provide access token to client - no valid token available');
    
    // Set HTTP status code
    http_response_code(401); // Unauthorized
}

// Output the response as JSON
echo json_encode($response);
?> 