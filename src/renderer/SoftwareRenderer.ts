import {vec3} from "gl-matrix";
import {Ray} from "./Ray";

export class SoftwareRenderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    image_data: ImageData;

    color_temp = vec3.create();
    color_temp2 = vec3.create();

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        this.image_data = this.ctx.createImageData(this.canvas.width, this.canvas.height);
    }

    public draw(): void {
        let vec = vec3.create();
        let width = this.canvas.width;
        let height = this.canvas.height;
        
        let lower_left_corner = vec3.fromValues(-2.0, -1.0, -1.0);
        let horizontal = vec3.fromValues(4,0,0);
        let vertical = vec3.fromValues(0, 2, 0);
        let origin = vec3.fromValues(0,0,0);
        let direction = vec3.create();
        let temp = vec3.create();
        let temp2 = vec3.create();
        let color = vec3.create();
        

        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let u = x/width;
                let v = 1 - y/height;
                vec3.scale(temp,horizontal,u);
                vec3.scale(temp2,vertical,v);
                vec3.add(direction,temp,temp2);
                vec3.add(direction,direction,lower_left_corner);
                let r = new Ray(origin,direction);
                this.color(color, r);
                this.setPixelv3f(this.image_data, x, y, color);
            }
        }
        
        this.ctx.putImageData(this.image_data, 0, 0);
    }
    
    private color(out:vec3, ray:Ray):vec3{
        vec3.copy(out, ray.direction);
        vec3.normalize(out,out);
        let unit_direction = out;
        let t = 0.5 * (unit_direction[1] + 1.0);
        
        vec3.set(this.color_temp, 1,1,1);
        vec3.set(this.color_temp2, 0.5, 0.7, 1.0);
        
        vec3.scale(this.color_temp, this.color_temp,1.0 - t);
        vec3.scale(this.color_temp2, this.color_temp2, t);
        vec3.add(out, this.color_temp, this.color_temp2);
        
        return out;
        
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
