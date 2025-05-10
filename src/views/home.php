<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PHP Sample Project</title>
    <link rel="stylesheet" href="/public/css/style.css">
</head>
<body>
    <div class="container">
        <h1>PHP Sample Project</h1>
        
        <div class="profile-card">
            <h2>Welcome to the PHP Sample Project</h2>
            <p>This is a simple PHP project to demonstrate PHP development in VS Code.</p>
            <p>Try accessing these URLs:</p>
            <ul>
                <li><a href="/user/1">User 1 Profile</a></li>
                <li><a href="/user/2">User 2 Profile</a></li>
                <li><a href="/user/3">User 3 Profile</a></li>
                <li><a href="/user/999">Non-existent User (404)</a></li>
            </ul>
        </div>
        
        <div class="profile-card">
            <h2>PHP Information</h2>
            <p>PHP Version: <?php echo phpversion(); ?></p>
            <p>Extensions Enabled: <?php echo count(get_loaded_extensions()); ?></p>
        </div>
    </div>
    
    <script src="/public/js/main.js"></script>
</body>
</html>
