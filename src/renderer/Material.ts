import {HitRecord} from "./Hitable";
import {Ray} from "./Ray";
import {vec3} from "gl-matrix";

import gen from "./SoftwareRenderer"

export abstract class Material{
    
    public abstract scatter(ray:Ray, hit_record:HitRecord, attenuation:vec3, scattered_out:Ray):boolean;
}

export class Lambertian extends Material{
    temp:vec3 = vec3.create();
    albedo:vec3;
    
    constructor(albedo:vec3 = vec3.create()){
        super();
        this.albedo = albedo;
    }
    
    public scatter(ray:Ray, rec:HitRecord, attenuation:vec3, scattered_out:Ray):boolean{
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

    constructor(albedo:vec3 = vec3.create()){
        super();
        this.albedo = albedo;
    }
    
    public scatter(ray:Ray, rec:HitRecord, attenuation:vec3, scattered_out:Ray):boolean{
        vec3.normalize(this.temp,ray.direction);

        vec3.copy(scattered_out.origin, rec.pos);
        scattered_out.direction = reflect(scattered_out.direction,this.temp,rec.normal);
        vec3.copy(attenuation, this.albedo);
        
        return vec3.dot(scattered_out.direction, rec.normal) > 0;
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
    vec3.sub(out, v, vec3.scale(out,n,2*dot));
    return out;
}