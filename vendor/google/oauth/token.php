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
    // Define token file location - make sure this points to the correct path
    $secureDir = dirname(__FILE__) . '/secure';
    $tokenFile = $secureDir . '/google_refresh_token.json';
    
    // Log the path for debugging
    error_log('Token file path in getGoogleAccessToken: ' . $tokenFile);
    
    // Check if token file exists
    if (!file_exists($tokenFile)) {
        error_log('Token file not found at: ' . $tokenFile);
        error_log('Current directory: ' . dirname(__FILE__));
        
        // Try an alternative location as a fallback
        $altTokenFile = $_SERVER['DOCUMENT_ROOT'] . '/vendor/google/oauth/secure/google_refresh_token.json';
        error_log('Trying alternative token path: ' . $altTokenFile);
        
        if (file_exists($altTokenFile)) {
            error_log('Found token at alternative path');
            $tokenFile = $altTokenFile;
        } else {
            error_log('Token not found at alternative path either');
            return null;
        }
    } else {
        error_log('Token file found at: ' . $tokenFile);
    }
    
    // Load token data
    $tokenData = json_decode(file_get_contents($tokenFile), true);
    
    // Check if we have valid token data
    if (!is_array($tokenData)) {
        error_log('Token file exists but contains invalid data');
        return null;
    }
    
    // Log token data for debugging (remove sensitive info in production)
    error_log('Token data: ' . json_encode([
        'has_access_token' => isset($tokenData['access_token']),
        'has_refresh_token' => isset($tokenData['refresh_token']),
        'has_expires_in' => isset($tokenData['expires_in']),
        'has_created' => isset($tokenData['created']),
    ]));
    
    // Check if we need to refresh the token
    if (!isset($tokenData['access_token']) || 
        !isset($tokenData['expires_in']) || 
        !isset($tokenData['created']) || 
        (isset($tokenData['created']) && $tokenData['created'] + $tokenData['expires_in'] - 300 < time())) {
        
        error_log('Token needs refresh');
        
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
                error_log('Token refreshed and saved successfully');
                
                return $newToken['access_token'];
            } else {
                error_log('Failed to refresh token');
            }
        } else {
            error_log('No refresh token available');
        }
        
        error_log('Failed to refresh access token');
        return null;
    }
    
    // Return existing valid access token
    error_log('Returning existing valid access token');
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
    
    $response = null;
    $httpCode = 0;
    $curlError = '';
    
    // Try using cURL if available
    if (function_exists('curl_init')) {
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
    } 
    // Fall back to file_get_contents if cURL is not available
    else {
        error_log('cURL not available for token refresh, using file_get_contents instead');
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
                error_log('file_get_contents request failed for token refresh');
                $httpCode = 400;
            }
        } catch (Exception $e) {
            error_log('Error in file_get_contents request: ' . $e->getMessage());
            $httpCode = 500;
        }
    }
    
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