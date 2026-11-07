/**
 * Authentication Client Script
 * Handles Registration, Login, Demo Account Autofill, and Form Validation
 */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // Password visibility toggle
    document.querySelectorAll('.password-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                btn.innerHTML = '<i class="fa-regular fa-eye-slash"></i>';
            } else {
                input.type = 'password';
                btn.innerHTML = '<i class="fa-regular fa-eye"></i>';
            }
        });
    });

    // =========================================================================
    // LOGIN FORM HANDLER
    // =========================================================================
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            if (!email || !password) {
                CineNova.showToast('Validation Error', 'Please enter your email and password.', 'error');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = `<div class="spinner" style="width:18px;height:18px;margin:0 auto;border-width:2px;"></div>`;

            try {
                const data = await CineNova.api('/api/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });

                CineNova.setSession(data.token, data.user);
                CineNova.showToast('Signed In', data.message, 'success');

                const urlParams = new URLSearchParams(window.location.search);
                const redirect = urlParams.get('redirect');

                setTimeout(() => {
                    if (data.user.role === 'admin' && !redirect) {
                        window.location.href = '/admin';
                    } else {
                        window.location.href = redirect || '/';
                    }
                }, 600);
            } catch (err) {
                CineNova.showToast('Authentication Failed', err.message, 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Sign In';
            }
        });

        // Quick Demo Account Buttons
        const demoAdminBtn = document.getElementById('demo-admin-btn');
        const demoUserBtn = document.getElementById('demo-user-btn');

        if (demoAdminBtn) {
            demoAdminBtn.addEventListener('click', () => {
                document.getElementById('login-email').value = 'admin@cinenova.com';
                document.getElementById('login-password').value = 'Admin@123';
                CineNova.showToast('Demo Account', 'Populated Administrator credentials.', 'info');
            });
        }

        if (demoUserBtn) {
            demoUserBtn.addEventListener('click', () => {
                document.getElementById('login-email').value = 'irshad@example.com';
                document.getElementById('login-password').value = 'User@123';
                CineNova.showToast('Demo Account', 'Populated Customer credentials.', 'info');
            });
        }
    }

    // =========================================================================
    // REGISTRATION FORM HANDLER
    // =========================================================================
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('register-name').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;
            const submitBtn = registerForm.querySelector('button[type="submit"]');

            if (!name || !email || !password || !confirmPassword) {
                CineNova.showToast('Validation Error', 'All fields are required.', 'error');
                return;
            }

            if (password.length < 6) {
                CineNova.showToast('Weak Password', 'Password must be at least 6 characters.', 'error');
                return;
            }

            if (password !== confirmPassword) {
                CineNova.showToast('Mismatch', 'Passwords do not match.', 'error');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = `<div class="spinner" style="width:18px;height:18px;margin:0 auto;border-width:2px;"></div>`;

            try {
                const data = await CineNova.api('/api/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({ name, email, password, confirmPassword })
                });

                CineNova.setSession(data.token, data.user);
                CineNova.showToast('Account Created', data.message, 'success');

                setTimeout(() => {
                    window.location.href = '/';
                }, 800);
            } catch (err) {
                CineNova.showToast('Registration Error', err.message, 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Create Account';
            }
        });
    }
});
