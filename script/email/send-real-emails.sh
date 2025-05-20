#!/bin/bash
#
# Send Real Emails Script - For testing the actual email delivery
#
# Usage: ./send-real-emails.sh [date]
#   date - Optional date in YYYY-MM-DD format. If not provided, will use tomorrow's date.

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PHP_SCRIPT="$SCRIPT_DIR/send-real-emails.php"

# Check if the PHP script exists
if [ ! -f "$PHP_SCRIPT" ]; then
    echo "Error: PHP script not found at $PHP_SCRIPT"
    exit 1
fi

# Determine if a test date was provided
if [ $# -eq 1 ]; then
    TEST_DATE=$1
    
    # Validate date format
    if [[ ! $TEST_DATE =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
        echo "Error: Invalid date format. Please use YYYY-MM-DD format."
        exit 1
    fi
    
    echo "Using test date: $TEST_DATE"
    TEST_DATE_PARAM="&date=$TEST_DATE"
else
    TEST_DATE_PARAM=""
    echo "Using tomorrow's date"
fi

# Confirm before sending real emails
echo ""
echo "⚠️  WARNING: This will send REAL emails to clients with appointments! ⚠️"
echo "Are you sure you want to continue? (y/N)"
read -r CONFIRM

if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 0
fi

echo ""
echo "🚀 Running PHP script to send real emails..."
echo ""

# Run the PHP script with confirmation code
php "$PHP_SCRIPT?confirm=SendRealEmails$TEST_DATE_PARAM"

exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo ""
    echo "✅ Script completed successfully."
else
    echo ""
    echo "❌ Script encountered errors. Exit code: $exit_code"
fi 