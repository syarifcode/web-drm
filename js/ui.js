// UI Components and Helpers
class UI {
    constructor() {
        this.api = apiService;
        this.router = router;
    }

    // Render drama card
    renderDramaCard(drama) {
        const episodeCount = drama.chapterCount || drama.totalChapterNum || 0;
        const coverUrl = drama.coverWap || drama.bookCover || drama.cover || '';
        const tags = drama.tags || drama.tagNames || [];
        
        return `
            <div class="drama-card" data-id="${drama.bookId}">
                <img src="${coverUrl}" alt="${drama.bookName}" class="drama-image" loading="lazy">
                <div class="drama-info">
                    <h3 class="drama-title">${drama.bookName}</h3>
                    <div class="drama-meta">
                        <span class="drama-episodes">${episodeCount} Episode</span>
                        ${drama.playCount ? `<span class="drama-views">${formatNumber(drama.playCount)} ditonton</span>` : ''}
                    </div>
                    <div class="drama-tags">
                        ${tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // Render multiple drama cards
    renderDramaGrid(dramas, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (!dramas || dramas.length === 0) {
            container.innerHTML = '<p class="no-results">Tidak ada drama ditemukan.</p>';
            return;
        }
        
        container.innerHTML = dramas.map(drama => this.renderDramaCard(drama)).join('');
        
        // Add click event to each card
        container.querySelectorAll('.drama-card').forEach(card => {
            card.addEventListener('click', () => {
                const dramaId = card.getAttribute('data-id');
                this.router.navigateTo('detail', { id: dramaId });
            });
        });
    }

    // Render popular search tags
    renderPopularSearches(searches, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (!searches || searches.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        container.innerHTML = searches.slice(0, 10).map(drama => `
            <a href="#" class="popular-tag" data-search="${drama.bookName}">
                ${drama.bookName}
            </a>
        `).join('');
        
        // Add click event to each tag
        container.querySelectorAll('.popular-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                e.preventDefault();
                const searchTerm = tag.getAttribute('data-search');
                document.getElementById('search-input').value = searchTerm;
                this.performSearch(searchTerm);
            });
        });
    }

    // Render episode list
    renderEpisodeList(episodes, containerId, currentEpisodeId = null) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (!episodes || episodes.length === 0) {
            container.innerHTML = '<p class="no-episodes">Episode belum tersedia.</p>';
            return;
        }
        
        container.innerHTML = `
            <h3 class="episode-header"><i class="fas fa-list"></i> Daftar Episode</h3>
            <div class="episode-list">
                ${episodes.map(ep => `
                    <div class="episode-item ${currentEpisodeId === ep.chapterId ? 'active' : ''}" 
                         data-episode-id="${ep.chapterId}" 
                         data-book-id="${ep.bookId}">
                        <div class="episode-number">Episode ${ep.chapterIndex + 1}</div>
                        <div class="episode-title">${ep.chapterTitle || 'Episode ' + (ep.chapterIndex + 1)}</div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Add click event to each episode item
        container.querySelectorAll('.episode-item').forEach(item => {
            item.addEventListener('click', () => {
                const bookId = item.getAttribute('data-book-id');
                const episodeId = item.getAttribute('data-episode-id');
                this.playEpisode(bookId, episodeId);
            });
        });
    }

    // Render drama detail
    async renderDramaDetail(dramaId) {
        const container = document.getElementById('detail-content');
        if (!container) return;
        
        showLoading();
        
        try {
            // Try to get drama data from multiple sources
            let drama = null;
            let episodes = [];
            
            // First, try to get from cache or from the list endpoints
            const cacheKey = `drama_${dramaId}`;
            const cached = getCachedData(cacheKey);
            
            if (cached) {
                drama = cached;
            } else {
                // Try to get from random drama endpoint (it might have video details)
                // We'll use a fallback approach
                drama = await this.api.getRandomDrama().then(data => {
                    return data.find(d => d.bookId === dramaId) || null;
                });
                
                if (!drama) {
                    // If not found, try to get from foryou or trending
                    // For now, we'll create a mock drama object
                    drama = {
                        bookId: dramaId,
                        bookName: 'Drama',
                        introduction: 'Informasi drama sedang dimuat...',
                        chapterCount: 0,
                        tags: []
                    };
                }
                
                setCachedData(cacheKey, drama);
            }
            
            // Get episodes
            try {
                episodes = await this.api.getAllEpisodes(dramaId);
            } catch (error) {
                console.warn('Could not load episodes:', error);
                episodes = [];
            }
            
            // Render detail
            const coverUrl = drama.coverWap || drama.bookCover || '';
            const tags = drama.tags || [];
            const episodeCount = drama.chapterCount || episodes.length || 0;
            
            container.innerHTML = `
                <div class="detail-header">
                    ${coverUrl ? `
                        <div class="detail-poster">
                            <img src="${coverUrl}" alt="${drama.bookName}">
                        </div>
                    ` : ''}
                    <div class="detail-content">
                        <h1 class="detail-title">${drama.bookName}</h1>
                        <div class="detail-meta">
                            <span class="meta-item">
                                <i class="fas fa-film"></i>
                                ${episodeCount} Episode
                            </span>
                            ${drama.playCount ? `
                                <span class="meta-item">
                                    <i class="fas fa-eye"></i>
                                    ${formatNumber(drama.playCount)} ditonton
                                </span>
                            ` : ''}
                            ${drama.bookShelfTime ? `
                                <span class="meta-item">
                                    <i class="fas fa-calendar"></i>
                                    ${formatDate(drama.bookShelfTime)}
                                </span>
                            ` : ''}
                        </div>
                        <p class="detail-description">${drama.introduction || 'Tidak ada deskripsi.'}</p>
                        ${tags.length > 0 ? `
                            <div class="detail-tags">
                                ${tags.slice(0, 5).map(tag => `<span class="detail-tag">${tag}</span>`).join('')}
                            </div>
                        ` : ''}
                        ${episodes.length > 0 ? `
                            <button class="watch-btn" id="watch-first-btn">
                                <i class="fas fa-play"></i>
                                Tonton Episode 1
                            </button>
                        ` : ''}
                        <button class="favorite-btn" id="favorite-btn" style="margin-left: 15px; background: rgba(255,255,255,0.1); color: white; border: none; padding: 15px 30px; border-radius: 12px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 10px;">
                            <i class="${isFavorite(dramaId) ? 'fas' : 'far'} fa-heart"></i>
                            ${isFavorite(dramaId) ? 'Disukai' : 'Tambahkan ke Favorit'}
                        </button>
                    </div>
                </div>
                
                ${episodes.length > 0 ? `
                    <div class="episode-container">
                        <div id="episode-list-container"></div>
                    </div>
                ` : ''}
            `;
            
            // Render episode list if available
            if (episodes.length > 0) {
                this.renderEpisodeList(episodes, 'episode-list-container');
                
                // Add event listener to watch first button
                const watchFirstBtn = document.getElementById('watch-first-btn');
                if (watchFirstBtn && episodes[0]) {
                    watchFirstBtn.addEventListener('click', () => {
                        this.playEpisode(dramaId, episodes[0].chapterId);
                    });
                }
            }
            
            // Add event listener to favorite button
            const favoriteBtn = document.getElementById('favorite-btn');
            if (favoriteBtn) {
                favoriteBtn.addEventListener('click', () => {
                    const isNowFavorite = toggleFavorite(
                        dramaId, 
                        drama.bookName, 
                        coverUrl
                    );
                    
                    favoriteBtn.innerHTML = `
                        <i class="${isNowFavorite ? 'fas' : 'far'} fa-heart"></i>
                        ${isNowFavorite ? 'Disukai' : 'Tambahkan ke Favorit'}
                    `;
                    
                    showNotification(
                        isNowFavorite 
                            ? 'Ditambahkan ke favorit' 
                            : 'Dihapus dari favorit',
                        isNowFavorite ? 'success' : 'info'
                    );
                });
            }
            
            // Store current drama in state
            APP_STATE.currentDrama = {
                ...drama,
                episodes: episodes
            };
            
        } catch (error) {
            console.error('Error loading drama detail:', error);
            container.innerHTML = `
                <div class="error-message">
                    <h2><i class="fas fa-exclamation-triangle"></i> Terjadi Kesalahan</h2>
                    <p>Gagal memuat detail drama. Silakan coba lagi.</p>
                    <button id="retry-btn" class="watch-btn">Coba Lagi</button>
                </div>
            `;
            
            document.getElementById('retry-btn')?.addEventListener('click', () => {
                this.renderDramaDetail(dramaId);
            });
        } finally {
            hideLoading();
        }
    }

    // Play episode
    async playEpisode(bookId, episodeId) {
        showLoading();
        
        try {
            // Navigate to player page
            this.router.navigateTo('player', { 
                bookId: bookId, 
                episodeId: episodeId 
            });
            
            // We'll handle the player rendering in player.js
        } catch (error) {
            console.error('Error playing episode:', error);
            showNotification('Gagal memuat episode', 'error');
        } finally {
            hideLoading();
        }
    }

    // Perform search
    async performSearch(query) {
        if (!query || query.trim() === '') {
            return;
        }
        
        APP_STATE.searchQuery = query.trim();
        this.router.navigateTo('search', { q: APP_STATE.searchQuery });
    }

    // Render search results
    async renderSearchResults(query) {
        const container = document.getElementById('search-results');
        const queryDisplay = document.getElementById('search-query');
        
        if (!container || !queryDisplay) return;
        
        showLoading();
        
        try {
            queryDisplay.innerHTML = `Hasil pencarian untuk: <strong>"${query}"</strong>`;
            
            const results = await this.api.searchDramas(query);
            this.renderDramaGrid(results, 'search-results');
            
            // Also update the search input value
            document.getElementById('search-input').value = query;
            
        } catch (error) {
            console.error('Error searching:', error);
            container.innerHTML = `
                <div class="error-message">
                    <h2><i class="fas fa-exclamation-triangle"></i> Terjadi Kesalahan</h2>
                    <p>Gagal melakukan pencarian. Silakan coba lagi.</p>
                </div>
            `;
        } finally {
            hideLoading();
        }
    }

    // Load home page data
    async loadHomePageData() {
        showLoading();
        
        try {
            // Load all data in parallel for better performance
            const [
                forYouData,
                trendingData,
                latestData,
                vipData,
                popularSearches
            ] = await Promise.all([
                this.api.getForYouDramas(),
                this.api.getTrendingDramas(),
                this.api.getLatestDramas(),
                this.api.getVipDramas(),
                this.api.getPopularSearches()
            ]);
            
            // Extract dramas from VIP data (it has nested structure)
            let vipDramas = [];
            if (vipData && vipData.columnVoList) {
                vipDramas = vipData.columnVoList.flatMap(column => column.bookList || []);
            }
            
            // Render all sections
            this.renderDramaGrid(forYouData, 'foryou-list');
            this.renderDramaGrid(trendingData, 'trending-list');
            this.renderDramaGrid(latestData, 'latest-list');
            this.renderDramaGrid(vipDramas.slice(0, 12), 'vip-list');
            this.renderPopularSearches(popularSearches, 'popular-list');
            
        } catch (error) {
            console.error('Error loading home page data:', error);
            showNotification('Gagal memuat data beranda', 'error');
        } finally {
            hideLoading();
        }
    }

    // Initialize event listeners
    initEventListeners() {
        // Search button
        document.getElementById('search-btn')?.addEventListener('click', () => {
            const query = document.getElementById('search-input').value;
            this.performSearch(query);
        });
        
        // Search input enter key
        document.getElementById('search-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = document.getElementById('search-input').value;
                this.performSearch(query);
            }
        });
        
        // Back buttons
        document.getElementById('back-btn')?.addEventListener('click', () => {
            window.history.back();
        });
        
        document.getElementById('player-back-btn')?.addEventListener('click', () => {
            if (APP_STATE.currentDrama) {
                this.router.navigateTo('detail', { id: APP_STATE.currentDrama.bookId });
            } else {
                this.router.navigateTo('home');
            }
        });
        
        // Menu toggle for mobile
        document.querySelector('.menu-toggle')?.addEventListener('click', () => {
            document.querySelector('.nav-menu')?.classList.toggle('active');
        });
        
        // Close menu when clicking outside on mobile
        document.addEventListener('click', (e) => {
            const menu = document.querySelector('.nav-menu');
            const toggle = document.querySelector('.menu-toggle');
            
            if (menu?.classList.contains('active') && 
                !menu.contains(e.target) && 
                !toggle?.contains(e.target)) {
                menu.classList.remove('active');
            }
        });
        
        // Debounced search input for suggestions (optional future feature)
        // const searchInput = document.getElementById('search-input');
        // if (searchInput) {
        //     searchInput.addEventListener('input', debounce((e) => {
        //         // Implement search suggestions here
        //     }, 300));
        // }
    }
}

// Create a singleton instance
const ui = new UI();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ui;
}