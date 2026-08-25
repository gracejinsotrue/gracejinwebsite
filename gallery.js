// In gallery.js
import './gallery.css';
document.addEventListener('DOMContentLoaded', function () {
    // Make sure particles.js is behind our content
    const particlesJS = document.getElementById('particles-js');
    if (particlesJS) {
        particlesJS.style.zIndex = "-1"; // Set lower z-index
    }

    // --- Lightbox ---
    const lightbox = document.querySelector('.lightbox');
    const stage = lightbox.querySelector('.lightbox-stage');
    const infoTitle = lightbox.querySelector('.lightbox-info h3');
    const infoDesc = lightbox.querySelector('.lightbox-info .project-description');
    const closeBtn = lightbox.querySelector('.lightbox-close');
    const prevBtn = lightbox.querySelector('.lightbox-arrow.prev');
    const nextBtn = lightbox.querySelector('.lightbox-arrow.next');

    // Navigation stays inside the category you clicked into
    let currentGroup = [];
    let currentIndex = 0;

    function showItem(index) {
        if (!currentGroup.length) return;

        currentIndex = (index + currentGroup.length) % currentGroup.length;
        const item = currentGroup[currentIndex];
        const source = item.querySelector('img, video');

        stage.innerHTML = '';
        let media;
        if (source.tagName === 'IMG') {
            media = document.createElement('img');
            // Grid tiles may use a compressed file; the lightbox loads the original
            media.src = source.dataset.full || source.src;
            media.alt = source.alt;
        } else {
            media = document.createElement('video');
            media.src = source.querySelector('source').src;
            media.muted = true;
            media.loop = true;
            media.autoplay = true;
            media.controls = true;
            media.playsInline = true;
        }
        stage.appendChild(media);

        infoTitle.textContent = item.querySelector('figcaption h3').textContent;
        infoDesc.textContent = item.querySelector('figcaption .project-description').textContent;

        // Hide arrows if the category only has one piece
        const hasSiblings = currentGroup.length > 1;
        prevBtn.hidden = !hasSiblings;
        nextBtn.hidden = !hasSiblings;
    }

    function openLightbox(item) {
        currentGroup = Array.from(item.closest('.category-section').querySelectorAll('.art-item'));
        lightbox.hidden = false;
        document.body.style.overflow = 'hidden';
        showItem(currentGroup.indexOf(item));
        closeBtn.focus();
    }

    function closeLightbox() {
        lightbox.hidden = true;
        stage.innerHTML = ''; // stops any playing video
        document.body.style.overflow = '';
    }

    document.querySelectorAll('.art-item').forEach(item => {
        item.addEventListener('click', () => openLightbox(item));

        // Make items tabbable for accessibility
        item.setAttribute('tabindex', '0');

        // Support keyboard navigation
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openLightbox(item);
            }
        });
    });

    closeBtn.addEventListener('click', closeLightbox);
    prevBtn.addEventListener('click', () => showItem(currentIndex - 1));
    nextBtn.addEventListener('click', () => showItem(currentIndex + 1));

    // Click the backdrop to close
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target === stage) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
        if (lightbox.hidden) return;
        if (e.key === 'Escape') {
            closeLightbox();
        } else if (e.key === 'ArrowLeft') {
            showItem(currentIndex - 1);
        } else if (e.key === 'ArrowRight') {
            showItem(currentIndex + 1);
        }
    });

    // Touch swipe support inside the lightbox
    let touchStartX = 0;

    stage.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    }, false);

    stage.addEventListener('touchend', (e) => {
        const swipeThreshold = 50; // Minimum swipe distance
        const touchEndX = e.changedTouches[0].clientX;
        if (touchEndX < touchStartX - swipeThreshold) {
            // Swipe left
            showItem(currentIndex + 1);
        }
        if (touchEndX > touchStartX + swipeThreshold) {
            // Swipe right
            showItem(currentIndex - 1);
        }
    }, false);

    // Helper function to check if element is in viewport
    function isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        return (
            rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.bottom >= 0
        );
    }

    // Only play the grid videos that are actually on screen
    const videos = document.querySelectorAll('.art-item video');
    if ('IntersectionObserver' in window) {
        const videoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const video = entry.target;
                    video.play().catch(() => { });
                } else {
                    const video = entry.target;
                    video.pause(); // Pause video when not in view to save resources
                }
            });
        });

        videos.forEach(video => {
            videoObserver.observe(video);
        });
    } else {
        // Fallback for browsers that don't support IntersectionObserver
        window.addEventListener('scroll', () => {
            videos.forEach(video => {
                if (isElementInViewport(video)) {
                    video.play().catch(() => { });
                } else {
                    video.pause();
                }
            });
        });
    }
});
