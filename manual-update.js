/**
 * Utility to manually update the Spotify play count
 * Usage: node manual-update.js [new count]
 */
const fs = require('fs');
const path = require('path');

// Support both cache files
const CACHE_FILES = [
    path.join(__dirname, 'spotify-count-cache.json'),
    path.join(__dirname, 'spotify-count-cache.json')
];

function updateCachedCount(newCount) {
    if (isNaN(newCount) || newCount <= 0) {
        console.error('Error: Please provide a valid number greater than 0');
        return false;
    }

    let success = false;

    for (const cacheFile of CACHE_FILES) {
        try {
            const cacheData = {
                count: newCount,
                timestamp: Date.now(),
                manual: true
            };

            fs.writeFileSync(cacheFile, JSON.stringify(cacheData));
            console.log(`✅ Successfully updated count in ${path.basename(cacheFile)} to ${newCount}`);
            success = true;
        } catch (err) {
            console.error(`Error updating ${path.basename(cacheFile)}:`, err.message);
        }
    }

    return success;
}

function getCurrentCount() {
    let found = false;

    for (const cacheFile of CACHE_FILES) {
        try {
            if (fs.existsSync(cacheFile)) {
                const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
                console.log(`Cache file: ${path.basename(cacheFile)}`);
                console.log('Current cached count:', cacheData.count);
                console.log('Last updated:', new Date(cacheData.timestamp).toLocaleString());
                if (cacheData.manual) {
                    console.log('Note: This count was manually set');
                }
                if (cacheData.isEstimate) {
                    console.log('Note: This count was estimated based on popularity');
                }
                console.log('---');
                found = true;
            }
        } catch (err) {
            console.error(`Error reading ${path.basename(cacheFile)}:`, err.message);
        }
    }

    if (!found) {
        console.log('No cached counts found');
    }
}

// Main execution
if (process.argv.length >= 3) {
    const newCount = parseInt(process.argv[2].replace(/[\s,.]+/g, ''));
    updateCachedCount(newCount);
} else {
    console.log('Current count information:');
    getCurrentCount();
    console.log('\nTo update the count manually:');
    console.log('  node manual-update.js [new count]');
    console.log('\nExample:');
    console.log('  node manual-update.js 1405124');
}
