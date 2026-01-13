// Configuration
const CONFIG = {
    ADMIN_ROBLOX_USERNAME: 'S1xsGG',
    ADMIN_DISPLAY_NAME: '[Owner] Ava',
    ROBLOX_API_URL: 'https://users.roblox.com/v1/users/search?keyword=',
    ROBLOX_AVATAR_URL: 'https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=',
    SITE_NAME: 'Nexus Hub'
};

// State
let currentUser = null;
let isAdmin = false;
let isLoading = false;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing Nexus Hub...');
    await checkSession();
});

// Session Check
async function checkSession() {
    try {
        const token = localStorage.getItem('nexus_token');
        const userData = localStorage.getItem('nexus_user');
        
        if (token && userData) {
            currentUser = JSON.parse(userData);
            isAdmin = currentUser.isAdmin || false;
            
            // Check ban status
            const banned = await checkBanStatus(currentUser.username);
            if (banned) {
                showRestrictionOverlay();
                return;
            }
            
            showDashboard();
            console.log('Session restored:', currentUser.username);
        }
    } catch (error) {
        console.error('Session error:', error);
        logout();
    }
}

// Show Dashboard
function showDashboard() {
    console.log('Showing dashboard...');
    
    // Hide login section
    const authSection = document.getElementById('auth-section');
    const dashboard = document.getElementById('dashboard');
    const userInfo = document.getElementById('user-info');
    const adminToggle = document.getElementById('admin-toggle');
    const adminDashboard = document.getElementById('admin-dashboard');
    
    if (authSection) authSection.style.display = 'none';
    if (dashboard) {
        dashboard.style.display = 'block';
        
        // Update username display
        const displayUsername = document.getElementById('display-username');
        if (displayUsername) {
            displayUsername.textContent = currentUser.displayName || currentUser.username;
            if (isAdmin) {
                displayUsername.innerHTML = `<span class="owner-text">${currentUser.displayName}</span>`;
            }
        }
        
        // Update avatar
        const dashboardAvatar = document.getElementById('dashboard-avatar');
        if (dashboardAvatar && currentUser.avatar) {
            dashboardAvatar.src = currentUser.avatar;
        }
    }
    
    // Show user info in header
    if (userInfo) {
        userInfo.style.display = 'flex';
        const usernameSpan = document.getElementById('username');
        const avatarImg = document.getElementById('user-avatar');
        
        if (usernameSpan) {
            usernameSpan.textContent = currentUser.displayName || currentUser.username;
            if (isAdmin) {
                usernameSpan.innerHTML = `<span class="owner-text">${currentUser.displayName}</span>`;
            }
        }
        
        if (avatarImg && currentUser.avatar) {
            avatarImg.src = currentUser.avatar;
        }
    }
    
    // Show admin toggle if admin
    if (adminToggle) {
        adminToggle.style.display = isAdmin ? 'flex' : 'none';
    }
    
    // Show admin dashboard if admin
    if (adminDashboard) {
        adminDashboard.style.display = isAdmin ? 'block' : 'none';
    }
    
    console.log('Dashboard shown successfully');
}

// Show Login
function showLogin() {
    console.log('Showing login...');
    
    const authSection = document.getElementById('auth-section');
    const dashboard = document.getElementById('dashboard');
    const userInfo = document.getElementById('user-info');
    
    if (authSection) authSection.style.display = 'block';
    if (dashboard) dashboard.style.display = 'none';
    if (userInfo) userInfo.style.display = 'none';
}

// FIXED: Verify Roblox Account
async function verifyRobloxAccount() {
    console.log('=== Starting Roblox Verification ===');
    
    const usernameInput = document.getElementById('roblox-username');
    const errorDiv = document.getElementById('login-error');
    
    if (!usernameInput || !errorDiv) {
        console.error('DOM elements not found');
        return;
    }
    
    const username = usernameInput.value.trim();
    console.log('Username entered:', username);
    
    // Clear previous errors
    errorDiv.textContent = '';
    errorDiv.classList.remove('show');
    usernameInput.classList.remove('error');
    
    // Basic validation
    if (!username) {
        showError('Please enter your Roblox username');
        usernameInput.classList.add('error');
        return;
    }
    
    if (username.length < 3 || username.length > 20) {
        showError('Username must be 3-20 characters');
        usernameInput.classList.add('error');
        return;
    }
    
    // Show loading
    showLoading(true);
    
    try {
        console.log('Checking Roblox username:', username);
        
        // For testing - bypass API for now
        await handleSuccessfulLogin(username, username === CONFIG.ADMIN_ROBLOX_USERNAME);
        
        /* 
        // Real API call (uncomment for production)
        const response = await fetch(`${CONFIG.ROBLOX_API_URL}${encodeURIComponent(username)}&limit=1`);
        
        if (!response.ok) {
            throw new Error('Roblox API request failed');
        }
        
        const data = await response.json();
        console.log('Roblox API response:', data);
        
        if (!data.data || data.data.length === 0) {
            showError('Roblox account not found. Please check the username.');
            return;
        }
        
        const robloxUser = data.data[0];
        console.log('Found Roblox user:', robloxUser.name);
        
        // Handle login
        if (robloxUser.name === CONFIG.ADMIN_ROBLOX_USERNAME) {
            await handleAdminLogin(robloxUser);
        } else {
            await handleUserLogin(robloxUser);
        }
        */
        
    } catch (error) {
        console.error('Verification error:', error);
        showError('Unable to verify Roblox account. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Handle Successful Login
async function handleSuccessfulLogin(username, isAdminUser = false) {
    console.log('Handling successful login for:', username, 'isAdmin:', isAdminUser);
    
    let userData;
    
    if (isAdminUser) {
        // Admin user
        userData = {
            robloxUsername: username,
            username: CONFIG.ADMIN_DISPLAY_NAME,
            displayName: 'System Administrator',
            avatar: 'https://tr.rbxcdn.com/ed87c02bb6e9c62f0bd3e4a25f058d17/150/150/AvatarHeadshot/WebP',
            isAdmin: true,
            joined: new Date().toISOString()
        };
    } else {
        // Regular user - prompt for custom username
        const customUsername = await promptForUsername(username);
        if (!customUsername) return; // User cancelled
        
        userData = {
            robloxUsername: username,
            username: customUsername.toLowerCase(),
            displayName: customUsername,
            avatar: `https://robohash.org/${username}?set=set4&size=150x150`,
            isAdmin: false,
            joined: new Date().toISOString()
        };
    }
    
    // Save to localStorage
    localStorage.setItem('nexus_user', JSON.stringify(userData));
    localStorage.setItem('nexus_token', `nexus_${Date.now()}_${userData.username}`);
    
    currentUser = userData;
    isAdmin = isAdminUser;
    
    // Show dashboard
    showDashboard();
    
    // Show success message
    showNotification(`Welcome, ${userData.displayName}!`, 'success');
    
    console.log('Login successful:', userData);
}

// Prompt for Custom Username
async function promptForUsername(robloxUsername) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'username-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3><i class="fas fa-user-edit"></i> Choose Your Display Name</h3>
                <p>Your Roblox username: <strong>${robloxUsername}</strong></p>
                <input type="text" id="custom-username-input" placeholder="Enter display name" maxlength="20">
                <div id="username-error" class="error-message"></div>
                <div class="modal-buttons">
                    <button onclick="cancelUsername()" class="modal-btn cancel">Cancel</button>
                    <button onclick="submitUsername()" class="modal-btn submit">Continue</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Focus input
        setTimeout(() => {
            const input = document.getElementById('custom-username-input');
            if (input) input.focus();
        }, 100);
        
        // Store resolve function globally
        window.resolveUsername = resolve;
        window.cancelUsername = () => {
            document.body.removeChild(modal);
            resolve(null);
        };
        window.submitUsername = () => {
            const input = document.getElementById('custom-username-input');
            const errorDiv = document.getElementById('username-error');
            
            if (!input) return;
            
            const username = input.value.trim();
            
            if (!username) {
                errorDiv.textContent = 'Please enter a display name';
                errorDiv.classList.add('show');
                return;
            }
            
            if (username.length < 3) {
                errorDiv.textContent = 'Display name must be at least 3 characters';
                errorDiv.classList.add('show');
                return;
            }
            
            // Check for bad words
            const badWords = ['badword1', 'badword2', 'admin', 'owner', 'moderator'];
            if (badWords.some(word => username.toLowerCase().includes(word))) {
                errorDiv.textContent = 'Display name contains inappropriate words';
                errorDiv.classList.add('show');
                return;
            }
            
            document.body.removeChild(modal);
            resolve(username);
        };
    });
}

// Get Roblox Avatar
async function getRobloxAvatar(userId) {
    try {
        const response = await fetch(`${CONFIG.ROBLOX_AVATAR_URL}${userId}&size=150x150&format=WebP`);
        const data = await response.json();
        return data.data[0]?.imageUrl || `https://robohash.org/${userId}?set=set4&size=150x150`;
    } catch (error) {
        console.error('Failed to get avatar:', error);
        return `https://robohash.org/${userId}?set=set4&size=150x150`;
    }
}

// Show Error
function showError(message) {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.add('show');
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            errorDiv.classList.remove('show');
        }, 5000);
    }
    
    console.error('Login Error:', message);
}

// Show Loading
function showLoading(show) {
    isLoading = show;
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

// Show Notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Check Ban Status
async function checkBanStatus(username) {
    // Mock function - implement with your backend
    const bannedUsers = localStorage.getItem('banned_users');
    if (bannedUsers) {
        const banned = JSON.parse(bannedUsers);
        return banned.includes(username.toLowerCase());
    }
    return false;
}

// Show Restriction Overlay
function showRestrictionOverlay() {
    const overlay = document.getElementById('ban-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

// Toggle Admin Panel
function toggleAdminPanel() {
    const sidebar = document.getElementById('admin-sidebar');
    if (sidebar) {
        sidebar.classList.toggle('show');
    }
}

// Logout
function logout() {
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
    currentUser = null;
    isAdmin = false;
    
    showLogin();
    showNotification('Successfully logged out');
}

// Navigation Functions
function openChat() {
    window.location.href = 'chat.html';
}

function openReport() {
    window.location.href = 'report-bug.html';
}

function openAppeal() {
    window.location.href = 'appeal.html';
}

function openAppealPage() {
    window.location.href = 'appeal.html';
}

function openSettings() {
    showNotification('Settings panel coming soon!');
}

function viewReports() {
    window.location.href = 'report-bug.html';
}

function viewAppeals() {
    window.location.href = 'appeal.html';
}

function viewLogs() {
    showNotification('Activity logs coming soon!');
}

function openSystemMonitor() {
    showNotification('System monitor coming soon!');
}

function openUserManager() {
    showNotification('User manager coming soon!');
}

function openAuditLogs() {
    showNotification('Audit logs coming soon!');
}

function openSecurityPanel() {
    showNotification('Security panel coming soon!');
}

// Ban User
async function banUser() {
    const input = document.getElementById('ban-username');
    if (!input || !input.value.trim()) {
        showNotification('Please enter a username', 'error');
        return;
    }
    
    const username = input.value.trim().toLowerCase();
    
    if (confirm(`Are you sure you want to restrict access for "${username}"?`)) {
        // Save to banned list
        let banned = JSON.parse(localStorage.getItem('banned_users') || '[]');
        if (!banned.includes(username)) {
            banned.push(username);
            localStorage.setItem('banned_users', JSON.stringify(banned));
            
            // If current user is banned, log them out
            if (currentUser && currentUser.username.toLowerCase() === username) {
                logout();
                showRestrictionOverlay();
            }
            
            showNotification(`User "${username}" has been restricted`);
            input.value = '';
            updateStats();
        }
    }
}

// Unban User
async function unbanUser() {
    const input = document.getElementById('unban-username');
    if (!input || !input.value.trim()) {
        showNotification('Please enter a username', 'error');
        return;
    }
    
    const username = input.value.trim().toLowerCase();
    
    if (confirm(`Are you sure you want to restore access for "${username}"?`)) {
        let banned = JSON.parse(localStorage.getItem('banned_users') || '[]');
        const index = banned.indexOf(username);
        if (index > -1) {
            banned.splice(index, 1);
            localStorage.setItem('banned_users', JSON.stringify(banned));
            showNotification(`User "${username}" has been restored`);
            input.value = '';
            updateStats();
        }
    }
}

// Update Stats
function updateStats() {
    const userCount = document.getElementById('user-count');
    const banCount = document.getElementById('ban-count');
    
    if (userCount) {
        // Count users from localStorage
        const users = JSON.parse(localStorage.getItem('users_list') || '[]');
        userCount.textContent = users.length || '0';
    }
    
    if (banCount) {
        const banned = JSON.parse(localStorage.getItem('banned_users') || '[]');
        banCount.textContent = banned.length || '0';
    }
        }
