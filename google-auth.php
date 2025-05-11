<?php
/**
 * Redirect to the OAuth authorization page
 * This file is placed in the root directory for easier access
 */
header('Location: ' . __DIR__ . '/vendor/google/oauth/auth.php');
exit;
?> 