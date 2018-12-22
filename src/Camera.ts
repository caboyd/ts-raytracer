import {quat, vec3} from "gl-matrix";
import {Ray} from "./renderer/Ray";
import gen from "./renderer/SoftwareRenderer";

let temp_quat = quat.create();
const SPEED: number = 5.0;
const SENSITIVITY: number = 0.005;

export enum Camera_Movement {
    FORWARD,
    BACKWARD,
    LEFT,
    RIGHT,
    UP,
}

export class Camera {
    public lower_left_corner: vec3 = vec3.create();
    public screen_horizontal: vec3 = vec3.create();
    public screen_vertical: vec3 = vec3.create();
    public half_width: number;
    public half_height: number;

    public position: vec3 = vec3.create();
    public front: vec3 = vec3.create();
    private right: vec3 = vec3.create();
    private up: vec3 = vec3.create();
    public readonly lens_radius: number;
    private readonly focus_dist: number;

    private world_up: vec3 = vec3.fromValues(0, 1, 0);
    private world_right: vec3 = vec3.fromValues(1, 0, 0);

    private pitch: number;
    private heading: number;

    private orientation: quat = quat.create();

    private temp: vec3 = vec3.create();
    private temp2: vec3 = vec3.create();

    constructor(eye: vec3, target: vec3, up: vec3, vFov: number, aspect: number, aperture: number, focus_dist: number) {
        this.lens_radius = aperture / 2;
        this.focus_dist = focus_dist;
        //conver to radians
        let theta = (vFov * Math.PI) / 180.0;
        this.half_height = Math.tan(theta / 2);
        this.half_width = aspect * this.half_height;

        vec3.copy(this.position, eye);
        
        let target_to_eye = vec3.sub(vec3.create(),eye,target);
        vec3.normalize(target_to_eye,target_to_eye);
        this.pitch = Math.asin(target_to_eye[1]);
        this.heading = -Math.atan2(target_to_eye[0], target_to_eye[2] ) ;

        this.calculateOrientation();
    }

    getRay(ray: Ray, u: number, v: number): Ray {
        let rand = this.temp2;
        let offset = this.temp;

        vec3.scale(rand, randomInUnitDisk(rand), this.lens_radius);

        for (let i = 0; i < 3; i++)
            offset[i] = this.screen_horizontal[i] * rand[0] + this.screen_vertical[i] * rand[1];
        
        vec3.add(ray.origin, this.position, offset);

        //for x,y,z
        for (let i = 0; i < 3; i++)
            ray.direction[i] =
                this.lower_left_corner[i] +
                u * this.screen_horizontal[i] +
                v * this.screen_vertical[i] -
                this.position[i] -
                offset[i];

        return ray;
    }

    public getRight(out: vec3): vec3 {
        quat.conjugate(temp_quat, this.orientation);
        vec3.set(out, 1, 0, 0);
        vec3.transformQuat(out, out, temp_quat);
        return out;
    }

    public getForward(out: vec3): vec3 {
        quat.conjugate(temp_quat, this.orientation);
        vec3.set(out, 0, 0, -1);
        vec3.transformQuat(out, out, temp_quat);
        return out;
    }

    public getUp(out: vec3): vec3 {
        quat.conjugate(temp_quat, this.orientation);
        vec3.set(out, 0, 1, 0);
        vec3.transformQuat(out, out, temp_quat);
        return out;
    }

    public lookAt(target: vec3): void {
        vec3.sub(this.front, target, this.position);
        vec3.normalize(this.front, this.front);
        this.pitch = -Math.asin(this.front[1]);
        this.heading = -(Math.atan2(this.front[0], this.front[2]) - Math.PI);

        this.calculateOrientation();
    }

    public processKeyboard(direction: Camera_Movement, deltaTime: number): void {
        let velocity: number = SPEED * deltaTime;

        this.getForward(this.front);
        this.getRight(this.right);

        if (direction == Camera_Movement.FORWARD) {
            vec3.scaleAndAdd(this.position, this.position, this.front, velocity);
        } else if (direction == Camera_Movement.BACKWARD) {
            vec3.scaleAndAdd(this.position, this.position, this.front, -velocity);
        } else if (direction == Camera_Movement.LEFT) {
            vec3.scaleAndAdd(this.position, this.position, this.right, -velocity);
        } else if (direction == Camera_Movement.RIGHT) {
            vec3.scaleAndAdd(this.position, this.position, this.right, velocity);
        } else if (direction == Camera_Movement.UP) {
            vec3.scaleAndAdd(this.position, this.position, this.world_up, velocity);
        }
        
        this.calculateOrientation();
    }

    public processMouseMovement(xOffset: number, yOffset: number, constrainPitch: boolean = true): void {
        if (xOffset === 0 && yOffset === 0) return;

        xOffset *= SENSITIVITY;
        yOffset *= SENSITIVITY;

        this.heading += xOffset;
        if (this.heading > 2 * Math.PI) this.heading -= 2 * Math.PI;
        if (this.heading < 0) this.heading += 2 * Math.PI;

        this.pitch += yOffset;
        if (this.pitch > Math.PI) this.pitch -= 2 * Math.PI;
        if (this.pitch < -Math.PI) this.pitch += 2 * Math.PI;

        if (constrainPitch) {
            if (this.pitch > Math.PI / 2) this.pitch = Math.PI / 2;
            if (this.pitch < -Math.PI / 2) this.pitch = -Math.PI / 2;
        }

        this.calculateOrientation();
    }

    private calculateOrientation(): void {
        let pitch_quat = quat.setAxisAngle(quat.create(), this.world_right, this.pitch);
        let heading_quat = quat.setAxisAngle(quat.create(), this.world_up, this.heading);

        quat.identity(this.orientation);
        quat.mul(this.orientation, this.orientation, pitch_quat);
        quat.mul(this.orientation, this.orientation, heading_quat);

        this.getForward(this.front);
        this.getRight(this.right);
        this.getUp(this.up);

        //For x,y,z
        //code is cleaner this way
        for (let i = 0; i < 3; i++)
            this.lower_left_corner[i] =
                this.position[i] -
                this.focus_dist * this.half_width * this.right[i] -
                this.focus_dist * this.half_height * this.up[i] +
                this.focus_dist * this.front[i];

        this.screen_horizontal = vec3.scale(vec3.create(), this.right, 2 * this.half_width * this.focus_dist);
        this.screen_vertical = vec3.scale(vec3.create(), this.up, 2 * this.half_height * this.focus_dist);
    }


}

function randomInUnitDisk(out: vec3): vec3 {
    do {
        vec3.set(out, 2 * gen.nextFloat() - 1, 2 * gen.nextFloat() - 1, 0);
    } while (vec3.dot(out, out) >= 1.0);
    return out;
}
