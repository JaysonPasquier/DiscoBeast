const axios = require('axios');

// You'll need to get a YouTube API key from Google Cloud Console
// https://console.cloud.google.com/apis/credentials
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyDHAMatSkuE60DTAq7vBv0heVvAVF69lBg';
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

let cachedViewCount = null;
let lastFetchTime = null;

/**
 * Gets the view count for a YouTube video using the official API
 * @param {string} videoId The YouTube video ID
 * @returns {Promise<number>} The view count of the video
 */
async function getYouTubeViewCount(videoId) {
  try {
    // Use cached result if available and not expired
    if (cachedViewCount && lastFetchTime && Date.now() - lastFetchTime < CACHE_DURATION) {
      console.log(`Using cached YouTube count: ${cachedViewCount} (from ${new Date(lastFetchTime).toLocaleTimeString()})`);
      return cachedViewCount;
    }

    console.log('Fetching YouTube view count via official API...');
    const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
      params: {
        part: 'statistics',
        id: videoId,
        key: YOUTUBE_API_KEY
      }
    });

    if (response.data.items && response.data.items.length > 0) {
      const viewCount = parseInt(response.data.items[0].statistics.viewCount, 10);

      // Update cache
      cachedViewCount = viewCount;
      lastFetchTime = Date.now();

      return viewCount;
    } else {
      throw new Error('Video not found or statistics not available');
    }
  } catch (error) {
    console.error('Error fetching YouTube view count:', error.message);

    // Return cached count if available, otherwise default to 0
    return cachedViewCount || 0;
  }
}

/**
 * Extracts video ID from a YouTube URL
 * @param {string} url The full YouTube video URL
 * @returns {string} The extracted video ID
 */
function extractVideoId(url) {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

module.exports = {
  getYouTubeViewCount,
  extractVideoId
};
