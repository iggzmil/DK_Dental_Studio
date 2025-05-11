<?php
/**
 * Detailed test file for Google Reviews API
 * This provides extensive debugging information about your server
 */

// Set content type to plain text for easy reading in browser
header('Content-Type: text/plain');

echo "DK Dental Studio - Google Reviews API Diagnostic Tool\n";
echo "===================================================\n\n";

echo "SERVER INFORMATION:\n";
echo "- PHP Version: " . phpversion() . "\n";
echo "- Server Software: " . $_SERVER['SERVER_SOFTWARE'] . "\n";
echo "- Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "\n";
echo "- Current Script: " . $_SERVER['SCRIPT_FILENAME'] . "\n";
echo "- Current Directory: " . getcwd() . "\n";
echo "- API File Path: " . __DIR__ . "/api/reviews.php\n";
echo "- PHP Extensions: " . implode(', ', get_loaded_extensions()) . "\n";
echo "- cURL Enabled: " . (function_exists('curl_init') ? 'Yes' : 'No') . "\n\n";

// Check if API directory exists
$apiDir = __DIR__ . '/api';
echo "API DIRECTORY CHECK:\n";
echo "- API Directory Path: $apiDir\n";
echo "- Directory Exists: " . (is_dir($apiDir) ? 'Yes' : 'No') . "\n";
if (is_dir($apiDir)) {
    echo "- Directory Contents:\n";
    $files = scandir($apiDir);
    foreach ($files as $file) {
        if ($file != '.' && $file != '..') {
            echo "  - $file (" . filesize("$apiDir/$file") . " bytes)\n";
        }
    }
}
echo "\n";

// Check for the API endpoint file
$apiEndpoint = __DIR__ . '/api/reviews.php';
echo "API ENDPOINT CHECK:\n";
echo "- Endpoint File: $apiEndpoint\n";
echo "- File Exists: " . (file_exists($apiEndpoint) ? 'Yes' : 'No') . "\n";
if (file_exists($apiEndpoint)) {
    echo "- File Size: " . filesize($apiEndpoint) . " bytes\n";
    echo "- File Permissions: " . substr(sprintf('%o', fileperms($apiEndpoint)), -4) . "\n";
}
echo "\n";

// Check for token file
echo "TOKEN FILE CHECK:\n";
$tokenPaths = [
    __DIR__ . '/secure/google_refresh_token.json',
    __DIR__ . '/secure/token.json',
    dirname(__DIR__) . '/secure/google_refresh_token.json',
    dirname(__DIR__) . '/secure/token.json'
];
foreach ($tokenPaths as $path) {
    echo "- Path: $path\n";
    echo "  - Exists: " . (file_exists($path) ? 'Yes' : 'No') . "\n";
    if (file_exists($path)) {
        echo "  - Size: " . filesize($path) . " bytes\n";
        echo "  - Permissions: " . substr(sprintf('%o', fileperms($path)), -4) . "\n";
        $token = json_decode(file_get_contents($path), true);
        if (json_last_error() === JSON_ERROR_NONE) {
            echo "  - Contains Valid JSON: Yes\n";
            echo "  - Has Access Token: " . (isset($token['access_token']) ? 'Yes' : 'No') . "\n";
            echo "  - Has Refresh Token: " . (isset($token['refresh_token']) ? 'Yes' : 'No') . "\n";
        } else {
            echo "  - Contains Valid JSON: No (Error: " . json_last_error_msg() . ")\n";
        }
    }
}
echo "\n";

// Now let's test a direct call to the API
echo "DIRECT API TEST:\n";
$apiUrl = 'http://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']) . '/api/reviews.php';
echo "- API URL: $apiUrl\n";
echo "- Testing direct API call...\n\n";

// Make the request
$context = stream_context_create([
    'http' => [
        'ignore_errors' => true,
        'method' => 'GET',
        'header' => "Accept: application/json\r\n"
    ]
]);

$response = @file_get_contents($apiUrl, false, $context);
$responseHeaders = $http_response_header ?? [];

echo "RESPONSE HEADERS:\n";
foreach ($responseHeaders as $header) {
    echo "- $header\n";
}
echo "\n";

if ($response !== false) {
    echo "RESPONSE BODY (first 500 chars):\n";
    echo substr($response, 0, 500) . (strlen($response) > 500 ? "...\n" : "\n");
    echo "\n";
    
    // Try to parse as JSON
    $data = json_decode($response, true);
    if (json_last_error() === JSON_ERROR_NONE) {
        echo "PARSED JSON RESPONSE:\n";
        echo "- Response is valid JSON: Yes\n";
        echo "- Error flag: " . ($data['error'] ? 'Yes' : 'No') . "\n";
        echo "- Message: " . ($data['message'] ?? 'None') . "\n";
        if (isset($data['debug'])) {
            echo "- Debug Info:\n";
            foreach ($data['debug'] as $key => $value) {
                echo "  - $key: ";
                if (is_array($value)) {
                    echo "\n";
                    foreach ($value as $k => $v) {
                        if (is_array($v)) {
                            echo "    - $k: " . json_encode($v) . "\n";
                        } else {
                            echo "    - $k: $v\n";
                        }
                    }
                } else {
                    echo "$value\n";
                }
            }
        }
        
        if (isset($data['reviews']) && is_array($data['reviews'])) {
            echo "- Reviews Count: " . count($data['reviews']) . "\n";
            if (count($data['reviews']) > 0) {
                echo "- First Review Author: " . ($data['reviews'][0]['author_name'] ?? 'Unknown') . "\n";
            }
        } else {
            echo "- Reviews: None or invalid format\n";
        }
    } else {
        echo "RESPONSE IS NOT VALID JSON:\n";
        echo "- JSON Error: " . json_last_error_msg() . "\n";
        echo "- Response appears to be: " . (strpos($response, '<?php') === 0 ? 'PHP code (not executed)' : 'Unknown format') . "\n";
    }
} else {
    echo "ERROR: Failed to get response from API endpoint\n";
}

echo "\nFILE ACCESS TEST:\n";
$testFile = __DIR__ . '/test-file-' . time() . '.txt';
echo "- Creating test file at: $testFile\n";
$writeResult = @file_put_contents($testFile, 'Test content');
echo "- Write result: " . ($writeResult !== false ? 'Success' : 'Failed') . "\n";
if ($writeResult !== false) {
    echo "- Reading test file... ";
    $content = @file_get_contents($testFile);
    echo (($content === 'Test content') ? 'Success' : 'Failed') . "\n";
    echo "- Deleting test file... ";
    echo (@unlink($testFile) ? 'Success' : 'Failed') . "\n";
}

echo "\nDiagnostic test completed at: " . date('Y-m-d H:i:s') . "\n";
echo "======================= END OF REPORT =======================\n"; 