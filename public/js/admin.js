/**
 * Admin Dashboard Client Controller
 * Online Movie Ticket Booking System - Project Owner: Shaik Irshad
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Role verification
    const user = CineNova.getCurrentUser();
    if (!user || user.role !== 'admin') {
        CineNova.showToast('Access Denied', 'Administrator privileges required.', 'error');
        setTimeout(() => {
            window.location.href = '/login?redirect=/admin';
        }, 800);
        return;
    }

    // 2. Tab Navigation
    const navItems = document.querySelectorAll('.admin-nav-item');
    const tabPanes = document.querySelectorAll('.admin-tab-pane');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.dataset.tab;
            navItems.forEach(n => n.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            item.classList.add('active');
            const targetPane = document.getElementById(`tab-${tabId}`);
            if (targetPane) targetPane.classList.add('active');

            // Load data for selected tab
            if (tabId === 'overview') loadOverview();
            else if (tabId === 'movies') loadMoviesManager();
            else if (tabId === 'shows') loadShowsManager();
            else if (tabId === 'bookings') loadBookingsManager();
            else if (tabId === 'users') loadUsersManager();
        });
    });

    // Initial Load Overview
    loadOverview();

    // =========================================================================
    // TAB 1: OVERVIEW & STATS
    // =========================================================================
    async function loadOverview() {
        try {
            const data = await CineNova.api('/api/admin/dashboard');
            const stats = data.stats;

            document.getElementById('stat-movies').textContent = stats.total_movies;
            document.getElementById('stat-shows').textContent = stats.total_shows;
            document.getElementById('stat-bookings').textContent = stats.total_bookings;
            document.getElementById('stat-users').textContent = stats.total_users;
            document.getElementById('stat-revenue').textContent = CineNova.formatCurrency(stats.total_revenue);

            // Recent Bookings Table
            const recentTbody = document.getElementById('recent-bookings-tbody');
            if (recentTbody) {
                if (data.recent_bookings.length === 0) {
                    recentTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No bookings recorded yet.</td></tr>`;
                } else {
                    recentTbody.innerHTML = data.recent_bookings.map(b => `
                        <tr>
                            <td>#${b.booking_id}</td>
                            <td>${b.user_name} <br><small style="color:var(--text-muted)">${b.user_email}</small></td>
                            <td>${b.movie_title}</td>
                            <td>${b.theatre_name}</td>
                            <td>${CineNova.formatDate(b.show_date)} ${CineNova.formatTime(b.show_time)}</td>
                            <td><strong style="color:var(--accent-gold)">${CineNova.formatCurrency(b.total_amount)}</strong></td>
                            <td><span class="status-badge status-${b.booking_status.toLowerCase()}">${b.booking_status}</span></td>
                        </tr>
                    `).join('');
                }
            }
        } catch (err) {
            CineNova.showToast('Error', err.message, 'error');
        }
    }

    // =========================================================================
    // TAB 2: MOVIE MANAGEMENT
    // =========================================================================
    let allMoviesList = [];

    async function loadMoviesManager() {
        const tbody = document.getElementById('movies-table-tbody');
        if (!tbody) return;

        try {
            const data = await CineNova.api('/api/movies');
            allMoviesList = data.movies || [];

            if (allMoviesList.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No movies in database. Click "Add Movie" to start.</td></tr>`;
                return;
            }

            tbody.innerHTML = allMoviesList.map(m => `
                <tr>
                    <td>
                        <img src="${m.poster_url || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=100'}" class="table-img">
                    </td>
                    <td><strong>${m.title}</strong></td>
                    <td>${m.genre}</td>
                    <td>${m.language}</td>
                    <td>${m.duration} mins</td>
                    <td><i class="fa-solid fa-star" style="color:var(--accent-gold)"></i> ${parseFloat(m.rating).toFixed(1)}</td>
                    <td>
                        <div class="table-actions">
                            <button class="btn btn-sm btn-outline btn-edit-movie" data-id="${m.movie_id}"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn btn-sm btn-danger btn-delete-movie" data-id="${m.movie_id}" data-title="${m.title}"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('');

            // Edit movie listeners
            tbody.querySelectorAll('.btn-edit-movie').forEach(btn => {
                btn.onclick = () => {
                    const movie = allMoviesList.find(m => String(m.movie_id) === String(btn.dataset.id));
                    if (movie) openMovieFormModal(movie);
                };
            });

            // Delete movie listeners
            tbody.querySelectorAll('.btn-delete-movie').forEach(btn => {
                btn.onclick = async () => {
                    if (confirm(`Are you sure you want to delete movie "${btn.dataset.title}"? This will delete all its shows and bookings.`)) {
                        try {
                            const res = await CineNova.api(`/api/movies/${btn.dataset.id}`, { method: 'DELETE' });
                            CineNova.showToast('Deleted', res.message, 'success');
                            loadMoviesManager();
                            loadOverview();
                        } catch (err) {
                            CineNova.showToast('Error', err.message, 'error');
                        }
                    }
                };
            });
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="7">Failed to load movies: ${err.message}</td></tr>`;
        }
    }

    // Add Movie Button
    const addMovieBtn = document.getElementById('btn-add-movie');
    if (addMovieBtn) {
        addMovieBtn.onclick = () => openMovieFormModal();
    }

    function openMovieFormModal(movie = null) {
        const modal = document.getElementById('movie-modal');
        const form = document.getElementById('movie-form');
        const titleEl = document.getElementById('movie-modal-title');

        if (!modal || !form) return;

        titleEl.textContent = movie ? 'Edit Movie' : 'Add New Movie';
        document.getElementById('movie-id').value = movie ? movie.movie_id : '';
        document.getElementById('movie-title').value = movie ? movie.title : '';
        document.getElementById('movie-genre').value = movie ? movie.genre : '';
        document.getElementById('movie-language').value = movie ? movie.language : 'English';
        document.getElementById('movie-duration').value = movie ? movie.duration : '';
        document.getElementById('movie-release').value = movie ? movie.release_date.substring(0, 10) : '';
        document.getElementById('movie-rating').value = movie ? movie.rating : '8.5';
        document.getElementById('movie-poster').value = movie ? movie.poster_url : '';
        document.getElementById('movie-trailer').value = movie ? (movie.trailer_url || '') : '';
        document.getElementById('movie-description').value = movie ? (movie.description || '') : '';

        modal.classList.add('active');

        // Form Submit
        form.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('movie-id').value;
            const payload = {
                title: document.getElementById('movie-title').value,
                genre: document.getElementById('movie-genre').value,
                language: document.getElementById('movie-language').value,
                duration: document.getElementById('movie-duration').value,
                release_date: document.getElementById('movie-release').value,
                rating: document.getElementById('movie-rating').value,
                poster_url: document.getElementById('movie-poster').value,
                trailer_url: document.getElementById('movie-trailer').value,
                description: document.getElementById('movie-description').value
            };

            try {
                if (id) {
                    await CineNova.api(`/api/movies/${id}`, {
                        method: 'PUT',
                        body: JSON.stringify(payload)
                    });
                    CineNova.showToast('Updated', 'Movie details updated successfully.', 'success');
                } else {
                    await CineNova.api('/api/movies', {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    });
                    CineNova.showToast('Created', 'New movie added successfully.', 'success');
                }
                modal.classList.remove('active');
                loadMoviesManager();
                loadOverview();
            } catch (err) {
                CineNova.showToast('Error', err.message, 'error');
            }
        };

        modal.querySelectorAll('.modal-close, .btn-modal-close').forEach(b => {
            b.onclick = () => modal.classList.remove('active');
        });
    }

    // =========================================================================
    // TAB 3: SHOW MANAGEMENT
    // =========================================================================
    let allShowsList = [];

    async function loadShowsManager() {
        const tbody = document.getElementById('shows-table-tbody');
        if (!tbody) return;

        try {
            const data = await CineNova.api('/api/shows');
            allShowsList = data.shows || [];

            if (allShowsList.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No scheduled shows found. Click "Add Show" to schedule.</td></tr>`;
                return;
            }

            tbody.innerHTML = allShowsList.map(s => `
                <tr>
                    <td>#${s.show_id}</td>
                    <td><strong>${s.movie_title}</strong></td>
                    <td>${s.theatre_name}</td>
                    <td>${CineNova.formatDate(s.show_date)}</td>
                    <td>${CineNova.formatTime(s.show_time)}</td>
                    <td><strong style="color:var(--accent-gold)">${CineNova.formatCurrency(s.ticket_price)}</strong></td>
                    <td>
                        <div class="table-actions">
                            <button class="btn btn-sm btn-outline btn-edit-show" data-id="${s.show_id}"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn btn-sm btn-danger btn-delete-show" data-id="${s.show_id}"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('');

            // Edit show listeners
            tbody.querySelectorAll('.btn-edit-show').forEach(btn => {
                btn.onclick = () => {
                    const show = allShowsList.find(s => String(s.show_id) === String(btn.dataset.id));
                    if (show) openShowFormModal(show);
                };
            });

            // Delete show listeners
            tbody.querySelectorAll('.btn-delete-show').forEach(btn => {
                btn.onclick = async () => {
                    if (confirm(`Are you sure you want to cancel and delete Show #${btn.dataset.id}?`)) {
                        try {
                            const res = await CineNova.api(`/api/shows/${btn.dataset.id}`, { method: 'DELETE' });
                            CineNova.showToast('Deleted', res.message, 'success');
                            loadShowsManager();
                            loadOverview();
                        } catch (err) {
                            CineNova.showToast('Error', err.message, 'error');
                        }
                    }
                };
            });
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="7">Failed to load shows: ${err.message}</td></tr>`;
        }
    }

    // Add Show Button
    const addShowBtn = document.getElementById('btn-add-show');
    if (addShowBtn) {
        addShowBtn.onclick = () => openShowFormModal();
    }

    async function openShowFormModal(show = null) {
        const modal = document.getElementById('show-modal');
        const form = document.getElementById('show-form');
        const titleEl = document.getElementById('show-modal-title');
        const movieSelect = document.getElementById('show-movie-id');

        if (!modal || !form || !movieSelect) return;

        titleEl.textContent = show ? 'Update Show Details' : 'Schedule New Show';

        // Populate movies dropdown
        try {
            const moviesData = await CineNova.api('/api/movies');
            const movies = moviesData.movies || [];
            movieSelect.innerHTML = movies.map(m => `
                <option value="${m.movie_id}" ${show && show.movie_id === m.movie_id ? 'selected' : ''}>${m.title} (${m.language})</option>
            `).join('');
        } catch (e) {
            console.error('Failed to load movies for show form:', e);
        }

        document.getElementById('show-id').value = show ? show.show_id : '';
        document.getElementById('show-theatre').value = show ? show.theatre_name : 'PVR INOX Gold Class - Nexus Mall';
        document.getElementById('show-date').value = show ? show.show_date.substring(0, 10) : new Date().toISOString().substring(0, 10);
        document.getElementById('show-time').value = show ? show.show_time : '18:00';
        document.getElementById('show-price').value = show ? show.ticket_price : '350.00';

        modal.classList.add('active');

        form.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('show-id').value;
            const payload = {
                movie_id: document.getElementById('show-movie-id').value,
                theatre_name: document.getElementById('show-theatre').value,
                show_date: document.getElementById('show-date').value,
                show_time: document.getElementById('show-time').value,
                ticket_price: document.getElementById('show-price').value
            };

            try {
                if (id) {
                    await CineNova.api(`/api/shows/${id}`, {
                        method: 'PUT',
                        body: JSON.stringify(payload)
                    });
                    CineNova.showToast('Updated', 'Show schedule updated successfully.', 'success');
                } else {
                    await CineNova.api('/api/shows', {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    });
                    CineNova.showToast('Created', 'New show scheduled successfully.', 'success');
                }
                modal.classList.remove('active');
                loadShowsManager();
                loadOverview();
            } catch (err) {
                CineNova.showToast('Error', err.message, 'error');
            }
        };

        modal.querySelectorAll('.modal-close, .btn-modal-close').forEach(b => {
            b.onclick = () => modal.classList.remove('active');
        });
    }

    // =========================================================================
    // TAB 4: BOOKING MANAGEMENT
    // =========================================================================
    async function loadBookingsManager() {
        const tbody = document.getElementById('all-bookings-tbody');
        if (!tbody) return;

        try {
            const data = await CineNova.api('/api/admin/bookings');
            const bookings = data.bookings || [];

            if (bookings.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No bookings found.</td></tr>`;
                return;
            }

            tbody.innerHTML = bookings.map(b => {
                let seats = b.seat_numbers;
                if (typeof seats === 'string') {
                    try { seats = JSON.parse(seats); } catch (e) { seats = []; }
                }
                const seatStr = Array.isArray(seats) ? seats.join(', ') : '';

                return `
                    <tr>
                        <td>#${b.booking_id}</td>
                        <td>${b.user_name} <br><small style="color:var(--text-muted)">${b.user_email}</small></td>
                        <td>${b.movie_title}</td>
                        <td>${b.theatre_name}</td>
                        <td>${seatStr} (${b.seats})</td>
                        <td><strong style="color:var(--accent-gold)">${CineNova.formatCurrency(b.total_amount)}</strong></td>
                        <td>
                            <select class="filter-select select-booking-status" data-id="${b.booking_id}" style="padding:0.3rem 0.6rem; font-size:0.8rem;">
                                <option value="Confirmed" ${b.booking_status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                                <option value="Cancelled" ${b.booking_status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                                <option value="Completed" ${b.booking_status === 'Completed' ? 'selected' : ''}>Completed</option>
                            </select>
                        </td>
                        <td><small style="color:var(--text-muted)">${new Date(b.booking_date).toLocaleDateString()}</small></td>
                    </tr>
                `;
            }).join('');

            // Status change listener
            tbody.querySelectorAll('.select-booking-status').forEach(select => {
                select.onchange = async () => {
                    const newStatus = select.value;
                    const bookingId = select.dataset.id;
                    try {
                        const res = await CineNova.api(`/api/admin/bookings/${bookingId}/status`, {
                            method: 'PUT',
                            body: JSON.stringify({ status: newStatus })
                        });
                        CineNova.showToast('Updated', res.message, 'success');
                        loadOverview();
                    } catch (err) {
                        CineNova.showToast('Error', err.message, 'error');
                        loadBookingsManager();
                    }
                };
            });
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="8">Failed to load bookings: ${err.message}</td></tr>`;
        }
    }

    // =========================================================================
    // TAB 5: USER MANAGEMENT
    // =========================================================================
    async function loadUsersManager() {
        const tbody = document.getElementById('users-table-tbody');
        if (!tbody) return;

        try {
            const data = await CineNova.api('/api/admin/users');
            const users = data.users || [];

            if (users.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No registered customers.</td></tr>`;
                return;
            }

            tbody.innerHTML = users.map(u => `
                <tr>
                    <td>#${u.user_id}</td>
                    <td><strong>${u.name}</strong></td>
                    <td>${u.email}</td>
                    <td><span class="badge ${u.role === 'admin' ? 'badge-gold' : 'badge-outline'}">${u.role.toUpperCase()}</span></td>
                    <td>${u.total_bookings} bookings</td>
                    <td><strong style="color:var(--accent-gold)">${CineNova.formatCurrency(u.total_spent)}</strong></td>
                    <td><small style="color:var(--text-muted)">${new Date(u.created_at).toLocaleDateString()}</small></td>
                </tr>
            `).join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="6">Failed to load users: ${err.message}</td></tr>`;
        }
    }
});
