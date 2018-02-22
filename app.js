let cluster = require('cluster');

if (cluster.isMaster) {
    let numWorkers = 1; //require('os').cpus().length;

    console.log('Master cluster setting up ' + numWorkers + ' workers...');

    for (let i = 0; i < numWorkers; i++) {
        cluster.fork();
    }

    cluster.on('online', function (worker) {
        console.log('Worker ' + worker.process.pid + ' is online');
    });

    cluster.on('exit', function (worker, code, signal) {
        console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
        console.log('Starting a new worker');
        cluster.fork();
    });

} else {

    let _ = require('lodash');

    let express = require('express');
    let bodyParser = require('body-parser');
    let nodemailer = require('nodemailer');
    let mg = require('nodemailer-mailgun-transport');
    let unique = require('node-uuid');

    let redis = require("redis");
    let client = redis.createClient({
        host: process.env.REDIS_HOST ? process.env.REDIS_HOST : '127.0.0.1',
        port: process.env.REDIS_PORT ? process.env.REDIS_PORT : 6379
    });

    client.on("error", function (err) {
        console.log("Redis Error " + err);
        client = false;
    });

//require p2 physics library in the server.
    let p2 = require('./assets/server/p2/p2.js');

    let app = express();

    let server = require('http').Server(app);

    app.use(bodyParser.urlencoded({
        extended: true
    }));

    app.use('/js', express.static(__dirname + '/public/js'));
    app.use('/images', express.static(__dirname + '/public/images'));
    app.use('/css', express.static(__dirname + '/public/css'));

    app.get('/favicon.ico', function (req, res) {
        res.sendFile(__dirname + '/public/favicon.ico');
    });

    app.get('/xplo-banner', function (req, res) {
        res.sendFile(__dirname + '/public/xplo-banner.html');
    });

    app.get('/xplo-player', function (req, res) {
        res.sendFile(__dirname + '/public/xplo-player.html');
    });

    app.get('/', function (req, res) {
        res.sendFile(__dirname + '/public/index.html');
    });

    app.get('/privacy', function (req, res) {
        res.sendFile(__dirname + '/public/privacy.html');
    });

    app.get('/load/highscore', function (req, res) {
        if (client) {
            client.get("highscores", (err, reply) => {
                res.send(reply ? JSON.parse(reply) : []);
            });
        } else {
            res.send([]);
        }
    });

    app.post('/send/feedback', function (request, response) {
        let type = request.body.type;
        let content = request.body.content;

        if (type === 'bug' || type === 'feature' || type === 'other') {
            if (content !== '' && content.trim()) {

                let auth = {
                    auth: {
                        api_key: 'key-5d96f686894f5908c19a501c653dfae9',
                        domain: 'sandbox38e2cc37886942e697164b0cf8d07251.mailgun.org'
                    }
                };

                let transporter = nodemailer.createTransport(mg(auth));

                let mailOptions = {
                    from: 'ar4ix8@gmail.com',
                    to: 'ar4ix8@gmail.com',
                    subject: 'XPLO.IO - ' + type.toUpperCase(),
                    text: content
                };

                transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        console.log(error);
                    }
                });
            }
        }

        response.send({
            status: 'success'
        });
    });

    let UtilService = require('./assets/UtilService.js');
    let PositionService = require('./assets/server/PositionService');
    let GameService = require('./assets/server/GameService.js');
    let Player = require('./assets/server/Player.js');
    let FlagObject = require('./assets/server/FlagObject.js');

    const customParser = require('socket.io-msgpack-parser');

// io connection
    let io = require('socket.io')(server, {
        parser: customParser
    });

//the physics world in the server. This is where all the physics happens.
//we set gravity to 0 since we are just following mouse pointers.
    let world = new p2.World({
        gravity: [0, 0]
    });

    world.on('beginContact', (e) => {
        let firstBody = e.bodyA;
        let secondBody = e.bodyB;

        if (firstBody.game.mode !== secondBody.game.mode) {
            return false;
        }

        let game = games[firstBody.game.mode];

        let object = null;
        let player = null;
        let objectBody = null;
        let playerBody = null;

        if (firstBody.game.type === 'player') {
            player = game.findPlayer(firstBody.game.id);
            playerBody = firstBody;
        } else if (firstBody.game.type === 'shield-pickup' || firstBody.game.type === 'mine-pickup' || firstBody.game.type === 'grenade-pickup') {
            object = game.findItem(firstBody.game.id);
            objectBody = firstBody;
        } else if (firstBody.game.type === 'mine') {
            object = game.findMine(firstBody.game.id);
            objectBody = firstBody;
        } else if (firstBody.game.type === 'grenade') {
            object = game.findGrenade(firstBody.game.id);
            objectBody = firstBody;
        } else if (firstBody.game.type === 'flag') {
            object = game.teams[firstBody.game.team].flag;
            objectBody = firstBody;
        } else if (firstBody.game.type === 'base') {
            object = game.teams[firstBody.game.team].base;
            objectBody = firstBody;
        } else {
            let buff = _.find(game.buffs, (buff) => {
                return buff.type === firstBody.game.type;
            });

            if (buff) {
                object = game.findBuff(firstBody.game.id);
                objectBody = firstBody;
            }
        }

        if (secondBody.game.type === 'player') {
            player = game.findPlayer(secondBody.game.id);
            playerBody = secondBody;
        } else if (secondBody.game.type === 'shield-pickup' || secondBody.game.type === 'mine-pickup' || secondBody.game.type === 'grenade-pickup') {
            object = game.findItem(secondBody.game.id);
            objectBody = secondBody;
        } else if (secondBody.game.type === 'mine') {
            object = game.findMine(secondBody.game.id);
            objectBody = secondBody;
        } else if (secondBody.game.type === 'grenade') {
            object = game.findGrenade(secondBody.game.id);
            objectBody = secondBody;
        } else if (secondBody.game.type === 'flag') {
            object = game.teams[secondBody.game.team].flag;
            objectBody = secondBody;
        } else if (secondBody.game.type === 'base') {
            object = game.teams[secondBody.game.team].base;
            objectBody = secondBody;
        } else {
            let buff = _.find(game.buffs, (buff) => {
                return buff.type === secondBody.game.type;
            });

            if (buff) {
                object = game.findBuff(secondBody.game.id);
                objectBody = secondBody;
            }
        }

        if (!object) {
            return false;
        }

        if (!player) {
            return false;
        }

        let socket = game.io.sockets.connected[player.id];

        if (!socket) {
            return false;
        }

        if (object.type !== 'mine' && object.type !== 'grenade') {
            let buff = _.find(game.buffs, (buff) => {
                return buff.type === object.type;
            });

            if (buff) {
                let activeBuff = _.find(player.buffs, (activeBuff) => {
                    return activeBuff.user_id === player.id && activeBuff.type === buff.type;
                });

                if (activeBuff) {
                    activeBuff.start_time = (new Date()).getTime();
                } else {
                    if (buff.type === 'shield_increase') {
                        let oppositeBuff = _.findIndex(player.buffs, (activeBuff) => {
                            return activeBuff.user_id === player.id && activeBuff.type === 'shield_decrease'
                        });

                        if (oppositeBuff > -1) {
                            player.shield = player.old_decrease_shield;
                            player.old_decrease_shield = false;

                            player.buffs.splice(oppositeBuff, 1);

                            socket.emit('hide-buff', {
                                type: 'shield_decrease'
                            });
                        }

                        if (!player.old_increase_shield) {
                            player.old_increase_shield = player.shield;
                        }

                        player.shield = game.properties.max_shield * 2 - 10;

                        game.resizable_bodies.push(player.id);

                        socket.emit("gained", {
                            new_size: player.size,
                            new_shield: player.shield
                        });

                    } else if (buff.type === 'shield_decrease') {
                        let oppositeBuff = _.findIndex(player.buffs, (activeBuff) => {
                            return activeBuff.user_id === player.id && activeBuff.type === 'shield_increase'
                        });

                        if (oppositeBuff > -1) {
                            player.shield = player.old_increase_shield;
                            player.old_increase_shield = false;

                            player.buffs.splice(oppositeBuff, 1);

                            socket.emit('hide-buff', {
                                type: 'shield_increase'
                            });
                        }

                        if (!player.old_decrease_shield) {
                            player.old_decrease_shield = player.shield;
                        }

                        player.shield = 10;

                        game.resizable_bodies.push(player.id);

                        socket.emit("gained", {
                            new_size: player.size,
                            new_shield: player.shield
                        });
                    } else if (buff.type === 'speed_increase') {
                        let oppositeBuff = _.findIndex(player.buffs, (activeBuff) => {
                            return activeBuff.type === 'speed_decrease'
                        });

                        if (oppositeBuff > -1) {
                            player.speed = game.properties.player_speed;

                            player.buffs.splice(oppositeBuff, 1);

                            socket.emit('hide-buff', {
                                type: 'speed_decrease'
                            });
                        }

                        player.speed = player.speed + 300;

                    } else if (buff.type === 'speed_decrease') {
                        let oppositeBuff = _.findIndex(player.buffs, (activeBuff) => {
                            return activeBuff.type === 'speed_increase'
                        });

                        if (oppositeBuff > -1) {
                            player.speed = game.properties.player_speed;

                            player.buffs.splice(oppositeBuff, 1);

                            socket.emit('hide-buff', {
                                type: 'speed_increase'
                            });
                        }

                        player.speed = player.speed - 300;
                    }

                    object.user_id = player.id;
                    object.start_time = (new Date()).getTime();
                    object.time = buff.time;

                    player.buffs.push(object);

                    socket.emit('show-buff', {
                        type: object.type
                    });
                }

                game.buff_list.splice(game.findBuff(object.id, true), 1);

                game.io.to(game.mode).emit('buff-remove', object);

                game.removable_bodies.push(objectBody);

            } else {
                if (object.type === 'base' || object.type === 'flag') {
                    if (object.type === 'base') {
                        if (player.flag) {
                            if (player.flag.team !== object.team) {
                                let oppositeTeam = 'red';
                                if (player.team === oppositeTeam) {
                                    oppositeTeam = 'blue';
                                }

                                game.teams[player.team].score++;
                                game.teams[oppositeTeam].flag.taken = false;
                                game.teams[oppositeTeam].flag.resetPosition();
                                game.teams[oppositeTeam].flag.queueCreateBody();
                                game.teams[oppositeTeam].flag.user_id = 0;
                                player.flag = null;

                                player.score = player.score + 500;

                                game.io.to(game.mode).emit('reset-flag', game.teams[oppositeTeam].flag);
                            }
                        }
                    } else {
                        if (player.team !== object.team) {
                            player.flag = object;
                            object.removeBody();
                            object.taken = true;

                            game.io.to(game.mode).emit('flag-pickup', {
                                user_id: player.id,
                                team: object.team
                            });
                        } else {
                            if (!object.isInBase()) {
                                object.taken = false;
                                object.user_id = 0;
                                object.resetPosition();
                                object.queueCreateBody();

                                game.io.to(game.mode).emit('reset-flag', object);
                            }
                        }
                    }
                } else {
                    if (object.type === 'shield-pickup') {
                        if (!player.old_decrease_shield) {
                            if (player.shield < game.properties.max_shield) {
                                player.shield += 1;

                                game.resizable_bodies.push(player.id);
                            }

                            socket.emit("gained", {
                                new_size: player.size,
                                new_shield: player.shield
                            });
                        }
                    } else if (object.type === 'mine-pickup') {
                        object.user_id = player.id;
                        player.mines.push(object);

                        socket.emit("mine-picked-up", {
                            object: object
                        });
                    } else if (object.type === 'grenade-pickup') {
                        object.user_id = player.id;
                        player.grenades.push(object);

                        socket.emit("grenade-picked-up", {
                            object: object
                        });
                    }

                    player.score++;

                    game.food_list.splice(game.findItem(object.id, true), 1);

                    game.io.to(game.mode).emit('item-remove', object);

                    game.removable_bodies.push(objectBody);

                    game.checkLeader(player);
                }
            }
        } else {
            let killer = game.findPlayer(object.user_id);

            if (!player) {
                game.log('Could not find player and killer', 'error');
                return false;
            }

            if (player.is_god) {
                return false;
            }

            if (object.user_id === player.id) {
                if (!object.self_kill) {
                    return false;
                }
            }

            player.shield = player.shield - (object.type === 'mine' ? game.properties.mine_damage : game.properties.grenade_damage);
            if (player.shield < 10) {
                game.io.to(game.mode).emit('explosion', {
                    id: object.id,
                    type: object.type
                });

                game.io.to(game.mode).emit('remove-player', {
                    id: player.id
                });

                socket.emit("killed", {
                    start_time: player.start_time,
                    score: player.score,
                });

                if (killer) {
                    if (game.mode === 'team_dm' || game.mode === 'ctf') {
                        if (player.team !== killer.team) {
                            killer.score = killer.score + parseInt((player.score / 2));

                            if (game.mode === 'team_dm') {
                                game.teams[killer.team].score = game.teams[killer.team].score + 1;
                            }
                        }
                    } else {
                        killer.score = killer.score + parseInt((player.score / 2));
                    }
                }

                let mineCount = parseInt((player.mines.length / 2));
                if (mineCount > 30) {
                    mineCount = 30;
                }

                let grenadeCount = parseInt((player.grenades.length / 2));
                if (grenadeCount > 50) {
                    grenadeCount = 50;
                }

                for (let i = 0; i < mineCount; i++) {
                    let randomX = player.x + UtilService.getRandomInt(-100, 100);
                    let randomY = player.y + UtilService.getRandomInt(-100, 100);

                    if (randomX <= 1000) {
                        randomY = 1000 + UtilService.getRandomInt(1, 15) + 10;
                    }

                    if (randomY <= 1000) {
                        randomY = 1000 + UtilService.getRandomInt(1, 15) + 10;
                    }

                    if (randomX >= game.properties.height) {
                        randomX = game.properties.height - UtilService.getRandomInt(1, 15) - 10;
                    }

                    if (randomY >= game.properties.width) {
                        randomY = game.properties.width - UtilService.getRandomInt(1, 15) - 10;
                    }

                    game.addFood(1, 'mine-pickup', randomX, randomY)
                }

                for (let i = 0; i < grenadeCount; i++) {
                    let randomX = player.x + UtilService.getRandomInt(-100, 100);
                    let randomY = player.y + UtilService.getRandomInt(-100, 100);

                    if (randomX <= 1000) {
                        randomY = 1000 + UtilService.getRandomInt(1, 15) + 10;
                    }

                    if (randomY <= 1000) {
                        randomY = 1000 + UtilService.getRandomInt(1, 15) + 10;
                    }

                    if (randomX >= game.properties.height) {
                        randomX = game.properties.height - UtilService.getRandomInt(1, 15) - 10;
                    }

                    if (randomY >= game.properties.width) {
                        randomY = game.properties.width - UtilService.getRandomInt(1, 15) - 10;
                    }

                    game.addFood(1, 'grenade-pickup', randomX, randomY)
                }

                if (game.mode === 'ctf') {
                    if (player.flag) {
                        game.teams[player.flag.team].flag.drop(player.x, player.y);

                        game.io.to(game.mode).emit('drop-flag', game.teams[player.flag.team].flag);
                    }
                }

                if (game.mode !== 'classic') {
                    game.teams[player.team].players.splice(this.id, 1);
                }

                game.recalculateHighscore(player);

                game.removable_bodies.push(playerBody);

                game.player_list.splice(game.findPlayer(player.id, true), 1);

                if (killer) {
                    if (player.id === game.leader.id) {
                        if (game.mode === 'team_dm' || game.mode === 'ctf') {
                            if (player.team !== killer.team) {
                                killer.score = killer.score + parseInt((player.score / 2));
                            }
                        } else {
                            killer.score = killer.score + parseInt((player.score / 2));
                        }
                    }

                    game.checkLeader(killer);
                } else {
                    if (player.id === game.leader.id) {
                        game.leader.id = false;
                        game.leader.score = 0;
                    }
                }
            } else {
                game.io.to(game.mode).emit('explosion', {
                    id: object.id,
                    type: object.type,
                    user_id: player.id,
                    new_shield: player.shield
                });
            }

            if (object.type === 'mine') {
                game.mine_list.splice(game.findMine(object.id, true), 1);
            } else if (object.type === 'grenade') {
                game.grenade_list.splice(game.findGrenade(object.id, true), 1);
            }

            game.removable_bodies.push(objectBody);
        }
    });

    let gameModes = ['classic', 'team_dm', 'ctf'];

    let games = {};

    gameModes.forEach(mode => {
        games[mode] = new GameService(world, io, client, mode);
    });

//We call physics handler 60fps. The physics is calculated here.
    setInterval(() => {
        world.step((1 / 60));

        let gameModeCount = gameModes.length;
        for (let i = 0; i < gameModeCount; i++) {
            games[gameModes[i]].handlePhysics()
        }
    }, 1000 * (1 / 60));

// Add missing food
    setInterval(() => {
        let gameModeCount = gameModes.length;
        for (let i = 0; i < gameModeCount; i++) {
            games[gameModes[i]].heartbeat()
        }
    }, 1500);

//Remove inactive players and reset the leader
    setInterval(() => {
        let currentTime = (new Date()).getTime();

        let gameModeCount = gameModes.length;
        for (let i = 0; i < gameModeCount; i++) {
            let game = games[gameModes[i]];

            let inactivePlayers = [];
            game.player_list.forEach((player, key) => {
                if (player.last_move) {
                    if (((currentTime - player.last_move) / 1000) >= game.properties.max_inactive) {
                        let socket = game.io.sockets.connected[player.id];

                        if (socket) {
                            socket.disconnect();
                        }

                        game.log('Disconnecting inactive player with the ID ' + player.id);
                    }
                }

                if (player.last_ping) {
                    if (((currentTime - player.last_ping) / 1000) >= 30) {
                        inactivePlayers.push(key);

                        //send message to every connected client except the sender
                        game.io.to(game.mode).emit('remove-player', {
                            id: player.id
                        });

                        if (game.mode === 'ctf') {
                            if (player.flag) {
                                game.teams[player.flag.team].flag.drop(player.x, player.y);

                                game.io.to(game.mode).emit('drop-flag', game.teams[player.flag.team].flag);
                            }
                        }

                        if (game.mode !== 'classic') {
                            game.teams[player.team].players.splice(this.id, 1);
                        }

                        if (player.body) {
                            game.removable_bodies.push(player.body);
                        }

                        if (player.id === this.leader.id) {
                            game.leader.id = false;
                            game.leader.score = 0;
                        }

                        game.recalculateHighscore(player);

                        game.log('Removing inactive player with the ID ' + player.id);
                    }
                }
            });

            for (let i = inactivePlayers.length - 1; i >= 0; i--) {
                game.player_list.splice(inactivePlayers[i], 1);
            }

            let leader = game.getLeader();
            if (leader) {
                game.leader.id = leader.id;
                game.leader.score = leader.score;

                game.io.to(game.mode).emit('change-leader', {
                    id: game.leader.id
                });
            }

            if (game.redis) {
                game.redis.set('highscores', JSON.stringify(game.highscores));
            }
        }
    }, 30000);

// Check if match ended
    setInterval(() => {
        let currentTime = (new Date()).getTime();

        if (games['team_dm']) {
            let timePassed = ((currentTime - games['team_dm'].match.start_time) / 1000);
            if (timePassed >= games['team_dm'].match.total_time) {
                let bestPlayer = games['team_dm'].getLeader();

                if (!bestPlayer) {
                    bestPlayer = {
                        username: '',
                        score: 0
                    }
                }

                games['team_dm'].io.to('team_dm').emit('match-ended', {
                    red_score: games['team_dm'].teams.red.score,
                    blue_score: games['team_dm'].teams.blue.score,
                    best_player: {
                        username: bestPlayer.username ? bestPlayer.username : 'Unnamed Player',
                        score: bestPlayer.score
                    }
                });

                games['team_dm'].player_list = [];
                games['team_dm'].teams.red.players = [];
                games['team_dm'].teams.blue.score = 0;

                games['team_dm'].teams.blue.players = [];
                games['team_dm'].teams.blue.score = 0;

                games['team_dm'].match.start_time = (new Date()).getTime();

                games['team_dm'].mine_list.forEach(mine => {
                    games['team_dm'].removable_bodies.push(mine.body);
                });
                games['team_dm'].mine_list = [];
            }
        }

        if (games['ctf']) {
            let timePassed = ((currentTime - games['ctf'].match.start_time) / 1000);
            if (timePassed >= games['ctf'].match.total_time) {
                let bestPlayer = games['team_dm'].getLeader();

                if (!bestPlayer) {
                    bestPlayer = {
                        username: '',
                        score: 0
                    }
                }

                games['ctf'].io.to('ctf').emit('match-ended', {
                    red_score: games['ctf'].teams.red.score,
                    blue_score: games['ctf'].teams.blue.score,
                    best_player: {
                        username: bestPlayer.username ? bestPlayer.username : 'Unnamed Player',
                        score: bestPlayer.score
                    }
                });

                games['ctf'].player_list = [];
                games['ctf'].teams.red.players = [];
                games['ctf'].teams.red.score = 0;
                games['ctf'].teams.red.flag.removeBody();
                games['ctf'].teams.red.flag = new FlagObject(games['ctf'].properties.width, games['ctf'].properties.height, 'red', unique.v4(), games['ctf']);

                games['ctf'].teams.blue.players = [];
                games['ctf'].teams.blue.score = 0;
                games['ctf'].teams.blue.flag.removeBody();
                games['ctf'].teams.blue.flag = new FlagObject(games['ctf'].properties.width, games['ctf'].properties.height, 'blue', unique.v4(), games['ctf']);

                games['ctf'].match.start_time = (new Date()).getTime();

                games['ctf'].mine_list.forEach(mine => {
                    games['ctf'].removable_bodies.push(mine.body);
                });
                games['ctf'].mine_list = [];
            }
        }
    }, 10000);

//Run garbage collector every 30 seconds
    setInterval(() => {
        if (global.gc) {
            global.gc();
        } else {
            console.log('Garbage collection unavailable.  Pass --expose-gc when launching node to enable forced garbage collection.');
        }
    }, 30000);

    io.sockets.on('connection', function (socket) {
        let game = games['classic'];

        game.log("Client connected");

        socket.join('classic');
        socket.current_room = 'classic';

        socket.emit('connected');

        socket.on('change-game-mode', function (data) {
            if (data.mode === 'classic' || data.mode === 'team_dm' || data.mode === 'ctf') {
                socket.leave('classic');
                socket.leave('team_dm');
                socket.leave('ctf');

                socket.join(data.mode);
                socket.current_room = data.mode;

                game = games[data.mode];
            }
        });

        // listen for disconnection;
        socket.on('disconnect', function () {
            let removePlayer = game.findPlayer(this.id);
            let removePlayerKey = game.findPlayer(this.id, true);

            game.recalculateHighscore(removePlayer);

            if (removePlayer) {
                if (game.mode === 'team_dm' || game.mode === 'ctf') {
                    if (game.mode === 'ctf') {
                        if (removePlayer.flag) {
                            game.teams[removePlayer.flag.team].flag.drop(removePlayer.x, removePlayer.y);

                            game.io.to(game.mode).emit('drop-flag', game.teams[removePlayer.flag.team].flag);
                        }
                    }

                    game.teams[removePlayer.team].players.splice(this.id, 1);
                }

                game.player_list.splice(removePlayerKey, 1);
            } else {
                game.log('Couldn\'t remove player with the ID ' + this.id, 'error');
            }

            //send message to every connected client except the sender
            this.to(game.mode).broadcast.emit('remove-player', {
                id: this.id
            });

            if (removePlayer.body) {
                game.removable_bodies.push(removePlayer.body);
            }

            if (game.leader.id === this.id) {
                game.leader.id = false;
                game.leader.score = 0;
            }
        });

        // listen for new player
        socket.on("new-player", function (data) {
            let existingPlayer = game.findPlayer(this.id);
            if (existingPlayer) {
                game.log('Player with the ID ' + this.id + ' already exists');
                return false;
            }

            if (typeof data.username === 'undefined') {
                game.log('Corrupted data in new-player event - ' + JSON.stringify(data));
            }

            let team = null;

            //get some random coordinates
            let randomX = UtilService.getRandomInt(2000, (game.properties.width - 2000));
            let randomY = UtilService.getRandomInt(2000, (game.properties.width - 2000));

            if (game.mode === 'team_dm' || game.mode === 'ctf') {
                if (game.teams.red.players.length > game.teams.blue.players.length) {
                    team = 'blue';
                } else if (game.teams.red.players.length < game.teams.blue.players.length) {
                    team = 'red';
                } else {
                    team = 'red';
                }

                if (game.mode === 'ctf') {
                    //get some random coordinates
                    randomX = UtilService.getRandomInt(2000, (game.properties.width - 2000));
                    randomY = UtilService.getRandomInt(2000, (game.properties.width - 2000));
                }
            }

            //new player instance
            let newPlayer = new Player(this.id, data.username, randomX, randomY, 0, game);

            if (team) {
                newPlayer.color = game.colors[team];
                newPlayer.team = team;


                game.teams[team].players.push(newPlayer.id);
            }

            if (data.username) {
                game.log("Created new player with id " + this.id + " and username " + data.username);
            } else {
                game.log("Created new player with id " + this.id);
            }

            newPlayer.skin = data.skin;

            newPlayer.id = this.id;

            setTimeout(() => {
                newPlayer.is_god = false;
                this.emit('stop-god-mode', {
                    id: this.id,
                });

                this.to(game.mode).broadcast.emit('stop-god-mode', {
                    id: this.id,
                });
            }, 4000);

            this.emit('create-player', {
                id: newPlayer.id,
                username: newPlayer.username,
                skin: newPlayer.skin,
                team: newPlayer.team,
                x: newPlayer.x,
                y: newPlayer.y,
                size: newPlayer.size,
                color: newPlayer.color,
                shield: newPlayer.shield,
                food_color: game.properties.food_color,
                mine_color: game.properties.mine_color,
                grenade_color: game.properties.grenade_color,
                max_shield: game.properties.max_shield,
                width: game.properties.width,
                height: game.properties.height,
                base_width: game.properties.base_width,
                base_height: game.properties.base_height,
                match: {
                    total_time: game.match ? game.match.total_time : 0,
                    start_time: game.match ? game.match.start_time : 0,
                    red_flag: game.match ? game.teams.red.flag : false,
                    blue_flag: game.match ? game.teams.blue.flag : false,
                }
            });

            //information to be sent to all clients except sender
            let currentPlayerInfo = {
                username: newPlayer.username,
                skin: newPlayer.skin,
                team: newPlayer.team,
                id: newPlayer.id,
                x: newPlayer.x,
                y: newPlayer.y,
                angle: newPlayer.angle,
                size: newPlayer.size,
                color: newPlayer.color,
                shield: newPlayer.shield,
                is_god: existingPlayer.is_god
            };

            //send to the new player about everyone who is already connected.
            for (let i = 0; i < game.player_list.length; i++) {
                let existingPlayer = game.player_list[i];

                let existingPlayerInfo = {
                    username: existingPlayer.username,
                    skin: existingPlayer.skin,
                    team: existingPlayer.team,
                    id: existingPlayer.id,
                    x: existingPlayer.x,
                    y: existingPlayer.y,
                    angle: existingPlayer.angle,
                    size: existingPlayer.size,
                    color: existingPlayer.color,
                    shield: existingPlayer.shield,
                    is_god: existingPlayer.is_god
                };

                //send message to the sender-client only
                this.emit("new-enemy", existingPlayerInfo);

                if (!game.leader.id) {
                    let leader = game.getLeader();

                    if (leader) {
                        this.emit('change-leader', {
                            id: leader.id
                        });
                    }
                } else {
                    this.emit('change-leader', {
                        id: game.leader.id
                    });
                }
            }

            this.emit('item-update', game.food_list);
            this.emit('buff-update', game.buff_list);
            this.emit('mine-update', game.mine_list);
            this.emit('grenade-update', game.grenade_list);

            if (game.mode === 'ctf') {
                if (game.teams.red.flag.taken) {
                    this.emit('flag-pickup', {
                        user_id: game.teams.red.flag.user_id,
                        team: 'red'
                    });
                }

                if (game.teams.blue.flag.taken) {
                    this.emit('flag-pickup', {
                        user_id: game.teams.blue.flag.user_id,
                        team: 'blue'
                    });
                }
            }

            //send message to every connected client except the sender
            this.to(game.mode).broadcast.emit('new-enemy', currentPlayerInfo);

            game.player_list.push(newPlayer);
        });

        //listen for new player inputs.
        socket.on("move-pointer", function (data) {
            if (typeof data.pointer_x === 'undefined') {
                game.log('Corrupted data in move-pointer event - ' + JSON.stringify(data));
            }

            if (typeof data.pointer_y === 'undefined') {
                game.log('Corrupted data in move-pointer event - ' + JSON.stringify(data));
            }

            if (typeof data.pointer_worldx === 'undefined') {
                game.log('Corrupted data in move-pointer event - ' + JSON.stringify(data));
            }

            if (typeof data.pointer_worldy === 'undefined') {
                game.log('Corrupted data in move-pointer event - ' + JSON.stringify(data));
            }

            let movePlayer = game.findPlayer(this.id);

            if (!movePlayer) {
                return false;
            }

            //when sendData is true, we send the data back to client.
            if (!movePlayer.sendData) {
                return false;
            }

            //every 50ms, we send the data.
            setTimeout(() => {
                movePlayer.sendData = true
            }, 50);

            //we set sendData to false when we send the data.
            movePlayer.sendData = false;

            //Make a new pointer with the new inputs from the client.
            //contains player positions in server
            let serverPointer = {
                x: data.pointer_x,
                y: data.pointer_y,
                worldX: data.pointer_worldx,
                worldY: data.pointer_worldy
            };

            //moving the player to the new inputs from the player
            if (PositionService.distanceToPointer(movePlayer, serverPointer) <= 30) {
                movePlayer.body.angle = PositionService.moveToPointer(movePlayer, 0, serverPointer, 100);
            } else {
                movePlayer.body.angle = PositionService.moveToPointer(movePlayer, movePlayer.speed, serverPointer);
            }

            let x = movePlayer.body.position[0];
            let y = movePlayer.body.position[1];

            let radius = movePlayer.size + (movePlayer.shield / 2);

            if (x <= (1000 + radius)) {
                movePlayer.body.position[0] = 1000 + radius;
            }

            if (y <= (1000 + radius)) {
                movePlayer.body.position[1] = 1000 + radius;
            }

            if (x >= (game.properties.height - radius)) {
                movePlayer.body.position[0] = game.properties.height - radius;
            }

            if (y >= (game.properties.width - radius)) {
                movePlayer.body.position[1] = game.properties.width - radius;
            }

            movePlayer.x = movePlayer.body.position[0];
            movePlayer.y = movePlayer.body.position[1];

            //new player position to be sent back to client.
            let info = {
                x: movePlayer.body.position[0],
                y: movePlayer.body.position[1],
                angle: movePlayer.body.angle
            };

            //send to sender (not to every clients).
            this.emit('input-received', info);

            //data to be sent back to everyone except sender
            let moveplayerData = {
                id: movePlayer.id,
                x: movePlayer.body.position[0],
                y: movePlayer.body.position[1],
                angle: movePlayer.body.angle,
                size: movePlayer.size,
                shield: movePlayer.shield
            };

            //send to everyone except sender
            this.to(game.mode).broadcast.emit('enemy-move', moveplayerData);

            movePlayer.last_move = (new Date()).getTime();
        });

        socket.on('drop-mine', function (data) {
            if (typeof data.id === 'undefined') {
                game.log('Corrupted data in drop-mine event - ' + JSON.stringify(data));
            }

            let player = game.findPlayer(this.id);

            if (!player) {
                return false;
            }

            if (player.flag) {
                return false;
            }

            let mine = player.findMine(data.id);

            if (!mine) {
                game.log("Could not find mine - " + JSON.stringify(data), 'error');
                return false;
            }

            mine.x = player.x;
            mine.y = player.y;
            mine.color = game.properties.mine_color;
            mine.size = 25;
            mine.line_size = 15;
            mine.type = 'mine';
            mine.dropped = (new Date()).getTime();

            mine.createBody();

            mine.self_kill = false;
            setTimeout(() => {
                mine.self_kill = true;
            }, 3000);

            game.mine_list.push(mine);

            player.removeMine(data.id);

            this.emit('mine-update', [mine]);
            this.to(game.mode).broadcast.emit('mine-update', [mine]);
        });

        socket.on('throw-grenade', function (data) {
            if (typeof data.id === 'undefined') {
                game.log('Corrupted data in throw-grenade event - ' + JSON.stringify(data));
            }

            let player = game.findPlayer(this.id);

            if (!player) {
                return false;
            }

            if (player.flag) {
                return false;
            }

            let grenade = player.findGrenade(data.id);

            if (!grenade) {
                game.log("Could not find grenade - " + JSON.stringify(data), 'error');
                return false;
            }

            grenade.x = player.x;
            grenade.y = player.y;
            grenade.color = game.properties.grenade_color;
            grenade.size = 25;
            grenade.line_size = 15;
            grenade.type = 'grenade';
            grenade.meta = {
                start: (new Date()).getTime(),
                player_angle: player.body.angle,
                speed: game.properties.grenade_speed
            };

            grenade.createBody();

            grenade.self_kill = false;
            setTimeout(() => {
                grenade.self_kill = true;
            }, 3000);

            game.grenade_list.push(grenade);

            player.removeGrenade(data.id);

            this.emit('grenade-update', [grenade]);
            this.to(game.mode).broadcast.emit('grenade-update', [grenade]);

            game.moving_grenades.push(grenade.id);
        });

        socket.on('get-leaderboard', function () {
            let player = game.findPlayer(this.id);
            if (!player) {
                return false;
            }

            let sortedPlayers = _.orderBy(game.player_list, ['score'], ['desc']);
            let leaders = [];

            for (let i = 0; i < 10; i++) {
                if (typeof sortedPlayers[i] !== 'undefined') {
                    leaders.push({
                        username: sortedPlayers[i].username ? sortedPlayers[i].username : 'Unnamed Player',
                        score: sortedPlayers[i].score
                    });
                }
            }

            this.emit('get-leaderboard', {
                leaders: leaders,
                score: player.score
            });
        });

        socket.on('get-score', function () {
            if (game.teams) {
                if (game.teams.red && game.teams.blue) {
                    this.emit('get-score', {
                        red_score: game.teams.red.score,
                        blue_score: game.teams.blue.score,
                    });
                }
            }
        });

        socket.on('ping', function () {
            let player = game.findPlayer(this.id);
            if (!player) {
                return false;
            }

            player.last_ping = (new Date()).getTime();
        });
    });

    server.listen(process.env.PORT || 2000);

    console.log((new Date()).toLocaleString() + " ----------------------------");
    console.log((new Date()).toLocaleString() + " - Server started.");

}