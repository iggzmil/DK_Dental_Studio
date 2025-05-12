<?php
/**
 * Check Token Manager Script for DK Dental Studio
 * 
 * This script checks the existing GoogleTokenManager class
 */

// Set error reporting to maximum
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set content type
header('Content-Type: text/html');

// Check if the vendor GoogleTokenManager exists
$vendorTokenManagerPath = __DIR__ . '/../../vendor/google/oauth/GoogleTokenManager.php';
$vendorTokenManagerExists = file_exists($vendorTokenManagerPath);
$vendorTokenManagerContent = $vendorTokenManagerExists ? file_get_contents($vendorTokenManagerPath) : '';

// Check if the minimal-gmail-api GoogleTokenManager exists
$minimalTokenManagerPath = __DIR__ . '/minimal-gmail-api/GoogleTokenManager.php';
$minimalTokenManagerExists = file_exists($minimalTokenManagerPath);
$minimalTokenManagerContent = $minimalTokenManagerExists ? file_get_contents($minimalTokenManagerPath) : '';

// Check if our enhanced GoogleTokenManager exists
$enhancedTokenManagerPath = __DIR__ . '/GoogleTokenManager.php';
$enhancedTokenManagerExists = file_exists($enhancedTokenManagerPath);
$enhancedTokenManagerContent = $enhancedTokenManagerExists ? file_get_contents($enhancedTokenManagerPath) : '';

// Check if the token file exists
$tokenFilePath = __DIR__ . '/../../vendor/google/oauth/secure/google_refresh_token.json';
$tokenFileExists = file_exists($tokenFilePath);
$tokenFileContent = $tokenFileExists ? file_get_contents($tokenFilePath) : '';
?>
<!DOCTYPE html>
<html>
<head>
    <title>Check Token Manager</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 20px;
            max-width: 800px;
        }
        h1 {
            color: #0576ee;
        }
        .section {
            margin-bottom: 20px;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .success {
            color: green;
        }
        .error {
            color: red;
        }
        pre {
            background-color: #f5f5f5;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
            max-height: 300px;
        }
    </style>
</head>
<body>
    <h1>Check Token Manager</h1>
    
    <div class="section">
        <h2>Vendor GoogleTokenManager</h2>
        <?php if ($vendorTokenManagerExists): ?>
            <p class="success">Vendor GoogleTokenManager exists at: <?php echo htmlspecialchars($vendorTokenManagerPath); ?></p>
            <p>File size: <?php echo filesize($vendorTokenManagerPath); ?> bytes</p>
            <p>Last modified: <?php echo date('Y-m-d H:i:s', filemtime($vendorTokenManagerPath)); ?></p>
            <details>
                <summary>View content</summary>
                <pre><?php echo htmlspecialchars($vendorTokenManagerContent); ?></pre>
            </details>
        <?php else: ?>
            <p class="error">Vendor GoogleTokenManager does not exist</p>
        <?php endif; ?>
    </div>
    
    <div class="section">
        <h2>Minimal GoogleTokenManager</h2>
        <?php if ($minimalTokenManagerExists): ?>
            <p class="success">Minimal GoogleTokenManager exists at: <?php echo htmlspecialchars($minimalTokenManagerPath); ?></p>
            <p>File size: <?php echo filesize($minimalTokenManagerPath); ?> bytes</p>
            <p>Last modified: <?php echo date('Y-m-d H:i:s', filemtime($minimalTokenManagerPath)); ?></p>
            <details>
                <summary>View content</summary>
                <pre><?php echo htmlspecialchars($minimalTokenManagerContent); ?></pre>
            </details>
        <?php else: ?>
            <p class="error">Minimal GoogleTokenManager does not exist</p>
        <?php endif; ?>
    </div>
    
    <div class="section">
        <h2>Enhanced GoogleTokenManager</h2>
        <?php if ($enhancedTokenManagerExists): ?>
            <p class="success">Enhanced GoogleTokenManager exists at: <?php echo htmlspecialchars($enhancedTokenManagerPath); ?></p>
            <p>File size: <?php echo filesize($enhancedTokenManagerPath); ?> bytes</p>
            <p>Last modified: <?php echo date('Y-m-d H:i:s', filemtime($enhancedTokenManagerPath)); ?></p>
            <details>
                <summary>View content</summary>
                <pre><?php echo htmlspecialchars($enhancedTokenManagerContent); ?></pre>
            </details>
        <?php else: ?>
            <p class="error">Enhanced GoogleTokenManager does not exist</p>
        <?php endif; ?>
    </div>
    
    <div class="section">
        <h2>Token File</h2>
        <?php if ($tokenFileExists): ?>
            <p class="success">Token file exists at: <?php echo htmlspecialchars($tokenFilePath); ?></p>
            <p>File size: <?php echo filesize($tokenFilePath); ?> bytes</p>
            <p>Last modified: <?php echo date('Y-m-d H:i:s', filemtime($tokenFilePath)); ?></p>
            <details>
                <summary>View content</summary>
                <pre><?php echo htmlspecialchars($tokenFileContent); ?></pre>
            </details>
        <?php else: ?>
            <p class="error">Token file does not exist</p>
        <?php endif; ?>
    </div>
    
    <div class="section">
        <h2>Next Steps</h2>
        <p>Try using the <a href="generate-token.php">Generate Token</a> script to refresh or generate a new token.</p>
        <p>Then, try using the <a href="test-gmail-api.php">Gmail API Test</a> script to see if the new token works.</p>
    </div>
</body>
</html>
