//shader thumbnails, these are really generic but i will change in time

const shaderThumbnails = {
    'shader-canvas-1': {
        fragment: `
        precision mediump float;
            uniform vec2 iResolution;
            uniform float iTime;
            
            //pallette function
            //https://github.com/thi-ng/color/blob/master/src/gradients.org
            vec3 palette(float t) {
                vec3 a = vec3(0.5, 0.5, 0.5);
                vec3 b = vec3(0.5, 0.5, 0.5);
                vec3 c = vec3(1.0, 1.0, 1.0);
                vec3 d = vec3(0.821, 0.328, 0.242);
                return a + b * cos(6.28318 * (c * t + d));
            }
            
            void main() {
                vec2 fragCoord = gl_FragCoord.xy;
                vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y; //we dont want to stretch it, we fit to screen!
                vec2 uv0 = uv;
                vec3 finalColor = vec3(0.0);
                
                for (float i = 0.0; i < 5.0; i++) {
                    uv = fract(uv *1.2 ) - 0.5;
                    float d = length(uv) * exp(-length(uv0));
                    vec3 col = palette(length(uv0) + i * 0.4 + iTime * 0.4);
                    d = sin(d * 8.0 + iTime) / 8.0;
                    d = abs(d);
                    d = pow(0.01 / d, 1.2);
                    finalColor += col * d;
                }
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `
    }
    // 'shader-canvas-2': {
    //     fragment: `
    // precision mediump float;
    //     uniform vec2 iResolution;
    //     uniform float iTime;

    //     // blue palette function
    //     vec3 bluePalette(float t) {
    //         vec3 a = vec3(0.2, 0.4, 0.8);
    //         vec3 b = vec3(0.3, 0.5, 0.7);
    //         vec3 c = vec3(0.8, 1.0, 1.2);
    //         vec3 d = vec3(0.1, 0.3, 0.6);
    //         return a + b * cos(6.28318 * (c * t + d));
    //     }

    //     void main() {
    //         vec2 fragCoord = gl_FragCoord.xy;
    //         vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y; //fit to screen
    //         vec2 uv0 = uv;
    //         vec3 finalColor = vec3(0.0);

    //         // Create flowing blue waves
    //         for (float i = 0.0; i < 2.0; i++) {
    //             uv = fract(uv * 0.5) - 0.5;
    //             float d = length(uv) * exp(-length(uv0));
    //             vec3 col = bluePalette(length(uv0) + i * 0.3 + iTime * 0.3);
    //             d = sin(d * 6.0 + iTime + i) / 6.0;
    //             d = abs(d);
    //             d = pow(0.02 / d, 1.0);
    //             finalColor += col * d;
    //         }

    //         // add some blue background gradient
    //         finalColor += vec3(0.05, 0.1, 0.3) * (length(uv0));

    //         gl_FragColor = vec4(finalColor, 1.0);
    //     }
    // `


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

//init all shader thumbnaisl
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