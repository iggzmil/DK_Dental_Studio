<?php
/**
 * Minimal autoloader for Google API Client
 *
 * This is a simplified autoloader that only loads the classes needed for OAuth functionality
 * and Google Reviews fetching.
 */

// Define base directories
define('GOOGLE_API_DIR', __DIR__ . '/google');
define('GUZZLE_DIR', __DIR__ . '/guzzlehttp');
define('PSR_DIR', __DIR__ . '/psr');

// Simple autoloader function
spl_autoload_register(function ($class) {
    // Handle Google classes
    if (strpos($class, 'Google\\') === 0) {
        $file = str_replace('\\', '/', substr($class, 7)) . '.php';
        $path = GOOGLE_API_DIR . '/apiclient/src/' . $file;

        if (file_exists($path)) {
            require_once $path;
            return true;
        }

        // Check in apiclient-services
        $path = GOOGLE_API_DIR . '/apiclient-services/src/' . $file;
        if (file_exists($path)) {
            require_once $path;
            return true;
        }
    }

    // Handle GuzzleHttp classes
    if (strpos($class, 'GuzzleHttp\\') === 0) {
        $file = str_replace('\\', '/', substr($class, 11)) . '.php';

        // Check in guzzle
        $path = GUZZLE_DIR . '/guzzle/src/' . $file;
        if (file_exists($path)) {
            require_once $path;
            return true;
        }

        // Check in promises
        $path = GUZZLE_DIR . '/promises/src/' . $file;
        if (file_exists($path)) {
            require_once $path;
            return true;
        }

        // Check in psr7
        $path = GUZZLE_DIR . '/psr7/src/' . $file;
        if (file_exists($path)) {
            require_once $path;
            return true;
        }
    }

    // Handle PSR classes
    if (strpos($class, 'Psr\\') === 0) {
        $parts = explode('\\', $class);
        if (count($parts) >= 3) {
            $package = strtolower($parts[1]);
            $file = str_replace('\\', '/', substr($class, strlen("Psr\\{$parts[1]}\\") + 1)) . '.php';
            $path = PSR_DIR . '/' . $package . '-' . $package . '/src/' . $file;

            if (file_exists($path)) {
                require_once $path;
                return true;
            }
        }
    }

    return false;
});

// Load essential files that might not be autoloaded
require_once GOOGLE_API_DIR . '/apiclient/src/Client.php';
