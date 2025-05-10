<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Profile</title>
    <link rel="stylesheet" href="/public/css/style.css">
</head>
<body>
    <div class="container">
        <h1>User Profile</h1>
        
        <div class="profile-card">
            <h2><?php echo htmlspecialchars($user->getName()); ?></h2>
            <p><strong>Email:</strong> <?php echo htmlspecialchars($user->getEmail()); ?></p>
            <p><strong>ID:</strong> <?php echo htmlspecialchars($user->getId()); ?></p>
        </div>
        
        <div class="actions">
            <a href="/" class="btn">Back to Home</a>
        </div>
    </div>
    
    <script src="/public/js/main.js"></script>
</body>
</html>
