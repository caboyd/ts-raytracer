import {vec3} from "gl-matrix";

export enum MatType {
    Diffuse = 0,
    Reflect = 1,
    Refract = 2
}

export class Material {
    type:MatType
    diffuse: vec3;
    reflect: vec3;
    fuzz:number;
    refraction_index:number

    constructor(type: MatType, color: vec3, modifier?:number) {
        this.type = type;
        switch (type) {
            case MatType.Diffuse:
                this.diffuse = color;
                break;
            case MatType.Reflect:
                this.reflect = color;
                this.fuzz = modifier;
                break;
            case MatType.Refract:
                this.refraction_index= modifier;
                break;
        }
    }
}
