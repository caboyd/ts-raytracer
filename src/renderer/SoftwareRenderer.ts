import {vec3} from "gl-matrix";
import {Ray} from "./Ray";
import {Hitable, HitRecord} from "./Hitable";
import {Sphere} from "./Sphere";
import {HitableList} from "./HitableList";
import {Camera} from "./Camera";
import {Dielectric, Lambertian, Metal} from "./Material";

const random = require('fast-random');

const seed = 1;
const gen = random(seed);
export  default gen;


export class SoftwareRenderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    image_data: ImageData;
   
    ambient_light = vec3.fromValues(0.5,0.7,1.0);
    temp = vec3.create();
    temp_rec = new HitRecord();

    max_ray_bounce = 10;
    num_samples = 64;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d");
        this.image_data = this.ctx.createImageData(this.canvas.width, this.canvas.height);
    }

    public draw(): void {
        let width = this.canvas.width;
        let height = this.canvas.height;

        let color = vec3.create();
        let sum_color = vec3.create();

        let list = Array<Hitable>(5);
        list[0] = new Sphere(vec3.fromValues(0, 0, -1), 0.5, new Lambertian(vec3.fromValues(0.1,0.2,0.5)));
        list[1] = new Sphere(vec3.fromValues(0, -100.5, -1), 100, new Lambertian(vec3.fromValues(0.8,0.8,0.0)));
        list[2] = new Sphere(vec3.fromValues(1, 0, -1), 0.5, new Metal(vec3.fromValues(0.8,0.6,0.2), 0.3));
        list[3] = new Sphere(vec3.fromValues(-1, 0, -1), 0.5, new Dielectric(1.5));
        list[4] = new Sphere(vec3.fromValues(-1, 0, -1), -0.45, new Dielectric(1.5));
        
        let world: Hitable = new HitableList(list);
        let cam = new Camera();
        let ray = new Ray();
        
        //Self Sample
        // for (let s = 0; s < num_samples; s++) {
        //     for (let y = 0; y < height; y++) {
        //         for (let x = 0; x < width; x++) {
        //             this.getPixelv3f(this.image_data, x, y, sum_color);
        //             let u = (x + gen.random()) / width;
        //             let v = 1 - (y + gen.random()) / height;
        //             let ray = cam.getRay(u, v);
        //             ray.pointAtParameter(temp, 2.0);
        //             this.color(color, ray, world);
        //             //vec3.add(sum_color, sum_color, color);
        //             this.colorLERP(sum_color, sum_color, color, 1 / (s + 1));
        //             this.setPixelv3f(this.image_data, x, y, sum_color);
        //         }
        //     }
        //
        //     this.ctx.putImageData(this.image_data, 0, 0);
        // }
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                vec3.set(sum_color, 0, 0, 0);
                for (let s = 0; s < this.num_samples; s++) {
                    let u = (x + gen.nextFloat() - 0.5) / width;
                    let v = 1 - (y + gen.nextFloat() - 0.5) / height;
                    cam.getRay(ray, u, v);
                    //ray.pointAtParameter(temp, 2.0);
                    this.color(color, ray, world);
                    vec3.add(sum_color, sum_color, color);
                }
                vec3.scale(sum_color, sum_color, 1 / this.num_samples);
                vec3.set(sum_color, Math.sqrt(sum_color[0]), Math.sqrt(sum_color[1]), Math.sqrt(sum_color[2]));
                this.setPixelv3f(this.image_data, x, y, sum_color);
            }
        }
        this.ctx.putImageData(this.image_data, 0, 0);
    }

    private color(out: vec3, ray: Ray, world: Hitable): vec3 {
        let frac = vec3.fromValues(1,1,1);
        let attenuation = vec3.create();

        for(let ray_bounce = 0; ray_bounce <= this.max_ray_bounce; ray_bounce++) {
            if (world.hit(ray, 0.001, Number.MAX_VALUE, this.temp_rec)) {
                if(this.temp_rec.material.scatter(ray,ray,this.temp_rec,attenuation)){
                    vec3.mul(frac,frac,attenuation);
                }else{
                    vec3.set(frac,0,0,0);
                }
            } else {
                vec3.copy(this.temp, ray.direction);
                vec3.normalize(this.temp, this.temp);
                let t = 0.5 * (this.temp[1] + 1.0);
                vec3.set(out, (1.0 - t) + t * this.ambient_light[0], (1.0 - t) + t * this.ambient_light[1], (1.0 - t) + t * this.ambient_light[2]);
                break;
            }
        }
        vec3.mul(out,out,frac);
        return out;
    }

    private colorLERP(out_color: vec3, color1: vec3, color2: vec3, t: number): void {
        out_color[0] = color1[0] * (1 - t) + color2[0] * t;
        out_color[1] = color1[1] * (1 - t) + color2[1] * t;
        out_color[2] = color1[2] * (1 - t) + color2[2] * t;
    }

    private setPixelv3f(imageData: ImageData, x: number, y: number, vec: vec3, a = 1.0): void {
        let index = (x + y * imageData.width) * 4;
        imageData.data[index + 0] = vec[0] * 255.99;
        imageData.data[index + 1] = vec[1] * 255.99;
        imageData.data[index + 2] = vec[2] * 255.99;
        imageData.data[index + 3] = a * 255.99;
    }

    private getPixelv3f(imageData: ImageData, x: number, y: number, out_color: vec3): void {
        let index = (x + y * imageData.width) * 4;
        out_color[0] = imageData.data[index + 0] / 255;
        out_color[1] = imageData.data[index + 1] / 255;
        out_color[2] = imageData.data[index + 2] / 255;
    }

    private setPixelf(imageData, x, y, r, g, b, a = 1.0): void {
        let index = (x + y * imageData.width) * 4;
        imageData.data[index + 0] = r * 255.99;
        imageData.data[index + 1] = g * 255.99;
        imageData.data[index + 2] = b * 255.99;
        imageData.data[index + 3] = a * 255.99;
    }

    private setPixel(imageData, x, y, r, g, b, a = 255): void {
        let index = (x + y * imageData.width) * 4;
        imageData.data[index + 0] = r;
        imageData.data[index + 1] = g;
        imageData.data[index + 2] = b;
        imageData.data[index + 3] = a;
    }

    private setPixelv3(imageData: ImageData, x: number, y: number, vec: vec3, a = 255): void {
        let index = (x + y * imageData.width) * 4;
        imageData.data[index + 0] = vec[0];
        imageData.data[index + 1] = vec[1];
        imageData.data[index + 2] = vec[2];
        imageData.data[index + 3] = a;
    }
}
