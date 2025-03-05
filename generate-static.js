const fs = require('fs');
const path = require('path');
const { getSpotifyPlayCount } = require('./spotify-api-official');
const axios = require('axios');
const cheerio = require('cheerio');

// Track URLs
const SPOTIFY_TRACK_URL = 'https://open.spotify.com/intl-fr/track/0QSFpVVi5h1TrYG69WMTg7';
const YOUTUBE_VIDEO_URL = 'https://www.youtube.com/watch?v=Mo2HToQ3-S4';

async function fetchLatestCounts() {
    // Get Spotify count
    let spotifyCount;
    try {
        spotifyCount = await getSpotifyPlayCount(SPOTIFY_TRACK_URL);
        console.log(`Spotify count: ${spotifyCount}`);
    } catch (error) {
        console.error('Failed to get Spotify count:', error);
        spotifyCount = 1405124; // Fallback
    }

    // Get YouTube count
    let youtubeCount;
    try {
        // Your YouTube scraping code
        // ...
        youtubeCount = 1420000; // Fallback if scraping fails
    } catch (error) {
        console.error('Failed to get YouTube count:', error);
        youtubeCount = 1420000; // Fallback
    }

    const totalCount = spotifyCount + youtubeCount;

    // Create a static data file
    const staticData = {
        spotify: spotifyCount,
        youtube: youtubeCount,
        total: totalCount,
        lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(
        path.join(__dirname, 'static-counts.json'),
        JSON.stringify(staticData, null, 2)
    );

    console.log(`Static data generated with total count: ${totalCount}`);
}

// Create a static version of the HTML
async function createStaticHtml() {
    // First get the counts
    await fetchLatestCounts();

    // Read the static data
    const staticData = JSON.parse(fs.readFileSync(path.join(__dirname, 'static-counts.json')));

    // Read the HTML template
    let html = fs.readFileSync(path.join(__dirname, 'index-modern.html'), 'utf8');

    // Modify the fetch code to use static data
    const scriptReplacement = `
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Use static data instead of API fetch
            const staticData = ${JSON.stringify(staticData)};

            // Format numbers with thousand separators
            const spotifyFormatted = new Intl.NumberFormat().format(staticData.spotify);
            const youtubeFormatted = new Intl.NumberFormat().format(staticData.youtube);
            const totalFormatted = new Intl.NumberFormat().format(staticData.total);

            // Update UI with counts
            document.getElementById('spotify-count').textContent = spotifyFormatted;
            document.getElementById('youtube-count').textContent = youtubeFormatted;
            document.getElementById('total-count').textContent = totalFormatted;

            // Update milestone progress
            updateMilestoneProgress(staticData.total);

            // Update last refreshed time
            document.getElementById('last-update').textContent = new Date(staticData.lastUpdated).toLocaleString('fr-FR');
            document.getElementById('static-notice').style.display = 'block';

            // Rest of your existing code
            function updateMilestoneProgress(total) {
                // Your existing milestone code
                // ...
            }

            function updateCertificationProgress(total) {
                // Your existing certification code
                // ...
            }
        });
    </script>`;

    // Replace the script section
    html = html.replace(/<script>[\s\S]*?<\/script>/, scriptReplacement);

    // Write the static HTML file
    fs.writeFileSync(path.join(__dirname, 'index.html'), html);
    console.log('Static HTML version created');
}

createStaticHtml().catch(console.error);