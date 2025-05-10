# Dependencies Information

This document provides information about the dependencies required for the OAuth functionality.

## Required Dependencies

The minimal OAuth package requires the following dependencies:

1. **Google API Client Library** - For OAuth authentication and API access
2. **GuzzleHttp** - For HTTP requests
3. **PSR HTTP Message** - For HTTP message interfaces

## Minimal Implementation

This package includes a minimal implementation of these dependencies, containing only the files necessary for OAuth authorization and Google Reviews fetching. This approach eliminates the need to install Composer on your web server.

## Directory Structure

```
vendor/
├── autoload.php                  # Custom autoloader
├── google-api-php-client/        # Minimal Google API Client files
│   └── src/
│       ├── Client.php            # Google Client class
│       ├── Service.php           # Google Service class
│       ├── Service/              # Service-specific classes
│       ├── Http/                 # HTTP-related classes
│       └── AccessToken/          # Token-related classes
├── guzzlehttp/                   # Minimal GuzzleHttp files
│   └── guzzle/
│       └── src/
│           ├── Client.php        # GuzzleHttp Client class
│           └── ...               # Other required classes
└── psr/                          # PSR HTTP message interfaces
    └── http-message/
        └── src/
            ├── MessageInterface.php
            └── ...               # Other interface files
```

## Full vs. Minimal Implementation

The full Google API Client library is quite large (over 10MB) and includes many features that are not needed for this specific OAuth implementation. The minimal implementation includes only the essential files needed for OAuth authorization and Google Reviews fetching, resulting in a much smaller package (less than 1MB).

## Adding More Functionality

If you need additional functionality from the Google API Client library, you may need to add more files to the minimal implementation or install the full library using Composer:

```bash
composer require google/apiclient:^2.12.1
```

## Online Resources

If you prefer to use online resources instead of including the dependencies in the package, you can modify the code to use CDN-hosted libraries. However, this approach may not be reliable for production use, as it depends on the availability of the CDN and may not include all the required files.
