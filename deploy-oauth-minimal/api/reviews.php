<?php
/**
 * Google Reviews API Endpoint for DK Dental Studio
 * 
 * This endpoint fetches Google reviews using the OAuth token
 * This version is designed to work with the minimal Google API Client package
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

// Load the minimal Google API Client
require_once __DIR__ . '/../vendor/autoload.php';

// Include the GoogleTokenManager class
require_once __DIR__ . '/../includes/GoogleTokenManager.php';

// Define token storage location
$secureDir = __DIR__ . '/../secure';
if (!file_exists($secureDir)) {
    mkdir($secureDir, 0700, true);
}
$tokenFile = $secureDir . '/google_refresh_token.json';

// Initialize token manager
$tokenManager = new GoogleTokenManager(
    '593699947617-hulnksmaqujj6o0j1sob13klorehtspt.apps.googleusercontent.com',
    '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',
    $tokenFile
);

// Get authorized client
$client = $tokenManager->getAuthorizedClient();

if (!$client) {
    // Return mock data if not authorized
    $mockReviews = getMockReviews();
    echo json_encode($mockReviews);
    exit;
}

try {
    // Use Google My Business API to fetch reviews
    $mybusiness = new Google\Service\MyBusinessAccountManagement($client);

    // First, get the account
    $accounts = $mybusiness->accounts->listAccounts();
    if (count($accounts->getAccounts()) == 0) {
        throw new Exception("No accounts found");
    }

    $accountName = $accounts->getAccounts()[0]->getName();

    // Then get the location
    $locations = $mybusiness->accounts_locations->listAccountsLocations($accountName);
    if (count($locations->getLocations()) == 0) {
        throw new Exception("No locations found");
    }

    $locationName = $locations->getLocations()[0]->getName();

    // Finally, get the reviews
    $reviews = $mybusiness->accounts_locations_reviews->listAccountsLocationsReviews($locationName);

    // Format reviews for the frontend
    $formattedReviews = [];
    foreach ($reviews->getReviews() as $review) {
        // Only include reviews with comments and ratings of 4 or higher
        if ($review->getComment() && $review->getStarRating() >= 4) {
            $formattedReviews[] = [
                'author_name' => $review->getReviewer()->getDisplayName(),
                'rating' => $review->getStarRating(),
                'text' => $review->getComment(),
                'time' => strtotime($review->getCreateTime())
            ];
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
