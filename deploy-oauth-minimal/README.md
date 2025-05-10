# Minimal OAuth Package for DK Dental Studio

This package contains a minimal implementation of the OAuth functionality needed for Google Reviews integration, with only the essential dependencies included.

## Important Note

This package includes a minimal subset of the Google API Client library, containing only the files necessary for OAuth authorization and Google Reviews fetching. This approach eliminates the need to install Composer on your web server.

## Directory Structure

```
deploy-oauth-minimal/
├── api/
│   └── reviews.php           # API endpoint for fetching Google reviews
├── includes/
│   └── GoogleTokenManager.php # Class for managing OAuth tokens
├── secure/                   # Directory for storing OAuth tokens
├── vendor/                   # Minimal vendor directory with essential files
│   ├── autoload.php          # Custom autoloader for Google API Client
│   ├── google-api-php-client/ # Minimal Google API Client files
│   ├── guzzlehttp/           # Minimal GuzzleHttp files
│   └── psr/                  # Minimal PSR HTTP message files
├── owner-auth.php            # OAuth authorization page
└── owner-callback.php        # OAuth callback handler
```

## Installation Instructions

1. Download the `google-api-php-client-minimal.zip` file from the provided link
2. Extract the contents to your local machine
3. Upload the entire `deploy-oauth-minimal` directory to your web server
4. Ensure the `secure` directory has write permissions (chmod 700)
5. Access the OAuth authorization page at `https://your-domain.com/deploy-oauth-minimal/owner-auth.php`

## OAuth Authorization Process

1. Navigate to `https://your-domain.com/deploy-oauth-minimal/owner-auth.php`
2. Enter the password: `dk-dental-2024` (change this for security)
3. Click the "Authorize Google Access" button
4. Sign in with the Google account that manages your business
5. Grant the requested permissions
6. You should see a success message

## Integration with Your Website

To integrate the Google Reviews with your website:

1. Update the API endpoint URL in your JavaScript code to point to:
   ```
   https://your-domain.com/deploy-oauth-minimal/api/reviews.php
   ```

2. The reviews will be returned in JSON format, which you can display on your website

## Security Considerations

- Change the default password in `owner-auth.php`
- Ensure the `secure` directory has restricted permissions (chmod 700)
- Consider moving the token storage to a location outside the web root

## Troubleshooting

If you encounter issues:

1. Check that all files were uploaded correctly
2. Verify that the `secure` directory has write permissions
3. Check your server's error logs for any PHP errors
4. Ensure the Google account used has access to the business profile

## Additional Notes

This minimal package includes only the essential files needed for OAuth functionality. If you need additional features from the Google API Client, you may need to install the full library using Composer.
