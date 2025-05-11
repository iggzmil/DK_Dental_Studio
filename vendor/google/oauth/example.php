<?php
/**
 * Example usage of the OAuth token helper
 * 
 * This shows how to use the token helper to make API calls to Google
 */

// Include the token helper
require_once 'token.php';

// Start session for authentication
session_start();

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Simple auth check (remove this for production API usage endpoints)
if (!isset($_SESSION['authenticated'])) {
    echo "Not authenticated";
    exit;
}

// Get a valid access token
$accessToken = getGoogleAccessToken();

if (!$accessToken) {
    echo "No valid access token available. Please complete the OAuth authorization first.";
    exit;
}

// Example API call to get account information
$apiUrl = 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts';

// Initialize cURL session
$ch = curl_init($apiUrl);

// Set cURL options
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
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

// Display the results
echo "<h1>API Call Results</h1>";

if ($httpCode == 200) {
    echo "<h2>Success (HTTP 200)</h2>";
    echo "<pre>";
    $responseData = json_decode($response, true);
    print_r($responseData);
    echo "</pre>";
} else {
    echo "<h2>Error (HTTP $httpCode)</h2>";
    echo "<p>Response: " . htmlspecialchars($response) . "</p>";
    
    if ($curlError) {
        echo "<p>cURL Error: " . htmlspecialchars($curlError) . "</p>";
    }
}

// Log the results
error_log("API call HTTP code: $httpCode");
if ($httpCode != 200) {
    error_log("API call error: $response");
    if ($curlError) {
        error_log("cURL error: $curlError");
    }
}
?> 