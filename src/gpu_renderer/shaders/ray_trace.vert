#version 300 es
precision highp  float;
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

uniform int num_quadrants;
uniform int current_quadrant;
uniform int quadrants_per_row;
uniform int quadrants_per_col;

float random2(vec3 scale, float seed){
    return fract(sin(dot(a_vertex + seed, scale)) * 43758.5453 + seed);
}

void main()
{
    //match the quad to the quadrant we are rendering
    vec3 scale = vec3(1. / float(quadrants_per_row), 1. / float(quadrants_per_col), 1.0);

    vec3 new_vertex = a_vertex * vec3(scale) + vec3(float(1) - vec3(scale)) ;
    
    new_vertex.x -=  float(current_quadrant%quadrants_per_row)  * scale.x * 2.;
    new_vertex.y -=  floor(float(current_quadrant) / float(quadrants_per_row))  * scale.y * 2.;
    
    //fix position from -1 to 1 to 0 to 1
    pos = new_vertex.xy * pos_fix + pos_fix;
    
    eye = screen.position;

    ray_direction = screen.lower_left_corner +
        screen.x_wiggle*1.0 + pos.x * screen.horizontal + 
        screen.y_wiggle*1.0 + pos.y * screen.vertical - 
        eye;
        
    gl_Position = vec4(new_vertex,1.0);
}   