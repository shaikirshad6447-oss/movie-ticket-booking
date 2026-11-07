/**
 * ==============================================================================
 * ONLINE MOVIE TICKET BOOKING SYSTEM - GLOBAL CLIENT JAVASCRIPT
 * Project Owner: Shaik Irshad
 * ==============================================================================
 */

const CineNova = (() => {
    const TOKEN_KEY = 'cinenova_token';
    const USER_KEY = 'cinenova_user';

    /**
     * Retrieve stored JWT token
     */
    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    /**
     * Retrieve stored user object
     */
    function getCurrentUser() {
        try {
            const raw = localStorage.getItem(USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Set session credentials
     */
    function setSession(token, user) {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
        updateNavAuthUI();
    }

    /**
     * Clear session and log out
     */
    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        updateNavAuthUI();
        showToast('Logged Out', 'You have been successfully signed out.', 'info');
        setTimeout(() => {
            window.location.href = '/login';
        }, 600);
    }

    /**
     * Centralized API Fetch Wrapper with Token Injection
     */
    async function api(url, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const token = getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        let data;
        try {
            data = await response.json();
        } catch (e) {
            data = { success: false, message: 'Server communication error.' };
        }

        if (!response.ok) {
            // Handle session expiration
            if (response.status === 401 && token) {
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(USER_KEY);
                updateNavAuthUI();
                showToast('Session Expired', 'Please log in again to continue.', 'error');
            }
            throw new Error(data.message || 'Request failed.');
        }

        return data;
    }

    /**
     * Display a floating cinematic Toast notification
     */
    function showToast(title, message, type = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        let icon = 'ℹ️';
        if (type === 'success') icon = '✓';
        if (type === 'error') icon = '⚠';

        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    /**
     * Update navigation header based on active session
     */
    function updateNavAuthUI() {
        const authContainer = document.getElementById('nav-auth-container');
        if (!authContainer) return;

        const user = getCurrentUser();

        if (user) {
            const isAdmin = user.role === 'admin';
            authContainer.innerHTML = `
                <div class="nav-user-menu">
                    ${isAdmin ? `
                        <a href="/admin" class="btn btn-sm btn-gold">
                            <i class="fa-solid fa-gauge"></i> Admin Console
                        </a>
                    ` : ''}
                    <a href="/bookings" class="nav-link" style="display:flex;align-items:center;gap:0.35rem;">
                        <i class="fa-solid fa-ticket"></i> My Bookings
                    </a>
                    <div class="user-pill" title="${user.email}">
                        <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
                        <span>${user.name.split(' ')[0]}</span>
                    </div>
                    <button class="btn btn-sm btn-outline" id="nav-logout-btn" title="Sign Out">
                        <i class="fa-solid fa-right-from-bracket"></i> Logout
                    </button>
                </div>
            `;

            const logoutBtn = document.getElementById('nav-logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', clearSession);
            }
        } else {
            authContainer.innerHTML = `
                <a href="/login" class="btn btn-sm btn-outline">Sign In</a>
                <a href="/register" class="btn btn-sm btn-primary">Get Started</a>
            `;
        }
    }

    /**
     * Format currency (INR standard)
     */
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(amount);
    }

    /**
     * Format date nicely: e.g. "Sat, 07 Nov 2026"
     */
    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    /**
     * Format time e.g. "18:00:00" -> "06:00 PM"
     */
    function formatTime(timeStr) {
        if (!timeStr) return '';
        const parts = timeStr.split(':');
        let hours = parseInt(parts[0], 10);
        const minutes = parts[1] || '00';
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    }

    // Initialize navbar and listeners
    document.addEventListener('DOMContentLoaded', () => {
        updateNavAuthUI();

        // Mobile drawer toggle
        const toggleBtn = document.querySelector('.mobile-toggle');
        const navLinks = document.querySelector('.nav-links');
        if (toggleBtn && navLinks) {
            toggleBtn.addEventListener('click', () => {
                navLinks.classList.toggle('active');
            });
        }
    });

    return {
        getToken,
        getCurrentUser,
        setSession,
        clearSession,
        api,
        showToast,
        updateNavAuthUI,
        formatCurrency,
        formatDate,
        formatTime
    };
})();
