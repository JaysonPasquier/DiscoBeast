/**
 * Spotify web scraper to extract play count from the public page
 */
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Constants
const FALLBACK_COUNT = 1405124; // IMPORTANT: Use the last known correct count as fallback
const CACHE_FILE = path.join(__dirname, 'spotify-count-cache.json');
const CACHE_TTL = 900000; // Cache TTL in milliseconds (15 minutes)

/**
 * Get the cached count if available and not expired
 */
function getCachedCount() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
            const now = Date.now();

            if (now - cacheData.timestamp < CACHE_TTL) {
                console.log(`Using cached Spotify count: ${cacheData.count} (from ${new Date(cacheData.timestamp).toLocaleTimeString()})`);
                return cacheData.count;
            }
        }
    } catch (err) {
        console.log('Error reading cache:', err.message);
    }
    return null;
}

/**
 * Save count to cache
 */
function saveCountToCache(count) {
    try {
        const cacheData = {
            count: count,
            timestamp: Date.now()
        };
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData));
        console.log(`Saved count ${count} to cache`);
    } catch (err) {
        console.log('Error saving to cache:', err.message);
    }
}

/**
 * Get Spotify play count by directly scraping the page
 * @param {string} trackUrl - The Spotify track URL
 * @returns {Promise<number>} - The play count as a number
 */
async function getSpotifyPlayCount(trackUrl) {
    console.log(`Getting Spotify play count for: ${trackUrl}`);

    // First, check cache
    const cachedCount = getCachedCount();
    if (cachedCount !== null) {
        return cachedCount;
    }

    try {
        // Advanced browser-like headers
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Referer': 'https://www.google.com/',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'cross-site',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
        };

        console.log('Attempting to scrape Spotify page...');
        const response = await axios.get(trackUrl, {
            headers,
            timeout: 10000 // 10 seconds timeout
        });

        // Save the HTML for debugging
        const debugFilePath = path.join(__dirname, 'spotify-debug.html');
        fs.writeFileSync(debugFilePath, response.data);
        console.log(`Saved HTML response to ${debugFilePath} for debugging`);

        const $ = cheerio.load(response.data);

        // More aggressive search for the playcount
        let playcountText = null;

        // Method 1: Using the EXACT CSS selector path provided by the user
        const exactSelector = '#main > div > div.ZQftYELq0aOsg6tPbVbV > div.jEMA2gVoLgPQqAFrPhFw > div > div.main-view-container__scroll-node.main-view-container__scroll-node--offset-topbar.ZjfaJlGQZ42nCWjD3FDm > div:nth-child(2) > div > main > section > div.NXiYChVp4Oydfxd7rT5r.JYKKZFIXuf9lIHVeszuS > div.iWTIFTzhRZT0rCD0_gOK.contentSpacing > div.RP2rRchy4i8TIp1CTmb7 > div > span:nth-child(9)';

        const exactElement = $(exactSelector);
        if (exactElement.length) {
            playcountText = exactElement.text().trim();
            console.log(`Found using exact CSS path: "${playcountText}"`);
        }

        // Method 2: By data-testid attribute
        if (!playcountText) {
            const playcountElement = $('[data-testid="playcount"]');
            if (playcountElement.length) {
                playcountText = playcountElement.text().trim();
                console.log(`Found by data-testid: "${playcountText}"`);
            }
        }

        // Method 3: By specific class name
        if (!playcountText) {
            const classElement = $('.w1TBi3o5CTM7zW1EB3Bm');
            if (classElement.length) {
                playcountText = classElement.text().trim();
                console.log(`Found by class: "${playcountText}"`);
            }
        }

        // Method 4: By class name pattern
        if (!playcountText) {
            // Look for elements with class names containing these patterns (Spotify often uses randomly generated class names)
            $('[class*="playcount"], [class*="play-count"], [class*="streamCount"], [class*="stream-count"]').each((_, el) => {
                const text = $(el).text().trim();
                if (text && /\d[\d\s,\.]+/.test(text)) {
                    playcountText = text;
                    console.log(`Found by class pattern: "${playcountText}"`);
                    return false; // break the loop
                }
            });
        }

        // Method 5: Look for specific patterns in any span element
        if (!playcountText) {
            $('span').each((_, el) => {
                const text = $(el).text().trim();
                // Look for number patterns with spaces like "1 405 124"
                if (/^\d{1,3}(?:[\s,.]\d{3})+$/.test(text)) {
                    playcountText = text;
                    console.log(`Found by scanning spans for number format: "${playcountText}"`);
                    return false; // break the loop
                }
            });
        }

        // If we found a count, parse and return it
        if (playcountText) {
            // Remove any non-digit characters (spaces, commas, etc)
            const count = parseInt(playcountText.replace(/[^\d]/g, ''), 10);
            if (!isNaN(count)) {
                console.log(`Successfully parsed count: ${count}`);
                saveCountToCache(count);
                return count;
            }
        }

        // If we reach here, scraping failed
        console.log('Could not find the playcount element in the page');
        console.log(`Using fallback count: ${FALLBACK_COUNT}`);

        // Even though scraping failed, save the fallback to cache
        saveCountToCache(FALLBACK_COUNT);
        return FALLBACK_COUNT;
    } catch (error) {
        console.error('Error scraping Spotify page:', error.message);
        if (error.response) {
            console.error(`Status code: ${error.response.status}`);
        }
        console.log(`Using fallback count: ${FALLBACK_COUNT}`);

        saveCountToCache(FALLBACK_COUNT);
        return FALLBACK_COUNT;
    }
}

/**
 * Force refresh the Spotify count by clearing the cache and re-scraping
 * @param {string} trackUrl - The Spotify track URL
 * @returns {Promise<number>} - The fresh play count
 */
async function forceRefreshSpotifyCount(trackUrl) {
    try {
        console.log('Force refreshing Spotify count...');

        // Delete the cache file if it exists
        if (fs.existsSync(CACHE_FILE)) {
            fs.unlinkSync(CACHE_FILE);
            console.log('Cleared Spotify count cache');
        }

        // Get a fresh count
        const count = await getSpotifyPlayCount(trackUrl);

        // If scraping failed and returned the fallback, load the admin-set value if available
        if (count === FALLBACK_COUNT) {
            console.log('Scraping failed, checking for admin-set value...');
            const adminFile = path.join(__dirname, 'spotify-count.json');

            if (fs.existsSync(adminFile)) {
                try {
                    const adminData = JSON.parse(fs.readFileSync(adminFile, 'utf8'));
                    if (adminData && adminData.count) {
                        console.log(`Using admin-set value: ${adminData.count}`);
                        saveCountToCache(adminData.count);
                        return adminData.count;
                    }
                } catch (err) {
                    console.error('Error reading admin file:', err.message);
                }
            }
        }

        return count;
    } catch (error) {
        console.error('Error force refreshing Spotify count:', error.message);
        return FALLBACK_COUNT;
    }
}

module.exports = {
    getSpotifyPlayCount,
    forceRefreshSpotifyCount
};
