let PositionService = require('./PositionService');
let RemotePlayer = require('./RemotePlayer.js');
let FoodObject = require('./FoodObject.js');
let MineObject = require('./MineObject.js');
let GrenadeObject = require('./GrenadeObject.js');

class GameService {
    constructor(engine, socket) {
        this.backgroundSprite = null;
        this.arenaSprite = null;

        this.properties = {
            gameWidth: 12000,
            gameHeight: 12000,
            game_element: "game",
            in_game: false,
            started: false,
            disconnected: false,
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
        this.rank_box = null;

        this.can_drop = true;
        this.can_launch = true;

        this.leaderboard_interval = null;
        this.ping_interval = null;

        this.bounds = null;
        this.customBounds = null;

        this.map_group = null;
    }

    onConnected() {
        console.log("connected to server");

        this.properties.in_game = true;
        //this.properties.started = false;

        this.item_group = this.engine.add.group();
        this.explision_group = this.engine.add.group();

        // send the server our initial position and tell it we are connected
        this.socket.emit('new-player', {
            username: username ? username : ''
        });
    }

    createMiniMap() {
        this.map_group = this.engine.add.group();

        this.map_group.fixedToCamera = true;
        this.map_group.cameraOffset.setTo((window.innerWidth * window.devicePixelRatio) - 220, (window.innerHeight * window.devicePixelRatio) - 220);

        let map = this.engine.add.graphics(0, 0, this.map_group);

        // set a fill and line style
        map.beginFill(0x000000);
        map.drawRoundedRect(0, 0, 200, 200, 5);
        map.alpha = 0.5;

        player.map = this.engine.add.graphics(0, 0, this.map_group);
        player.map.beginFill(0x00FF00);
        player.map.drawCircle(0, 0, 5);
        player.map.endFill();
        player.map.anchor.setTo(0.5, 0.5);
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

        if (data.username.length > 30) {
            data.username = username.substr(0, 27) + '...';
        }

        player.text = this.engine.add.text(data.x, data.y, data.username, style);

        player.text.anchor.set(0.5);

        player.updateTextPos = function () {
            this.text.position.copyFrom(this.position);
        };

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

        //Create rank box
        this.rank_box = this.engine.add.group();
        this.rank_box.fixedToCamera = true;
        this.rank_box.cameraOffset.setTo(20, (window.innerHeight * window.devicePixelRatio) - 60);

        let rankBox = this.engine.add.graphics(0, 0, this.rank_box);
        rankBox.beginFill(0x000000);
        rankBox.drawRoundedRect(0, 0, 120, 40, 5);
        rankBox.alpha = 0.5;

        this.rank_box.text = this.engine.add.text(0, 0, '', {
            font: "15px Arial",
            fill: "#ffffff",
            align: "center"
        }, this.rank_box);
        this.rank_box.text.setTextBounds(10, 5, 120, 40);
        this.rank_box.text.boundsAlignV = 'middle';
        this.rank_box.text.boundsAlignH = 'left';

        this.createLeaderboard(data);

        this.createMiniMap();

        this.socket.emit('get-leaderboard');
        this.leaderboard_interval = setInterval(() => {
            this.socket.emit('get-leaderboard');
        }, 2000);

        this.ping_interval = setInterval(() => {
            this.socket.emit('ping');
        }, 10000);
    }

    createLeaderboard(data) {

        /**
         * LINE 1
         */

        this.leaderboard.line_1_left = this.engine.add.text(0, 0, '', {
            font: "12px Arial",
            fill: "#ffffff",
            align: "center"
        }, this.leaderboard);
        this.leaderboard.line_1_left.setTextBounds(10, 40, 180, 20);
        this.leaderboard.line_1_left.boundsAlignH = 'left';

        this.leaderboard.line_1_right = this.engine.add.text(0, 0, '', {
            font: "12px Arial",
            fill: "#ffffff",
            align: "center"
        }, this.leaderboard);
        this.leaderboard.line_1_right.setTextBounds(10, 40, 180, 20);
        this.leaderboard.line_1_right.boundsAlignH = 'right';

        /**
         * LINE 2
         */

        this.leaderboard.line_2_left = this.engine.add.text(0, 0, '', {
            font: "12px Arial",
            fill: "#ffffff",
            align: "center"
        }, this.leaderboard);
        this.leaderboard.line_2_left.setTextBounds(10, 60, 180, 20);
        this.leaderboard.line_2_left.boundsAlignH = 'left';

        this.leaderboard.line_2_right = this.engine.add.text(0, 0, '', {
            font: "12px Arial",
            fill: "#ffffff",
            align: "center"
        }, this.leaderboard);
        this.leaderboard.line_2_right.setTextBounds(10, 60, 180, 20);
        this.leaderboard.line_2_right.boundsAlignH = 'right';

        /**
         * LINE 3
         */

        this.leaderboard.line_3_left = this.engine.add.text(0, 0, '', {
            font: "12px Arial",
            fill: "#ffffff",
            align: "center"
        }, this.leaderboard);
        this.leaderboard.line_3_left.setTextBounds(10, 80, 180, 20);
        this.leaderboard.line_3_left.boundsAlignH = 'left';

        this.leaderboard.line_3_right = this.engine.add.text(0, 0, '', {
            font: "12px Arial",
            fill: "#ffffff",
            align: "center"
        }, this.leaderboard);
        this.leaderboard.line_3_right.setTextBounds(10, 80, 180, 20);
        this.leaderboard.line_3_right.boundsAlignH = 'right';

        /**
         * LINE 4
         */

        this.leaderboard.line_4_left = this.engine.add.text(0, 0, '', {
            font: "12px Arial",
            fill: "#ffffff",
            align: "center"
        }, this.leaderboard);
        this.leaderboard.line_4_left.setTextBounds(10, 100, 180, 20);
        this.leaderboard.line_4_left.boundsAlignH = 'left';

        this.leaderboard.line_4_right = this.engine.add.text(0, 0, '', {
            font: "12px Arial",
            fill: "#ffffff",
            align: "center"
        }, this.leaderboard);
        this.leaderboard.line_4_right.setTextBounds(10, 100, 180, 20);
        this.leaderboard.line_4_right.boundsAlignH = 'right';

        /**
         * LINE 5
         */

        this.leaderboard.line_5_left = this.engine.add.text(0, 0, '', {
            font: "12px Arial",
            fill: "#ffffff",
            align: "center"
        }, this.leaderboard);
        this.leaderboard.line_5_left.setTextBounds(10, 120, 180, 20);
        this.leaderboard.line_5_left.boundsAlignH = 'left';

        this.leaderboard.line_5_right = this.engine.add.text(0, 0, '', {
            font: "12px Arial",
            fill: "#ffffff",
            align: "center"
        }, this.leaderboard);
        this.leaderboard.line_5_right.setTextBounds(10, 120, 180, 20);
        this.leaderboard.line_5_right.boundsAlignH = 'right';

        /**
         * LINE 6
         */

        this.leaderboard.line_6_left = this.engine.add.text(0, 0, '', {
            font: "12px Arial",
            fill: "#ffffff",
            align: "center"
        }, this.leaderboard);
        this.leaderboard.line_6_left.setTextBounds(10, 140, 180, 20);
        this.leaderboard.line_6_left.boundsAlignH = 'left';

        this.leaderboard.line_6_right = this.engine.add.text(0, 0, '', {
            font: "12px Arial",
            fill: "#ffffff",
            align: "center"
        }, this.leaderboard);
        this.leaderboard.line_6_right.setTextBounds(10, 140, 180, 20);
        this.leaderboard.line_6_right.boundsAlignH = 'right';

        /**
         * LINE 7
         */

        this.leaderboard.line_7_left = this.engine.add.text(0, 0, '', {
            font: "12px Arial",
            fill: "#ffffff",
            align: "center"
        }, this.leaderboard);
        this.leaderboard.line_7_left.setTextBounds(10, 160, 180, 20);
        this.leaderboard.line_7_left.boundsAlignH = 'left';

        this.leaderboard.line_7_right = this.engine.add.text(0, 0, '', {
            font: "12px Arial",
            fill: "#ffffff",
            align: "center"
        }, this.leaderboard);
        this.leaderboard.line_7_right.setTextBounds(10, 160, 180, 20);
        this.leaderboard.line_7_right.boundsAlignH = 'right';

        /**
         * LINE 8
         */

        this.leaderboard.line_8_left = this.engine.add.text(0, 0, '', {
            font: "12px Arial",
            fill: "#ffffff",
            align: "center"
        }, this.leaderboard);
        this.leaderboard.line_8_left.setTextBounds(10, 180, 180, 20);
        this.leaderboard.line_8_left.boundsAlignH = 'left';

        this.leaderboard.line_8_right = this.engine.add.text(0, 0, '', {
            font: "12px Arial",
            fill: "#ffffff",
            align: "center"
        }, this.leaderboard);
        this.leaderboard.line_8_right.setTextBounds(10, 180, 180, 20);
        this.leaderboard.line_8_right.boundsAlignH = 'right';

        /**
         * LINE 9
         */

        this.leaderboard.line_9_left = this.engine.add.text(0, 0, '', {
            font: "12px Arial",
            fill: "#ffffff",
            align: "center"
        }, this.leaderboard);
        this.leaderboard.line_9_left.setTextBounds(10, 200, 180, 20);
        this.leaderboard.line_9_left.boundsAlignH = 'left';

        this.leaderboard.line_9_right = this.engine.add.text(0, 0, '', {
            font: "12px Arial",
            fill: "#ffffff",
            align: "center"
        }, this.leaderboard);
        this.leaderboard.line_9_right.setTextBounds(10, 200, 180, 20);
        this.leaderboard.line_9_right.boundsAlignH = 'right';

        /**
         * LINE 10
         */

        this.leaderboard.line_10_left = this.engine.add.text(0, 0, '', {
            font: "12px Arial",
            fill: "#ffffff",
            align: "center"
        }, this.leaderboard);
        this.leaderboard.line_10_left.setTextBounds(10, 220, 180, 20);
        this.leaderboard.line_10_left.boundsAlignH = 'left';

        this.leaderboard.line_10_right = this.engine.add.text(0, 0, '', {
            font: "12px Arial",
            fill: "#ffffff",
            align: "center"
        }, this.leaderboard);
        this.leaderboard.line_10_right.setTextBounds(10, 220, 180, 20);
        this.leaderboard.line_10_right.boundsAlignH = 'right';
    }

    newEnemy(data) {
        let newEnemy = new RemotePlayer(data.id, data.username, data.x, data.y, data.size, data.angle, data.color, data.shield, this, this.socket);

        this.enemies.push(newEnemy);
    }

    findPlayer(id, returnKey) {
        if (typeof returnKey === 'undefined') returnKey = false;

        for (let i = 0; i < this.enemies.length; i++) {
            if (this.enemies[i].id === id) {
                if (returnKey) {
                    return i;
                }

                return this.enemies[i];
            }
        }

        return false;
    }

    findItem(id, returnKey) {
        if (typeof returnKey === 'undefined') returnKey = false;

        for (let i = 0; i < this.food_list.length; i++) {
            if (this.food_list[i].id === id) {
                if (returnKey) {
                    return i;
                }

                return this.food_list[i];
            }
        }

        return false;
    }

    findMine(id, returnKey) {
        if (typeof returnKey === 'undefined') returnKey = false;

        for (let i = 0; i < this.mine_list.length; i++) {
            if (this.mine_list[i].id === id) {
                if (returnKey) {
                    return i;
                }

                return this.mine_list[i];
            }
        }

        return false;
    }

    findGrenade(id, returnKey) {
        if (typeof returnKey === 'undefined') returnKey = false;

        for (let i = 0; i < this.grenade_list.length; i++) {
            if (this.grenade_list[i].id === id) {
                if (returnKey) {
                    return i;
                }

                return this.grenade_list[i];
            }
        }

        return false;
    }

    onEnemyMove(data) {
        if (!this.properties.in_game) {
            return false;
        }

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

        let distance = PositionService.distanceToPointer(movePlayer.player, newPointer);
        let speed = distance / 0.06;

        movePlayer.rotation = PositionService.moveToPointer(movePlayer.player, speed, newPointer);

        

        movePlayer.map.x = (movePlayer.player.x / (10000 / 220)) - 20;
        movePlayer.map.y = (movePlayer.player.y / (10000 / 220)) - 20;

        //check if the server enemy size is not equivalent to the client
        if (data.shield !== movePlayer.player.shield) {
            movePlayer.player.shield = data.shield;

            movePlayer.player.graphicsData[0].lineWidth = data.shield;

            movePlayer.player.body.clearShapes();
            movePlayer.player.body.addCircle((movePlayer.player.size + (data.shield / 2)), 0, 0);
            movePlayer.player.body.data.shapes[0].sensor = true;
        }
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
        let speed = distance / 0.06;

        player.rotation = PositionService.moveToPointer(player, speed, newPointer);

        if (this.map_group) {
            player.map.x = (player.x / (10000 / 220)) - 20;
            player.map.y = (player.y / (10000 / 220)) - 20;
        }
    }

    onGained(data) {
        player.shield = data.new_shield;

        player.graphicsData[0].lineWidth = data.new_shield;

        //create new body
        player.body.clearShapes();
        player.body.addCircle((player.body_size + (player.shield / 2)), 0, 0);
        player.body.data.shapes[0].sensor = true;

        let percent = ((data.new_shield - 10) * 100) / (player.max_shield - 10);

        this.shield_box.text.setText(Math.round(percent) + '%');
    }

    onExplosion(data) {
        if (!this.properties.in_game) {
            return false;
        }

        let object = false;

        if (data.type === 'mine') {
            object = this.findMine(data.id);
        } else if (data.type === 'grenade') {
            object = this.findGrenade(data.id);
        } else {
            return false;
        }


        if (!object) {
            return false;
        }

        let x = object.item.position.x;
        let y = object.item.position.y;

        object.item.kill();

        this.launchExplosion(x, y);

        if (object.item.inCamera) {
            this.engine.camera.shake(0.01, 400);
        }

        if (data.type === 'mine') {
            this.mine_list.splice(this.mine_list.indexOf(object), 1);
        } else {
            this.grenade_list.splice(this.grenade_list.indexOf(object), 1);
        }

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
        if (!this.properties.in_game) {
            return false;
        }

        data.forEach(mine => {
            this.mine_list.push(new MineObject(mine.id, mine.x, mine.y, mine.color, mine.size, mine.line_size, mine.user_id, this.engine));
        });
    }

    onMineRemove(data) {
        if (!this.properties.in_game) {
            return false;
        }

        let removeItem = this.findMine(data.id);

        if (!removeItem) {
            console.warn('Could not find the mine with the ID ' + data.id);
            return false;
        }

        this.mine_list.splice(this.mine_list.indexOf(removeItem), 1);

        //destroy the phaser object
        removeItem.item.destroy(true, false);
    }

    onGrenadeUpdate(data) {
        if (!this.properties.in_game) {
            return false;
        }

        data.forEach(grenade => {
            this.grenade_list.push(new GrenadeObject(grenade.id, grenade.x, grenade.y, grenade.color, grenade.size, grenade.line_size, grenade.user_id, this.engine));
        });
    }

    onGrenadeMove(data) {
        let grenade = this.findGrenade(data.id);

        if (!grenade) {
            return false;
        }

        let newPointer = {
            x: data.x,
            y: data.y,
            worldX: data.x,
            worldY: data.y,
        };

        let distance = PositionService.distanceToPointer(grenade.item, newPointer);
        let speed = distance / 0.06;

        grenade.rotation = PositionService.moveToPointer(grenade.item, speed, newPointer);
    }

    onItemUpdate(data) {
        if (!this.properties.in_game) {
            return false;
        }

        data.forEach(item => {
            this.food_list.push(new FoodObject(item.id, item.type, item.x, item.y, item.color, item.size, item.line_size, this));
        });
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
        if (data.id === player.id) {
            return false;
        }

        let removePlayer = this.findPlayer(data.id);
        // Player not found
        if (!removePlayer) {
            console.log('Player not found: ', data.id);
            return false;
        }

        removePlayer.text.destroy();
        removePlayer.player.destroy();
        removePlayer.map.destroy();

        this.enemies.splice(this.findPlayer(data.id, true), 1);
    }

    onGetLeaderboard(data) {
        for (let i = 0; i < 10; i++) {
            this.leaderboard['line_' + (i + 1) + '_left'].setText('');
            this.leaderboard['line_' + (i + 1) + '_right'].setText('');
        }

        data.leaders.forEach((leader, key) => {
            if (leader.username.length > 17) {
                leader.username = leader.username.substring(0, 17) + '...';
            }

            this.leaderboard['line_' + (key + 1) + '_left'].setText((key + 1) + ': ' + leader.username);
            this.leaderboard['line_' + (key + 1) + '_right'].setText(leader.score);
        });

        this.rank_box.text.setText('Score: ' + data.score);
    }

    onChangeLeader(data) {
        if (data.id === player.id) {
            if (!player.map) {
                return false;
            }

            player.map.destroy();

            if (this.map_group) {
                player.map = this.engine.add.graphics(0, 0, this.map_group);
                player.map.beginFill(0xFFFF00);
                player.map.drawCircle(0, 0, 10);
                player.map.endFill();
                player.map.anchor.setTo(0.5, 0.5);
            }

            this.enemies.forEach(enemy => {
                enemy.resetMap(this);
            })
        } else {
            if (!player.map) {
                return false;
            }

            player.map.destroy();

            if (this.map_group) {
                player.map = this.engine.add.graphics(0, 0, this.map_group);
                player.map.beginFill(0x00FF00);
                player.map.drawCircle(0, 0, 5);
                player.map.endFill();
                player.map.anchor.setTo(0.5, 0.5);
            }

            this.enemies.forEach(enemy => {
                if (enemy.id === data.id) {
                    enemy.createLeader(this);
                } else {
                    enemy.resetMap(this);
                }
            });
        }
    }

    onKilled(data) {
        if (player) {
            player.text.destroy();
            player.map.destroy();
            player.destroy();

            let deadBlock = jQuery('#dead');
            deadBlock.find('.score').text(data.score);

            let aliveTime = (new Date()).getTime() - data.start_time;
            let formatted = moment.utc(aliveTime).format('HH:mm:ss');

            deadBlock.find('.time').text(formatted);

            setTimeout(() => {
                this.restart();

                this.engine.state.start('BlankStage', true);

                jQuery('#play-button').show();
                jQuery('#loading-button').hide();

                jQuery('#game').fadeOut();
                jQuery('#home').fadeIn();
                jQuery('#login').hide();
                jQuery('#dead').fadeIn();
            }, 1000);
        }
    }

    restart() {
        this.properties.in_game = false;

        this.enemies.forEach(enemy => {
            enemy.player.destroy();
            enemy.text.destroy();
            enemy.map.destroy();
        });

        this.enemies = [];

        this.food_list.forEach(item => {
            item.item.destroy();
        });
        this.food_list = [];

        this.mine_list.forEach(item => {
            item.item.destroy();
        });
        this.mine_list = [];

        this.grenade_list.forEach(item => {
            item.item.destroy();
        });
        this.grenade_list = [];

        this.item_group.destroy();

        this.leaderboard.destroy();
        this.shield_box.destroy();
        this.mine_box.destroy();
        this.grenade_box.destroy();

        this.can_drop = true;
        this.can_launch = true;

        clearInterval(this.leaderboard_interval);
        clearInterval(this.ping_interval);
    }
}

module.exports = GameService;