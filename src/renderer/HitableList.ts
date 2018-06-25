import {Hitable, HitRecord} from "./Hitable";
import {Ray} from "./Ray";
import {vec3} from "gl-matrix";

export class HitableList extends Hitable{
    public list:Hitable[];
    public list_size:number;
    
    constructor(list:Hitable[] = [], size:number = 0){
        super();
        this.list = list;
        this.list_size = size;
    }

    hit(ray: Ray, t_min: number, t_max: number, rec: HitRecord): boolean {
        let temp_rec = new HitRecord();
        let hit_anything = false;
        let closest_so_far = t_max;
        
        for(let hitable of this.list){
            if(hitable.hit(ray,t_min,closest_so_far, temp_rec)){
                hit_anything = true;
                closest_so_far = temp_rec.t;
                rec.t = temp_rec.t;
                vec3.copy(rec.pos,temp_rec.pos);
                vec3.copy(rec.normal,temp_rec.normal);
            }
        }
        return hit_anything;
    }
}