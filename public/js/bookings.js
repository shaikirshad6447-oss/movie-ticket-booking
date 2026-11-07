/**
 * Bookings History Client Controller
 * Online Movie Ticket Booking System - Project Owner: Shaik Irshad
 */

document.addEventListener('DOMContentLoaded', async () => {
    const listContainer = document.getElementById('my-bookings-list');
    if (!listContainer) return;

    const user = IrshadCinemas.getCurrentUser();
    if (!user) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.href)}`;
        return;
    }

    try {
        const data = await IrshadCinemas.api('/api/bookings/my');
        const bookings = data.bookings || [];

        if (bookings.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fa-solid fa-ticket-simple"></i></div>
                    <h3>No Bookings Found</h3>
                    <p style="color:var(--text-secondary); margin:0.5rem 0 1.5rem;">You haven't reserved any movie tickets yet.</p>
                    <a href="/movies" class="btn btn-primary">Explore Movies</a>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = bookings.map(b => {
            let seats = b.seat_numbers;
            if (typeof seats === 'string') {
                try { seats = JSON.parse(seats); } catch (e) { seats = []; }
            }
            const seatString = Array.isArray(seats) ? seats.join(', ') : '';

            let statusClass = 'status-confirmed';
            if (b.booking_status === 'Cancelled') statusClass = 'status-cancelled';
            if (b.booking_status === 'Completed') statusClass = 'status-completed';

            return `
                <div class="movie-card" style="flex-direction:row; padding:1.25rem; gap:1.5rem; align-items:center;">
                    <img src="${b.poster_url || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=200&auto=format&fit=crop'}" 
                         style="width:90px; height:130px; object-fit:cover; border-radius:var(--radius-md);" 
                         alt="${b.movie_title}">
                    
                    <div style="flex:1; display:flex; flex-direction:column; gap:0.4rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
                            <h3 style="font-size:1.25rem; font-weight:700;">${b.movie_title}</h3>
                            <span class="status-badge ${statusClass}">${b.booking_status}</span>
                        </div>
                        <p style="color:var(--text-secondary); font-size:0.9rem;">
                            <i class="fa-solid fa-location-dot" style="color:var(--accent-red); margin-right:4px;"></i> ${b.theatre_name}
                        </p>
                        <p style="color:var(--accent-gold); font-size:0.875rem; font-weight:600;">
                            <i class="fa-regular fa-calendar" style="margin-right:4px;"></i> ${IrshadCinemas.formatDate(b.show_date)} • ${IrshadCinemas.formatTime(b.show_time)}
                        </p>
                        <div style="display:flex; gap:1.5rem; font-size:0.85rem; color:var(--text-muted); margin-top:0.4rem; flex-wrap:wrap;">
                            <span>Booking ID: <strong style="color:var(--text-primary)">#${b.booking_id}</strong></span>
                            <span>Seats (${b.seats}): <strong style="color:var(--text-primary)">${seatString}</strong></span>
                            <span>Total Paid: <strong style="color:var(--accent-gold); font-size:1rem;">${IrshadCinemas.formatCurrency(b.total_amount)}</strong></span>
                        </div>
                    </div>

                    <div>
                        <button class="btn btn-outline btn-view-ticket" data-booking='${JSON.stringify(b)}'>
                            <i class="fa-solid fa-qrcode"></i> View Ticket
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Attach View Ticket Modal listeners
        listContainer.querySelectorAll('.btn-view-ticket').forEach(btn => {
            btn.addEventListener('click', () => {
                const booking = JSON.parse(btn.dataset.booking);
                openTicketModal(booking);
            });
        });

        // Check if redirected right after confirmation
        const urlParams = new URLSearchParams(window.location.search);
        const confirmedId = urlParams.get('confirmedId');
        if (confirmedId) {
            const match = bookings.find(b => String(b.booking_id) === String(confirmedId));
            if (match) {
                openTicketModal(match);
            }
        }
    } catch (err) {
        listContainer.innerHTML = `<div class="empty-state">Failed to load booking history: ${err.message}</div>`;
    }
});

/**
 * Open Cinematic Printable e-Ticket Modal
 */
function openTicketModal(b) {
    const modal = document.getElementById('ticket-modal');
    if (!modal) return;

    let seats = b.seat_numbers;
    if (typeof seats === 'string') {
        try { seats = JSON.parse(seats); } catch (e) { seats = []; }
    }
    const seatString = Array.isArray(seats) ? seats.join(', ') : '';

    document.getElementById('modal-booking-id').textContent = `#IC-${String(b.booking_id).padStart(6, '0')}`;
    document.getElementById('modal-movie-title').textContent = b.movie_title;
    document.getElementById('modal-theatre').textContent = b.theatre_name;
    document.getElementById('modal-showtime').textContent = `${IrshadCinemas.formatDate(b.show_date)} at ${IrshadCinemas.formatTime(b.show_time)}`;
    document.getElementById('modal-seats').textContent = `${seatString} (${b.seats} Ticket${b.seats > 1 ? 's' : ''})`;
    document.getElementById('modal-amount').textContent = IrshadCinemas.formatCurrency(b.total_amount);
    document.getElementById('modal-status').textContent = b.booking_status;

    modal.classList.add('active');

    // Close buttons
    const closeBtns = modal.querySelectorAll('.modal-close, .btn-modal-close');
    closeBtns.forEach(btn => {
        btn.onclick = () => modal.classList.remove('active');
    });

    const printBtn = document.getElementById('modal-print-btn');
    if (printBtn) {
        printBtn.onclick = () => window.print();
    }
}
