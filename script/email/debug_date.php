<?php

echo "=== DEBUGGING DATE ISSUE ===\n";

define('TEST_DATE', '2025-06-18');
echo "TEST_DATE defined as: " . TEST_DATE . "\n";

// Test basic date functionality
$today = new DateTime(TEST_DATE);
echo "DateTime created: " . $today->format('Y-m-d l') . "\n";
echo "Day of week (0=Sun): " . $today->format('w') . "\n";

// Test the specific logic from shouldSendRemindersToday()
function testWeekendLogic($testDate) {
    echo "\n--- Testing weekend logic for: $testDate ---\n";
    
    if (defined('TEST_DATE')) {
        $today = new DateTime(TEST_DATE);
        echo "Using TEST_DATE: " . TEST_DATE . "\n";
    } else {
        $today = new DateTime();
        echo "Using current date\n";
    }
    
    $dayOfWeek = (int)$today->format('w');
    $dayName = $today->format('l');
    
    echo "Day of week number: $dayOfWeek\n";
    echo "Day name: $dayName\n";
    
    switch($dayOfWeek) {
        case 5: // Friday
            echo "Result: Friday - NOT sending reminders\n";
            return false;
            
        case 6: // Saturday  
            echo "Result: Saturday - NOT sending reminders\n";
            return false;
            
        case 0: // Sunday
            echo "Result: Sunday - WILL send reminders\n";
            return true;
            
        default: // Monday (1) through Thursday (4)
            echo "Result: $dayName - WILL send reminders\n";
            return true;
    }
}

testWeekendLogic('2025-06-18');

// Also test the standalone logic
echo "\n--- Direct date check ---\n";
echo "June 18, 2025 is a: " . date('l', strtotime('2025-06-18')) . "\n";
echo "Day of week: " . date('w', strtotime('2025-06-18')) . "\n";

?> 