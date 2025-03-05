/**
 * Spotify scraper using Selenium WebDriver
 * This can access elements that are only visible after JavaScript is executed
 */
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');

// Constants
const FALLBACK_COUNT = 1405124; // Fallback count if scraping fails
const CACHE_FILE = path.join(__dirname, 'spotify-count-cache.json');
const CACHE_TTL = 3600000; // Cache for 1 hour (in milliseconds)

/**
 * Get cached count if available and not expired
 */
function getCachedCount() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      if (Date.now() - data.timestamp < CACHE_TTL) {
        console.log(`Using cached Spotify count: ${data.count} (from ${new Date(data.timestamp).toLocaleTimeString()})`);
        return data.count;
      }
    }
  } catch (error) {
    console.error('Error reading cache:', error.message);
  }
  return null;
}

/**
 * Save count to cache
 */
function saveCountToCache(count) {
  try {
    fs.writeFileSync(
      CACHE_FILE,
      JSON.stringify({
        count,
        timestamp: Date.now()
      })
    );
    console.log(`Saved count ${count} to cache`);
  } catch (error) {
    console.error('Error saving to cache:', error.message);
  }
}

/**
 * Get Spotify play count using Selenium WebDriver
 * @param {string} trackUrl - Spotify track URL
 * @returns {Promise<number>} - The play count
 */
async function getSpotifyPlayCount(trackUrl) {
  console.log(`Getting Spotify play count for: ${trackUrl}`);

  // Check cache first
  const cachedCount = getCachedCount();
  if (cachedCount !== null) {
    return cachedCount;
  }

  let driver;
  let count = FALLBACK_COUNT; // Default to fallback

  try {
    console.log('Launching headless Chrome...');

    // Configure Chrome options
    const options = new chrome.Options();
    options.addArguments('--headless'); // Run in headless mode (no GUI)
    options.addArguments('--disable-gpu');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--window-size=1920,1080');
    options.addArguments('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36');

    // Create the driver
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    // Navigate to the Spotify track page
    console.log(`Navigating to ${trackUrl}`);
    await driver.get(trackUrl);

    // Wait for page to load (adjust timeout as needed)
    await driver.sleep(3000);

    // Take a screenshot for debugging
    const screenshot = await driver.takeScreenshot();
    fs.writeFileSync(path.join(__dirname, 'spotify-screenshot.png'), screenshot, 'base64');
    console.log('Saved screenshot for debugging');

    // Try multiple methods to find the play count
    const methods = [
      // Method 1: Exact CSS selector
      async () => {
        const selector = '#main > div > div.ZQftYELq0aOsg6tPbVbV > div.jEMA2gVoLgPQqAFrPhFw > div > div.main-view-container__scroll-node.main-view-container__scroll-node--offset-topbar.ZjfaJlGQZ42nCWjD3FDm > div:nth-child(2) > div > main > section > div.NXiYChVp4Oydfxd7rT5r.JYKKZFIXuf9lIHVeszuS > div.iWTIFTzhRZT0rCD0_gOK.contentSpacing > div.RP2rRchy4i8TIp1CTmb7 > div > span:nth-child(9)';
        const element = await driver.findElement(By.css(selector));
        return await element.getText();
      },
      // Method 2: By data attribute
      async () => {
        const element = await driver.findElement(By.css('[data-testid="playcount"]'));
        return await element.getText();
      },
      // Method 3: By class name
      async () => {
        const element = await driver.findElement(By.className('w1TBi3o5CTM7zW1EB3Bm'));
        return await element.getText();
      },
      // Method 4: Look for spans with number pattern
      async () => {
        // Get all spans
        const spans = await driver.findElements(By.css('span'));
        for (const span of spans) {
          const text = await span.getText();
          // Look for patterns like "1 405 124"
          if (/^\d{1,3}(?:[\s,.]\d{3})+$/.test(text)) {
            return text;
          }
        }
        throw new Error('No span with play count pattern found');
      }
    ];

    // Try each method until one succeeds
    let playcountText = null;
    for (const method of methods) {
      try {
        playcountText = await method();
        if (playcountText) {
          console.log(`Found play count: ${playcountText}`);
          break;
        }
      } catch (error) {
        // Continue to next method
      }
    }

    // If we found a text, parse it to a number
    if (playcountText) {
      // Remove any non-digit characters
      count = parseInt(playcountText.replace(/\D/g, ''), 10);
      console.log(`Parsed play count: ${count}`);
    } else {
      console.log('Could not find play count element, using fallback');
    }

    // Save the result to cache
    saveCountToCache(count);

  } catch (error) {
    console.error('Error with Selenium:', error.message);
    console.log(`Using fallback count: ${FALLBACK_COUNT}`);
  } finally {
    // Always close the browser
    if (driver) {
      console.log('Closing browser');
      await driver.quit();
    }
  }

  return count;
}

/**
 * Force refresh Spotify count
 */
async function forceRefreshSpotifyCount(trackUrl) {
  // Delete cache if exists
  if (fs.existsSync(CACHE_FILE)) {
    fs.unlinkSync(CACHE_FILE);
    console.log('Cleared Spotify count cache');
  }

  return await getSpotifyPlayCount(trackUrl);
}

module.exports = {
  getSpotifyPlayCount,
  forceRefreshSpotifyCount
};
