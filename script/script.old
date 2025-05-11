<?php
/**
 * API Test for Token Retrieval
 * 
 * This script tests the token API directly
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>Token API Test</h1>";

// Define the token file path
$tokenFile = '/var/www/DK_Dental_Studio/vendor/google/oauth/secure/google_refresh_token.json';

echo "<h2>1. Direct File Access Test</h2>";

// Check if the file exists
if (file_exists($tokenFile)) {
    echo "<p style='color:green;'>✓ Token file exists</p>";
    
    // Check if the file is readable
    if (is_readable($tokenFile)) {
        echo "<p style='color:green;'>✓ Token file is readable</p>";
        
        // Try to read the token
        try {
            $tokenData = json_decode(file_get_contents($tokenFile), true);
            if (isset($tokenData['access_token'])) {
                echo "<p style='color:green;'>✓ Access token found in file</p>";
                echo "<p>Access token starts with: " . substr($tokenData['access_token'], 0, 10) . "...</p>";
            } else {
                echo "<p style='color:red;'>✗ No access token found in file</p>";
            }
        } catch (Exception $e) {
            echo "<p style='color:red;'>✗ Error reading token file: " . htmlspecialchars($e->getMessage()) . "</p>";
        }
    } else {
        echo "<p style='color:red;'>✗ Token file is not readable</p>";
    }
} else {
    echo "<p style='color:red;'>✗ Token file does not exist</p>";
}

echo "<h2>2. API Access Test</h2>";

// Test the API
$protocol = ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] != 'off') || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
$apiUrl = $protocol . $_SERVER['HTTP_HOST'] . '/api/get-access-token.php';
echo "<p>Testing API URL: " . htmlspecialchars($apiUrl) . "</p>";

// Make the API request
$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, false);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true); // Follow redirects
$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "<p>API Response Status: " . $status . "</p>";

if ($status == 200) {
    echo "<p style='color:green;'>✓ API returned 200 OK</p>";
    
    // Parse the response
    $data = json_decode($response, true);
    if ($data) {
        echo "<p style='color:green;'>✓ API returned valid JSON</p>";
        
        if (isset($data['success']) && $data['success'] === true) {
            echo "<p style='color:green;'>✓ API returned success=true</p>";
            
            if (isset($data['access_token'])) {
                echo "<p style='color:green;'>✓ API returned an access token</p>";
                echo "<p>Access token starts with: " . substr($data['access_token'], 0, 10) . "...</p>";
            } else {
                echo "<p style='color:red;'>✗ API did not return an access token</p>";
            }
        } else {
            echo "<p style='color:red;'>✗ API returned success=false</p>";
            
            if (isset($data['error'])) {
                echo "<p>Error: " . htmlspecialchars($data['error']) . "</p>";
            }
            
            if (isset($data['message'])) {
                echo "<p>Message: " . htmlspecialchars($data['message']) . "</p>";
            }
        }
    } else {
        echo "<p style='color:red;'>✗ API did not return valid JSON</p>";
        echo "<pre>" . htmlspecialchars($response) . "</pre>";
    }
} else {
    echo "<p style='color:red;'>✗ API returned error status: " . $status . "</p>";
    echo "<pre>" . htmlspecialchars($response) . "</pre>";
}

echo "<h2>3. JavaScript Fetch Test</h2>";
?>

<div id="js-test-result">Running test...</div>

<script>
    // Test the API using JavaScript fetch
    const apiUrl = window.location.protocol + '//' + window.location.host + '/api/get-access-token.php';
    fetch(apiUrl)
        .then(response => {
            document.getElementById('js-test-result').innerHTML += `<p>Response status: ${response.status} ${response.statusText}</p>`;
            return response.json();
        })
        .then(data => {
            if (data.success) {
                document.getElementById('js-test-result').innerHTML += `<p style="color:green;">✓ Success! Token received.</p>`;
                document.getElementById('js-test-result').innerHTML += `<p>Token starts with: ${data.access_token.substring(0, 10)}...</p>`;
            } else {
                document.getElementById('js-test-result').innerHTML += `<p style="color:red;">✗ Error: ${data.error}</p>`;
                document.getElementById('js-test-result').innerHTML += `<p>Message: ${data.message}</p>`;
            }
        })
        .catch(error => {
            document.getElementById('js-test-result').innerHTML += `<p style="color:red;">✗ Fetch error: ${error.message}</p>`;
        });
</script> 