#!/bin/bash
#
# DEPRECATED - THIS SCRIPT IS NO LONGER USED
# 
# The appointment reminder system now uses Google Calendar directly
# instead of this database-based implementation.
# 
# This file is kept for reference only and can be safely removed.

# Original script commented out below:
: '
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
'

echo "DEPRECATED: This reminder system has been replaced with Google Calendar-based reminders" >> "$SCRIPT_DIR/cron_execution.log"
exit 0 