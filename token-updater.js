/**
 * Utility script to update the Spotify token
 * Run this script with node when you need to update the token:
 * node token-updater.js YOUR_NEW_TOKEN
 */

const fs = require('fs');
const path = require('path');

const API_FILE_PATH = path.join(__dirname, 'spotify-api.js');

function updateTokenInFile(newToken) {
    try {
        // Read the current file content
        let fileContent = fs.readFileSync(API_FILE_PATH, 'utf8');

        // Replace the token with a regex pattern that looks for the token assignment
        const tokenRegex = /(let\s+spotifyToken\s*=\s*['"])([^'"]+)(['"])/;

        if (!tokenRegex.test(fileContent)) {
            console.error('Could not find token pattern in the file.');
            return false;
        }

        // Replace the token
        const updatedContent = fileContent.replace(tokenRegex, `$1${newToken}$3`);

        // Write back to the file
        fs.writeFileSync(API_FILE_PATH, updatedContent, 'utf8');

        console.log('Token updated successfully in spotify-api.js');
        return true;
    } catch (error) {
        console.error('Error updating token:', error);
        return false;
    }
}

// Check if a token was provided as a command-line argument
if (process.argv.length < 3) {
    console.log('Usage: node token-updater.js YOUR_NEW_SPOTIFY_TOKEN');
    process.exit(1);
}

// Get the token from command-line arguments
const newToken = process.argv[2];

if (updateTokenInFile(newToken)) {
    console.log('✅ Token updated successfully!');
    console.log('The server will use the new token on the next API request.');
} else {
    console.error('❌ Failed to update token.');
}
