// Video Player Module
class VideoPlayer {
    constructor() {
        this.videoElement = null;
        this.currentVideoUrl = null;
        this.currentQuality = APP_STATE.videoQuality;
        this.isPlaying = false;
        this.currentTime = 0;
        this.duration = 0;
        this.qualities = [];
        this.init();
    }

    init() {
        // Create video player container
        this.createPlayerContainer();
        
        // Initialize event listeners
        this.initEventListeners();
    }

    createPlayerContainer() {
        const container = document.getElementById('player-container');
        if (!container) return;

        container.innerHTML = `
            <div class="video-container">
                <video id="video-player" controls playsinline>
                    <source src="" type="video/mp4">
                    Browser Anda tidak mendukung pemutar video.
                </video>
                <div class="player-controls">
                    <div class="control-group">
                        <button id="play-pause-btn" class="control-btn">
                            <i class="fas fa-play"></i>
                        </button>
                        <span id="current-time">00:00</span>
                        <span>/</span>
                        <span id="duration">00:00</span>
                    </div>
                    <div class="control-group">
                        <button id="mute-btn" class="control-btn">
                            <i class="fas fa-volume-up"></i>
                        </button>
                        <input type="range" id="volume-slider" min="0" max="100" value="100">
                    </div>
                    <div class="control-group">
                        <select id="quality-selector" class="quality-selector">
                            <option value="">Pilih Kualitas</option>
                        </select>
                        <button id="fullscreen-btn" class="control-btn">
                            <i class="fas fa-expand"></i>
                        </button>
                    </div>
                </div>
                <div class="episode-navigation">
                    <button id="prev-episode-btn" class="nav-btn">
                        <i class="fas fa-chevron-left"></i> Episode Sebelumnya
                    </button>
                    <button id="next-episode-btn" class="nav-btn">
                        Episode Selanjutnya <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        `;

        this.videoElement = document.getElementById('video-player');
        this.setupVideoElement();
    }

    setupVideoElement() {
        if (!this.videoElement) return;

        // Video events
        this.videoElement.addEventListener('loadedmetadata', () => {
            this.duration = this.videoElement.duration;
            this.updateDurationDisplay();
            this.updateProgressBar();
        });

        this.videoElement.addEventListener('timeupdate', () => {
            this.currentTime = this.videoElement.currentTime;
            this.updateCurrentTimeDisplay();
            this.updateProgressBar();
        });

        this.videoElement.addEventListener('play', () => {
            this.isPlaying = true;
            this.updatePlayPauseButton();
        });

        this.videoElement.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updatePlayPauseButton();
        });

        this.videoElement.addEventListener('ended', () => {
            this.handleVideoEnded();
        });

        this.videoElement.addEventListener('error', (e) => {
            console.error('Video error:', e);
            showNotification('Gagal memuat video. Coba kualitas lain.', 'error');
        });
    }

    initEventListeners() {
        // Play/Pause button
        document.getElementById('play-pause-btn')?.addEventListener('click', () => {
            this.togglePlayPause();
        });

        // Mute button
        document.getElementById('mute-btn')?.addEventListener('click', () => {
            this.toggleMute();
        });

        // Volume slider
        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                this.setVolume(e.target.value / 100);
            });
        }

        // Quality selector
        const qualitySelector = document.getElementById('quality-selector');
        if (qualitySelector) {
            qualitySelector.addEventListener('change', (e) => {
                this.changeQuality(e.target.value);
            });
        }

        // Fullscreen button
        document.getElementById('fullscreen-btn')?.addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // Previous episode button
        document.getElementById('prev-episode-btn')?.addEventListener('click', () => {
            this.playPreviousEpisode();
        });

        // Next episode button
        document.getElementById('next-episode-btn')?.addEventListener('click', () => {
            this.playNextEpisode();
        });
    }

    async loadEpisode(bookId, episodeId) {
        showLoading();
        
        try {
            // Store current episode in state
            APP_STATE.currentEpisode = {
                bookId: bookId,
                episodeId: episodeId
            };

            // Get episode data
            const episodes = await apiService.getAllEpisodes(bookId);
            const currentEpisode = episodes.find(ep => ep.chapterId === episodeId);
            
            if (!currentEpisode) {
                throw new Error('Episode tidak ditemukan');
            }

            // Get video qualities from cdnList
            this.qualities = this.extractVideoQualities(currentEpisode);
            
            // Set video source
            const videoUrl = this.getVideoUrlForQuality(this.currentQuality);
            if (!videoUrl) {
                throw new Error('Video tidak tersedia');
            }

            this.currentVideoUrl = videoUrl;
            this.videoElement.src = videoUrl;
            
            // Update quality selector
            this.updateQualitySelector();
            
            // Update episode list
            ui.renderEpisodeList(episodes, 'episode-list', episodeId);
            
            // Update navigation buttons
            this.updateNavigationButtons(episodes, currentEpisode);
            
            // Auto play
            setTimeout(() => {
                this.videoElement.play().catch(e => {
                    console.log('Auto-play prevented:', e);
                });
            }, 500);

            // Add to watch history
            const dramaName = APP_STATE.currentDrama?.bookName || 'Drama';
            addToWatchHistory(bookId, dramaName, episodeId, currentEpisode.chapterTitle || `Episode ${currentEpisode.chapterIndex + 1}`);

        } catch (error) {
            console.error('Error loading episode:', error);
            showNotification('Gagal memuat episode', 'error');
            
            // Fallback to random drama video
            this.loadFallbackVideo();
        } finally {
            hideLoading();
        }
    }

    extractVideoQualities(episode) {
        const qualities = [];
        
        if (episode.cdnList && episode.cdnList.length > 0) {
            episode.cdnList.forEach(cdn => {
                if (cdn.videoPathList && cdn.videoPathList.length > 0) {
                    cdn.videoPathList.forEach(video => {
                        qualities.push({
                            quality: video.quality,
                            url: video.videoPath,
                            isDefault: video.isDefault
                        });
                    });
                }
            });
        }
        
        // If no cdnList, try videoPath
        if (qualities.length === 0 && episode.videoPath) {
            qualities.push({
                quality: 720,
                url: episode.videoPath,
                isDefault: true
            });
        }
        
        return qualities;
    }

    getVideoUrlForQuality(quality) {
        const qualityNumber = parseInt(quality);
        
        // Find exact quality match
        let video = this.qualities.find(q => q.quality === qualityNumber);
        
        // If not found, try to find default
        if (!video) {
            video = this.qualities.find(q => q.isDefault);
        }
        
        // If still not found, take the first available
        if (!video && this.qualities.length > 0) {
            video = this.qualities[0];
        }
        
        return video?.url || null;
    }

    updateQualitySelector() {
        const selector = document.getElementById('quality-selector');
        if (!selector) return;

        selector.innerHTML = '<option value="">Pilih Kualitas</option>';
        
        // Sort qualities by resolution (highest first)
        const sortedQualities = [...this.qualities].sort((a, b) => b.quality - a.quality);
        
        sortedQualities.forEach(quality => {
            const option = document.createElement('option');
            option.value = quality.quality;
            option.textContent = `${quality.quality}p`;
            option.selected = quality.quality === parseInt(this.currentQuality);
            selector.appendChild(option);
        });
    }

    updateNavigationButtons(episodes, currentEpisode) {
        const currentIndex = currentEpisode.chapterIndex;
        const prevBtn = document.getElementById('prev-episode-btn');
        const nextBtn = document.getElementById('next-episode-btn');

        if (prevBtn) {
            prevBtn.disabled = currentIndex <= 0;
        }

        if (nextBtn) {
            nextBtn.disabled = currentIndex >= episodes.length - 1;
        }
    }

    togglePlayPause() {
        if (!this.videoElement) return;

        if (this.isPlaying) {
            this.videoElement.pause();
        } else {
            this.videoElement.play();
        }
    }

    updatePlayPauseButton() {
        const button = document.getElementById('play-pause-btn');
        if (!button) return;

        const icon = button.querySelector('i');
        if (icon) {
            icon.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
        }
    }

    toggleMute() {
        if (!this.videoElement) return;

        this.videoElement.muted = !this.videoElement.muted;
        this.updateMuteButton();
    }

    updateMuteButton() {
        const button = document.getElementById('mute-btn');
        if (!button) return;

        const icon = button.querySelector('i');
        if (icon) {
            if (this.videoElement.muted || this.videoElement.volume === 0) {
                icon.className = 'fas fa-volume-mute';
            } else if (this.videoElement.volume < 0.5) {
                icon.className = 'fas fa-volume-down';
            } else {
                icon.className = 'fas fa-volume-up';
            }
        }

        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) {
            volumeSlider.value = this.videoElement.muted ? 0 : this.videoElement.volume * 100;
        }
    }

    setVolume(value) {
        if (!this.videoElement) return;

        this.videoElement.volume = value;
        this.videoElement.muted = value === 0;
        this.updateMuteButton();
    }

    changeQuality(quality) {
        if (!quality || quality === this.currentQuality) return;

        this.currentQuality = quality;
        APP_STATE.videoQuality = quality;
        saveAppState();

        const videoUrl = this.getVideoUrlForQuality(quality);
        if (videoUrl && videoUrl !== this.currentVideoUrl) {
            const currentTime = this.videoElement.currentTime;
            const wasPlaying = this.isPlaying;

            this.videoElement.src = videoUrl;
            this.currentVideoUrl = videoUrl;
            
            this.videoElement.addEventListener('loadedmetadata', () => {
                this.videoElement.currentTime = currentTime;
                if (wasPlaying) {
                    this.videoElement.play();
                }
            }, { once: true });
        }
    }

    toggleFullscreen() {
        const videoContainer = document.querySelector('.video-container');
        if (!videoContainer) return;

        if (!document.fullscreenElement) {
            if (videoContainer.requestFullscreen) {
                videoContainer.requestFullscreen();
            } else if (videoContainer.webkitRequestFullscreen) {
                videoContainer.webkitRequestFullscreen();
            } else if (videoContainer.msRequestFullscreen) {
                videoContainer.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }

    playPreviousEpisode() {
        const episodes = APP_STATE.currentDrama?.episodes;
        const currentEpisode = APP_STATE.currentEpisode;
        
        if (!episodes || !currentEpisode) return;

        const currentIndex = episodes.findIndex(ep => ep.chapterId === currentEpisode.episodeId);
        if (currentIndex > 0) {
            const prevEpisode = episodes[currentIndex - 1];
            this.loadEpisode(currentEpisode.bookId, prevEpisode.chapterId);
        }
    }

    playNextEpisode() {
        const episodes = APP_STATE.currentDrama?.episodes;
        const currentEpisode = APP_STATE.currentEpisode;
        
        if (!episodes || !currentEpisode) return;

        const currentIndex = episodes.findIndex(ep => ep.chapterId === currentEpisode.episodeId);
        if (currentIndex < episodes.length - 1) {
            const nextEpisode = episodes[currentIndex + 1];
            this.loadEpisode(currentEpisode.bookId, nextEpisode.chapterId);
        }
    }

    handleVideoEnded() {
        // Auto-play next episode if available
        const episodes = APP_STATE.currentDrama?.episodes;
        const currentEpisode = APP_STATE.currentEpisode;
        
        if (!episodes || !currentEpisode) return;

        const currentIndex = episodes.findIndex(ep => ep.chapterId === currentEpisode.episodeId);
        if (currentIndex < episodes.length - 1) {
            // Auto-play next episode after 3 seconds
            setTimeout(() => {
                this.playNextEpisode();
            }, 3000);
        }
    }

    updateCurrentTimeDisplay() {
        const element = document.getElementById('current-time');
        if (element) {
            element.textContent = this.formatTime(this.currentTime);
        }
    }

    updateDurationDisplay() {
        const element = document.getElementById('duration');
        if (element) {
            element.textContent = this.formatTime(this.duration);
        }
    }

    updateProgressBar() {
        // You can implement a custom progress bar here if needed
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }

    loadFallbackVideo() {
        // Try to load a random drama video as fallback
        apiService.getRandomDrama().then(data => {
            if (data && data.length > 0) {
                const randomDrama = data[0];
                if (randomDrama.videoPath) {
                    this.videoElement.src = randomDrama.videoPath;
                    this.videoElement.play();
                    
                    showNotification('Memutar video dari drama lain', 'info');
                }
            }
        });
    }

    destroy() {
        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement.src = '';
            this.videoElement = null;
        }
        
        this.currentVideoUrl = null;
        this.isPlaying = false;
        this.currentTime = 0;
        this.duration = 0;
        this.qualities = [];
    }
}

// Create a singleton instance
const videoPlayer = new VideoPlayer();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = videoPlayer;
}