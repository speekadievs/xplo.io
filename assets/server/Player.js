let p2 = require('./p2/p2.js');
let UtilService = require('../UtilService.js');

class Player {
    constructor(id, username, startX, startY, startAngle, game) {
        this.id = id;
        this.username = username;
        this.x = startX;
        this.y = startY;
        this.angle = startAngle;
        this.speed = game.properties.player_speed;
        this.shield = 10;
        this.mines = [];
        this.grenades = [];
        this.buffs = [];
        this.score = 0;
        this.type = 'player';
        this.is_god = true;
        this.team = null;
        this.flag = null;
        this.mode = game.mode;

        this.body = false;
        this.shape = false;

        //We need to intilaize with true.
        this.sendData = true;
        this.size = 40;
        this.dead = false;
        this.color = UtilService.getRandomColor();
        this.start_time = (new Date()).getTime();
        this.last_move = null;
        this.last_ping = null;

        this.world = game.world;

        this.createBody();
    }

    createBody() {
        //create body for the player
        this.body = new p2.Body({
            mass: 1,
            position: [this.x, this.y],
            fixedRotation: true,
            collisionResponse: false
        });

        this.shape = new p2.Circle({
            radius: ((this.size + this.shield) / 2)
        });

        this.body.addShape(this.shape);

        this.body.game = {
            id: this.id,
            type: this.type,
            mode: this.mode,
        };

        this.body.gravityScale = 0;
        this.body.shapes[0].sensor = true;

        this.world.addBody(this.body);
    }

    resizeBody() {
        this.body.removeShape(this.shape);

        this.shape = new p2.Circle({
            radius: ((this.size + this.shield) / 2)
        });

        this.body.addShape(this.shape);
    }

    findMine(id) {
        for (let i = 0; i < this.mines.length; i++) {
            if (this.mines[i].id === id) {
                return this.mines[i];
            }
        }

        return false;
    }

    findGrenade(id) {
        for (let i = 0; i < this.grenades.length; i++) {
            if (this.grenades[i].id === id) {
                return this.grenades[i];
            }
        }

        return false;
    }

    findBuff(id) {
        for (let i = 0; i < this.buffs.length; i++) {
            if (this.buffs[i].id === id) {
                return this.buffs[i];
            }
        }

        return false;
    }

    removeMine(id) {
        let foundKey = -1;

        for (let i = 0; i < this.mines.length; i++) {
            if (this.mines[i].id === id) {
                foundKey = i;
            }
        }

        this.mines.splice(foundKey, 1);

        return foundKey > -1;
    }

    removeGrenade(id) {
        let foundKey = -1;

        for (let i = 0; i < this.grenades.length; i++) {
            if (this.grenades[i].id === id) {
                foundKey = i;
            }
        }

        this.grenades.splice(foundKey, 1);

        return foundKey > -1;
    }
}

module.exports = Player;