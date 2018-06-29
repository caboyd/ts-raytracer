import {SoftwareRenderer} from "./renderer/SoftwareRenderer";
import {WebglRenderer} from "./gpu_renderer/WebglRenderer";

let software_renderer: SoftwareRenderer;
let webgl_renderer: WebglRenderer;
export var is_mobile:boolean = false;


let min_frame_time = 1000;
let last_time = 0;
let draw = 0;
let count = 0;

(function loadWebGL() {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        is_mobile = true;
    }

    
    let canvas_webgl2 = <HTMLCanvasElement>document.getElementById("canvas-webgl2");
    let canvas = <HTMLCanvasElement>document.getElementById("canvas");
    software_renderer = new SoftwareRenderer(canvas);
    webgl_renderer = new WebglRenderer(canvas_webgl2);
    last_time = Date.now();
  
    drawScene();
    drawCanvas();
})();

function drawScene() {
    let now = Date.now();
    
    if(now - last_time  > min_frame_time){
        if(count <= 20){
            requestAnimationFrame(drawWebgl);
            last_time = now; 
            count++;
        }
       
    }
    else
        setTimeout( drawScene, min_frame_time - (now - last_time))
    
}

function drawWebgl(){
    let now = Date.now();
    webgl_renderer.draw();
    document.getElementById("webgl-text").textContent = "" + draw++;

    drawScene();
}

function drawCanvas(){
    let now = Date.now();
    software_renderer.draw();
    document.getElementById("canvas-text").textContent = " " + (Date.now() - now).toFixed(2) + " ms";
}

