<?php
/**
 * Minimal Autoloader for Gmail API
 * 
 * This file provides a minimal autoloader for the Gmail API classes
 * required for sending emails. It's a simplified version of the full
 * Google API Client Library.
 */

// Define the base path for the minimal Gmail API library
define('GMAIL_API_BASE_PATH', __DIR__);

// Register the autoloader
spl_autoload_register(function($class) {
    // Only handle Google classes
    if (strpos($class, 'Google_') !== 0) {
        return;
    }
    
    // Convert class name to file path
    $path = str_replace('_', '/', $class);
    $file = GMAIL_API_BASE_PATH . '/' . $path . '.php';
    
    // Include the file if it exists
    if (file_exists($file)) {
        require_once $file;
    }
});

// Include the core classes
require_once GMAIL_API_BASE_PATH . '/Google/Client.php';
require_once GMAIL_API_BASE_PATH . '/Google/Service/Gmail.php';
require_once GMAIL_API_BASE_PATH . '/Google/Service/Gmail/Message.php';

// Log that the minimal autoloader was loaded
error_log('Minimal Gmail API autoloader loaded');
