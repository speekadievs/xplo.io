let PositionService = require('./PositionService');
let RemotePlayer = require('./RemotePlayer.js');
let FoodObject = require('./FoodObject.js');
let MineObject = require('./MineObject.js');

class GameService {
    constructor(engine, socket) {
        this.backgroundSprite = null;

        this.properties = {
            gameWidth: 20000,
            gameHeight: 20000,
            game_element: "game",
            in_game: false,
            started: false,
        };

        this.enemies = [];
        this.food_list = [];
        this.mine_list = [];
        this.grenade_list = [];
        this.engine = engine;
        this.socket = socket;

        this.leaderboard = null;
        this.shield_box = null;
        this.mine_box = null;
        this.grenade_box = null;

        this.can_drop = true;
        this.can_launch = true;
    }

    onConnected() {
        console.log("connected to server");

        this.properties.in_game = true;

        this.item_group = this.engine.add.group();
        this.explision_group = this.engine.add.group();

        // send the server our initial position and tell it we are connected
        this.socket.emit('new_player', {
            x: 0,
            y: 0,
            angle: 0,
            username: username
        });
    }

    launchExplosion(x, y) {
        // Get the first dead explosion from the explosionGroup
        let explosion = this.explision_group.getFirstDead();

        // If there aren't any available, create a new one
        if (explosion === null) {
            explosion = this.engine.add.sprite(0, 0, 'explosion');
            explosion.anchor.setTo(0.5, 0.5);

            // Add an animation for the explosion that kills the sprite when the
            // animation is complete
            let animation = explosion.animations.add('boom', [0, 1, 2, 3], 60, false);
            animation.killOnComplete = true;

            // Add the explosion sprite to the group
            this.explision_group.add(explosion);
        }

        // Revive the explosion (set it's alive property to true)
        // You can also define a onRevived event handler in your explosion objects
        // to do stuff when they are revived.
        explosion.revive();

        // Move the explosion to the given coordinates
        explosion.x = x;
        explosion.y = y;

        // Set rotation of the explosion at random for a little variety
        explosion.angle = this.engine.rnd.integerInRange(0, 360);

        // Play the animation
        explosion.animations.play('boom');

        // Return the explosion itself in case we want to do anything else with it
        return explosion;
    }

    createPlayer(data) {
        console.log(data.x, data.y);
        player = this.engine.add.graphics(data.x, data.y);
        player.radius = data.size;

        // set a fill and line style
        player.beginFill(data.color);
        player.lineStyle(data.shield, data.color, 0.5);
        player.drawCircle(0, 0, player.radius * 2);
        player.endFill();
        player.anchor.setTo(0.5, 0.5);

        let style = {
            font: "14px Arial",
            fill: "#ffffff",
            stroke: '#000000',
            strokeThickness: 4,
            wordWrap: true,
            wordWrapWidth: player.width,
            align: "center"
        };

        player.text = this.engine.add.text(data.x, data.y, data.username, style);

        player.text.anchor.set(0.5);

        //this.engine.physics.p2.enableBody(player.text);

        player.body_size = data.size;

        //set the initial size;
        player.id = data.id;
        player.username = data.username;
        player.initial_size = data.size;
        player.type = "player_body";
        player.shield = data.shield;
        player.initial_shield = data.shield;
        player.initial_color = data.color;
        player.max_shield = data.max_shield;
        player.mines = [];
        player.grenades = [];

        // add body to the shape
        this.engine.physics.p2.enableBody(player);
        player.body.clearShapes();
        player.body.addCircle((player.body_size + (player.shield / 2)), 0, 0);
        player.body.data.shapes[0].sensor = true;

        //camera follow
        this.engine.camera.x = data.x;
        this.engine.camera.y = data.y;
        this.engine.camera.follow(player, Phaser.Camera.FOLLOW_LOCKON, 0.5, 0.5);

        //Create leaderboard box
        this.leaderboard = this.engine.add.group();
        this.leaderboard.fixedToCamera = true;
        this.leaderboard.cameraOffset.setTo(20, 20);

        let leaderBoard = this.engine.add.graphics(0, 0, this.leaderboard);
        leaderBoard.beginFill(0x000000);
        leaderBoard.drawRoundedRect(0, 0, 200, 300, 5);
        leaderBoard.alpha = 0.5;

        this.leaderboard.text = this.engine.add.text(0, 0, 'Leaderboard', {
            font: "21px Arial",
            fill: "#ffffff",
            align: "center"
        }, this.leaderboard);
        this.leaderboard.text.setTextBounds(0, 10, 200, 300);
        this.leaderboard.text.boundsAlignV = 'top';
        this.leaderboard.text.boundsAlignH = 'center';

        style.wordWrapWidth = 70;
        style.strokeThickness = 0;

        //Create shield box
        this.shield_box = this.engine.add.group();
        this.shield_box.fixedToCamera = true;
        this.shield_box.cameraOffset.setTo(20, 340);

        let shieldBox = this.engine.add.graphics(0, 0, this.shield_box);
        shieldBox.beginFill(data.food_color);
        shieldBox.drawRoundedRect(0, 0, 70, 70, 5);
        shieldBox.alpha = 0.5;

        this.shield_box.text = this.engine.add.text(0, 0, '0%', {
            font: "21px Arial",
            fill: "#ffffff",
            align: "center"
        }, this.shield_box);
        this.shield_box.text.setTextBounds(0, 0, 71, 71);
        this.shield_box.text.boundsAlignV = 'middle';
        this.shield_box.text.boundsAlignH = 'center';

        //Create mine box
        this.mine_box = this.engine.add.group();
        this.mine_box.fixedToCamera = true;
        this.mine_box.cameraOffset.setTo(20, 430);

        let mineBox = this.engine.add.graphics(0, 0, this.mine_box);
        mineBox.beginFill(data.mine_color);
        mineBox.drawRoundedRect(0, 0, 70, 70, 5);
        mineBox.alpha = 0.5;

        this.mine_box.text = this.engine.add.text(0, 0, '0', {
            font: "21px Arial",
            fill: "#ffffff",
            align: "center"
        }, this.mine_box);
        this.mine_box.text.setTextBounds(0, 0, 71, 71);
        this.mine_box.text.boundsAlignV = 'middle';
        this.mine_box.text.boundsAlignH = 'center';

        //Create grenade box
        this.grenade_box = this.engine.add.group();
        this.grenade_box.fixedToCamera = true;
        this.grenade_box.cameraOffset.setTo(20, 520);

        let grenadeBox = this.engine.add.graphics(0, 0, this.grenade_box);
        grenadeBox.beginFill(data.grenade_color);
        grenadeBox.drawRoundedRect(0, 0, 70, 70, 5);
        grenadeBox.alpha = 0.5;

        this.grenade_box.text = this.engine.add.text(0, 0, '0', {
            font: "21px Arial",
            fill: "#ffffff",
            align: "center"
        }, this.grenade_box);
        this.grenade_box.text.setTextBounds(0, 0, 71, 71);
        this.grenade_box.text.boundsAlignV = 'middle';
        this.grenade_box.text.boundsAlignH = 'center';
    }

    newEnemy(data) {
        let newEnemy = new RemotePlayer(data.id, data.x, data.y, data.size, data.angle, data.color, data.shield, this.engine, this.socket);

        this.enemies.push(newEnemy);
    }

    findPlayer(id) {
        for (let i = 0; i < this.enemies.length; i++) {
            if (this.enemies[i].id === id) {
                return this.enemies[i];
            }
        }

        return false;
    }

    findItem(id) {
        for (let i = 0; i < this.food_list.length; i++) {
            if (this.food_list[i].id === id) {
                return this.food_list[i];
            }
        }

        return false;
    }

    findMine(id) {
        for (let i = 0; i < this.mine_list.length; i++) {
            if (this.mine_list[i].id === id) {
                return this.mine_list[i];
            }
        }

        return false;
    }

    onEnemyMove(data) {
        console.log("moving enemy");

        let movePlayer = this.findPlayer(data.id);

        if (!movePlayer) {
            return;
        }

        let newPointer = {
            x: data.x,
            y: data.y,
            worldX: data.x,
            worldY: data.y,
        };

        //check if the server enemy size is not equivalent to the client
        if (data.shield !== movePlayer.player.shield) {
            movePlayer.player.shield = data.shield;

            movePlayer.player.graphicsData[0].lineWidth = data.shield;

            movePlayer.player.body.clearShapes();
            movePlayer.player.body.addCircle((data.size + (data.shield / 2)), 0, 0);
            movePlayer.player.body.data.shapes[0].sensor = true;
        }

        let distance = PositionService.distanceToPointer(movePlayer.player, newPointer);
        let speed = distance / 0.05;

        movePlayer.rotation = PositionService.moveToPointer(movePlayer.player, speed, newPointer);
    }

    onInputReceived(data) {

        //we're forming a new pointer with the new position
        let newPointer = {
            x: data.x,
            y: data.y,
            worldX: data.x,
            worldY: data.y,
        };

        let distance = PositionService.distanceToPointer(player, newPointer);

        //we're receiving player position every 50ms. We're interpolating
        //between the current position and the new position so that player
        //does jerk.
        let speed = distance / 0.06;

        //move to the new position.
        player.rotation = PositionService.moveToPointer(player, speed, newPointer);
    }

    onGained(data) {
        let difference = data.new_shield - player.shield;

        player.shield = data.new_shield;
        //let new_scale = data.new_size / player.initial_size;

        let sizeChange = setInterval(() => {
            if (player.graphicsData[0].lineWidth > data.new_shield) {
                player.graphicsData[0].lineWidth--;
            } else if (player.graphicsData[0].lineWidth < data.new_shield) {
                player.graphicsData[0].lineWidth++;
            } else {
                clearInterval(sizeChange);
            }
        }, 1);

        //create new body
        player.body.clearShapes();
        player.body.addCircle((player.body_size + (player.shield / 2)), 0, 0);
        player.body.data.shapes[0].sensor = true;

        let percent = ((data.new_shield - 10) * 100) / (player.max_shield - 10);

        this.shield_box.text.setText(Math.round(percent) + '%');
    }

    onExplosion(data) {
        let mine = this.findMine(data.id);

        let x = mine.item.position.x;
        let y = mine.item.position.y;

        mine.item.kill();

        this.launchExplosion(x, y);

        this.mine_list.splice(this.mine_list.indexOf(mine), 1);

        if (typeof data.user_id !== 'undefined') {
            if (data.user_id === player.id) {
                this.onGained(data);
            }
        }
    }

    onMinePickedUp(data) {
        player.mines.push(data.object);

        this.mine_box.text.setText(player.mines.length);
    }

    onGrenadePickedUp(data) {
        player.grenades.push(data.object);

        this.grenade_box.text.setText(player.grenades.length);
    }

    onMineUpdate(data) {
        this.mine_list.push(new MineObject(data.id, data.x, data.y, data.color, data.size, data.line_size, data.user_id, this.engine));
    }

    onItemUpdate(data) {
        this.food_list.push(new FoodObject(data.id, data.type, data.x, data.y, data.color, data.size, data.line_size, this));
    }

    onItemRemove(data) {
        let removeItem = this.findItem(data.id);

        if (!removeItem) {
            console.warn('Could not find the item with the ID ' + data.id);
            return false;
        }

        this.food_list.splice(this.food_list.indexOf(removeItem), 1);

        //destroy the phaser object
        removeItem.item.destroy(true, false);
    }

    onRemovePlayer(data) {
        if(data.id === player.id){
            return false;
        }

        let removePlayer = this.findPlayer(data.id);
        // Player not found
        if (!removePlayer) {
            console.log('Player not found: ', data.id);
            return;
        }

        removePlayer.player.destroy();
        this.enemies.splice(this.enemies.indexOf(removePlayer), 1);
    }

    onKilled() {
        if (player) {
            player.destroy();

            setTimeout(() => {
                this.properties.in_game = false;
                this.engine.state.start('BlankStage', true, true);

                jQuery('#game').fadeOut();
                jQuery('#home').fadeIn();
                jQuery('#login').hide();
                jQuery('#dead').fadeIn();
            }, 1000);
        }
    }
}

module.exports = GameService;