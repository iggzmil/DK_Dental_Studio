<?php
/**
 * Create Calendar Event API
 * 
 * This script creates a Google Calendar event using the server-side OAuth token
 */

// Set headers for JSON response
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

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

// Validate required data
if (!isset($data['event']) || !isset($data['service'])) {
    http_response_code(400); // Bad Request
    echo json_encode([
        'success' => false,
        'error' => 'Missing required data'
    ]);
    exit;
}

// Include the token helper
require_once __DIR__ . '/../vendor/google/oauth/token.php';

// Get a valid access token
$accessToken = getGoogleAccessToken();

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