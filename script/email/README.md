# DK Dental Studio - Appointment Reminder System

This system sends automated reminder emails to clients 24 hours before their scheduled appointments.

## Components

1. **Database Table**: Stores appointment information for reminders
2. **Storage Script**: Saves appointment information when bookings are made
3. **Reminder Script**: Checks for upcoming appointments and sends emails
4. **Cron Job**: Runs the reminder script automatically once per day

## Setup Instructions

### 1. Database Setup

The database table has already been created with:

```sql
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    appointment_time TIMESTAMP WITH TIME ZONE NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    message TEXT,
    reminder_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2. File Permissions

Ensure the scripts have proper execution permissions:

```bash
chmod +x /path/to/script/email/run_reminder.sh
chmod 755 /path/to/script/email/*.php
```

### 3. Configure Database Credentials

Open the following files and update the database credentials if needed:
- `store_appointment.php`
- `send_appointment_reminders.php`

Update these lines in both files:
```php
$dbHost = 'localhost';
$dbName = 'dkds_mailing_list';
$dbUser = 'postgres';
$dbPass = ''; // Add password in production environment
```

### 4. Set Up Cron Job

Add a cron job to run the reminder script once a day. For example, to run it every day at 10:00 AM:

```bash
# Edit the crontab
crontab -e

# Add this line (adjust the path to your actual server path)
0 10 * * * /path/to/script/email/run_reminder.sh
```

### 5. Testing the System

To test the system:

1. **Test storing an appointment:**
   ```bash
   php store_appointment.php "2023-06-15T10:00:00" "test@example.com" "Test User" "Dentures Consultation"
   ```

2. **Test sending reminder emails:**
   ```bash
   php send_appointment_reminders.php
   ```

## Troubleshooting

Check the log files for errors:
- `reminder_log.txt` - Logs from the reminder script
- `appointment_storage_log.txt` - Logs from appointment storage
- `cron_execution.log` - Logs from the cron job execution

## Security Notes

1. Store database passwords securely in production environments
2. Consider adding IP restrictions or authentication to the APIs
3. Test email delivery to ensure messages aren't flagged as spam
