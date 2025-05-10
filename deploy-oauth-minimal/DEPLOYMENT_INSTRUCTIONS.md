# Deployment Instructions for Minimal OAuth Package

This document provides instructions for deploying the minimal OAuth package for DK Dental Studio's Google Reviews integration.

## Package Contents

This package contains:

1. PHP files for OAuth authorization and Google Reviews fetching
2. A minimal implementation of the required dependencies
3. Configuration files and documentation

## Deployment Steps

### 1. Download the Complete Package

The complete package with all dependencies is available at:
[Google Drive Link to be provided]

This package includes the minimal set of Google API Client files needed for OAuth functionality.

### 2. Upload to Web Server

Upload the entire `deploy-oauth-minimal` directory to your web server. You can place it in the root of your website or in a subdirectory.

### 3. Set Permissions

Ensure the `secure` directory has write permissions:

```bash
chmod 700 /path/to/deploy-oauth-minimal/secure
```

### 4. Update Configuration (if needed)

If your domain or paths are different from the default, update the following:

- Redirect URI in `owner-auth.php` and `owner-callback.php`
- API endpoint URL in any JavaScript that calls it

### 5. Run the Authorization Process

1. Navigate to `https://your-domain.com/deploy-oauth-minimal/owner-auth.php`
2. Enter the password: `dk-dental-2024` (change this for security)
3. Click the "Authorize Google Access" button
4. Sign in with the Google account that manages your business
5. Grant the requested permissions
6. You should see a success message

### 6. Test the API Endpoint

Visit `https://your-domain.com/deploy-oauth-minimal/api/reviews.php` to verify that reviews are being fetched correctly.

### 7. Update Your Website

Update your website's JavaScript to fetch reviews from the new API endpoint:

```javascript
// Example code
fetch('https://your-domain.com/deploy-oauth-minimal/api/reviews.php')
  .then(response => response.json())
  .then(reviews => {
    // Display reviews on your website
  });
```

## Security Considerations

- Change the default password in `owner-auth.php`
- Consider moving the token storage to a location outside the web root
- Implement additional security measures for the authorization page

## Troubleshooting

If you encounter issues:

1. Check your server's error logs
2. Verify that the `secure` directory has write permissions
3. Ensure all files were uploaded correctly
4. Try reauthorizing if the token has expired or been revoked

## Support

If you need assistance with the deployment, please contact your web developer or IT support team.
