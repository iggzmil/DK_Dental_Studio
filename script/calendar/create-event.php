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
if (file_exists($tokenFile) && is_readable($tokenFile)) {
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
    require_once __DIR__ . '/../../vendor/google/oauth/token.php';
    
    // Get a valid access token
    $accessToken = getGoogleAccessToken();
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
    'dentures' => 'primary', // Replace with actual calendar ID for dentures
    'repairs' => 'primary',  // Replace with actual calendar ID for repairs
    'mouthguards' => 'primary' // Replace with actual calendar ID for mouthguards
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