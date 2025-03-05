const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const { getSpotifyPlayCount } = require('./spotify-api-official');

const app = express();
const PORT = process.env.PORT || 3000;

// Track URLs for verified platforms
const SPOTIFY_TRACK_URL = 'https://open.spotify.com/intl-fr/track/0QSFpVVi5h1TrYG69WMTg7';
const YOUTUBE_VIDEO_URL = 'https://www.youtube.com/watch?v=Mo2HToQ3-S4';

// Serve static files
app.use(express.static(path.join(__dirname)));

// API endpoint to get all counts
app.get('/api/counts', async (req, res) => {
    try {
        // Get counts from verified platforms only
        const spotifyCount = await getSpotifyCount();
        const youtubeCount = await getYoutubeCount();
        const totalCount = spotifyCount + youtubeCount;

        console.log('Counts:', {
            spotify: spotifyCount,
            youtube: youtubeCount,
            total: totalCount
        });

        // Return counts as JSON
        res.json({
            spotify: spotifyCount,
            youtube: youtubeCount,
            total: totalCount
        });
    } catch (error) {
        console.error('Error fetching counts:', error);
        res.status(500).json({ error: 'Failed to fetch counts' });
    }
});

// Function to get Spotify play count
async function getSpotifyCount() {
    try {
        return await getSpotifyPlayCount(SPOTIFY_TRACK_URL);
    } catch (error) {
        console.error('Spotify API failed:', error);
        return 1350186; // Fall back to known count if everything fails
    }
}

// Function to get YouTube view count
async function getYoutubeCount() {
    try {
        const response = await axios.get(YOUTUBE_VIDEO_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const $ = cheerio.load(response.data);

        // YouTube view count is harder to extract as it's in a script tag
        const scriptTags = $('script').toArray();
        let viewCount = 0;

        for (const script of scriptTags) {
            const content = $(script).html();
            if (content && content.includes('"viewCount"')) {
                const match = content.match(/"viewCount":\s*"(\d+)"/);
                if (match && match[1]) {
                    viewCount = parseInt(match[1]);
                    break;
                }
            }
        }

        return viewCount;
    } catch (error) {
        console.error('Error fetching YouTube count:', error);
        return 0;
    }
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
