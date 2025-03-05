document.addEventListener('DOMContentLoaded', function() {
    // Initial fetch of counts
    fetchCounts();

    // Set up refresh button
    document.getElementById('refresh-btn').addEventListener('click', fetchCounts);

    function fetchCounts() {
        // Update UI to show loading
        document.getElementById('spotify-count').textContent = 'Loading...';
        document.getElementById('youtube-count').textContent = 'Loading...';
        document.getElementById('total-count').textContent = 'Loading...';

        // Fetch counts from our backend
        fetch('/api/counts')
            .then(response => response.json())
            .then(data => {
                // Format numbers with thousand separators
                const spotifyCount = new Intl.NumberFormat().format(data.spotify);
                const youtubeCount = new Intl.NumberFormat().format(data.youtube);
                const totalCount = new Intl.NumberFormat().format(data.total);

                // Update UI
                document.getElementById('spotify-count').textContent = spotifyCount;
                document.getElementById('youtube-count').textContent = youtubeCount;
                document.getElementById('total-count').textContent = totalCount;
            })
            .catch(error => {
                console.error('Error fetching counts:', error);
                document.getElementById('spotify-count').textContent = 'Error';
                document.getElementById('youtube-count').textContent = 'Error';
                document.getElementById('total-count').textContent = 'Error';
            });
    }
});
