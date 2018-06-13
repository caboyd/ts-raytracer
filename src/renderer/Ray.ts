import {vec3} from "gl-matrix";

export class Ray{
    private _origin:vec3;
    private _direction:vec3;
    
    constructor(origin:vec3, directon:vec3)
    {
        this._origin = origin;
        this._direction = directon;
    }
    
    public pointAtParameter(out:vec3, t:number){
        out[0] = this.origin[0] + t * this.direction[0];
        out[1] = this.origin[1] + t * this.direction[1];
        out[2] = this.origin[2] + t * this.direction[2];
        return out;
    }
    
    get origin(){
        return this._origin;
    }
    
    get direction(){
        return this._direction;
    }
}