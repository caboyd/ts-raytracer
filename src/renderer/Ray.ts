import {vec3} from "gl-matrix";

export class Ray{
    public origin:vec3;
    public direction:vec3;
    
    constructor(origin:vec3 = vec3.create(), direction:vec3 = vec3.create())
    {
        this.origin = origin;
        this.direction = direction;
    }
    
    public pointAtParameter(out:vec3, t:number){
        out[0] = this.origin[0] + t * this.direction[0];
        out[1] = this.origin[1] + t * this.direction[1];
        out[2] = this.origin[2] + t * this.direction[2];
        return out;
    }

}