class Player {
    constructor(data, game) {
        this.player = game.engine.add.graphics(data.x, data.y);
        this.radius = data.size;

        // set a fill and line style
        this.player.beginFill(data.color);
        this.player.lineStyle(data.shield, data.color, 0.5);
        this.player.drawCircle(0, 0, this.radius * 2);
        this.player.endFill();
        this.player.anchor.setTo(0.5, 0.5);

        if (window.gameMode === 'classic') {
            if (window.skin) {
                if (window.skins.indexOf(window.skin) !== -1) {
                    if (game.engine.cache.checkImageKey('skins')) {
                        let skin = game.engine.add.sprite(0, 0, 'skins', this.player);
                        skin.anchor.setTo(0.5, 0.5);
                        skin.frame = window.skins.indexOf(window.skin);

                        this.player.addChild(skin);
                    }
                }
            }
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

        if (data.username.length > 30) {
            data.username = username.substr(0, 27) + '...';
        }

        this.text = game.engine.add.text(data.x, data.y, data.username, style);

        this.text.anchor.set(0.5);

        this.body_size = data.size;

        //set the initial size;
        this.id = data.id;
        this.username = data.username;
        this.initial_size = data.size;
        this.type = "player_body";
        this.shield = data.shield;
        this.initial_shield = data.shield;
        this.initial_color = data.color;
        this.max_shield = data.max_shield;
        this.team = data.team;
        this.mines = [];
        this.grenades = [];
        this.flag = null;
        this.speed = 500;

        this.map = null;
        this.fill = '0x00FF00';

        this.player.alpha = 0;
        this.god_mode = game.engine.add.tween(this.player).to({alpha: 1}, 500, Phaser.Easing.Linear.None, true, 0, 1000, true);

        // add body to the shape
        game.engine.physics.p2.enableBody(this.player);
        this.player.body.clearShapes();
        this.player.body.addCircle((this.body_size + (this.shield / 2)), 0, 0);
        this.player.body.data.shapes[0].sensor = true;

        // this.player.body.onBeginContact.add((body, bodyB, shapeA, shapeB, equation) => {
        //     let key = body.sprite.id;
        //     let type = body.sprite.type;
        //
        //     if (type !== 'player_body') {
        //         body.sprite.visible = false;
        //     }
        // }, this);

        this.debugPlayer = game.engine.add.graphics(data.x, data.y);

        // set a fill and line style
        this.debugPlayer.beginFill(0xff0000);
        this.debugPlayer.lineStyle(data.shield, data.color, 0.5);
        this.debugPlayer.drawCircle(0, 0, this.radius * 2);
        this.debugPlayer.endFill();
        this.debugPlayer.anchor.setTo(0.5, 0.5);
    }

    updateTextPos() {
        this.text.position.copyFrom(this.player.position);
    }

    createMap(game) {
        if (this.map) {
            this.map.destroy();
        }

        if (game.map_group) {
            this.map = game.engine.add.graphics(((this.x / (game.properties.server_width / 220)) - 20), ((this.y / (game.properties.server_height / 220)) - 20), game.map_group);
            this.map.beginFill(this.fill);
            this.map.drawCircle(0, 0, 5);
            this.map.endFill();
            this.map.anchor.setTo(0.5, 0.5);
        }
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

module.exports = Player;