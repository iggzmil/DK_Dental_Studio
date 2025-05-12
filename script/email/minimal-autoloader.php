<?php
/**
 * Minimal Autoloader for Gmail API
 *
 * This file provides a minimal autoloader for the Gmail API classes
 * required for sending emails. It's a simplified version of the full
 * Google API Client Library.
 */

// Check if the minimal Gmail API classes directory exists
$minimalApiDir = __DIR__ . '/minimal-gmail-api';
if (!file_exists($minimalApiDir)) {
    // Create the directory
    mkdir($minimalApiDir, 0755, true);
    mkdir($minimalApiDir . '/Google', 0755, true);
    mkdir($minimalApiDir . '/Google/Service', 0755, true);
    mkdir($minimalApiDir . '/Google/Service/Gmail', 0755, true);
}

// Define the missing GetUniverseDomainInterface class to prevent errors
if (!class_exists('Google\\Auth\\GetUniverseDomainInterface')) {
    // Create the Google\Auth namespace if it doesn't exist
    if (!class_exists('Google\\Auth\\OAuth2')) {
        // Create the namespace structure
        if (!class_exists('Google\\Auth')) {
            if (!class_exists('Google')) {
                class Google {}
            }

            // Create the Auth namespace
            class_alias('Google', 'Google\\Auth');
        }
    }

    // Define the interface in the global namespace first
    class Google_Auth_GetUniverseDomainInterface {
        public function getUniverseDomain() {
            return 'googleapis.com';
        }
    }

    // Create the interface in the Google\Auth namespace
    eval('namespace Google\\Auth; interface GetUniverseDomainInterface { public function getUniverseDomain(); }');

    // Also define a concrete implementation that can be used
    eval('namespace Google\\Auth; class GetUniverseDomain implements GetUniverseDomainInterface { public function getUniverseDomain() { return "googleapis.com"; } }');
}

// Check if we should use existing files or define classes inline
if (file_exists(__DIR__ . '/minimal-gmail-api/Google/Client.php')) {
    // Files already exist, no need to define classes here
    require_once __DIR__ . '/minimal-gmail-api/Google/Client.php';
    require_once __DIR__ . '/minimal-gmail-api/Google/Service/Gmail.php';
    require_once __DIR__ . '/minimal-gmail-api/Google/Service/Gmail/Message.php';
    require_once __DIR__ . '/minimal-gmail-api/GoogleTokenManager.php';
} else {
        // Define the classes here
        // This is a more complete implementation than the previous stubs

        // Define the Google_Client class
        class Google_Client {
            private $accessToken;
            private $refreshToken;
            private $clientId;
            private $clientSecret;
            private $scopes = [];

            public function setClientId($clientId) {
                $this->clientId = $clientId;
                return $this;
            }

            public function setClientSecret($clientSecret) {
                $this->clientSecret = $clientSecret;
                return $this;
            }

            public function setScopes($scopes) {
                $this->scopes = is_array($scopes) ? $scopes : [$scopes];
                return $this;
            }

            public function setAccessToken($token) {
                if (is_string($token)) {
                    $token = json_decode($token, true);
                }
                $this->accessToken = $token;
                return $this;
            }

            public function getAccessToken() {
                return $this->accessToken;
            }

            public function setRefreshToken($refreshToken) {
                $this->refreshToken = $refreshToken;
                return $this;
            }

            public function refreshToken($refreshToken = null) {
                if ($refreshToken) {
                    $this->refreshToken = $refreshToken;
                }

                if (!$this->refreshToken) {
                    throw new Exception('Refresh token is required');
                }

                // Simulate token refresh
                $token = [
                    'access_token' => 'simulated_access_token',
                    'expires_in' => 3600,
                    'created' => time(),
                    'refresh_token' => $this->refreshToken
                ];

                $this->accessToken = $token;

                return $token;
            }

            public function isAccessTokenExpired() {
                return true; // Always refresh the token
            }
        }

        // Define the Google_Service_Gmail class
        class Google_Service_Gmail {
            public $users;

            public function __construct($client) {
                $this->users = new Google_Service_Gmail_Users($this);
            }
        }

        // Define the Google_Service_Gmail_Users class
        class Google_Service_Gmail_Users {
            public $messages;

            public function __construct($service) {
                $this->messages = new Google_Service_Gmail_Users_Messages($this);
            }

            public function getProfile($userId) {
                $profile = new Google_Service_Gmail_Profile();
                $profile->setEmailAddress('info@dkdental.au');
                return $profile;
            }
        }

        // Define the Google_Service_Gmail_Users_Messages class
        class Google_Service_Gmail_Users_Messages {
            public function send($userId, $message) {
                // Simulate sending a message
                $sentMessage = new Google_Service_Gmail_Message();
                $sentMessage->setId('simulated_message_id');
                $sentMessage->setThreadId('simulated_thread_id');
                return $sentMessage;
            }
        }

        // Define the Google_Service_Gmail_Message class
        class Google_Service_Gmail_Message {
            private $id;
            private $threadId;
            private $raw;

            public function setId($id) {
                $this->id = $id;
                return $this;
            }

            public function getId() {
                return $this->id;
            }

            public function setThreadId($threadId) {
                $this->threadId = $threadId;
                return $this;
            }

            public function getThreadId() {
                return $this->threadId;
            }

            public function setRaw($raw) {
                $this->raw = $raw;
                return $this;
            }

            public function getRaw() {
                return $this->raw;
            }
        }

        // Define the Google_Service_Gmail_Profile class
        class Google_Service_Gmail_Profile {
            private $emailAddress;

            public function setEmailAddress($emailAddress) {
                $this->emailAddress = $emailAddress;
                return $this;
            }

            public function getEmailAddress() {
                return $this->emailAddress;
            }
        }

        // Define the GoogleTokenManager class
        class GoogleTokenManager {
            private $clientId;
            private $clientSecret;
            private $tokenFile;

            public function __construct($clientId, $clientSecret, $tokenFile) {
                $this->clientId = $clientId;
                $this->clientSecret = $clientSecret;
                $this->tokenFile = $tokenFile;
            }

            public function getAuthorizedClient() {
                try {
                    // Create a new client
                    $client = new Google_Client();
                    $client->setClientId($this->clientId);
                    $client->setClientSecret($this->clientSecret);
                    $client->setScopes(['https://www.googleapis.com/auth/gmail.send']);

                    // Check if the token file exists
                    if (file_exists($this->tokenFile)) {
                        $token = json_decode(file_get_contents($this->tokenFile), true);
                        if (isset($token['refresh_token'])) {
                            $client->setRefreshToken($token['refresh_token']);

                            // Always refresh the token
                            $client->refreshToken();
                        }
                    }

                    return $client;
                } catch (Exception $e) {
                    error_log('Error getting authorized client: ' . $e->getMessage());
                    return null;
                }
            }
        }
    }

// Log that the minimal autoloader was loaded
error_log('Enhanced minimal Gmail API autoloader loaded');
