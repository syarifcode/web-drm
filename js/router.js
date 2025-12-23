// Router for SPA navigation
class Router {
    constructor() {
        this.routes = {};
        this.currentPath = '';
        this.init();
    }

    init() {
        // Listen for hash changes
        window.addEventListener('hashchange', () => this.handleRouting());
        
        // Initial route
        this.handleRouting();
    }

    // Register a route
    register(path, callback) {
        this.routes[path] = callback;
    }

    // Handle routing
    handleRouting() {
        const hash = window.location.hash.substring(1) || 'home';
        const path = hash.split('?')[0];
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        
        this.currentPath = path;
        
        // Update active nav link
        this.updateActiveNav(path);
        
        // Show the corresponding page
        this.showPage(path);
        
        // Call the registered callback if exists
        if (this.routes[path]) {
            this.routes[path](params);
        }
    }

    // Update active navigation link
    updateActiveNav(path) {
        document.querySelectorAll('.nav-link').forEach(link => {
            const linkPath = link.getAttribute('href').substring(1);
            if (linkPath === path) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // Show page based on route
    showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show the target page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            APP_STATE.currentPage = pageId;
            
            // Scroll to top when changing pages
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            // Fallback to home
            this.navigateTo('home');
        }
    }

    // Navigate to a new route
    navigateTo(path, params = {}) {
        let url = `#${path}`;
        
        if (Object.keys(params).length > 0) {
            const searchParams = new URLSearchParams(params);
            url += `?${searchParams.toString()}`;
        }
        
        window.location.hash = url;
    }

    // Get current route parameters
    getParams() {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash.split('?')[1] || '');
        return Object.fromEntries(params.entries());
    }

    // Get current path
    getCurrentPath() {
        return this.currentPath;
    }
}

// Create a singleton instance
const router = new Router();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = router;
}