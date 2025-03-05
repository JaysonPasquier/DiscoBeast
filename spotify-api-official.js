/**
 * Spotify API client for getting track information
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// File to store the manually updated Spotify count
const SPOTIFY_COUNT_FILE = path.join(__dirname, 'spotify-count.json');

// Cache duration for Spotify API calls
const CACHE_DURATION = 300000; // 5 minutes

// Cache for Spotify track data
let trackDataCache = null;
let trackDataTimestamp = null;

// Current Spotify count
let spotifyCount = 0; // Default count

// Try to load the stored count on startup
try {
  if (fs.existsSync(SPOTIFY_COUNT_FILE)) {
    const data = JSON.parse(fs.readFileSync(SPOTIFY_COUNT_FILE, 'utf8'));
    spotifyCount = data.count;
    console.log(`Loaded Spotify count from file: ${spotifyCount}`);
  } else {
    // Save the default count
    saveSpotifyCount(spotifyCount);
    console.log(`Initialized Spotify count file with: ${spotifyCount}`);
  }
} catch (error) {
  console.error('Error loading Spotify count file:', error.message);
}

/**
 * Save the Spotify count to file
 * @param {number} count The count to save
 */
function saveSpotifyCount(count) {
  try {
    fs.writeFileSync(
      SPOTIFY_COUNT_FILE,
      JSON.stringify({
        count,
        updatedAt: new Date().toISOString()
      }, null, 2)
    );
    console.log(`Saved Spotify count: ${count}`);
  } catch (error) {
    console.error('Error saving Spotify count:', error.message);
  }
}

/**
 * Update the Spotify count
 * @param {number} newCount The new count to set
 * @returns {number} The updated count
 */
function updateSpotifyCount(newCount) {
  const count = parseInt(newCount, 10);
  if (isNaN(count) || count < 0) {
    throw new Error('Invalid count');
  }

  spotifyCount = count;
  saveSpotifyCount(count);
  return count;
}

/**
 * Get the Spotify Client Credentials
 * Note: This method doesn't require user authentication
 * @returns {Promise<string>} Access token
 */
async function getSpotifyToken() {
  try {
    // This should be your own CLIENT_ID and CLIENT_SECRET from
    // https://developer.spotify.com/dashboard/
    const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
    const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.warn('Spotify API credentials not found in environment variables.');
      console.warn('Track metadata will not be available.');
      return null;
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');

    const response = await axios.post('https://accounts.spotify.com/api/token', params, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Error getting Spotify token:', error.message);
    return null;
  }
}

/**
 * Extract track ID from Spotify URL
 * @param {string} url Spotify URL
 * @returns {string|null} Track ID or null
 */
function extractTrackId(url) {
  const regex = /track\/([a-zA-Z0-9]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

/**
 * Get track information from Spotify API
 * @param {string} trackUrl Spotify track URL
 * @returns {Promise<Object|null>} Track data or null
 */
async function getSpotifyTrackInfo(trackUrl) {
  try {
    // Use cache if available and fresh
    if (trackDataCache && trackDataTimestamp &&
        (Date.now() - trackDataTimestamp) < CACHE_DURATION) {
      console.log('Using cached Spotify track info');
      return trackDataCache;
    }

    const trackId = extractTrackId(trackUrl);
    if (!trackId) {
      throw new Error('Invalid Spotify URL');
    }

    const token = await getSpotifyToken();
    if (!token) {
      throw new Error('Could not obtain Spotify API token');
    }

    const response = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Cache the result
    trackDataCache = response.data;
    trackDataTimestamp = Date.now();

    console.log(`Retrieved Spotify track info: "${response.data.name}" by ${response.data.artists.map(a => a.name).join(', ')}`);
    return response.data;
  } catch (error) {
    console.error('Error getting Spotify track info:', error.message);
    return null;
  }
}

/**
 * Get Spotify play count (from saved value)
 * @returns {Promise<number>} Play count
 */
async function getSpotifyPlayCount() {
  try {
    // Optionally, you could get track info here to display in logs
    // const trackInfo = await getSpotifyTrackInfo(trackUrl);

    console.log(`Using stored Spotify count: ${spotifyCount}`);
    return spotifyCount;
  } catch (error) {
    console.error('Error in Spotify play count:', error);
    return spotifyCount; // Return the stored count on error
  }
}

/**
 * Force refresh the count (does nothing special since we're using stored count)
 * @returns {Promise<number>} The play count
 */
async function forceRefreshSpotifyCount() {
  console.log('Force refreshing Spotify count (using stored value)');
  return spotifyCount;
}

module.exports = {
  getSpotifyPlayCount,
  forceRefreshSpotifyCount,
  extractTrackId,
  getSpotifyTrackInfo,
  updateSpotifyCount
};
