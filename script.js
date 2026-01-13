// Configuration
const CONFIG = {
    ADMIN_ROBLOX_USERNAME: 'S1xsGG', // Ava's Roblox username
    ADMIN_DISPLAY_NAME: '[Owner] Ava',
    ROBLOX_API_URL: 'https://users.roblox.com/v1/users/search?keyword=',
    ROBLOX_AVATAR_URL: 'https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=',
    BAD_WORDS: ['bad', 'word', 'list', 'here'], // Add your bad words
    SITE_NAME: 'SparkleChat',
    COLORS: {
        pink: '#ff6bcb',
        purple: '#a855f7'
    }
};

// State management
let currentUser = null;
let isAdmin = false;
let robloxDataCache = {};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkExistingSession();
    updateSparkles();
    setRandomHearts();
});

// Check existing session
async function checkExistingSession() {
    const token = localStorage.getItem('sparkle_token');
    const userData = localStorage.getItem('sparkle_user');
    
    if (token && userData) {
        try {
            currentUser = JSON.parse(userData);
            isAdmin = currentUser.robloxUsername === CONFIG.ADMIN_ROBLOX_USERNAME;
            
            // Check if user is banned
            const isBanned = await checkBanStatus(currentUser.username);
            if (isBanned) {
                showBanOverlay();
                return;
            }
            
            updateUIForUser();
        } catch (error) {
            console.error('Session check failed:', error);
            logout();
        }
    }
}

// Check Roblox Account
async function checkRobloxAccount() {
    const usernameInput = document.getElementById('roblox-username');
    const errorDiv = document.getElementById('login-error');
    
    if (!usernameInput || !errorDiv) return;
    
    const username = usernameInput.value.trim();
    
    // Clear previous errors
    errorDiv.textContent = '';
    usernameInput.classList.remove('error');
    
    // Validation
    if (!username) {
        errorDiv.textContent = '🌸 Please enter your Roblox username';
        usernameInput.classList.add('error');
        return;
    }
    
    if (username.length < 3) {
        errorDiv.textContent = '🌸 Username must be at least 3 characters';
