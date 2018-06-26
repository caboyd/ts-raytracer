import {SoftwareRenderer} from "./renderer/SoftwareRenderer";
import {WebglRenderer} from "./gpu_renderer/WebglRenderer";

let software_renderer: SoftwareRenderer;
let webgl_renderer: WebglRenderer;

(function loadWebGL() {
    let canvas_webgl2 = <HTMLCanvasElement>document.getElementById("canvas-webgl2");
    let canvas = <HTMLCanvasElement>document.getElementById("canvas");
    software_renderer = new SoftwareRenderer(canvas);
    webgl_renderer = new WebglRenderer(canvas_webgl2);
    drawScene();
})();

function drawScene() {
    let now = performance.now();
    webgl_renderer.draw();
    document.getElementById("webgl-text").textContent = " " + (performance.now() - now) + " ms";
    now = performance.now();
    software_renderer.draw();
    document.getElementById("canvas-text").textContent = " " + (performance.now() - now) + " ms";
}
