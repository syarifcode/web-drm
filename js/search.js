// Search Module
class SearchModule {
    constructor() {
        this.searchHistory = [];
        this.searchSuggestions = [];
        this.init();
    }

    init() {
        this.loadSearchHistory();
        this.initEventListeners();
    }

    loadSearchHistory() {
        try {
            const saved = localStorage.getItem('dramabox_search_history');
            if (saved) {
                this.searchHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading search history:', error);
            this.searchHistory = [];
        }
    }

    saveSearchHistory() {
        try {
            localStorage.setItem('dramabox_search_history', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.error('Error saving search history:', error);
        }
    }

    addToSearchHistory(query) {
        if (!query || query.trim() === '') return;
        
        const trimmedQuery = query.trim();
        
        // Remove if already exists
        this.searchHistory = this.searchHistory.filter(item => item !== trimmedQuery);
        
        // Add to beginning
        this.searchHistory.unshift(trimmedQuery);
        
        // Limit history size
        if (this.searchHistory.length > 10) {
            this.searchHistory = this.searchHistory.slice(0, 10);
        }
        
        this.saveSearchHistory();
    }

    initEventListeners() {
        // Search input focus
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('focus', () => {
                this.showSearchSuggestions();
            });
            
            searchInput.addEventListener('input', debounce((e) => {
                this.updateSearchSuggestions(e.target.value);
            }, 300));
        }

        // Click outside to hide suggestions
        document.addEventListener('click', (e) => {
            const searchContainer = document.querySelector('.search-container');
            const suggestions = document.getElementById('search-suggestions');
            
            if (searchContainer && !searchContainer.contains(e.target) && suggestions) {
                suggestions.style.display = 'none';
            }
        });
    }

    showSearchSuggestions() {
        let suggestionsContainer = document.getElementById('search-suggestions');
        
        if (!suggestionsContainer) {
            suggestionsContainer = document.createElement('div');
            suggestionsContainer.id = 'search-suggestions';
            suggestionsContainer.className = 'search-suggestions';
            
            const searchContainer = document.querySelector('.search-container');
            if (searchContainer) {
                searchContainer.appendChild(suggestionsContainer);
            }
        }
        
        this.renderSearchSuggestions();
        suggestionsContainer.style.display = 'block';
    }

    updateSearchSuggestions(query) {
        if (!query || query.trim() === '') {
            this.searchSuggestions = this.searchHistory.slice(0, 5);
        } else {
            // Filter history by query
            this.searchSuggestions = this.searchHistory
                .filter(item => item.toLowerCase().includes(query.toLowerCase()))
                .slice(0, 5);
            
            // Add current query as first suggestion if not in history
            if (!this.searchSuggestions.includes(query) && query.trim() !== '') {
                this.searchSuggestions.unshift(query);
            }
        }
        
        this.renderSearchSuggestions();
    }

    renderSearchSuggestions() {
        const container = document.getElementById('search-suggestions');
        if (!container) return;

        if (this.searchSuggestions.length === 0) {
            container.innerHTML = `
                <div class="suggestion-item">
                    <i class="fas fa-history"></i>
                    <span>Tidak ada riwayat pencarian</span>
                </div>
            `;
            return;
        }

        container.innerHTML = this.searchSuggestions.map(query => `
            <div class="suggestion-item" data-query="${query}">
                <i class="fas fa-search"></i>
                <span>${query}</span>
            </div>
        `).join('');

        // Add click event to each suggestion
        container.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const query = item.getAttribute('data-query');
                document.getElementById('search-input').value = query;
                ui.performSearch(query);
                this.addToSearchHistory(query);
                container.style.display = 'none';
            });
        });

        // Add styles if not already present
        if (!document.querySelector('#search-suggestions-styles')) {
            const styles = document.createElement('style');
            styles.id = 'search-suggestions-styles';
            styles.textContent = `
                .search-suggestions {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background-color: rgba(15, 15, 26, 0.98);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    margin-top: 10px;
                    padding: 10px 0;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                    backdrop-filter: blur(10px);
                    z-index: 1000;
                    display: none;
                }
                
                .suggestion-item {
                    padding: 12px 20px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    transition: all 0.2s ease;
                    color: var(--gray-color);
                }
                
                .suggestion-item:hover {
                    background-color: rgba(255, 46, 99, 0.1);
                    color: var(--light-color);
                }
                
                .suggestion-item i {
                    width: 16px;
                    text-align: center;
                    color: var(--primary-color);
                }
            `;
            document.head.appendChild(styles);
        }
    }

    async getPopularSearches() {
        try {
            const data = await apiService.getPopularSearches();
            return data || [];
        } catch (error) {
            console.error('Error fetching popular searches:', error);
            return [];
        }
    }

    clearSearchHistory() {
        this.searchHistory = [];
        this.saveSearchHistory();
        showNotification('Riwayat pencarian telah dihapus', 'success');
    }
}

// Create a singleton instance
const searchModule = new SearchModule();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = searchModule;
}