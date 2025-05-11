# DK Dental Studio Google Reviews Integration

This project integrates Google Business Profile reviews with the DK Dental Studio website.

## Project Structure

```
deploy-oauth-minimal/
├── api/
│   └── reviews.php         # API endpoint for fetching reviews
├── cache/                  # Cached review data (created automatically)
├── vendor/
│   └── google/
│       └── oauth/          # OAuth implementation
│           ├── auth.php    # OAuth authorization page
│           ├── callback.php # OAuth callback handler
│           ├── token.php   # Token management utilities
│           ├── example.php # Example API usage
│           └── README.md   # OAuth implementation documentation
└── google-auth.php         # Convenient root-level redirect to auth page
```

## Setup Instructions

1. Upload all files to your web server
2. Visit `/google-auth.php` to start the authorization process
3. Enter the admin password when prompted
4. Authorize access to your Google Business Profile
5. After successful authorization, the reviews will be accessible via the API

## How it Works

1. The OAuth process is handled by the files in `/vendor/google/oauth/`
2. When a user visits the website, it calls the `/api/reviews.php` endpoint
3. This endpoint uses the stored OAuth tokens to fetch reviews from Google
4. Reviews are cached for one hour to improve performance
5. If there's any issue with the Google API, the system falls back to mock reviews

## Troubleshooting

- **OAuth Issues:** If authorization fails, check the server logs and ensure the redirect URIs match exactly in the Google Cloud Console
- **Review Fetching Issues:** If reviews aren't appearing, try clearing the cache by deleting the cache directory
- **Token Errors:** If you need to re-authorize, delete the secure/google_refresh_token.json file and start the auth process again

## Security Notes

- Keep your client secret private
- The implementation uses secure token storage to protect credentials
- All sensitive files are excluded from version control using .gitignore

## Dependencies

This implementation has minimal dependencies:
- PHP 7.0+ with cURL support
- File system write access for token storage and caching
