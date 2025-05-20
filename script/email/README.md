# DK Dental Studio - Appointment Reminder System

> **IMPORTANT: The database-based reminder system has been replaced with a Google Calendar-based implementation.**
> The old files are kept for reference only and can be safely removed.

## Current Implementation: Google Calendar-Based Reminders

The current reminder system reads appointments directly from Google Calendar and sends reminder emails to clients with appointments scheduled for the following day.

### Components

1. **Google Calendar API**: Source of appointment data
2. **Reminder Script**: `google_calendar_reminders.php` - Retrieves appointments and sends emails
3. **Shell Script**: `run_google_calendar_reminders.sh` - Runner for the reminder script
4. **Cron Job**: Runs the reminder script automatically once per day

### Setup Instructions

#### 1. File Permissions

Ensure the scripts have proper execution permissions:

```bash
chmod +x /path/to/script/email/run_google_calendar_reminders.sh
chmod 755 /path/to/script/email/google_calendar_reminders.php
```

#### 2. Set Up Cron Job

Add a cron job to run the reminder script once a day at 8:00 AM:

```bash
# Edit the crontab
crontab -e

# Add this line (adjust the path to your actual server path)
0 8 * * * /path/to/script/email/run_google_calendar_reminders.sh
```

#### 3. Testing the System

To test the system without waiting for the cron job, run:

```bash
php /path/to/script/email/google_calendar_reminders.php
```

### How It Works

1. The script runs daily at 8:00 AM
2. It retrieves Google Calendar events scheduled for the next day
3. For each event, it extracts the client's email address from the attendees
4. It sends a reminder email to each client about their upcoming appointment
5. Logs all activities to `google_calendar_reminder_log.txt`

### Benefits

- Always up-to-date with the latest calendar changes
- No duplicate data storage (appointments exist only in Google Calendar)
- Simpler architecture (one source of truth)
- Takes advantage of existing Google Calendar integration
- No separate database maintenance required

## Previous Implementation (Deprecated)

The previous database-based system has been deprecated and should not be used. See the "Deprecated" section at the bottom of this file for historical information.

### Troubleshooting

Check the log files for errors:
- `google_calendar_reminder_log.txt` - Logs from the reminder script
- `google_calendar_cron_execution.log` - Logs from the cron job execution

## Deprecated: Database-Based System

The following section is kept for historical purposes only. The database-based implementation has been replaced with the Google Calendar-based system described above.

### Components (All Deprecated)

1. **Database Table**: Stored appointment information for reminders
2. **Storage Script**: Saved appointment information when bookings were made
3. **Reminder Script**: Checked for upcoming appointments and sent emails
4. **Cron Job**: Ran the reminder script automatically once per day
