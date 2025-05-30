<?php
/**
 * Live Runner for Google Calendar Reminder System
 * 
 * This script runs the reminder system in LIVE MODE, which will actually send emails.
 * Use with caution - real emails will be sent to customers.
 */

// Security measure - require confirmation code
$confirmCode = isset($_GET['confirm']) ? $_GET['confirm'] : '';
$expectedCode = 'SendLiveReminders'; // Change this to your preferred code

// Set content type for browser output
header('Content-Type: text/plain');

// Check confirmation code
if ($confirmCode !== $expectedCode) {
    echo "SECURITY CHECK FAILED\n";
    echo "-----------------------------------------------------\n";
    echo "To run the reminder system in live mode, you must provide the correct confirmation code.\n";
    echo "Example: run-live-reminders.php?confirm=SendLiveReminders\n";
    echo "\nThis security measure prevents accidental live emails.\n";
    exit;
}

// Alert that we're in LIVE MODE
echo "RUNNING GOOGLE CALENDAR REMINDER SYSTEM IN **LIVE MODE**\n";
echo "-----------------------------------------------------\n";
echo "WARNING: ACTUAL EMAILS WILL BE SENT TO CUSTOMERS\n";
echo "-----------------------------------------------------\n\n";

// CRITICAL: Define TEST_DATE FIRST, before any other processing
$testDate = isset($_GET['date']) ? $_GET['date'] : null; 

if ($testDate) {
    // Define TEST_DATE immediately
    define('TEST_DATE', $testDate);
    echo "Using specific date for testing: $testDate\n";
    echo "TEST_DATE defined as: " . TEST_DATE . "\n";
    echo "Expected day: " . date('l', strtotime(TEST_DATE)) . "\n\n";
} else {
    echo "Using tomorrow's date for reminders\n\n";
}

// Set log-only mode to false (LIVE MODE) - AFTER TEST_DATE
define('LOG_ONLY_MODE', false);

// Display all errors for monitoring
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Include the Google Calendar reminder system
require_once __DIR__ . '/google_calendar_reminders.php';

echo "\n-----------------------------------------------------\n";
echo "FINISHED RUNNING IN **LIVE MODE**\n";
if (isset($logFile)) {
    echo "Check the log file at: " . $logFile . "\n";
}
echo "Emails have been sent to the recipients listed above\n"; 