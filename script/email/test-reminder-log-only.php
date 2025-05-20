<?php
/**
 * Test Script for Google Calendar Reminder System in Log-Only Mode
 * 
 * This script runs the reminder system in log-only mode, which displays what would happen
 * without actually sending any emails.
 */

// Set log-only mode flag
define('LOG_ONLY_MODE', true);

// Display all errors for testing
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set content type for browser output
header('Content-Type: text/plain');
echo "RUNNING GOOGLE CALENDAR REMINDER SYSTEM IN LOG-ONLY MODE\n";
echo "-----------------------------------------------------\n\n";

// Allow testing with a specific date (optional)
$testDate = isset($_GET['date']) ? $_GET['date'] : null; 

if ($testDate) {
    echo "Testing with specific date: $testDate\n\n";
    // Override the reminder system's date calculation to use our test date
    define('TEST_DATE', $testDate);
}

// Include the Google Calendar reminder system with log-only mode
require_once __DIR__ . '/google_calendar_reminders.php';

echo "\n-----------------------------------------------------\n";
echo "FINISHED RUNNING IN LOG-ONLY MODE\n";
echo "Check the log file at: " . $logFile . "\n"; 