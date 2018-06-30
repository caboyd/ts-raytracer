import {Shader} from "./shader";
import {vec3} from "gl-matrix";
import {MatType} from "./Material";
import {is_mobile} from "../main";
import {Camera} from "../Camera";
import gen from "../renderer/SoftwareRenderer";

export class WebglRenderer {
    gl: WebGL2RenderingContext;
    shader: Shader;
    private quad_shader:Shader;
    
    VAO: WebGLVertexArrayObject;
    vertex_buffer: WebGLBuffer;
    frame_buffer0: WebGLFramebuffer;
    frame_buffer1: WebGLFramebuffer;
    
    texture0: WebGLTexture;
    texture1:WebGLTexture;
    
    current_texture = 0;
    sample_count = 0;

    constructor(canvas: HTMLCanvasElement) {
        this.initGL(canvas);
        this.initRenderTexture();
        this.initShader();
        
        let aperture = 0.015;
        let eye = vec3.fromValues(10,1.9,2.5);
        let target = vec3.fromValues(4,0.5,1);
        let up = vec3.fromValues(0,1,0);
        let dist_to_focus = vec3.distance(eye,target);
        
        this.bigSphereScene();
        this.setCamera(eye,target,up, 30, this.gl.drawingBufferWidth/this.gl.drawingBufferHeight, aperture,dist_to_focus);
        this.initBuffers();
    }

    public draw(): void {
        let gl = this.gl;
        
        //RENDER TO TEXTURE
        if(this.current_texture == 0)
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.frame_buffer0);
        else
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.frame_buffer1);
        
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        this.shader.use();
        this.shader.setIntByName("sample_count", this.sample_count);
        this.shader.setFloatByName("rand_seed0", gen.nextFloat() );
        this.shader.setFloatByName("rand_seed1", gen.nextFloat() );
        
        //Wiggle for anti-aliasing
        this.wiggleCamera();
        
        gl.bindVertexArray(this.VAO);
        gl.activeTexture(gl.TEXTURE0);
        if(this.current_texture == 0)
            gl.bindTexture(gl.TEXTURE_2D, this.texture1);
        else
            gl.bindTexture(gl.TEXTURE_2D, this.texture0);
        this.shader.setIntByName("last_frame", 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindVertexArray(null);

        //RENDER TO SCREEN
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        this.quad_shader.use();
        gl.bindVertexArray(this.VAO);
        gl.activeTexture(gl.TEXTURE0);
        if(this.current_texture == 0)
            gl.bindTexture(gl.TEXTURE_2D, this.texture0);
        else
            gl.bindTexture(gl.TEXTURE_2D, this.texture1);
        this.quad_shader.setIntByName("texture1", 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindVertexArray(null);
    
        this.sample_count++;
        
        this.current_texture++;
        if(this.current_texture > 1)this.current_texture = 0;
    }

    private initGL(canvas: HTMLCanvasElement) {
        try {
            this.gl = <WebGL2RenderingContext>canvas.getContext("webgl2");
        } catch (e) {
            throw "GL init error:\n" + e;
        }
        if (!this.gl) {
            alert("WebGL2 is not available on your browser.");
        }

        this.gl.clearColor(0.2, 0.3, 0.3, 1.0);
        this.gl.disable(this.gl.DEPTH_TEST);
    }

    private initShader() {
        let gl = this.gl;
        
        const frag: string = require("gpu_renderer/shaders/basic.frag");
        const vert: string = require("gpu_renderer/shaders/basic.vert");
        this.shader = new Shader(this.gl, vert, frag);
        this.quad_shader = new Shader(gl, require("gpu_renderer/shaders/quad.vert"), require("gpu_renderer/shaders/quad.frag"));

        this.shader.setAttributes(["a_vertex"]);

        let uniforms = new Map();
        uniforms.set("width", this.gl.drawingBufferWidth);
        uniforms.set("height", this.gl.drawingBufferHeight);

        this.shader.setIntByName("max_ray_bounce", is_mobile ? 8 : 12);
        // this.addSpheres(uniforms);

        uniforms.set("ambient_light", vec3.fromValues(0.5, 0.7, 1.0));

        this.shader.setUniforms(uniforms);
    }
    
    private initRenderTexture():void{
        let gl = this.gl;
        
        //Set up a frame buffer 
        this.frame_buffer0 = gl.createFramebuffer();

        // The framebuffer, which regroups 0, 1, or more textures, and 0 or 1 depth buffer.
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frame_buffer0);

        // The texture we're going to render to
        this.texture0 = gl.createTexture();
  

        // "Bind" the newly created texture : all future texture functions will modify this texture
        gl.bindTexture(gl.TEXTURE_2D, this.texture0);

        // Give an empty image to OpenGL ( the last "0" )
        // prettier-ignore
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA, gl.drawingBufferWidth,
            gl.drawingBufferHeight,0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

        //Set "renderedTexture" as our color attachment #0
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture0, 0);

        //Completed
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE)
            throw "frame buffer error";

        
        //Set up a frame buffer 
        this.frame_buffer1 = gl.createFramebuffer();

        // The framebuffer, which regroups 0, 1, or more textures, and 0 or 1 depth buffer.
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frame_buffer1);

        this.texture1 = gl.createTexture();
        // "Bind" the newly created texture : all future texture functions will modify this texture
        gl.bindTexture(gl.TEXTURE_2D, this.texture1);

        // Give an empty image to OpenGL ( the last "0" )
        // prettier-ignore
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA, gl.drawingBufferWidth,
            gl.drawingBufferHeight,0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

        //Set "renderedTexture" as our color attachment #0
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture1, 0);

        //Completed
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE)
            throw "frame buffer error";
        
    }

    private bigSphereScene(): void {
        this.shader.use();
        let gl = this.gl;
        //RGBA32F
        let sphere_tex = gl.createTexture();
        //RGBA8I
        let mat_tex = gl.createTexture();
        //R32F
        let mat_tex2 = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, sphere_tex);
        
        let sphere_array = [];
        let mat_array = [];
        let mat_array2 = [];
        
        sphere_array.push(0,-1000,0,1000);
        mat_array.push(0.5 *255, 0.5 *255, 0.5 * 255,255);
        mat_array2.push(MatType.Diffuse, 0,0,0);

        sphere_array.push(0,1,0,1);
        mat_array.push(0,255,0,0);
        mat_array2.push(MatType.Refract, 1.5,0,0);
        
        if(!is_mobile){
            sphere_array.push(0,1,0,-0.95);
            mat_array.push(0,0,0,0);
            mat_array2.push(MatType.Refract, 1.5,0,0);
        }
        
        sphere_array.push(-4, 1, 0, 1);
        mat_array.push(0.4*255, 0.2*255, 0.1*255, 0);
        mat_array2.push(MatType.Diffuse, 0,0,0);
        
        sphere_array.push(4,1,0,1);
        mat_array.push(0.7*255,0.6*255,0.5*255,0);
        mat_array2.push(MatType.Reflect, 0,0,0);

        
        let k = is_mobile ? 6: 11;

        for(let a = -k; a < k;a++){
            for(let b = -k; b <k; b++){
                let choose_mat = gen.nextFloat();
                let center = vec3.fromValues(a + 0.9 * gen.nextFloat(), 0.2, b + 0.9*gen.nextFloat());
                if(vec3.distance(center,vec3.fromValues(4,0.2,0)) > 0.9){
                    if(choose_mat < 0.50){
                        sphere_array.push(center[0],center[1],center[2],0.2);
                        mat_array.push(gen.nextFloat()*255,gen.nextFloat()*255,gen.nextFloat()*255,0);
                        mat_array2.push(MatType.Diffuse, 0,0,0);
                    }else if( choose_mat < 0.75){
                        sphere_array.push(center[0],center[1],center[2],0.2);
                        mat_array.push(0.5*(1+gen.nextFloat())*255,0.5*(1+gen.nextFloat())*255,0.5*(1+gen.nextFloat())*255,0);
                        mat_array2.push(MatType.Reflect, 0.5*gen.nextFloat(),0,0);
                    }else if ( choose_mat < 0.95){
                        sphere_array.push(center[0],center[1],center[2],0.2);
                        mat_array.push(0,0,0,0);
                        mat_array2.push(MatType.Refract, 1.5,0,0);
                    }else{
                        sphere_array.push(center[0],center[1],center[2],0.2);
                        mat_array.push(0,0,0,0);
                        mat_array2.push(MatType.Refract, 1.5,0,0);
                        if(!is_mobile){
                            sphere_array.push(center[0],center[1],center[2],-0.18);
                            mat_array.push(0,0,0,0);
                            mat_array2.push(MatType.Refract, 1.5,0,0);
                        }

                    }

                }
            }
        }

        
        let width = sphere_array.length/4;
        let num_spheres = width;
        
        //We must round up the texture to the nearest multiple of 2 or it will not read properly
        width = Math.pow(2, Math.ceil(Math.log(width)/Math.log(2)));
        
        for(let i = num_spheres; i <= width; i++){
            sphere_array.push(0, 0, 0, 0);
            mat_array.push(0,0,0, 0);
            mat_array2.push(0, 0,0,0);
        }
        
        let height = 1;

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, sphere_tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width,height, 0, gl.RGBA, gl.FLOAT, new Float32Array(sphere_array));
        this.shader.setIntByName("sphere_texture", 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, mat_tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width,height, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(mat_array));
        this.shader.setIntByName("mat_texture", 2);
        
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, mat_tex2);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width,height, 0, gl.RGBA, gl.FLOAT, new Float32Array(mat_array2));
        this.shader.setIntByName("mat_texture_extra", 3);
        
        this.shader.setIntByName("sphere_count", num_spheres);
        this.shader.setFloatByName("sphere_texture_size", width);
    }

    private setCamera(eye:vec3, target:vec3, up:vec3, vFov:number, aspect:number, aperture:number, focus_dist:number):void{
        let cam = new Camera(eye,target,up,vFov,aspect, aperture,focus_dist);
        
        this.shader.use();
        this.shader.setVec3ByName("screen.lower_left_corner", cam.lower_left_corner);
        this.shader.setVec3ByName("screen.horizontal", cam.screen_horizontal);
        this.shader.setVec3ByName("screen.vertical", cam.screen_vertical);
        this.shader.setVec3ByName("screen.position", cam.position);
        this.shader.setFloatByName("screen.lens_radius", cam.lens_radius);
        this.shader.setFloatByName("screen.x_wiggle", gen.nextFloat()/this.gl.drawingBufferWidth);
        this.shader.setFloatByName("screen.y_wiggle", gen.nextFloat()/this.gl.drawingBufferHeight);
        
    }
    
    private wiggleCamera():void{
        this.shader.setFloatByName("screen.x_wiggle", gen.nextFloat()/this.gl.drawingBufferWidth);
        this.shader.setFloatByName("screen.y_wiggle", gen.nextFloat()/this.gl.drawingBufferHeight);
    }
    
    private initBuffers() {
        let gl = this.gl;
        this.vertex_buffer = gl.createBuffer();
        this.VAO = gl.createVertexArray();

        //prettier-ignore
        let vertices = [
            -1.0, -1.0, 0.0,
            1.0, -1.0, 0.0,
            -1.0,  1.0, 0.0,
            -1.0,  1.0, 0.0,
            1.0, -1.0, 0.0,
            1.0,  1.0, 0.0
        ];

        gl.bindVertexArray(this.VAO);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        gl.enableVertexAttribArray(this.shader.getAttribLocation("a_vertex"));
        gl.vertexAttribPointer(this.shader.getAttribLocation("a_vertex"), 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
    }
}


