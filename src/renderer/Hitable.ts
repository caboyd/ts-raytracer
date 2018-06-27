import {vec3} from "gl-matrix";
import {Ray} from "./Ray";
import {Material} from "./Material";

export class HitRecord {
    public material:Material;
    
    constructor(public t: number = 0, public pos: vec3 = vec3.create(), public normal: vec3 = vec3.create()) {
        this.material = null;
    }
    
    clear():void{
        this.t = 0;
        vec3.set(this.pos,0,0,0);
        vec3.set(this.normal,0,0,0);
        this.material = null;
}
}

export abstract class Hitable {
    abstract hit(ray: Ray, t_min: number, t_max: number, rec: HitRecord): boolean;
}
