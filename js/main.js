// Main Application Entry Point
class DramaBoxApp {
    constructor() {
        this.api = apiService;
        this.router = router;
        this.ui = ui;
        this.videoPlayer = videoPlayer;
        this.searchModule = searchModule;
    }

    async init() {
        console.log('DramaBox App Initializing...');
        
        // Initialize app state
        initializeAppState();
        
        // Set up router
        this.setupRouter();
        
        // Initialize UI
        this.ui.initEventListeners();
        
        // Load initial data
        await this.loadInitialData();
        
        // Start periodic cache cleanup
        setInterval(clearExpiredCache, 5 * 60 * 1000); // Every 5 minutes
        
        console.log('DramaBox App Ready!');
    }

    setupRouter() {
        // Home route
        this.router.register('home', async () => {
            await this.ui.loadHomePageData();
        });

        // Search route
        this.router.register('search', async (params) => {
            const query = params.get('q');
            if (query) {
                await this.ui.renderSearchResults(query);
                this.searchModule.addToSearchHistory(query);
            } else {
                // If no query, show popular searches
                const popularSearches = await this.searchModule.getPopularSearches();
                this.ui.renderPopularSearches(popularSearches, 'popular-list');
            }
        });

        // Detail route
        this.router.register('detail', async (params) => {
            const dramaId = params.get('id');
            if (dramaId) {
                await this.ui.renderDramaDetail(dramaId);
            } else {
                this.router.navigateTo('home');
            }
        });

        // Player route
        this.router.register('player', async (params) => {
            const bookId = params.get('bookId');
            const episodeId = params.get('episodeId');
            
            if (bookId && episodeId) {
                await this.videoPlayer.loadEpisode(bookId, episodeId);
            } else if (APP_STATE.currentDrama && APP_STATE.currentDrama.episodes) {
                // Fallback: play first episode of current drama
                const firstEpisode = APP_STATE.currentDrama.episodes[0];
                if (firstEpisode) {
                    await this.videoPlayer.loadEpisode(APP_STATE.currentDrama.bookId, firstEpisode.chapterId);
                }
            } else {
                this.router.navigateTo('home');
            }
        });

        // Trending route
        this.router.register('trending', async () => {
            await this.loadTrendingPage();
        });

        // Latest route
        this.router.register('latest', async () => {
            await this.loadLatestPage();
        });

        // VIP route
        this.router.register('vip', async () => {
            await this.loadVipPage();
        });

        // For You route
        this.router.register('foryou', async () => {
            await this.loadForYouPage();
        });
    }

    async loadInitialData() {
        // Show loading
        showLoading();
        
        try {
            // Load popular searches for search page
            const popularSearches = await this.searchModule.getPopularSearches();
            this.ui.renderPopularSearches(popularSearches, 'popular-list');
            
            // If on home page, load home data
            if (this.router.getCurrentPath() === 'home') {
                await this.ui.loadHomePageData();
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
            showNotification('Gagal memuat data awal', 'error');
        } finally {
            hideLoading();
        }
    }

    async loadTrendingPage() {
        showLoading();
        
        try {
            const trendingData = await this.api.getTrendingDramas();
            const container = document.getElementById('trending-list');
            
            if (container) {
                this.ui.renderDramaGrid(trendingData, 'trending-list');
            }
        } catch (error) {
            console.error('Error loading trending page:', error);
            showNotification('Gagal memuat drama trending', 'error');
        } finally {
            hideLoading();
        }
    }

    async loadLatestPage() {
        showLoading();
        
        try {
            const latestData = await this.api.getLatestDramas();
            const container = document.getElementById('latest-list');
            
            if (container) {
                this.ui.renderDramaGrid(latestData, 'latest-list');
            }
        } catch (error) {
            console.error('Error loading latest page:', error);
            showNotification('Gagal memuat drama terbaru', 'error');
        } finally {
            hideLoading();
        }
    }

    async loadVipPage() {
        showLoading();
        
        try {
            const vipData = await this.api.getVipDramas();
            let vipDramas = [];
            
            if (vipData && vipData.columnVoList) {
                vipDramas = vipData.columnVoList.flatMap(column => column.bookList || []);
            }
            
            const container = document.getElementById('vip-list');
            if (container) {
                this.ui.renderDramaGrid(vipDramas, 'vip-list');
            }
        } catch (error) {
            console.error('Error loading VIP page:', error);
            showNotification('Gagal memuat drama VIP', 'error');
        } finally {
            hideLoading();
        }
    }

    async loadForYouPage() {
        showLoading();
        
        try {
            const forYouData = await this.api.getForYouDramas();
            const container = document.getElementById('foryou-list');
            
            if (container) {
                this.ui.renderDramaGrid(forYouData, 'foryou-list');
            }
        } catch (error) {
            console.error('Error loading For You page:', error);
            showNotification('Gagal memuat rekomendasi', 'error');
        } finally {
            hideLoading();
        }
    }

    // Utility method to handle errors
    handleError(error, context) {
        console.error(`Error in ${context}:`, error);
        
        const errorMessage = error.message || 'Terjadi kesalahan';
        showNotification(`Gagal ${context}: ${errorMessage}`, 'error');
        
        // If it's a network error, suggest retrying
        if (error.message.includes('network') || error.message.includes('Network')) {
            setTimeout(() => {
                if (confirm('Gagal terhubung ke server. Coba lagi?')) {
                    window.location.reload();
                }
            }, 1000);
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const app = new DramaBoxApp();
    
    // Make app available globally for debugging
    window.DramaBoxApp = app;
    
    try {
        await app.init();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showNotification('Gagal memulai aplikasi. Silakan refresh halaman.', 'error');
        
        // Show error page
        document.getElementById('app').innerHTML = `
            <div class="error-page">
                <h1><i class="fas fa-exclamation-triangle"></i> Aplikasi Error</h1>
                <p>Gagal memulai DramaBox. Silakan refresh halaman atau coba lagi nanti.</p>
                <button onclick="window.location.reload()" class="watch-btn">
                    <i class="fas fa-redo"></i> Refresh Halaman
                </button>
            </div>
        `;
    }
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

// Service Worker registration for PWA (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').catch(error => {
            console.log('ServiceWorker registration failed:', error);
        });
    });
}