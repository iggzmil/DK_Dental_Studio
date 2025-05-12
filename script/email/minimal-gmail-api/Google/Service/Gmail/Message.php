<?php
/**
 * Minimal Gmail Message for Gmail API
 * 
 * This is a simplified version of the Google_Service_Gmail_Message class from the
 * Google API Client Library. It only includes the functionality
 * needed for sending emails.
 */

class Google_Service_Gmail_Message {
    private $id;
    private $threadId;
    private $labelIds;
    private $raw;
    
    /**
     * Set the ID
     * 
     * @param string $id The ID
     * @return Google_Service_Gmail_Message
     */
    public function setId($id) {
        $this->id = $id;
        return $this;
    }
    
    /**
     * Get the ID
     * 
     * @return string The ID
     */
    public function getId() {
        return $this->id;
    }
    
    /**
     * Set the thread ID
     * 
     * @param string $threadId The thread ID
     * @return Google_Service_Gmail_Message
     */
    public function setThreadId($threadId) {
        $this->threadId = $threadId;
        return $this;
    }
    
    /**
     * Get the thread ID
     * 
     * @return string The thread ID
     */
    public function getThreadId() {
        return $this->threadId;
    }
    
    /**
     * Set the label IDs
     * 
     * @param array $labelIds The label IDs
     * @return Google_Service_Gmail_Message
     */
    public function setLabelIds($labelIds) {
        $this->labelIds = $labelIds;
        return $this;
    }
    
    /**
     * Get the label IDs
     * 
     * @return array The label IDs
     */
    public function getLabelIds() {
        return $this->labelIds;
    }
    
    /**
     * Set the raw message
     * 
     * @param string $raw The raw message
     * @return Google_Service_Gmail_Message
     */
    public function setRaw($raw) {
        $this->raw = $raw;
        return $this;
    }
    
    /**
     * Get the raw message
     * 
     * @return string The raw message
     */
    public function getRaw() {
        return $this->raw;
    }
}
