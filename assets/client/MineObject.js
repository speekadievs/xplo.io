class MineObject {
    constructor(id, startx, starty, color, size, line_size, user_id, engine) {
        // unique id for the food.
        //generated in the server with node-uuid
        this.id = id;

        //positinon of the food
        this.posx = startx;
        this.posy = starty;
        this.powerup = false;

        let graphics = engine.add.graphics(startx, starty);
        graphics.radius = size;

        // set a fill and line style
        graphics.beginFill(color);
        graphics.lineStyle(line_size, color, 0.5);
        graphics.drawCircle(0, 0, size);
        graphics.endFill();
        // graphics.beginFill(0xff0000);
        // graphics.drawCircle(0, 0, 5);
        // graphics.endFill();
        graphics.anchor.setTo(0.5, 0.5);

        let redDot = engine.add.graphics(startx, starty);
        redDot.beginFill(0xff0000);
        redDot.drawCircle(0, 0, 5);
        redDot.endFill();

        this.item = engine.add.sprite(this.posx, this.posy, graphics.generateTexture(1, PIXI.scaleModes.LINEAR));
        this.item.anchor.setTo(0.5, 0.5);

        this.red_dot = engine.add.sprite(this.posx, this.posy, redDot.generateTexture(1, PIXI.scaleModes.LINEAR));
        this.red_dot.anchor.setTo(0.5, 0.5);

        //this.item.addChild(this.red_dot);

        engine.add.tween(this.red_dot).to({alpha: 0}, 200, Phaser.Easing.Linear.None, true, 0, 1000, true);

        this.item.type = 'mine';
        this.item.id = id;
        this.item.user_id = user_id;

        engine.physics.p2.enableBody(this.item);
        this.item.body.clearShapes();
        this.item.body_size = size;
        this.item.body.addCircle((size + line_size), 0, 0);
        this.item.body.data.gravityScale = 0;
        this.item.body.data.shapes[0].sensor = true;

        graphics.destroy();
        redDot.destroy();
    }
}

module.exports = MineObject;