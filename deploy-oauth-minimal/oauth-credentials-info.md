# OAuth Credentials Information for DK Dental Studio

## Client Credentials
- **Client ID**: 593699947617-hulnksmaqujj6o0j1sob13klorehtspt.apps.googleusercontent.com
- **Client Secret**: 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
- **Authorized Scope**: https://www.googleapis.com/auth/business.manage

## Important Files
- **Authorization Page**: owner-auth.php
- **Callback Handler**: owner-callback.php
- **Test Page**: test-credentials.php

## Authentication Flow
1. User visits owner-auth.php and enters password (dk-dental-2024)
2. User clicks "Authorize Google Access" button
3. User grants permissions on Google's OAuth consent screen
4. Google redirects back to owner-callback.php with authorization code
5. Callback page exchanges code for access token and refresh token
6. Refresh token is stored in secure/google_refresh_token.json

## Debug Information
If you encounter issues with the OAuth flow:
1. Check the debug directory for oauth_debug.log files
2. Verify that the scope is properly set in the auth URL
3. Ensure the client ID and client secret match the ones registered in Google Developer Console
4. Make sure the redirect URI matches exactly what's registered in Google Developer Console
5. Verify file permissions on the secure directory (should be writable by web server)

## Troubleshooting Common Issues
- **"Missing Client ID" Error**: Make sure client ID is passed in both constructor and via setter methods
- **Empty Scope in Auth URL**: Verify that scopes are properly set via setScopes() and check getScopes() output
- **Permission Denied for Debug Logs**: Create a debug directory with proper write permissions
- **No Refresh Token Received**: Make sure approval_prompt is set to 'force'

## Token Storage
Tokens are stored in the secure directory. Make sure this directory:
1. Exists and is writable by the web server user
2. Has appropriate permissions (recommended: 700)
3. Is NOT accessible via web (should be protected by .htaccess) 