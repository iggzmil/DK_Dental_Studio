# Google Cloud Console Configuration Guide

This guide provides step-by-step instructions for configuring your Google Cloud Console project to resolve the OAuth 403 access_denied error.

## Accessing Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Make sure you're logged in with the Google account that owns your project
3. Select your project from the dropdown at the top of the page

## Configuring OAuth Credentials

### Step 1: Edit Redirect URIs

1. In the left sidebar, click on "APIs & Services" → "Credentials"
2. Find your OAuth 2.0 Client ID (`593699947617-hulnksmaqujj6o0j1sob13klorehtspt.apps.googleusercontent.com`) in the list and click the edit (pencil) icon
3. Under "Authorized redirect URIs", make sure the following URI is listed exactly:
   ```
   https://dkdstudio.aaa-city.com/vendor/google/oauth/callback.php
   ```
4. If it's not there, click "ADD URI" and add it
5. If there's a similar but incorrect URI, edit or remove it
6. Click "SAVE" to apply your changes

### Step 2: Configure OAuth Consent Screen

1. In the left sidebar, click on "APIs & Services" → "OAuth consent screen"
2. Review the settings in the "OAuth consent screen" tab:
   - Check that the app name and user support email are correct
   - Verify that the authorized domains include `aaa-city.com`

3. Click on the "Scopes" tab and ensure the following scope is included:
   ```
   https://www.googleapis.com/auth/business.manage
   ```
   If it's not listed, click "ADD OR REMOVE SCOPES" and add it

4. If your app is in "Testing" mode, click on the "Test users" tab:
   - Make sure that the email address you're using to test the OAuth flow is listed
   - If not, click "ADD USERS" and add your email address

5. Click "SAVE AND CONTINUE" to apply your changes

### Step 3: Enable Required APIs

1. In the left sidebar, click on "APIs & Services" → "Library"
2. Search for "Business Profile API" and make sure it's enabled
3. If it's not enabled, click on it and then click "ENABLE"
4. Also verify that the "Google My Business API" is enabled if you're using it

## Testing Your Configuration

After making these changes, follow these steps to test your OAuth implementation:

1. Go to https://dkdstudio.aaa-city.com/google-auth.php
2. Enter the admin password (default: `dk-dental-2024`)
3. Click the "Authorize Google Access" button
4. You should be redirected to Google's consent screen
5. Sign in with your Google account and grant the requested permissions
6. You should be redirected back to your callback URL

If you're still encountering the 403 access_denied error, please check your server's error logs for more information. 