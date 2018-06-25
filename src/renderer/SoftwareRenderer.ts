import {vec3} from "gl-matrix";
import {Ray} from "./Ray";
import {Hitable, HitRecord} from "./Hitable";
import {Sphere} from "./Sphere";
import {HitableList} from "./HitableList";

export class SoftwareRenderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    image_data: ImageData;

   temp_rec = new HitRecord();
    temp = vec3.create();
    temp2 = vec3.create();
    sphere_pos = vec3.fromValues(0,0,-1);

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        this.image_data = this.ctx.createImageData(this.canvas.width, this.canvas.height);
    }

    public draw(): void {
        let width = this.canvas.width;
        let height = this.canvas.height;
        
        let lower_left_corner = vec3.fromValues(-2.0, -1.0, -1.0);
        let horizontal = vec3.fromValues(4,0,0);
        let vertical = vec3.fromValues(0, 2, 0);
        let origin = vec3.fromValues(0,0,0);
        let direction = vec3.create();
        let color = vec3.create();
        
        let list = Array<Hitable>(2);
        list[0] = new Sphere(vec3.fromValues(0,0,-1),0.5);
        list[1] = new Sphere(vec3.fromValues(0,-100.5,-1),100);
        let world:Hitable = new HitableList(list,2);
        
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let u = x/width;
                let v = 1 - y/height;
                vec3.scale(this.temp,horizontal,u);
                vec3.scale(this.temp2,vertical,v);
                vec3.add(direction,this.temp,this.temp2);
                vec3.add(direction,direction,lower_left_corner);
                let r = new Ray(origin,direction);
                this.color(color, r, world);
                this.setPixelv3f(this.image_data, x, y, color);
            }
        }
        
        this.ctx.putImageData(this.image_data, 0, 0);
    }
    
    private color(out:vec3, ray:Ray, world:Hitable):vec3{
        this.temp_rec.clear();
        
        if(world.hit(ray, 0.0, Number.MAX_VALUE, this.temp_rec)){
            vec3.copy(out, this.temp_rec.normal);
            vec3.set(out, out[0] + 1, out[1] + 1, out[2] + 1);
            vec3.scale(out, out, 0.5);
            return out;
        }else{
            vec3.copy(out, ray.direction);
            vec3.normalize(out,out);
            let unit_direction = out;
            let t = 0.5 * (unit_direction[1] + 1.0);
            vec3.set(this.temp, 1,1,1);
            vec3.set(this.temp2, 0.5, 0.7, 1.0);
            vec3.scale(this.temp, this.temp,1.0 - t);
            vec3.scale(this.temp2, this.temp2, t);
            vec3.add(out, this.temp, this.temp2);
            return out;
        }
        
    }
    

    
    private setPixelv3f(imageData:ImageData, x:number, y:number, vec:vec3, a = 1.0):void{
        let index = (x + y * imageData.width) * 4;
        imageData.data[index + 0] = vec[0] * 255.99;
        imageData.data[index + 1] = vec[1] * 255.99;
        imageData.data[index + 2] = vec[2] * 255.99;
        imageData.data[index + 3] = a * 255.99;
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

    private setPixelv3(imageData:ImageData, x:number, y:number, vec:vec3, a = 255):void{
        let index = (x + y * imageData.width) * 4;
        imageData.data[index + 0] = vec[0];
        imageData.data[index + 1] = vec[1];
        imageData.data[index + 2] = vec[2];
        imageData.data[index + 3] = a;
    }
}
