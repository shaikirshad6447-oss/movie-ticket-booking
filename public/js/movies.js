/**
 * Movies and Catalog Client Controller
 * Online Movie Ticket Booking System - Project Owner: Shaik Irshad
 */

const MoviesModule = (() => {
    /**
     * Create movie card HTML element
     */
    function renderMovieCard(movie) {
        const poster = movie.poster_url || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600&auto=format&fit=crop';
        const rating = parseFloat(movie.rating || 8.0).toFixed(1);

        return `
            <div class="movie-card" data-id="${movie.movie_id}">
                <div class="poster-wrap">
                    <img src="${poster}" alt="${movie.title}" class="poster-img" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600&auto=format&fit=crop'">
                    <div class="poster-badges">
                        <span class="rating-badge"><i class="fa-solid fa-star"></i> ${rating}</span>
                        <span class="lang-badge">${movie.language}</span>
                    </div>
                    <div class="poster-overlay"></div>
                </div>
                <div class="movie-card-info">
                    <h3 class="movie-card-title" title="${movie.title}">${movie.title}</h3>
                    <p class="movie-card-genre">${movie.genre}</p>
                    <div class="movie-card-meta">
                        <span><i class="fa-regular fa-clock"></i> ${movie.duration}m</span>
                        <span><i class="fa-regular fa-calendar"></i> ${new Date(movie.release_date).getFullYear()}</span>
                    </div>
                    <a href="/movie-details?id=${movie.movie_id}" class="btn btn-primary movie-card-btn">
                        <i class="fa-solid fa-ticket"></i> Book Now
                    </a>
                </div>
            </div>
        `;
    }

    /**
     * Load movies on Homepage
     */
    async function initHomePage() {
        const nowShowingContainer = document.getElementById('now-showing-grid');
        const upcomingContainer = document.getElementById('upcoming-grid');
        const popularContainer = document.getElementById('popular-grid');

        if (!nowShowingContainer) return;

        try {
            const data = await CineNova.api('/api/movies');
            const movies = data.movies || [];

            if (movies.length === 0) {
                nowShowingContainer.innerHTML = `<div class="empty-state">No movies currently showing.</div>`;
                return;
            }

            // Now Showing (first 4)
            nowShowingContainer.innerHTML = movies.slice(0, 4).map(renderMovieCard).join('');

            // Popular Movies (sorted by rating, top 4)
            if (popularContainer) {
                const popular = [...movies].sort((a, b) => b.rating - a.rating).slice(0, 4);
                popularContainer.innerHTML = popular.map(renderMovieCard).join('');
            }

            // Upcoming Movies (next 4)
            if (upcomingContainer) {
                upcomingContainer.innerHTML = movies.slice(4, 8).map(renderMovieCard).join('');
            }

            // Featured Hero Banner Setup with top movie
            const heroMovie = movies[0];
            const heroTitle = document.getElementById('hero-movie-title');
            const heroDesc = document.getElementById('hero-movie-desc');
            const heroGenre = document.getElementById('hero-movie-genre');
            const heroRating = document.getElementById('hero-movie-rating');
            const heroDuration = document.getElementById('hero-movie-duration');
            const heroBookBtn = document.getElementById('hero-book-btn');
            const heroTrailerBtn = document.getElementById('hero-trailer-btn');

            if (heroMovie && heroTitle) {
                heroTitle.textContent = heroMovie.title;
                if (heroDesc) heroDesc.textContent = heroMovie.description || '';
                if (heroGenre) heroGenre.textContent = heroMovie.genre;
                if (heroRating) heroRating.innerHTML = `<i class="fa-solid fa-star"></i> ${heroMovie.rating} / 10`;
                if (heroDuration) heroDuration.textContent = `${heroMovie.duration} mins`;
                if (heroBookBtn) heroBookBtn.href = `/movie-details?id=${heroMovie.movie_id}`;
                if (heroTrailerBtn && heroMovie.trailer_url) {
                    heroTrailerBtn.onclick = () => window.open(heroMovie.trailer_url, '_blank');
                }
            }
        } catch (err) {
            console.error('Failed to load movies:', err);
            nowShowingContainer.innerHTML = `<div class="empty-state">Unable to load movies: ${err.message}</div>`;
        }
    }

    /**
     * Load & Filter movies on Movies Catalog Page
     */
    async function initMoviesCatalogPage() {
        const grid = document.getElementById('all-movies-grid');
        const searchInput = document.getElementById('catalog-search');
        const genreSelect = document.getElementById('catalog-genre');
        const langSelect = document.getElementById('catalog-lang');
        const sortSelect = document.getElementById('catalog-sort');
        const countBadge = document.getElementById('results-count');

        if (!grid) return;

        async function fetchAndRender() {
            grid.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading cinematic catalog...</p></div>`;

            const queryParams = new URLSearchParams();
            if (searchInput && searchInput.value.trim()) queryParams.append('search', searchInput.value.trim());
            if (genreSelect && genreSelect.value !== 'All') queryParams.append('genre', genreSelect.value);
            if (langSelect && langSelect.value !== 'All') queryParams.append('language', langSelect.value);
            if (sortSelect) {
                const parts = sortSelect.value.split(':');
                queryParams.append('sortBy', parts[0]);
                queryParams.append('order', parts[1] || 'DESC');
            }

            try {
                const data = await CineNova.api(`/api/movies?${queryParams.toString()}`);
                const movies = data.movies || [];

                if (countBadge) countBadge.textContent = `${movies.length} Movies`;

                if (movies.length === 0) {
                    grid.innerHTML = `
                        <div class="empty-state" style="grid-column: 1 / -1;">
                            <div class="empty-icon"><i class="fa-solid fa-film"></i></div>
                            <h3>No Movies Found</h3>
                            <p style="color:var(--text-secondary); margin-top:0.5rem;">Try adjusting your search query or filters.</p>
                        </div>
                    `;
                    return;
                }

                grid.innerHTML = movies.map(renderMovieCard).join('');
            } catch (err) {
                grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">Failed to load catalog: ${err.message}</div>`;
            }
        }

        // Event Listeners with Debounce
        let debounceTimer;
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(fetchAndRender, 350);
            });
        }
        if (genreSelect) genreSelect.addEventListener('change', fetchAndRender);
        if (langSelect) langSelect.addEventListener('change', fetchAndRender);
        if (sortSelect) sortSelect.addEventListener('change', fetchAndRender);

        // Initial Load
        fetchAndRender();
    }

    /**
     * Load Movie Details Page
     */
    async function initMovieDetailsPage() {
        const urlParams = new URLSearchParams(window.location.search);
        const movieId = urlParams.get('id');

        const detailsContainer = document.getElementById('movie-details-content');
        if (!detailsContainer) return;

        if (!movieId) {
            window.location.href = '/movies';
            return;
        }

        try {
            const data = await CineNova.api(`/api/movies/${movieId}`);
            const movie = data.movie;
            const shows = data.shows || [];

            document.title = `${movie.title} - CineNova`;

            // Populate Movie Meta
            document.getElementById('detail-poster').src = movie.poster_url || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600&auto=format&fit=crop';
            document.getElementById('detail-title').textContent = movie.title;
            document.getElementById('detail-genre').textContent = movie.genre;
            document.getElementById('detail-language').textContent = movie.language;
            document.getElementById('detail-duration').textContent = `${movie.duration} mins`;
            document.getElementById('detail-release').textContent = CineNova.formatDate(movie.release_date);
            document.getElementById('detail-rating').innerHTML = `<i class="fa-solid fa-star"></i> ${parseFloat(movie.rating).toFixed(1)} / 10`;
            document.getElementById('detail-description').textContent = movie.description || 'No synopsis provided.';

            const trailerBtn = document.getElementById('detail-trailer-btn');
            if (trailerBtn) {
                if (movie.trailer_url) {
                    trailerBtn.style.display = 'inline-flex';
                    trailerBtn.onclick = () => window.open(movie.trailer_url, '_blank');
                } else {
                    trailerBtn.style.display = 'none';
                }
            }

            // Render Theatre Shows Section
            renderTheatresAndShows(shows);
        } catch (err) {
            detailsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>Error Loading Movie</h3>
                    <p style="color:var(--text-secondary); margin: 0.5rem 0 1.5rem;">${err.message}</p>
                    <a href="/movies" class="btn btn-primary">Back to Catalog</a>
                </div>
            `;
        }
    }

    /**
     * Group shows by date & theatre, render date selector and showtime cards
     */
    function renderTheatresAndShows(shows) {
        const datesContainer = document.getElementById('date-selector');
        const theatresContainer = document.getElementById('theatres-list');

        if (!theatresContainer) return;

        if (shows.length === 0) {
            theatresContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fa-regular fa-clock"></i></div>
                    <h3>No Scheduled Shows Available</h3>
                    <p style="color:var(--text-secondary); margin-top:0.5rem;">New showtimes for this title will be announced soon. Please check back later.</p>
                </div>
            `;
            if (datesContainer) datesContainer.innerHTML = '';
            return;
        }

        // Get unique dates sorted
        const uniqueDates = [...new Set(shows.map(s => s.show_date.substring(0, 10)))].sort();
        let selectedDate = uniqueDates[0];

        // Render date selector pills
        if (datesContainer) {
            datesContainer.innerHTML = uniqueDates.map(dateStr => {
                const d = new Date(dateStr);
                const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                const monthName = d.toLocaleDateString('en-US', { month: 'short' });
                const dayNum = d.getDate();
                const isActive = dateStr === selectedDate;

                return `
                    <div class="date-pill ${isActive ? 'active' : ''}" data-date="${dateStr}">
                        <span class="day">${dayName}</span>
                        <span class="num">${dayNum}</span>
                        <span class="day">${monthName}</span>
                    </div>
                `;
            }).join('');

            // Date pill clicks
            datesContainer.querySelectorAll('.date-pill').forEach(pill => {
                pill.addEventListener('click', () => {
                    datesContainer.querySelectorAll('.date-pill').forEach(p => p.classList.remove('active'));
                    pill.classList.add('active');
                    selectedDate = pill.dataset.date;
                    renderDayTheatres(shows, selectedDate);
                });
            });
        }

        // Render initial day
        renderDayTheatres(shows, selectedDate);
    }

    function renderDayTheatres(allShows, targetDate) {
        const container = document.getElementById('theatres-list');
        const dayShows = allShows.filter(s => s.show_date.substring(0, 10) === targetDate);

        if (dayShows.length === 0) {
            container.innerHTML = `<div class="empty-state">No showtimes found for the selected date.</div>`;
            return;
        }

        // Group shows by theatre name
        const grouped = {};
        dayShows.forEach(s => {
            if (!grouped[s.theatre_name]) grouped[s.theatre_name] = [];
            grouped[s.theatre_name].push(s);
        });

        container.innerHTML = Object.keys(grouped).map(theatreName => {
            const theatreShows = grouped[theatreName];
            return `
                <div class="theatre-card">
                    <div class="theatre-details">
                        <h4 class="theatre-name"><i class="fa-solid fa-location-dot" style="color:var(--accent-red)"></i> ${theatreName}</h4>
                        <p class="theatre-features">4K Laser Dolby Atmos • Recliner Seating Available • Mobile Ticket</p>
                    </div>
                    <div class="showtimes-grid">
                        ${theatreShows.map(show => `
                            <a href="/seats?showId=${show.show_id}" class="showtime-btn">
                                <span class="showtime-time">${CineNova.formatTime(show.show_time)}</span>
                                <span class="showtime-price">${CineNova.formatCurrency(show.ticket_price)}</span>
                            </a>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Auto-initialize based on DOM elements
    document.addEventListener('DOMContentLoaded', () => {
        initHomePage();
        initMoviesCatalogPage();
        initMovieDetailsPage();
    });

    return {
        initHomePage,
        initMoviesCatalogPage,
        initMovieDetailsPage
    };
})();
