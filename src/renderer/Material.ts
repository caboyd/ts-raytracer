import {HitRecord} from "./Hitable";
import {Ray} from "./Ray";
import {vec3} from "gl-matrix";

import gen from "./SoftwareRenderer"

export abstract class Material{
    
    public abstract scatter(scattered_out:Ray, ray:Ray, hit_record:HitRecord, attenuation:vec3, ):boolean;
}

export class Lambertian extends Material{
    temp:vec3 = vec3.create();
    albedo:vec3;
    
    constructor(albedo:vec3 = vec3.create()){
        super();
        this.albedo = albedo;
    }
    
    public scatter( scattered_out:Ray, ray:Ray, rec:HitRecord, attenuation:vec3):boolean{
        vec3.add(this.temp, rec.pos, randomInUnitSphere(this.temp));
        vec3.add(this.temp, this.temp, rec.normal);

        vec3.copy(scattered_out.origin, rec.pos);
        vec3.sub(scattered_out.direction, this.temp, rec.pos);
        
        vec3.copy(attenuation,this.albedo);
        return true;
    }
}


export class Metal extends Material{
    temp = vec3.create();
    albedo = vec3.create();
    fuzz:number;

    constructor(albedo:vec3 = vec3.create(), fuzz = 0){
        super();
        this.albedo = albedo;
        this.fuzz = fuzz > 1 ? 1: (fuzz < 0 ? 0: fuzz);
    }
    
    public scatter( scattered_out:Ray, ray:Ray, rec:HitRecord, attenuation:vec3):boolean{
        vec3.normalize(this.temp,ray.direction);

        vec3.copy(scattered_out.origin, rec.pos);
       vec3.add(scattered_out.direction, reflect(scattered_out.direction,this.temp,rec.normal), vec3.scale(randomInUnitSphere(this.temp),this.temp, this.fuzz));
        
        vec3.copy(attenuation, this.albedo);

        return vec3.dot(scattered_out.direction, rec.normal) > 0.0;
    }
}

export class Dielectric extends Material{
    private temp = vec3.create();
    private outward_normal = vec3.create();
    private refracted = vec3.create();
    private reflected = vec3.create();
    refraction_index:number;
    
    constructor(ref_idx:number){
        super();
        this.refraction_index = ref_idx;
    }

    public scatter( scattered_out:Ray, ray:Ray, rec:HitRecord, attenuation:vec3):boolean {
        let ni_over_nt;
        let cosine;
        let reflect_prob;
        

        vec3.normalize(this.temp,ray.direction);
        reflect(this.reflected,this.temp,rec.normal);
        
        vec3.set(attenuation,1,1,1);
        
        if(vec3.dot(ray.direction,rec.normal) > 0.0){
            vec3.negate(this.outward_normal,rec.normal);
            ni_over_nt = this.refraction_index;
            cosine = this.refraction_index * vec3.dot(ray.direction, rec.normal) / vec3.length(ray.direction);
        }else{
            vec3.copy(this.outward_normal,rec.normal);
            ni_over_nt = 1.0 / this.refraction_index;
            cosine = -vec3.dot(ray.direction, rec.normal) / vec3.length(ray.direction);
        }
        
       // vec3.normalize(this.outward_normal,this.outward_normal);
        vec3.normalize(this.temp,ray.direction);
        refract(this.refracted, this.temp,this.outward_normal, ni_over_nt);
        
        if(vec3.length(this.refracted) > 0.0){
            reflect_prob = schlick(cosine, this.refraction_index);
        }else{
          reflect_prob = 1.0
        }
        
        if(gen.nextFloat() < reflect_prob){
            vec3.copy(scattered_out.direction, this.reflected)
        }else{
            vec3.copy(scattered_out.direction, this.refracted);
        }
        
        vec3.copy(scattered_out.origin, rec.pos);
     
        return true;
    }
    
}

function randomInUnitSphere(out: vec3): vec3 {
    do {
        vec3.set(out, 2 *gen.nextFloat() - 1, 2 * gen.nextFloat() - 1, 2 * gen.nextFloat() - 1);
    } while (vec3.dot(out, out) >= 1.0);
    return out;
}

function reflect(out:vec3, v:vec3, n:vec3):vec3{
    let dot = vec3.dot(v,n);
    vec3.scale(out,n,2*dot);
    vec3.sub(out, v, out );
    return out;
}

function refract(refracted_out:vec3, v:vec3, n:vec3, ni_over_nt:number, ):boolean{
    let dt = vec3.dot(v,n);
    let temp = vec3.create();
    
    let discriminant = 1.0 - ni_over_nt * ni_over_nt * (1.0 - dt * dt);
    if(discriminant > 0.0){
        //Book formula - v must be normalized
        //refracted = ni_over_nt * ( v - n*dt) - n * sqrt(discriminant);

        vec3.scale(temp,n, dt);
        vec3.sub(refracted_out,v,temp);
        vec3.scale(refracted_out,refracted_out, ni_over_nt);

        temp = vec3.scale(temp,n,Math.sqrt(discriminant));
        vec3.sub(refracted_out,refracted_out,temp);

        //OpenGL formula - v,n must be normalized
        //refracted = ni_over_nt * v - (ni_over_nt * dt + sqrt(discriminant)) * n;
        //  temp = vec3.scale(temp,n, ni_over_nt * dt + Math.sqrt(discriminant));
        //  vec3.scale(refracted_out,v, ni_over_nt);
        //  vec3.sub(refracted_out,refracted_out, temp);
        
        return true;
    }else
        vec3.set(refracted_out,0,0,0);
        return false;
}

function schlick(cosine:number, ref_idx:number):number{
    let r0 = (1-ref_idx) / (1+ref_idx);
    r0 = r0*r0;
    return r0 + (1-r0) * Math.pow((1-cosine), 5);
}