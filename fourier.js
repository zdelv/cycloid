"use strict";

const vec3 = glMatrix.vec3;
const vec4 = glMatrix.vec4;
const mat4 = glMatrix.mat4;
const glm = glMatrix.glMatrix;
const twgljs = twgl;

const fragShaderSource = `#version 300 es
precision highp float;

uniform sampler2D texture0;
uniform float time;
uniform vec4 color;

out vec4 outColor;

void main() {
    //outColor = vec4(1.0,1.0,texture2D(texture, vec2(1.0,1.0)), 1.0);
    vec2 var = vec2(4.0, 4.0);
    //float texOut = 50.0 * texture(texture0, var).w;
    //outColor = vec4(0.0, 0.0, texOut, 1.0);
    
    vec4 texOut = texture(texture0, vec2(0.5,0.4));
    outColor = color;
}
`

const vertexShaderSource = `#version 300 es
layout (location = 0) in vec3 a_position;

uniform mat4 projection;
uniform mat4 view;
uniform mat4 model;

out vec3 pos;
out mat4 viewMat;
out vec4 fragPos;

void main() {
    gl_Position = projection * view * model * vec4(a_position, 1.0);
    pos = a_position;
    viewMat = view;
    fragPos = vec4(model * vec4(a_position, 1.0));
}
`

const sineShaderSource = `#version 300 es
const float PI = 3.1415926535897932384626433832795;
const float PI_2 = 1.57079632679489661923;
const float PI_4 = 0.785398163397448309616;

layout (location = 0) in vec3 a_position;

uniform sampler2D texture0;

uniform float time;
uniform mat4 projection;
uniform mat4 view;
uniform mat4 model;
uniform int renderSine;
uniform float sineAmplitude;
uniform float cycloidAmplitude;
uniform float velocity;

uniform int freqWidth;
uniform int freqLength;


float decode(in sampler2D tex, in vec2 pos)
{
    float val = 0.0;
    vec4 texOut = texture(tex, pos) * 255.0;
    val = float((int(texOut.r) << 24) + (int(texOut.g) << 16) + (int(texOut.b) << 8) + (int(texOut.a)));

    return val;
}

vec3 sine(in vec3 pos, in float time) {
    float omega = 1.0;
    
    float yval = 0.0;
    float texFreq;
    vec2 texPos;
    float k = 0.0;
    float blockWidth = 1.0 / float(freqWidth);
    for (float i = blockWidth / 2.0; i <= 1.0; i+=blockWidth)
    {
        texPos = vec2(i, 0.0);
        //texFreq = texture(texture0, vec2(texPos,0.0)).w * 255.0;
        texFreq = decode(texture0, texPos);
        k = (2.0*PI)/(velocity/texFreq);       // Wavenumber. Velocity = Freq * Wavelength
        yval += sineAmplitude * sin(k * pos.x - 2.0*PI*texFreq * time);  //sin(kx-wt), k=2pi*f/lambda, w=2pi*f
    }
    
    return vec3(pos.x, yval, pos.z);
}

vec3 cycloid(in vec3 pos, in float time)
{
    float omega = 1.0;
    
    float yval = 0.0;
    float xval = 0.0;
    float zval = 0.0;
    float k = 0.0;
    float texFreq;
    vec2 texPos;
    float blockWidth = 1.0 / float(freqWidth);
    for (float i = blockWidth / 2.0; i <= 1.0; i+=blockWidth)
    {
        texPos = vec2(i, 0.0);
        texFreq = decode(texture0, texPos);
        k = (2.0*PI)/(velocity/texFreq);       // Wavenumber. Velocity = Freq * Wavelength
        xval += cycloidAmplitude * cos((k * pos.z - time * 2.0*PI*texFreq));
        yval += cycloidAmplitude * sin((k * pos.z - time * 2.0*PI*texFreq));
    }
    
    return vec3(xval,yval,pos.z);
}

void main() {
    float omega = 1.0;
    vec3 newPos;

    if (renderSine == 1)
    {
        newPos = sine(a_position, time);
    }
    else
    {
        newPos = cycloid(a_position, time);
    }
    
    gl_Position = projection * view * model * vec4(newPos, 1.0);
}
`

let globalTime;

function sine(x) 
{
    return Math.sin(x);
}

function generateFunc(size, dx, vertices, indices)
{
    for (let i = -size; i <= size; i += dx)
    {
        vertices.push(i);
        vertices.push(0);
        vertices.push(0);
    }

    for (let i = 0; i < size * 2 / dx; i++)
    {
        indices.push(i);
        indices.push(i+1);
    }
}

function generateCycloid(size, dx, vertices, indices)
{
    for (let i = -size; i <= size; i += dx)
    {
        vertices.push(0);
        vertices.push(0);
        vertices.push(i);
    }

    for (let i = 0; i < size * 2 / dx; i++)
    {
        indices.push(i);
        indices.push(i+1);
    }
}

class Bounds {
    constructor(x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }

    // Checks if x,y is within the bounds given
    // Returns true if so, false if not
    within(x,y) {
        if (x > this.x1 && x < this.x2) {
            if (y > this.y1 && y < this.y2) {
                return true;
            }
        }
        return false;
    }

    update(x1,y1,x2,y2) {
        this.x1 = x1;
        this.x2 = x2;
        this.y1 = y1;
        this.y2 = y2;
    }
}

// https://html-online.com/articles/get-url-parameters-javascript/
// Quick and dirty way
function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}

function getUrlParam(parameter, defaultvalue){
    var urlparameter = defaultvalue;
    if(window.location.href.indexOf(parameter) > -1){
        urlparameter = getUrlVars()[parameter];
        }
    return urlparameter;
}

function test() 
{
    const canvas = document.getElementById("c");
    const gl = canvas.getContext("webgl2");
    if (!gl) {
        console.log("ERROR");
        return;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, sineShaderSource);
    const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragShaderSource);
    const shaderProg = createProgram(gl, vertexShader, fragShader);

    
    let camera = {
        pos: vec3.fromValues(1.0, 1.0, 1.0),
        front: vec3.fromValues(0.0, 0.0, -1.0),
        up: vec3.fromValues(0.0, 1.0, 0.0),
        dir: vec3.fromValues(0.0, 0.0, 0.0),
        fov: {
            deg: 100,
            upDegrees: 45,
            downDegrees: 45,
            leftDegrees: 45,
            rightDegrees: 45,
        },
        scale: 1,
        view: mat4.create(),
    }

    let scene = {
        model: mat4.create(),
        projection: mat4.create(),
    }

    let UIState = {
        CYCLOID3D: 'cycloid3d',
        CYCLOID2D: 'cycloid2d',
        WAVEFORM2D: 'waveform2d',
    }

    // NaNs are populated after state is created
    class State {
        constructor() {
            // Global Width/Height
            this.aspectRatio = canvas.clientWidth / canvas.clientHeight;
            this.width = 10 * 2;
            this.height = this.width / this.aspectRatio;
            
            // UI Width/Height
            this.cycloid3dWidth = 16;
            this.cycloid3dHeight = this.cycloid3dWidth / this.aspectRatio;
            this.cycloid2dWidth = 10;
            this.cycloid2dHeight = this.cycloid2dWidth / this.aspectRatio;
            this.waveform2dWidth = 20;
            this.waveform2dHeight = this.waveform2dWidth / this.aspectRatio;
            
            // Parameters
            this.sineAmplitude = 1;
            this.cycloidAmplitude = 1;
            this.timeFactor = 0.5;
            this.frequencies = [];
            this.encodedFreqs = NaN;
            this.freqInput = "";
            this.velocity = 5.0;                    // NOT PIXELS  World Space Coordinates
            this.color = [0, 127, 127, 255];        // 0-255  because dat.GUI uses that range
            this.highlighted = undefined;           // Defines which UI section we are currently using

            let urlFreqs = getUrlParam("freqs", undefined);
            if (urlFreqs == null)
            {
                // Default to 5Hz if no url input
                this.frequencies = [5];
            }
            else
            {
                this.frequencies = urlFreqs.split(",").map((i) => parseInt(i));
            }
            
        }

        addFreq() {
            if (Number.isNaN(parseInt(this.freqInput)))
            {
                console.log("Must be a number");
            }
            else
            {
                this.frequencies.push(parseInt(this.freqInput));
                let urlFreqs = "?freqs=" + this.frequencies[0];
                for (let i = 1; i < this.frequencies.length; i++)
                {
                    urlFreqs += "," + this.frequencies[i]
                }  
                window.history.replaceState(null, null, urlFreqs);
                this.reloadFrequencies();
            }
            console.log(this.frequencies); 
        }

        clearFreqs() {
            this.frequencies = [];
            this.encodedFreqs = [];
            window.history.replaceState(null, null, "?freqs=")
            this.reloadFrequencies();
        }

        reloadFrequencies() {
            this.encodedFreqs = genFreq(this.frequencies);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.encodedFreqs.length/4, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.encodedFreqs);
            console.log(this.encodedFreqs);
        }

        reshapeColor() {
            let newColors = [0.0, 0.0, 0.0, 1.0];
            for (let i = 0; i < 3; i++) {
                newColors[i] = (this.color[i] / 255);
            }
            return newColors;
        }

        resetUI() {
            this.aspectRatio = canvas.clientWidth / canvas.clientHeight;
            this.width = 10 * 2;
            this.height = this.width / this.aspectRatio;
            
            this.cycloid3dWidth = 16;
            this.cycloid3dHeight = this.cycloid3dWidth / this.aspectRatio;
            this.cycloid2dWidth = 10;
            this.cycloid2dHeight = this.cycloid2dWidth / this.aspectRatio;
            this.waveform2dWidth = 20;
            this.waveform2dHeight = this.waveform2dWidth / this.aspectRatio;
        }
    }
    
    const state = new State();
    
    function genFreq(freqs) {
        if (freqs === undefined || freqs.length == 0)
            return new Uint8Array([0,0,0,0]);
          
        let outFreqs = new Uint8Array(freqs.length*4); 
        
        let j = 0;
        for (let i = 0; i < freqs.length * 4; i+=4,j+=1)
        {
            outFreqs[i+3] =  freqs[j]        & 0xFF;    // Mask the lowest 8 bits
            outFreqs[i+2] = (freqs[j] >> 8)  & 0xFF;    // Shift 8 then mask the lowest 8 bits
            outFreqs[i+1] = (freqs[j] >> 16) & 0xFF;    // Shift 16 then mask the lowest 8 bits
            outFreqs[i] =   (freqs[j] >> 24) & 0xFF;    // Shift 24 then mask the lowest 8 bits
        }
        return outFreqs;
    };
    
    // Bounds for the UI. Used to find where each mouse click is
    let UIBounds = {
        // Another object so that I can iterate over it
        bounds: {
            cycloid3d:  new Bounds(0,0,canvas.clientWidth/2,canvas.clientHeight/2),
            cycloid2d:  new Bounds(canvas.clientWidth/2,0,canvas.clientWidth,canvas.clientHeight/2),
            waveform2d: new Bounds(0,canvas.clientHeight/2,canvas.clientWidth,canvas.clientHeight),
        },
        // Declared outside, needs to access members
        regenBounds: NaN,
    }

    // Brute force redeclare all bounds. Might change to update rather than redeclare
    UIBounds.regenBounds = function(e) {
        UIBounds.bounds.cycloid3d.update(0,0,canvas.clientWidth/2,canvas.clientHeight/2);
        UIBounds.bounds.cycloid2d.update(canvas.clientWidth/2,0,canvas.clientWidth,canvas.clientHeight/2);
        UIBounds.bounds.waveform2d.update(0,canvas.clientHeight/2,canvas.clientWidth,canvas.clientHeight);
    }

    let vertices = [];
    let indices = [];
    generateFunc(10, .001, vertices, indices);

    const funcVAO = gl.createVertexArray();
    gl.bindVertexArray(funcVAO);

    const funcVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, funcVBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    
    const funcIBO = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, funcIBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    let cycloidVerts = [];
    let cycloidIndices = [];
    generateCycloid(10, 0.001, cycloidVerts, cycloidIndices);
    
    const cycloidVAO = gl.createVertexArray();
    gl.bindVertexArray(cycloidVAO);

    const cycloidVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cycloidVBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cycloidVerts), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    
    const cycloidIBO = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cycloidIBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cycloidIndices), gl.STATIC_DRAW);

    
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    let test = new Uint8Array([
        255, 0, 0, 1, 0, 255, 0, 20, 0, 0, 255, 3,
        0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 3,
        0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 3,
    ]);


    gl.pixelStorei(gl.PACK_ALIGNMENT, 4);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    state.reloadFrequencies();

    let mouseScrollCallback = function(e) {
        if (state.width == 1 && e.deltaY < 1)
            return;
            
        switch (state.highlighted) {
            case UIState.CYCLOID3D:
                if (state.cycloid3dWidth == 1 && e.deltaY < 1) {
                    console.log("TEST")
                    return;
                }
                state.cycloid3dWidth += e.deltaY / 100;
                state.cycloid3dHeight = state.cycloid3dWidth / state.aspectRatio;
                break;
            case UIState.CYCLOID2D:
                if (state.cycloid2dWidth == 1 && e.deltaY < 1)
                    return;
                state.cycloid2dWidth += e.deltaY / 100;
                state.cycloid2dHeight = state.cycloid2dWidth / state.aspectRatio;
                break;
            case UIState.WAVEFORM2D:
                if (state.waveform2dWidth == 1 && e.deltaY < 1)
                    return;
                state.waveform2dWidth += e.deltaY / 100;
                state.waveform2dHeight = state.waveform2dWidth / state.aspectRatio;
            default:
                break;
        }
        
        if (state.highlighted != null)
        {
            state.width += e.deltaY / 100;
            state.height = state.width / state.aspectRatio;
        }
    }

    let resizeCallback = function(e) {
        twgl.resizeCanvasToDisplaySize(gl.canvas, window.devicePixelRatio);
        state.aspectRatio = canvas.clientWidth / canvas.clientHeight;
        state.height = state.width / state.aspectRatio;

        state.cycloid3dHeight = state.cycloid3dWidth / state.aspectRatio;
        state.cycloid2dHeight = state.cycloid2dWidth / state.aspectRatio;
        state.waveform2dHeight = state.waveform2dWidth / state.aspectRatio;
        
        UIBounds.regenBounds();
    }

    let mouseDownCallback = function(e) {
        let pos = {x: e.clientX, y: e.clientY};
        for (var bound in UIBounds.bounds)
        {
            let item = document.getElementById(bound);
            if (UIBounds.bounds[bound].within(pos.x, pos.y))
            {
                if (state.highlighted == bound) 
                {
                    item.style.color = "white";
                    state.highlighted = undefined;
                }
                else 
                {
                    item.style.color = "grey";
                    state.highlighted = bound;
                }
                console.log(bound);
                continue;
            }
            item.style.color = "white";
        }
    }

    canvas.addEventListener("wheel", mouseScrollCallback, false);
    canvas.addEventListener("mousedown", mouseDownCallback, false);
    window.addEventListener("resize", resizeCallback, false);

    twgljs.resizeCanvasToDisplaySize(gl.canvas, window.devicePixelRatio);
        
    var stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild(stats.dom);

    // ==
    // GL
    // ==

    let animate = function(time)
    {
        stats.begin();
        globalTime = time / 1000;
        globalTime *= state.timeFactor;
            

        gl.enable(gl.DEPTH_TEST);
        //gl.enable(gl.FRAMEBUFFER_SRGB);
        //gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        
        gl.clearColor(0,0,0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(shaderProg);
        
        gl.uniform1f(gl.getUniformLocation(shaderProg, "time"), globalTime);
        gl.uniform1i(gl.getUniformLocation(shaderProg, "freqWidth"), state.encodedFreqs.length / 4);
        gl.uniform1i(gl.getUniformLocation(shaderProg, "freqHeight"), 1);
        gl.uniform1f(gl.getUniformLocation(shaderProg, "sineAmplitude"), state.sineAmplitude);
        gl.uniform1f(gl.getUniformLocation(shaderProg, "cycloidAmplitude"), state.cycloidAmplitude);
        gl.uniform1f(gl.getUniformLocation(shaderProg, "velocity"), state.velocity);
        gl.uniform4fv(gl.getUniformLocation(shaderProg, "color"), state.reshapeColor());
        

        gl.viewport(0, gl.canvas.height / 2, gl.canvas.width / 2, gl.canvas.height / 2);
        gl.bindVertexArray(cycloidVAO);
        
        // Cycloid 3D
        camera.pos = vec3.fromValues(1.0,1.0,1.0);
        mat4.lookAt(camera.view, camera.pos, camera.dir, camera.up);
        mat4.ortho(scene.projection, -state.cycloid3dWidth/1.25, state.cycloid3dWidth/1.25, -state.cycloid3dHeight/1.25, state.cycloid3dHeight/1.25, -100.0, 100.0);
        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProg, "projection"), false, scene.projection);
        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProg, "view"), false, camera.view);
        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProg, "model"), false, scene.model);
        gl.uniform1i(gl.getUniformLocation(shaderProg, "renderSine"), 0);
        gl.drawElements(gl.LINES, cycloidIndices.length, gl.UNSIGNED_SHORT, 0);
        
        // Cycloid 2D
        camera.pos = vec3.fromValues(0.0, 0.0, 1.0);
        mat4.lookAt(camera.view, camera.pos, camera.dir, camera.up);
        mat4.ortho(scene.projection, -state.cycloid2dWidth/1.25, state.cycloid2dWidth/1.25, -state.cycloid2dHeight/1.25, state.cycloid2dHeight/1.25, -100.0, 100.0);
        gl.viewport(gl.canvas.width / 2, gl.canvas.height / 2, gl.canvas.width / 2, gl.canvas.height / 2);
        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProg, "projection"), false, scene.projection);
        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProg, "view"), false, camera.view);
        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProg, "model"), false, scene.model);
        gl.drawElements(gl.LINES, cycloidIndices.length, gl.UNSIGNED_SHORT, 0);

        // Waveform 2D
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height / 2);
        gl.bindVertexArray(funcVAO);
        
        camera.pos = vec3.fromValues(0.0, 0.0, 1.0);
        mat4.lookAt(camera.view, camera.pos, camera.dir, camera.up);
        mat4.ortho(scene.projection, -state.waveform2dWidth/2, state.waveform2dWidth/2, -state.waveform2dHeight, state.waveform2dHeight, -100.0, 100.0);
        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProg, "projection"), false, scene.projection);
        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProg, "view"), false, camera.view);
        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProg, "model"), false, scene.model);
        gl.uniform1i(gl.getUniformLocation(shaderProg, "renderSine"), 1);

        gl.drawElements(gl.LINES, indices.length, gl.UNSIGNED_SHORT, 0);
        
        stats.end();
        window.requestAnimationFrame(animate);
    };

    animate(0);
    
    let gui = new dat.GUI();
    gui.add(state, "sineAmplitude", 0, 10).name("Sine Amplitude");
    gui.add(state, "cycloidAmplitude", 0, 10).name("Cycloid Amplitude");
    gui.add(state, "timeFactor", 0.001, 2).name("Time Factor");
    gui.add(state, "velocity", 0.001, 1000).name("Velocity");
    gui.addColor(state, "color");
    gui.add(state, "freqInput").name("Freq. Input");
    gui.add(state, "addFreq").name("Add Freq.");
    gui.add(state, "clearFreqs").name("Clear Freqs.");
    gui.add(state, "resetUI").name("Reset Zoom");
}

window.onload = test();