const express = require('express');
const axios = require('axios');
const path = require('path');
const { getYouTubeViewCount, forceRefreshYouTubeCount, extractVideoId } = require('./youtube-api');
// Utiliser le scraper Selenium à la place
const { getSpotifyPlayCount, forceRefreshSpotifyCount } = require('./spotify-selenium');
// Keep the admin router
const adminRouter = require('./admin-api');

const app = express();
const PORT = process.env.PORT || 3000;

// Add JSON body parsing middleware
app.use(express.json());

// Track URLs for verified platforms
const SPOTIFY_TRACK_URL = 'https://open.spotify.com/intl-fr/track/0QSFpVVi5h1TrYG69WMTg7';
const YOUTUBE_VIDEO_URL = 'https://www.youtube.com/watch?v=Mo2HToQ3-S4';

// Extract YouTube video ID
const YOUTUBE_VIDEO_ID = extractVideoId(YOUTUBE_VIDEO_URL);

// Serve static files
app.use(express.static(path.join(__dirname)));

// Mount the admin routes at /admin
app.use('/admin', adminRouter);

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
            total: totalCount,
            timestamp: new Date().toISOString()
        });

        // Return counts as JSON
        res.json({
            spotify: spotifyCount,
            youtube: youtubeCount,
            total: totalCount,
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching counts:', error);
        res.status(500).json({ error: 'Failed to fetch counts' });
    }
});

// API endpoint to force refresh the YouTube count
app.get('/api/refresh/youtube', async (req, res) => {
    try {
        console.log('Force refreshing YouTube count...');
        const youtubeCount = await forceRefreshYouTubeCount(YOUTUBE_VIDEO_ID);
        res.json({
            youtube: youtubeCount,
            message: 'YouTube count refreshed successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error refreshing YouTube count:', error);
        res.status(500).json({ error: 'Failed to refresh YouTube count' });
    }
});

// NEW API endpoint to force refresh Spotify count
app.get('/api/refresh/spotify', async (req, res) => {
    try {
        console.log('Force refreshing Spotify count...');
        const spotifyCount = await forceRefreshSpotifyCount(SPOTIFY_TRACK_URL);
        res.json({
            spotify: spotifyCount,
            message: 'Spotify count refreshed successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error refreshing Spotify count:', error);
        res.status(500).json({ error: 'Failed to refresh Spotify count' });
    }
});

// NEW API endpoint to refresh both platforms at once
app.get('/api/refresh/all', async (req, res) => {
    try {
        console.log('Force refreshing all counts...');
        const spotifyCount = await forceRefreshSpotifyCount(SPOTIFY_TRACK_URL);
        const youtubeCount = await forceRefreshYouTubeCount(YOUTUBE_VIDEO_ID);
        const totalCount = spotifyCount + youtubeCount;

        res.json({
            spotify: spotifyCount,
            youtube: youtubeCount,
            total: totalCount,
            message: 'All counts refreshed successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error refreshing counts:', error);
        res.status(500).json({ error: 'Failed to refresh counts' });
    }
});

// Function to get Spotify play count - updated to use the new scraper
async function getSpotifyCount() {
    try {
        return await getSpotifyPlayCount(SPOTIFY_TRACK_URL);
    } catch (error) {
        console.error('Spotify scraper failed:', error);
        return 1405124; // Fall back to this count if everything fails
    }
}

// Function to get YouTube view count
async function getYoutubeCount() {
    try {
        return await getYouTubeViewCount(YOUTUBE_VIDEO_ID);
    } catch (error) {
        console.error('Error fetching YouTube count:', error);
        return 0;
    }
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
