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
const cubeSize = 0.9;
const spacing = 0.1;
const totalSize = cubeSize + spacing;

let raycaster, mouse;
let clickVector, clickFace;
let lastCube;
let pivot;
let activeGroup = [];
let rotationAngle = 0;
const rotationSpeed = 0.1;
const HALF_PI = Math.PI / 2;

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


    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / 2 / window.innerHeight, 0.1, 1000);
    camera.position.z = 6;
    camera.position.x = -6;
    camera.lookAt(scene.position);


    floatTime = 0;
    floatAmplitude = 0.1;
    floatSpeed = 0.08;
    floatRotationSpeed = 0.008;


    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth / 2, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;

    const container = document.createElement('div');
    container.id = 'canvas-container';
    container.style.position = 'fixed';
    container.style.left = '1%';
    container.style.top = '-25px';
    container.style.width = '40%';
    container.style.height = '40vh';
    container.style.zIndex = '1';
    container.style.pointerEvents = 'auto';
    document.getElementById('home').appendChild(container);
    container.appendChild(renderer.domElement);


    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;


    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    pivot = new THREE.Object3D();

    // Load textures then build the cube
    loadTextures().then(() => {

        createRubiksCube();

        // console.log("Starting animation...");
        animate();

        // Event listeners
        renderer.domElement.addEventListener('mousedown', onMouseDown);
        renderer.domElement.addEventListener('mouseup', onMouseUp);
        renderer.domElement.addEventListener('mousemove', onMouseMove);
        renderer.domElement.addEventListener('mouseout', onMouseOut);
        window.addEventListener('resize', onWindowResize);


        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('shuffleComplete', onShuffleComplete);

        shuffleComplete = false;


        shuffleCube(1);
    });
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

    // Queue up random moves
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
    // console.log("Shuffle complete! Starting floating animation...");
    floatTime = 0;


}

// Improved loadTextures function with better video handling
function loadTextures() {
    return new Promise((resolve) => {
        // const texturePaths = {
        //     right: 'images/kiwi.png',  // Video texture
        //     left: 'images/gallery/video/cooking.mp4',
        //     top: 'images/gallery/video/spiderman.mp4',
        //     bottom: 'images/gallery/video/noodles.mp4',
        //     front: 'images/gallery/video/noodles.mp4',
        //     back: 'images/watermelon.png'
        // };

        // const textureTypes = {
        //     right: 'image',  // need to mark as video texture
        //     left: 'video',
        //     top: 'video',
        //     bottom: 'video',
        //     front: 'video',
        //     back: 'image'
        // };
        const texturePaths = {
            right: '/images/gallery/video/flowerpink.mp4',
            left: '/images/gallery/video/flowergreen.mp4',
            top: '/images/gallery/video/flowerdark.mp4',
            bottom: '/images/gallery/video/flower1.mp4',
            front: '/images/gallery/video/flower.mp4',
            back: '/images/gallery/video/flowergreenblue.mp4'
        };

        const textureTypes = {
            right: 'video',  // need to mark as video texture
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
                // Create video element with better configuration
                const video = document.createElement('video');
                video.src = path;
                video.crossOrigin = 'anonymous';
                video.loop = true;
                video.muted = true;
                video.playsInline = true;
                video.autoplay = true;

                // Create optimized video texture
                const texture = new THREE.VideoTexture(video);
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.format = THREE.RGBAFormat;
                texture.generateMipmaps = false;

                // let the texture use full range without applying repeat/offset
                // (we'll handle that in the shader)
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;

                video.addEventListener('loadeddata', () => {
                    video.play().catch(e => console.error("Video play error:", e));
                    faceTextures[face] = texture;
                    checkComplete();
                });

                // fallback in case video fails to load
                video.addEventListener('error', () => {
                    console.error(`Error loading video for ${face}`);
                    faceTextures[face] = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                    checkComplete();
                });

                // Start loading
                video.load();
            } else {
                // regular image texture loading
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
    // single group for all cubes
    cubeGroup = new THREE.Group();
    allCubes = [];

    const positionOffset = (dimensions - 1) / 2;

    for (let x = 0; x < dimensions; x++) {
        for (let y = 0; y < dimensions; y++) {
            for (let z = 0; z < dimensions; z++) {
                // skip internal cube so my code runs like 1% faster if anything (if dimensions > 2)
                if (dimensions > 2 && x > 0 && x < dimensions - 1 &&
                    y > 0 && y < dimensions - 1 &&
                    z > 0 && z < dimensions - 1) {
                    continue;
                }

                // array for materials w/ correct uv mapping
                const materials = [];

                // Right face (+X)
                materials.push(createFaceMaterial('right', x, y, z, 0));
                // Left face (-X)
                materials.push(createFaceMaterial('left', x, y, z, 1));
                // Top face (+Y)
                materials.push(createFaceMaterial('top', x, y, z, 2));
                // Bottom face (-Y)
                materials.push(createFaceMaterial('bottom', x, y, z, 3));
                // Front face (+Z)
                materials.push(createFaceMaterial('front', x, y, z, 4));
                // Back face (-Z)
                materials.push(createFaceMaterial('back', x, y, z, 5));

                // create geometry with custom UVs
                const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

                // Create mesh with materials
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
    // Check if this face is on the outside of the cube
    const isOutside = (
        (face === 'right' && x === dimensions - 1) ||
        (face === 'left' && x === 0) ||
        (face === 'top' && y === dimensions - 1) ||
        (face === 'bottom' && y === 0) ||
        (face === 'front' && z === dimensions - 1) ||
        (face === 'back' && z === 0)
    );

    if (!isOutside) {
        // Inside faces are black
        return new THREE.MeshBasicMaterial({ color: 0x111111 });
    }

    // Calculate UV coordinates based on position
    // i am not having a time
    let uMin, uMax, vMin, vMax;


    if (face === 'right') { // +X face
        // Z maps to U, Y maps to V (flip Y to keep top-to-bottom orientation)
        uMin = z / dimensions;
        uMax = (z + 1) / dimensions;
        vMin = 1 - (y + 1) / dimensions; // Flip Y to maintain top-down orientation
        vMax = 1 - y / dimensions;
    }
    else if (face === 'left') { // -X face
        // Z maps to U (flipped), Y maps to V (flipped)
        uMin = 1 - (z + 1) / dimensions; // Flip Z to maintain front-to-back
        uMax = 1 - z / dimensions;
        vMin = 1 - (y + 1) / dimensions; // Flip Y to maintain top-down orientation
        vMax = 1 - y / dimensions;
    }
    else if (face === 'top') { // +Y face
        // X maps to U, Z maps to V
        uMin = x / dimensions;
        uMax = (x + 1) / dimensions;
        vMin = 1 - (z + 1) / dimensions; // Flip Z for proper orientation
        vMax = 1 - z / dimensions;
    }
    else if (face === 'bottom') { // -Y face
        // X maps to U, Z maps to V (flipped)
        uMin = x / dimensions;
        uMax = (x + 1) / dimensions;
        vMin = z / dimensions; // Don't flip Z for proper orientation on bottom
        vMax = (z + 1) / dimensions;
    }
    else if (face === 'front') { // +Z face
        // X maps to U, Y maps to V (flipped)
        uMin = x / dimensions;
        uMax = (x + 1) / dimensions;
        vMin = 1 - (y + 1) / dimensions; // Flip Y for proper top-down orientation
        vMax = 1 - y / dimensions;
    }
    else { // back face (-Z)
        // X maps to U (flipped), Y maps to V (flipped)
        uMin = 1 - (x + 1) / dimensions; // Flip X for proper left-right orientation
        uMax = 1 - x / dimensions;
        vMin = 1 - (y + 1) / dimensions; // Flip Y for proper top-down orientation
        vMax = 1 - y / dimensions;
    }

    // Get the texture for this face
    const texture = faceTextures[face];

    // If it's already a material (fallback case), return it
    if (texture instanceof THREE.Material) {
        return texture;
    }

    let material;

    if (texture instanceof THREE.VideoTexture) {
        // for video textures (which is all of them right now), we create a unique ShaderMaterial for each cubelet
        // by adjusting the UV coordinates in a custom shader
        const vertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            uniform sampler2D videoTexture;
            uniform vec4 uvBounds;  // x: uMin, y: uMax, z: vMin, w: vMax
            varying vec2 vUv;
            
            void main() {
                // Remap UVs to the specific region of the texture for this cubelet
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
        // for standard image textures, rn im using all videos thoguh
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
    if (isMoving) return;

    event.preventDefault();

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(allCubes);

    if (intersects.length > 0) {
        controls.enabled = false;

        const intersectedCube = intersects[0].object;
        clickVector = intersectedCube.rubikPosition.clone();

        // Determine which face was clicked
        const faceIndex = intersects[0].faceIndex;
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(intersectedCube.matrixWorld);
        const normal = intersects[0].face.normal.clone().applyMatrix3(normalMatrix).normalize();

        // Determine which global axis this face normal is closest to
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
    }
}
// Mouse move handler
function onMouseMove(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

// Mouse up handler
function onMouseUp(event) {
    if (isMoving || !clickVector || !clickFace || !lastCube) {
        clickVector = null;
        clickFace = null;
        controls.enabled = true;
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

        // If drag is too small, don't rotate
        if (dragVector.length() < totalSize * 0.5) {
            clickVector = null;
            clickFace = null;
            controls.enabled = true;
            return;
        }


        //    F a c e
        // D    X Y Z
        // r  X - Z Y
        // a  Y Z - X
        // g  Z Y X -
        const transitions = {
            'x': { 'y': 'z', 'z': 'y' },
            'y': { 'x': 'z', 'z': 'x' },
            'z': { 'x': 'y', 'y': 'x' }
        };

        // determine principal drag direction (excluding click face axis)
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
    controls.enabled = true;
}

function onMouseOut(event) {
    if (clickVector && clickFace && lastCube) {
        onMouseUp(event);
    }
}

// return the axis which has the greatest magnitude for the vector v
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

function onWindowResize() {
    camera.aspect = window.innerWidth / 2 / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth / 2, window.innerHeight);
}

// Add this to ensure proper initial sizing
//window.addEventListener('load', onWindowResize);
// we dont even use keyboard
function onKeyDown(event) {
    if (isMoving) return;

    const key = event.key.toLowerCase();
    const shift = event.shiftKey;
    const direction = shift ? -1 : 1;

    let rotateAxis, slicePos;

    switch (key) {
        // case 'f': // Front face
        //     rotateAxis = 'z';
        //     slicePos = Math.floor(dimensions / 2) + 1;
        //     rotateFace(rotateAxis, slicePos, direction);
        //     break;
        // case 'b': // Back face
        //     rotateAxis = 'z';
        //     slicePos = -Math.floor(dimensions / 2) - 1;
        //     rotateFace(rotateAxis, slicePos, direction);
        //     break;
        // case 'u': // Up face
        //     rotateAxis = 'y';
        //     slicePos = Math.floor(dimensions / 2) + 1;
        //     rotateFace(rotateAxis, slicePos, direction);
        //     break;
        // case 'd': // Down face
        //     rotateAxis = 'y';
        //     slicePos = -Math.floor(dimensions / 2) - 1;
        //     rotateFace(rotateAxis, slicePos, direction);
        //     break;
        // case 'l': // Left face
        //     rotateAxis = 'x';
        //     slicePos = -Math.floor(dimensions / 2) - 1;
        //     rotateFace(rotateAxis, slicePos, direction);
        //     break;
        // case 'r': // Right face
        //     rotateAxis = 'x';
        //     slicePos = Math.floor(dimensions / 2) + 1;
        //     rotateFace(rotateAxis, slicePos, direction);
        //     break;
        case 's': // Shuffle
            shuffle();
            break;

        case 'a': // Auto-solve
            solve();
            break;
    }
}

const moveCompleteEvent = new Event('moveComplete');

// Setup a move with a cube, position, axis, and direction
function pushMove(cube, vector, axis, direction) {
    moveQueue.push({ cube: cube, vector: vector, axis: axis, direction: direction });
}

// Start the next move in the queue
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

            // Attach to pivot
            scene.remove(cube);
            pivot.attach(cube);
        });

        currentMove = nextMove;
    }
}

// Select cubes that align with clickVector on the given axis
function setActiveGroup(axis) {
    activeGroup = [];
    allCubes.forEach(cube => {
        if (nearlyEqual(cube.rubikPosition[axis], clickVector[axis])) {
            activeGroup.push(cube);
        }
    });
}
//function for rotation animation
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

    // store the current state of cubeGroup
    const groupPosition = cubeGroup.position.clone();
    const groupRotation = cubeGroup.rotation.clone();

    // move cubes back to the scene and update their positions
    activeGroup.forEach(cube => {
        // get world position and quaternion
        const worldPos = new THREE.Vector3();
        cube.getWorldPosition(worldPos);

        const worldQuat = new THREE.Quaternion();
        cube.getWorldQuaternion(worldQuat);

        // detach from pivot
        pivot.remove(cube);

        // add back to cubeGroup
        cubeGroup.add(cube);

        // calculate local position relative to cubeGroup b/c we need to account for cubegroup's pos and rotation
        const localPos = worldPos.clone();

        //adjust for cubeGroup's current position
        localPos.sub(groupPosition);
        cube.position.copy(localPos);
        cube.quaternion.copy(worldQuat);

        // snap to grid to maintain orthogonal structure b/c we are rotating
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

// function to snap cube face relatively because we are rotating the entire cube as well
function snapCubeToGrid(cube) {
    const pos = cube.position;

    // calculate the expected grid position based on totalSize
    const gridX = Math.round(pos.x / totalSize) * totalSize;
    const gridY = Math.round(pos.y / totalSize) * totalSize;
    const gridZ = Math.round(pos.z / totalSize) * totalSize;

    // Snap to the grid
    pos.set(gridX, gridY, gridZ);

    // ensure rotation is also aligned to 90-degree increments
    const rot = new THREE.Euler().setFromQuaternion(cube.quaternion);

    // snap rotation to 90-degree increments (PI/2 radians)
    rot.x = Math.round(rot.x / HALF_PI) * HALF_PI;
    rot.y = Math.round(rot.y / HALF_PI) * HALF_PI;
    rot.z = Math.round(rot.z / HALF_PI) * HALF_PI;

    // apply snapped rotation
    cube.quaternion.setFromEuler(rot);
}

// programmatically rotate a face
function rotateFace(axis, positionValue, direction) {
    if (isMoving) return;

    // find a cube on the face to use as reference
    const cubeOnFace = allCubes.find(cube => {
        if (axis === 'x') {
            return Math.abs(cube.rubikPosition.x - positionValue) < 0.5;
        } else if (axis === 'y') {
            return Math.abs(cube.rubikPosition.y - positionValue) < 0.5;
        } else if (axis === 'z') {
            return Math.abs(cube.rubikPosition.z - positionValue) < 0.5;
        }
    });

    if (cubeOnFace) {
        clickVector = cubeOnFace.rubikPosition.clone();
        pushMove(cubeOnFace, clickVector, axis, direction);
        startNextMove();
    }
}

function animate() {
    requestAnimationFrame(animate);

    // update video textures in shader materials
    if (allCubes) {
        allCubes.forEach(cube => {
            if (cube.material) {
                // Handle both array of materials and single material
                const materials = Array.isArray(cube.material) ? cube.material : [cube.material];

                materials.forEach(material => {
                    // check if it's our custom shader material for video
                    if (material instanceof THREE.ShaderMaterial &&
                        material.uniforms &&
                        material.uniforms.videoTexture &&
                        material.uniforms.videoTexture.value instanceof THREE.VideoTexture) {

                        // update the texture to show the latest video frame
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

    // queue up random moves
    for (let i = 0; i < moves; i++) {
        const cube = randomCube();
        pushMove(cube, cube.rubikPosition.clone(), randomAxis(), randomDirection());
    }

    // Start the first move
    startNextMove();
}



// Naive solver - step backwards through all completed steps
function solve() {
    if (isMoving || completedMoveStack.length === 0) return;

    // create a copy of the completed move stack
    const movesToUndo = completedMoveStack.slice().reverse();
    completedMoveStack = [];

    // queue up all the inverse moves
    movesToUndo.forEach(move => {
        pushMove(
            move.cube,
            move.vector,
            move.axis,
            move.direction * -1
        );
    });

    // Start the solve process
    const onComplete = () => {
        if (moveQueue.length === 0) {
            // reset the completed move stack
            completedMoveStack = [];
            document.removeEventListener('moveComplete', onComplete);
        }
    };


    document.addEventListener('moveComplete', onComplete);

    startNextMove();
}
//hide canvas when past first page
window.addEventListener('scroll', function () {
    if (!document.getElementById('canvas-container')) return;

    const homeHeight = document.getElementById('home').offsetHeight;
    const scrollY = window.scrollY;

    if (scrollY > homeHeight - 300) {
        document.getElementById('canvas-container').style.opacity = '0';
    } else {
        document.getElementById('canvas-container').style.opacity = '1';
    }
});
// document.addEventListener('DOMContentLoaded', function () {
//     // Check if we're running on Vercel
//     if (window.location.hostname.includes('vercel.app') ||
//         window.location.hostname.includes('gracejinwebsite')) {
//         //i'll change the domain later
//         // Add a data attribute to the body element
//         document.body.setAttribute('data-deploy', 'vercel');


//         const canvas = document.getElementById('canvas-container');
//         if (canvas) {
//             canvas.style.width = '45%';
//             canvas.style.height = '45vh';
//         }

//         const projectBars = document.querySelectorAll('.project-bar');
//         projectBars.forEach(bar => {
//             bar.style.height = '7.5rem';
//         });
//     }
// });

if (document.getElementById('home')) {
    init();
}


