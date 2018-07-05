import {Shader} from "./shader";
import {vec3} from "gl-matrix";
import {MatType} from "./Material";
import {is_mobile} from "../main";
import {Camera} from "../Camera";

const random = require("fast-random");

const seed = 49;
const gen = random(seed);

export class WebglRenderer {
    private gl: WebGL2RenderingContext;
    private shader: Shader;
    private quad_shader: Shader;

    private VAO: WebGLVertexArrayObject;
    private vertex_buffer: WebGLBuffer;
    private frame_buffer: WebGLFramebuffer;

    private quad_render_texture: WebGLTexture;

    private float_texture: WebGLTexture;
    private float_texture_copy: WebGLTexture;

    private sample_count = 0;
    private default_quadrants_row = is_mobile ? 4 : 2;
    private default_quadrants_col = is_mobile ? 4 : 2;
    public num_quadrants;
    private current_quadrant;
    
    private render_width = 0;
    private render_height = 0;

    public super_sampling = is_mobile ? 2 : 3;
    private max_ray_bounce = is_mobile ? 12 : 24;
    private ambient_light = vec3.fromValues(0.5, 0.7, 1.0);

    private float_tex_ext: boolean;

    constructor(canvas: HTMLCanvasElement) {
        //if(is_mobile) this.super_sampling = 0;
        if (this.super_sampling === 0) this.super_sampling = 1;
        this.num_quadrants = this.super_sampling * this.super_sampling * this.default_quadrants_row * this.default_quadrants_col;
        this.current_quadrant = 0;

        this.initGL(canvas);
        this.initRenderTexture();
        this.initShader();

        let aperture = 0.01;
        let eye = vec3.fromValues(10, 1.9, 2.5);
        let target = vec3.fromValues(4, 0.5, 1);
        let up = vec3.fromValues(0, 1, 0);
        let dist_to_focus = vec3.distance(eye, target);

        this.bigSphereScene();
        this.setCamera(
            eye,
            target,
            up,
            30,
            this.gl.drawingBufferWidth / this.gl.drawingBufferHeight,
            aperture,
            dist_to_focus
        );
        this.initBuffers();
    }

    public draw(): void {
        let gl = this.gl;

        //RENDER TO TEXTURE
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frame_buffer);

        gl.viewport(0, 0, this.render_width, this.render_height);

        this.shader.use();
        this.shader.setIntByName("sample_count", this.sample_count);
        this.shader.setFloatByName("rand_seed0", gen.nextFloat());
        this.shader.setFloatByName("rand_seed1", gen.nextFloat());
        this.shader.setIntByName("current_quadrant", this.current_quadrant);
        

        
        //Wiggle for anti-aliasing
        this.wiggleCamera();

        gl.bindVertexArray(this.VAO);
        gl.bindTexture(gl.TEXTURE_2D, this.float_texture_copy);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        
        //Draw to float texture and quad render texture
        gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);

        if (this.float_tex_ext)
            gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 0, 0, this.render_width, this.render_height, 0);
        else gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, this.render_width, this.render_height, 0);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

        this.quad_shader.use();
        gl.bindVertexArray(this.VAO);
        gl.bindTexture(gl.TEXTURE_2D, this.quad_render_texture);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        this.current_quadrant++;
        if(this.current_quadrant >= this.num_quadrants){
            this.current_quadrant = 0;
            this.sample_count++;
        }
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
        this.gl.disable(this.gl.SAMPLE_COVERAGE);

        this.gl.clearColor(0.2, 0.3, 0.3, 1.0);
        this.gl.disable(this.gl.DEPTH_TEST);
    }

    private initShader() {
        let gl = this.gl;

        const frag: string = require("gpu_renderer/shaders/basic.frag");
        const vert: string = require("gpu_renderer/shaders/basic.vert");
        this.shader = new Shader(this.gl, vert, frag);
        this.quad_shader = new Shader(
            gl,
            require("gpu_renderer/shaders/quad.vert"),
            require("gpu_renderer/shaders/quad.frag")
        );

        this.shader.setAttributes(["a_vertex"]);

        let uniforms = new Map();
        uniforms.set("width", this.gl.drawingBufferWidth);
        uniforms.set("height", this.gl.drawingBufferHeight);

        this.shader.setIntByName("max_ray_bounce", this.max_ray_bounce);
        this.shader.setIntByName("num_quadrants", this.num_quadrants);
        this.shader.setIntByName("quadrants_per_row", this.super_sampling * this.default_quadrants_row);
        // this.addSpheres(uniforms);
        this.shader.setIntByName("last_frame", 0);

        uniforms.set("ambient_light", this.ambient_light);

        this.shader.setUniforms(uniforms);
        gl.bindVertexArray(this.VAO);

        this.quad_shader.use();
        this.quad_shader.setIntByName("u_texture", 0);
    }

    private initRenderTexture(): void {
        let gl = this.gl;

        this.render_width = this.gl.drawingBufferWidth * this.super_sampling;
        this.render_height = this.gl.drawingBufferHeight * this.super_sampling;

        //Set up a frame buffer
        this.frame_buffer = gl.createFramebuffer();

        // The framebuffer, which regroups 0, 1, or more textures, and 0 or 1 depth buffer.
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frame_buffer);

        //Float texture support
        this.float_tex_ext = gl.getExtension("EXT_color_buffer_float");

        // The float texture we're going to render to
        this.float_texture = gl.createTexture();
        

        gl.bindTexture(gl.TEXTURE_2D, this.float_texture);

        // prettier-ignore
        if (!!this.float_tex_ext)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.render_width,
                this.render_height, 0, gl.RGBA, gl.FLOAT, null);
        else
            if(!is_mobile)
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB10_A2, this.render_width,
                    this.render_height, 0, gl.RGBA, gl.UNSIGNED_INT_2_10_10_10_REV, null);
            else
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.render_width,
                    this.render_height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

        //Set "float_texture" as our color attachment #0
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.float_texture, 0);

        //Texture that is rendered to screen
        this.quad_render_texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.quad_render_texture);

        // prettier-ignore
        if(!is_mobile)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB10_A2, this.render_width,
                this.render_height, 0, gl.RGBA, gl.UNSIGNED_INT_2_10_10_10_REV, null);
        else
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.render_width,
                this.render_height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

        //Set "quad_render_texture" as our color attachment #1
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.quad_render_texture, 0);

        //Completed
        const a = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        console.log(`${a === gl.FRAMEBUFFER_COMPLETE ? "good" : "bad  "} frame buffer`);
        

        //Texture that is passed to shader to get color of previous render frame
        this.float_texture_copy = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.float_texture_copy);

        // prettier-ignore
        if (!!this.float_tex_ext)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.render_width,
                this.render_height, 0, gl.RGBA, gl.FLOAT, null);
        else
            if(!is_mobile)
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB10_A2, this.render_width,
                    this.render_height, 0, gl.RGBA, gl.UNSIGNED_INT_2_10_10_10_REV, null);
            else
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.render_width,
                    this.render_height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

 
    }

    private bigSphereScene(): void {
        this.shader.use();
        let gl = this.gl;
        //RGBA32F
        let sphere_tex = gl.createTexture();
        //RGBA8I
        let mat_tex = gl.createTexture();
        //RGBA32F
        let mat_tex2 = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, sphere_tex);

        let sphere_array = [];
        let mat_array = [];
        let mat_array2 = [];

        sphere_array.push(0, -1000, 0, 1000);
        mat_array.push(0.5 * 255, 0.5 * 255, 0.5 * 255, 255);
        mat_array2.push(MatType.Diffuse, 0, 0, 0);

        sphere_array.push(0, 1, 0, 1);
        mat_array.push(0, 255, 0, 0);
        mat_array2.push(MatType.Refract, 1.2, 0, 0);

        sphere_array.push(0, 1, 0, -0.95);
        mat_array.push(0, 0, 0, 0);
        mat_array2.push(MatType.Refract, 1.2, 0, 0);

        sphere_array.push(-4, 1, 0, 1);
        mat_array.push(0.4 * 255, 0.2 * 255, 0.1 * 255, 0);
        mat_array2.push(MatType.Diffuse, 0, 0, 0);

        sphere_array.push(4, 1, 0, 1);
        mat_array.push(0.7 * 255, 0.6 * 255, 0.5 * 255, 0);
        mat_array2.push(MatType.Reflect, 0, 0, 0);

        let j = is_mobile ? -2 : -11;
        let k = is_mobile ? 7 : 11;

        for (let a = j; a < k; a++) {
            for (let b = j; b < k; b++) {
                let choose_mat = gen.nextFloat();
                let center = vec3.fromValues(a + 0.9 * gen.nextFloat(), 0.2, b + 0.9 * gen.nextFloat());
                if (vec3.distance(center, vec3.fromValues(4, 0.2, 0)) > 0.9) {
                    if (choose_mat < 0.5) {
                        sphere_array.push(center[0], center[1], center[2], 0.2);
                        mat_array.push(gen.nextFloat() * 255, gen.nextFloat() * 255, gen.nextFloat() * 255, 0);
                        mat_array2.push(MatType.Diffuse, 0, 0, 0);
                    } else if (choose_mat < 0.75) {
                        sphere_array.push(center[0], center[1], center[2], 0.2);
                        mat_array.push(
                            0.5 * (1 + gen.nextFloat()) * 255,
                            0.5 * (1 + gen.nextFloat()) * 255,
                            0.5 * (1 + gen.nextFloat()) * 255,
                            0
                        );
                        mat_array2.push(MatType.Reflect, 0.5 * gen.nextFloat(), 0, 0);
                    } else if (choose_mat < 0.95) {
                        sphere_array.push(center[0], center[1], center[2], 0.2);
                        mat_array.push(0, 0, 0, 0);
                        mat_array2.push(MatType.Refract, 1.5, 0, 0);
                    } else {
                        sphere_array.push(center[0], center[1], center[2], 0.2);
                        mat_array.push(0, 0, 0, 0);
                        mat_array2.push(MatType.Refract, 1.5, 0, 0);

                        sphere_array.push(center[0], center[1], center[2], -0.18);
                        mat_array.push(0, 0, 0, 0);
                        mat_array2.push(MatType.Refract, 1.5, 0, 0);
                    }
                }
            }
        }

        let width = sphere_array.length / 4;
        let num_spheres = width;

        //We must round up the texture to the nearest multiple of 2 or it will not read properly
        width = Math.pow(2, Math.ceil(Math.log(width) / Math.log(2)));

        for (let i = num_spheres; i <= width; i++) {
            sphere_array.push(0, 0, 0, 0);
            mat_array.push(0, 0, 0, 0);
            mat_array2.push(0, 0, 0, 0);
        }

        let height = 1;

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, sphere_tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA32F,
            width,
            height,
            0,
            gl.RGBA,
            gl.FLOAT,
            new Float32Array(sphere_array)
        );
        this.shader.setIntByName("sphere_texture", 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, mat_tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA8,
            width,
            height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            new Uint8Array(mat_array)
        );
        this.shader.setIntByName("mat_texture", 2);

        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, mat_tex2);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, new Float32Array(mat_array2));
        this.shader.setIntByName("mat_texture_extra", 3);

        this.shader.setIntByName("sphere_count", num_spheres);
        this.shader.setFloatByName("sphere_texture_size", width);
    }

    private setCamera(
        eye: vec3,
        target: vec3,
        up: vec3,
        vFov: number,
        aspect: number,
        aperture: number,
        focus_dist: number
    ): void {
        let cam = new Camera(eye, target, up, vFov, aspect, aperture, focus_dist);

        this.shader.use();
        this.shader.setVec3ByName("screen.lower_left_corner", cam.lower_left_corner);
        this.shader.setVec3ByName("screen.horizontal", cam.screen_horizontal);
        this.shader.setVec3ByName("screen.vertical", cam.screen_vertical);
        this.shader.setVec3ByName("screen.position", cam.position);
        this.shader.setFloatByName("screen.lens_radius", cam.lens_radius);
        this.shader.setFloatByName("screen.x_wiggle", gen.nextFloat() / this.render_width);
        this.shader.setFloatByName("screen.y_wiggle", gen.nextFloat() / this.render_height);
    }

    private wiggleCamera(): void {
        this.shader.setFloatByName("screen.x_wiggle", gen.nextFloat() / this.render_width);
        this.shader.setFloatByName("screen.y_wiggle", gen.nextFloat() / this.render_height);
    }

    private initBuffers() {
        let gl = this.gl;
        this.vertex_buffer = gl.createBuffer();
        this.VAO = gl.createVertexArray();

        //prettier-ignore
        let vertices = [
            -1.0, -1.0, 0.0,
            1.0, -1.0, 0.0,
            -1.0, 1.0, 0.0,
            -1.0, 1.0, 0.0,
            1.0, -1.0, 0.0,
            1.0, 1.0, 0.0
        ];

        gl.bindVertexArray(this.VAO);
        gl.activeTexture(gl.TEXTURE0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        gl.enableVertexAttribArray(this.shader.getAttribLocation("a_vertex"));
        gl.vertexAttribPointer(this.shader.getAttribLocation("a_vertex"), 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
    }
}
