class RemotePlayer {
    constructor(id, username, skin, team, startx, starty, startSize, start_angle, color, shield, is_god, game, socket) {
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
        this.team = team;
        this.initial_size = startSize;
        this.player.body_size = this.player.radius;
        this.player.type = "player_body";
        this.player.id = this.id;
        this.player.shield = shield;

        this.god_mode = null;
        if (is_god) {
            this.player.alpha = 0;
            this.god_mode = game.engine.add.tween(this.player).to({alpha: 1}, 500, Phaser.Easing.Linear.None, true, 0, 1000, true);
        }

        if (window.gameMode === 'classic') {
            if (skin) {
                if (game.engine.cache.checkImageKey(skin)) {
                    let skin = game.engine.add.sprite(0, 0, skin, this.player);
                    skin.anchor.setTo(0.5, 0.5);

                    this.player.addChild(skin);
                }
            }
        }

        // draw a shape
        game.engine.physics.p2.enableBody(this.player);
        this.player.body.clearShapes();
        this.player.body.addCircle((this.player.body_size + (shield / 2)), 0, 0);
        this.player.body.data.shapes[0].sensor = true;

        // add player to map

        let fill = '0xFF0000';
        if (window.gameMode !== 'classic') {
            if (this.team === 'red') {
                fill = '0xbe0000';
            } else {
                fill = '0x0000FF';
            }
        }

        this.fill = fill;

        if (game.map_group) {
            this.map = game.engine.add.graphics(((this.x / (game.properties.server_width / 220)) - 20), ((this.y / (game.properties.server_height / 220)) - 20), game.map_group);
            this.map.beginFill(this.fill);
            this.map.drawCircle(0, 0, 5);
            this.map.endFill();
            this.map.anchor.setTo(0.5, 0.5);
        }

        this.flag = null;

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
        if (this.map) {
            this.map.destroy();
        }

        if (game.map_group) {
            this.map = game.engine.add.graphics(0, 0, game.map_group);
            this.map.beginFill(this.fill);
            this.map.drawCircle(0, 0, 5);
            this.map.endFill();
            this.map.anchor.setTo(0.5, 0.5);
        }
    }

    flagPickedUp(game) {
        if (this.map) {
            this.map.destroy();
        }

        if (game.map_group) {
            this.map = game.engine.add.graphics(0, 0, game.map_group);
            this.map.beginFill(this.fill);
            this.map.drawCircle(0, 0, 10);
            this.map.endFill();
            this.map.anchor.setTo(0.5, 0.5);
        }
    }

    createLeader(game) {
        if (this.map) {
            this.map.destroy();
        }

        if (game.map_group) {
            this.map = game.engine.add.graphics(0, 0, game.map_group);
            this.map.beginFill(0xFFFF00);
            this.map.drawCircle(0, 0, 10);
            this.map.endFill();
            this.map.anchor.setTo(0.5, 0.5);
        }
    }

    addFlag(game) {
        this.flag = game.engine.add.sprite(0, 0, 'taken_flag', this.player);
        this.flag.anchor.setTo(0.5, 0.5);
        this.player.addChild(this.flag);

        this.flagPickedUp(game);
    }

    removeFlag(game) {
        if (this.flag) {
            this.flag.destroy();
            this.flag = null;

            this.resetMap(game);
        }
    }
}

module.exports = RemotePlayer;