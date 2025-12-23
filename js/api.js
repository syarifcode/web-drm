// API Service Module
class ApiService {
    constructor() {
        this.baseUrl = this.getBaseUrl();
        this.cache = new Map();
        this.requestQueue = new Map(); // Untuk debouncing request
    }

    // Dynamic base URL based on environment
    getBaseUrl() {
        const hostname = window.location.hostname;
        
        // Untuk Netlify deployment
        if (hostname.includes('netlify.app')) {
            return '/.netlify/functions/proxy?endpoint=';
        }
        
        // Untuk local development
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'https://dramabox.sansekai.my.id/api/';
        }
        
        // Untuk production langsung (jika CORS diizinkan)
        return 'https://dramabox.sansekai.my.id/api/';
    }

    // Build complete URL with endpoint and parameters
    buildUrl(endpoint, params = {}) {
        let url = this.baseUrl + endpoint;
        
        // Add query parameters for direct API calls
        if (!this.baseUrl.includes('netlify') && Object.keys(params).length > 0) {
            const queryString = new URLSearchParams(params).toString();
            url += '?' + queryString;
        }
        
        // Add query parameters for proxy calls
        if (this.baseUrl.includes('netlify') && Object.keys(params).length > 0) {
            const queryString = new URLSearchParams(params).toString();
            url += '&' + queryString;
        }
        
        return url;
    }

    // Generic fetch method with error handling
    async fetchData(endpoint, params = {}, useCache = true) {
        const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
        
        // Check cache first
        if (useCache) {
            const cached = getCachedData(cacheKey);
            if (cached) {
                console.log(`Cache hit: ${endpoint}`);
                return cached;
            }
        }
        
        // Debounce multiple identical requests
        if (this.requestQueue.has(cacheKey)) {
            console.log(`Request queued: ${endpoint}`);
            return this.requestQueue.get(cacheKey);
        }

        // Show loading indicator for main requests
        if (endpoint.includes('vip') || 
            endpoint.includes('trending') || 
            endpoint.includes('latest') ||
            endpoint.includes('foryou')) {
            showLoading();
        }

        try {
            const url = this.buildUrl(endpoint, params);
            console.log(`Fetching: ${url}`);
            
            // Create request promise
            const requestPromise = new Promise(async (resolve, reject) => {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
                    
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);
                    
                    // Handle HTTP errors
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error(`HTTP ${response.status}: ${errorText}`);
                        
                        // Try to parse as JSON for structured error
                        try {
                            const errorData = JSON.parse(errorText);
                            throw new Error(errorData.error || `HTTP ${response.status}`);
                        } catch {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }
                    }
                    
                    // Parse response
                    const data = await response.json();
                    
                    // Cache successful response
                    if (useCache && data) {
                        setCachedData(cacheKey, data);
                    }
                    
                    resolve(data);
                    
                } catch (error) {
                    console.error(`Fetch error for ${endpoint}:`, error);
                    
                    // Try fallback to direct API if proxy fails
                    if (this.baseUrl.includes('netlify') && error.message.includes('Failed to fetch')) {
                        console.log('Trying direct API as fallback...');
                        try {
                            const directUrl = `https://dramabox.sansekai.my.id/api/${endpoint}`;
                            const directResponse = await fetch(directUrl, {
                                headers: { 'Accept': 'application/json' }
                            });
                            
                            if (directResponse.ok) {
                                const directData = await directResponse.json();
                                resolve(directData);
                                return;
                            }
                        } catch (directError) {
                            console.error('Direct API also failed:', directError);
                        }
                    }
                    
                    // Return fallback mock data for critical endpoints
                    if (endpoint.includes('vip') || endpoint.includes('trending')) {
                        console.log('Returning mock data...');
                        resolve(this.getMockData(endpoint));
                    } else {
                        reject(error);
                    }
                }
            });
            
            // Store promise in queue
            this.requestQueue.set(cacheKey, requestPromise);
            
            // Clean up queue after promise settles
            requestPromise.finally(() => {
                this.requestQueue.delete(cacheKey);
            });
            
            const data = await requestPromise;
            return data;
            
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            showNotification(`Gagal memuat data: ${error.message}`, 'error');
            throw error;
        } finally {
            if (endpoint.includes('vip') || 
                endpoint.includes('trending') || 
                endpoint.includes('latest') ||
                endpoint.includes('foryou')) {
                hideLoading();
            }
        }
    }

    // === SPECIFIC API METHODS ===

    // Get VIP dramas
    async getVipDramas() {
        return this.fetchData('dramabox/vip');
    }

    // Get random drama with video data
    async getRandomDrama() {
        return this.fetchData('dramabox/randomdrama');
    }

    // Get recommendations for you
    async getForYouDramas() {
        return this.fetchData('dramabox/foryou');
    }

    // Get latest dramas
    async getLatestDramas() {
        return this.fetchData('dramabox/latest');
    }

    // Get trending dramas
    async getTrendingDramas() {
        return this.fetchData('dramabox/trending');
    }

    // Get popular searches
    async getPopularSearches() {
        return this.fetchData('dramabox/populersearch');
    }

    // Search dramas
    async searchDramas(query) {
        if (!query || query.trim() === '') {
            return [];
        }
        
        const params = { query: query.trim() };
        return this.fetchData('dramabox/search', params);
    }

    // Get all episodes for a drama
    async getAllEpisodes(bookId) {
        if (!bookId) {
            throw new Error('Book ID is required');
        }
        
        const params = { bookId: bookId };
        return this.fetchData('dramabox/allepisode', params, false); // Don't cache episode lists
    }

    // Get specific episode data (with video URLs)
    async getEpisodeData(bookId, episodeId) {
        try {
            // First get all episodes
            const allEpisodes = await this.getAllEpisodes(bookId);
            
            // Find the specific episode
            const episode = allEpisodes.find(ep => 
                ep.chapterId === episodeId || 
                ep.chapterId?.toString() === episodeId?.toString()
            );
            
            if (!episode) {
                throw new Error(`Episode ${episodeId} not found`);
            }
            
            return episode;
            
        } catch (error) {
            console.error('Error getting episode data:', error);
            
            // Fallback: get random drama and use its video data
            const randomDrama = await this.getRandomDrama();
            if (randomDrama && randomDrama.length > 0) {
                return randomDrama[0];
            }
            
            throw error;
        }
    }

    // Get drama detail (combined data from multiple endpoints)
    async getDramaDetail(bookId) {
        try {
            showLoading();
            
            // Try to get from random drama list first (has video data)
            const randomDramas = await this.getRandomDrama();
            const dramaFromRandom = randomDramas.find(d => d.bookId === bookId);
            
            if (dramaFromRandom) {
                // Get episodes for this drama
                try {
                    const episodes = await this.getAllEpisodes(bookId);
                    dramaFromRandom.episodes = episodes;
                } catch (episodeError) {
                    console.warn('Could not load episodes:', episodeError);
                    dramaFromRandom.episodes = [];
                }
                
                return dramaFromRandom;
            }
            
            // Fallback: search for the drama
            const searchResults = await this.searchDramas('');
            const foundDrama = searchResults.find(d => d.bookId === bookId);
            
            if (foundDrama) {
                // Get episodes
                try {
                    const episodes = await this.getAllEpisodes(bookId);
                    foundDrama.episodes = episodes;
                } catch (error) {
                    console.warn('Could not load episodes:', error);
                    foundDrama.episodes = [];
                }
                
                return foundDrama;
            }
            
            throw new Error('Drama not found');
            
        } catch (error) {
            console.error('Error getting drama detail:', error);
            
            // Ultimate fallback: return mock data
            return this.getMockDramaDetail(bookId);
            
        } finally {
            hideLoading();
        }
    }

    // === MOCK DATA FOR FALLBACK ===
    
    getMockData(endpoint) {
        const mockData = {
            'dramabox/vip': {
                columnVoList: [
                    {
                        columnId: 502,
                        title: "Pilihan Mingguan",
                        bookList: this.generateMockDramas(6)
                    },
                    {
                        columnId: 503,
                        title: "Eksklusif di Dramabox",
                        bookList: this.generateMockDramas(8)
                    }
                ]
            },
            'dramabox/trending': this.generateMockDramas(10),
            'dramabox/latest': this.generateMockDramas(10),
            'dramabox/foryou': this.generateMockDramas(8),
            'dramabox/populersearch': this.generateMockDramas(10),
            'dramabox/search': this.generateMockDramas(5)
        };
        
        return mockData[endpoint] || [];
    }
    
    generateMockDramas(count) {
        const titles = [
            "Suami untuk Tiga Tahun",
            "Istriku Tiga, Takdirku Gila",
            "Cinta yang Kembali Menemukanku",
            "Raja Tanpa Mahkota",
            "Cintaku Gagal Membuatmu Hangat",
            "Pewaris Tanpa Memori",
            "Jangan Tangisi Kepergianku",
            "Kembalinya Sang Putra Pewaris",
            "Dari Malam Itu Hingga Selamanya",
            "Terikat Darah: Kekasih Sang Raja Mafia"
        ];
        
        const tags = [
            ["Romansa", "Modern", "Drama"],
            ["Fantasi", "Romansa", "BG"],
            ["Balas Dendam", "Terlahir Kembali"],
            ["Pembalikan Identitas", "Serangan Balik"],
            ["Penyesalan", "Cinta Segitiga"]
        ];
        
        return Array.from({ length: count }, (_, i) => ({
            bookId: `mock_${i + 1000}`,
            bookName: titles[i % titles.length],
            coverWap: `https://picsum.photos/300/450?random=${i}`,
            chapterCount: Math.floor(Math.random() * 50) + 20,
            introduction: `Ini adalah drama mock untuk testing. ${titles[i % titles.length]} adalah cerita tentang...`,
            tags: tags[i % tags.length],
            playCount: `${Math.floor(Math.random() * 900) + 100}K`,
            isEntry: 0,
            corner: {
                cornerType: i % 3 === 0 ? 1 : 0,
                name: i % 3 === 0 ? "Terpopuler" : "",
                color: i % 3 === 0 ? "#F54E96" : ""
            }
        }));
    }
    
    getMockDramaDetail(bookId) {
        return {
            bookId: bookId,
            bookName: "Contoh Drama (Mock Data)",
            bookCover: "https://picsum.photos/400/600",
            introduction: "Ini adalah data mock karena API tidak tersedia. Drama ini bercerita tentang...",
            chapterCount: 24,
            tags: ["Romansa", "Modern", "Drama"],
            tagV3s: [
                { tagId: 1357, tagName: "Romansa", tagEnName: "Romance" },
                { tagId: 1352, tagName: "Modern", tagEnName: "Modern" }
            ],
            playCount: "150K",
            episodes: Array.from({ length: 24 }, (_, i) => ({
                chapterId: `mock_ep_${i + 1}`,
                chapterTitle: `Episode ${i + 1}`,
                chapterIndex: i,
                videoPath: i === 0 ? "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" : null
            })),
            corner: {
                cornerType: 1,
                name: "Mock Data",
                color: "#FF9800"
            },
            performers: [
                {
                    performerId: "mock_1",
                    performerName: "Aktor Utama",
                    performerAvatar: "https://picsum.photos/100/100?random=1"
                }
            ]
        };
    }

    // === UTILITY METHODS ===
    
    // Clear all cache
    clearCache() {
        this.cache.clear();
        APP_STATE.cachedData = {};
        showNotification('Cache dibersihkan', 'success');
    }
    
    // Test API connectivity
    async testConnection() {
        try {
            const testUrl = this.baseUrl.includes('netlify') 
                ? '/.netlify/functions/proxy?endpoint=dramabox/vip'
                : 'https://dramabox.sansekai.my.id/api/dramabox/vip';
            
            const response = await fetch(testUrl, { 
                method: 'HEAD',
                headers: { 'Accept': 'application/json' }
            });
            
            return {
                success: response.ok,
                status: response.status,
                usingProxy: this.baseUrl.includes('netlify'),
                url: testUrl
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                usingProxy: this.baseUrl.includes('netlify')
            };
        }
    }
    
    // Get API status
    async getApiStatus() {
        const endpoints = [
            'dramabox/vip',
            'dramabox/trending',
            'dramabox/latest'
        ];
        
        const results = await Promise.allSettled(
            endpoints.map(endpoint => this.fetchData(endpoint, {}, false))
        );
        
        return results.map((result, index) => ({
            endpoint: endpoints[index],
            status: result.status,
            ok: result.status === 'fulfilled'
        }));
    }
}

// Create singleton instance
const apiService = new ApiService();

// Export for Node.js environment (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = apiService;
}