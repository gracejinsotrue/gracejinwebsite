// new sticker system configuration because we want even more schizo
//growing list of schizo stickers
const STICKER_CONFIG = {
    images: [

        'images/stickers/grace1.png',
        'images/stickers/flower1.png'
    ],
    size: 150,
    maxStickers: 30,
    fadeOutDelay: 2000,
    mobileEnabled: true //true for mobile for now too

};

let customCursor, stickerContainer, stickerCount = 0, isMobileDevice = false;
let lastTouchTime = 0;
function initCursorSystem() {
    isMobileDevice = window.innerWidth <= 768;
    if (isMobileDevice && !STICKER_CONFIG.mobileEnabled) return;

    document.body.classList.add('custom-cursor-active');

    customCursor = document.getElementById('customCursor');
    stickerContainer = document.getElementById('stickerContainer');

    document.addEventListener('mousemove', (e) => {
        if (customCursor && !isMobileDevice) {
            customCursor.style.left = e.clientX + 'px';
            customCursor.style.top = e.clientY + 'px';
        }
    });

    document.addEventListener('mousedown', () => {
        if (customCursor && !isMobileDevice) customCursor.classList.add('clicking');
    });

    document.addEventListener('mouseup', () => {
        if (customCursor && !isMobileDevice) customCursor.classList.remove('clicking');
    });

    document.addEventListener('click', (e) => {
        if (isMobileDevice && !STICKER_CONFIG.mobileEnabled) return;

        // let's click events that happen shortly after a touch to prevent the double spawning
        if (Date.now() - lastTouchTime < 300) return;

        const canvasContainer = document.getElementById('canvas-container');
        if (canvasContainer && canvasContainer.contains(e.target)) return;

        spawnSticker(e.clientX, e.clientY);
    });
    //touch event listener
    document.addEventListener('touchend', (e) => {
        lastTouchTime = Date.now();

        const canvasContainer = document.getElementById('canvas-container');
        if (canvasContainer && canvasContainer.contains(e.target)) return;

        // get the touch position for mobile
        const touch = e.changedTouches[0];
        if (touch) {
            spawnSticker(touch.clientX, touch.clientY);

            // if touch target is a link, i attempted to prevent hopping to next page immediatley but not sure how well this works rn

            const linkElement = e.target.closest('a');
            if (linkElement) {
                e.preventDefault();
                setTimeout(() => {
                    if (linkElement.href) {
                        window.location.href = linkElement.href;
                    } else if (linkElement.onclick) {
                        linkElement.onclick();
                    }
                }, 150); // 150ms 
            }
        }
    });

    document.addEventListener('mouseover', (e) => {
        if (!customCursor || isMobileDevice) return;
        if (e.target.closest('a, button, [onclick], .project-bar, .shader-thumbnail')) {
            customCursor.classList.add('hovering-interactive');
        }
    });

    document.addEventListener('mouseout', (e) => {
        if (!customCursor || isMobileDevice) return;
        if (e.target.closest('a, button, [onclick], .project-bar, .shader-thumbnail')) {
            customCursor.classList.remove('hovering-interactive');
        }
    });
}

function spawnSticker(x, y) {
    if (stickerCount >= STICKER_CONFIG.maxStickers) {
        const firstSticker = stickerContainer.querySelector('.cursor-sticker');
        if (firstSticker) { firstSticker.remove(); stickerCount--; }
    }

    const sticker = document.createElement('div');
    sticker.className = 'cursor-sticker';
    sticker.id = `sticker-${Date.now()}-${Math.random()}`;

    const randomImage = STICKER_CONFIG.images[Math.floor(Math.random() * STICKER_CONFIG.images.length)];
    sticker.style.backgroundImage = `url(${randomImage})`;

    sticker.style.left = (x - STICKER_CONFIG.size / 2) + 'px';
    sticker.style.top = (y - STICKER_CONFIG.size / 2) + 'px';

    sticker.style.width = STICKER_CONFIG.size + 'px';
    sticker.style.height = STICKER_CONFIG.size + 'px';


    const randomRotation = Math.random() * 2;
    const randomScale = 0.8 + Math.random() * 0.4;
    sticker.style.transform = `rotate(${randomRotation}deg) scale(${randomScale})`;

    stickerContainer.appendChild(sticker);
    stickerCount++;

    setTimeout(() => {
        if (sticker.parentNode) {
            sticker.style.animation = 'stickerFadeOut 0.3s ease-in forwards';
            setTimeout(() => { if (sticker.parentNode) { sticker.remove(); stickerCount--; } }, 300);
        }
    }, STICKER_CONFIG.fadeOutDelay);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCursorSystem);
} else {
    initCursorSystem();
}

window.CursorStickerSystem = {
    addStickerImage: (url) => STICKER_CONFIG.images.push(url),
    clearAllStickers: () => { if (stickerContainer) { stickerContainer.innerHTML = ''; stickerCount = 0; } }
};