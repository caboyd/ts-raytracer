#version 300 es
layout (location = 0) in vec3 a_vertex;


out vec2 pos;

const vec2 pos_fix = vec2(0.5);

void main()
{
    //fix position from -1 to 1 to 0 to 1
    pos = a_vertex.xy * pos_fix + pos_fix;
    
    gl_Position = vec4(a_vertex,1.0f);
}   