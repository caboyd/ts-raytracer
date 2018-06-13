#version 300 es
precision mediump float;

out vec4 fragColor;

uniform float width;
uniform float height;

in vec2 pos;

struct Ray{
    vec3 origin;
    vec3 direction;
};

vec3 ray_pointAtParameter(Ray ray, float t){
    vec3 result = ray.origin + t * ray.direction;
    return result;
}

float hitSphere(const vec3 center, float radius, Ray ray){
    vec3 oc = ray.origin - center;
    float a = dot(ray.direction, ray.direction);
    float b = 2.0 * dot(oc, ray.direction);
    float c = dot(oc,oc) - radius*radius;
    float discriminant = b*b - 4.0 * a * c;
    if (discriminant < 0.0){
        return -1.0;
    }else{
        return (-b - sqrt(discriminant)) / (2.0 * a);
    }
}

vec3 color(Ray ray){
float t = hitSphere(vec3(0,0,-1), 0.5, ray);
    if(t > 0.0){
        vec3 N = normalize(ray_pointAtParameter(ray, t) - vec3(0,0,-1));
        return 0.5*vec3(N.x+1.0, N.y+1.0, N.z+1.0);
    }

    vec3 unit_direction = normalize(ray.direction);
    t = 0.5 * (unit_direction.y + 1.0);
    return (1.0 - t) * vec3(1.0) + t * vec3(0.5,0.7,1.0);
}

void main()
{        
    Ray ray;
    vec3 lower_left_corner =  vec3(-2.0,-1.0,-1.0);
    vec3 horizontal = vec3(4.0,0.0,0.0);
    vec3 vertical = vec3(0.0,2.0,0.0);
    float u = pos.x;
    float v = pos.y;
    ray.origin = vec3(0);
    ray.direction = lower_left_corner + u*horizontal + v*vertical;
    fragColor = vec4(color(ray),1.0);
}


