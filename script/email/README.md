# DK Dental Studio Contact Form Email System

This directory contains the PHP scripts and JavaScript files needed to handle contact form submissions from the DK Dental Studio website and send emails using the Gmail API with OAuth authentication.

## Files

- `contact-form-handler.php`: Processes form submissions and sends emails
- `gmail-sender.php`: Core functionality for sending emails via Gmail API
- `session-handler.php`: Manages sessions and CSRF protection
- `contact-form.js`: Client-side JavaScript for form submission and validation
- `test-email.php`: Test script for sending emails manually

## Implementation Details

### Authentication

The system uses OAuth 2.0 to authenticate with the Gmail API. The authentication flow is handled by the `GoogleTokenManager` class located in `vendor/google/oauth/GoogleTokenManager.php`. The token is stored in a secure location on the webserver.

### Email Sending

Emails are sent using the Gmail API through the authenticated user's account. The system supports HTML emails and file attachments.

### Security

- CSRF protection is implemented to prevent cross-site request forgery attacks
- Input validation is performed on all form fields
- Error handling and logging are implemented

## Usage

### Contact Form

The contact form on the website (`contact-us.html`) is configured to submit to the `contact-form-handler.php` script via AJAX. The form includes the following fields:

- First Name
- Email
- Phone Number
- Subject
- Message

### Testing

You can test the email functionality using the `test-email.php` script, which provides a simple web interface for sending test emails.

## Dependencies

- Google API PHP Client Library
- PHP 7.4 or higher
- JavaScript (ES6)

## Server Requirements

- PHP with cURL extension enabled
- Access to the secure token directory
- Proper file permissions for reading/writing token files

## Troubleshooting

If emails are not being sent, check the following:

1. Verify that the OAuth token is valid and not expired
2. Check server error logs for any PHP errors
3. Ensure the Gmail API is enabled in the Google Cloud Console
4. Verify that the authenticated user has permission to send emails

## Live Implementation

This system is designed to work on the live webserver where the OAuth token is stored in the secure directory. Local testing may not work without proper configuration.
