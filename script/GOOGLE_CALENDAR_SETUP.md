# Google Calendar Integration Setup Guide

This document explains how to set up the Google Calendar integration for the DK Dental Studio appointment booking system.

## Prerequisites

- A Google account with administrative access to the Google Cloud Console
- A Google Calendar with separate calendars for different services (optional)

## Google Cloud Console Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API" and select it
   - Click "Enable"

4. Create OAuth 2.0 credentials:
   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application" as the application type
   - Add your domain to the authorized JavaScript origins (e.g., https://www.dkdental.au)
   - Add your domain to the authorized redirect URIs (e.g., https://www.dkdental.au/appointment-calendar.html)
   - Click "Create"
   - Note down the Client ID and Client Secret

5. Create an API Key:
   - In the "Credentials" page, click "Create Credentials" > "API Key"
   - Restrict the API key to only the Google Calendar API
   - Restrict the API key to your domain
   - Note down the API Key

## Configuration

1. Open `js/google-calendar.js` and update the following constants:
   ```javascript
   const GOOGLE_API_KEY = 'YOUR_API_KEY'; // Replace with your API key
   const GOOGLE_CLIENT_ID = 'YOUR_CLIENT_ID'; // Replace with your Client ID
   const CALENDAR_ID = {
     'dentures': 'primary', // Replace with actual calendar ID for dentures
     'repairs': 'primary',  // Replace with actual calendar ID for repairs
     'mouthguards': 'primary' // Replace with actual calendar ID for mouthguards
   };
   ```

2. For better organization, you can create separate Google Calendars for each service type. To find a calendar's ID:
   - Go to [Google Calendar](https://calendar.google.com/)
   - Click the three dots next to the calendar name
   - Select "Settings and sharing"
   - Scroll down to "Integrate calendar"
   - Copy the Calendar ID (it looks like an email address)

## Email Setup for Fallback Booking

The fallback booking system uses PHP's mail() function to send emails. Make sure your server has PHP mail configured correctly. If not, you may need to modify the `api/booking-fallback.php` file to use a different email sending method.

## Testing the Integration

1. Navigate to `appointment-calendar.html`
2. Select a service
3. The calendar should load and show available dates
4. Click on a date to see available time slots
5. Click on a time slot to see the booking form
6. Fill out the form and submit

## Troubleshooting

### Calendar Not Loading

- Check browser console for errors
- Verify that your API key and client ID are correct
- Ensure the Google Calendar API is enabled in your Google Cloud Console
- Check that your domain is in the authorized JavaScript origins

### Authentication Issues

- Make sure your OAuth consent screen is configured properly
- Verify that your domain is in the authorized JavaScript origins
- Check if you need to go through the verification process for the OAuth consent screen

### Booking Not Working

- Check browser console for errors
- Verify that the calendar ID is correct
- Make sure the user has permission to create events on the calendar
- Test the fallback booking system to ensure it's working properly

## Customization

### Service Duration

You can change the duration of each service type by modifying the `SERVICE_DURATION` constant in `js/google-calendar.js`:

```javascript
const SERVICE_DURATION = {
  'dentures': 45,  // 45 minutes
  'repairs': 30,   // 30 minutes
  'mouthguards': 30 // 30 minutes
};
```

### Business Hours

Business hours are defined in the `generateTimeSlots` function in `js/google-calendar.js`. Modify this function to change the available hours for different days and services.

### Calendar Appearance

The calendar appearance is controlled by CSS in the `createCalendarHTML` function. You can modify this function to change the look and feel of the calendar.

## Next Steps

- Implement email reminders for appointments (requires server-side scheduling)
- Add option for patients to cancel or reschedule appointments
- Integrate with a CRM system to track patient interactions
- Add SMS notifications for appointment reminders

## Support

If you need assistance with the integration, please contact the developer at support@aaa-city.com. 