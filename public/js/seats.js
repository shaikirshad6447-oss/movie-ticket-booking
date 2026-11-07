/**
 * Interactive Cinema Seat Selection Client
 * Online Movie Ticket Booking System - Project Owner: Shaik Irshad
 */

const SeatsModule = (() => {
    let currentShow = null;
    let bookedSeatsSet = new Set();
    const selectedSeats = new Set();

    // Define standard cinema rows and seat counts
    // Rows A to H (8 rows x 10 seats = 80 seats total)
    const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const SEATS_PER_ROW = 10;
    const AISLE_AFTER = 5; // Split 5 left, 5 right

    async function initSeatPage() {
        const urlParams = new URLSearchParams(window.location.search);
        const showId = urlParams.get('showId');

        if (!showId) {
            window.location.href = '/movies';
            return;
        }

        await fetchSeatMap(showId);
        setupEventListeners(showId);
    }

    /**
     * Fetch show metadata and currently booked seats
     */
    async function fetchSeatMap(showId) {
        try {
            const data = await IrshadCinemas.api(`/api/shows/${showId}/seats`);
            currentShow = data.show;
            bookedSeatsSet = new Set((data.booked_seats || []).map(s => String(s).toUpperCase()));

            updateShowHeader(currentShow);
            renderMatrix();
            updateSummary();
        } catch (err) {
            IrshadCinemas.showToast('Error', err.message, 'error');
            const matrixEl = document.getElementById('seat-matrix');
            if (matrixEl) {
                matrixEl.innerHTML = `<div class="empty-state">${err.message}</div>`;
            }
        }
    }

    /**
     * Update show and movie information in sidebar summary
     */
    function updateShowHeader(show) {
        document.title = `Select Seats - ${show.movie_title}`;
        
        const posterEl = document.getElementById('summary-poster');
        if (posterEl) posterEl.src = show.poster_url || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600&auto=format&fit=crop';

        const titleEl = document.getElementById('summary-movie-title');
        if (titleEl) titleEl.textContent = show.movie_title;

        const theatreEl = document.getElementById('summary-theatre');
        if (theatreEl) theatreEl.textContent = show.theatre_name;

        const showtimeEl = document.getElementById('summary-showtime');
        if (showtimeEl) {
            showtimeEl.textContent = `${IrshadCinemas.formatDate(show.show_date)} • ${IrshadCinemas.formatTime(show.show_time)}`;
        }

        const priceEl = document.getElementById('summary-ticket-price');
        if (priceEl) priceEl.textContent = IrshadCinemas.formatCurrency(show.ticket_price);
    }

    /**
     * Render the visual cinema seating matrix
     */
    function renderMatrix() {
        const container = document.getElementById('seat-matrix');
        if (!container) return;

        let html = '';

        ROWS.forEach(rowLetter => {
            html += `<div class="seat-row" data-row="${rowLetter}">`;
            html += `<span class="row-label">${rowLetter}</span>`;

            // Left group
            html += `<div class="seat-group">`;
            for (let num = 1; num <= AISLE_AFTER; num++) {
                const seatId = `${rowLetter}${num}`;
                const isBooked = bookedSeatsSet.has(seatId);
                const isSelected = selectedSeats.has(seatId);

                let statusClass = 'available';
                if (isBooked) statusClass = 'booked';
                else if (isSelected) statusClass = 'selected';

                html += `
                    <div class="seat ${statusClass}" data-seat="${seatId}" title="${seatId} (${statusClass})">
                        ${num}
                    </div>
                `;
            }
            html += `</div>`;

            // Aisle spacer
            html += `<div class="seat-aisle-gap"></div>`;

            // Right group
            html += `<div class="seat-group">`;
            for (let num = AISLE_AFTER + 1; num <= SEATS_PER_ROW; num++) {
                const seatId = `${rowLetter}${num}`;
                const isBooked = bookedSeatsSet.has(seatId);
                const isSelected = selectedSeats.has(seatId);

                let statusClass = 'available';
                if (isBooked) statusClass = 'booked';
                else if (isSelected) statusClass = 'selected';

                html += `
                    <div class="seat ${statusClass}" data-seat="${seatId}" title="${seatId} (${statusClass})">
                        ${num}
                    </div>
                `;
            }
            html += `</div>`;

            html += `<span class="row-label">${rowLetter}</span>`;
            html += `</div>`;
        });

        container.innerHTML = html;

        // Attach seat click listener
        container.querySelectorAll('.seat.available, .seat.selected').forEach(seatEl => {
            seatEl.addEventListener('click', () => {
                const seatId = seatEl.dataset.seat;
                toggleSeat(seatId, seatEl);
            });
        });
    }

    /**
     * Toggle selection of a single seat
     */
    function toggleSeat(seatId, element) {
        if (bookedSeatsSet.has(seatId)) return;

        if (selectedSeats.has(seatId)) {
            selectedSeats.delete(seatId);
            element.classList.remove('selected');
            element.classList.add('available');
        } else {
            if (selectedSeats.size >= 10) {
                IrshadCinemas.showToast('Seat Limit Reached', 'You can select a maximum of 10 seats per booking.', 'info');
                return;
            }
            selectedSeats.add(seatId);
            element.classList.remove('available');
            element.classList.add('selected');
        }

        updateSummary();
    }

    /**
     * Dynamically update total amount, seat count, and pill list
     */
    function updateSummary() {
        const count = selectedSeats.size;
        const countEl = document.getElementById('selected-count');
        const listEl = document.getElementById('selected-seats-list');
        const subtotalEl = document.getElementById('summary-subtotal');
        const totalEl = document.getElementById('summary-total-amount');
        const bookBtn = document.getElementById('confirm-booking-btn');

        if (countEl) countEl.textContent = count;

        if (listEl) {
            if (count === 0) {
                listEl.innerHTML = `<span style="color:var(--text-muted);font-size:0.85rem;">None selected</span>`;
            } else {
                listEl.innerHTML = Array.from(selectedSeats)
                    .sort()
                    .map(s => `<span class="seat-pill">${s}</span>`)
                    .join('');
            }
        }

        const ticketPrice = currentShow ? parseFloat(currentShow.ticket_price) : 0;
        const total = count * ticketPrice;

        if (subtotalEl) subtotalEl.textContent = IrshadCinemas.formatCurrency(total);
        if (totalEl) totalEl.textContent = IrshadCinemas.formatCurrency(total);

        if (bookBtn) {
            bookBtn.disabled = count === 0;
            bookBtn.innerHTML = count === 0 
                ? 'Select Seats to Proceed' 
                : `<i class="fa-solid fa-lock"></i> Confirm & Book ${count} Seat${count > 1 ? 's' : ''} (${IrshadCinemas.formatCurrency(total)})`;
        }
    }

    /**
     * Set up confirm booking click event with transaction support
     */
    function setupEventListeners(showId) {
        const bookBtn = document.getElementById('confirm-booking-btn');
        if (!bookBtn) return;

        bookBtn.addEventListener('click', async () => {
            if (selectedSeats.size === 0) return;

            // Check if user is authenticated
            const user = IrshadCinemas.getCurrentUser();
            if (!user) {
                IrshadCinemas.showToast('Authentication Required', 'Please sign in to complete your booking.', 'info');
                setTimeout(() => {
                    window.location.href = `/login?redirect=${encodeURIComponent(window.location.href)}`;
                }, 800);
                return;
            }

            bookBtn.disabled = true;
            bookBtn.innerHTML = `<div class="spinner" style="width:18px;height:18px;margin:0 auto;border-width:2px;"></div>`;

            try {
                const response = await IrshadCinemas.api('/api/bookings', {
                    method: 'POST',
                    body: JSON.stringify({
                        show_id: parseInt(showId, 10),
                        seat_numbers: Array.from(selectedSeats)
                    })
                });

                IrshadCinemas.showToast('Success!', response.message, 'success');
                
                // Show booking confirmation modal or redirect to /bookings
                setTimeout(() => {
                    window.location.href = `/bookings?confirmedId=${response.booking.booking_id}`;
                }, 1000);
            } catch (err) {
                IrshadCinemas.showToast('Booking Failed', err.message, 'error');
                bookBtn.disabled = false;
                updateSummary();
                // Refresh seat map to reflect any freshly booked seats by other customers
                await fetchSeatMap(showId);
            }
        });
    }

    document.addEventListener('DOMContentLoaded', initSeatPage);

    return {
        initSeatPage
    };
})();
