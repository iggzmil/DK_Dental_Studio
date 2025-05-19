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

// Define the exact path to the token file - only location on the web server
$tokenFile = __DIR__ . '/../../vendor/google/oauth/secure/google_refresh_token.json';
$tokenExists = file_exists($tokenFile);

// Log the token path for debugging
error_log('Looking for token file at: ' . $tokenFile);
error_log('Token file exists: ' . ($tokenExists ? 'Yes' : 'No'));

// Try to read the token directly
$accessToken = null;
$refreshToken = null;
if ($tokenExists && is_readable($tokenFile)) {
    try {
        $tokenData = json_decode(file_get_contents($tokenFile), true);
        if (isset($tokenData['access_token'])) {
            $accessToken = $tokenData['access_token'];
            $refreshToken = $tokenData['refresh_token'] ?? null;
            error_log('Access token read directly from file');
            
            // Check if we need to refresh the token
            if ($refreshToken) {
                // Load client credentials
                $clientSecretsFile = __DIR__ . '/../../vendor/google/oauth/secure/client_secrets.json';
                if (file_exists($clientSecretsFile)) {
                    $clientSecrets = json_decode(file_get_contents($clientSecretsFile), true);
                    $clientId = $clientSecrets['web']['client_id'];
                    $clientSecret = $clientSecrets['web']['client_secret'];
                    
                    // Try to refresh the token
                    $ch = curl_init('https://oauth2.googleapis.com/token');
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_POST, true);
                    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
                        'client_id' => $clientId,
                        'client_secret' => $clientSecret,
                        'refresh_token' => $refreshToken,
                        'grant_type' => 'refresh_token'
                    ]));
                    
                    $response = curl_exec($ch);
                    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    curl_close($ch);
                    
                    if ($httpCode == 200) {
                        $newTokenData = json_decode($response, true);
                        if (isset($newTokenData['access_token'])) {
                            // Update the access token
                            $accessToken = $newTokenData['access_token'];
                            
                            // Save the new token data while preserving the refresh token
                            $tokenData['access_token'] = $newTokenData['access_token'];
                            $tokenData['expires_in'] = $newTokenData['expires_in'];
                            file_put_contents($tokenFile, json_encode($tokenData));
                            
                            error_log('Access token refreshed successfully');
                        }
                    } else {
                        error_log('Failed to refresh token. HTTP Code: ' . $httpCode . ', Response: ' . $response);
                    }
                } else {
                    error_log('Client secrets file not found at: ' . $clientSecretsFile);
                }
            } else {
                error_log('No refresh token found in token data');
            }
        } else {
            error_log('Token file exists but does not contain an access token');
        }
    } catch (Exception $e) {
        error_log('Error reading token file: ' . $e->getMessage());
    }
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