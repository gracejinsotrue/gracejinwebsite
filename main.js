import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './styles.css';

let scene, camera, renderer, controls;
let cubeGroup, allCubes = [];
let isMoving = false;
let moveQueue = [];
let completedMoveStack = [];
let currentMove;
let shuffleComplete = false;

let floatTime;
let floatAmplitude;
let floatSpeed;
let floatRotationSpeed;

const dimensions = 3;
const cubeSize = 0.5;
const spacing = 0.08;
const totalSize = cubeSize + spacing;

let raycaster, mouse;
let clickVector, clickFace;
let lastCube;
let pivot;
let activeGroup = [];
let rotationAngle = 0;
const rotationSpeed = 0.1;
const HALF_PI = Math.PI / 2;

let isHoveringCanvas = false;
let canvasContainer;
let isMobile = false;
let cubeHidden = false;

const faceTextures = {
    right: null,  // +X 
    left: null,   // -X
    top: null,    // +Y
    bottom: null, // -Y
    front: null,  // +Z
    back: null    // -Z
};

function init() {
    if (!document.getElementById('home')) return;

    // check if mobile and wait for layout to be set up
    checkMobileLayout();

    scene = new THREE.Scene();

    // Set initial camera position based on current screen size - adjusted for smaller cube
    let initialCameraX, initialCameraY, initialCameraZ, initialAspect;

    if (isMobile) {
        initialAspect = window.innerWidth / 300;
        initialCameraX = -2;
        initialCameraY = 2;
        initialCameraZ = 5;
    } else {
        const containerWidth = window.innerWidth * 0.4;
        initialAspect = containerWidth / window.innerHeight;

        // Set initial position based on container width - adjusted for much smaller cube
        if (containerWidth < 400) {
            initialCameraX = -1.8;
            initialCameraY = 1.8;
            initialCameraZ = 8;
        } else if (containerWidth < 600) {
            initialCameraX = -2;
            initialCameraY = 2; // 
            initialCameraZ = 7; //
        } else {
            initialCameraX = -2.2; // 
            initialCameraY = 2.2;
            initialCameraZ = 6;
        }
    }

    camera = new THREE.PerspectiveCamera(45, initialAspect, 0.1, 1000);
    camera.position.set(initialCameraX, initialCameraY, initialCameraZ);
    camera.lookAt(scene.position);

    floatTime = 0;
    floatAmplitude = 0.15;
    floatSpeed = 0.08;
    floatRotationSpeed = 0.008;

    const rendererWidth = isMobile ? window.innerWidth : window.innerWidth * 0.4;
    const rendererHeight = isMobile ? 300 : window.innerHeight;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(rendererWidth, rendererHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;

    // set up canvas container based on mobile/desktop
    setupCanvasContainer();

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;

    // Add zoom limits - adjusted for much smaller cube
    controls.minDistance = 5;
    controls.maxDistance = 25;

    // start with controls disabled on desktop, enabled on mobile
    controls.enabled = isMobile;

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    pivot = new THREE.Object3D();

    // for desktop only
    if (!isMobile) {
        setupHoverDetection();
    }

    // load textures and build cube
    loadTextures().then(() => {
        createRubiksCube();
        animate();
        setupEventListeners();
        shuffleComplete = false;
        shuffleCube(5);
    });
}

function checkMobileLayout() {
    isMobile = window.innerWidth <= 768;
}

function setupCanvasContainer() {
    if (isMobile) {
        // find the mobile container that should already exist
        const mobileContainer = document.getElementById('mobile-cube-container');
        canvasContainer = document.createElement('div');
        canvasContainer.id = 'canvas-container';
        canvasContainer.classList.add('mobile');

        if (mobileContainer) {
            mobileContainer.appendChild(canvasContainer);
        }
    } else {
        // desktop setup is just a positiond container
        canvasContainer = document.createElement('div');
        canvasContainer.id = 'canvas-container';
        canvasContainer.style.position = 'fixed';
        canvasContainer.style.left = '3%';
        canvasContainer.style.top = '-100px';
        canvasContainer.style.width = '30%';
        canvasContainer.style.height = '20vh';
        canvasContainer.style.zIndex = '1';
        canvasContainer.style.pointerEvents = 'auto';
        document.getElementById('home').appendChild(canvasContainer);
    }

    canvasContainer.appendChild(renderer.domElement);

    // Set the right opacity before the first paint rather than waiting for a
    // scroll event that may never come
    updateCubeVisibility();
}

function setupHoverDetection() {
    // only set up hover detection for desktop
    if (isMobile) return;

    // Mouse enter: enable controls and cube interaction
    canvasContainer.addEventListener('mouseenter', () => {
        isHoveringCanvas = true;
        controls.enabled = true;
        canvasContainer.style.cursor = 'grab';
    });

    // mouse leave: disable controls to allow normal page scrolling
    canvasContainer.addEventListener('mouseleave', () => {
        isHoveringCanvas = false;
        controls.enabled = false;
        canvasContainer.style.cursor = 'default';

        // clean up any ongoing interactions
        if (clickVector && clickFace && lastCube) {
            clickVector = null;
            clickFace = null;
            lastCube = null;
        }
    });

    // prevent wheel events from bubbling up when not hovering
    canvasContainer.addEventListener('wheel', (event) => {
        if (!isHoveringCanvas) {
            event.stopPropagation();
            return false;
        }
    }, { passive: false });
}

function setupEventListeners() {
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseout', onMouseOut);
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('shuffleComplete', onShuffleComplete);
}

function onWindowResize() {
    checkMobileLayout();

    if (isMobile) {
        const newWidth = window.innerWidth;
        const newHeight = 300;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        camera.position.set(-2, 2, 5);
        camera.lookAt(scene.position);
        renderer.setSize(newWidth, newHeight);
    } else {
        // Get the actual container width (40% of window)
        const containerWidth = window.innerWidth * 0.4;
        const containerHeight = window.innerHeight;

        camera.aspect = containerWidth / containerHeight;
        camera.updateProjectionMatrix();


        if (containerWidth < 400) {
            camera.position.set(-1.8, 1.8, 9);
        } else if (containerWidth < 600) {
            camera.position.set(-2, 2, 8);
        } else {
            camera.position.set(-2.2, 2.2, 6);
        }

        camera.lookAt(scene.position);
        renderer.setSize(containerWidth, containerHeight);
    }
}

function shuffleCube(moves = 7) {
    if (isMoving) return;
    shuffleComplete = false;

    function randomAxis() {
        return ['x', 'y', 'z'][Math.floor(Math.random() * 3)];
    }

    function randomDirection() {
        return Math.random() > 0.5 ? 1 : -1;
    }

    function randomCube() {
        return allCubes[Math.floor(Math.random() * allCubes.length)];
    }

    // queue random moves
    for (let i = 0; i < moves; i++) {
        const cube = randomCube();
        pushMove(cube, cube.rubikPosition.clone(), randomAxis(), randomDirection());
    }

    const checkShuffleComplete = () => {
        if (moveQueue.length === 0 && !isMoving) {
            shuffleComplete = true;
            document.dispatchEvent(new Event('shuffleComplete'));
            document.removeEventListener('moveComplete', checkShuffleComplete);
        }
    };

    document.addEventListener('moveComplete', checkShuffleComplete);
    startNextMove();
}

// post-shuffle events
function onShuffleComplete() {
    floatTime = 0;
}

// image textures look dull and i dont know why! video textures render normally we do a little cheesing
function loadTextures() {
    return new Promise((resolve) => {
        const texturePaths = {
            right: '/images/gallery/video/flowerpink.mp4',
            left: '/images/gallery/video/flowergreen.mp4',
            top: '/images/gallery/video/flowerdark.mp4',
            bottom: '/images/gallery/video/flower1.mp4',
            front: '/images/gallery/video/flower.mp4',
            back: '/images/gallery/video/flowergreenblue.mp4'
        };

        const textureTypes = {
            right: 'video',
            left: 'video',
            top: 'video',
            bottom: 'video',
            front: 'video',
            back: 'video'
        };

        let loadedCount = 0;
        const totalTextures = Object.keys(texturePaths).length;

        const checkComplete = () => {
            loadedCount++;
            if (loadedCount === totalTextures) {
                resolve();
            }
        };

        for (const [face, path] of Object.entries(texturePaths)) {
            if (textureTypes[face] === 'video') {
                const video = document.createElement('video');
                video.src = path;
                video.crossOrigin = 'anonymous';
                video.loop = true;
                video.muted = true;
                video.playsInline = true;
                video.autoplay = true;

                const texture = new THREE.VideoTexture(video);
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.format = THREE.RGBAFormat;
                texture.generateMipmaps = false;
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;

                video.addEventListener('loadeddata', () => {
                    video.play().catch(e => console.error("Video play error:", e));
                    faceTextures[face] = texture;
                    checkComplete();
                });

                video.addEventListener('error', () => {
                    console.error(`Error loading video for ${face}`);
                    faceTextures[face] = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                    checkComplete();
                });

                video.load();
            } else {
                const loader = new THREE.TextureLoader();
                loader.load(path, (texture) => {
                    faceTextures[face] = texture;
                    checkComplete();
                }, undefined, (error) => {
                    console.error(`Error loading texture for ${face}:`, error);
                    faceTextures[face] = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
                    checkComplete();
                });
            }
        }
    });
}

function createRubiksCube() {
    cubeGroup = new THREE.Group();
    allCubes = [];

    const positionOffset = (dimensions - 1) / 2;

    for (let x = 0; x < dimensions; x++) {
        for (let y = 0; y < dimensions; y++) {
            for (let z = 0; z < dimensions; z++) {
                if (dimensions > 2 && x > 0 && x < dimensions - 1 &&
                    y > 0 && y < dimensions - 1 &&
                    z > 0 && z < dimensions - 1) {
                    continue;
                }

                const materials = [];

                materials.push(createFaceMaterial('right', x, y, z, 0));
                materials.push(createFaceMaterial('left', x, y, z, 1));
                materials.push(createFaceMaterial('top', x, y, z, 2));
                materials.push(createFaceMaterial('bottom', x, y, z, 3));
                materials.push(createFaceMaterial('front', x, y, z, 4));
                materials.push(createFaceMaterial('back', x, y, z, 5));

                const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
                const cube = new THREE.Mesh(geometry, materials);

                const posX = (x - positionOffset) * totalSize;
                const posY = (y - positionOffset) * totalSize;
                const posZ = (z - positionOffset) * totalSize;

                cube.position.set(posX, posY, posZ);
                cube.originalPosition = new THREE.Vector3(x, y, z);
                cube.rubikPosition = cube.position.clone();

                cubeGroup.add(cube);
                allCubes.push(cube);
            }
        }
    }

    scene.add(cubeGroup);
}

function createFaceMaterial(face, x, y, z, materialIndex) {
    const isOutside = (
        (face === 'right' && x === dimensions - 1) ||
        (face === 'left' && x === 0) ||
        (face === 'top' && y === dimensions - 1) ||
        (face === 'bottom' && y === 0) ||
        (face === 'front' && z === dimensions - 1) ||
        (face === 'back' && z === 0)
    );

    if (!isOutside) {
        return new THREE.MeshBasicMaterial({ color: 0x111111 });
    }

    let uMin, uMax, vMin, vMax;

    if (face === 'right') {
        uMin = z / dimensions;
        uMax = (z + 1) / dimensions;
        vMin = 1 - (y + 1) / dimensions;
        vMax = 1 - y / dimensions;
    }
    else if (face === 'left') {
        uMin = 1 - (z + 1) / dimensions;
        uMax = 1 - z / dimensions;
        vMin = 1 - (y + 1) / dimensions;
        vMax = 1 - y / dimensions;
    }
    else if (face === 'top') {
        uMin = x / dimensions;
        uMax = (x + 1) / dimensions;
        vMin = 1 - (z + 1) / dimensions;
        vMax = 1 - z / dimensions;
    }
    else if (face === 'bottom') {
        uMin = x / dimensions;
        uMax = (x + 1) / dimensions;
        vMin = z / dimensions;
        vMax = (z + 1) / dimensions;
    }
    else if (face === 'front') {
        uMin = x / dimensions;
        uMax = (x + 1) / dimensions;
        vMin = 1 - (y + 1) / dimensions;
        vMax = 1 - y / dimensions;
    }
    else {
        uMin = 1 - (x + 1) / dimensions;
        uMax = 1 - x / dimensions;
        vMin = 1 - (y + 1) / dimensions;
        vMax = 1 - y / dimensions;
    }

    const texture = faceTextures[face];

    if (texture instanceof THREE.Material) {
        return texture;
    }

    let material;

    if (texture instanceof THREE.VideoTexture) {
        const vertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            uniform sampler2D videoTexture;
            uniform vec4 uvBounds;
            varying vec2 vUv;
            
            void main() {
                vec2 scaledUV = vec2(
                    uvBounds.x + vUv.x * (uvBounds.y - uvBounds.x),
                    uvBounds.z + vUv.y * (uvBounds.w - uvBounds.z)
                );
                gl_FragColor = texture2D(videoTexture, scaledUV);
            }
        `;

        material = new THREE.ShaderMaterial({
            uniforms: {
                videoTexture: { value: texture },
                uvBounds: { value: new THREE.Vector4(uMin, uMax, vMin, vMax) }
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            side: THREE.DoubleSide
        });
    } else {
        const clonedTexture = texture.clone();
        clonedTexture.repeat.set(uMax - uMin, vMax - vMin);
        clonedTexture.offset.set(uMin, vMin);
        material = new THREE.MeshLambertMaterial({ map: clonedTexture });
    }

    return material;
}

function nearlyEqual(a, b, d = 0.001) {
    return Math.abs(a - b) <= d;
}

function onMouseDown(event) {
    // allow interaction on mobile or when hovering on desktop
    if (isMoving || (!isMobile && !isHoveringCanvas)) return;

    event.preventDefault();

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(allCubes);

    if (intersects.length > 0) {
        // temporarily disable OrbitControls for cube interaction
        controls.enabled = false;

        const intersectedCube = intersects[0].object;
        clickVector = intersectedCube.rubikPosition.clone();

        const faceIndex = intersects[0].faceIndex;
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(intersectedCube.matrixWorld);
        const normal = intersects[0].face.normal.clone().applyMatrix3(normalMatrix).normalize();

        const absX = Math.abs(normal.x);
        const absY = Math.abs(normal.y);
        const absZ = Math.abs(normal.z);

        if (absX > absY && absX > absZ) {
            clickFace = 'x';
        } else if (absY > absX && absY > absZ) {
            clickFace = 'y';
        } else {
            clickFace = 'z';
        }

        lastCube = intersectedCube;
        canvasContainer.style.cursor = 'grabbing';
    }
}

function onMouseMove(event) {
    if (!isMobile && !isHoveringCanvas) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function onMouseUp(event) {
    if (isMoving || !clickVector || !clickFace || !lastCube || (!isMobile && !isHoveringCanvas)) {
        clickVector = null;
        clickFace = null;
        lastCube = null;
        if (isMobile || isHoveringCanvas) {
            controls.enabled = true;
            canvasContainer.style.cursor = isMobile ? 'default' : 'grab';
        }
        return;
    }

    event.preventDefault();

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(allCubes);

    if (intersects.length > 0) {
        const endCube = intersects[0].object;
        const dragVector = endCube.rubikPosition.clone().sub(clickVector);

        if (dragVector.length() < totalSize * 0.1) {
            clickVector = null;
            clickFace = null;
            lastCube = null;
            controls.enabled = true;
            canvasContainer.style.cursor = isMobile ? 'default' : 'grab';
            return;
        }

        const transitions = {
            'x': { 'y': 'z', 'z': 'y' },
            'y': { 'x': 'z', 'z': 'x' },
            'z': { 'x': 'y', 'y': 'x' }
        };

        const dragVectorOtherAxes = dragVector.clone();
        dragVectorOtherAxes[clickFace] = 0;

        const maxAxis = principalComponent(dragVectorOtherAxes);

        if (maxAxis && transitions[clickFace] && transitions[clickFace][maxAxis]) {
            const rotateAxis = transitions[clickFace][maxAxis];
            let direction = dragVector[maxAxis] >= 0 ? 1 : -1;

            if (clickFace === 'z' && rotateAxis === 'x' ||
                clickFace === 'x' && rotateAxis === 'z' ||
                clickFace === 'y' && rotateAxis === 'z') {
                direction *= -1;
            }

            if (clickFace === 'x' && clickVector.x > 0 ||
                clickFace === 'y' && clickVector.y < 0 ||
                clickFace === 'z' && clickVector.z < 0) {
                direction *= -1;
            }

            pushMove(lastCube, clickVector.clone(), rotateAxis, direction);
            startNextMove();
        }
    }

    clickVector = null;
    clickFace = null;
    lastCube = null;
    controls.enabled = true;
    canvasContainer.style.cursor = isMobile ? 'default' : 'grab';
}

function onMouseOut(event) {
    if (clickVector && clickFace && lastCube) {
        onMouseUp(event);
    }
}

function principalComponent(v) {
    let maxAxis = 'x',
        max = Math.abs(v.x);
    if (Math.abs(v.y) > max) {
        maxAxis = 'y';
        max = Math.abs(v.y);
    }
    if (Math.abs(v.z) > max) {
        maxAxis = 'z';
        max = Math.abs(v.z);
    }
    return maxAxis;
}

function onKeyDown(event) {
    if (isMoving) return;

    const key = event.key.toLowerCase();

    switch (key) {
        case 's':
            shuffle();
            break;
        case 'a':
            solve();
            break;
    }
}

const moveCompleteEvent = new Event('moveComplete');

function pushMove(cube, vector, axis, direction) {
    moveQueue.push({ cube: cube, vector: vector, axis: axis, direction: direction });
}

function startNextMove() {
    if (isMoving) return;

    const nextMove = moveQueue.pop();

    if (nextMove) {
        isMoving = true;
        clickVector = nextMove.vector;

        const direction = nextMove.direction || 1;
        const axis = nextMove.axis;

        setActiveGroup(axis);

        pivot.rotation.set(0, 0, 0);
        pivot.updateMatrixWorld();
        scene.add(pivot);

        activeGroup.forEach(cube => {
            const worldPos = new THREE.Vector3();
            cube.getWorldPosition(worldPos);

            const worldQuat = new THREE.Quaternion();
            cube.getWorldQuaternion(worldQuat);

            scene.remove(cube);
            pivot.attach(cube);
        });

        currentMove = nextMove;
    }
}

function setActiveGroup(axis) {
    activeGroup = [];
    allCubes.forEach(cube => {
        if (nearlyEqual(cube.rubikPosition[axis], clickVector[axis])) {
            activeGroup.push(cube);
        }
    });
}

function doMove() {
    if (!isMoving || !currentMove) return;
    const { axis, direction } = currentMove
    rotationAngle += rotationSpeed;
    pivot.rotation[axis] = direction * rotationAngle;
    if (rotationAngle >= HALF_PI) {
        pivot.rotation[axis] = direction * HALF_PI;
        moveComplete();
    }
}

function moveComplete() {
    isMoving = false;
    rotationAngle = 0;

    pivot.updateMatrixWorld(true);

    const groupPosition = cubeGroup.position.clone();
    const groupRotation = cubeGroup.rotation.clone();

    activeGroup.forEach(cube => {
        const worldPos = new THREE.Vector3();
        cube.getWorldPosition(worldPos);

        const worldQuat = new THREE.Quaternion();
        cube.getWorldQuaternion(worldQuat);

        pivot.remove(cube);
        cubeGroup.add(cube);

        const localPos = worldPos.clone();
        localPos.sub(groupPosition);
        cube.position.copy(localPos);
        cube.quaternion.copy(worldQuat);

        snapCubeToGrid(cube);
        cube.rubikPosition = cube.position.clone();
    });

    scene.remove(pivot);

    activeGroup = [];
    completedMoveStack.push(currentMove);
    currentMove = null;

    document.dispatchEvent(moveCompleteEvent);

    if (moveQueue.length > 0) {
        startNextMove();
    }
}

function snapCubeToGrid(cube) {
    const pos = cube.position;

    const gridX = Math.round(pos.x / totalSize) * totalSize;
    const gridY = Math.round(pos.y / totalSize) * totalSize;
    const gridZ = Math.round(pos.z / totalSize) * totalSize;

    pos.set(gridX, gridY, gridZ);

    const rot = new THREE.Euler().setFromQuaternion(cube.quaternion);

    rot.x = Math.round(rot.x / HALF_PI) * HALF_PI;
    rot.y = Math.round(rot.y / HALF_PI) * HALF_PI;
    rot.z = Math.round(rot.z / HALF_PI) * HALF_PI;

    cube.quaternion.setFromEuler(rot);
}

function animate() {
    requestAnimationFrame(animate);

    if (!cubeHidden && allCubes) {
        allCubes.forEach(cube => {
            if (cube.material) {
                const materials = Array.isArray(cube.material) ? cube.material : [cube.material];

                materials.forEach(material => {
                    if (material instanceof THREE.ShaderMaterial &&
                        material.uniforms &&
                        material.uniforms.videoTexture &&
                        material.uniforms.videoTexture.value instanceof THREE.VideoTexture) {

                        material.uniforms.videoTexture.value.needsUpdate = true;
                    }
                });
            }
        });
    }

    if (!cubeHidden) {
        for (const [face, texture] of Object.entries(faceTextures)) {
            if (texture instanceof THREE.VideoTexture && texture.image instanceof HTMLVideoElement) {
                if (texture.image.paused) {
                    texture.image.play().catch(e => console.log("Video play error:", e));
                }
            }
        }
    }

    if (controls) controls.update();

    if (isMoving) {
        doMove();
    } else if (shuffleComplete) {
        floatTime += floatSpeed;
        let floatY = Math.sin(floatTime) * floatAmplitude;
        cubeGroup.position.y = floatY;
        cubeGroup.rotation.y += Math.sin(floatTime * 0.5) * floatRotationSpeed * 0.5;
        cubeGroup.rotation.x += Math.cos(floatTime * 0.3) * floatRotationSpeed * 0.25;
    }

    // Nothing of the cube is on screen, so skip the draw call and the video
    // texture uploads it drives. That is the single biggest main-thread cost on
    // this page, and it was running the whole time you were reading projects.
    if (cubeHidden) return;

    renderer.render(scene, camera);
}

function shuffle(moves = 20) {
    if (isMoving) return;

    function randomAxis() {
        return ['x', 'y', 'z'][Math.floor(Math.random() * 3)];
    }

    function randomDirection() {
        return Math.random() > 0.5 ? 1 : -1;
    }

    function randomCube() {
        return allCubes[Math.floor(Math.random() * allCubes.length)];
    }

    for (let i = 0; i < moves; i++) {
        const cube = randomCube();
        pushMove(cube, cube.rubikPosition.clone(), randomAxis(), randomDirection());
    }

    startNextMove();
}

function solve() {
    if (isMoving || completedMoveStack.length === 0) return;

    const movesToUndo = completedMoveStack.slice().reverse();
    completedMoveStack = [];

    movesToUndo.forEach(move => {
        pushMove(
            move.cube,
            move.vector,
            move.axis,
            move.direction * -1
        );
    });

    const onComplete = () => {
        if (moveQueue.length === 0) {
            completedMoveStack = [];
            document.removeEventListener('moveComplete', onComplete);
        }
    };

    document.addEventListener('moveComplete', onComplete);
    startNextMove();
}

// The cube is fixed-position, so it has to fade out once home scrolls away.
// This has to be callable outside of a scroll event: landing straight on
// #projects, or reloading partway down the page, never fires one, and the cube
// would sit on top of the projects section at full opacity.
// Reading offsetHeight inside the scroll handler forced a reflow on every
// scroll event. It only changes on resize, so measure it there instead.
let cachedHomeHeight = 0;
let lastAppliedOpacity = -1;

function measureHome() {
    const home = document.getElementById('home');
    cachedHomeHeight = home ? home.offsetHeight : 0;
}

function updateCubeVisibility() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    // On mobile the cube sits inline in the page flow and scrolls away by
    // itself, so it must never be hidden. It also has to be actively restored:
    // resizing down from desktop while it was faded out would otherwise leave
    // the hidden inline styles stuck on it.
    if (isMobile) {
        if (cubeHidden || lastAppliedOpacity !== 1) {
            cubeHidden = false;
            lastAppliedOpacity = 1;
            container.style.opacity = '1';
            container.style.pointerEvents = 'auto';
            container.style.visibility = 'visible';
        }
        return;
    }

    if (!cachedHomeHeight) measureHome();
    if (!cachedHomeHeight) return;

    // start fading earlier - when user scrolls just like 5%  more of home height
    const fadeStartPoint = cachedHomeHeight * 0.04;
    const scrollY = window.scrollY;

    let opacity = 1;
    if (scrollY > fadeStartPoint) {
        // calculate fade progress (0 to 1) over the remaining 80% of home height
        const fadeProgress = Math.min((scrollY - fadeStartPoint) / (cachedHomeHeight * 0.6), 1);
        opacity = 1 - fadeProgress;
    }

    if (opacity === lastAppliedOpacity) return;
    lastAppliedOpacity = opacity;
    container.style.opacity = opacity.toString();

    // Fully faded is still hit-testable and still painting, so it would keep
    // swallowing clicks over the projects section. Take it out of the page.
    cubeHidden = opacity <= 0.01;
    container.style.pointerEvents = cubeHidden ? 'none' : 'auto';
    container.style.visibility = cubeHidden ? 'hidden' : 'visible';
}

window.addEventListener('scroll', updateCubeVisibility, { passive: true });

window.addEventListener('resize', function () {
    // This listener is registered before onWindowResize, so refresh isMobile
    // here rather than relying on that one having run first
    checkMobileLayout();
    measureHome();
    updateCubeVisibility();
});

// Browsers restore scroll position after DOMContentLoaded, and anchor jumps
// land after layout, so re-check once everything has settled
window.addEventListener('load', function () {
    measureHome();
    updateCubeVisibility();
});

// initialize when home section exists
if (document.getElementById('home')) {
    init();
}