<?php
/**
 * Test script to verify the fixed weekend logic
 */

echo "TESTING FIXED WEEKEND LOGIC\n";
echo "-----------------------------------------------------\n";

// Simulate the same conditions as run-live-reminders.php
define('LOG_ONLY_MODE', true);
define('TEST_DATE', '2025-06-18');

echo "Using specific date for testing: " . TEST_DATE . "\n\n";

// Include the Google Calendar reminder system
require_once __DIR__ . '/google_calendar_reminders.php';

echo "\n-----------------------------------------------------\n";
echo "TEST COMPLETED\n";
?> 