let PositionService = require('./PositionService');
let Player = require('./Player.js');
let RemotePlayer = require('./RemotePlayer.js');
let FoodObject = require('./FoodObject.js');
let BuffObject = require('./BuffObject.js');
let MineObject = require('./MineObject.js');
let GrenadeObject = require('./GrenadeObject.js');
let FlagObject = require('./FlagObject.js');

class GameService {
    constructor(engine, socket) {
        this.backgroundSprite = null;
        this.arenaSprite = null;

        this.properties = {
            gameWidth: 12000,
            gameHeight: 12000,
            server_width: 0,
            server_height: 0,
            base_width: 0,
            base_height: 0,
            game_element: "game",
            in_game: false,
            started: false,
            disconnected: false,
        };

        this.enemies = [];
        this.food_list = [];
        this.buff_list = [];
        this.mine_list = [];
        this.grenade_list = [];
        this.engine = engine;
        this.socket = socket;

        this.teams = {
            red: {
                score: 0
            },
            blue: {
                score: 0
            }
        };

        this.red_flag = null;
        this.blue_flag = null;

        this.red_base = null;
        this.blue_base = null;

        this.leaderboard = null;
        this.shield_box = null;
        this.mine_box = null;
        this.grenade_box = null;
        this.rank_box = null;

        this.buffs = {
            shield_increase: null,
            shield_decrease: null,
            speed_increase: null,
            speed_decrease: null,
        };

        this.red_score = null;
        this.blue_score = null;
        this.match_time = null;

        this.can_drop = true;
        this.can_launch = true;

        this.leaderboard_interval = null;
        this.ping_interval = null;
        this.score_interval = null;

        this.bounds = null;
        this.customBounds = null;

        this.map_group = null;

        this.match = {
            timer: null,
            timer_event: null
        };

        this.last_moves = [];
    }

    onConnected() {
        console.log("connected to server");

        this.properties.in_game = true;
        //this.properties.started = false;

        this.item_group = this.engine.add.group();
        this.explision_group = this.engine.add.group();

        // send the server our initial position and tell it we are connected
        this.socket.emit('new-player', {
            username: username ? username : '',
            skin: skin ? skin : ''
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

        player.createMap(this);

        if (window.gameMode === 'ctf') {
            let widthPercent = this.properties.base_width / this.properties.server_width * 100;
            let heightPercent = this.properties.base_height / this.properties.server_height * 100;

            let width = 200 * (widthPercent / 100);
            let height = 200 * (heightPercent / 100);

            let redBase = this.engine.add.graphics(0, 0, this.map_group);
            redBase.beginFill(0xbe0000);
            redBase.drawRoundedRect(0, 0, width, height, 5);
            redBase.alpha = 0.5;

            let blueBase = this.engine.add.graphics(0, 0, this.map_group);
            blueBase.beginFill(0x0000FF);
            blueBase.drawRoundedRect(200 - width, 200 - height, width, height, 5);
            blueBase.alpha = 0.5;
        }
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
        try {
            this.properties.server_width = data.width;
            this.properties.server_height = data.height;
            this.properties.base_width = data.base_width;
            this.properties.base_height = data.base_height;

            player = new Player(data, this);

            //camera follow
            this.engine.camera.x = data.x;
            this.engine.camera.y = data.y;
            this.engine.camera.follow(player.player, Phaser.Camera.FOLLOW_LOCKON, 0.5, 0.5);

            //Create buff boxes
            this.buffs.shield_increase = this.engine.add.group();
            this.buffs.shield_increase.fixedToCamera = true;
            this.buffs.shield_increase.cameraOffset.setTo(240, 20);

            let shieldIncrease = this.engine.add.graphics(0, 0, this.buffs.shield_increase);
            shieldIncrease.beginFill(0x09be00);
            shieldIncrease.drawRoundedRect(0, 0, 40, 40, 5);
            shieldIncrease.alpha = 0.5;

            let shieldIncreaseIcon = this.engine.add.sprite(20, 20, 'shield_increase', this.buffs.shield_increase);
            shieldIncreaseIcon.anchor.setTo(0.5, 0.5);

            shieldIncrease.addChild(shieldIncreaseIcon);

            this.buffs.shield_decrease = this.engine.add.group();
            this.buffs.shield_decrease.fixedToCamera = true;
            this.buffs.shield_decrease.cameraOffset.setTo(240, 20);

            let shieldDecrease = this.engine.add.graphics(0, 0, this.buffs.shield_decrease);
            shieldDecrease.beginFill(0xbe0000);
            shieldDecrease.drawRoundedRect(0, 0, 40, 40, 5);
            shieldDecrease.alpha = 0.5;

            let shieldDecreaseIcon = this.engine.add.sprite(20, 20, 'shield_decrease', this.buffs.shield_decrease);
            shieldDecreaseIcon.anchor.setTo(0.5, 0.5);

            shieldDecrease.addChild(shieldDecreaseIcon);

            this.buffs.speed_increase = this.engine.add.group();
            this.buffs.speed_increase.fixedToCamera = true;
            this.buffs.speed_increase.cameraOffset.setTo(300, 20);

            let speedIncrease = this.engine.add.graphics(0, 0, this.buffs.speed_increase);
            speedIncrease.beginFill(0x09be00);
            speedIncrease.drawRoundedRect(0, 0, 40, 40, 5);
            speedIncrease.alpha = 0.5;

            let speedIncreaseIcon = this.engine.add.sprite(20, 20, 'speed_increase', this.buffs.speed_increase);
            speedIncreaseIcon.anchor.setTo(0.5, 0.5);

            speedIncrease.addChild(speedIncreaseIcon);

            this.buffs.speed_decrease = this.engine.add.group();
            this.buffs.speed_decrease.fixedToCamera = true;
            this.buffs.speed_decrease.cameraOffset.setTo(300, 20);

            let speedDecrease = this.engine.add.graphics(0, 0, this.buffs.speed_decrease);
            speedDecrease.beginFill(0xbe0000);
            speedDecrease.drawRoundedRect(0, 0, 40, 40, 5);
            speedDecrease.alpha = 0.5;

            let speedDecreaseIcon = this.engine.add.sprite(20, 20, 'speed_decrease', this.buffs.speed_decrease);
            speedDecreaseIcon.anchor.setTo(0.5, 0.5);

            speedDecrease.addChild(speedDecreaseIcon);

            this.buffs.shield_increase.visible = false;
            this.buffs.shield_decrease.visible = false;
            this.buffs.speed_increase.visible = false;
            this.buffs.speed_decrease.visible = false;

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

            if (window.gameMode !== 'classic') {
                //Create red score
                this.red_score = this.engine.add.group();
                this.red_score.fixedToCamera = true;
                this.red_score.cameraOffset.setTo(((window.innerWidth * window.devicePixelRatio) / 2) - 125, 20);

                let redScore = this.engine.add.graphics(0, 0, this.red_score);
                redScore.beginFill(0xbe0000);
                redScore.drawRoundedRect(0, 0, 70, 70, 5);
                redScore.alpha = 0.5;

                this.red_score.text = this.engine.add.text(0, 0, '0', {
                    font: "21px Arial",
                    fill: "#ffffff",
                    align: "center"
                }, this.red_score);
                this.red_score.text.setTextBounds(0, 0, 71, 71);
                this.red_score.text.boundsAlignV = 'middle';
                this.red_score.text.boundsAlignH = 'center';

                //Create match timer
                this.match_time = this.engine.add.group();
                this.match_time.fixedToCamera = true;
                this.match_time.cameraOffset.setTo(((window.innerWidth * window.devicePixelRatio) / 2) - 35, 20);

                let matchTime = this.engine.add.graphics(0, 0, this.match_time);
                matchTime.beginFill(0x000000);
                matchTime.drawRoundedRect(0, 0, 70, 70, 5);
                matchTime.alpha = 0.5;

                this.match_time.text = this.engine.add.text(0, 0, '00:00', {
                    font: "21px Arial",
                    fill: "#ffffff",
                    align: "center"
                }, this.match_time);
                this.match_time.text.setTextBounds(0, 0, 71, 71);
                this.match_time.text.boundsAlignV = 'middle';
                this.match_time.text.boundsAlignH = 'center';

                //Create blue score
                this.blue_score = this.engine.add.group();
                this.blue_score.fixedToCamera = true;
                this.blue_score.cameraOffset.setTo(((window.innerWidth * window.devicePixelRatio) / 2) + 55, 20);

                let blueScore = this.engine.add.graphics(0, 0, this.blue_score);
                blueScore.beginFill(0x0000FF);
                blueScore.drawRoundedRect(0, 0, 70, 70, 5);
                blueScore.alpha = 0.5;

                this.blue_score.text = this.engine.add.text(0, 0, '0', {
                    font: "21px Arial",
                    fill: "#ffffff",
                    align: "center"
                }, this.blue_score);
                this.blue_score.text.setTextBounds(0, 0, 71, 71);
                this.blue_score.text.boundsAlignV = 'middle';
                this.blue_score.text.boundsAlignH = 'center';

                let currentTime = (new Date()).getTime();

                let seconds = data.match.total_time - ((currentTime - data.match.start_time) / 1000);

                // Create a custom timer
                this.match.timer = this.engine.time.create();

                // Create a delayed event 1m and 30s from now
                this.match.timer_event = this.match.timer.add(Phaser.Timer.SECOND * seconds, () => {
                    this.match.timer.stop();
                }, this.engine);

                // Start the timer
                this.match.timer.start();

                if (window.gameMode === 'ctf') {
                    try {
                        if (data.match.red_flag) {
                            this.red_flag = new FlagObject(data.match.red_flag, this);

                            if (data.match.red_flag.taken) {
                                this.red_flag.hide();
                            }
                        }

                        if (data.match.blue_flag) {
                            this.blue_flag = new FlagObject(data.match.blue_flag, this);

                            if (data.match.blue_flag.taken) {
                                this.blue_flag.hide();
                            }
                        }

                        this.red_base = this.engine.add.graphics(1000, 1000);
                        this.red_base.beginFill(0xbe0000);
                        this.red_base.drawRoundedRect(0, 0, data.base_width, data.base_height, 5);
                        this.red_base.alpha = 0.5;

                        this.blue_base = this.engine.add.graphics(1000, 1000);
                        this.blue_base.beginFill(0x0000FF);
                        this.blue_base.drawRoundedRect((this.properties.gameWidth - 3000) - data.base_width, (this.properties.gameHeight - 3000) - data.base_height, data.base_width, data.base_height, 5);
                        this.blue_base.alpha = 0.5;

                    } catch (e) {
                        console.error(e);
                    }
                }
            }

            this.latency = 0;
            this.ping_time = 0;

            this.socket.emit('get-leaderboard');
            this.leaderboard_interval = setInterval(() => {
                this.socket.emit('get-leaderboard');
            }, 2000);

            this.ping_interval = setInterval(() => {
                this.socket.emit('last-move');
            }, 10000);

            if (window.gameMode !== 'classic') {
                this.score_interval = setInterval(() => {
                    this.socket.emit('get-score');
                }, 5000);
            }
        } catch (e) {
            console.error(e);
        }
    }

    onPong() {
        this.latency = (new Date()).getTime() - this.ping_time;
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
        try {
            let newEnemy = new RemotePlayer(data.id, data.username, data.skin, data.team, data.x, data.y, data.size, data.angle, data.color, data.shield, data.is_god, this, this.socket);

            this.enemies.push(newEnemy);
        } catch (e) {
            console.error(e);
        }
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

    findBuff(id, returnKey) {
        if (typeof returnKey === 'undefined') returnKey = false;

        for (let i = 0; i < this.buff_list.length; i++) {
            if (this.buff_list[i].id === id) {
                if (returnKey) {
                    return i;
                }

                return this.buff_list[i];
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

        if (PositionService.distanceToPointer(movePlayer.player, newPointer) <= 30) {
            movePlayer.rotation = PositionService.moveToPointer(movePlayer.player, 0, newPointer, 100);
        } else {
            movePlayer.rotation = PositionService.moveToPointer(movePlayer.player, data.speed, newPointer);
        }

        movePlayer.map.x = (movePlayer.player.x / (this.properties.server_width / 220)) - 20;
        movePlayer.map.y = (movePlayer.player.y / (this.properties.server_height / 220)) - 20;

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

        // if (PositionService.distanceToPointer(player.player, newPointer) >= 50) {
        //     player.player.body.x = data.x;
        //     player.player.body.y = data.y;
        // }

        if (player.debugPlayer) {
            player.debugPlayer.x = data.x;
            player.debugPlayer.y = data.y;
        }

        player.rotation = PositionService.moveToPointerPos(player.player, player.speed * 2, {
            x: data.x,
            y: data.y
        });

        // Get the timestamp and player telemetry from the server
        let serverTS = data.ts;

        // Erase all saved moves timestamped before the received server
        // telemetry
        this.last_moves = this.last_moves.filter(savedMove => {
            return savedMove.ts > serverTS;
        });

        // Calculate a reconciled position using the data from the
        // server telemetry as a starting point, and then re-applying
        // the filtered saved moves.
        this.last_moves.forEach(savedMove => {
            player.rotation = PositionService.moveToPointer(player.player, player.speed, savedMove)
        });

        player.speed = data.speed;

        if (this.map_group) {
            player.map.x = (player.player.x / (this.properties.server_width / 220)) - 20;
            player.map.y = (player.player.y / (this.properties.server_height / 220)) - 20;
        }
    }

    onGained(data) {
        player.shield = data.new_shield;

        player.player.graphicsData[0].lineWidth = data.new_shield;

        //create new body
        player.player.body.clearShapes();
        player.player.body.addCircle((player.body_size + (player.shield / 2)), 0, 0);
        player.player.body.data.shapes[0].sensor = true;

        let percent = ((data.new_shield - 10) * 100) / (player.max_shield - 10);

        this.shield_box.text.setText(Math.round(percent) + '%');

        if (player.debugPlayer) {
            player.debugPlayer.graphicsData[0].lineWidth = data.new_shield;
        }
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

    onBuffUpdate(data) {
        if (!this.properties.in_game) {
            return false;
        }

        data.forEach(item => {
            this.buff_list.push(new BuffObject(item.id, item.type, item.x, item.y, item.color, item.size, item.line_size, this));
        });
    }

    onBuffRemove(data) {
        if (!this.properties.in_game) {
            return false;
        }

        let removeItem = this.findBuff(data.id);
        let removeItemKey = this.findBuff(data.id, true);

        if (!removeItem) {
            console.warn('Could not find the buff with the ID ' + data.id);
            return false;
        }

        this.buff_list.splice(this.buff_list.indexOf(removeItem), 1);

        //destroy the phaser object
        removeItem.item.destroy(true, false);
        removeItem.buffIcon.destroy(true, false);
    }


    onItemRemove(data) {
        if (!this.properties.in_game) {
            return false;
        }

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
        if (!this.properties.in_game) {
            return false;
        }

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

    onGetScore(data) {
        if (window.gameMode !== 'classic') {
            this.red_score.text.setText(data.red_score);
            this.blue_score.text.setText(data.blue_score);
        }
    }

    onGetLeaderboard(data) {
        if (!this.properties.in_game) {
            return false;
        }

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
        if (window.gameMode === 'ctf') {
            return false;
        }

        if (data.id === player.id) {
            player.createLeader(this);

            this.enemies.forEach(enemy => {
                enemy.resetMap(this);
            })
        } else {
            player.resetMap();

            this.enemies.forEach(enemy => {
                if (enemy.id === data.id) {
                    enemy.createLeader(this);
                } else {
                    enemy.resetMap(this);
                }
            });
        }
    }

    onStopGodMode(data) {
        if (data.id === player.id) {
            player.god_mode.stop();
            player.player.alpha = 1;
        } else {
            this.enemies.forEach(enemy => {
                if (enemy.id === data.id) {
                    enemy.god_mode.stop();
                    enemy.player.alpha = 1;
                }
            })
        }
    }

    onShowBuff(data) {
        this.buffs[data.type].visible = true;
    }

    onHideBuff(data) {
        this.buffs[data.type].visible = false;
    }

    onFlagPickup(data) {
        this[data.team + '_flag'].hide();

        if (data.user_id === player.id) {
            player.addFlag(this);
        }

        this.enemies.forEach(enemy => {
            if (enemy.id === data.user_id) {
                enemy.addFlag(this);
            }
        });
    }

    onResetFlag(data) {
        this[data.team + '_flag'].x = data.x;
        this[data.team + '_flag'].x = data.x;
        this[data.team + '_flag'].item.x = data.x;
        this[data.team + '_flag'].item.y = data.y;
        this[data.team + '_flag'].item.body.x = data.x;
        this[data.team + '_flag'].item.body.y = data.y;
        this[data.team + '_flag'].repositionMap(this);
        this[data.team + '_flag'].show();

        let team = 'red';
        if (data.team === 'red') {
            team = 'blue';
        }

        if (player.team === team) {
            player.removeFlag(this);
        }

        this.enemies.forEach(enemy => {
            if (enemy.team === team) {
                enemy.removeFlag(this);
            }
        });
    }

    onDropFlag(data) {
        this[data.team + '_flag'].x = data.x;
        this[data.team + '_flag'].x = data.x;
        this[data.team + '_flag'].item.x = data.x;
        this[data.team + '_flag'].item.y = data.y;
        this[data.team + '_flag'].item.body.x = data.x;
        this[data.team + '_flag'].item.body.y = data.y;
        this[data.team + '_flag'].repositionMap(this);
        this[data.team + '_flag'].show();
    }

    onKilled(data) {
        if (player) {
            player.text.destroy();
            player.map.destroy();
            player.player.destroy();

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

                window.aiptag.cmd.display.push(function () {
                    aipDisplayTag.refresh('xplo-io_300x250');
                });

                //ga('set', 'page', '/died');
                //ga('send', 'pageview');
            }, 1000);
        }
    }

    onMatchEnded(data) {
        if (player && this.properties.in_game) {
            player.text.destroy();
            player.map.destroy();
            player.player.destroy();

            jQuery('#red-won').hide();
            jQuery('#blue-won').hide();
            jQuery('#both-won').hide();

            if (data.red_score > data.blue_score) {
                jQuery('#red-won').show();
            } else if (data.red_score < data.blue_score) {
                jQuery('#blue-won').show();
            } else {
                jQuery('#both-won').show();
            }

            jQuery('#red-score').html(data.red_score);
            jQuery('#blue-score').html(data.blue_score);

            if (data.best_player.score) {
                jQuery('#match-ended').find('.username').text(data.best_player.username);
                jQuery('#match-ended').find('.score').text(data.best_player.score);
                jQuery('#match-ended').find('.best-player').show();
            } else {
                jQuery('#match-ended').find('.best-player').hide();
            }

            this.restart();

            this.engine.state.start('BlankStage', true);

            jQuery('#play-button').show();
            jQuery('#loading-button').hide();

            jQuery('#game').fadeOut();
            jQuery('#home').fadeIn();
            jQuery('#login').hide();
            jQuery('#match-ended').fadeIn();

            window.aiptag.cmd.display.push(function () {
                aipDisplayTag.refresh('xplo-io_300x250');
            });

            //ga('set', 'page', '/died');
            //ga('send', 'pageview');
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

        this.buff_list.forEach(item => {
            item.item.destroy();
            if (item.buffIcon) {
                item.buffIcon.destroy();
            }
        });
        this.buff_list = [];

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

        for (let key in this.buffs) {
            if (this.buffs.hasOwnProperty(key)) {
                this.buffs[key].destroy();
            }
        }

        if (window.gameMode !== 'classic') {
            if (this.red_score) {
                this.red_score.destroy();
            }

            if (this.blue_score) {
                this.blue_score.destroy();
            }

            if (this.match_time) {
                this.match_time.destroy();
            }

            this.match.timer = null;
            this.match.timer_event = null;

            if (this.red_base) {
                this.red_base.destroy();
            }

            if (this.blue_base) {
                this.blue_base.destroy();
            }

            if (this.red_flag) {
                if (this.red_flag.item) {
                    this.red_flag.item.destroy();
                    this.red_flag.map.destroy();
                }

                this.red_flag = null;
            }

            if (this.blue_flag) {
                if (this.blue_flag.item) {
                    this.blue_flag.item.destroy();
                    this.blue_flag.map.destroy();
                }

                this.blue_flag = null;
            }
        }

        this.can_drop = true;
        this.can_launch = true;

        clearInterval(this.leaderboard_interval);
        clearInterval(this.ping_interval);
        clearInterval(this.score_interval);
    }
}

module.exports = GameService;