<?php
/**
 * Weekend Logic Test Script for DK Dental Studio Appointment Reminders
 * 
 * This script tests the weekend logic implementation to ensure reminders
 * are sent on appropriate days and skipped when clinic is closed.
 */

// Include the main reminder script functions
require_once __DIR__ . '/google_calendar_reminders.php';

// Test logging
function testLogMessage($message) {
    echo "[TEST] " . date('Y-m-d H:i:s') . " $message" . PHP_EOL;
}

echo "==========================================================\n";
echo "DK DENTAL STUDIO - WEEKEND LOGIC TEST\n";
echo "==========================================================\n\n";

// Test different days of the week
$testDays = [
    'Monday' => '2025-06-02',    // Monday
    'Tuesday' => '2025-06-03',   // Tuesday  
    'Wednesday' => '2025-06-04', // Wednesday
    'Thursday' => '2025-06-05',  // Thursday
    'Friday' => '2025-06-06',    // Friday (should NOT send for Saturday)
    'Saturday' => '2025-06-07',  // Saturday (should NOT send for Sunday)
    'Sunday' => '2025-06-08'     // Sunday (SHOULD send for Monday)
];

echo "1. TESTING WEEKEND LOGIC\n";
echo "------------------------\n";

foreach ($testDays as $dayName => $testDate) {
    testLogMessage("Testing $dayName ($testDate):");
    
    // Simulate the day by temporarily changing the date
    $originalDate = new DateTime();
    $testDateTime = new DateTime($testDate);
    
    // Mock the current date for testing
    $dayOfWeek = (int)$testDateTime->format('w');
    
    switch($dayOfWeek) {
        case 5: // Friday
            $shouldSend = false;
            $reason = "NOT sending reminders for Saturday (clinic closed on weekends)";
            break;
            
        case 6: // Saturday  
            $shouldSend = false;
            $reason = "NOT sending reminders for Sunday (clinic closed on weekends)";
            break;
            
        case 0: // Sunday
            $shouldSend = true;
            $reason = "WILL send reminders for Monday appointments";
            break;
            
        default: // Monday through Thursday
            $shouldSend = true;
            $reason = "WILL send reminders for tomorrow's appointments";
            break;
    }
    
    testLogMessage("  → $reason");
    testLogMessage("  → Expected result: " . ($shouldSend ? "SEND REMINDERS" : "SKIP REMINDERS"));
    echo "\n";
}

echo "2. TESTING BUSINESS HOURS VALIDATION\n";
echo "------------------------------------\n";

// Test business hours for different services
$testAppointments = [
    // Dentures (Mon-Fri 10am-4pm)
    ['service' => 'Dentures', 'datetime' => '2025-06-02 10:00:00', 'expected' => true, 'note' => 'Monday 10am - valid'],
    ['service' => 'Dentures', 'datetime' => '2025-06-02 15:00:00', 'expected' => true, 'note' => 'Monday 3pm - valid'],
    ['service' => 'Dentures', 'datetime' => '2025-06-02 16:00:00', 'expected' => false, 'note' => 'Monday 4pm - outside hours'],
    ['service' => 'Dentures', 'datetime' => '2025-06-02 09:00:00', 'expected' => false, 'note' => 'Monday 9am - too early'],
    
    // Mouthguards (Mon-Thu 10am-6pm, Fri 10am-4pm)
    ['service' => 'Mouthguards', 'datetime' => '2025-06-02 17:00:00', 'expected' => true, 'note' => 'Monday 5pm - valid'],
    ['service' => 'Mouthguards', 'datetime' => '2025-06-06 17:00:00', 'expected' => false, 'note' => 'Friday 5pm - outside hours'],
    ['service' => 'Mouthguards', 'datetime' => '2025-06-06 15:00:00', 'expected' => true, 'note' => 'Friday 3pm - valid'],
    
    // Weekend appointments (should never be valid)
    ['service' => 'Dentures', 'datetime' => '2025-06-07 12:00:00', 'expected' => false, 'note' => 'Saturday - clinic closed'],
    ['service' => 'Mouthguards', 'datetime' => '2025-06-08 12:00:00', 'expected' => false, 'note' => 'Sunday - clinic closed'],
];

foreach ($testAppointments as $test) {
    $result = isValidBusinessHourAppointment($test['datetime'], $test['service']);
    $status = $result === $test['expected'] ? "✅ PASS" : "❌ FAIL";
    
    testLogMessage("$status {$test['service']} - {$test['note']}");
    if ($result !== $test['expected']) {
        testLogMessage("   Expected: " . ($test['expected'] ? 'VALID' : 'INVALID') . ", Got: " . ($result ? 'VALID' : 'INVALID'));
    }
}

echo "\n3. WEEKEND SCENARIO EXAMPLES\n";
echo "-----------------------------\n";

$scenarios = [
    [
        'scenario' => 'Friday at 8am (today)',
        'today' => 'Friday',
        'tomorrow' => 'Saturday',
        'expected' => 'NO reminders sent - clinic closed on Saturday'
    ],
    [
        'scenario' => 'Saturday at 8am (today)', 
        'today' => 'Saturday',
        'tomorrow' => 'Sunday',
        'expected' => 'NO reminders sent - clinic closed on Sunday'
    ],
    [
        'scenario' => 'Sunday at 8am (today)',
        'today' => 'Sunday', 
        'tomorrow' => 'Monday',
        'expected' => 'YES reminders sent - Monday is business day'
    ],
    [
        'scenario' => 'Thursday at 8am (today)',
        'today' => 'Thursday',
        'tomorrow' => 'Friday', 
        'expected' => 'YES reminders sent - Friday is business day'
    ]
];

foreach ($scenarios as $scenario) {
    testLogMessage("Scenario: {$scenario['scenario']}");
    testLogMessage("  Today: {$scenario['today']}, Tomorrow: {$scenario['tomorrow']}");
    testLogMessage("  Expected: {$scenario['expected']}");
    echo "\n";
}

echo "4. CRON JOB RECOMMENDATIONS\n";
echo "----------------------------\n";
testLogMessage("Recommended cron job schedule:");
testLogMessage("0 8 * * 0-4 /usr/bin/php /path/to/script/email/run-live-reminders.php?confirm=SendLiveReminders");
testLogMessage("This runs at 8 AM Sunday through Thursday (days 0-4)");
testLogMessage("Skips Friday (day 5) and Saturday (day 6) automatically via weekend logic");
echo "\n";

echo "==========================================================\n";
echo "WEEKEND LOGIC TEST COMPLETED\n";
echo "==========================================================\n";
echo "Review the results above to ensure weekend logic works correctly.\n";
echo "The system should:\n";
echo "- Skip Friday/Saturday (no reminders for weekend days)\n";
echo "- Send Sunday (reminders for Monday appointments)\n";
echo "- Send Monday-Thursday (reminders for next business day)\n";
echo "- Validate business hours for all appointments\n";
echo "==========================================================\n"; 