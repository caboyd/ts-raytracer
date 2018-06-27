#version 300 es
precision mediump float;

#define FLT_MAX 3.402823466e+38

out vec4 fragColor;

uniform float width;
uniform float height;

in vec2 pos;

struct Ray{
    vec3 origin;
    vec3 direction;
};

const int Diffuse = 0;
const int Reflect = 1;
const int Refract = 2;

struct Material{
    int type;
    vec3 diffuse;
    vec3 reflect;
    vec3 refract;
    float fuzz;
    float refraction_index;
};

struct HitRecord{
    float t;
    vec3 pos;
    vec3 normal;
    Material mat;
};

struct Sphere{
    vec3 center;
    float radius;
    Material mat;
};

struct RandomResult
{
    uvec4 state;
    float value;
};

uniform vec3 ambient_light;
uniform int sphere_count;
uniform int sample_count;
uniform int max_ray_bounce;
uniform Sphere spheres[100];


uint TausStep(uint z, int S1, int S2, int S3, uint M)
{
    uint b = (((z << S1) ^ z) >> S2);
    return (((z & M) << S3) ^ b);    
}

uint LCGStep(uint z, uint A, uint C)
{
    return (A * z + C);    
}

RandomResult Random(uvec4 state)
{
    state.x = TausStep(state.x, 13, 19, 12, 4294967294U);
    state.y = TausStep(state.y, 2, 25, 4, 4294967288U);
    state.z = TausStep(state.z, 3, 11, 17, 4294967280U);
    state.w = LCGStep(state.w, 1664525U, 1013904223U);

    RandomResult result;
    result.state = state;
    result.value = 2.3283064365387e-10 * float(state.x ^ state.y ^ state.z ^ state.w);

    return result;
}

vec3 ray_pointAtParameter(Ray ray, float t){
    vec3 result = ray.origin + t * ray.direction;
    return result;
}

float schlick(float cosine, float ref_idx){
    float r0 = (1.0-ref_idx) / (1.0 + ref_idx);
    r0 = r0*r0;
    return r0 + (1.0-r0) * pow((1.0 - cosine), 5.0);
}



bool sphereIntersection(const Sphere s, Ray ray, float t_min, float t_max, inout HitRecord rec){
    bool hit = false;
    vec3 to_sphere = ray.origin - s.center;
    float a = dot(ray.direction, ray.direction);
    float b = dot(to_sphere, ray.direction);
    float c = dot(to_sphere,to_sphere) - s.radius * s.radius;
    float discriminant = b * b -  a * c;
    
    if(discriminant > 0.0){
        float temp = (-b - sqrt(discriminant)) / a;
        if(temp < t_max && temp > t_min){
            hit = true;
        }
        if(!hit){
            temp = (-b + sqrt(discriminant)) / a;
            if(temp < t_max && temp > t_min){
               hit = true;
            }
        }
        if(hit){
            rec.t = temp;
            rec.pos = ray.origin + rec.t * ray.direction;
            rec.normal = (rec.pos - s.center) / s.radius;
            rec.mat = s.mat;
            return true;
        }
    }
    return false;
}


bool intersectAll(Ray ray, float t_min, float t_max, inout HitRecord rec){
    bool hit_anything = false;
    float closest_so_far = t_max;
    
    //Spheres Loop
    for(int i = 0; i < sphere_count; i++){
        if(sphereIntersection(spheres[i], ray, t_min, closest_so_far, rec)){
            hit_anything = true;
            closest_so_far = rec.t;
        }
    }
    return hit_anything;
}

vec3 randomInUnitSphere(inout RandomResult rand){
    vec3 p;
    do{
        rand = Random(rand.state);
        float a = rand.value;
        rand = Random(rand.state);
        float b = rand.value;
        rand = Random(rand.state);
        float c = rand.value;
        p = 2.0 * vec3(a,b,c) - vec3(1,1,1);    
    }while(dot(p,p) >= 1.0);
    return p;
}

vec3 color(inout Ray ray, inout RandomResult random_result){
    HitRecord rec;
    Ray orig_ray = ray;
    vec3 final_color = vec3(0.0);
    vec3 color = vec3(1.0);


    for(int ray_bounce=0; ray_bounce <= max_ray_bounce; ray_bounce++){
        if(intersectAll(ray, 0.001, FLT_MAX, rec )){
            ray.origin = rec.pos;
            vec3 reflected = reflect(normalize(ray.direction), rec.normal);
                   
            if(rec.mat.type == Diffuse){
                vec3 target = rec.pos + rec.normal + randomInUnitSphere(random_result);
                ray.direction = target - rec.pos;
                color  *=rec.mat.diffuse;
            }else if(rec.mat.type == Reflect){     
                ray.direction = reflected + rec.mat.fuzz*randomInUnitSphere(random_result);
                if(dot(ray.direction, rec.normal) > 0.0)
                    color *= rec.mat.reflect;
                else
                    color = vec3(0);
            }else if(rec.mat.type == Refract){
                vec3 outward_normal;
                float ni_over_nt;
                float reflect_prob;
                float cosine;
               
               if(dot(ray.direction, rec.normal) > 0.0){
                   outward_normal = -rec.normal;
                   ni_over_nt = rec.mat.refraction_index;
                   cosine = rec.mat.refraction_index * dot(ray.direction, rec.normal) / length(ray.direction);
               }else{
                   outward_normal = rec.normal;
                   ni_over_nt = 1.0 / rec.mat.refraction_index;
                   cosine = -dot(ray.direction, rec.normal) / length(ray.direction);
               }
               vec3 refracted = refract(normalize(ray.direction), outward_normal, ni_over_nt);
               if(length(refracted) > 0.0){
                   reflect_prob = schlick(cosine, rec.mat.refraction_index);
               }else{
                   ray.direction = reflected;
                   reflect_prob = 1.0;
               }
               random_result = Random(random_result.state);
               if(random_result.value > reflect_prob){
                   ray.direction = refracted;
               }else
                   ray.direction = reflected;
               
            }
        }else{
             vec3 unit_direction = normalize(ray.direction);
             float t = 0.5 * (unit_direction.y + 1.0);
             final_color =  (1.0 - t) * vec3(1.0) +   t * ambient_light;
             break;
        }
    }
  
    return color*final_color;
}



void main()
{        
    Ray ray;
    uint a = uint(pos.x * 40908352.0);
    uint b = uint(pos.y * 64360934.0);
    RandomResult r = Random(uvec4(a, b,a + b, a ^ b));
    vec3 col = vec3(0);
    vec3 lower_left_corner =  vec3(-2.0,-1.0,-1.0);
    vec3 horizontal = vec3(4.0,0.0,0.0);
    vec3 vertical = vec3(0.0,2.0,0.0);
    for(int i = 0; i < sample_count; i++){
        r = Random(r.state);
        float u = pos.x  + (r.value-0.5) / width ;
        r = Random(r.state);
        float v = pos.y + (r.value-0.5) / height;
        ray.origin = vec3(0);
        ray.direction = lower_left_corner + u*horizontal + v*vertical;
        col += color(ray, r);
    }
    col /= float(sample_count);
    col = vec3(sqrt(col[0]),sqrt(col[1]),sqrt(col[2]));
 
    fragColor = vec4(col,1.0);
}


