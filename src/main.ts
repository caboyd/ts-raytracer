import {SoftwareRenderer} from "./renderer/SoftwareRenderer";
import {WebglRenderer} from "./gpu_renderer/WebglRenderer";
import {Camera_Movement} from "./Camera";

let software_renderer: SoftwareRenderer;
let webgl_renderer: WebglRenderer;
export var is_mobile: boolean = false;

let min_frame_time = 7;
let last_time = 0;
let mouse_x_total = 0;
let mouse_y_total = 0;

let keys: Array<boolean> = [];
let moved: boolean = false;

const moveCallback = (e: MouseEvent): void => {
    //@ts-ignore
    let movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
    //@ts-ignore
    let movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
    if (e.which == 1) {
        mouse_x_total += movementX;
        mouse_y_total += movementY;
        moved = true;
    }
};


let last_x = 0, last_y = 0;
let touch_foward = false;
const touchCallback = (e: TouchEvent): void => {
    touch_foward = e.touches.length >= 2;

    
    //@ts-ignore
    let movementX = e.changedTouches[0].clientX || 0;
    //@ts-ignore
    let movementY = e.changedTouches[0].clientY || 0;

    if (movementX > last_x)
        mouse_x_total += movementX / 100;
    else if (movementX < last_x)
        mouse_x_total -= movementX / 100;
    last_x = movementX;

    if (movementY > last_y)
        mouse_y_total += movementY / 100;
    else if (movementY < last_y)
        mouse_y_total -= movementY / 100;
    last_y = movementY;

    moved = true;

};


(async function loadWebGL() {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        is_mobile = true;
        min_frame_time = 33;
    }

    let canvas_webgl2 = <HTMLCanvasElement>document.getElementById("canvas-webgl2");
    document.addEventListener("mousemove", moveCallback, false);
    document.addEventListener("touchmove", touchCallback, false);
    // let canvas = <HTMLCanvasElement>document.getElementById("canvas");
    // software_renderer = new SoftwareRenderer(canvas);
    webgl_renderer = new WebglRenderer(canvas_webgl2);
    await webgl_renderer.initImGui();
    last_time = Date.now();


    let desc = document.getElementById("desc");
    desc.innerText = "" + canvas_webgl2.width + "x" + canvas_webgl2.height + " " + webgl_renderer.super_sampling + "x Super Sampling";

    drawScene();
    //  drawCanvas();
})();

function drawScene() {
    let now = Date.now();
    let dt = (now - last_time);

    if (dt > min_frame_time) {
        update(dt / 1000);
        requestAnimationFrame(drawWebgl);
        last_time = now;

    }
    else
        setTimeout(drawScene, min_frame_time - (now - last_time))

}

function drawWebgl() {
    webgl_renderer.draw();

    document.getElementById("webgl-text").textContent = "" + webgl_renderer.getSampleCount();

    drawScene();
}

function update(dt: number) {
    let camera = webgl_renderer.camera;
    if (keys[87] || touch_foward) {
        moved = true;
        camera.processKeyboard(Camera_Movement.FORWARD, dt);
    }
    else if (keys[83]) {
        moved = true;
        camera.processKeyboard(Camera_Movement.BACKWARD, dt);
    }
    if (keys[65]) {
        moved = true;
        camera.processKeyboard(Camera_Movement.LEFT, dt);
    }
    else if (keys[68]) {
        moved = true;
        camera.processKeyboard(Camera_Movement.RIGHT, dt);
    }
    if (keys[82]) {
        moved = true;
        webgl_renderer.resetCamera();
    }
    if (keys[32]) {
        moved = true;
        camera.processKeyboard(Camera_Movement.UP, dt);
    }

    camera.processMouseMovement(-mouse_x_total, -mouse_y_total, true);
    mouse_x_total = 0;
    mouse_y_total = 0;

    if (moved)
        webgl_renderer.resetSamples();
    
    touch_foward = false
    moved = false;
}

function drawCanvas() {
    let now = Date.now();
    software_renderer.draw();
    document.getElementById("canvas-text").textContent = " " + (Date.now() - now).toFixed(2) + " ms";
}

window.onkeydown = function (e) {
    keys[e.keyCode] = true;
};

window.onkeyup = function (e) {
    keys[e.keyCode] = false;
};
