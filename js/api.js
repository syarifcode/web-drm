// API Service for DramaBox
class ApiService {
    constructor() {
        this.baseUrl = 'https://dramabox.sansekai.my.id/api';
    }

    // Helper method to handle fetch requests
    async _fetch(endpoint, params = {}) {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        
        try {
            const response = await fetch(url.toString(), {
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    // Get VIP dramas
    async getVipDramas() {
        return this._fetch('/dramabox/vip');
    }

    // Get random drama (with video details)
    async getRandomDrama() {
        return this._fetch('/dramabox/randomdrama');
    }

    // Get recommendations for you
    async getForYouDramas() {
        return this._fetch('/dramabox/foryou');
    }

    // Get latest dramas
    async getLatestDramas() {
        return this._fetch('/dramabox/latest');
    }

    // Get trending dramas
    async getTrendingDramas() {
        return this._fetch('/dramabox/trending');
    }

    // Get popular searches
    async getPopularSearches() {
        return this._fetch('/dramabox/populersearch');
    }

    // Search dramas
    async searchDramas(query) {
        return this._fetch('/dramabox/search', { query });
    }

    // Get all episodes for a drama
    async getAllEpisodes(bookId) {
        return this._fetch('/dramabox/allepisode', { bookId });
    }

    // Note: The /randomdrama endpoint already includes video details.
    // For a specific episode video, we might need another endpoint.
    // Since we don't have a specific endpoint for episode video, we can use the data from /randomdrama
    // or if /allepisode provides video details, we can use that.
    // For now, we assume /allepisode returns episode list with video details.
}

// Create a singleton instance
const apiService = new ApiService();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = apiService;
}