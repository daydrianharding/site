// Configuration
const CONFIG = {
    ADMIN_ROBLOX_ID: 'S1xsGG',
    ADMIN_USERNAME: '[Owner] Ava',
    API_URL: 'http://localhost:5000/api', // Change to your actual backend URL
    BAD_WORDS: ['badword1', 'badword2', 'badword3'] // Add your bad words list
};

// State management
let currentUser = null;
let isAdmin = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    checkBanStatus();
});

// Check authentication status
async function checkAuth() {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    
    if (token && userData) {
        try {
            currentUser = JSON.parse(userData);
            isAdmin = currentUser.robloxId === CONFIG.ADMIN_ROBLOX_ID;
            
            updateUIForUser();
            await verifyToken(token);
        } catch (error) {
            console.error('Auth check failed:', error);
            logout();
        }
    }
}

// Update UI based on user state
function updateUIForUser() {
    if (currentUser) {
        // Hide auth section, show dashboard
        const authSection = document.getElementById('auth-section');
        const dashboard = document.getElementById('dashboard');
        const userInfo = document.getElementById('user-info');
        
        if (authSection) authSection.style.display = 'none';
        if (dashboard) {
            dashboard.style.display = 'block';
            const displayUsername = document.getElementById('display-username');
            if (displayUsername) {
                displayUsername.innerHTML = isAdmin ? 
                    `<span class="owner-username">${CONFIG.ADMIN_USERNAME}</span>` : 
                    currentUser.username;
            }
        }
        if (userInfo) {
            userInfo.style.display = 'flex';
            const usernameSpan = document.getElementById('username');
            const avatarImg = document.getElementById('user-avatar');
            
            if (usernameSpan) {
                usernameSpan.innerHTML = isAdmin ? 
                    `<span class="owner-username">${CONFIG.ADMIN_USERNAME}</span>` : 
                    currentUser.username;
            }
            if (avatarImg && currentUser.avatar) {
                avatarImg.src = currentUser.avatar;
            }
        }
        
        // Show admin panel button for admin
        const adminBtn = document.getElementById('admin-panel-btn');
        if (adminBtn) {
            adminBtn.style.display = isAdmin ? 'block' : 'none';
        }
    }
}

// Roblox OAuth (Simulated - You'll need to implement actual OAuth)
async function loginWithRoblox() {
    // In production, redirect to Roblox OAuth
    // For demo, we'll simulate authentication
    const mockRobloxUser = {
        id: '123456',
        username: 'RobloxUser',
        avatar: 'https://tr.rbxcdn.com/ed87c02bb6e9c62f0bd3e4a25f058d17/150/150/AvatarHeadshot/WebP'
    };
    
    try {
        // Check if this is the admin
        if (mockRobloxUser.username === CONFIG.ADMIN_ROBLOX_ID) {
            // Auto-login admin
            const adminUser = {
                robloxId: CONFIG.ADMIN_ROBLOX_ID,
                username: CONFIG.ADMIN_USERNAME,
                avatar: mockRobloxUser.avatar,
                isAdmin: true
            };
            
            localStorage.setItem('user_data', JSON.stringify(adminUser));
            localStorage.setItem('auth_token', 'admin_token_' + Date.now());
            
            currentUser = adminUser;
            isAdmin = true;
            
            updateUIForUser();
            window.location.href = 'index.html';
            return;
        }
        
        // For regular users, redirect to username selection
        localStorage.setItem('temp_roblox_data', JSON.stringify(mockRobloxUser));
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

// Username registration
async function registerUsername() {
    const usernameInput = document.getElementById('username-input');
    const errorDiv = document.getElementById('username-error');
    
    if (!usernameInput || !errorDiv) return;
    
    const username = usernameInput.value.trim();
    
    // Validation
    if (!username) {
        errorDiv.textContent = 'Username cannot be empty';
        return;
    }
    
    if (username.length < 3) {
        errorDiv.textContent = 'Username must be at least 3 characters';
        return;
    }
    
    if (username.length > 20) {
        errorDiv.textContent = 'Username must be less than 20 characters';
        return;
    }
    
    // Check for bad words
    if (CONFIG.BAD_WORDS.some(word => username.toLowerCase().includes(word))) {
        errorDiv.textContent = 'Username contains inappropriate words';
        return;
    }
    
    // Check if username exists
    try {
        const response = await fetch(`${CONFIG.API_URL}/check-username`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        
        const data = await response.json();
        
        if (!data.available) {
            errorDiv.textContent = 'Username already taken';
            return;
        }
        
        // Create user account
        const robloxData = JSON.parse(localStorage.getItem('temp_roblox_data') || '{}');
        
        const userData = {
            robloxId: robloxData.id,
            username: username,
            avatar: robloxData.avatar,
            isAdmin: false,
            createdAt: new Date().toISOString()
        };
        
        // Save to localStorage for demo
        localStorage.setItem('user_data', JSON.stringify(userData));
        localStorage.setItem('auth_token', 'user_token_' + Date.now());
        localStorage.removeItem('temp_roblox_data');
        
        // Redirect to main page
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Registration error:', error);
        errorDiv.textContent = 'Registration failed. Please try again.';
    }
}

// Ban management
async function banUser() {
    if (!isAdmin) return;
    
    const usernameInput = document.getElementById('ban-username');
    if (!usernameInput || !usernameInput.value.trim()) {
        alert('Please enter a username');
        return;
    }
    
    const username = usernameInput.value.trim();
    
    if (confirm(`Are you sure you want to ban ${username}?`)) {
        try {
            const response = await fetch(`${CONFIG.API_URL}/ban`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({
                    username: username,
                    reason: 'Admin ban',
                    admin: currentUser.username
                })
            });
            
            if (response.ok) {
                alert(`${username} has been banned.`);
                usernameInput.value = '';
                
                // Force logout if banned user is currently logged in
                const currentUsername = currentUser?.username;
                if (currentUsername === username) {
                    logout();
                }
            } else {
                throw new Error('Ban failed');
            }
        } catch (error) {
            console.error('Ban error:', error);
            alert('Failed to ban user');
        }
    }
}

async function unbanUser() {
    if (!isAdmin) return;
    
    const usernameInput = document.getElementById('unban-username');
    if (!usernameInput || !usernameInput.value.trim()) {
        alert('Please enter a username');
        return;
    }
    
    const username = usernameInput.value.trim();
    
    if (confirm(`Are you sure you want to unban ${username}?`)) {
        try {
            const response = await fetch(`${CONFIG.API_URL}/unban`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({ username })
            });
            
            if (response.ok) {
                alert(`${username} has been unbanned.`);
                usernameInput.value = '';
            } else {
                throw new Error('Unban failed');
            }
        } catch (error) {
            console.error('Unban error:', error);
            alert('Failed to unban user');
        }
    }
}

// Check ban status
async function checkBanStatus() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${CONFIG.API_URL}/check-ban/${currentUser.username}`);
        const data = await response.json();
        
        if (data.isBanned) {
            showBanOverlay();
        }
    } catch (error) {
        console.error('Ban check error:', error);
    }
}

function showBanOverlay() {
    const overlay = document.getElementById('ban-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
        // Hide other content
        document.querySelector('.main-content').style.display = 'none';
        document.querySelector('.admin-sidebar')?.style.display = 'none';
    }
}

// Logout
function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('temp_roblox_data');
    window.location.href = 'index.html';
}

// Toggle admin panel
function toggleAdminPanel() {
    if (!isAdmin) return;
    
    const sidebar = document.getElementById('admin-sidebar');
    if (sidebar) {
        sidebar.classList.toggle('show');
    }
}

// View reports
function viewReports() {
    window.location.href = 'report-bug.html';
}

// View appeals
function viewAppeals() {
    window.location.href = 'appeal.html';
}

// Verify token with backend
async function verifyToken(token) {
    try {
        const response = await fetch(`${CONFIG.API_URL}/verify-token`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Invalid token');
        }
    } catch (error) {
        console.error('Token verification failed:', error);
        logout();
    }
        }
