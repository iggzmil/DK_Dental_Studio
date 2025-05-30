<?php
/**
 * Command Line Runner for Google Calendar Reminder System
 * 
 * This script runs the reminder system from command line (CLI) for cron jobs.
 * No web-based security check required.
 */

// Check if running from command line
if (php_sapi_name() !== 'cli') {
    die("This script must be run from command line only.\n");
}

// Set content type for CLI output
echo "RUNNING GOOGLE CALENDAR REMINDER SYSTEM FROM COMMAND LINE\n";
echo "========================================================\n";
echo "Mode: LIVE (actual emails will be sent)\n";
echo "========================================================\n\n";

// Handle command line arguments
$options = getopt("d:", ["date:", "test", "help"]);

// Show help
if (isset($options['help'])) {
    echo "Usage: php run-reminders-cli.php [options]\n\n";
    echo "Options:\n";
    echo "  -d, --date=DATE     Test with specific date (YYYY-MM-DD format)\n";
    echo "  --test              Run in test mode (no emails sent)\n";
    echo "  --help              Show this help message\n\n";
    echo "Examples:\n";
    echo "  php run-reminders-cli.php                    # Normal run\n";
    echo "  php run-reminders-cli.php --test             # Test mode\n";
    echo "  php run-reminders-cli.php -d 2024-01-15      # Test specific date\n";
    exit(0);
}

// Handle test date
$testDate = $options['date'] ?? $options['d'] ?? null;
if ($testDate) {
    // Validate date format
    $dateObj = DateTime::createFromFormat('Y-m-d', $testDate);
    if (!$dateObj || $dateObj->format('Y-m-d') !== $testDate) {
        echo "ERROR: Invalid date format. Use YYYY-MM-DD\n";
        exit(1);
    }
    
    define('TEST_DATE', $testDate);
    echo "Using test date: $testDate\n";
    echo "Day of week: " . date('l', strtotime($testDate)) . "\n\n";
}

// Handle test mode
$testMode = isset($options['test']);
if ($testMode) {
    define('LOG_ONLY_MODE', true);
    echo "Running in TEST MODE - no emails will be sent\n\n";
} else {
    define('LOG_ONLY_MODE', false);
    echo "Running in LIVE MODE - emails will be sent\n\n";
}

// Display all errors for monitoring
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Include the Google Calendar reminder system
require_once __DIR__ . '/google_calendar_reminders.php';

echo "\n========================================================\n";
echo "FINISHED RUNNING REMINDER SYSTEM\n";
if (isset($logFile)) {
    echo "Log file: " . $logFile . "\n";
}
if (!$testMode) {
    echo "Live emails have been processed\n";
}
echo "========================================================\n"; 