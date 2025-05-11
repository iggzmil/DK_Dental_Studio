# Google OAuth Implementation for DK Dental Studio

This directory contains a simplified OAuth implementation for Google Business Profile integration.

## Files Overview

- `auth.php` - The main authorization page that starts the OAuth flow
- `callback.php` - Handles the OAuth callback from Google and stores the refresh token
- `token.php` - Helper functions to get and refresh tokens for API usage
- `example.php` - Example usage of the token helper to make API calls
- `.gitignore` - Prevents sensitive data from being committed to version control

## How to Use

1. **Authorization Process (One-time setup)**
   - Direct the business owner to visit `/vendor/google/oauth/auth.php`
   - They'll log in with the admin password
   - Click the "Authorize Google Access" button
   - Sign in with their Google Business Profile account
   - Grant the requested permissions
   - The authorization process stores a refresh token for future use

2. **Using the OAuth in Your Code**
   ```php
   // Include the token helper
   require_once 'vendor/google/oauth/token.php';
   
   // Get a valid access token
   $accessToken = getGoogleAccessToken();
   
   if ($accessToken) {
       // Make API calls using the access token
       // Example:
       $headers = [
           'Authorization: Bearer ' . $accessToken,
           'Content-Type: application/json'
       ];
       
       // Your API call code here
   } else {
       // No valid token available, authorization needed
   }
   ```

## Security Notes

1. The refresh token is stored securely in a `secure` directory
2. This implementation does not rely on any external OAuth libraries
3. All sensitive information is kept out of version control using .gitignore

## Troubleshooting

If you encounter issues with the OAuth process:

1. Check the server logs for detailed error messages
2. Ensure the redirect URI matches exactly what's configured in the Google Cloud Console
3. Verify that the correct scopes are being requested
4. If the refresh token is not being received, ensure `prompt=consent` is included in the auth URL

## Dependencies

This implementation has minimal dependencies:
- PHP with cURL support
- File system write access for token storage 