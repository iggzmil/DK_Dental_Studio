<?php
/**
 * Minimal Google Client for Gmail API
 * 
 * This is a simplified version of the Google_Client class from the
 * Google API Client Library. It only includes the functionality
 * needed for sending emails via the Gmail API.
 */

class Google_Client {
    private $accessToken;
    private $refreshToken;
    private $clientId;
    private $clientSecret;
    private $scopes = [];
    
    /**
     * Set the client ID
     * 
     * @param string $clientId The client ID
     * @return Google_Client
     */
    public function setClientId($clientId) {
        $this->clientId = $clientId;
        return $this;
    }
    
    /**
     * Set the client secret
     * 
     * @param string $clientSecret The client secret
     * @return Google_Client
     */
    public function setClientSecret($clientSecret) {
        $this->clientSecret = $clientSecret;
        return $this;
    }
    
    /**
     * Set the scopes
     * 
     * @param array|string $scopes The scopes
     * @return Google_Client
     */
    public function setScopes($scopes) {
        $this->scopes = is_array($scopes) ? $scopes : [$scopes];
        return $this;
    }
    
    /**
     * Set the access token
     * 
     * @param string|array $token The access token
     * @return Google_Client
     */
    public function setAccessToken($token) {
        if (is_string($token)) {
            $token = json_decode($token, true);
        }
        $this->accessToken = $token;
        return $this;
    }
    
    /**
     * Get the access token
     * 
     * @return array The access token
     */
    public function getAccessToken() {
        return $this->accessToken;
    }
    
    /**
     * Set the refresh token
     * 
     * @param string $refreshToken The refresh token
     * @return Google_Client
     */
    public function setRefreshToken($refreshToken) {
        $this->refreshToken = $refreshToken;
        return $this;
    }
    
    /**
     * Refresh the access token
     * 
     * @return array The new access token
     */
    public function refreshToken($refreshToken = null) {
        if ($refreshToken) {
            $this->refreshToken = $refreshToken;
        }
        
        if (!$this->refreshToken) {
            throw new Exception('Refresh token is required');
        }
        
        // Prepare the request
        $url = 'https://oauth2.googleapis.com/token';
        $data = [
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'refresh_token' => $this->refreshToken,
            'grant_type' => 'refresh_token'
        ];
        
        // Send the request
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
        
        $response = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($status != 200) {
            throw new Exception('Failed to refresh token: ' . $response);
        }
        
        // Parse the response
        $token = json_decode($response, true);
        $token['refresh_token'] = $this->refreshToken;
        
        // Update the access token
        $this->accessToken = $token;
        
        return $token;
    }
    
    /**
     * Check if the access token is expired
     * 
     * @return bool Whether the access token is expired
     */
    public function isAccessTokenExpired() {
        if (!$this->accessToken) {
            return true;
        }
        
        if (!isset($this->accessToken['expires_in']) && !isset($this->accessToken['created'])) {
            return true;
        }
        
        // Check if the token is expired
        $created = isset($this->accessToken['created']) ? $this->accessToken['created'] : time();
        $expires_in = isset($this->accessToken['expires_in']) ? $this->accessToken['expires_in'] : 3600;
        
        return ($created + $expires_in - 30) < time();
    }
}
