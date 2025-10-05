// Authentication JavaScript for CodeEase
let currentUser = null;
let authToken = null;

// Initialize authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    updateUIBasedOnAuth();
});

// Check if user is authenticated
function checkAuthStatus() {
    authToken = localStorage.getItem('authToken');
    const userInfo = localStorage.getItem('userInfo');
    
    if (authToken && userInfo) {
        try {
            currentUser = JSON.parse(userInfo);
            updateUIBasedOnAuth();
            updateSidebarForRole();
        } catch (error) {
            console.error('Error parsing user info:', error);
            logout();
        }
    }
}

// Update UI based on authentication status
function updateUIBasedOnAuth() {
    const loginBtn = document.querySelector('[onclick="showLoginModal()"]');
    const registerBtn = document.querySelector('[onclick="showRegisterModal()"]');
    const logoutBtn = document.getElementById('logoutBtn');
    const accountDropdown = document.querySelector('.nav-link.dropdown-toggle');
    
    if (currentUser && authToken) {
        // User is logged in
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        
        // Update account dropdown text
        if (accountDropdown) {
            accountDropdown.innerHTML = `<i class="fas fa-user-circle me-1"></i>${currentUser.firstName} ${currentUser.lastName}`;
        }
    } else {
        // User is not logged in
        if (loginBtn) loginBtn.style.display = 'block';
        if (registerBtn) registerBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        
        // Reset account dropdown text
        if (accountDropdown) {
            accountDropdown.innerHTML = '<i class="fas fa-user-circle me-1"></i>Account';
        }
    }
}

// Update sidebar based on user role
function updateSidebarForRole() {
    if (!currentUser) return;
    
    const sidebarItems = document.querySelectorAll('[data-role]');
    
    sidebarItems.forEach(item => {
        const roles = item.getAttribute('data-role').split(',');
        const userRole = getUserRoleString(currentUser.role);
        
        if (roles.includes(userRole) || roles.includes('student')) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Convert role enum to string
function getUserRoleString(roleEnum) {
    switch (roleEnum) {
        case 1: return 'student';
        case 2: return 'teacher';
        case 3: return 'admin';
        default: return 'student';
    }
}

// Show login modal
function showLoginModal() {
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    loginModal.show();
}

// Show register modal
function showRegisterModal() {
    const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
    registerModal.show();
}

// Login function
async function login() {
    const usernameOrEmail = document.getElementById('loginUsernameOrEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!usernameOrEmail || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    try {
        showSpinner();
        
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                usernameOrEmail: usernameOrEmail,
                password: password
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Store authentication data
            localStorage.setItem('authToken', result.accessToken);
            localStorage.setItem('refreshToken', result.refreshToken);
            localStorage.setItem('userInfo', JSON.stringify(result.user));
            
            // Update global variables
            authToken = result.accessToken;
            currentUser = result.user;
            
            // Update UI
            updateUIBasedOnAuth();
            updateSidebarForRole();
            
            // Close modal and show success message
            const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            loginModal.hide();
            
            showToast('Login successful! Welcome back.', 'success');
            
            // Clear form
            document.getElementById('loginForm').reset();
            
        } else {
            showToast(result.message || 'Login failed. Please check your credentials.', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('An error occurred during login. Please try again.', 'error');
    } finally {
        hideSpinner();
    }
}

// Register function
async function register() {
    const firstName = document.getElementById('registerFirstName').value;
    const lastName = document.getElementById('registerLastName').value;
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const role = parseInt(document.getElementById('registerRole').value);
    
    if (!firstName || !lastName || !username || !email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters long', 'error');
        return;
    }
    
    try {
        showSpinner();
        
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                firstName: firstName,
                lastName: lastName,
                username: username,
                email: email,
                password: password,
                role: role
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Store authentication data
            localStorage.setItem('authToken', result.accessToken);
            localStorage.setItem('refreshToken', result.refreshToken);
            localStorage.setItem('userInfo', JSON.stringify(result.user));
            
            // Update global variables
            authToken = result.accessToken;
            currentUser = result.user;
            
            // Update UI
            updateUIBasedOnAuth();
            updateSidebarForRole();
            
            // Close modal and show success message
            const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
            registerModal.hide();
            
            showToast('Registration successful! Welcome to CodeEase.', 'success');
            
            // Clear form
            document.getElementById('registerForm').reset();
            
        } else {
            showToast(result.message || 'Registration failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('An error occurred during registration. Please try again.', 'error');
    } finally {
        hideSpinner();
    }
}

// Logout function
function logout() {
    // Clear stored data
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userInfo');
    
    // Reset global variables
    authToken = null;
    currentUser = null;
    
    // Update UI
    updateUIBasedOnAuth();
    
    // Hide role-specific sidebar items
    const sidebarItems = document.querySelectorAll('[data-role]');
    sidebarItems.forEach(item => {
        if (!item.getAttribute('data-role').includes('student')) {
            item.style.display = 'none';
        }
    });
    
    showToast('You have been logged out successfully.', 'success');
    
    // Redirect to home page
    window.location.href = '/';
}

// Make authenticated API requests
async function makeAuthenticatedRequest(url, options = {}) {
    if (!authToken) {
        throw new Error('No authentication token available');
    }
    
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, mergedOptions);
        
        if (response.status === 401) {
            // Token might be expired, try to refresh
            const refreshed = await refreshAuthToken();
            if (refreshed) {
                // Retry the request with new token
                mergedOptions.headers['Authorization'] = `Bearer ${authToken}`;
                return await fetch(url, mergedOptions);
            } else {
                // Refresh failed, logout user
                logout();
                throw new Error('Authentication failed');
            }
        }
        
        return response;
    } catch (error) {
        console.error('Authenticated request error:', error);
        throw error;
    }
}

// Refresh authentication token
async function refreshAuthToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
        return false;
    }
    
    try {
        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                refreshToken: refreshToken
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                localStorage.setItem('authToken', result.accessToken);
                authToken = result.accessToken;
                return true;
            }
        }
    } catch (error) {
        console.error('Token refresh error:', error);
    }
    
    return false;
}

// Utility functions for UI feedback
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast toast-${type}" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <i class="fas fa-${getToastIcon(type)} me-2"></i>
                <strong class="me-auto">${getToastTitle(type)}</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    // Show toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: 5000
    });
    toast.show();
    
    // Remove toast element after it's hidden
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
}

function getToastIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

function getToastTitle(type) {
    switch (type) {
        case 'success': return 'Success';
        case 'error': return 'Error';
        case 'warning': return 'Warning';
        default: return 'Info';
    }
}

function showSpinner() {
    let spinner = document.querySelector('.spinner-overlay');
    if (!spinner) {
        spinner = document.createElement('div');
        spinner.className = 'spinner-overlay';
        spinner.innerHTML = `
            <div class="spinner-border spinner-border-custom text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        `;
        document.body.appendChild(spinner);
    }
    spinner.style.display = 'flex';
}

function hideSpinner() {
    const spinner = document.querySelector('.spinner-overlay');
    if (spinner) {
        spinner.style.display = 'none';
    }
}

// Export functions for use in other scripts
window.CodeEaseAuth = {
    login,
    register,
    logout,
    makeAuthenticatedRequest,
    getCurrentUser: () => currentUser,
    getAuthToken: () => authToken,
    isAuthenticated: () => !!(authToken && currentUser),
    showToast,
    showSpinner,
    hideSpinner
};