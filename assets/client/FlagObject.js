class FlagObject {
    constructor(data, game) {
        this.id = data.id;

        this.x = data.x;
        this.y = data.y;

        let graphics = game.engine.add.graphics(data.x, data.y, game.item_group);
        graphics.radius = data.size;

        let color = '0xbe0000';
        if (data.team === 'blue') {
            color = '0x0000FF';
        }

        // set a fill and line style
        graphics.beginFill(color);
        graphics.lineStyle(data.line_size, color, 0.5);
        graphics.drawCircle(0, 0, data.size);
        graphics.endFill();
        graphics.anchor.setTo(0.5, 0.5);

        this.item = game.engine.add.sprite(this.x, this.y, data.team + '_flag', game.item_group);

        this.item.alpha = 0;

        game.engine.add.tween(this.item).to({alpha: 1}, 1000, Phaser.Easing.Linear.None, true, 0);

        this.item.type = 'flag';
        this.item.id = data.id;

        game.engine.physics.p2.enableBody(this.item);
        this.item.body.clearShapes();
        this.item.body_size = data.size;
        this.item.body.addCircle((data.size + data.line_size), 0, 0);
        this.item.body.data.gravityScale = 0;
        this.item.body.data.shapes[0].sensor = true;

        graphics.destroy();

        this.map = null;
        if (game.map_group) {
            this.map = game.engine.add.sprite(((this.x / (game.properties.server_width / 220)) - 20), ((this.y / (game.properties.server_height / 220)) - 20), data.team + '_star', '', game.map_group);
            this.map.anchor.setTo(0.5, 0.5)
        }
    }

    repositionMap(game) {
        if (this.map) {
            this.map.x = (this.x / (game.properties.server_width / 220)) - 20;
            this.map.y = (this.y / (game.properties.server_width / 220)) - 20;
        }
    }

    hide() {
        this.item.visible = false;
        if (this.map) {
            this.map.visible = false;
        }
    }

    show() {
        this.item.visible = true;
        if (this.map) {
            this.map.visible = true;
        }
    }
}

module.exports = FlagObject;