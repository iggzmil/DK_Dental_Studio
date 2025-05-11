<?php
/**
 * Session Handler for DK Dental Studio
 * 
 * This script handles session management for CSRF protection
 * and other session-related functionality.
 */

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * Generate a CSRF token and store it in the session
 * 
 * @return string The generated CSRF token
 */
function generateCsrfToken() {
    // Generate a random token
    $token = bin2hex(random_bytes(32));
    
    // Store in session
    $_SESSION['csrf_token'] = $token;
    
    return $token;
}

/**
 * Verify a CSRF token against the one stored in the session
 * 
 * @param string $token The token to verify
 * @return bool Whether the token is valid
 */
function verifyCsrfToken($token) {
    if (!isset($_SESSION['csrf_token'])) {
        return false;
    }
    
    return hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Get the current CSRF token or generate a new one
 * 
 * @return string The CSRF token
 */
function getCsrfToken() {
    if (!isset($_SESSION['csrf_token'])) {
        return generateCsrfToken();
    }
    
    return $_SESSION['csrf_token'];
}

// If this file is accessed directly, return a CSRF token
if (basename($_SERVER['SCRIPT_FILENAME']) == basename(__FILE__)) {
    header('Content-Type: application/json');
    
    echo json_encode([
        'csrf_token' => getCsrfToken()
    ]);
}
