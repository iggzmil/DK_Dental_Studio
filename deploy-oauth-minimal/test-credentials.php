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
    // HARDCODED CLIENT CREDENTIALS
    $clientId = '593699947617-hulnksmaqujj6o0j1sob13klorehtspt.apps.googleusercontent.com';
    $clientSecret = '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';
    
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
    $client->setScopes(['https://www.googleapis.com/auth/business.manage']);
    
    // Verify the client ID was set correctly
    $configClientId = $client->getClientId();
    echo "<p>Verified Client ID: $configClientId</p>";
    
    // Test creating the auth URL
    $authUrl = $client->createAuthUrl();
    echo "<p>Successfully created auth URL: <a href='$authUrl'>$authUrl</a></p>";
    echo "<p>✅ Test passed! The Google Client is properly configured.</p>";
    
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
    } else {
        echo "<p>OAuth2 service was not initialized yet, but that's normal until createAuthUrl is called</p>";
    }
    
} catch (Exception $e) {
    echo "<h2>Error:</h2>";
    echo "<p>" . $e->getMessage() . "</p>";
    echo "<pre>" . $e->getTraceAsString() . "</pre>";
}
?> 