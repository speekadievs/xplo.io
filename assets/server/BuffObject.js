let p2 = require('./p2/p2.js');
let UtilService = require('../UtilService.js');

class BuffObject {
    constructor(max_x, max_y, color, type, id, game) {
        this.x = UtilService.getRandomInt(1050, max_x - 50);
        this.y = UtilService.getRandomInt(1050, max_y - 50);
        this.type = type;
        this.id = id;
        this.color = color;
        this.size = 40;
        this.line_size = 15;
        this.powerup = false;

        this.body = null;
        this.shape = null;
        this.world = game.world;
        this.mode = game.mode;

        this.createBody();
    }

    createBody() {
        this.body = new p2.Body({
            mass: 0,
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
            powerup: this.powerup
        }
    }
}

module.exports = BuffObject;
