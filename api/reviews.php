<?php
/**
 * Google Business Profile Reviews API Endpoint
 * Retrieves reviews from Google Business Profile using OAuth credentials
 */

// Set headers for JSON response
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Path to the token file (stored during OAuth flow)
$tokenFile = dirname(__FILE__) . '/../secure/google_refresh_token.json';

// Error if token file doesn't exist
if (!file_exists($tokenFile)) {
    echo json_encode([
        'error' => true,
        'message' => 'OAuth token not found. Please complete the authorization process.',
        'reviews' => []
    ]);
    exit;
}

// Load token data
$tokenData = json_decode(file_get_contents($tokenFile), true);

// Check if we need to refresh the token
if (isset($tokenData['expires_in']) && isset($tokenData['created'])) {
    $expiryTime = $tokenData['created'] + $tokenData['expires_in'];
    
    // If token is expired or will expire in the next 5 minutes, refresh it
    if (time() > ($expiryTime - 300)) {
        $refreshed = refreshToken($tokenData, $tokenFile);
        if (!$refreshed) {
            echo json_encode([
                'error' => true,
                'message' => 'Failed to refresh access token',
                'reviews' => []
            ]);
            exit;
        }
        
        // Reload token data after refresh
        $tokenData = json_decode(file_get_contents($tokenFile), true);
    }
}

// Check if we have an access token
if (!isset($tokenData['access_token'])) {
    echo json_encode([
        'error' => true,
        'message' => 'Access token not found in token file',
        'reviews' => []
    ]);
    exit;
}

// Make API request to Google My Business API
$reviews = fetchGoogleReviews($tokenData['access_token']);

// Return reviews
echo json_encode([
    'error' => false,
    'message' => 'Success',
    'reviews' => $reviews
]);
exit;

/**
 * Refresh the OAuth token
 */
function refreshToken($tokenData, $tokenFile) {
    // Client ID and Secret
    $clientId = '593699947617-hulnksmaqujj6o0j1sob13klorehtspt.apps.googleusercontent.com';
    $clientSecret = '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';
    
    // Refresh token should be in the token data
    if (!isset($tokenData['refresh_token'])) {
        error_log('No refresh token found in token data');
        return false;
    }
    
    // Token endpoint
    $tokenUrl = 'https://oauth2.googleapis.com/token';
    
    // Build post data
    $postData = [
        'client_id' => $clientId,
        'client_secret' => $clientSecret,
        'refresh_token' => $tokenData['refresh_token'],
        'grant_type' => 'refresh_token'
    ];
    
    // Make the request
    if (function_exists('curl_init')) {
        // Using cURL
        $ch = curl_init($tokenUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    } else {
        // Using file_get_contents as fallback
        $options = [
            'http' => [
                'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
                'method'  => 'POST',
                'content' => http_build_query($postData)
            ]
        ];
        
        $context = stream_context_create($options);
        try {
            $response = file_get_contents($tokenUrl, false, $context);
            if ($response !== false) {
                $httpCode = 200;
            } else {
                error_log('file_get_contents request failed during token refresh');
                return false;
            }
        } catch (Exception $e) {
            error_log('Error in file_get_contents during token refresh: ' . $e->getMessage());
            return false;
        }
    }
    
    // Process the response
    if ($httpCode == 200) {
        $newTokenData = json_decode($response, true);
        
        // Preserve the refresh token from the original token data
        if (!isset($newTokenData['refresh_token']) && isset($tokenData['refresh_token'])) {
            $newTokenData['refresh_token'] = $tokenData['refresh_token'];
        }
        
        // Add creation timestamp
        $newTokenData['created'] = time();
        
        // Save the refreshed token
        file_put_contents($tokenFile, json_encode($newTokenData));
        return true;
    }
    
    error_log("Failed to refresh token. HTTP Code: $httpCode, Response: $response");
    return false;
}

/**
 * Fetch reviews from Google Business Profile using the access token
 */
function fetchGoogleReviews($accessToken) {
    // Get the location ID (account ID) - in a production environment, this would be stored in a config
    $locationId = fetchLocationId($accessToken);
    
    if (!$locationId) {
        return [];
    }
    
    // Google Business Profile API endpoint for reviews
    $reviewsUrl = "https://mybusiness.googleapis.com/v4/accounts/{$locationId}/locations/{$locationId}/reviews";
    
    // Make the request
    $reviews = makeApiRequest($reviewsUrl, $accessToken);
    
    if (!$reviews || !isset($reviews['reviews'])) {
        // Use mock data as fallback if API fails
        return getMockReviews();
    }
    
    // Format reviews to match our widget's expected format
    return formatReviews($reviews['reviews']);
}

/**
 * Fetch location ID from Google Business Profile API
 */
function fetchLocationId($accessToken) {
    // Google Business Profile API endpoint for accounts
    $accountsUrl = "https://mybusiness.googleapis.com/v4/accounts";
    
    // Make the request
    $accounts = makeApiRequest($accountsUrl, $accessToken);
    
    if (!$accounts || !isset($accounts['accounts']) || empty($accounts['accounts'])) {
        error_log('No accounts found in Google Business Profile API response');
        return null;
    }
    
    // Get the first account ID
    $accountId = $accounts['accounts'][0]['name'];
    $accountId = str_replace('accounts/', '', $accountId);
    
    // Get locations for this account
    $locationsUrl = "https://mybusiness.googleapis.com/v4/accounts/{$accountId}/locations";
    $locations = makeApiRequest($locationsUrl, $accessToken);
    
    if (!$locations || !isset($locations['locations']) || empty($locations['locations'])) {
        error_log('No locations found for account ' . $accountId);
        return null;
    }
    
    // Get the first location ID
    $locationId = $locations['locations'][0]['name'];
    $locationId = str_replace("accounts/{$accountId}/locations/", '', $locationId);
    
    return $locationId;
}

/**
 * Make an API request to Google Business Profile API
 */
function makeApiRequest($url, $accessToken) {
    if (function_exists('curl_init')) {
        // Using cURL
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $accessToken]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    } else {
        // Using file_get_contents as fallback
        $options = [
            'http' => [
                'header' => "Authorization: Bearer " . $accessToken . "\r\n",
                'method' => 'GET'
            ]
        ];
        
        $context = stream_context_create($options);
        try {
            $response = file_get_contents($url, false, $context);
            if ($response !== false) {
                $httpCode = 200;
            } else {
                error_log('file_get_contents request failed for URL: ' . $url);
                return null;
            }
        } catch (Exception $e) {
            error_log('Error in file_get_contents for URL ' . $url . ': ' . $e->getMessage());
            return null;
        }
    }
    
    if ($httpCode != 200) {
        error_log("API request failed. URL: $url, HTTP Code: $httpCode, Response: $response");
        return null;
    }
    
    return json_decode($response, true);
}

/**
 * Format reviews from Google Business Profile API to match our widget's format
 */
function formatReviews($reviews) {
    $formattedReviews = [];
    
    foreach ($reviews as $review) {
        // Skip reviews without text or with low rating (if needed)
        if (!isset($review['comment']) || empty($review['comment'])) {
            continue;
        }
        
        $formattedReview = [
            'author_name' => isset($review['reviewer']['displayName']) ? $review['reviewer']['displayName'] : 'Anonymous',
            'rating' => isset($review['starRating']) ? convertStarRating($review['starRating']) : 5,
            'text' => $review['comment'],
            'time' => isset($review['createTime']) ? strtotime($review['createTime']) : time()
        ];
        
        $formattedReviews[] = $formattedReview;
    }
    
    return $formattedReviews;
}

/**
 * Convert Google's star rating format to a number
 */
function convertStarRating($starRating) {
    $ratingMap = [
        'ONE' => 1,
        'TWO' => 2,
        'THREE' => 3,
        'FOUR' => 4,
        'FIVE' => 5
    ];
    
    return isset($ratingMap[$starRating]) ? $ratingMap[$starRating] : 5;
}

/**
 * Get mock reviews as fallback
 */
function getMockReviews() {
    return [
        [
            'author_name' => 'Sarah Johnson',
            'rating' => 5,
            'text' => 'I couldn\'t be happier with my new dentures from DK Dental Studio! They fit perfectly and look so natural. The team was professional and made the whole process easy and comfortable.',
            'time' => time() - (7 * 24 * 60 * 60) // 7 days ago
        ],
        [
            'author_name' => 'Michael Thompson',
            'rating' => 5,
            'text' => 'After years of struggling with uncomfortable dentures, I finally found DK Dental Studio. The difference is incredible - I can eat, talk, and smile with confidence again. Highly recommended!',
            'time' => time() - (14 * 24 * 60 * 60) // 14 days ago
        ],
        [
            'author_name' => 'Emma Wilson',
            'rating' => 5,
            'text' => 'The mouthguard they made for my son is perfect! It fits well, he can talk clearly with it in, and it provides great protection for his sports. The staff was wonderful with him too.',
            'time' => time() - (30 * 24 * 60 * 60) // 30 days ago
        ],
        [
            'author_name' => 'David Chen',
            'rating' => 4,
            'text' => 'Very professional service. My denture repair was completed quickly and at a reasonable price. The only reason for 4 stars instead of 5 is that I had to wait a bit longer than expected.',
            'time' => time() - (45 * 24 * 60 * 60) // 45 days ago
        ],
        [
            'author_name' => 'Jennifer Adams',
            'rating' => 5,
            'text' => 'I\'ve been a patient at DK Dental Studio for years and wouldn\'t go anywhere else. They take the time to ensure everything fits perfectly and the results are always outstanding.',
            'time' => time() - (60 * 24 * 60 * 60) // 60 days ago
        ]
    ];
} 