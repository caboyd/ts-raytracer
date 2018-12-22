import {SoftwareRenderer} from "./renderer/SoftwareRenderer";
import {WebglRenderer} from "./gpu_renderer/WebglRenderer";
import {Camera_Movement} from "./Camera";
import {Global} from "./globals";

let software_renderer: SoftwareRenderer;
let webgl_renderer: WebglRenderer;

let last_time = 0;
let mouse_x_total = 0;
let mouse_y_total = 0;

let keys: Array<boolean> = [];
let moved = false;

let canvas_webgl2: HTMLCanvasElement;

(async function loadWebGL() {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        Global.is_mobile = true;
        Global.max_fps = 30;
    }

    canvas_webgl2 = <HTMLCanvasElement>document.getElementById("canvas-webgl2");
    // let canvas = <HTMLCanvasElement>document.getElementById("canvas");
    // software_renderer = new SoftwareRenderer(canvas);
    webgl_renderer = new WebglRenderer(canvas_webgl2);

    await webgl_renderer.initImGui();

    last_time = Date.now();


    drawScene();
    //  drawCanvas();
})();

function drawScene() {
    let now = Date.now();
    let dt = (now - last_time);

    if (dt > 1000 / Global.max_fps) {
        update(dt / 1000);
        requestAnimationFrame(drawWebgl);
        last_time = now;
        Global.fps = 1000 / dt;
    }
    else
        setTimeout(drawScene, (1000 / Global.max_fps) - (now - last_time))

}

function drawWebgl() {
    webgl_renderer.draw();
    drawScene();
}

function update(dt: number) {
    let camera = webgl_renderer.camera;
    if (keys[87]) {
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

    if (moved)
        webgl_renderer.resetSamples();

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

(function () {
    let script = document.createElement('script');
    script.onload = function () {
        //@ts-ignore
        let stats = new Stats();
        document.body.appendChild(stats.dom);
        requestAnimationFrame(function loop() {
            stats.update();
            requestAnimationFrame(loop)
        });
    };
    script.src = '//mrdoob.github.io/stats.js/build/stats.min.js';
    document.head.appendChild(script);
})()