<?php
/**
 * Gmail API Email Sender for DK Dental Studio
 *
 * This file provides functionality to send emails using the authenticated Gmail account
 * via Google's Gmail API. Requires OAuth2 authentication.
 */

// Try to use the vendor autoloader if available
$vendorPath = __DIR__ . '/../../vendor/autoload.php';
$tokenManagerPath = __DIR__ . '/../../vendor/google/oauth/GoogleTokenManager.php';

// Check if the files exist
if (file_exists($vendorPath) && file_exists($tokenManagerPath)) {
    // Try to include the vendor autoloader
    try {
        require_once $vendorPath;
        require_once $tokenManagerPath;
    } catch (Exception $e) {
        // If it fails, use the minimal autoloader
        require_once __DIR__ . '/minimal-autoloader.php';
    }
} else {
    // Use the minimal autoloader
    require_once __DIR__ . '/minimal-autoloader.php';
}

/**
 * Send an email using Gmail API
 *
 * @param string $to Email recipient
 * @param string $subject Email subject
 * @param string $message Email message body (HTML)
 * @param string $fromName Sender name
 * @param array $attachments Optional array of attachments with 'path' and 'name' keys
 * @return array Result with 'success' boolean and 'message' string
 */
function sendGmailEmail($to, $subject, $message, $fromName = 'DK Dental Studio', $attachments = []) {
    $result = [
        'success' => false,
        'message' => ''
    ];

    try {
        // Client credentials (same as in OAuth flow)
        $clientId = '593699947617-hulnksmaqujj6o0j1sob13klorehtspt.apps.googleusercontent.com';
        $clientSecret = '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';

        // Path to token file
        $tokenFile = __DIR__ . '/../../vendor/google/oauth/secure/google_refresh_token.json';

        // Initialize token manager
        $tokenManager = new GoogleTokenManager($clientId, $clientSecret, $tokenFile);

        // Get authenticated client
        $client = $tokenManager->getAuthorizedClient();
        if (!$client) {
            throw new Exception('Failed to get authorized Google client');
        }

        // Create Gmail service
        $service = new Google_Service_Gmail($client);

        // Create a new message
        $email = createEmail($to, $subject, $message, $fromName, $attachments);

        // Encode the email for Gmail API
        $rawMessage = base64_encode($email);
        $rawMessage = str_replace(['+', '/', '='], ['-', '_', ''], $rawMessage); // URL safe base64

        // Create message object for Gmail API
        $message = new Google_Service_Gmail_Message();
        $message->setRaw($rawMessage);

        // Send the message
        $sent = $service->users->messages->send('me', $message);

        if ($sent) {
            $result['success'] = true;
            $result['message'] = 'Email sent successfully';
            $result['id'] = $sent->getId();
        } else {
            $result['message'] = 'Failed to send email: Unknown error';
        }
    } catch (Exception $e) {
        $result['message'] = 'Failed to send email: ' . $e->getMessage();
        error_log('Gmail API error: ' . $e->getMessage());
    }

    return $result;
}

/**
 * Create an email in proper MIME format
 */
function createEmail($to, $subject, $message, $fromName, $attachments = []) {
    // Create a unique boundary for MIME parts
    $boundary = md5(time());

    // Get authenticated user email from token if available
    $fromEmail = getUserEmail();
    if (!$fromEmail) {
        $fromEmail = 'appointments@dkdstudio.aaa-city.com';
    }

    // Headers
    $headers = [
        'From' => "{$fromName} <{$fromEmail}>",
        'To' => $to,
        'Subject' => $subject,
        'MIME-Version' => '1.0',
        'Content-Type' => "multipart/mixed; boundary=\"{$boundary}\""
    ];

    // Format headers
    $formattedHeaders = '';
    foreach ($headers as $name => $value) {
        $formattedHeaders .= "{$name}: {$value}\r\n";
    }

    // Create email body
    $body = "--{$boundary}\r\n";
    $body .= "Content-Type: text/html; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $body .= base64_encode($message) . "\r\n";

    // Add attachments if any
    if (!empty($attachments)) {
        foreach ($attachments as $attachment) {
            if (!isset($attachment['path']) || !file_exists($attachment['path'])) {
                continue;
            }

            $filename = isset($attachment['name']) ? $attachment['name'] : basename($attachment['path']);
            $content = file_get_contents($attachment['path']);
            $mimeType = mime_content_type($attachment['path']) ?: 'application/octet-stream';

            $body .= "--{$boundary}\r\n";
            $body .= "Content-Type: {$mimeType}; name=\"{$filename}\"\r\n";
            $body .= "Content-Transfer-Encoding: base64\r\n";
            $body .= "Content-Disposition: attachment; filename=\"{$filename}\"\r\n\r\n";
            $body .= base64_encode($content) . "\r\n";
        }
    }

    // Close MIME boundary
    $body .= "--{$boundary}--";

    // Combine headers and body
    return $formattedHeaders . "\r\n" . $body;
}

/**
 * Get the authenticated user's email address
 */
function getUserEmail() {
    try {
        // Client credentials
        $clientId = '593699947617-hulnksmaqujj6o0j1sob13klorehtspt.apps.googleusercontent.com';
        $clientSecret = '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';

        // Path to token file
        $tokenFile = __DIR__ . '/../../vendor/google/oauth/secure/google_refresh_token.json';

        // Initialize token manager
        $tokenManager = new GoogleTokenManager($clientId, $clientSecret, $tokenFile);

        // Get authenticated client
        $client = $tokenManager->getAuthorizedClient();
        if (!$client) {
            return null;
        }

        // Create Gmail service
        $service = new Google_Service_Gmail($client);

        // Get user profile
        $profile = $service->users->getProfile('me');

        return $profile->getEmailAddress();
    } catch (Exception $e) {
        error_log('Failed to get user email: ' . $e->getMessage());
        return null;
    }
}

// API endpoint handler if file is accessed directly
if (basename($_SERVER['SCRIPT_FILENAME']) == basename(__FILE__)) {
    header('Content-Type: application/json');

    // Check if it's a POST request
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);

        // Validate required fields
        if (!isset($data['to']) || !isset($data['subject']) || !isset($data['message'])) {
            echo json_encode([
                'success' => false,
                'message' => 'Missing required fields (to, subject, message)'
            ]);
            exit;
        }

        // Send email
        $result = sendGmailEmail(
            $data['to'],
            $data['subject'],
            $data['message'],
            $data['fromName'] ?? 'DK Dental Studio',
            $data['attachments'] ?? []
        );

        // Return result
        echo json_encode($result);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'This endpoint only accepts POST requests'
        ]);
    }
}