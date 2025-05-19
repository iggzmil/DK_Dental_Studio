<?php
/**
 * Save Appointment Reminder API
 * 
 * This script receives appointment data from the front-end 
 * and stores it in the database for reminder emails.
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set headers for JSON response
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Access-Control-Allow-Origin: *'); // Allow cross-origin requests
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include the appointment storage functionality
require_once __DIR__ . '/store_appointment.php';

// Allow POST requests only
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode([
        'success' => false,
        'error' => 'Method not allowed'
    ]);
    exit;
}

// Get the JSON data from the request
$jsonData = file_get_contents('php://input');
$data = json_decode($jsonData, true);

// Log the received data for debugging
logMessage('Received reminder request data: ' . $jsonData);

// Validate required data
if (!isset($data['datetime']) || !isset($data['email'])) {
    http_response_code(400); // Bad Request
    echo json_encode([
        'success' => false,
        'error' => 'Missing required data'
    ]);
    exit;
}

// Extract data
$datetime = $data['datetime'];
$email = $data['email'];
$firstName = isset($data['firstName']) ? $data['firstName'] : '';
$service = isset($data['service']) ? $data['service'] : '';

// Store the appointment
if (storeAppointmentForReminder($datetime, $email, $firstName, $service)) {
    // Return success response
    echo json_encode([
        'success' => true,
        'message' => 'Reminder scheduled successfully'
    ]);
} else {
    // Return error response
    http_response_code(500); // Internal Server Error
    echo json_encode([
        'success' => false,
        'error' => 'Failed to schedule reminder'
    ]);
} 