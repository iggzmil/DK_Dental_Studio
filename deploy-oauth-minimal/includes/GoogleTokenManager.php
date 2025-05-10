<?php
/**
 * GoogleTokenManager Class
 * 
 * Manages OAuth tokens for Google API access
 * This version is designed to work with the minimal Google API Client package
 */

class GoogleTokenManager {
    private $clientId;
    private $clientSecret;
    private $tokenFile;

    public function __construct($clientId, $clientSecret, $tokenFile) {
        $this->clientId = $clientId;
        $this->clientSecret = $clientSecret;
        $this->tokenFile = $tokenFile;
    }

    /**
     * Get an authorized Google client
     */
    public function getAuthorizedClient() {
        $client = new Google\Client();
        $client->setClientId($this->clientId);
        $client->setClientSecret($this->clientSecret);

        // Load the saved token
        if (file_exists($this->tokenFile)) {
            $token = json_decode(file_get_contents($this->tokenFile), true);
            $client->setAccessToken($token);

            // Refresh the token if it's expired
            if ($client->isAccessTokenExpired()) {
                if (isset($token['refresh_token'])) {
                    try {
                        $newToken = $client->fetchAccessTokenWithRefreshToken($token['refresh_token']);

                        // Save the new access token, preserving the refresh token
                        if (!isset($newToken['refresh_token']) && isset($token['refresh_token'])) {
                            $newToken['refresh_token'] = $token['refresh_token'];
                        }

                        file_put_contents($this->tokenFile, json_encode($newToken));
                    } catch (Exception $e) {
                        // Log the error
                        error_log('Error refreshing token: ' . $e->getMessage());
                        return null;
                    }
                } else {
                    // No refresh token available
                    error_log('No refresh token available');
                    return null;
                }
            }
        } else {
            // No token file exists
            error_log('No token file exists at: ' . $this->tokenFile);
            return null;
        }

        return $client;
    }

    /**
     * Check if we have valid authorization
     */
    public function hasValidAuthorization() {
        if (!file_exists($this->tokenFile)) {
            return false;
        }

        $client = $this->getAuthorizedClient();
        return ($client !== null && !$client->isAccessTokenExpired());
    }
}
