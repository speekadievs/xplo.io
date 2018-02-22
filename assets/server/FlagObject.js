let p2 = require('./p2/p2.js');

class FlagObject {
    constructor(max_x, max_y, team, id, game) {

        if (team === 'red') {
            this.x = 1400;
            this.y = 1400;
        } else {
            this.x = max_x - 400;
            this.y = max_y - 400;
        }

        this.max_x = max_x;
        this.max_y = max_y;

        this.team = team;
        this.id = id;
        this.size = 55;
        this.line_size = 20;
        this.taken = false;
        this.type = 'flag';

        this.body = null;
        this.shape = null;
        this.world = game.world;
        this.mode = game.mode;
        this.game = game;

        this.createBody();
    }

    queueCreateBody() {
        this.game.creatable_bodies.push(this.id);
    }

    createBody() {
        this.body = new p2.Body({
            mass: 0,
            position: [this.x, this.y],
            fixedRotation: true,
            collisionResponse: false
        });

        this.shape = new p2.Box({
            width: 70,
            height: 80,
        });

        this.body.addShape(this.shape);

        this.body.game = {
            id: this.id,
            type: 'flag',
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

    removeBody() {
        this.game.removable_bodies.push(this.body);
    }

    resetPosition() {
        if (this.team === 'red') {
            this.x = 1400;
            this.y = 1400;
        } else {
            this.x = this.max_x - 400;
            this.y = this.max_y - 400;
        }
    }

    drop(x, y) {
        this.taken = false;
        this.user_id = 0;
        this.x = x;
        this.y = y;
        this.queueCreateBody();
    }

    isInBase() {
        let inBase = true;

        if (this.team === 'red') {
            if (this.x !== 1400) {
                inBase = false;
            }

            if (this.y !== 1400) {
                inBase = false;
            }
        } else {
            if (this.x !== this.max_x - 400) {
                inBase = false;
            }

            if (this.y !== this.max_y - 400) {
                inBase = false;
            }
        }

        return inBase;
    }

    toJSON() {
        return {
            x: this.x,
            y: this.y,
            type: 'flag',
            id: this.id,
            size: this.size,
            line_size: this.line_size,
            team: this.team,
            taken: this.taken,
        }
    }
}

module.exports = FlagObject;