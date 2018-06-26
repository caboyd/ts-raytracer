import {Shader} from "./shader";
import {vec3} from "gl-matrix";

export class WebglRenderer {
    gl: WebGL2RenderingContext;
    shader: Shader;

    VAO: WebGLVertexArrayObject;
    vertex_buffer: WebGLBuffer;

    constructor(canvas: HTMLCanvasElement) {
        this.initGL(canvas);
        this.initShader();
        this.initBuffers();
    }

    public draw(): void {
        let gl = this.gl;

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        this.shader.use();
        gl.bindVertexArray(this.VAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindVertexArray(null);
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
        const frag: string = require("gpu_renderer/shaders/basic.frag");
        const vert: string = require("gpu_renderer/shaders/basic.vert");
        this.shader = new Shader(this.gl, vert, frag);

        this.shader.setAttributes(["a_vertex"]);

        let uniforms = new Map();
        uniforms.set("width", this.gl.drawingBufferWidth);
        uniforms.set("height", this.gl.drawingBufferHeight);

        this.shader.setIntByName("sphere_count", 2);
        // this.addSpheres(uniforms);
        uniforms.set("spheres[0].center", vec3.fromValues(0, 0, -1.0));
        uniforms.set("spheres[0].radius", 0.5);
        uniforms.set("spheres[1].center", vec3.fromValues(0, -100.5, -1));
        uniforms.set("spheres[1].radius", 100);

        this.shader.setUniforms(uniforms);

        this.shader.setIntByName("sample_count", 5000);
        this.shader.setIntByName("max_rays", 4);
    }

    private addSpheres(uniforms: Map<string, any>): void {
        for (let i = 0; i < 30; i++) {
            uniforms.set(
                `spheres[${i}].center`,
                vec3.fromValues(2 * Math.random() - 1, Math.random() / 3.0 - 0.5, -Math.random() / 2.0 - 0.5)
            );
            uniforms.set(`spheres[${i}].radius`, Math.random() / 10.0 + 0.05);
        }
        this.shader.setIntByName("sphere_count", 30);
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
