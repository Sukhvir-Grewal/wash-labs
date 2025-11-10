// Run this script ONCE to get a Google OAuth2 refresh token for your calendar integration.
// Usage: node get-google-refresh-token.js

const { google } = require('googleapis');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

// SECURITY NOTE: This script is for developer use only during initial setup.
// The generated tokens should be immediately moved to your secure environment
// management system after generation.

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

function getAccessToken() {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      
      try {
        // Save to .env.local with restricted permissions
        const envPath = path.join(process.cwd(), '.env.local');
        const envContent = `GOOGLE_REFRESH_TOKEN=${token.refresh_token}\n`;
        
        // Write with restricted permissions (0600 - owner read/write only)
        fs.writeFileSync(envPath, envContent, { 
          mode: 0o600,
          flag: 'a' // Append mode to preserve other env vars
        });

        // Also save full token data to a separate secure file
        const tokenPath = path.join(process.cwd(), '.google-token.json');
        fs.writeFileSync(tokenPath, JSON.stringify(token, null, 2), { 
          mode: 0o600 // Restricted permissions
        });

        console.log('\nToken successfully saved!');
        console.log(`- Refresh token appended to ${envPath}`);
        console.log(`- Full token data saved to ${tokenPath}`);
        console.log('\nIMPORTANT: These files contain sensitive data.');
        console.log('- Add .google-token.json to .gitignore');
        console.log('- Move tokens to your secure environment management system');
        console.log('- Delete these local files after securing the tokens\n');

        // Clear token from memory
        token = null;
        process.exit(0);
      } catch (error) {
        console.error('Error saving token:', error);
        process.exit(1);
      }
    });
  });
}

getAccessToken();
