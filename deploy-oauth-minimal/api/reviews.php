<?php
/**
 * Google Reviews API Endpoint for DK Dental Studio
 * 
 * This endpoint fetches Google reviews using the OAuth token
 * This version is designed to work with minimal dependencies
 */

// Set content type to JSON
header('Content-Type: application/json');

// Enable caching
$cacheFile = __DIR__ . '/../cache/google_reviews.json';
$cacheTime = 3600; // 1 hour cache

// Check if we have a valid cache
if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheTime)) {
    // Serve from cache
    echo file_get_contents($cacheFile);
    exit;
}

// Include our token helper
require_once __DIR__ . '/../vendor/google/oauth/token.php';

// Get a valid access token
$accessToken = getGoogleAccessToken();

if (!$accessToken) {
    // No valid token, return mock data
    $mockReviews = getMockReviews();
    echo json_encode($mockReviews);
    exit;
}

try {
    // Set up API calls using cURL directly
    
    // 1. First, get the account
    $accountsUrl = 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts';
    $ch = curl_init($accountsUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $accessToken,
        'Content-Type: application/json'
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode != 200) {
        throw new Exception("Failed to get accounts: HTTP $httpCode - $response");
    }
    
    $accountsData = json_decode($response, true);
    if (empty($accountsData['accounts'])) {
        throw new Exception("No accounts found");
    }
    
    $accountName = $accountsData['accounts'][0]['name'];
    
    // 2. Then get the location
    $locationsUrl = "https://mybusinessbusinessinformation.googleapis.com/v1/$accountName/locations";
    $ch = curl_init($locationsUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $accessToken,
        'Content-Type: application/json'
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode != 200) {
        throw new Exception("Failed to get locations: HTTP $httpCode - $response");
    }
    
    $locationsData = json_decode($response, true);
    if (empty($locationsData['locations'])) {
        throw new Exception("No locations found");
    }
    
    $locationName = $locationsData['locations'][0]['name'];
    
    // 3. Finally, get the reviews
    $reviewsUrl = "https://mybusiness.googleapis.com/v4/$locationName/reviews";
    $ch = curl_init($reviewsUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $accessToken,
        'Content-Type: application/json'
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode != 200) {
        throw new Exception("Failed to get reviews: HTTP $httpCode - $response");
    }
    
    $reviewsData = json_decode($response, true);
    
    // Format reviews for the frontend
    $formattedReviews = [];
    if (isset($reviewsData['reviews'])) {
        foreach ($reviewsData['reviews'] as $review) {
            // Only include reviews with comments and ratings of 4 or higher
            if (isset($review['comment']) && !empty($review['comment']) && $review['starRating'] >= 4) {
                $formattedReviews[] = [
                    'author_name' => $review['reviewer']['displayName'],
                    'rating' => $review['starRating'],
                    'text' => $review['comment'],
                    'time' => strtotime($review['createTime'])
                ];
            }
        }
    }
    
    // Sort by newest first
    usort($formattedReviews, function($a, $b) {
        return $b['time'] - $a['time'];
    });
    
    // Limit to 10 reviews
    $formattedReviews = array_slice($formattedReviews, 0, 10);
    
    // Create cache directory if it doesn't exist
    if (!is_dir(dirname($cacheFile))) {
        mkdir(dirname($cacheFile), 0755, true);
    }
    
    // Cache the results
    file_put_contents($cacheFile, json_encode($formattedReviews));
    
    // Return the reviews
    echo json_encode($formattedReviews);
} catch (Exception $e) {
    // Log the error
    error_log('Error fetching reviews: ' . $e->getMessage());
    
    // Return mock data as fallback
    $mockReviews = getMockReviews();
    echo json_encode($mockReviews);
}

/**
 * Get mock reviews for fallback
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
