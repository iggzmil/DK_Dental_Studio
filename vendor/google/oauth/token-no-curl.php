<?php
/**
 * OAuth Token Helper for DK Dental Studio
 * 
 * This file provides functions to get and refresh tokens for Google API usage
 * This version uses file_get_contents instead of cURL
 */

/**
 * Get a valid access token for Google API calls
 * 
 * @return string|null Access token or null if unable to get one
 */
function getGoogleAccessToken() {
    // Define token file location
    $secureDir = dirname(__FILE__) . '/secure';
    $tokenFile = $secureDir . '/google_refresh_token.json';
    
    // Create secure directory if it doesn't exist
    if (!file_exists($secureDir)) {
        try {
            mkdir($secureDir, 0777, true);
            // Try to set more restrictive permissions
            @chmod($secureDir, 0700);
        } catch (Exception $e) {
            error_log('Error creating secure directory: ' . $e->getMessage());
            // Use alternative location
            $secureDir = sys_get_temp_dir() . '/dk_dental_oauth';
            if (!file_exists($secureDir)) {
                @mkdir($secureDir, 0777, true);
            }
            $tokenFile = $secureDir . '/google_refresh_token.json';
        }
    }
    
    // Check if token file exists
    if (!file_exists($tokenFile)) {
        error_log('Token file not found. OAuth authorization may be needed.');
        return null;
    }
    
    // Load token data
    $tokenData = json_decode(file_get_contents($tokenFile), true);
    
    // Check if we need to refresh the token
    if (!isset($tokenData['access_token']) || 
        !isset($tokenData['expires_in']) || 
        !isset($tokenData['created']) || 
        (isset($tokenData['created']) && $tokenData['created'] + $tokenData['expires_in'] - 300 < time())) {
        
        // Token doesn't exist or is about to expire, refresh it
        if (isset($tokenData['refresh_token'])) {
            $newToken = refreshAccessToken($tokenData['refresh_token']);
            if ($newToken) {
                // Preserve the refresh token as it might not be included in response
                if (!isset($newToken['refresh_token']) && isset($tokenData['refresh_token'])) {
                    $newToken['refresh_token'] = $tokenData['refresh_token'];
                }
                
                // Add creation timestamp
                $newToken['created'] = time();
                
                // Save updated token
                file_put_contents($tokenFile, json_encode($newToken));
                
                return $newToken['access_token'];
            }
        }
        
        error_log('Failed to refresh access token');
        return null;
    }
    
    // Return existing valid access token
    return $tokenData['access_token'];
}

/**
 * Refresh an access token using the refresh token
 * 
 * @param string $refreshToken The refresh token
 * @return array|null New token data or null if refresh failed
 */
function refreshAccessToken($refreshToken) {
    // Define client credentials - use exact same values as auth.php and callback.php
    $clientId = '593699947617-hulnksmaqujj6o0j1sob13klorehtspt.apps.googleusercontent.com';
    $clientSecret = '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';
    
    // Set up token refresh request
    $tokenUrl = 'https://oauth2.googleapis.com/token';
    $postData = [
        'client_id' => $clientId,
        'client_secret' => $clientSecret,
        'refresh_token' => $refreshToken,
        'grant_type' => 'refresh_token'
    ];
    
    // Prepare request using file_get_contents
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
            return json_decode($response, true);
        } else {
            error_log('file_get_contents request failed for token refresh');
            return null;
        }
    } catch (Exception $e) {
        error_log('Error in file_get_contents request: ' . $e->getMessage());
        return null;
    }
} 