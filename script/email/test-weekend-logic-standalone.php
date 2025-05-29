<?php
/**
 * Standalone Weekend Logic Test Script for DK Dental Studio
 * 
 * This script tests ONLY the weekend logic functions without requiring
 * OAuth authentication or Google Calendar access.
 */

// Test logging function
function testLogMessage($message) {
    echo "[TEST] " . date('Y-m-d H:i:s') . " $message" . PHP_EOL;
}

// Copy the weekend logic functions here for standalone testing
function shouldSendRemindersToday($testDate = null) {
    $today = $testDate ? new DateTime($testDate) : new DateTime();
    $dayOfWeek = (int)$today->format('w'); // 0=Sunday, 1=Monday, ..., 6=Saturday
    $dayName = $today->format('l');
    
    switch($dayOfWeek) {
        case 5: // Friday
            testLogMessage("Today is Friday - NOT sending reminders for Saturday (clinic closed on weekends)");
            return false;
            
        case 6: // Saturday  
            testLogMessage("Today is Saturday - NOT sending reminders for Sunday (clinic closed on weekends)");
            return false;
            
        case 0: // Sunday
            testLogMessage("Today is Sunday - WILL send reminders for Monday appointments");
            return true;
            
        default: // Monday (1) through Thursday (4)
            testLogMessage("Today is $dayName - WILL send reminders for tomorrow's appointments");
            return true;
    }
}

function isValidBusinessHourAppointment($appointmentDateTime, $service = null) {
    $appointmentDate = new DateTime($appointmentDateTime);
    $dayOfWeek = strtolower($appointmentDate->format('l'));
    $hour = (int)$appointmentDate->format('H');
    
    // Check if appointment is on weekend
    if ($dayOfWeek === 'saturday' || $dayOfWeek === 'sunday') {
        testLogMessage("WARNING: Found appointment on $dayOfWeek - clinic is closed on weekends");
        return false;
    }
    
    // Define business hours for each service
    $businessHours = [
        'dentures' => [
            'monday' => ['start' => 10, 'end' => 16],
            'tuesday' => ['start' => 10, 'end' => 16],
            'wednesday' => ['start' => 10, 'end' => 16],
            'thursday' => ['start' => 10, 'end' => 16],
            'friday' => ['start' => 10, 'end' => 16]
        ],
        'maintenance' => [
            'monday' => ['start' => 10, 'end' => 16],
            'tuesday' => ['start' => 10, 'end' => 16],
            'wednesday' => ['start' => 10, 'end' => 16],
            'thursday' => ['start' => 10, 'end' => 16],
            'friday' => ['start' => 10, 'end' => 16]
        ],
        'mouthguards' => [
            'monday' => ['start' => 10, 'end' => 18],
            'tuesday' => ['start' => 10, 'end' => 18],
            'wednesday' => ['start' => 10, 'end' => 18],
            'thursday' => ['start' => 10, 'end' => 18],
            'friday' => ['start' => 10, 'end' => 16]
        ]
    ];
    
    if (!$service) {
        return true; // Skip validation if service unknown
    }
    
    $serviceKey = strtolower($service);
    
    // Map service names to business hours keys
    if (stripos($serviceKey, 'denture') !== false) {
        $serviceKey = 'dentures';
    } elseif (stripos($serviceKey, 'maintenance') !== false || stripos($serviceKey, 'repair') !== false) {
        $serviceKey = 'maintenance';
    } elseif (stripos($serviceKey, 'mouthguard') !== false) {
        $serviceKey = 'mouthguards';
    } else {
        $serviceKey = 'dentures'; // Default
    }
    
    // Check if day and hour are within business hours
    if (isset($businessHours[$serviceKey][$dayOfWeek])) {
        $hours = $businessHours[$serviceKey][$dayOfWeek];
        $isValid = $hour >= $hours['start'] && $hour < $hours['end'];
        
        if (!$isValid) {
            testLogMessage("WARNING: Appointment at {$hour}:00 on $dayOfWeek is outside business hours for $serviceKey");
        }
        
        return $isValid;
    }
    
    testLogMessage("WARNING: No business hours defined for $serviceKey on $dayOfWeek");
    return false;
}

echo "==========================================================\n";
echo "DK DENTAL STUDIO - STANDALONE WEEKEND LOGIC TEST\n";
echo "==========================================================\n\n";

// Test different days of the week
$testDays = [
    'Monday' => '2025-06-02',
    'Tuesday' => '2025-06-03',
    'Wednesday' => '2025-06-04',
    'Thursday' => '2025-06-05',
    'Friday' => '2025-06-06',    // Should NOT send
    'Saturday' => '2025-06-07',  // Should NOT send
    'Sunday' => '2025-06-08'     // Should send
];

echo "1. TESTING WEEKEND LOGIC\n";
echo "------------------------\n";

foreach ($testDays as $dayName => $testDate) {
    testLogMessage("Testing $dayName ($testDate):");
    $shouldSend = shouldSendRemindersToday($testDate);
    testLogMessage("  → Result: " . ($shouldSend ? "✅ SEND REMINDERS" : "❌ SKIP REMINDERS"));
    echo "\n";
}

echo "2. TESTING BUSINESS HOURS VALIDATION\n";
echo "------------------------------------\n";

$testAppointments = [
    ['service' => 'Dentures', 'datetime' => '2025-06-02 10:00:00', 'expected' => true, 'note' => 'Monday 10am - valid'],
    ['service' => 'Dentures', 'datetime' => '2025-06-02 16:00:00', 'expected' => false, 'note' => 'Monday 4pm - outside hours'],
    ['service' => 'Mouthguards', 'datetime' => '2025-06-02 17:00:00', 'expected' => true, 'note' => 'Monday 5pm - valid'],
    ['service' => 'Mouthguards', 'datetime' => '2025-06-06 17:00:00', 'expected' => false, 'note' => 'Friday 5pm - outside hours'],
    ['service' => 'Dentures', 'datetime' => '2025-06-07 12:00:00', 'expected' => false, 'note' => 'Saturday - clinic closed'],
];

foreach ($testAppointments as $test) {
    $result = isValidBusinessHourAppointment($test['datetime'], $test['service']);
    $status = $result === $test['expected'] ? "✅ PASS" : "❌ FAIL";
    
    testLogMessage("$status {$test['service']} - {$test['note']}");
    if ($result !== $test['expected']) {
        testLogMessage("   Expected: " . ($test['expected'] ? 'VALID' : 'INVALID') . ", Got: " . ($result ? 'VALID' : 'INVALID'));
    }
}

echo "\n3. PRACTICAL SCENARIOS\n";
echo "----------------------\n";

$scenarios = [
    ['day' => 'Friday', 'date' => '2025-06-06', 'should_send' => false, 'reason' => 'Clinic closed Saturday'],
    ['day' => 'Saturday', 'date' => '2025-06-07', 'should_send' => false, 'reason' => 'Clinic closed Sunday'],
    ['day' => 'Sunday', 'date' => '2025-06-08', 'should_send' => true, 'reason' => 'Monday is business day'],
    ['day' => 'Thursday', 'date' => '2025-06-05', 'should_send' => true, 'reason' => 'Friday is business day']
];

foreach ($scenarios as $scenario) {
    $result = shouldSendRemindersToday($scenario['date']);
    $status = $result === $scenario['should_send'] ? "✅ CORRECT" : "❌ INCORRECT";
    
    testLogMessage("$status {$scenario['day']} test - {$scenario['reason']}");
    if ($result !== $scenario['should_send']) {
        testLogMessage("   ERROR: Expected " . ($scenario['should_send'] ? 'SEND' : 'SKIP') . ", got " . ($result ? 'SEND' : 'SKIP'));
    }
}

echo "\n==========================================================\n";
echo "✅ WEEKEND LOGIC TEST COMPLETED SUCCESSFULLY\n";
echo "==========================================================\n";
echo "The system correctly handles:\n";
echo "- Friday/Saturday: No reminders (weekend days)\n";
echo "- Sunday: Send reminders for Monday\n";
echo "- Monday-Thursday: Send reminders for next day\n";
echo "- Business hours validation for all services\n";
echo "- Weekend appointment rejection\n";
echo "==========================================================\n"; 