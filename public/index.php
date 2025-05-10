<?php
/**
 * Main entry point for the application
 * 
 * This file handles routing and dispatches to the appropriate controller
 */

// Include controllers
require_once __DIR__ . '/../src/controllers/UserController.php';

// Simple router
$path = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($path, PHP_URL_PATH);

// Remove trailing slash if it exists
if ($path !== '/' && substr($path, -1) === '/') {
    $path = rtrim($path, '/');
}

// Route to the appropriate controller/action
switch ($path) {
    case '/':
        // Home page
        include __DIR__ . '/../src/views/home.php';
        break;
        
    case '/user':
        // List users
        echo "User listing page (to be implemented)";
        break;
        
    case (preg_match('/^\/user\/(\d+)$/', $path, $matches) ? true : false):
        // User profile
        $userId = (int)$matches[1];
        $controller = new UserController();
        $controller->showProfile($userId);
        break;
        
    default:
        // 404 page
        http_response_code(404);
        include __DIR__ . '/../src/views/404.php';
        break;
}
