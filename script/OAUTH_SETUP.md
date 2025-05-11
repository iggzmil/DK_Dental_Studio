# Google OAuth Setup Instructions

This documentation explains how to set up and use the Google OAuth implementation for DK Dental Studio.

## OAuth Implementation Structure

The OAuth implementation is located in the `/vendor/google/oauth/` directory and consists of:

```
vendor/google/oauth/
├── auth.php          # Authorization page that initiates the OAuth flow
├── callback.php      # Callback handler that processes OAuth responses
├── token.php         # Helper functions for token management
├── example.php       # Example of how to use the token for API calls
├── index.php         # Redirect to auth.php
├── README.md         # Detailed documentation
├── .gitignore        # Prevents sensitive data from being committed
└── secure/           # Directory for storing OAuth tokens
```

## Setup Process

1. **Access the Authorization Page**
   - Visit `/google-auth.php` in your browser
   - Enter the admin password when prompted (default: `dk-dental-2024`)

2. **Complete the Google Authorization**
   - Click the "Authorize Google Access" button
   - Sign in with the Google account that manages your business profile
   - Grant the requested permissions

3. **Test the Implementation**
   - Visit `/test-oauth.php` to verify that OAuth is working correctly
   - It will show if tokens exist and if they can be used for API calls

## Using OAuth Tokens in Your Code

To use the OAuth tokens in your own code, include the token helper:

```php
require_once __DIR__ . '/vendor/google/oauth/token.php';

// Get a valid access token
$accessToken = getGoogleAccessToken();

if ($accessToken) {
    // Use the access token for API calls
    $headers = [
        'Authorization: Bearer ' . $accessToken,
        'Content-Type: application/json'
    ];
    
    // Your API call code here
} else {
    // No valid token available, authorization needed
}
```

## Troubleshooting

- **Authorization Fails**: Check server logs and ensure redirect URIs match exactly in the Google Cloud Console
- **Token Not Found**: Ensure the `secure` directory exists and has write permissions (chmod 700)
- **Invalid Token**: Re-authorize by visiting `/google-auth.php` again
- **API Calls Fail**: Check if the token has expired or if the wrong scope was requested

## Security Considerations

- Change the default password in `vendor/google/oauth/auth.php`
- Keep your client secret private
- Restrict access to the OAuth files to prevent unauthorized use
- Consider adding IP restrictions to the authorization page

## Dependencies

This implementation has minimal dependencies:
- PHP 7.0+ with cURL support
- File system write access for token storage 