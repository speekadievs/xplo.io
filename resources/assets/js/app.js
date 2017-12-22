require('./bootstrap');
window.utils = require('./helpers');

let app = new Vue({
    el: '#app',
    data: {
        user: {}
    },
});

let game, player;

let properties = {
    width: 20000,
    height: 20000,
    in_game: false,
};

class MainState {
    constructor() {

    }

    preload() {
        this.stage.disableVisibilityChange = true;
        this.scale.scaleMode = Phaser.ScaleManager.RESIZE;
        this.world.setBounds(0, 0, properties.width, properties.height, false, false, false, false);
        this.physics.startSystem(Phaser.Physics.P2JS);
        this.physics.p2.setBoundsToWorld(false, false, false, false, false);
        this.physics.p2.gravity.y = 0;
        this.physics.p2.applyGravity = false;
        this.physics.p2.enableBody(this.physics.p2.walls, false);
        this.camera.follow(player);
        // physics start system
        //game.physics.p2.setImpactEvents(true);

    }

    create() {
        this.stage.backgroundColor = 0xE1A193;
        console.log("client started");
        //socket.on("connect", onsocketConnected);

        game.createPlayer();

        //listen to new enemy connections
        //socket.on("new_enemyPlayer", onNewPlayer);
        //listen to enemy movement
        //socket.on("enemy_move", onEnemyMove);

        // when received remove_player, remove the player passed;
        //socket.on('remove_player', onRemovePlayer);
    }

    update() {
        if (properties.in_game) {
            let pointer = game.input.mousePointer;

            if (utils.distanceToPointer(player, pointer) <= 50) {
                utils.moveToPointer(player, 0, pointer, 100);
            } else {
                utils.moveToPointer(player, 500, pointer);
            }


            //Send a new position data to the server
            //socket.emit('move_player', {x: player.x, y: player.y, angle: player.angle});
        }
    }
}

class Game {

    constructor() {
        this.settings = {
            width: window.innerWidth * window.devicePixelRatio,
            height: window.innerHeight * window.devicePixelRatio
        };

        this.properties = properties;

        this.enemies = collect([]);
        this.mines = collect([]);
        this.bombs = collect([]);
        this.engine = new Phaser.Game(this.settings.width, this.settings.height, Phaser.CANVAS, 'game');

        this.states = {
            main: MainState
        }
    }

    init() {
        this.engine.state.add('main', this.states.main);
        this.engine.state.start('main');
    }

    createPlayer() {
        player = this.engine.add.graphics(0, 0);
        player.radius = 50;

        // set a fill and line style
        player.beginFill(0xffd900);
        player.lineStyle(10, 0xff5900, 10);
        player.drawCircle(0, 0, player.radius * 2);
        player.endFill();
        player.anchor.setTo(0.5, 0.5);
        player.body_size = player.radius;

        // draw a shape
        this.engine.physics.p2.enableBody(player, true);

        player.body.clearShapes();
        player.body.addCircle(player.body_size, 0, 0);
        player.body.data.shapes[0].sensor = true;
        //player.game = this;
    }
}

game = new Game();
game.init();