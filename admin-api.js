const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const router = express.Router();
router.use(bodyParser.json());

// Admin password (change this to something secure!)
const ADMIN_PASSWORD = 'discobeast2025';

// Spotify count cache file path
const SPOTIFY_CACHE_FILE = path.join(__dirname, 'spotify-count-cache.json');

// Admin route to update Spotify count
router.post('/update-spotify', async (req, res) => {
    try {
        const { password, newCount } = req.body;

        // Verify password
        if (password !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Validate count
        const count = parseInt(newCount, 10);
        if (isNaN(count) || count < 0) {
            return res.status(400).json({ error: 'Invalid count' });
        }

        // Update the count in the cache file
        const cacheData = {
            count: count,
            timestamp: Date.now()
        };
        fs.writeFileSync(SPOTIFY_CACHE_FILE, JSON.stringify(cacheData));

        console.log(`Spotify count manually updated to ${count}`);

        return res.json({
            success: true,
            message: 'Spotify count updated successfully',
            newCount: count
        });
    } catch (error) {
        console.error('Error updating Spotify count:', error);
        return res.status(500).json({ error: 'Failed to update Spotify count: ' + error.message });
    }
});

// Admin page HTML
router.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>DiscoBeast Admin</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #121212;
                color: white;
            }
            h1 { color: #1DB954; }
            .card {
                background: #242424;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            input, button {
                padding: 10px;
                margin: 10px 0;
                width: 100%;
                box-sizing: border-box;
            }
            button {
                background: #1DB954;
                border: none;
                color: white;
                font-weight: bold;
                cursor: pointer;
                border-radius: 4px;
            }
            .error { color: #ff6b6b; }
            .success { color: #1DB954; }
            .hidden { display: none; }
        </style>
    </head>
    <body>
        <h1>DiscoBeast Admin</h1>
        <div class="card">
            <h2>Update Spotify Count</h2>
            <p>Enter the current Spotify stream count from Spotify for Artists dashboard:</p>
            <input type="password" id="password" placeholder="Admin Password" required>
            <input type="number" id="spotifyCount" placeholder="Spotify Stream Count" required>
            <button id="updateSpotify">Update Count</button>
            <p id="spotifyMessage" class="hidden"></p>
        </div>

        <script>
            document.getElementById('updateSpotify').addEventListener('click', async function() {
                const password = document.getElementById('password').value;
                const count = document.getElementById('spotifyCount').value;
                const messageEl = document.getElementById('spotifyMessage');

                if (!password || !count) {
                    messageEl.innerText = 'Please enter both password and count';
                    messageEl.className = 'error';
                    messageEl.classList.remove('hidden');
                    return;
                }

                try {
                    const response = await fetch('/admin/update-spotify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ password, newCount: parseInt(count, 10) })
                    });

                    const data = await response.json();

                    if (data.error) {
                        messageEl.innerText = 'Error: ' + data.error;
                        messageEl.className = 'error';
                    } else {
                        messageEl.innerText = 'Success! Spotify count updated to ' + data.newCount;
                        messageEl.className = 'success';
                        document.getElementById('spotifyCount').value = '';
                    }

                    messageEl.classList.remove('hidden');
                } catch (error) {
                    messageEl.innerText = 'Error: ' + error.message;
                    messageEl.className = 'error';
                    messageEl.classList.remove('hidden');
                }
            });
        </script>
    </body>
    </html>
    `);
});

module.exports = router;
