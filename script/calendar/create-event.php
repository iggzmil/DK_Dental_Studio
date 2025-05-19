<?php
/**
 * Create Calendar Event API
 * 
 * This script creates a Google Calendar event using the server-side OAuth token
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set headers for JSON response
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Access-Control-Allow-Origin: *'); // Allow cross-origin requests
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Allow POST requests only
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode([
        'success' => false,
        'error' => 'Method not allowed'
    ]);
    exit;
}

// Get the JSON data from the request
$jsonData = file_get_contents('php://input');
$data = json_decode($jsonData, true);

// Log the received data for debugging
error_log('Received event data: ' . $jsonData);

// Validate required data
if (!isset($data['event']) || !isset($data['service'])) {
    http_response_code(400); // Bad Request
    echo json_encode([
        'success' => false,
        'error' => 'Missing required data'
    ]);
    exit;
}

// Use the absolute path based on the server environment
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

if (!$accessToken) {
    http_response_code(401); // Unauthorized
    echo json_encode([
        'success' => false,
        'error' => 'No valid access token available',
        'message' => 'OAuth authorization required'
    ]);
    exit;
}

// Define calendar IDs
$calendarIds = [
    'dentures' => 'info@dkdental.au',
    'repairs' => 'info@dkdental.au',
    'mouthguards' => 'info@dkdental.au'
];

// Get the appropriate calendar ID
$calendarId = isset($calendarIds[$data['service']]) ? $calendarIds[$data['service']] : 'primary';

// Create the event using the Google Calendar API
$eventData = $data['event'];
$apiUrl = "https://www.googleapis.com/calendar/v3/calendars/{$calendarId}/events";

// Initialize cURL session
$ch = curl_init($apiUrl);

// Set cURL options
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($eventData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $accessToken,
    'Content-Type: application/json'
]);

// Execute cURL request
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);

// Close cURL session
curl_close($ch);

// Log the response for debugging
error_log("Google Calendar API response (HTTP $httpCode): $response");
if ($curlError) {
    error_log("cURL error: $curlError");
}

// Process the response
if ($httpCode >= 200 && $httpCode < 300) {
    // Success - event created
    $responseData = json_decode($response, true);
    echo json_encode([
        'success' => true,
        'event_id' => isset($responseData['id']) ? $responseData['id'] : null,
        'message' => 'Event created successfully'
    ]);
} else {
    // Error creating event
    error_log("Error creating calendar event (HTTP $httpCode): $response");
    if ($curlError) {
        error_log("cURL error: $curlError");
    }
    
    // Return error response
    echo json_encode([
        'success' => false,
        'error' => "Failed to create event (HTTP $httpCode)",
        'details' => json_decode($response, true)
    ]);
    
    // Set appropriate HTTP status code
    if ($httpCode >= 400) {
        http_response_code($httpCode);
    } else {
        http_response_code(500); // Internal Server Error
    }
}
?> 