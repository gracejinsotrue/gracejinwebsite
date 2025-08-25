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
const cubeSize = 1.1;
const spacing = 0.15;
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

    // Adjust camera settings based on mobile
    const aspect = isMobile ? window.innerWidth / 300 : window.innerWidth / 2 / window.innerHeight;
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    camera.position.z = isMobile ? 8 : 10;
    camera.position.x = isMobile ? -4 : -4;
    camera.position.y = isMobile ? 3 : 4;
    camera.lookAt(scene.position);

    floatTime = 0;
    floatAmplitude = 0.1;
    floatSpeed = 0.08;
    floatRotationSpeed = 0.008;

    const rendererWidth = isMobile ? window.innerWidth : window.innerWidth / 2;
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
        canvasContainer.style.left = '0%';
        canvasContainer.style.top = '-50px';
        canvasContainer.style.width = '30%';
        canvasContainer.style.height = '20vh';
        canvasContainer.style.zIndex = '1';
        canvasContainer.style.pointerEvents = 'auto';
        document.getElementById('home').appendChild(canvasContainer);
    }

    canvasContainer.appendChild(renderer.domElement);
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

    const newWidth = isMobile ? window.innerWidth : window.innerWidth / 2;
    const newHeight = isMobile ? 300 : window.innerHeight;

    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);

    // reposition camera for both mobile/desktop
    if (isMobile) {
        camera.position.set(-4, 3, 8);
    } else {
        camera.position.set(-6, 4, 6);
    }
    camera.lookAt(scene.position);
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

    if (allCubes) {
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

    for (const [face, texture] of Object.entries(faceTextures)) {
        if (texture instanceof THREE.VideoTexture && texture.image instanceof HTMLVideoElement) {
            if (texture.image.paused) {
                texture.image.play().catch(e => console.log("Video play error:", e));
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

// Hide canvas when past first page (desktop only)
window.addEventListener('scroll', function () {
    if (!document.getElementById('canvas-container') || isMobile) return;

    const homeHeight = document.getElementById('home').offsetHeight;
    const scrollY = window.scrollY;

    if (scrollY > homeHeight - 300) {
        document.getElementById('canvas-container').style.opacity = '0';
    } else {
        document.getElementById('canvas-container').style.opacity = '1';
    }
});

// initialize when home section exists
if (document.getElementById('home')) {
    init();
}