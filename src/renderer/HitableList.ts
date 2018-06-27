import {Hitable, HitRecord} from "./Hitable";
import {Ray} from "./Ray";

export class HitableList extends Hitable {
    public list: Hitable[];
    public list_size: number;
    private temp_rec: HitRecord;

    constructor(list: Hitable[] = []) {
        super();
        this.list = list;
        this.temp_rec = new HitRecord();
    }

    hit(ray: Ray, t_min: number, t_max: number, rec: HitRecord): boolean {
        let hit_anything = false;
        let closest_so_far = t_max;

        for (let hitable of this.list) {
            if (hitable.hit(ray, t_min, closest_so_far, rec)) {
                hit_anything = true;
                closest_so_far = rec.t;
            }
        }
        return hit_anything;
    }
}
