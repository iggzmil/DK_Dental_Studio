<?php
/**
 * Minimal Gmail Service for Gmail API
 * 
 * This is a simplified version of the Google_Service_Gmail class from the
 * Google API Client Library. It only includes the functionality
 * needed for sending emails.
 */

class Google_Service_Gmail {
    private $client;
    public $users;
    
    /**
     * Constructor
     * 
     * @param Google_Client $client The Google client
     */
    public function __construct(Google_Client $client) {
        $this->client = $client;
        $this->users = new Google_Service_Gmail_Users($this);
    }
    
    /**
     * Get the client
     * 
     * @return Google_Client The client
     */
    public function getClient() {
        return $this->client;
    }
}

/**
 * Users resource class
 */
class Google_Service_Gmail_Users {
    private $service;
    public $messages;
    
    /**
     * Constructor
     * 
     * @param Google_Service_Gmail $service The Gmail service
     */
    public function __construct(Google_Service_Gmail $service) {
        $this->service = $service;
        $this->messages = new Google_Service_Gmail_Users_Messages($this);
    }
    
    /**
     * Get the service
     * 
     * @return Google_Service_Gmail The service
     */
    public function getService() {
        return $this->service;
    }
    
    /**
     * Get the user's profile
     * 
     * @param string $userId The user ID
     * @return Google_Service_Gmail_Profile The profile
     */
    public function getProfile($userId) {
        $client = $this->service->getClient();
        
        // Check if the token is expired
        if ($client->isAccessTokenExpired()) {
            $client->refreshToken();
        }
        
        // Get the access token
        $token = $client->getAccessToken();
        $accessToken = isset($token['access_token']) ? $token['access_token'] : null;
        
        if (!$accessToken) {
            throw new Exception('Access token is required');
        }
        
        // Prepare the request
        $url = 'https://gmail.googleapis.com/gmail/v1/users/' . urlencode($userId) . '/profile';
        
        // Send the request
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $accessToken]);
        
        $response = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($status != 200) {
            throw new Exception('Failed to get profile: ' . $response);
        }
        
        // Parse the response
        $data = json_decode($response, true);
        
        // Create a profile object
        $profile = new Google_Service_Gmail_Profile();
        $profile->setEmailAddress(isset($data['emailAddress']) ? $data['emailAddress'] : null);
        $profile->setMessagesTotal(isset($data['messagesTotal']) ? $data['messagesTotal'] : null);
        $profile->setThreadsTotal(isset($data['threadsTotal']) ? $data['threadsTotal'] : null);
        $profile->setHistoryId(isset($data['historyId']) ? $data['historyId'] : null);
        
        return $profile;
    }
}

/**
 * Messages resource class
 */
class Google_Service_Gmail_Users_Messages {
    private $users;
    
    /**
     * Constructor
     * 
     * @param Google_Service_Gmail_Users $users The users resource
     */
    public function __construct(Google_Service_Gmail_Users $users) {
        $this->users = $users;
    }
    
    /**
     * Send a message
     * 
     * @param string $userId The user ID
     * @param Google_Service_Gmail_Message $message The message
     * @return Google_Service_Gmail_Message The sent message
     */
    public function send($userId, Google_Service_Gmail_Message $message) {
        $client = $this->users->getService()->getClient();
        
        // Check if the token is expired
        if ($client->isAccessTokenExpired()) {
            $client->refreshToken();
        }
        
        // Get the access token
        $token = $client->getAccessToken();
        $accessToken = isset($token['access_token']) ? $token['access_token'] : null;
        
        if (!$accessToken) {
            throw new Exception('Access token is required');
        }
        
        // Prepare the request
        $url = 'https://gmail.googleapis.com/gmail/v1/users/' . urlencode($userId) . '/messages/send';
        $data = ['raw' => $message->getRaw()];
        
        // Send the request
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $accessToken,
            'Content-Type: application/json'
        ]);
        
        $response = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($status != 200) {
            throw new Exception('Failed to send message: ' . $response);
        }
        
        // Parse the response
        $data = json_decode($response, true);
        
        // Create a message object
        $sentMessage = new Google_Service_Gmail_Message();
        $sentMessage->setId(isset($data['id']) ? $data['id'] : null);
        $sentMessage->setThreadId(isset($data['threadId']) ? $data['threadId'] : null);
        $sentMessage->setLabelIds(isset($data['labelIds']) ? $data['labelIds'] : null);
        
        return $sentMessage;
    }
}

/**
 * Profile class
 */
class Google_Service_Gmail_Profile {
    private $emailAddress;
    private $messagesTotal;
    private $threadsTotal;
    private $historyId;
    
    /**
     * Set the email address
     * 
     * @param string $emailAddress The email address
     * @return Google_Service_Gmail_Profile
     */
    public function setEmailAddress($emailAddress) {
        $this->emailAddress = $emailAddress;
        return $this;
    }
    
    /**
     * Get the email address
     * 
     * @return string The email address
     */
    public function getEmailAddress() {
        return $this->emailAddress;
    }
    
    /**
     * Set the messages total
     * 
     * @param int $messagesTotal The messages total
     * @return Google_Service_Gmail_Profile
     */
    public function setMessagesTotal($messagesTotal) {
        $this->messagesTotal = $messagesTotal;
        return $this;
    }
    
    /**
     * Set the threads total
     * 
     * @param int $threadsTotal The threads total
     * @return Google_Service_Gmail_Profile
     */
    public function setThreadsTotal($threadsTotal) {
        $this->threadsTotal = $threadsTotal;
        return $this;
    }
    
    /**
     * Set the history ID
     * 
     * @param string $historyId The history ID
     * @return Google_Service_Gmail_Profile
     */
    public function setHistoryId($historyId) {
        $this->historyId = $historyId;
        return $this;
    }
}
