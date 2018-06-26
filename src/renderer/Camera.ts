import {vec3} from "gl-matrix";
import {Ray} from "./Ray";

export class Camera{
    public origin:vec3;
    public lower_left_corner:vec3;
    public horizontal:vec3;
    public vertical:vec3;
    
    
    private direction:vec3 = vec3.create();
    private temp:vec3 = vec3.create();
    private temp2:vec3 = vec3.create();
    
    constructor(){
        this.lower_left_corner = vec3.fromValues(-2, -1, -1);
        this.horizontal = vec3.fromValues(4,0,0);
        this.vertical = vec3.fromValues(0,2,0);
        this.origin = vec3.fromValues(0,0,0);
        
       
    }
    
    getRay(u:number , v:number): Ray{
        vec3.scale(this.temp,this.horizontal,u);
        vec3.scale(this.temp2,this.vertical,v);
        vec3.add(this.direction,this.temp,this.temp2);
        vec3.add(this.direction,this.direction,this.lower_left_corner);
        vec3.sub(this.direction,this.direction,this.origin);
        return new Ray(this.origin,this.direction);
    }
    
}