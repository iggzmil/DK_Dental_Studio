# Google OAuth Implementation for DK Dental Studio

This directory contains a lightweight OAuth implementation for Google API access, specifically for accessing Google Business Profile data.

## Directory Structure

```
vendor/google/oauth/
├── auth.php          # Authorization page that initiates the OAuth flow
├── callback.php      # Callback handler that processes OAuth responses
├── token.php         # Helper functions for token management
├── example.php       # Example of how to use the token for API calls
├── index.php         # Redirect to auth.php
├── secure/           # Directory for storing OAuth tokens
└── README.md         # This documentation
```

## Troubleshooting 403 access_denied Error

If you encounter a `403: access_denied` error during the OAuth authorization process, follow these steps to resolve it:

### 1. Check Google Cloud Console Configuration

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select the project associated with your OAuth client ID
3. Navigate to "APIs & Services" > "Credentials"
4. Find and edit your OAuth 2.0 Client ID
5. Under "Authorized redirect URIs", make sure this exact URI is listed:
   ```
   https://dkdstudio.aaa-city.com/vendor/google/oauth/callback.php
   ```
6. Save the changes

### 2. Verify OAuth Consent Screen

1. In Google Cloud Console, go to "APIs & Services" > "OAuth consent screen"
2. Make sure the app's publishing status and user type are appropriate
3. Verify that the necessary scopes are added, including:
   ```
   https://www.googleapis.com/auth/business.manage
   ```
4. Check the test users - make sure the account you're using for testing is listed if your app is in "Testing" mode

### 3. Check File Permissions

Ensure the `secure` directory has appropriate permissions:
```
chmod 700 vendor/google/oauth/secure
```

### 4. Debugging Steps

If the issue persists, check the server logs for details about the OAuth flow:
```
tail -f /path/to/your/error_log
```

Look for entries with "Generated OAuth URL" and other debugging information.

### 5. Common Causes of 403 access_denied

* **Redirect URI Mismatch**: The most common cause. The URI in the authentication request must exactly match one registered in Google Cloud Console.
* **Scope Not Authorized**: The requested scope is not enabled in the OAuth consent screen.
* **User Not Authorized**: If your app is in "Testing" mode, only authorized test users can access it.
* **Account Issues**: The user's Google account may have restrictions or security settings preventing the authorization.

## Integration

To use this OAuth implementation in other parts of the website, include the token helper:

```php
require_once __DIR__ . '/vendor/google/oauth/token.php';

// Get a valid access token
$accessToken = getGoogleAccessToken();

if ($accessToken) {
    // Use the access token for API calls
    // Example API call to fetch Google Business Profile accounts
    $curl = curl_init('https://mybusinessaccountmanagement.googleapis.com/v1/accounts');
    curl_setopt($curl, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $accessToken,
        'Content-Type: application/json'
    ]);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($curl);
    curl_close($curl);
    
    // Process response
    $data = json_decode($response, true);
}
```

## Files Overview

- `auth.php` - The main authorization page that starts the OAuth flow
- `callback.php`