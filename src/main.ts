import {SoftwareRenderer} from "./renderer/SoftwareRenderer";
import {WebglRenderer} from "./gpu_renderer/WebglRenderer";

let software_renderer: SoftwareRenderer;
let webgl_renderer: WebglRenderer;
export var is_mobile:boolean = false;


(function loadWebGL() {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        is_mobile = true;
    }

    
    let canvas_webgl2 = <HTMLCanvasElement>document.getElementById("canvas-webgl2");
    let canvas = <HTMLCanvasElement>document.getElementById("canvas");
    software_renderer = new SoftwareRenderer(canvas);
    webgl_renderer = new WebglRenderer(canvas_webgl2);
    drawScene();
})();

function drawScene() {
    drawWebgl();
    setTimeout(drawCanvas, 1);
}

function drawWebgl(){
    let now = performance.now();
    webgl_renderer.draw();
    document.getElementById("webgl-text").textContent = " " + (performance.now() - now).toFixed(2) + " ms";
}

function drawCanvas(){
    let now = performance.now();
    software_renderer.draw();
    document.getElementById("canvas-text").textContent = " " + (performance.now() - now).toFixed(2) + " ms";
}

