<?php
/**
 * Test script to verify Google Client credentials
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Load the minimal Google API Client
require_once __DIR__ . '/vendor/autoload.php';

echo "<h1>Testing Google Client Credentials</h1>";

try {
    // CREDENTIALS - Using environment variables or defined variables
    // In production, set these environment variables on your server
    // or use a secure configuration file outside the web root
    $clientId = getenv('GOOGLE_CLIENT_ID') ?: 'YOUR_CLIENT_ID_HERE';
    $clientSecret = getenv('GOOGLE_CLIENT_SECRET') ?: 'YOUR_CLIENT_SECRET_HERE';
    
    echo "<p>Using Client ID: $clientId</p>";
    
    // Create Google client with credentials in constructor
    $client = new Google\Client([
        'client_id' => $clientId,
        'client_secret' => $clientSecret
    ]);
    
    // Also set credentials via setter methods
    $client->setClientId($clientId);
    $client->setClientSecret($clientSecret);
    
    // Set redirect URI
    $redirectUri = 'https://' . $_SERVER['HTTP_HOST'] . '/deploy-oauth-minimal/owner-callback.php';
    $client->setRedirectUri($redirectUri);
    
    // Set OAuth flow settings
    $client->setAccessType('offline');
    $client->setApprovalPrompt('force');
    $client->setIncludeGrantedScopes(true);
    
    // Set scopes - make sure this is explicitly set as an array first, then use addScope
    $scopes = ['https://www.googleapis.com/auth/business.manage'];
    $client->setScopes($scopes);
    
    // Check if scopes were set properly
    echo "<p>Scopes set: " . implode(', ', $client->getScopes()) . "</p>";
    
    // Verify the client ID was set correctly
    $configClientId = $client->getClientId();
    echo "<p>Verified Client ID: $configClientId</p>";
    
    // Test creating the auth URL
    $authUrl = $client->createAuthUrl();
    echo "<p>Successfully created auth URL: <a href='$authUrl'>$authUrl</a></p>";
    echo "<p>✅ Test passed! The Google Client is properly configured.</p>";
    
    // Prevent file_put_contents errors in Client.php and OAuth2.php
    // By defining local debug dir with proper permissions
    $debugDir = __DIR__ . '/debug';
    if (!file_exists($debugDir)) {
        @mkdir($debugDir, 0777, true);
    }
    
    // Safe debug logging function
    function safeLogDebug($message) {
        $debugFile = __DIR__ . '/debug/oauth_debug.log';
        @file_put_contents($debugFile, date('Y-m-d H:i:s') . ' - ' . $message . PHP_EOL, FILE_APPEND);
    }
    
    safeLogDebug("Test credential verification successful");
    
    // Check OAuth2 service details
    $reflectionClass = new ReflectionClass($client);
    $authProperty = $reflectionClass->getProperty('auth');
    $authProperty->setAccessible(true);
    $auth = $authProperty->getValue($client);
    
    if ($auth) {
        echo "<p>OAuth2 service initialized correctly</p>";
        // Verify the OAuth2 service has the client ID
        $reflectionOAuth = new ReflectionClass($auth);
        $clientIdProperty = $reflectionOAuth->getProperty('clientId');
        $clientIdProperty->setAccessible(true);
        $oauthClientId = $clientIdProperty->getValue($auth);
        echo "<p>OAuth2 service client ID: $oauthClientId</p>";
        
        // Verify OAuth2 scopes
        if (property_exists($auth, 'scopes')) {
            $scopesProperty = $reflectionOAuth->getProperty('scopes');
            $scopesProperty->setAccessible(true);
            $oauthScopes = $scopesProperty->getValue($auth);
            echo "<p>OAuth2 service scopes: " . implode(', ', $oauthScopes) . "</p>";
        }
    } else {
        echo "<p>OAuth2 service was not initialized yet, but that's normal until createAuthUrl is called</p>";
    }
    
} catch (Exception $e) {
    echo "<h2>Error:</h2>";
    echo "<p>" . $e->getMessage() . "</p>";
    echo "<pre>" . $e->getTraceAsString() . "</pre>";
}
?> 