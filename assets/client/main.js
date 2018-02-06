window.jQuery = require('jquery');
window.moment = require('moment');

// Do some front-end stuff

jQuery('#home').fadeIn();


window.player = null;
window.username = '';
window.disconnected = false;

let GameService = require('./GameService.js');

let socket = io({
    transports: ['websocket'],
    upgrade: false
});

socket.on("connected", function () {
    if (disconnected) {
        return false;
    }

    jQuery('#disconnected').hide();
    jQuery('#connecting').hide();
    jQuery('#login').fadeIn();

    let engine = new Phaser.Game((window.innerWidth * window.devicePixelRatio), (window.innerHeight * window.devicePixelRatio), Phaser.CANVAS, 'game');
    let game = new GameService(engine, socket);

    let BlankStage = function (game) {
        // Empty, because stage doesn't need any properties
    };

    BlankStage.prototype = {
        create: function () {
            game.properties.in_game = false;
        }
    };

    let MainStage = function (game) {
        // Empty, because stage doesn't need any properties
    };

    MainStage.prototype = {
        preload: function () {
            engine.stage.disableVisibilityChange = true;
            engine.scale.scaleMode = Phaser.ScaleManager.RESIZE;
            engine.world.setBounds(0, 0, (game.properties.gameWidth - 500), (game.properties.gameHeight - 500), false, false, false, false);
            engine.physics.startSystem(Phaser.Physics.P2JS);
            engine.physics.p2.setBoundsToWorld(true, true, true, true, true);
            engine.physics.p2.gravity.y = 0;
            engine.physics.p2.applyGravity = false;
            engine.physics.p2.enableBody(engine.physics.p2.walls, false);
            // physics start system
            //game.physics.p2.setImpactEvents(true);


            engine.load.image('bg', '/images/bg.png');
            engine.load.image('arena', '/images/arena.png');
            engine.load.image('shield', '/images/shield.png');
            engine.load.spritesheet('explosion', '/images/explosion.png', 128, 128);
            //engine.load.image('doge', '/images/doge.jpg');
        },

        create: function () {
            //game.stage.backgroundColor = 0xE1A193;;


            // keep the spacebar from propogating up to the browser
            this.game.input.keyboard.addKeyCapture([Phaser.Keyboard.SPACEBAR]);

            game.backgroundSprite = engine.add.tileSprite(0, 0, game.properties.gameWidth, game.properties.gameHeight, 'bg');
            game.arenaSprite = engine.add.tileSprite(1000, 1000, game.properties.gameWidth - 3000, game.properties.gameHeight - 3000, 'arena');

            game.onConnected();

            if (!game.started) {
                game.started = true;

                //listen for main player creation
                socket.on("create-player", function (data) {
                    game.createPlayer(data);
                });

                //listen to new enemy connections
                socket.on("new-enemy", function (data) {
                    game.newEnemy(data);
                });

                //listen to enemy movement
                socket.on("enemy-move", function (data) {
                    game.onEnemyMove(data);
                });

                //when received remove_player, remove the player passed;
                socket.on('remove-player', function (data) {
                    game.onRemovePlayer(data);
                });

                //when the player receives the new input
                socket.on('input-received', function (data) {
                    game.onInputReceived(data);
                });

                //when the player gets killed
                socket.on('killed', function (data) {
                    game.onKilled(data)
                });

                //when the player gains in size
                socket.on('gained', function (data) {
                    game.onGained(data);
                });

                //when the player picks up a mine
                socket.on('mine-picked-up', function (data) {
                    game.onMinePickedUp(data);
                });

                //when the player picks up a grenade
                socket.on('grenade-picked-up', function (data) {
                    game.onGrenadePickedUp(data);
                });

                // check for item removal
                socket.on('item-remove', function (data) {
                    game.onItemRemove(data);
                });

                // check for item update
                socket.on('item-update', function (data) {
                    game.onItemUpdate(data);
                });

                socket.on('mine-update', function (data) {
                    game.onMineUpdate(data);
                });

                socket.on('mine-remove', function (data) {
                    game.onMineRemove(data);
                });

                socket.on('grenade-update', function (data) {
                    game.onGrenadeUpdate(data);
                });

                socket.on('grenade-move', function (data) {
                    game.onGrenadeMove(data);
                });

                socket.on('explosion', function (data) {
                    game.onExplosion(data);
                });

                socket.on('get-leaderboard', function (data) {
                    game.onGetLeaderboard(data);
                });

                socket.on('disconnect', function () {
                    window.disconnected = true;

                    jQuery('#game').fadeOut();
                    jQuery('#home').fadeIn();
                    jQuery('#login').hide();
                    jQuery('#disconnected').fadeIn();
                });
            }
        },

        update: function () {
            // emit the player input

            //move the player when the player is made
            if (game.properties.in_game) {

                //we're making a new mouse pointer and sending this input to
                //the server.
                let pointer = engine.input.mousePointer;

                //Send a new position data to the server
                socket.emit('move-pointer', {
                    pointer_x: pointer.x,
                    pointer_y: pointer.y,
                    pointer_worldx: pointer.worldX,
                    pointer_worldy: pointer.worldY,
                });

                if (player) {
                    player.updateTextPos();
                }

                game.enemies.forEach((enemy) => {
                    enemy.updateTextPos();
                });

                // add keyboard controls
                this.wKey = game.engine.input.keyboard.addKey(Phaser.Keyboard.W);
                if (this.wKey.isDown) {
                    if (game.can_drop) {
                        if (player.mines.length) {
                            let mine = player.mines[0];

                            socket.emit('drop-mine', {
                                id: mine.id,
                                pointer_x: pointer.x,
                                pointer_y: pointer.y,
                                pointer_worldx: pointer.worldX,
                                pointer_worldy: pointer.worldY,
                            });

                            player.mines.splice(0, 1);
                            game.mine_box.text.setText(player.mines.length);
                        }
                        game.can_drop = false;
                    }
                } else {
                    game.can_drop = true;
                }

                this.spaceKey = game.engine.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
                if (this.spaceKey.isDown) {
                    if (game.can_launch) {
                        if (player.grenades.length) {
                            let grenade = player.grenades[0];

                            socket.emit('throw-grenade', {
                                id: grenade.id,
                                pointer_x: pointer.x,
                                pointer_y: pointer.y,
                                pointer_worldx: pointer.worldX,
                                pointer_worldy: pointer.worldY,
                            });

                            player.grenades.splice(0, 1);
                            game.grenade_box.text.setText(player.grenades.length);
                        }

                        game.can_launch = false;
                    }
                } else {
                    game.can_launch = true;
                }

                if (game.leaderboard) {
                    engine.world.bringToTop(game.leaderboard);
                }

                if (game.shield_box) {
                    engine.world.bringToTop(game.shield_box);
                }

                if (game.mine_box) {
                    engine.world.bringToTop(game.mine_box);
                }

                if (game.grenade_box) {
                    engine.world.bringToTop(game.grenade_box);
                }
            }
        },
        preRender: function () {
            if (player) {
                player.updateTextPos();

                player.text.updateTransform();
            }

            game.enemies.forEach((enemy) => {
                enemy.updateTextPos();

                enemy.text.updateTransform();
            });
        }
    };

    jQuery(document).on('click', '#play-button', function () {
        let gameElement = jQuery('#game');

        jQuery('#home').fadeOut();
        gameElement.fadeIn();

        if (!game.started) {
            engine.state.add('BlankStage', BlankStage);
            engine.state.add('MainStage', MainStage);
            engine.state.start('MainStage');
        } else {
            engine.state.start('MainStage', true);
        }

        gameElement.find('canvas').attr('width', (window.innerWidth * window.devicePixelRatio))
            .attr('height', (window.innerHeight * window.devicePixelRatio));
    });

    jQuery(document).on('click', '#play-again-button', function () {
        jQuery('#home').fadeIn();
        jQuery('#dead').hide();
        jQuery('#login').fadeIn();
    });

    jQuery(document).on('click', '#reconnect', function () {
        window.location.reload();
    });

    jQuery(document).on('change', '#username', function () {
        window.username = jQuery(this).val();
    });

    jQuery(document).on('click', '#send-feedback', function () {
        let self = jQuery(this);
        let previousText = self.text();

        let type = jQuery('#contacts-type');
        let content = jQuery('#contacts-content');

        self.attr('disabled', true);
        self.html('<i class="fa fa-refresh fa-spin">');

        let postData = {
            type: type.val(),
            content: content.val()
        };

        jQuery.post('/send/feedback', postData, function () {
            self.attr('disabled', false);
            self.html(previousText);

            content.val('');

            jQuery('#contacts-success').show();
            setTimeout(() => {
                jQuery('#contacts-success').fadeOut();
            }, 4000);


        });
    });
});