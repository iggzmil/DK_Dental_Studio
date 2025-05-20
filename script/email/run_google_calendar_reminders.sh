#!/bin/bash
#
# Google Calendar Appointment Reminder Script
# Run this script from a cron job to send reminder emails for appointments in Google Calendar
# Recommended to run at 8:00 AM daily

# Go to the script directory
cd "$(dirname "$0")" || exit

# Set environment variables
SCRIPT_DIR="$(pwd)"
LOG_FILE="$SCRIPT_DIR/google_calendar_cron_execution.log"

# Log start of execution
echo "$(date): Starting Google Calendar reminder script" >> "$LOG_FILE"

# Run the PHP script
php "$SCRIPT_DIR/google_calendar_reminders.php"

# Check execution status
if [ $? -eq 0 ]; then
    echo "$(date): Google Calendar reminder emails processed successfully" >> "$LOG_FILE"
    exit 0
else
    echo "$(date): Error processing Google Calendar reminder emails" >> "$LOG_FILE"
    exit 1
fi 