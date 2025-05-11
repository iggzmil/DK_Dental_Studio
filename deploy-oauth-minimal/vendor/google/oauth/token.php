<?php
/**
 * OAuth Token Helper for DK Dental Studio
 * 
 * This file provides functions to get and refresh tokens for Google API usage
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
    // Define client credentials
    $clientId = '976666616562-c4s3nfesuu7drrt6nmghnb6qc6cteers.apps.googleusercontent.com';
    $clientSecret = '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';
    
    // Set up token refresh request
    $tokenUrl = 'https://oauth2.googleapis.com/token';
    $postData = [
        'client_id' => $clientId,
        'client_secret' => $clientSecret,
        'refresh_token' => $refreshToken,
        'grant_type' => 'refresh_token'
    ];
    
    // Initialize cURL session
    $ch = curl_init($tokenUrl);
    
    // Set cURL options
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
    
    // Execute cURL request
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    
    // Close cURL session
    curl_close($ch);
    
    // Process the response
    if ($httpCode == 200) {
        return json_decode($response, true);
    } else {
        error_log("Token refresh error (HTTP $httpCode): $response");
        if ($curlError) {
            error_log("cURL error: $curlError");
        }
        return null;
    }
}
?> 