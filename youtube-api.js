const axios = require('axios');

// You'll need to get a YouTube API key from Google Cloud Console
// https://console.cloud.google.com/apis/credentials
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyDHAMatSkuE60DTAq7vBv0heVvAVF69lBg';
// Reduce cache duration to 5 minutes to get more frequent updates
const CACHE_DURATION = 300000; // 5 minutes in milliseconds

let cachedViewCount = null;
let lastFetchTime = null;
let fetchCounter = 0;

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

    fetchCounter++;
    console.log(`Fetching YouTube view count via official API... (Request #${fetchCounter})`);

    const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
      params: {
        part: 'statistics',
        id: videoId,
        key: YOUTUBE_API_KEY
      }
    });

    if (response.data.items && response.data.items.length > 0) {
      const viewCount = parseInt(response.data.items[0].statistics.viewCount, 10);
      const previousCount = cachedViewCount;

      // Update cache
      cachedViewCount = viewCount;
      lastFetchTime = Date.now();

      // Log whether the count changed
      if (previousCount !== null) {
        const difference = viewCount - previousCount;
        console.log(`YouTube count updated: ${previousCount} → ${viewCount} (${difference >= 0 ? '+' : ''}${difference} views)`);
      } else {
        console.log(`YouTube count initialized: ${viewCount} views`);
      }

      return viewCount;
    } else {
      throw new Error('Video not found or statistics not available');
    }
  } catch (error) {
    console.error('Error fetching YouTube view count:', error.message);

    if (error.response) {
      // Log more detailed API error information
      console.error('API Error Details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }

    // Return cached count if available, otherwise default to 0
    console.log(`Returning cached count: ${cachedViewCount || 0} due to error`);
    return cachedViewCount || 0;
  }
}

/**
 * Force refresh the YouTube view count by ignoring the cache
 * @param {string} videoId The YouTube video ID
 * @returns {Promise<number>} The fresh view count of the video
 */
async function forceRefreshYouTubeCount(videoId) {
  // Invalidate cache
  lastFetchTime = null;
  return getYouTubeViewCount(videoId);
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
  forceRefreshYouTubeCount,
  extractVideoId
};
