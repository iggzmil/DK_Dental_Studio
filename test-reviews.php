<?php
/**
 * Test file for Google Reviews API
 * This file helps test if the Google Reviews API endpoint is working correctly
 */

// Set content type to plain text for easy reading in browser
header('Content-Type: text/plain');

// Path to our API endpoint
$apiEndpoint = './api/reviews.php';

echo "Testing Google Reviews API Endpoint\n";
echo "==================================\n\n";

// Check if the API endpoint file exists
if (!file_exists($apiEndpoint)) {
    echo "ERROR: API endpoint file not found at: $apiEndpoint\n";
    exit;
}

echo "API endpoint file exists. Testing API call...\n\n";

// Test API call using file_get_contents
$context = stream_context_create([
    'http' => [
        'ignore_errors' => true
    ]
]);

$response = file_get_contents($apiEndpoint, false, $context);

// Get response headers to check HTTP status
$responseHeaders = $http_response_header ?? [];
$httpStatus = null;

foreach ($responseHeaders as $header) {
    if (strpos($header, 'HTTP/') === 0) {
        $parts = explode(' ', $header);
        $httpStatus = $parts[1] ?? null;
        break;
    }
}

echo "HTTP Status: " . ($httpStatus ?: 'Unknown') . "\n\n";

// Parse and display response
if ($response !== false) {
    $data = json_decode($response, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo "ERROR: Failed to parse JSON response\n";
        echo "Raw Response:\n$response\n";
    } else {
        echo "API Response:\n";
        echo "- Error: " . ($data['error'] ? 'Yes' : 'No') . "\n";
        echo "- Message: " . ($data['message'] ?? 'None') . "\n";
        
        if (isset($data['reviews']) && is_array($data['reviews'])) {
            echo "- Reviews Count: " . count($data['reviews']) . "\n\n";
            
            echo "First 2 Reviews (if available):\n";
            $count = 0;
            foreach ($data['reviews'] as $review) {
                echo "Review #" . ($count + 1) . ":\n";
                echo "  Author: " . ($review['author_name'] ?? 'Unknown') . "\n";
                echo "  Rating: " . ($review['rating'] ?? 'Unknown') . "\n";
                echo "  Date: " . date('Y-m-d', $review['time'] ?? time()) . "\n";
                echo "  Text: " . substr($review['text'] ?? '', 0, 100) . (strlen($review['text'] ?? '') > 100 ? '...' : '') . "\n\n";
                
                $count++;
                if ($count >= 2) break;
            }
        } else {
            echo "- Reviews: None or invalid format\n";
        }
    }
} else {
    echo "ERROR: Failed to get response from API endpoint\n";
}

echo "\nChecking OAuth token file...\n";
$tokenFile = __DIR__ . '/secure/google_refresh_token.json';

if (file_exists($tokenFile)) {
    echo "Token file exists at: $tokenFile\n";
    
    $token = json_decode(file_get_contents($tokenFile), true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo "ERROR: Failed to parse token JSON\n";
    } else {
        echo "Token contains:\n";
        echo "- Access Token: " . (isset($token['access_token']) ? 'Yes (first 10 chars: ' . substr($token['access_token'], 0, 10) . '...)' : 'No') . "\n";
        echo "- Refresh Token: " . (isset($token['refresh_token']) ? 'Yes (first 10 chars: ' . substr($token['refresh_token'], 0, 10) . '...)' : 'No') . "\n";
        echo "- Expires In: " . ($token['expires_in'] ?? 'Unknown') . " seconds\n";
        
        if (isset($token['created']) && isset($token['expires_in'])) {
            $expiryTime = $token['created'] + $token['expires_in'];
            $currentTime = time();
            $timeLeft = $expiryTime - $currentTime;
            
            echo "- Created: " . date('Y-m-d H:i:s', $token['created']) . "\n";
            echo "- Expires: " . date('Y-m-d H:i:s', $expiryTime) . "\n";
            echo "- Time Left: " . ($timeLeft > 0 ? $timeLeft . ' seconds' : 'Expired') . "\n";
        }
    }
} else {
    echo "ERROR: Token file not found at: $tokenFile\n";
}

echo "\nTest completed at: " . date('Y-m-d H:i:s') . "\n"; 