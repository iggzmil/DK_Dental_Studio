<?php
/**
 * User Controller
 * 
 * Sample controller for user-related actions
 */
require_once __DIR__ . '/../models/User.php';

class UserController
{
    /**
     * Get user by ID
     * 
     * @param int $id User ID
     * @return User|null User object or null if not found
     */
    public function getUser($id)
    {
        // This is a sample implementation
        // In a real application, you would fetch from a database
        $users = [
            1 => new User(1, 'John Doe', 'john@example.com'),
            2 => new User(2, 'Jane Smith', 'jane@example.com'),
            3 => new User(3, 'Bob Johnson', 'bob@example.com')
        ];
        
        return isset($users[$id]) ? $users[$id] : null;
    }
    
    /**
     * Render user profile view
     * 
     * @param int $id User ID
     * @return string HTML content
     */
    public function showProfile($id)
    {
        $user = $this->getUser($id);
        
        if (!$user) {
            // User not found
            http_response_code(404);
            include __DIR__ . '/../views/404.php';
            return;
        }
        
        // Pass user data to the view
        include __DIR__ . '/../views/user_profile.php';
    }
}
