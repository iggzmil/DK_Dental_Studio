#!/bin/bash
#
# Appointment Reminder Email Sender Script
# Run this script from a cron job to send reminder emails

# Go to the script directory
cd "$(dirname "$0")" || exit

# Set environment variables
SCRIPT_DIR="$(pwd)"
LOG_FILE="$SCRIPT_DIR/cron_execution.log"

# Log start of execution
echo "$(date): Starting reminder email script" >> "$LOG_FILE"

# Run the PHP script
php "$SCRIPT_DIR/send_appointment_reminders.php"

# Check execution status
if [ $? -eq 0 ]; then
    echo "$(date): Reminder emails processed successfully" >> "$LOG_FILE"
    exit 0
else
    echo "$(date): Error processing reminder emails" >> "$LOG_FILE"
    exit 1
fi 