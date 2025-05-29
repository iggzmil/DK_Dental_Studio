<?php
/**
 * Google Calendar Busy Times Proxy
 * 
 * This script fetches busy times from Google Calendar API server-side
 * to avoid CORS issues with direct client-side calls
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set headers for JSON response
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Access-Control-Allow-Origin: *');
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

// Validate required data
if (!isset($data['startDate']) || !isset($data['endDate'])) {
    http_response_code(400); // Bad Request
    echo json_encode([
        'success' => false,
        'error' => 'Missing required data: startDate and endDate'
    ]);
    exit;
}

// Get access token using existing token manager
$tokenFile = __DIR__ . '/../../vendor/google/oauth/secure/google_refresh_token.json';
$accessToken = null;

if (file_exists($tokenFile) && is_readable($tokenFile)) {
    try {
        $tokenData = json_decode(file_get_contents($tokenFile), true);
        if (isset($tokenData['access_token'])) {
            $accessToken = $tokenData['access_token'];
            
            // Check if we need to refresh the token
            if (isset($tokenData['refresh_token'])) {
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
                        'refresh_token' => $tokenData['refresh_token'],
                        'grant_type' => 'refresh_token'
                    ]));
                    
                    $response = curl_exec($ch);
                    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    curl_close($ch);
                    
                    if ($httpCode == 200) {
                        $newTokenData = json_decode($response, true);
                        if (isset($newTokenData['access_token'])) {
                            $accessToken = $newTokenData['access_token'];
                            
                            // Save the new token data
                            $tokenData['access_token'] = $newTokenData['access_token'];
                            $tokenData['expires_in'] = $newTokenData['expires_in'];
                            file_put_contents($tokenFile, json_encode($tokenData));
                        }
                    }
                }
            }
        }
    } catch (Exception $e) {
        error_log('Error reading token file: ' . $e->getMessage());
    }
}

if (!$accessToken) {
    http_response_code(401); // Unauthorized
    echo json_encode([
        'success' => false,
        'error' => 'No valid access token available'
    ]);
    exit;
}

// Build Google Calendar API URL
$calendarId = 'info@dkdental.au';
$params = http_build_query([
    'timeMin' => $data['startDate'],
    'timeMax' => $data['endDate'],
    'singleEvents' => 'true',
    'orderBy' => 'startTime'
]);

$apiUrl = "https://www.googleapis.com/calendar/v3/calendars/{$calendarId}/events?{$params}";

// Initialize cURL session
$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $accessToken,
    'Content-Type: application/json'
]);

// Execute cURL request
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// Log the response for debugging
error_log("Google Calendar API response (HTTP $httpCode): $response");
if ($curlError) {
    error_log("cURL error: $curlError");
}

// Process the response
if ($httpCode >= 200 && $httpCode < 300) {
    $responseData = json_decode($response, true);
    $events = $responseData['items'] ?? [];
    
    // Parse busy times
    $busySlots = [];
    foreach ($events as $event) {
        if (!isset($event['start']) || !isset($event['start']['dateTime'])) {
            continue;
        }
        
        $startDate = new DateTime($event['start']['dateTime']);
        $dateKey = $startDate->format('Y-m-d');
        $hour = (int)$startDate->format('H');
        
        if (!isset($busySlots[$dateKey])) {
            $busySlots[$dateKey] = [];
        }
        
        if (!in_array($hour, $busySlots[$dateKey])) {
            $busySlots[$dateKey][] = $hour;
        }
    }
    
    echo json_encode([
        'success' => true,
        'busyTimes' => $busySlots
    ]);
} else {
    // Error fetching from Google Calendar
    error_log("Error fetching calendar events (HTTP $httpCode): $response");
    
    echo json_encode([
        'success' => false,
        'error' => "Failed to fetch calendar events (HTTP $httpCode)",
        'details' => json_decode($response, true)
    ]);
}
?> 