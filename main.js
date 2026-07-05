let pyodide; // declaration

let motionStarted = false; // so animation doesn't start without everything being loaded

let x1, y1, z1; // declarins variables
let x2, y2, z2;

async function initPyodide() { // loads pyodide, console message so I know
    pyodide = await loadPyodide();

    await pyodide.loadPackage("numpy");

    const physicsCode = await (await fetch("physics.py")).text();
    await pyodide.runPythonAsync(physicsCode);

    console.log("Physics loaded!");

}

initPyodide();
animate(); // calls animate function

let vx1 = 0, vy1 = 3, vz1 = 0;
let vx2 = 0, vy2 = 3, vz2 = 0; // setting velocities for each bob

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

    if (pointsArray.length > trailLength) {
        pointsArray.shift(); // remove oldest point
    }

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
const trailLength = 150;   // number of segments
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

document.getElementById("startBtn").addEventListener("click", startMotion);

function startMotion() {
    const {theta1, phi1, theta2, phi2, l1, l2, g} = getInputs();

    // compute initial positions from angles
    [[x1,y1,z1],[x2,y2,z2]] = anglesToCartesian(theta1, phi1, l1, theta2, phi2, l2);

    // set initial velocities (changeable)
    vx1 = 0; vy1 = 3; vz1 = 0;
    vx2 = 0; vy2 = 3; vz2 = 0;

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

    if (!pyodide || !motionStarted) return; // if start motion button hasn't been clicked or pyodide
    // hasn't loaded, do not animate

    const {theta1, phi1, theta2, phi2, l1, l2, g} = getInputs(); // get user inputted values

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

