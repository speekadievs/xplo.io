let p2 = require('./p2/p2.js');

class TeamBase {
    constructor(max_x, max_y, team, id, game) {

        if (team === 'red') {
            this.x = 1000;
            this.y = 1000;
        } else {
            this.x = max_x;
            this.y = max_y;
        }

        this.type = 'base';
        this.team = team;
        this.id = id;
        this.width = game.properties.base_width;
        this.height = game.properties.base_height;
        this.taken = false;

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

        this.shape = new p2.Box({
            width: (this.width * 2) - 20,
            height: (this.height * 2) - 20
        });

        this.body.addShape(this.shape);

        this.body.game = {
            id: this.id,
            type: 'base',
            mode: this.mode,
            team: this.team
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
            type: 'base',
            id: this.id,
            width: this.width,
            height: this.height,
        }
    }
}

module.exports = TeamBase;