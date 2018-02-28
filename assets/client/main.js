window.skins = ["abkhazia", "afghanistan", "albania", "algeria", "andorra", "angola", "anguilla", "argentina", "armenia", "aruba", "australia", "austria", "azerbaijan", "bahamas", "bahrain", "bangladesh", "barbados", "belarus", "belgium", "belize", "benin", "bermuda", "bhutan-1", "bhutan", "bolivia", "bonaire", "botswana", "brazil", "british-columbia", "british-virgin-islands", "brunei", "bulgaria", "burkina-faso", "burundi", "cambodia", "cameroon", "canada", "canary-islands", "cape-verde", "cayman-islands", "central-african-republic", "chile", "china", "cocos-island", "colombia", "comoros", "cook-islands", "costa-rica", "croatia", "cuba", "curacao", "cyprus", "czech-republic", "denmark", "doge", "dominica", "dominican-republic", "ecuador", "egypt", "england", "estonia", "ethiopia", "european-union", "fiji", "finland", "france", "gabon", "gambia", "georgia", "germany", "ghana", "greece", "greenland", "grenada", "guam", "guatemala", "guernsey", "guinea", "guyana", "haiti", "hawaii", "honduras", "hong-kong", "hungary", "iceland", "india", "indonesia", "iran", "iraq", "ireland", "israel", "italy", "jamaica", "japan", "jersey", "jordan", "kazakhstan", "kenya", "kiribati", "kosovo", "kuwait", "kyrgyzstan", "laos", "latvia", "lebanon", "lesotho", "liberia", "libya", "liechtenstein", "lithuania", "luxembourg", "madagascar", "malaysia", "maldives", "mali", "malta", "martinique", "mauritania", "mauritius", "melilla", "mexico", "micronesia", "moldova", "monaco", "mongolia", "montenegro", "montserrat", "morocco", "mozambique", "myanmar", "namibia", "nato", "nauru", "nepal", "netherlands", "new-zealand", "nicaragua", "niger", "nigeria", "north-korea", "northen-cyprus", "norway", "oman", "ossetia", "pakistan", "palau", "palestine", "panama", "paraguay", "pepe", "peru", "philippines", "pitcairn-islands", "portugal", "puerto-rico", "qatar", "republic-of-macedonia", "republic-of-poland", "republic-of-the-congo", "romania", "russia", "rwanda", "saba-island", "salvador", "samoa", "san-marino", "sardinia", "saudi-arabia", "scotland", "senegal", "serbia", "seychelles", "singapore", "slovakia", "slovenia", "somalia", "somaliland", "south-africa", "south-korea", "south-sudan", "spain", "sudan", "suriname", "swaziland", "sweden", "switzerland", "syria", "taiwan", "tajikistan", "tanzania", "thailand", "tibet", "togo", "tokelau", "tonga", "transnistria", "tunisia", "turkey", "turkmenistan", "tuvalu", "uganda", "ukraine", "united-arab-emirates", "united-kingdom", "united-nations", "united-states-of-america", "uruguay", "uzbekistn", "vanuatu", "vatican-city", "venezuela", "vietnam", "virgin-islands", "wales", "yemen", "zambia", "zimbabwe"];

window.jQuery = require('jquery');
window.moment = require('moment');

let skinModal = jQuery('#skins');
skins.forEach(skin => {
    skinModal.find('.modal-body').append('<div class="skin-container"><a href="#" data-id="' + skin + '" class="skin"><img src="/images/skins/' + skin + '.png"</a></div>');
});

// Do some front-end stuff

jQuery('#home').fadeIn();


window.player = null;
window.username = '';
window.skin = '';
window.disconnected = false;
window.switchingRegion = false;
window.playClicked = false;
window.playCount = 0;
window.gameMode = 'classic';
window.updateCount = 0;

const customParser = require('socket.io-msgpack-parser');

let UtilService = require('../UtilService.js');
let GameService = require('./GameService.js');

window.chooseRegion = function (region) {
    jQuery('#choose-region').hide();
    jQuery('#connecting').show();

    let socket;

    if (window.location.href.indexOf('xplo.io') !== -1) {
        socket = io('http://' + region + '.xplo.io', {
            transports: ['websocket'],
            parser: customParser,
            upgrade: false
        });
    } else {
        socket = io({
            transports: ['websocket'],
            parser: customParser,
            upgrade: false
        });
    }

    window.changeGameMode = function (mode) {
        socket.emit('change-game-mode', {
            mode: mode
        });

        window.gameMode = mode;
    };

    socket.on("connected", function () {
        if (disconnected) {
            return false;
        }

        jQuery('#disconnected').hide();
        jQuery('#connecting').hide();
        jQuery('#login').fadeIn();

        let engine = new Phaser.Game((window.innerWidth), (window.innerHeight), Phaser.CANVAS, 'game');
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

                engine.load.image('shield_increase', '/images/shield_increase.png');
                engine.load.image('shield_decrease', '/images/shield_decrease.png');
                engine.load.image('speed_increase', '/images/speed_increase.png');
                engine.load.image('speed_decrease', '/images/speed_decrease.png');

                engine.load.image('flag', '/images/flag.png');
                engine.load.image('red_flag', '/images/red_flag.png');
                engine.load.image('blue_flag', '/images/blue_flag.png');
                engine.load.image('red_star', '/images/red_star.png');
                engine.load.image('blue_star', '/images/blue_star.png');
                engine.load.image('taken_flag', '/images/taken_flag.png');

                engine.load.spritesheet('explosion', '/images/explosion.png', 128, 128);
                engine.load.spritesheet('skins', '/images/skins.png', 80, 80);
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

                    socket.on('buff-update', function (data) {
                        game.onBuffUpdate(data);
                    });

                    socket.on('buff-remove', function (data) {
                        game.onBuffRemove(data);
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

                    socket.on('change-leader', function (data) {
                        game.onChangeLeader(data);
                    });

                    socket.on('stop-god-mode', function (data) {
                        game.onStopGodMode(data);
                    });

                    socket.on('show-buff', function (data) {
                        game.onShowBuff(data);
                    });

                    socket.on('hide-buff', function (data) {
                        game.onHideBuff(data);
                    });

                    socket.on('match-ended', function (data) {
                        game.onMatchEnded(data);
                    });

                    socket.on('get-score', function (data) {
                        game.onGetScore(data);
                    });

                    socket.on('flag-pickup', function (data) {
                        game.onFlagPickup(data);
                    });

                    socket.on('reset-flag', function (data) {
                        game.onResetFlag(data);
                    });

                    socket.on('drop-flag', function (data) {
                        game.onDropFlag(data);
                    });

                    socket.on('pong', function (data) {
                        game.onPong(data);
                    });

                    socket.on('disconnect', function () {
                        if (window.switchingRegion) {
                            jQuery('#home').fadeIn();
                            jQuery('#login').hide();
                            jQuery('#connecting').show();

                            window.switchingRegion = false;
                        } else {
                            window.disconnected = true;

                            jQuery('#game').fadeOut();
                            jQuery('#home').fadeIn();
                            jQuery('#login').hide();
                            jQuery('#match-ended').hide();
                            jQuery('#dead').hide();
                            jQuery('#disconnected').fadeIn();

                            window.aiptag.cmd.display.push(function () {
                                aipDisplayTag.refresh('xplo-io_300x250');
                            });
                        }
                    });
                }
            },

            update: function () {
                // emit the player input

                game.ping_time = (new Date()).getTime();
                socket.emit('game-ping');

                //move the player when the player is made
                if (game.properties.in_game) {

                    //we're making a new mouse pointer and sending this input to
                    //the server.
                    let pointer = engine.input.activePointer;

                    let ts = Date.now();

                    //Send a new position data to the server
                    socket.emit('move-pointer', {
                        pointer_x: pointer.x,
                        pointer_y: pointer.y,
                        pointer_worldx: pointer.worldX,
                        pointer_worldy: pointer.worldY,
                        ts: ts
                    });

                    // let newPointer = {
                    //     x: pointer.worldX,
                    //     y: pointer.worldY,
                    //     worldX: pointer.worldX,
                    //     worldY: pointer.worldY,
                    //     ts: ts
                    // };
                    //
                    // if (player) {
                    //     let PositionService = require('./PositionService.js');
                    //
                    //     if (PositionService.distanceToPointer(player.player, newPointer) <= 30) {
                    //         player.rotation = PositionService.moveToPointer(player.player, 0, newPointer, 100);
                    //     } else {
                    //         player.rotation = PositionService.moveToPointer(player.player, player.speed - game.latency, newPointer);
                    //     }
                    //
                    //     if (player.player.body.x <= (1000 + player.initial_size + (player.shield / 2))) {
                    //         player.player.body.x = 1000 + player.initial_size + (player.shield / 2);
                    //     }
                    //
                    //     if (player.player.body.y <= (1000 + player.initial_size + (player.shield / 2))) {
                    //         player.player.body.y = 1000 + player.initial_size + (player.shield / 2);
                    //     }
                    //
                    //     if (player.player.body.x >= (game.properties.server_height - (player.initial_size + (player.shield / 2)))) {
                    //         player.player.body.x = game.properties.server_height - (player.initial_size + (player.shield / 2));
                    //     }
                    //
                    //     if (player.player.body.y >= (game.properties.server_width - (player.initial_size + (player.shield / 2)))) {
                    //         player.player.body.y = game.properties.server_width - (player.initial_size + (player.shield / 2));
                    //     }
                    //
                    //     newPointer.player_x = player.player.body.x;
                    //     newPointer.player_y = player.player.body.y;
                    //
                    //     // add the move to a history of most recent 30 moves
                    //     game.last_moves.push(newPointer);
                    //     while (game.last_moves.length > 30) {
                    //         game.last_moves.shift()
                    //     }
                    // }

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
                            if (!player.flag) {
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
                        }
                    } else {
                        game.can_drop = true;
                    }

                    this.spaceKey = game.engine.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
                    if (this.spaceKey.isDown) {
                        if (game.can_launch) {
                            if (!player.flag) {
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

                    if (game.map_group) {
                        engine.world.bringToTop(game.map_group);
                    }
                }
            },
            render: function () {
                if (window.gameMode !== 'classic') {
                    if (game.match_time && game.match.timer) {
                        if (game.match.timer.running) {
                            game.match_time.text.setText(UtilService.formatTime(Math.round((game.match.timer_event.delay - game.match.timer.ms) / 1000)));
                        } else {
                            game.match_time.text.setText('00:00');
                        }
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

        window.startGame = function () {
            jQuery('#play-button').hide();
            jQuery('#loading-button').show();

            let gameElement = jQuery('#game');

            jQuery('#home').fadeOut();
            gameElement.fadeIn();

            if (playCount) {
                game.restart();
            }

            playCount++;

            if (!game.started) {
                engine.state.add('BlankStage', BlankStage);
                engine.state.add('MainStage', MainStage);
                engine.state.start('MainStage');
            } else {
                engine.state.start('MainStage', true);
            }

            gameElement.find('canvas').attr('width', (window.innerWidth))
                .attr('height', (window.innerHeight));
        };

        jQuery(document).on('click', '#play-button', function () {
            if (window.playCount > 0) {
                if (window.playCount === 1) {
                    aiptag.cmd.player.push(function () {
                        adplayer.startPreRoll();
                    });
                } else {
                    if (window.playCount % 4 === 0) {
                        aiptag.cmd.player.push(function () {
                            adplayer.startPreRoll();
                        });
                    } else {
                        window.startGame();
                    }
                }
            } else {
                window.startGame();
            }

            //ga('set', 'page', '/playing');
            //ga('send', 'pageview');
        });

        jQuery(document).on('click', '.play-again-button', function () {
            jQuery('#home').fadeIn();
            jQuery('#dead').hide();
            jQuery('#match-ended').hide();
            jQuery('#login').fadeIn();

            window.aiptag.cmd.display.push(function () {
                aipDisplayTag.refresh('xplo-io_300x250');
            });

            //ga('set', 'page', '/');
            //ga('send', 'pageview');
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
};