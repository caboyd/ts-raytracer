import {vec3} from "gl-matrix";
import {Ray} from "./renderer/Ray";
import gen from "./renderer/SoftwareRenderer";

export class Camera {
    public lower_left_corner: vec3 = vec3.create();
    public screen_horizontal: vec3 = vec3.create();
    public screen_vertical: vec3 = vec3.create();

    public position: vec3 = vec3.create();
    public lens_radius: number;

    private temp: vec3 = vec3.create();
    private temp2: vec3 = vec3.create();

    constructor(eye: vec3, target: vec3, up: vec3, vFov: number, aspect: number, aperture: number, focus_dist: number) {
        this.lens_radius = aperture / 2;
        let theta = (vFov * Math.PI) / 180.0;
        let half_height = Math.tan(theta / 2);
        let half_width = aspect * half_height;

        vec3.copy(this.position, eye);
        let target_to_eye = vec3.sub(vec3.create(), eye, target);
        vec3.normalize(target_to_eye, target_to_eye);
        let right = vec3.cross(vec3.create(), up, target_to_eye);
        vec3.normalize(right, right);
        let actual_up = vec3.cross(vec3.create(), target_to_eye, right);

        this.lower_left_corner[0] =
            this.position[0] -
            focus_dist * half_width * right[0] -
            focus_dist * half_height * actual_up[0] -
            focus_dist * target_to_eye[0];
        this.lower_left_corner[1] =
            this.position[1] -
            focus_dist * half_width * right[1] -
            focus_dist * half_height * actual_up[1] -
            focus_dist * target_to_eye[1];
        this.lower_left_corner[2] =
            this.position[2] -
            focus_dist * half_width * right[2] -
            focus_dist * half_height * actual_up[2] -
            focus_dist * target_to_eye[2];

        this.screen_horizontal = vec3.scale(vec3.create(), right, 2 * half_width * focus_dist);
        this.screen_vertical = vec3.scale(vec3.create(), actual_up, 2 * half_height * focus_dist);
    }

    getRay(ray: Ray, u: number, v: number): Ray {
        let rand = this.temp2;
        let offset = this.temp;

        vec3.scale(rand, randomInUnitDisk(rand), this.lens_radius);

        offset[0] = this.screen_horizontal[0] * rand[0] + this.screen_vertical[0] * rand[1];
        offset[1] = this.screen_horizontal[1] * rand[0] + this.screen_vertical[1] * rand[1];
        offset[2] = this.screen_horizontal[2] * rand[0] + this.screen_vertical[2] * rand[1];

        vec3.add(ray.origin, this.position, offset);

        ray.direction[0] =
            this.lower_left_corner[0] +
            u * this.screen_horizontal[0] +
            v * this.screen_vertical[0] -
            this.position[0] -
            offset[0];
        ray.direction[1] =
            this.lower_left_corner[1] +
            u * this.screen_horizontal[1] +
            v * this.screen_vertical[1] -
            this.position[1] -
            offset[1];
        ray.direction[2] =
            this.lower_left_corner[2] +
            u * this.screen_horizontal[2] +
            v * this.screen_vertical[2] -
            this.position[2] -
            offset[2];

        return ray;
    }
}

function randomInUnitDisk(out: vec3): vec3 {
    do {
        vec3.set(out, 2 * gen.nextFloat() - 1, 2 * gen.nextFloat() - 1, 0);
    } while (vec3.dot(out, out) >= 1.0);
    return out;
}
