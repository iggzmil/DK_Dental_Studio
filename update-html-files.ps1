# PowerShell script to add the function.js script to all HTML files except contact-us.html

# Get all HTML files in the current directory
$htmlFiles = Get-ChildItem -Path . -Filter "*.html" -File | Where-Object { $_.Name -ne "contact-us.html" -and $_.Name -ne "api-test.html" -and $_.Name -ne "calendar-test.html" -and $_.Name -ne "php-test.html" -and $_.Name -ne "appointment-sample.html" }

foreach ($file in $htmlFiles) {
    Write-Host "Processing $($file.Name)..."
    
    # Read the file content
    $content = Get-Content -Path $file.FullName -Raw
    
    # Check if the file already has the function.js script
    if ($content -match "js/function.js") {
        Write-Host "  - Already has function.js script, skipping."
        continue
    }
    
    # Find the position to insert the script
    if ($content -match "<!-- Template Scripts \(Do not remove\)-->\s*\n\s*<script src=""js/custom.js""></script>") {
        # Insert after custom.js
        $newContent = $content -replace "<!-- Template Scripts \(Do not remove\)-->\s*\n\s*<script src=""js/custom.js""></script>", "<!-- Template Scripts (Do not remove)-->`n    <script src=""js/custom.js""></script>`n`n    <!-- Chat Icon Script -->`n    <script src=""js/function.js""></script>"
        
        # Write the updated content back to the file
        Set-Content -Path $file.FullName -Value $newContent
        Write-Host "  - Added function.js script after custom.js"
    }
    else {
        # Try to find a different insertion point
        if ($content -match "<!-- JS Global Compulsory \(Do not remove\)-->\s*\n\s*<script src=""js/jquery-3.7.1.min.js""></script>") {
            # Insert before jQuery
            $newContent = $content -replace "<!-- JS Global Compulsory \(Do not remove\)-->\s*\n\s*<script src=""js/jquery-3.7.1.min.js""></script>", "<!-- Chat Icon Script -->`n    <script src=""js/function.js""></script>`n`n    <!-- JS Global Compulsory (Do not remove)-->`n    <script src=""js/jquery-3.7.1.min.js""></script>"
            
            # Write the updated content back to the file
            Set-Content -Path $file.FullName -Value $newContent
            Write-Host "  - Added function.js script before jQuery"
        }
        else {
            Write-Host "  - Could not find a suitable insertion point, skipping."
        }
    }
}

Write-Host "Done!"
