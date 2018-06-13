import {Shader} from "./shader";


export class WebglRenderer {
    gl: WebGL2RenderingContext;
    shader: Shader;
    
    VAO:WebGLVertexArrayObject;
    vertex_buffer:WebGLBuffer;

    constructor(canvas:HTMLCanvasElement) {
        this.initGL(canvas);
        this.initShader();
        this.initBuffers();


    }
    
    public draw():void{
        let gl = this.gl;
        
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        this.shader.use();
        gl.bindVertexArray(this.VAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
        
        gl.drawArrays(gl.TRIANGLES, 0,6);
        gl.bindVertexArray(null);
    }
    
    
    private initGL(canvas:HTMLCanvasElement){
        try {
            this.gl = <WebGL2RenderingContext>canvas.getContext("webgl2");
        } catch (e) {
            throw "GL init error:\n" + e;
        }
        if (!this.gl) {
            alert("WebGL2 is not available on your browser.");
        }

        this.gl.clearColor(0.2, 0.3, 0.3, 1.0);
        //this.gl.enable(this.gl.DEPTH_TEST);
    }
    
    private initShader(){
        const frag: string = require("gpu_renderer/shaders/basic.frag");
        const vert: string = require("gpu_renderer/shaders/basic.vert");
        this.shader = new Shader(this.gl, vert, frag);
        
        this.shader.setAttributes(["a_vertex"]);
        this.shader.setUniforms(new Map([["width",this.gl.drawingBufferWidth], ["height",this.gl.drawingBufferHeight]]));
    }

    private  initBuffers() {
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
