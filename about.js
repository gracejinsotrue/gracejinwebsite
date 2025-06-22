// about.js - Modified for left-side overlay with smooth transition on mouse leave
import './about.css';
// import './particles-config.js';
document.addEventListener('DOMContentLoaded', function () {
    const interactivePortrait = document.getElementById('interactive-portrait');
    const cartoon = document.getElementById('cartoon');
    const photo = document.getElementById('photo');

    if (!interactivePortrait || !cartoon) return;

    // Add transition property for smooth animations when resetting
    cartoon.style.transition = "clip-path 0.5s ease-out, transform 0.5s ease-out";
    photo.style.transition = "transform 0.5s ease-out";


    setHalfOverlay();

    // Function to set the half-overlay state 
    function setHalfOverlay() {
        cartoon.style.clipPath = `polygon(0 0, 50% 0, 48% 100%, 0 100%)`;
        cartoon.style.opacity = 1; // Always full opacity
        photo.style.transform = 'translateX(0)';
        cartoon.style.transform = 'translateX(0)';
    }


    interactivePortrait.addEventListener('mousemove', function (e) {

        cartoon.style.transition = "none";
        photo.style.transition = "none";

        const rect = interactivePortrait.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;

        // Calculate percentage across the image (0 to 100)
        const percentageX = (x / width) * 100;

        // Set the cartoon clip path - reveal more from left as mouse moves left
        cartoon.style.clipPath = `polygon(0 0, ${percentageX}% 0, ${percentageX}% 100%, 0 100%)`;

        // Add slight hover movement for both images
        const moveX = (percentageX - 50) / 10; // -5px to +5px range
        photo.style.transform = `translateX(${-moveX}px)`;
        cartoon.style.transform = `translateX(${-moveX}px)`;
    });

    // Reset to half overlay when mouse leaves, with smooth transition
    interactivePortrait.addEventListener('mouseleave', function () {
        // Restore transition to rse
        cartoon.style.transition = "clip-path 0.5s ease-out, transform 0.5s ease-out";
        photo.style.transition = "transform 0.5s ease-out";
        setHalfOverlay();
    });

    // For mobile: touch support
    interactivePortrait.addEventListener('touchmove', function (e) {
        e.preventDefault();
        // Remove transition during active touch for immediate response
        cartoon.style.transition = "none";
        photo.style.transition = "none";

        const touch = e.touches[0];
        const rect = interactivePortrait.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const width = rect.width;

        const percentageX = (x / width) * 100;
        cartoon.style.clipPath = `polygon(0 0, ${percentageX}% 0, ${percentageX}% 100%, 0 100%)`;

        // Add hover effect for touch as well
        const moveX = (percentageX - 50) / 10;
        photo.style.transform = `translateX(${-moveX}px)`;
        cartoon.style.transform = `translateX(${-moveX}px)`;
    });

    // Reset to half overlay on touch end, with smooth transition
    interactivePortrait.addEventListener('touchend', function () {
        // Restore transition for smooth reset
        cartoon.style.transition = "clip-path 0.5s ease-out, transform 0.5s ease-out";
        photo.style.transition = "transform 0.5s ease-out";
        setHalfOverlay();
    });
});

// Scroll animations for card sections
document.addEventListener('DOMContentLoaded', function () {
    const cards = document.querySelectorAll('.about-card');

    function checkScroll() {
        cards.forEach(card => {
            const cardTop = card.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;

            if (cardTop < windowHeight * 0.8) {
                card.style.opacity = 1;
                card.style.transform = 'translateY(0)';
            }
        });
    }

    cards.forEach(card => {
        card.style.opacity = 0;
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });

    window.addEventListener('scroll', checkScroll);
    checkScroll();
});