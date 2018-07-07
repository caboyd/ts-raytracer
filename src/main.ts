import {SoftwareRenderer} from "./renderer/SoftwareRenderer";
import {WebglRenderer} from "./gpu_renderer/WebglRenderer";

let software_renderer: SoftwareRenderer;
let webgl_renderer: WebglRenderer;
export var is_mobile:boolean = false;


let min_frame_time = 33;
let last_time = 0;
let render_passes = 0;
let temp_count = 0;
let passes = 10000;

(function loadWebGL() {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        is_mobile = true;
        min_frame_time = 33;
    }
    
    let canvas_webgl2 = <HTMLCanvasElement>document.getElementById("canvas-webgl2");
   // let canvas = <HTMLCanvasElement>document.getElementById("canvas");
   // software_renderer = new SoftwareRenderer(canvas);
    webgl_renderer = new WebglRenderer(canvas_webgl2);
    last_time = Date.now();
  
    let desc = document.getElementById("desc");
    desc.innerText =  "" + canvas_webgl2.width + "x" + canvas_webgl2.height + " " + webgl_renderer.super_sampling + "x Super Sampling"; 
    
    drawScene();
  //  drawCanvas();
})();

function drawScene() {
    let now = Date.now();
    
    if(now - last_time  > min_frame_time){
        if(render_passes < passes){
            requestAnimationFrame(drawWebgl);
            last_time = now; 
        }
    }
    else
        setTimeout( drawScene, min_frame_time - (now - last_time))
    
}

function drawWebgl(){
    webgl_renderer.draw();

    document.getElementById("webgl-text").textContent = "" + webgl_renderer.getSampleCount();
  
    drawScene();
}

function drawCanvas(){
    let now = Date.now();
    software_renderer.draw();
    document.getElementById("canvas-text").textContent = " " + (Date.now() - now).toFixed(2) + " ms";
}

