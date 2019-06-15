import {Shader} from "./shader";
import {vec3} from "gl-matrix";
import {MatType} from "./Material";
import {Camera} from "../Camera";
import * as ImGui from "../imgui/imgui";
import {ImGuiIO} from "../imgui/imgui";
import * as ImGui_Impl from "../imgui/imgui_impl";
import {Global} from "../globals";

const random = require("fast-random");

const seed = 49;
const gen = random(seed);


let vFov = 60;
let aperture = 0.0;
let eye = vec3.fromValues(10, 1.9, 2.5);
let target = vec3.fromValues(4, 0.5, 1);
let up = vec3.fromValues(0, 1, 0);
let dist_to_focus = vec3.distance(eye, target);

//let hud_gl: WebGLRenderingContext;


export class WebglRenderer {
    public camera: Camera;
    private gl: WebGL2RenderingContext;
    private ray_trace_shader: Shader;
    private quad_shader: Shader;

    private VAO: WebGLVertexArrayObject;
    private vertex_buffer: WebGLBuffer;

    private frame_buffers: WebGLFramebuffer[];
    private float_textures: WebGLTexture[];
    private current_source_id = 0;

    private quad_render_texture: WebGLTexture;

    private sample_count = 0;
    private quadrants_row = Global.is_mobile ? 3 : 2;
    private quadrants_col = Global.is_mobile ? 3 : 2;
    public num_quadrants;
    private current_quadrant;

    private render_width = 0;
    private render_height = 0;
    private render_resolution = 600;
    private display_resolution = 600;
    
    private mouse_invert = false;

    private _super_sampling = Global.is_mobile ? 1 : 1;
    get super_sampling() {
        return this._super_sampling;
    }

    set super_sampling(ss: number) {
        if (this._super_sampling == ss) return;
        this._super_sampling = ss;
        this.initRenderTexture();
        let mult =  ss == 2 ? 2 : 0.5;
        this.quadrants_col = Math.floor(this.quadrants_col * mult);
        this.quadrants_row = Math.floor(this.quadrants_row * mult);
    };


    private max_ray_bounce = Global.is_mobile ? 12 : 24;
    private min_ray_bounce = 0;
    private ambient_light = vec3.fromValues(0.5, 0.7, 1.0);

    private float_tex_ext: boolean;

    private reset = true;

    constructor(canvas: HTMLCanvasElement) {
        this.num_quadrants = this.quadrants_row * this.quadrants_col;
        this.current_quadrant = 0;

        this.initGL(canvas);
        this.initRenderTexture();
        this.initShader();


        this.bigSphereScene();
        this.camera = new Camera(
            eye,
            target,
            up,
            vFov,
            this.gl.drawingBufferWidth / this.gl.drawingBufferHeight,
            aperture,
            dist_to_focus
        );
        this.updateCamera();
        this.initBuffers();
    }

    public async initImGui() {

        await ImGui.default();
        ImGui.IMGUI_CHECKVERSION();
        ImGui.CreateContext();

        const io: ImGuiIO = ImGui.GetIO();
        // io.ConfigFlags |= ImGui.ConfigFlags.NavEnableKeyboard;  // Enable Keyboard Controls

        // Setup style
        ImGui.StyleColorsDark();
        //ImGui.StyleColorsClassic();

        io.Fonts.AddFontDefault();
        io.WantCaptureMouse = true;
        ImGui_Impl.Init(this.gl);
    }

    public draw(): void {
        let gl = this.gl;
        let destination_id = (this.current_source_id + 1) % 2;

        //RENDER TO TEXTURE
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frame_buffers[destination_id]);
        gl.viewport(0, 0, this.render_width, this.render_height);

        this.ray_trace_shader.use();

        this.num_quadrants = this.quadrants_row * this.quadrants_col;

        if (this.reset) {
            this.reset = false;
            this.sample_count = 0;
            this.current_quadrant = -1;
            this.ray_trace_shader.setIntByName("max_ray_bounce", this.min_ray_bounce);
            //  this.ray_trace_shader.setIntByName("num_quadrants", 0);
            this.ray_trace_shader.setIntByName("quadrants_per_row", 1);
            this.ray_trace_shader.setIntByName("quadrants_per_col", 1);
            this.ray_trace_shader.setIntByName("current_quadrant", 0);
        }
        else {
            this.ray_trace_shader.setIntByName("max_ray_bounce", this.max_ray_bounce);
            //  this.ray_trace_shader.setIntByName("num_quadrants", this.num_quadrants);
            this.ray_trace_shader.setIntByName("quadrants_per_row", this.quadrants_row);
            this.ray_trace_shader.setIntByName("quadrants_per_col", this.quadrants_col);
            this.ray_trace_shader.setIntByName("current_quadrant", this.current_quadrant);
        }

        this.ray_trace_shader.setIntByName("sample_count", this.sample_count);
        this.ray_trace_shader.setFloatByName("rand_seed0", gen.nextFloat());
        this.ray_trace_shader.setFloatByName("rand_seed1", gen.nextFloat());

        this.updateCamera();
        //Wiggle for anti-aliasing
        this.wiggleCamera();

        gl.bindVertexArray(this.VAO);
        gl.bindTexture(gl.TEXTURE_2D, this.float_textures[this.current_source_id]);

        //Draw to float texture and quad render texture
        gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

        gl.bindVertexArray(null);

        this.current_quadrant++;

        if (this.current_quadrant >= this.num_quadrants) {
            this.current_quadrant = 0;
            this.sample_count += 1;
            // Ping pong the buffers
            this.current_source_id = destination_id;

        }


        // Start the Dear ImGui frame
        ImGui_Impl.NewFrame(0);
        ImGui.NewFrame();
        ImGui.SetNextWindowPos(new ImGui.ImVec2(640, 50), ImGui.Cond.FirstUseEver);
        ImGui.SetNextWindowSize(new ImGui.ImVec2(300, 340), ImGui.Cond.FirstUseEver);
        {
            ImGui.Begin("Settings");
            ImGui.Text(`Samples: ${this.sample_count}`);
            ImGui.Text(`Render Resolution: ${this.render_width}x${this.render_height}`);
            ImGui.Separator();
            ImGui.Text(`FPS: ${Global.fps.toFixed(2)}`);
            ImGui.SliderInt("Max FPS", (value = Global.max_fps) => Global.max_fps = value, 5, 144);
            ImGui.Checkbox("Invert Mouse", (value = this.mouse_invert) => this.mouse_invert = value)
            ImGui.Separator();
            ImGui.Text("Ray Bounces");
            ImGui.SliderInt("Cam Moving", (value = this.min_ray_bounce) => this.min_ray_bounce = value, 0, 50);
            ImGui.SliderInt("Cam Still", (value = this.max_ray_bounce) => this.max_ray_bounce = value, 0, 200);
            
            ImGui.Separator();
            ImGui.Text("Displays Dimensions");
            ImGui.SliderInt("Width & Height", (value = this.display_resolution) => this.display_resolution = value, 300, 1200);
            ImGui.Text("Rendering Tiles");
            ImGui.InputInt("Rows", (value = this.quadrants_row) => this.quadrants_row = value, 1, 1);
            ImGui.InputInt("Cols", (value = this.quadrants_col) => this.quadrants_col = value, 1, 1);

            ImGui.Text("Supersampling");
            ImGui.SliderInt("SSAA", (value = this.super_sampling) => this.super_sampling = value, 1, 2);
            ImGui.End();
        }

        ImGui.SetNextWindowPos(new ImGui.ImVec2(2, 50), ImGui.Cond.FirstUseEver);
        ImGui.SetNextWindowSize(new ImGui.ImVec2(this.display_resolution + 20, this.display_resolution +  40), ImGui.Cond.Always);
        {
            let io = ImGui.GetIO();
            ImGui.Begin("GPU Rendered Scene");
            let size = new ImGui.ImVec2(this.display_resolution, this.display_resolution);
  
            ImGui.ImageButton(this.quad_render_texture, size, new ImGui.ImVec2(0, 1), new ImGui.ImVec2(1, 0), 0);
            if (ImGui.IsItemActive()) {
                const mouse_delta: Readonly<ImGui.reference_ImVec2> = io.MouseDelta;
                let invert = this.mouse_invert ? -1: 1;
                this.camera.processMouseMovement(invert *mouse_delta.x, invert *mouse_delta.y, true);
                this.reset = true;
            }
            ImGui.End();
        }
        ImGui.EndFrame();
        ImGui.Render();

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(0, 0, 0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(null); // You may want this if using this code in an OpenGL 3+ context where shaders may be bound

        ImGui_Impl.RenderDrawData(ImGui.GetDrawData());

    }

    public resetCamera(): void {
        this.camera.position = eye;
        this.camera.lookAt(target);
    }

    public resetSamples(): void {
        this.reset = true;
    }

    public getSampleCount(): number {
        return this.sample_count;
    }

    private initGL(canvas: HTMLCanvasElement) {
        try {
            this.gl = <WebGL2RenderingContext>canvas.getContext("webgl2", {alpha: true});
        } catch (e) {
            throw "GL init error:\n" + e;
        }
        if (!this.gl) {
            alert("WebGL2 is not available on your browser.");
        }
        //this.gl.disable(this.gl.SAMPLE_COVERAGE);

        this.gl.clearColor(0.2, 0.3, 0.3, 1.0);
        this.gl.disable(this.gl.DEPTH_TEST);

    }

    private initShader() {
        let gl = this.gl;

        const frag: string = require("gpu_renderer/shaders/ray_trace.frag");
        const vert: string = require("gpu_renderer/shaders/ray_trace.vert");
        this.ray_trace_shader = new Shader(this.gl, vert, frag);
        this.quad_shader = new Shader(
            gl,
            require("gpu_renderer/shaders/quad.vert"),
            require("gpu_renderer/shaders/quad.frag")
        );

        this.ray_trace_shader.setAttributes(["a_vertex"]);

        let uniforms = new Map();
        uniforms.set("width", this.gl.drawingBufferWidth);
        uniforms.set("height", this.gl.drawingBufferHeight);

        this.ray_trace_shader.setIntByName("max_ray_bounce", this.max_ray_bounce);
        this.ray_trace_shader.setIntByName("num_quadrants", this.num_quadrants);
        this.ray_trace_shader.setIntByName("quadrants_per_row", this.super_sampling * this.quadrants_row);
        // this.addSpheres(uniforms);
        this.ray_trace_shader.setIntByName("last_frame", 0);

        uniforms.set("ambient_light", this.ambient_light);

        this.ray_trace_shader.setUniforms(uniforms);
        gl.bindVertexArray(this.VAO);

        this.quad_shader.use();
        this.quad_shader.setIntByName("u_texture", 0);
    }

    private initRenderTexture(): void {
        let gl = this.gl;
        this.reset = true;

        this.render_width = this.render_resolution * this.super_sampling;
        this.render_height = this.render_resolution * this.super_sampling;

        //Texture that is rendered to screen
        this.quad_render_texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.quad_render_texture);

        // prettier-ignore
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.render_width,
            this.render_height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

        //Set up a frame buffer
        this.frame_buffers = [gl.createFramebuffer(), gl.createFramebuffer()];

        //Float texture support
        this.float_tex_ext = gl.getExtension("EXT_color_buffer_float");

        // The float texture we're going to render to
        this.float_textures = [gl.createTexture(), gl.createTexture()];

        for (let buffer_id = 0; buffer_id < this.frame_buffers.length; buffer_id++) {
            // The framebuffer, which regroups 0, 1, or more textures, and 0 or 1 depth buffer.
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.frame_buffers[buffer_id]);
            gl.bindTexture(gl.TEXTURE_2D, this.float_textures[buffer_id]);

            // prettier-ignore
            if (this.float_tex_ext)
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.render_width,
                    this.render_height, 0, gl.RGBA, gl.FLOAT, null);
            else
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.render_width,
                    this.render_height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

            //Set "float_texture" as our color attachment #0
            gl.framebufferTexture2D(
                gl.FRAMEBUFFER,
                gl.COLOR_ATTACHMENT0,
                gl.TEXTURE_2D,
                this.float_textures[buffer_id],
                0
            );

            //Set "quad_render_texture" as our color attachment #1
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.quad_render_texture, 0);

            //Completed
            const a = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
            console.log(`${a === gl.FRAMEBUFFER_COMPLETE ? "good" : "bad  "} frame buffer ${buffer_id}`);
        }
    }

    private bigSphereScene(): void {
        this.ray_trace_shader.use();
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

        let j = Global.is_mobile ? -2 : -11;
        let k = Global.is_mobile ? 7 : 11;

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

        //Fill with empty
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
        this.ray_trace_shader.setIntByName("sphere_texture", 1);

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
        this.ray_trace_shader.setIntByName("mat_texture", 2);

        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, mat_tex2);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, new Float32Array(mat_array2));
        this.ray_trace_shader.setIntByName("mat_texture_extra", 3);

        this.ray_trace_shader.setIntByName("sphere_count", num_spheres);
        this.ray_trace_shader.setFloatByName("sphere_texture_size", width);
    }

    private updateCamera() {
        this.ray_trace_shader.use();
        this.ray_trace_shader.setVec3ByName("screen.lower_left_corner", this.camera.lower_left_corner);
        this.ray_trace_shader.setVec3ByName("screen.horizontal", this.camera.screen_horizontal);
        this.ray_trace_shader.setVec3ByName("screen.vertical", this.camera.screen_vertical);
        this.ray_trace_shader.setVec3ByName("screen.position", this.camera.position);
        this.ray_trace_shader.setFloatByName("screen.lens_radius", this.camera.lens_radius);
        this.ray_trace_shader.setFloatByName("screen.x_wiggle", gen.nextFloat() / this.render_width);
        this.ray_trace_shader.setFloatByName("screen.y_wiggle", gen.nextFloat() / this.render_height);
    }

    private wiggleCamera(): void {
        this.ray_trace_shader.setFloatByName("screen.x_wiggle", gen.nextFloat() / this.render_width);
        this.ray_trace_shader.setFloatByName("screen.y_wiggle", gen.nextFloat() / this.render_height);
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

        gl.enableVertexAttribArray(this.ray_trace_shader.getAttribLocation("a_vertex"));
        gl.vertexAttribPointer(this.ray_trace_shader.getAttribLocation("a_vertex"), 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
    }
}

