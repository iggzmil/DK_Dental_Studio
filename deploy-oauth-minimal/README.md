# DK Dental Studio - OAuth Minimal Deployment

This directory contains a minimal implementation of Google API OAuth for DK Dental Studio's website.

## Security Note

For security reasons, actual credentials are not included in the code. Before deploying:

1. Set environment variables on your server:
   ```
   GOOGLE_CLIENT_ID=your_actual_client_id
   GOOGLE_CLIENT_SECRET=your_actual_client_secret
   ```

2. Alternatively, modify the PHP files to use your actual credentials:
   - owner-auth.php
   - owner-callback.php
   - test-credentials.php

## Structure

- `owner-auth.php` - Initiates the OAuth flow with Google
- `owner-callback.php` - Handles the OAuth callback and stores the token
- `secure/` - Directory for storing refresh tokens (must be writable by web server)
- `api/` - API endpoints that use the authenticated service
- `includes/` - Shared code for the implementation
- `vendor/` - Minimal set of Google API Client library files

## Deployment Instructions

1. Upload all files to your web server
2. Set proper permissions for the `secure` directory: `chmod 700 secure`
3. Configure your Google Client credentials (see Security Note above)
4. Visit `owner-auth.php` in your browser to authenticate
5. After successful authentication, Google reviews can be displayed on the website

## Troubleshooting

If you encounter issues:
1. Check permissions on the `secure` directory
2. Verify that your Google API Client credentials are correctly configured
3. Make sure the callback URL matches what's registered in your Google Developer Console
4. Look for debug logs in the `debug` directory if available

## For More Details

See the detailed documentation in oauth-credentials-info.md
