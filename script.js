// Configuration
const CONFIG = {
    ADMIN_ROBLOX_USERNAME: 'S1xsGG',
    ADMIN_DISPLAY_NAME: '[Owner] Ava',
    ROBLOX_API_URL: 'https://users.roblox.com/v1/users/search?keyword=',
    ROBLOX_AVATAR_URL: 'https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=',
    SITE_NAME: 'Nexus Hub',
    API_BASE: 'http://localhost:5000/api' // Change to your backend
};

// State
let currentUser = null;
let isAdmin = false;
let isLoading = false;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing Nexus Hub...');
    await checkSession();
    updateStats();
});

// Session Check
async function checkSession() {
    try {
        const token = localStorage.getItem('nexus_token');
        const userData = localStorage.getItem('nexus_user');
        
        if (token && userData) {
            currentUser = JSON.parse(userData);
            isAdmin = currentUser.robloxUsername === CONFIG.ADMIN_ROBLOX_USERNAME;
            
            // Check ban status
            const banned = await checkBanStatus(currentUser.username);
            if (banned) {
                showRestrictionOverlay();
                return;
            }
            
            updateUI();
            console.log('Session restored:', currentUser.username);
        }
    } catch (error) {
        console.error('Session error:', error);
        logout();
    }
}

// FIXED: Verify Roblox Account
async function verifyRobloxAccount() {
    console.log('Starting verification...');
    
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
    
    // Validation
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
        console.log('Checking username:', username);
        
        // For demo/testing purposes
        if (username.toLowerCase() === 'testuser') {
            // Test account for development
            await handleSuccessfulLogin({
                username: 'TestUser',
                displayName: 'Test User',
                id: '123456',
                avatar: 'https://via.placeholder.com/150'
            }, false);
            return;
        }
        
        // Real Roblox API check
        const response = await fetch(`${CONFIG.ROBLOX_API_URL}${encodeURIComponent(username)}&limit=1`);
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        console.log('Roblox API response:', data);
        
        if (!data.data || data.data.length === 0) {
            showError('Roblox account not found');
            return;
        }
        
        const robloxUser = data.data[0];
        console.log('Found Roblox user:', robloxUser.name);
        
        // Check if this is Ava's account
        if (robloxUser.name === CONFIG.ADMIN_ROBLOX_USERNAME) {
            // Admin login
            await handleAdminLogin(robloxUser);
        } else {
            // Regular user - go to username setup
            await handleUserLogin(robloxUser);
        }
        
    } catch (error) {
        console.error('Verification error:', error);
        showError('Unable to verify Roblox account. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Handle Admin Login
async function handleAdminLogin(robloxUser) {
    console.log('Admin login detected');
    
    // Get avatar
    const avatar = await getRobloxAvatar(robloxUser.id);
    
    // Create admin user object
    const adminUser = {
        robloxUsername: robloxUser.name,
        robloxId: robloxUser.id,
        username: CONFIG.ADMIN_DISPLAY_NAME,
        displayName: 'System Administrator',
        avatar: avatar,
        isAdmin: true,
        joined: new Date().toISOString()
    };
    
    // Save to localStorage
    localStorage.setItem('nexus_user', JSON.stringify(adminUser));
    localStorage.setItem('nexus_token', `admin_${Date.now()}`);
    
    currentUser = adminUser;
    isAdmin = true;
    
    // Update UI
    updateUI();
    console.log('Admin login successful');
    
    // Show welcome message
    showNotification('Welcome, System Administrator!', 'success');
}

// Handle Regular User Login
