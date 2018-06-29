import {Hitable, HitRecord} from "./Hitable";
import {vec3} from "gl-matrix";
import {Ray} from "./Ray";
import {Material} from "./Material";

export class Sphere extends Hitable {
    private temp: vec3 = vec3.create();

    constructor(public center: vec3, public radius: number, public material:Material) {
        super();
    }

    hit(ray: Ray, t_min: number, t_max: number, rec: HitRecord): boolean {
        let to_sphere = vec3.sub(this.temp, ray.origin, this.center);
        let a = vec3.dot(ray.direction, ray.direction);
        let b = vec3.dot(to_sphere, ray.direction);
        let c = vec3.dot(to_sphere, to_sphere) - this.radius * this.radius;
        let discriminant = b * b - a * c;
        if (discriminant > 0) {
            let temp = (-b - Math.sqrt(discriminant)) / a;
            if (temp < t_max && temp > t_min) {
                rec.t = temp;
                ray.pointAtParameter(rec.pos, rec.t);
                
                rec.normal[0] = (rec.pos[0] - this.center[0]) / this.radius;
                rec.normal[1] = (rec.pos[1] - this.center[1]) / this.radius;
                rec.normal[2] = (rec.pos[2] - this.center[2]) / this.radius;
                
                rec.material = this.material;
                return true;
            }
            temp = (-b + Math.sqrt(discriminant)) / a;
            if (temp < t_max && temp > t_min) {
                rec.t = temp;
                ray.pointAtParameter(rec.pos, rec.t);

                rec.normal[0] = (rec.pos[0] - this.center[0]) / this.radius;
                rec.normal[1] = (rec.pos[1] - this.center[1]) / this.radius;
                rec.normal[2] = (rec.pos[2] - this.center[2]) / this.radius;
                
                rec.material = this.material;
                return true;
            }
        }
        return false;
    }
}
