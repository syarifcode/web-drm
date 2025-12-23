// API Configuration
const API_CONFIG = {
    BASE_URL: 'https://dramabox.sansekai.my.id/api',
    ENDPOINTS: {
        VIP: '/dramabox/vip',
        RANDOM_DRAMA: '/dramabox/randomdrama',
        FOR_YOU: '/dramabox/foryou',
        LATEST: '/dramabox/latest',
        TRENDING: '/dramabox/trending',
        POPULAR_SEARCH: '/dramabox/populersearch',
        SEARCH: '/dramabox/search',
        ALL_EPISODES: '/dramabox/allepisode'
    },
    SETTINGS: {
        ITEMS_PER_PAGE: 20,
        VIDEO_QUALITIES: [
            { id: '144p', label: '144p (Low)', default: false },
            { id: '360p', label: '360p (Medium)', default: false },
            { id: '540p', label: '540p (Good)', default: false },
            { id: '720p', label: '720p (HD)', default: true },
            { id: '1080p', label: '1080p (Full HD)', default: false }
        ],
        DEFAULT_VIDEO_QUALITY: '720p',
        CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
        MAX_RECENT_SEARCHES: 10,
        WATCH_HISTORY_LIMIT: 50
    }
};

// App State
const APP_STATE = {
    currentPage: 'home',
    currentDrama: null,
    currentEpisode: null,
    videoQuality: API_CONFIG.SETTINGS.DEFAULT_VIDEO_QUALITY,
    searchQuery: '',
    watchHistory: [],
    favorites: [],
    cachedData: {},
    isLoading: false
};

// Initialize app state from localStorage
function initializeAppState() {
    try {
        // Load watch history
        const savedHistory = localStorage.getItem('dramabox_watch_history');
        if (savedHistory) {
            APP_STATE.watchHistory = JSON.parse(savedHistory);
        }
        
        // Load favorites
        const savedFavorites = localStorage.getItem('dramabox_favorites');
        if (savedFavorites) {
            APP_STATE.favorites = JSON.parse(savedFavorites);
        }
        
        // Load video quality preference
        const savedQuality = localStorage.getItem('dramabox_video_quality');
        if (savedQuality) {
            APP_STATE.videoQuality = savedQuality;
        }
        
        console.log('App state initialized from localStorage');
    } catch (error) {
        console.error('Error loading app state:', error);
        // Reset to defaults if there's an error
        APP_STATE.watchHistory = [];
        APP_STATE.favorites = [];
        APP_STATE.videoQuality = API_CONFIG.SETTINGS.DEFAULT_VIDEO_QUALITY;
    }
}

// Save state to localStorage
function saveAppState() {
    try {
        localStorage.setItem('dramabox_watch_history', JSON.stringify(APP_STATE.watchHistory));
        localStorage.setItem('dramabox_favorites', JSON.stringify(APP_STATE.favorites));
        localStorage.setItem('dramabox_video_quality', APP_STATE.videoQuality);
    } catch (error) {
        console.error('Error saving app state:', error);
    }
}

// Cache management
function getCachedData(key) {
    const cached = APP_STATE.cachedData[key];
    if (cached && Date.now() - cached.timestamp < API_CONFIG.SETTINGS.CACHE_DURATION) {
        return cached.data;
    }
    return null;
}

function setCachedData(key, data) {
    APP_STATE.cachedData[key] = {
        data: data,
        timestamp: Date.now()
    };
}

// Clear expired cache
function clearExpiredCache() {
    const now = Date.now();
    Object.keys(APP_STATE.cachedData).forEach(key => {
        if (now - APP_STATE.cachedData[key].timestamp > API_CONFIG.SETTINGS.CACHE_DURATION) {
            delete APP_STATE.cachedData[key];
        }
    });
}

// Add to watch history
function addToWatchHistory(dramaId, dramaName, episodeId, episodeTitle) {
    const historyItem = {
        dramaId,
        dramaName,
        episodeId,
        episodeTitle,
        timestamp: Date.now(),
        watchedAt: new Date().toISOString()
    };
    
    // Remove if already exists
    APP_STATE.watchHistory = APP_STATE.watchHistory.filter(
        item => !(item.dramaId === dramaId && item.episodeId === episodeId)
    );
    
    // Add to beginning
    APP_STATE.watchHistory.unshift(historyItem);
    
    // Limit history size
    if (APP_STATE.watchHistory.length > API_CONFIG.SETTINGS.WATCH_HISTORY_LIMIT) {
        APP_STATE.watchHistory = APP_STATE.watchHistory.slice(0, API_CONFIG.SETTINGS.WATCH_HISTORY_LIMIT);
    }
    
    saveAppState();
}

// Toggle favorite
function toggleFavorite(dramaId, dramaName, coverUrl) {
    const index = APP_STATE.favorites.findIndex(fav => fav.dramaId === dramaId);
    
    if (index > -1) {
        // Remove from favorites
        APP_STATE.favorites.splice(index, 1);
        return false;
    } else {
        // Add to favorites
        APP_STATE.favorites.push({
            dramaId,
            dramaName,
            coverUrl,
            addedAt: new Date().toISOString()
        });
        return true;
    }
    
    saveAppState();
}

// Check if drama is favorite
function isFavorite(dramaId) {
    return APP_STATE.favorites.some(fav => fav.dramaId === dramaId);
}

// Format number with K/M suffix
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// Format date
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Truncate text with ellipsis
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Show loading overlay
function showLoading() {
    APP_STATE.isLoading = true;
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.style.display = 'flex';
    }
}

// Hide loading overlay
function hideLoading() {
    APP_STATE.isLoading = false;
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
}

// Show notification
function showNotification(message, type = 'info', duration = 3000) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close"><i class="fas fa-times"></i></button>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: ${type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--danger-color)' : 'var(--primary-color)'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 300px;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
    `;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        .notification-content {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
        }
        .notification-close {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 1rem;
            padding: 0;
            margin-left: 10px;
        }
    `;
    document.head.appendChild(style);
    
    // Add close functionality
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });
    
    // Auto remove after duration
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }
    }, duration);
    
    // Add to DOM
    document.body.appendChild(notification);
}

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        API_CONFIG,
        APP_STATE,
        initializeAppState,
        saveAppState,
        getCachedData,
        setCachedData,
        addToWatchHistory,
        toggleFavorite,
        isFavorite,
        formatNumber,
        formatDate,
        truncateText,
        showLoading,
        hideLoading,
        showNotification,
        debounce
    };
}