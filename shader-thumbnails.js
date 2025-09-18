//shader thumbnails now it is bglobbe yay

const shaderThumbnails = {
    'shader-canvas-1': {
        fragment: `
        precision mediump float;
        uniform vec2 iResolution;
        uniform float iTime;
        
        // 3D hash function for noise
        float hash3D(vec3 p) {
            return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
        }
        
        // 3D noise function for phere coordinate
        float noise3D(vec3 p) {
            vec3 i = floor(p);
            vec3 f = fract(p);
            
            // 8 corners of the 3D grid cell
            float a = hash3D(i);
            float b = hash3D(i + vec3(1.0, 0.0, 0.0));
            float c = hash3D(i + vec3(0.0, 1.0, 0.0));
            float d = hash3D(i + vec3(1.0, 1.0, 0.0));
            float e = hash3D(i + vec3(0.0, 0.0, 1.0));
            float f1 = hash3D(i + vec3(1.0, 0.0, 1.0));
            float g = hash3D(i + vec3(0.0, 1.0, 1.0));
            float h = hash3D(i + vec3(1.0, 1.0, 1.0));
            
            // lin interp
            vec3 u = f * f * (3.0 - 2.0 * f);
            
            // trilinear interpolation
            return mix(
                mix(mix(a, b, u.x), mix(c, d, u.x), u.y),
                mix(mix(e, f1, u.x), mix(g, h, u.x), u.y),
                u.z
            );
        }
        
        // 3D fractal noise
        float fbm3D(vec3 p) {
            float value = 0.0;
            float amplitude = 0.5;
            float frequency = 1.0;
            
            // add multiple octaves of noise
            for (int i = 0; i < 4; i++) {
                value += amplitude * noise3D(p * frequency);
                amplitude *= 0.5;
                frequency *= 2.0;
            }
            
            return value;
        }
        
        vec3 getEarthColor(vec2 uv) {
            // cloud radius, planet radius, cloud > planet so it resides on top of it
            float planetRadius = 1.2;
            float cloudRadius = 1.3;
            
            // calculate distance from center
            float dist = length(uv);
            
            // Space background for everything outside cloud layer
            if (dist > cloudRadius) {
                return vec3(0.0, 0.0, 0.0);
            }
            
            // Initialize final color
            vec3 finalColor = vec3(0.0, 0.0, 0.0);
            
            // === PLANET LAYER ===
            if (dist <= planetRadius) {
                float x = uv.x;
                float y = uv.y;
                float z = sqrt(planetRadius * planetRadius - x * x - y * y);
                
                // y axis rotation
                float rotationSpeed = 0.3;
                float angle = iTime * rotationSpeed;
                
                float cosAngle = cos(angle);
                float sinAngle = sin(angle);
                
                // rotation based on the matrix translation for rotating across y
                float rotatedX = x * cosAngle + z * sinAngle;
                float rotatedZ = -x * sinAngle + z * cosAngle;
                float rotatedY = y;
                
                vec3 spherePos = vec3(rotatedX, rotatedY, rotatedZ);
                
                // generate terrain using 3D fractal noise
                float elevation = fbm3D(spherePos * 4.0);
                
                // add large-scale continental features
                float continents = fbm3D(spherePos * 2.0);
                elevation = mix(elevation, continents * 0.8, 0.6);
                
                float seaLevel = 0.4;
                bool isLand = elevation > seaLevel;
                
                // color palette with purple tones (#af6bb1 = rgb(175, 107, 177) normalized)
                vec3 baseColor = vec3(0.686, 0.420, 0.694);  // #af6bb1
                vec3 planetColor;
                if (isLand) {
                    float landHeight = (elevation - seaLevel) / (1.0 - seaLevel);

                    if (landHeight < 0.2) {
                        // low elevation land - lighter purple-green mix
                        planetColor = mix(vec3(0.5, 0.6, 0.8), baseColor * 0.9, landHeight * 5.0);
                    } else if (landHeight < 0.6) { //mid elevation
                        // mid elevation - deeper purple tones
                        planetColor = mix(baseColor * 0.8, baseColor * 1.2, (landHeight - 0.2) * 2.5);
                    } else {
                        // High elevation - lighter purple peaks
                        planetColor = mix(baseColor * 1.1, vec3(0.9, 0.7, 0.9), (landHeight - 0.6) * 2.5);
                    }
                } else {
                    float waterDepth = (seaLevel - elevation) / seaLevel;
                    if (waterDepth < 0.3) {
                        // shallow water - purple-blue 
                        planetColor = mix(vec3(0.6, 0.5, 0.8), baseColor * 0.7, waterDepth * 3.33);
                    } else {
                        // Deep water - darker purple-blue
                        planetColor = mix(baseColor * 0.6, vec3(0.4, 0.3, 0.6), (waterDepth - 0.3) * 1.43);
                    }
                }
                
                // lighting
                vec3 lightDir = normalize(vec3(0.7, 0.7, 1.0));  // Top-right-forward
                float planetLighting = dot(normalize(vec3(rotatedX, rotatedY, rotatedZ)), lightDir) * 0.5 + 1.2;
                planetColor *= planetLighting;
                
                // edge fade
                float planetEdgeFade = 1.0 - pow(dist / planetRadius, 2.0);
                planetColor *= planetEdgeFade;
                
                finalColor = planetColor;
            }
            
            // === CLOUD LAYER ===
            float cloudX = uv.x;
            float cloudY = uv.y;
            float cloudZ = sqrt(cloudRadius * cloudRadius - cloudX * cloudX - cloudY * cloudY);
            
            // apply rotation to clouds
            float cloudRotationSpeed = 0.4;
            float cloudAngle = iTime * cloudRotationSpeed;
            float cloudDrift = iTime * 0.25;
            
            float cloudCosAngle = cos(cloudAngle);
            float cloudSinAngle = sin(cloudAngle);
            
            // Apply rotation based on transformation matrix
            float rotatedCloudX = cloudX * cloudCosAngle + cloudZ * cloudSinAngle;
            float rotatedCloudZ = -cloudX * cloudSinAngle + cloudZ * cloudCosAngle;
            float rotatedCloudY = cloudY;
            
            vec3 cloudSpherePos = vec3(rotatedCloudX, rotatedCloudY, rotatedCloudZ);
            
            //time-based drift
            vec3 driftOffset = vec3(cloudDrift, 0.0, 0.0);
            
            // generate cloud density using 3D perlin noise
            float cloudDensity = fbm3D((cloudSpherePos + driftOffset) * 3.5);
            cloudDensity += fbm3D((cloudSpherePos + driftOffset) * 10.0) * 0.3;

            // cloud lighting
            vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
            float cloudLighting = dot(normalize(vec3(rotatedCloudX, rotatedCloudY, rotatedCloudZ)), lightDir) * 0.4 + 0.6;
            cloudLighting = cloudLighting * 0.5 + 0.6;
            
            vec3 cloudColor = vec3(0.9, 0.7, 0.9) * cloudLighting;  // Purple-tinted clouds
            
            float cloudThreshold = 0.65;

            if (cloudDensity > cloudThreshold) {
                finalColor = cloudColor;
            }
            
            return finalColor;
        }
        
        void main() {
            vec2 uv = (gl_FragCoord.xy * 2.0 - iResolution.xy) / min(iResolution.x, iResolution.y);
            
            // Get the color for this pixel
            vec3 color = getEarthColor(uv);
            
            // Apply brightness and clamp
            color *= 1.2;
            color = min(color, vec3(1.0));
            
            gl_FragColor = vec4(color, 1.0);
        }
        `
    }
};

const shaderVertexSource = `
    attribute vec4 a_position;
    void main() {
        gl_Position = a_position;
    }
`;

function createShaderThumbnail(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function createShaderProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }

    return program;
}

function initShaderThumbnail(canvasId, fragmentSource) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) return null;

    // make canvas size match container
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    const vertexShader = createShaderThumbnail(gl, gl.VERTEX_SHADER, shaderVertexSource);
    const fragmentShader = createShaderThumbnail(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = createShaderProgram(gl, vertexShader, fragmentShader);

    if (!program) return null;

    const positions = new Float32Array([
        -1, -1, 1, -1, -1, 1, 1, 1
    ]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.viewport(0, 0, canvas.width, canvas.height);

    return { gl, program, canvas };
}

//init all shader thumbnails
let shaderThumbnailInstances = {};
let shaderStartTime = Date.now();

function initAllShaderThumbnails() {
    Object.keys(shaderThumbnails).forEach(canvasId => {
        shaderThumbnailInstances[canvasId] = initShaderThumbnail(canvasId, shaderThumbnails[canvasId].fragment);
    });
}

function renderShaderThumbnails() {
    const currentTime = (Date.now() - shaderStartTime) / 1000.0;

    Object.keys(shaderThumbnailInstances).forEach(canvasId => {
        const instance = shaderThumbnailInstances[canvasId];
        if (!instance) return;

        const { gl, program, canvas } = instance;

        gl.useProgram(program);

        const iTimeLocation = gl.getUniformLocation(program, 'iTime');
        const iResolutionLocation = gl.getUniformLocation(program, 'iResolution');

        gl.uniform1f(iTimeLocation, currentTime);
        gl.uniform2f(iResolutionLocation, canvas.width, canvas.height);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    });

    requestAnimationFrame(renderShaderThumbnails);
}

// init shader thumbnails when DOM is loaded
function initShaderThumbnailSystem() {
    setTimeout(() => {
        initAllShaderThumbnails();
        renderShaderThumbnails();
    }, 100);
}

// auto-initialize if DOM is already loaded, otherwise wait for it
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShaderThumbnailSystem);
} else {
    initShaderThumbnailSystem();
}

// Handle window resize
window.addEventListener('resize', function () {
    // Reinitialize shader thumbnails on resize
    setTimeout(() => {
        shaderThumbnailInstances = {};
        initAllShaderThumbnails();
    }, 100);
});