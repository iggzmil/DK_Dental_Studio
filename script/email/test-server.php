<?php
/**
 * Server Test Script
 * 
 * This script tests the server configuration and dependencies
 * required for the contact form email functionality.
 */

// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Set content type
header('Content-Type: text/html; charset=UTF-8');

// Function to check if a file exists and is readable
function checkFile($path, $description) {
    echo "<tr>";
    echo "<td>{$description}</td>";
    
    if (file_exists($path) && is_readable($path)) {
        echo "<td class='text-success'>Available</td>";
        return true;
    } else {
        echo "<td class='text-danger'>Not found or not readable</td>";
        return false;
    }
    
    echo "</tr>";
}

// Function to check PHP extension
function checkExtension($extension, $description) {
    echo "<tr>";
    echo "<td>{$description}</td>";
    
    if (extension_loaded($extension)) {
        echo "<td class='text-success'>Enabled</td>";
        return true;
    } else {
        echo "<td class='text-danger'>Not enabled</td>";
        return false;
    }
    
    echo "</tr>";
}

// Function to check if a class exists
function checkClass($class, $description) {
    echo "<tr>";
    echo "<td>{$description}</td>";
    
    if (class_exists($class)) {
        echo "<td class='text-success'>Available</td>";
        return true;
    } else {
        echo "<td class='text-danger'>Not found</td>";
        return false;
    }
    
    echo "</tr>";
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Server Configuration Test</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <style>
        body {
            padding: 20px;
            font-family: Arial, sans-serif;
            background-color: #f8f9fa;
        }
        .container {
            background-color: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
            max-width: 800px;
            margin: 30px auto;
        }
        h1 {
            color: #0576ee;
            margin-bottom: 20px;
        }
        .table th {
            background-color: #f1f1f1;
        }
        .text-success {
            color: #28a745;
        }
        .text-danger {
            color: #dc3545;
        }
        .text-warning {
            color: #ffc107;
        }
        pre {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Server Configuration Test</h1>
        
        <div class="card mb-4">
            <div class="card-header">
                <h4>PHP Information</h4>
            </div>
            <div class="card-body">
                <table class="table table-bordered">
                    <tbody>
                        <?php
                        // Check PHP version
                        echo "<tr>";
                        echo "<td>PHP Version</td>";
                        echo "<td>" . PHP_VERSION . "</td>";
                        echo "</tr>";
                        
                        // Check server software
                        echo "<tr>";
                        echo "<td>Server Software</td>";
                        echo "<td>" . $_SERVER['SERVER_SOFTWARE'] . "</td>";
                        echo "</tr>";
                        
                        // Check document root
                        echo "<tr>";
                        echo "<td>Document Root</td>";
                        echo "<td>" . $_SERVER['DOCUMENT_ROOT'] . "</td>";
                        echo "</tr>";
                        
                        // Check script filename
                        echo "<tr>";
                        echo "<td>Script Filename</td>";
                        echo "<td>" . $_SERVER['SCRIPT_FILENAME'] . "</td>";
                        echo "</tr>";
                        ?>
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="card mb-4">
            <div class="card-header">
                <h4>Required Extensions</h4>
            </div>
            <div class="card-body">
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>Extension</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        checkExtension('curl', 'cURL Extension');
                        checkExtension('json', 'JSON Extension');
                        checkExtension('openssl', 'OpenSSL Extension');
                        checkExtension('fileinfo', 'Fileinfo Extension');
                        ?>
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="card mb-4">
            <div class="card-header">
                <h4>Required Files</h4>
            </div>
            <div class="card-body">
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>File</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        checkFile(__DIR__ . '/gmail-sender.php', 'Gmail Sender Script');
                        checkFile(__DIR__ . '/contact-form-handler.php', 'Contact Form Handler');
                        checkFile(__DIR__ . '/session-handler.php', 'Session Handler');
                        checkFile(__DIR__ . '/contact-form.js', 'Contact Form JavaScript');
                        
                        // Check vendor files
                        checkFile(__DIR__ . '/../../vendor/autoload.php', 'Composer Autoload');
                        checkFile(__DIR__ . '/../../vendor/google/oauth/GoogleTokenManager.php', 'Google Token Manager');
                        
                        // Check token file
                        $tokenFile = __DIR__ . '/../../vendor/google/oauth/secure/google_refresh_token.json';
                        echo "<tr>";
                        echo "<td>OAuth Token File</td>";
                        if (file_exists($tokenFile)) {
                            if (is_readable($tokenFile)) {
                                echo "<td class='text-success'>Available and readable</td>";
                            } else {
                                echo "<td class='text-warning'>Available but not readable</td>";
                            }
                        } else {
                            echo "<td class='text-danger'>Not found</td>";
                        }
                        echo "</tr>";
                        ?>
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="card mb-4">
            <div class="card-header">
                <h4>Google API Classes</h4>
            </div>
            <div class="card-body">
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>Class</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        checkClass('Google_Client', 'Google_Client');
                        checkClass('Google_Service_Gmail', 'Google_Service_Gmail');
                        checkClass('Google_Service_Gmail_Message', 'Google_Service_Gmail_Message');
                        ?>
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h4>Error Log (Last 10 Lines)</h4>
            </div>
            <div class="card-body">
                <pre><?php
                    $errorLog = ini_get('error_log');
                    if (file_exists($errorLog) && is_readable($errorLog)) {
                        $logContent = shell_exec("tail -n 10 " . escapeshellarg($errorLog));
                        echo htmlspecialchars($logContent);
                    } else {
                        echo "Error log not accessible";
                    }
                ?></pre>
            </div>
        </div>
    </div>
</body>
</html>
