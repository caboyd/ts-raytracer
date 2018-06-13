#version 300 es
precision mediump float;

out vec4 fragColor;

uniform float width;
uniform float height;

in vec2 pos;

void main()
{        
    float u = pos.x;
    float v = pos.y;
    fragColor = vec4(u,v,0.2, 1.0);
}