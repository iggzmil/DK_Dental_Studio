<?php
/**
 * Google Calendar Access Test
 * 
 * This page tests access to the specific calendar ID using existing server-side tokens
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Create a simple output function
function outputResult($success, $message, $details = null) {
    echo '<div style="margin: 10px; padding: 15px; border-radius: 5px; ' . 
         'background-color: ' . ($success ? '#d4edda' : '#f8d7da') . '; ' .
         'color: ' . ($success ? '#155724' : '#721c24') . ';">';
    echo '<h3>' . ($success ? '✅ ' : '❌ ') . $message . '</h3>';
    if ($details) {
        if (is_array($details) || is_object($details)) {
            echo '<pre>' . htmlspecialchars(json_encode($details, JSON_PRETTY_PRINT)) . '</pre>';
        } else {
            echo '<p>' . htmlspecialchars($details) . '</p>';
        }
    }
    echo '</div>';
}

// Output page header
echo '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calendar Access Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
        .step { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>Google Calendar Access Test</h1>
    <p>Testing access to calendar ID: <strong>info@dkdental.au</strong></p>
';

// STEP 1: Retrieve the access token
echo '<div class="step"><h2>Step 1: Retrieving Access Token</h2>';

// Define the path to the token file
$tokenFile = __DIR__ . '/vendor/google/oauth/secure/google_refresh_token.json';
$tokenExists = file_exists($tokenFile);

echo '<p>Looking for token file at: ' . htmlspecialchars($tokenFile) . '</p>';
echo '<p>Token file exists: ' . ($tokenExists ? 'Yes' : 'No') . '</p>';

// Try to read the token
$accessToken = null;
$refreshToken = null;
if ($tokenExists && is_readable($tokenFile)) {
    try {
        $tokenData = json_decode(file_get_contents($tokenFile), true);
        if (isset($tokenData['access_token'])) {
            $accessToken = $tokenData['access_token'];
            $refreshToken = $tokenData['refresh_token'] ?? null;
            
            // Check if we need to refresh the token
            if ($refreshToken) {
                // Load client credentials
                $clientSecretsFile = __DIR__ . '/vendor/google/oauth/secure/client_secrets.json';
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
                            
                            outputResult(true, 'Access token refreshed successfully');
                        }
                    } else {
                        outputResult(false, 'Failed to refresh token', json_decode($response, true));
                    }
                } else {
                    outputResult(false, 'Client secrets file not found');
                }
            }
            
            // Show partial token for verification without revealing the complete value
            $maskedToken = substr($accessToken, 0, 10) . '...' . substr($accessToken, -10);
            outputResult(true, 'Access token retrieved successfully', 'Token: ' . $maskedToken);
        } else {
            outputResult(false, 'Token file exists but does not contain an access token', $tokenData);
        }
    } catch (Exception $e) {
        outputResult(false, 'Error reading token file', $e->getMessage());
    }
} else {
    // If the token file doesn't exist or isn't readable
    outputResult(false, 'Cannot read token file');
    
    // Try alternative approach - importing the token helper if available
    echo '<p>Attempting alternative token retrieval...</p>';
    if (file_exists(__DIR__ . '/vendor/google/oauth/token.php')) {
        try {
            require_once __DIR__ . '/vendor/google/oauth/token.php';
            if (function_exists('getGoogleAccessToken')) {
                $accessToken = getGoogleAccessToken();
                if ($accessToken) {
                    $maskedToken = substr($accessToken, 0, 10) . '...' . substr($accessToken, -10);
                    outputResult(true, 'Access token retrieved via helper function', 'Token: ' . $maskedToken);
                } else {
                    outputResult(false, 'Helper function did not return a valid token');
                }
            } else {
                outputResult(false, 'Token helper found but getGoogleAccessToken function not defined');
            }
        } catch (Exception $e) {
            outputResult(false, 'Error in token helper', $e->getMessage());
        }
    } else {
        outputResult(false, 'Token helper file not found at ' . __DIR__ . '/vendor/google/oauth/token.php');
    }
}
echo '</div>';

// STEP 2: Test Calendar Access
echo '<div class="step"><h2>Step 2: Testing Calendar Access</h2>';

if (!$accessToken) {
    outputResult(false, 'Cannot test calendar access: No valid access token available');
} else {
    // Set the specific calendar ID
    $calendarId = 'info@dkdental.au';
    
    // Test access by listing events (limited to 1)
    $apiUrl = "https://www.googleapis.com/calendar/v3/calendars/" . urlencode($calendarId) . "/events?maxResults=1";
    
    // Initialize cURL session
    $ch = curl_init($apiUrl);
    
    // Set cURL options
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $accessToken,
        'Accept: application/json'
    ]);
    
    // Execute cURL request
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    
    // Close cURL session
    curl_close($ch);
    
    // Process the response
    if ($curlError) {
        outputResult(false, 'cURL Error', $curlError);
    } else if ($httpCode >= 200 && $httpCode < 300) {
        $responseData = json_decode($response, true);
        
        // Check if we could access the calendar
        if (isset($responseData['kind']) && $responseData['kind'] === 'calendar#events') {
            // Success! We have access to the calendar
            outputResult(true, 'Successfully accessed the calendar!', [
                'Calendar ID' => $calendarId,
                'HTTP Status' => $httpCode,
                'Response Sample' => [
                    'kind' => $responseData['kind'],
                    'etag' => isset($responseData['etag']) ? $responseData['etag'] : 'N/A',
                    'summary' => isset($responseData['summary']) ? $responseData['summary'] : 'N/A',
                    'event_count' => isset($responseData['items']) ? count($responseData['items']) : 0
                ]
            ]);
        } else {
            // We got a 200 response but unexpected data format
            outputResult(false, 'Unexpected response format', $responseData);
        }
    } else {
        // Error accessing the calendar
        $responseData = json_decode($response, true);
        outputResult(false, 'Failed to access calendar (HTTP ' . $httpCode . ')', $responseData);
    }
}
echo '</div>';

// Step 3: Testing Calendar Availability
echo '<div class="step"><h2>Step 3: Testing Calendar Availability</h2>';

if (!$accessToken) {
    outputResult(false, 'Cannot test calendar availability: No valid access token available');
} else {
    // Set the specific calendar ID
    $calendarId = 'info@dkdental.au';
    
    // Get free/busy information for today and tomorrow
    $today = new DateTime();
    $tomorrow = new DateTime('+1 day');
    
    // Format dates for the API
    $timeMin = $today->format('Y-m-d\TH:i:s\Z');
    $timeMax = $tomorrow->format('Y-m-d\TH:i:s\Z');
    
    // Create the request body
    $requestBody = json_encode([
        'timeMin' => $timeMin,
        'timeMax' => $timeMax,
        'items' => [
            ['id' => $calendarId]
        ]
    ]);
    
    // Initialize cURL session
    $ch = curl_init('https://www.googleapis.com/calendar/v3/freeBusy');
    
    // Set cURL options
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $requestBody);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $accessToken,
        'Content-Type: application/json',
        'Accept: application/json'
    ]);
    
    // Execute cURL request
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    
    // Close cURL session
    curl_close($ch);
    
    // Process the response
    if ($curlError) {
        outputResult(false, 'cURL Error', $curlError);
    } else if ($httpCode >= 200 && $httpCode < 300) {
        $responseData = json_decode($response, true);
        
        // Check if we could get availability information
        if (isset($responseData['calendars']) && isset($responseData['calendars'][$calendarId])) {
            // Success! We have availability information
            outputResult(true, 'Successfully retrieved calendar availability!', [
                'Calendar ID' => $calendarId,
                'Time Range' => $timeMin . ' to ' . $timeMax,
                'Busy Periods' => count($responseData['calendars'][$calendarId]['busy'])
            ]);
        } else {
            // We got a 200 response but unexpected data format
            outputResult(false, 'Unexpected availability response format', $responseData);
        }
    } else {
        // Error getting availability
        $responseData = json_decode($response, true);
        outputResult(false, 'Failed to get calendar availability (HTTP ' . $httpCode . ')', $responseData);
    }
}
echo '</div>';

// Output page footer with timestamp
echo '
    <div class="step">
        <h2>Test Results Summary</h2>
        <p>Test completed at: ' . date('Y-m-d H:i:s') . '</p>
        <p>If all tests passed, the calendar integration is working correctly!</p>
        <p>If any tests failed, please check the error messages for details on how to resolve the issues.</p>
    </div>
</body>
</html>';
?> 