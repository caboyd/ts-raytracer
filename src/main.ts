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
        min_frame_time = 66;
    }
    
    let canvas_webgl2 = <HTMLCanvasElement>document.getElementById("canvas-webgl2");
   // let canvas = <HTMLCanvasElement>document.getElementById("canvas");
   // software_renderer = new SoftwareRenderer(canvas);
    webgl_renderer = new WebglRenderer(canvas_webgl2);
    last_time = Date.now();
  
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
    temp_count++;
    if(temp_count > webgl_renderer.num_quadrants){
        temp_count = 0;
        document.getElementById("webgl-text").textContent = "" + ++render_passes;
    }
    drawScene();
}

function drawCanvas(){
    let now = Date.now();
    software_renderer.draw();
    document.getElementById("canvas-text").textContent = " " + (Date.now() - now).toFixed(2) + " ms";
}

