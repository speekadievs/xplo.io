class RemotePlayer {
    constructor(id, username, startx, starty, startSize, start_angle, color, shield, game, socket) {
        this.x = startx;
        this.y = starty;

        //this is the unique socket id. We use it as a unique name for enemy
        this.id = id;
        this.angle = start_angle;

        this.player = game.engine.add.graphics(this.x, this.y);

        //initialize the size with the server value
        this.player.radius = startSize;

        // set a fill and line style
        this.player.beginFill(color);
        this.player.lineStyle(shield, color, 0.5);
        this.player.drawCircle(0, 0, this.player.radius * 2);
        this.player.endFill();
        this.player.anchor.setTo(0.5, 0.5);

        //we set the initial size;
        this.initial_size = startSize;
        this.player.body_size = this.player.radius;
        this.player.type = "player_body";
        this.player.id = this.id;
        this.player.shield = shield;

        this.player.alpha = 0;
        this.god_mode = game.engine.add.tween(this.player).to( { alpha: 1 }, 500, Phaser.Easing.Linear.None, true, 0, 1000, true);

        // draw a shape
        game.engine.physics.p2.enableBody(this.player);
        this.player.body.clearShapes();
        this.player.body.addCircle((this.player.body_size + (shield / 2)), 0, 0);
        this.player.body.data.shapes[0].sensor = true;

        // add player to map

        if (game.map_group) {
            this.map = game.engine.add.graphics(0, 0, game.map_group);
            this.map.beginFill(0xFF0000);
            this.map.drawCircle(0, 0, 5);
            this.map.endFill();
            this.map.anchor.setTo(0.5, 0.5);
        }

        let style = {
            font: "14px Arial",
            fill: "#ffffff",
            stroke: '#000000',
            strokeThickness: 4,
            wordWrap: true,
            wordWrapWidth: this.player.width,
            align: "center"
        };

        if (username.length > 30) {
            username = username.substr(0, 27) + '...';
        }

        this.text = game.engine.add.text(startx, starty, username, style);

        this.text.anchor.set(0.5);
    }

    updateTextPos() {
        this.text.position.copyFrom(this.player.position);
    }

    resetMap(game) {
        if (!this.map) {
            return false;
        }

        this.map.destroy();

        if (game.map_group) {
            this.map = game.engine.add.graphics(0, 0, game.map_group);
            this.map.beginFill(0xFF0000);
            this.map.drawCircle(0, 0, 5);
            this.map.endFill();
            this.map.anchor.setTo(0.5, 0.5);
        }
    }

    createLeader(game) {
        if (!this.map) {
            return false;
        }

        this.map.destroy();

        if (game.map_group) {
            this.map = game.engine.add.graphics(0, 0, game.map_group);
            this.map.beginFill(0xFFFF00);
            this.map.drawCircle(0, 0, 10);
            this.map.endFill();
            this.map.anchor.setTo(0.5, 0.5);
        }
    }
}

module.exports = RemotePlayer;