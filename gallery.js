// In gallery.js
import './gallery.css';
document.addEventListener('DOMContentLoaded', function () {
    // --- Slideshow Logic for All Carousels ---
    const categorySections = document.querySelectorAll('.category-section');

    // Make sure particles.js is behind our content
    const particlesJS = document.getElementById('particles-js');
    if (particlesJS) {
        particlesJS.style.zIndex = "-1"; // Set lower z-index
    }

    categorySections.forEach(section => {
        const thumbnailsRow = section.querySelector('.thumbnail-row');
        const thumbnails = section.querySelectorAll('.thumbnail');
        const slides = section.querySelector('.slideshow-slides');
        const slideElements = slides.querySelectorAll('.slide');
        const prevSlide = section.querySelector('.slide-arrow.prev');
        const nextSlide = section.querySelector('.slide-arrow.next');
        const dotsContainer = section.querySelector('.slide-dots');

        let currentSlide = 0;

        // Create dot indicators for each slide
        slideElements.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.classList.add('dot');
            if (index === 0) dot.classList.add('active');

            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                goToSlide(index);
            });

            dotsContainer.appendChild(dot);
        });

        const dots = dotsContainer.querySelectorAll('.dot');

        // Hide arrows if only one slide
        if (slideElements.length <= 1) {
            prevSlide.style.display = 'none';
            nextSlide.style.display = 'none';
            dotsContainer.style.display = 'none';
        }

        // Function to navigate to a specific slide
        function goToSlide(index) {
            if (index < 0) {
                index = slideElements.length - 1;
            } else if (index >= slideElements.length) {
                index = 0;
            }

            currentSlide = index;
            slides.style.transform = `translateX(-${currentSlide * 100}%)`;

            // Update active dot
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === currentSlide);
            });

            // Update active thumbnail
            thumbnails.forEach((thumbnail, i) => {
                thumbnail.classList.toggle('active', i === currentSlide);
            });
        }

        // Event listeners for arrow navigation
        prevSlide.addEventListener('click', (e) => {
            e.stopPropagation();
            goToSlide(currentSlide - 1);
        });

        nextSlide.addEventListener('click', (e) => {
            e.stopPropagation();
            goToSlide(currentSlide + 1);
        });

        // Thumbnail navigation
        thumbnails.forEach(thumbnail => {
            thumbnail.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(thumbnail.getAttribute('data-index'));
                goToSlide(index);
            });

            // Make thumbnails tabbable for accessibility
            thumbnail.setAttribute('tabindex', '0');

            // Support keyboard navigation
            thumbnail.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const index = parseInt(thumbnail.getAttribute('data-index'));
                    goToSlide(index);
                }
            });
        });

        // Touch swipe support for thumbnails row
        let isThumbnailDragging = false;
        let thumbnailStartX = 0;
        let thumbnailScrollLeft = 0;

        thumbnailsRow.addEventListener('mousedown', (e) => {
            isThumbnailDragging = true;
            thumbnailStartX = e.pageX - thumbnailsRow.offsetLeft;
            thumbnailScrollLeft = thumbnailsRow.scrollLeft;
            thumbnailsRow.style.cursor = 'grabbing';
        });

        thumbnailsRow.addEventListener('mousemove', (e) => {
            if (!isThumbnailDragging) return;
            e.preventDefault();
            const x = e.pageX - thumbnailsRow.offsetLeft;
            const walk = (x - thumbnailStartX) * 2; // Speed multiplier
            thumbnailsRow.scrollLeft = thumbnailScrollLeft - walk;
        });

        thumbnailsRow.addEventListener('mouseup', () => {
            isThumbnailDragging = false;
            thumbnailsRow.style.cursor = 'grab';
        });

        thumbnailsRow.addEventListener('mouseleave', () => {
            isThumbnailDragging = false;
            thumbnailsRow.style.cursor = '';
        });

        // Touch swipe support for slides
        let touchStartX = 0;
        let touchEndX = 0;

        slides.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        }, false);

        slides.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].clientX;
            handleSwipe();
        }, false);

        function handleSwipe() {
            const swipeThreshold = 50; // Minimum swipe distance
            if (touchEndX < touchStartX - swipeThreshold) {
                // Swipe left
                goToSlide(currentSlide + 1);
            }
            if (touchEndX > touchStartX + swipeThreshold) {
                // Swipe right
                goToSlide(currentSlide - 1);
            }
        }

        // Keyboard navigation when focused
        section.tabIndex = 0; // Make the section focusable
        section.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                goToSlide(currentSlide - 1);
            } else if (e.key === 'ArrowRight') {
                goToSlide(currentSlide + 1);
            }
        });
    });

    // Helper function to check if element is in viewport
    function isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        return (
            rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.bottom >= 0
        );
    }

    // Add an intersection observer to lazy load videos when they come into view
    const videos = document.querySelectorAll('video');
    if ('IntersectionObserver' in window) {
        const videoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const video = entry.target;
                    video.play();
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
                    video.play();
                } else {
                    video.pause();
                }
            });
        });
    }
});