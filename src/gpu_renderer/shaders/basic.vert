#version 300 es
precision mediump float;
layout (location = 0) in vec3 a_vertex;

out vec2 pos;
out vec3 eye;
out vec3 ray_direction;

const vec2 pos_fix = vec2(0.5);

struct Screen{
    vec3 position;
    vec3 lower_left_corner;
    vec3 horizontal;
    vec3 vertical;
    float lens_radius;
    float x_wiggle;
    float y_wiggle;
};

uniform Screen screen;
uniform float rand_seed0;
uniform float rand_seed1;
uniform float width;
uniform float height;

float random2(vec3 scale, float seed){
    return fract(sin(dot(a_vertex + seed, scale)) * 43758.5453 + seed);
}

void main()
{
    //fix position from -1 to 1 to 0 to 1
    pos = a_vertex.xy * pos_fix + pos_fix;
     
    eye = screen.position;

    ray_direction = screen.lower_left_corner +
        screen.x_wiggle*1.0 + pos.x * screen.horizontal + 
        screen.y_wiggle*1.0 + pos.y * screen.vertical - 
        eye;
        
    gl_Position = vec4(a_vertex,1.0f);
}   