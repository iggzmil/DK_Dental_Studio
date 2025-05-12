<?php
/**
 * Google Token Manager
 * 
 * This class manages the OAuth token for the Gmail API.
 */

class GoogleTokenManager {
    private $clientId;
    private $clientSecret;
    private $tokenFile;
    
    /**
     * Constructor
     * 
     * @param string $clientId The client ID
     * @param string $clientSecret The client secret
     * @param string $tokenFile The token file path
     */
    public function __construct($clientId, $clientSecret, $tokenFile) {
        $this->clientId = $clientId;
        $this->clientSecret = $clientSecret;
        $this->tokenFile = $tokenFile;
    }
    
    /**
     * Get an authorized Google client
     * 
     * @return Google_Client|null The authorized client or null on failure
     */
    public function getAuthorizedClient() {
        try {
            // Check if the token file exists
            if (!file_exists($this->tokenFile) || !is_readable($this->tokenFile)) {
                error_log('Token file not found or not readable: ' . $this->tokenFile);
                return null;
            }
            
            // Read the token file
            $token = json_decode(file_get_contents($this->tokenFile), true);
            
            if (!isset($token['refresh_token'])) {
                error_log('Refresh token not found in token file');
                return null;
            }
            
            // Create a new client
            $client = new Google_Client();
            $client->setClientId($this->clientId);
            $client->setClientSecret($this->clientSecret);
            $client->setScopes(['https://www.googleapis.com/auth/gmail.send']);
            
            // Set the refresh token
            $client->setRefreshToken($token['refresh_token']);
            
            // Check if the access token is expired
            if (isset($token['access_token'])) {
                $client->setAccessToken($token);
                
                if ($client->isAccessTokenExpired()) {
                    // Refresh the token
                    $newToken = $client->refreshToken();
                    
                    // Save the new token
                    $this->saveToken($newToken);
                }
            } else {
                // Refresh the token
                $newToken = $client->refreshToken();
                
                // Save the new token
                $this->saveToken($newToken);
            }
            
            return $client;
        } catch (Exception $e) {
            error_log('Error getting authorized client: ' . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Save the token to the token file
     * 
     * @param array $token The token to save
     * @return bool Whether the token was saved successfully
     */
    private function saveToken($token) {
        try {
            // Check if the token file is writable
            if (file_exists($this->tokenFile) && !is_writable($this->tokenFile)) {
                error_log('Token file is not writable: ' . $this->tokenFile);
                return false;
            }
            
            // Create the directory if it doesn't exist
            $dir = dirname($this->tokenFile);
            if (!file_exists($dir)) {
                mkdir($dir, 0755, true);
            }
            
            // Save the token
            file_put_contents($this->tokenFile, json_encode($token));
            
            return true;
        } catch (Exception $e) {
            error_log('Error saving token: ' . $e->getMessage());
            return false;
        }
    }
}
