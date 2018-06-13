#version 300 es
precision mediump float;

out vec4 fragColor;

uniform float width;
uniform float height;

in vec2 pos;

vec3 color(vec3 direction){
    direction = normalize(direction);
    float t = 0.5 * (direction.y + 1.0);
    return (1.0 - t) * vec3(1.0) + t * vec3(0.5,0.7,1.0);
}

void main()
{        
    vec3 lower_left_corner =  vec3(-2.0,-1.0,-1.0);
    vec3 horizontal = vec3(4.0,0.0,0.0);
    vec3 vertical = vec3(0.0,2.0,0.0);
    float u = pos.x;
    float v = pos.y;
    fragColor = vec4(color(lower_left_corner + u*horizontal + v*vertical),1.0);
}


