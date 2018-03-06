let p2 = require('./p2/p2.js');
let UtilService = require('../UtilService.js');

class FoodObject {
    constructor(max_x, max_y, color, type, id, fixed_x, fixed_y, game) {
        if (typeof fixed_x === 'undefined') {
            fixed_x = false;
        }

        if (typeof fixed_y === 'undefined') {
            fixed_y = false;
        }

        this.x = fixed_x ? fixed_x : UtilService.getRandomInt(1020, max_x - 20);
        this.y = fixed_y ? fixed_y : UtilService.getRandomInt(1020, max_y - 20);
        this.type = type;
        this.id = id;
        this.color = color;
        this.size = 20;
        this.line_size = 10;
        this.mode = game.mode;

        this.body = null;
        this.shape = null;
        this.world = game.world;

        //this.createBody();
    }

    createBody() {
        this.body = null;

        this.body = new p2.Body({
            mass: this.type === 'grenade' || this.type === 'mine' ? 1 : 0,
            position: [this.x, this.y],
            fixedRotation: true,
            collisionResponse: false
        });

        this.shape = new p2.Circle({
            radius: ((this.size + this.line_size) / 2)
        });

        this.body.addShape(this.shape);

        this.body.game = {
            id: this.id,
            type: this.type,
            mode: this.mode,
        };

        this.body.gravityScale = 0;
        this.body.shapes[0].sensor = true;

        if (typeof this.user_id !== 'undefined') {
            this.body.game.user_id = this.user_id;
        }

        this.world.addBody(this.body);
    }

    toJSON() {
        return {
            x: this.x,
            y: this.y,
            type: this.type,
            id: this.id,
            color: this.color,
            size: this.size,
            line_size: this.line_size,
        }
    }
}

module.exports = FoodObject;
