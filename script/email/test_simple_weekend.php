<?php
// Simple diagnostic to test weekend logic with TEST_DATE

echo "=== WEEKEND LOGIC DIAGNOSTIC ===\n";
echo "Current system date: " . date('Y-m-d l') . "\n";

define('TEST_DATE', '2025-06-18');
echo "TEST_DATE defined as: " . TEST_DATE . "\n";
echo "TEST_DATE should be: " . date('l', strtotime(TEST_DATE)) . "\n\n";

// Test the function directly
function shouldSendRemindersToday_test() {
    echo "--- Inside shouldSendRemindersToday function ---\n";
    
    // Use TEST_DATE if defined, otherwise use current date
    if (defined('TEST_DATE')) {
        $today = new DateTime(TEST_DATE);
        echo "✅ Using TEST_DATE: " . TEST_DATE . "\n";
    } else {
        $today = new DateTime();
        echo "❌ Using current date (TEST_DATE not defined)\n";
    }
    
    $dayOfWeek = (int)$today->format('w'); // 0=Sunday, 1=Monday, ..., 6=Saturday
    $dayName = $today->format('l');
    
    echo "Date being used: " . $today->format('Y-m-d l') . "\n";
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

$result = shouldSendRemindersToday_test();
echo "\nFinal result: " . ($result ? "SEND REMINDERS" : "SKIP REMINDERS") . "\n";

echo "\n=== EXPECTED vs ACTUAL ===\n";
echo "Expected: 2025-06-18 = Wednesday = SEND REMINDERS\n";
echo "Actual: " . ($result ? "SEND REMINDERS" : "SKIP REMINDERS") . "\n";

if (!$result) {
    echo "\n❌ BUG CONFIRMED: Function is not using TEST_DATE properly\n";
} else {
    echo "\n✅ WORKING: Function is using TEST_DATE correctly\n";
}
?> 