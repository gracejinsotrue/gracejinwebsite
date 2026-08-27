// In gallery.js
import './gallery.css';
document.addEventListener('DOMContentLoaded', function () {
    // Make sure particles.js is behind our content
    const particlesJS = document.getElementById('particles-js');
    if (particlesJS) {
        particlesJS.style.zIndex = "-1"; // Set lower z-index
    }

    // --- Sticky section chips ---
    const jumpNav = document.querySelector('.section-jump');
    if (jumpNav) {
        const siteNav = document.querySelector('body > nav');
        const jumpLinks = Array.from(jumpNav.querySelectorAll('a'));
        const sections = jumpLinks.map(a => document.getElementById(a.getAttribute('href').slice(1)));

        const navHeight = () => (siteNav ? siteNav.getBoundingClientRect().height : 0);

        // The navbar is fixed and the chip bar sticks under it, so anchor jumps
        // need to clear both. Publish the real heights as CSS variables.
        function syncOffsets() {
            const isSticky = getComputedStyle(jumpNav).position === 'sticky';
            const root = document.documentElement.style;
            root.setProperty('--nav-h', navHeight() + 'px');
            root.setProperty('--jump-h', (isSticky ? jumpNav.getBoundingClientRect().height : 0) + 'px');
        }

        // Highlight whichever section is under the bar right now. The line has to
        // sit a little below where an anchor jump lands a section, or the section
        // you just jumped to reads as still-above and the previous one stays lit.
        function updateActive() {
            const stuckHeight = getComputedStyle(jumpNav).position === 'sticky'
                ? jumpNav.getBoundingClientRect().height
                : 0;
            const line = navHeight() + stuckHeight + 28;
            let current = 0;
            sections.forEach((section, i) => {
                if (section && section.getBoundingClientRect().top <= line) current = i;
            });
            jumpLinks.forEach((link, i) => link.classList.toggle('active', i === current));
        }

        let queued = false;
        function onScroll() {
            if (queued) return;
            queued = true;
            setTimeout(() => {
                queued = false;
                updateActive();
            }, 100);
        }

        syncOffsets();
        updateActive();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', () => {
            syncOffsets();
            updateActive();
        });
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

        // Captions don't all carry a heading, so treat both parts as optional
        const caption = item.querySelector('figcaption');
        const titleEl = caption ? caption.querySelector('h3') : null;
        const descEl = caption ? caption.querySelector('.project-description') : null;

        infoTitle.textContent = titleEl ? titleEl.textContent.trim() : '';
        infoTitle.hidden = !infoTitle.textContent;
        infoDesc.textContent = descEl ? descEl.textContent.trim() : '';
        infoDesc.hidden = !infoDesc.textContent;

        // Hide arrows if the category only has one piece
        const hasSiblings = currentGroup.length > 1;
        prevBtn.hidden = !hasSiblings;
        nextBtn.hidden = !hasSiblings;
    }

    function openLightbox(item) {
        // Group by grid, not by section, so a category split into sub-projects
        // keeps each one's arrows inside that sub-project
        const group = item.closest('.art-grid') || item.closest('.category-section');
        currentGroup = Array.from(group.querySelectorAll('.art-item'));
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
