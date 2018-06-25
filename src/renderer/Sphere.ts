import {Hitable, HitRecord} from "./Hitable";
import {vec3} from "gl-matrix";
import {Ray} from "./Ray";

export class Sphere extends Hitable {
    private temp: vec3 = vec3.create();

    constructor(public center: vec3, public radius: number) {
        super();
    }

    hit(ray: Ray, t_min: number, t_max: number, rec: HitRecord): boolean {
        let to_sphere = vec3.sub(this.temp, ray.origin, this.center);
        let a = vec3.dot(ray.direction, ray.direction);
        let b = vec3.dot(to_sphere, ray.direction);
        let c = vec3.dot(to_sphere, to_sphere) - this.radius * this.radius;
        let discriminant = b * b - a * c;
        if (discriminant > 0) {
            let temp = (-b - Math.sqrt(b * b - a * c)) / a;
            if (temp < t_max && temp > t_min) {
                rec.t = temp;
                ray.pointAtParameter(rec.pos, rec.t);

                vec3.sub(rec.normal, rec.pos, this.center);
                vec3.scale(rec.normal, rec.normal, 1 / this.radius);

                return true;
            }
            temp = (-b + Math.sqrt(b * b - a * c)) / a;
            if (temp < t_max && temp > t_min) {
                rec.t = temp;
                ray.pointAtParameter(rec.pos, rec.t);

                vec3.sub(rec.normal, rec.pos, this.center);
                vec3.scale(rec.normal, rec.normal, 1 / this.radius);

                return true;
            }
        }
    }
}
