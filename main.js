// note that the z-axis will be the up and down direction

let pyodide; // declaration

let motionStarted = false; // so animation doesn't start without everything being loaded

let x1, y1, z1; // declaring variables
let x2, y2, z2;

let infiniteTrail = false;
let smoothAudio = 1;

let audioCtx;   
let osc;
let osc2;

let filter;
let gainNode;

let audioMuted = false;

let speed = parseFloat(document.getElementById("speed").value);
const trailLength = 150;

async function initPyodide() { // loads pyodide, console message so I know
    pyodide = await loadPyodide();

    await pyodide.loadPackage("numpy");

    const physicsCode = await (await fetch("physics.py")).text();
    await pyodide.runPythonAsync(physicsCode);

    console.log("Physics loaded!");
}

document.getElementById("startBtn").disabled = true;

initPyodide().then(() => {
    document.getElementById("startBtn").disabled = false;
    animate();
}); // calls animate function

let vx1, vy1, vz1;
let vx2, vy2, vz2; // setting velocities for each bob

let dt = 0.005; // time step 

function anglesToCartesian(theta1,phi1,l1,theta2,phi2,l2){

    const x1 = l1 * Math.sin(theta1) * Math.cos(phi1)
    const y1 = l1 * Math.sin(theta1) * Math.sin(phi1)
    const z1 = -l1 * Math.cos(theta1)

    const x2 = l2 * Math.sin(theta2) * Math.cos(phi2)
    const y2 = l2 * Math.sin(theta2) * Math.sin(phi2)
    const z2 = -l2 * Math.cos(theta2)

    return [[x1, y1, z1],[x2,y2,z2]]

} // converts azimuth and theta angles received from user input (sliders) to coords that r used

function getInputs(){

    const theta1 = parseFloat(document.getElementById("theta1").value);
    const phi1   = parseFloat(document.getElementById("phi1").value);

    const theta2 = parseFloat(document.getElementById("theta2").value);
    const phi2   = parseFloat(document.getElementById("phi2").value);

    const l1 = parseFloat(document.getElementById("l1").value);
    const l2 = parseFloat(document.getElementById("l2").value);

    const g  = parseFloat(document.getElementById("gravity").value);

    return {theta1, phi1, theta2, phi2, l1, l2, g}
} // function that grabs the user inputted values

function updateTrail(pointsArray, x, y, z, trailGeo) {
    pointsArray.push(new THREE.Vector3(x, y, z));

    if (!infiniteTrail){ // if infinite trail is off then remove previous trail positions
     while (pointsArray.length > trailLength) {
        pointsArray.shift(); // remove oldest point
    }}

    trailGeo.setFromPoints(pointsArray);
} // function for updating trail every frame

const scene = new THREE.Scene() // scene where i add stuff
scene.background = new THREE.Color(0x000000) // black background

const camera = new THREE.PerspectiveCamera(
    40, window.innerWidth / window.innerHeight, 0.1, 1000
) // camera FOV and other settings

// camera positioning
camera.position.set(0, 2, 8);
camera.up.set(0, 0, 1);
camera.lookAt(0,0,0);

// rendering on canvas
const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById("sim"),
    antialias: true
});

// OrbitControls for camera control

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;   // smooth camera movement
controls.dampingFactor = 0.1;
controls.rotateSpeed = 0.5;

controls.zoomSpeed = 1.0;
controls.panSpeed = 0.8;

// bob 1

const bob1G = new THREE.SphereGeometry(0.2,32,32);
const bob1M = new THREE.MeshStandardMaterial({color: 0xff0000});
const bob1 = new THREE.Mesh(bob1G, bob1M);
scene.add(bob1);

// bob 2 

const bob2G = new THREE.SphereGeometry(0.2,32,32);
const bob2M = new THREE.MeshStandardMaterial({color: 0xff0000});
const bob2 = new THREE.Mesh(bob2G,bob2M);
scene.add(bob2);

// trail buffers
let trailPoints1 = [];
let trailPoints2 = [];

// trail configurations and adding to scene
const trailGeo1 = new THREE.BufferGeometry();
const trailGeo2 = new THREE.BufferGeometry();

const trailMat1 = new THREE.LineBasicMaterial({
    color: 0x00aaff,
    transparent: true,
    opacity: 0.7
});

const trailMat2 = new THREE.LineBasicMaterial({
    color: 0xaa00ff,
    transparent: true,
    opacity: 0.7
});

const trailLine1 = new THREE.Line(trailGeo1, trailMat1);
const trailLine2 = new THREE.Line(trailGeo2, trailMat2);

scene.add(trailLine1);
scene.add(trailLine2);

// rod 1 settings

const rod1Material = new THREE.LineBasicMaterial({ color: 0xffffff });
const rod1Geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0)
]);
const rod1 = new THREE.Line(rod1Geometry, rod1Material);
scene.add(rod1);

// rod 2 settings

const rod2M = new THREE.LineBasicMaterial({ color: 0xffffff });
const rod2G = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0)
]);
const rod2 = new THREE.Line(rod2G, rod2M);
scene.add(rod2);

// lighting so object aren't pitch black

const light = new THREE.PointLight(0xffffff, 1.2);
light.position.set(5, 10, 7);
light.castShadow = true;
scene.add(light);

const ambient = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambient);

// so the quality is much better

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.antialias = true;

// checks if start motion button has been clicked and when clicked, calls the startMotion function

document.getElementById("startBtn").addEventListener("click", () => {

if (!audioCtx){

audioCtx = new AudioContext(); // create audio engine, where all sound lives
osc = audioCtx.createOscillator();
osc2 = audioCtx.createOscillator();

filter = audioCtx.createBiquadFilter();
filter.type = "lowpass"; // lowpass filter removing high freq.


gainNode = audioCtx.createGain(); // controls volume of noise

osc.type = "triangle";
osc.frequency.value = 92;

osc2.type = "triangle";
osc2.frequency.value = 90;

osc.connect(filter);
osc2.connect(filter);

filter.connect(gainNode);
gainNode.connect(audioCtx.destination);
// collects all nodes for audio pipelin, noise -> filter -> gain -> speakers
// its like you passing through layers of airport security at the airport before you leave
// this changes the noise before it is played, according to the pendulums current states

};
audioCtx.resume().then(() => {
        osc.start();
        osc2.start();
        startMotion();
});
});

// mute button

document.getElementById("muteBtn").addEventListener("click", () => {
    audioMuted = !audioMuted;

    const btn = document.getElementById("muteBtn");
    btn.textContent = audioMuted ? "Mute: ON" : "Mute: OFF";
});


// checks if trail button has been clicked, and when clicked, changes text and reverses boolean

document.getElementById("trailBtn").addEventListener("click", () => {
        infiniteTrail = !infiniteTrail;

        const btn = document.getElementById("trailBtn");
        btn.textContent = infiniteTrail ? "Infinite Trail: ON" : "Infinite Trail: OFF";
    });

function startMotion() {
    const {theta1, phi1, theta2, phi2, l1, l2, g} = getInputs();

    // compute initial positions from angles
    [[x1,y1,z1],[x2,y2,z2]] = anglesToCartesian(theta1, phi1, l1, theta2, phi2, l2);

    // set initial velocities (changeable)
    vx1 = 1; vy1 = 3; vz1 = 1;
    vx2 = 1; vy2 = 3; vz2 = 1;

    // send initial state to Python
    pyodide.globals.set("x1", x1);
    pyodide.globals.set("y1", y1);
    pyodide.globals.set("z1", z1);

    pyodide.globals.set("x2", x2);
    pyodide.globals.set("y2", y2);
    pyodide.globals.set("z2", z2);

    pyodide.globals.set("vx1", vx1);
    pyodide.globals.set("vy1", vy1);
    pyodide.globals.set("vz1", vz1);

    pyodide.globals.set("vx2", vx2);
    pyodide.globals.set("vy2", vy2);
    pyodide.globals.set("vz2", vz2);

    pyodide.globals.set("l1", l1);
    pyodide.globals.set("l2", l2);
    pyodide.globals.set("g", g);
    pyodide.globals.set("dt", dt);

    // one condition for starting animation is satisfied
    motionStarted = true;
}

function animate(){

    requestAnimationFrame(animate);

    if (!audioCtx) return;

    if (audioCtx.state === "suspended") {
    audioCtx.resume();};

    if (!pyodide || !motionStarted) return; // if start motion button hasn't been clicked or pyodide
    // hasn't loaded, do not animate

    const {theta1, phi1, theta2, phi2, l1, l2, g} = getInputs(); // get user inputted values

    speed = parseFloat(document.getElementById("speed").value);

    for (let i = 0; i < speed; i++){

    const result = pyodide.runPython(
        `calc(x1,x2,y1,y2,z1,z2,vx1,vx2,vy1,vy2,vz1,vz2,l1,l2,g,dt)`
    ); // get new coordinates and velocities by calling this, python backend

    const [
        newX1, newY1, newZ1,
        newX2, newY2, newZ2,
        newVX1, newVY1, newVZ1,
        newVX2, newVY2, newVZ2
    ] = result; // stores values that are returned by python backend

    x1 = newX1; y1 = newY1; z1 = newZ1;
    x2 = newX2; y2 = newY2; z2 = newZ2; // sets coords to new ones received

    vx1 = newVX1; vy1 = newVY1; vz1 = newVZ1;
    vx2 = newVX2; vy2 = newVY2; vz2 = newVZ2; // sets velocities to new ones received

    // sets them as global pyodide variables too, not just js variables

    pyodide.globals.set("x1", x1);
    pyodide.globals.set("y1", y1);
    pyodide.globals.set("z1", z1);

    pyodide.globals.set("x2", x2);
    pyodide.globals.set("y2", y2);
    pyodide.globals.set("z2", z2);

    pyodide.globals.set("vx1", vx1);
    pyodide.globals.set("vy1", vy1);
    pyodide.globals.set("vz1", vz1);

    pyodide.globals.set("vx2", vx2);
    pyodide.globals.set("vy2", vy2);
    pyodide.globals.set("vz2", vz2);

    pyodide.globals.set("l1", l1);
    pyodide.globals.set("l2", l2);
    pyodide.globals.set("g", g);
    pyodide.globals.set("dt", dt);

    let gFactor = g/9.81;
    gFactor = Math.min(1.5, gFactor);   // lower cap so high g doesn't blow up audio

    let sFactor = speed/5;
    sFactor = Math.min(2,sFactor);      // lower cap so high speed doesn't blow up audio

    let motion1 = Math.abs(vx1) + Math.abs(vy1) + Math.abs(vz1);
    let motion2 = Math.abs(vx2) + Math.abs(vy2) + Math.abs(vz2);

    let motion = (motion1 + motion2)/2; // mean
    motion = Math.min(1, motion/15);    // stronger compression

    audioDrive = motion * gFactor * sFactor * 1.2;   // reduced multiplier

    // smoothing audio, preventing spikes, called exponential smoothing
    // creates stable version of fast changing signal

    // old values matter less every time: e.g. 0.85, 0.85^2, etc.
    // exponential decay
    // like an iterative formula

    smoothAudio = 0.97 * smoothAudio + 0.03 * audioDrive;
    smoothAudio = Math.min(1.2, smoothAudio);   // hard clamp to stop runaway highs

    if (audioMuted){
        gainNode.gain.value = 0
    } else{
        gainNode.gain.value = 0.22 + 0.18 * smoothAudio; 
    };

    let cutoff = 120 + 30 * smoothAudio;   // softer filter movement
    filter.frequency.value = cutoff; 

    osc.frequency.value = 55 + 0.8 * smoothAudio; 
    osc2.frequency.value = 57 + 0.8 * smoothAudio;

    bob1.position.set(x1,y1,z1); // sets new positions of bobs

    bob2.position.set(x2,y2,z2);

    rod1.geometry.setFromPoints([
        new THREE.Vector3(0,0,0),
        new THREE.Vector3(x1,y1,z1)
    ]);

    rod2.geometry.setFromPoints([
        new THREE.Vector3(x1,y1,z1),
        new THREE.Vector3(x2,y2,z2)
    ]); // new rod positions are set

    controls.update(); // camera controls are updated
    renderer.render(scene,camera); // render new frame
    updateTrail(trailPoints1, x1, y1, z1, trailGeo1); // updates trails so old ones go away, new ones 
    updateTrail(trailPoints2, x2, y2, z2, trailGeo2); // that follow motion are animated
}
}

