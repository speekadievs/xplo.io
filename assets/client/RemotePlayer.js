class RemotePlayer {
    constructor(id, username, startx, starty, startSize, start_angle, color, shield, engine, socket){
        this.x = startx;
        this.y = starty;

        //this is the unique socket id. We use it as a unique name for enemy
        this.id = id;
        this.angle = start_angle;

        this.player = engine.add.graphics(this.x, this.y);

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

        // draw a shape
        engine.physics.p2.enableBody(this.player);
        this.player.body.clearShapes();
        this.player.body.addCircle((this.player.body_size + (shield / 2)), 0, 0);
        this.player.body.data.shapes[0].sensor = true;

        let style = {
            font: "14px Arial",
            fill: "#ffffff",
            stroke: '#000000',
            strokeThickness: 4,
            wordWrap: true,
            wordWrapWidth: this.player.width,
            align: "center"
        };

        if(username.length > 30){
            username = username.substr(0, 27)+'...';
        }

        this.text = engine.add.text(startx, starty, username, style);

        this.text.anchor.set(0.5);
    }

    updateTextPos(){
        this.text.position.copyFrom(this.player.position);
    }
}

module.exports = RemotePlayer;