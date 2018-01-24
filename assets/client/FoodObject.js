class FoodObject {
    constructor(id, type, startx, starty, color, size, line_size, game){
        // unique id for the food.
        //generated in the server with node-uuid
        this.id = id;

        //positinon of the food
        this.posx = startx;
        this.posy = starty;

        let graphics = game.engine.add.graphics(startx, starty, game.item_group);
        graphics.radius = size;

        // set a fill and line style
        graphics.beginFill(color);
        graphics.lineStyle(line_size, color, 0.5);
        graphics.drawCircle(0, 0, size);
        graphics.endFill();
        graphics.anchor.setTo(0.5, 0.5);

        this.item = game.engine.add.sprite(this.posx, this.posy, graphics.generateTexture(), game.item_group);

        this.item.type = type;
        this.item.id = id;

        game.engine.physics.p2.enableBody(this.item);
        this.item.body.clearShapes();
        this.item.body_size = size;
        this.item.body.addCircle((size + line_size), 0, 0);
        this.item.body.data.gravityScale = 0;
        this.item.body.data.shapes[0].sensor = true;

        graphics.destroy();
    }
}

module.exports = FoodObject;