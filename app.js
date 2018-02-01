let _ = require('lodash');

let express = require('express');
let bodyParser = require('body-parser');

//require p2 physics library in the server.
let p2 = require('p2');

//get the node-uuid package for creating unique id
let unique = require('node-uuid');

let app = express();

let server = require('http').Server(app);

app.use(bodyParser.urlencoded({
    extended: true
}));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

app.use('/js', express.static(__dirname + '/public/js'));
app.use('/images', express.static(__dirname + '/public/images'));
app.use('/css', express.static(__dirname + '/public/css'));

app.post('/send/feedback', function (request, response) {
    console.log(request.body.type);
    console.log(request.body.content);
});

let UtilService = require('./assets/UtilService.js');
let PositionService = require('./assets/server/PositionService');

class GameService {
    constructor(world, io) {
        this.player_list = [];
        this.food_list = [];
        this.mine_list = [];
        this.grenade_list = [];

        this.start_time = (new Date).getTime();
        this.last_time = null;
        this.time_step = 1 / 70;

        this.removable_bodies = [];
        this.moving_grenades = [];

        this.properties = {
            max_food: 1500,
            max_mines: 200,
            max_grenades: 100,
            height: 10000,
            width: 10000,
            food_color: '0x49bcff',
            mine_color: '0x2d4053',
            grenade_color: '0xd17732',
            max_shield: 100,
            mine_damage: 20,
            grenade_damage: 5,
            mine_lifetime: 120
        };

        this.world = world;
        this.io = io;

        this.world.on('beginContact', (e) => {
            this.onContact(e.bodyA, e.bodyB);
        });
    }

    handlePhysics() {
        let currentTime = (new Date).getTime();
        let timeElapsed = currentTime - this.start_time;
        let dt = this.last_time ? (timeElapsed - this.last_time) / 1000 : 0;

        dt = Math.min(1 / 10, dt);

        this.world.step(this.time_step);

        if (this.removable_bodies.length > 0) {
            this.removable_bodies.forEach((body) => {
                this.world.removeBody(body);
            });

            this.removable_bodies = [];
        }

        if (this.moving_grenades.length > 0) {
            let removableGrenades = [];

            this.moving_grenades.forEach((id, key) => {
                let grenade = this.findGrenade(id);
                if (!grenade) {
                    return false;
                }

                grenade.body.angle = PositionService.moveToPointer(grenade, grenade.meta.speed, {}, 0, grenade.meta.player_angle);

                grenade.x = grenade.body.position[0];
                grenade.y = grenade.body.position[1];

                //new player position to be sent back to client.
                let info = {
                    id: grenade.id,
                    x: grenade.body.position[0],
                    y: grenade.body.position[1],
                    angle: grenade.body.angle
                };

                //send to sender (not to every clients).
                this.io.emit('grenade-move', info);

                if ((currentTime - grenade.meta.start) >= 800) {
                    removableGrenades.push(key);

                    this.io.emit('explosion', {
                        id: grenade.id,
                        type: 'grenade'
                    });

                    this.removable_bodies.push(grenade.body);
                }
            });

            for (let i = removableGrenades.length - 1; i >= 0; i--) {
                this.moving_grenades.splice(removableGrenades[i], 1);
            }
        }

        let explodableMines = [];
        this.mine_list.forEach((mine, key) => {
            if (((currentTime - mine.dropped) / 1000) >= this.properties.mine_lifetime) {
                explodableMines.push(key);

                this.io.emit('explosion', {
                    id: mine.id,
                    type: 'mine'
                });

                this.removable_bodies.push(mine.body);
            }
        });

        for (let i = explodableMines.length - 1; i >= 0; i--) {
            this.mine_list.splice(explodableMines[i], 1);
        }
    }

    heartbeat() {
        //the number of food that needs to be generated
        let currentShieldCount = 0;
        let currentMineCount = 0;
        let currentGrenadeCount = 0;

        this.food_list.forEach(item => {
            if (item.type === 'mine-pickup') {
                currentMineCount++;
            } else if (item.type === 'grenade-pickup') {
                currentGrenadeCount++;
            } else {
                currentShieldCount++;
            }
        });

        let missingShieldCount = this.properties.max_food - currentShieldCount;
        let missingMineCount = this.properties.max_mines - currentMineCount;
        let missingGrenadeCount = this.properties.max_grenades - currentGrenadeCount;

        //add the food
        this.addFood(missingShieldCount, 'shield-pickup');
        this.addFood(missingMineCount, 'mine-pickup');
        this.addFood(missingGrenadeCount, 'grenade-pickup');

        //physics stepping. We moved this into heartbeat
        this.handlePhysics();
    }

    addFood(n, type) {

        //return if it is not required to create food
        if (n <= 0) {
            return false;
        }

        let pushableItems = [];
        //create n number of foods to the game
        for (let i = 0; i < n; i++) {
            //create the unique id using node-uuid
            let uniqueId = unique.v4();

            let color = this.properties.food_color;
            if (type === 'mine-pickup') {
                color = this.properties.mine_color;
            } else if (type === 'grenade-pickup') {
                color = this.properties.grenade_color;
            }

            let foodEntity = new FoodObject(this.properties.width, this.properties.height, color, type, uniqueId);

            this.food_list.push(foodEntity);
            pushableItems.push(foodEntity);
        }

        //set the food data back to client
        this.io.emit("item-update", pushableItems);
    }

    findPlayer(id) {
        for (let i = 0; i < this.player_list.length; i++) {
            if (this.player_list[i].id === id) {
                return this.player_list[i];
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

    findGrenade(id) {
        for (let i = 0; i < this.grenade_list.length; i++) {
            if (this.grenade_list[i].id === id) {
                return this.grenade_list[i];
            }
        }

        return false;
    }

    onContact(firstBody, secondBody) {
        let object = null;
        let player = null;
        let objectBody = null;
        let playerBody = null;

        if (firstBody.game.type === 'player') {
            player = this.findPlayer(firstBody.game.id);
            playerBody = firstBody;
        } else if (firstBody.game.type === 'shield-pickup' || firstBody.game.type === 'mine-pickup' || firstBody.game.type === 'grenade-pickup') {
            object = this.findItem(firstBody.game.id);
            objectBody = firstBody;
        } else if (firstBody.game.type === 'mine') {
            object = this.findMine(firstBody.game.id);
            objectBody = firstBody;
        } else if (firstBody.game.type === 'grenade') {
            object = this.findGrenade(firstBody.game.id);
            objectBody = firstBody;
        }

        if (secondBody.game.type === 'player') {
            player = this.findPlayer(secondBody.game.id);
            playerBody = secondBody;
        } else if (secondBody.game.type === 'shield-pickup' || secondBody.game.type === 'mine-pickup' || secondBody.game.type === 'grenade-pickup') {
            object = this.findItem(secondBody.game.id);
            objectBody = secondBody;
        } else if (secondBody.game.type === 'mine') {
            object = this.findMine(secondBody.game.id);
            objectBody = secondBody;
        } else if (secondBody.game.type === 'grenade') {
            object = this.findGrenade(secondBody.game.id);
            objectBody = secondBody;
        }

        if (!object) {
            console.log("could not find object");
            return false;
        }

        if (!player) {
            return false;
        }

        let socket = this.io.sockets.connected[player.id];

        if (object.type !== 'mine' && object.type !== 'grenade') {
            if (object.type === 'shield-pickup') {
                if (player.shield < this.properties.max_shield) {
                    player.shield += 1;
                }

                socket.emit("gained", {
                    new_size: player.size,
                    new_shield: player.shield
                });
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

            this.food_list.splice(this.food_list.indexOf(object), 1);

            this.io.emit('item-remove', object);

            this.removable_bodies.push(objectBody);
        } else {
            let killer = game.findPlayer(object.user_id);

            if (!player) {
                console.log('could not find player and killer');
                return false;
            }

            if (object.user_id === player.id) {
                if (!object.self_kill) {
                    return false;
                }
            }

            player.shield = player.shield - (object.type === 'mine' ? this.properties.mine_damage : this.properties.grenade_damage);
            if (player.shield < 10) {
                this.io.emit('explosion', {
                    id: object.id,
                    type: object.type
                });

                this.io.emit('remove-player', {
                    id: player.id
                });

                socket.emit("killed", {
                    start_time: player.start_time
                });

                if (killer) {
                    killer.score = killer.score + 50;
                }

                this.removable_bodies.push(playerBody);

                this.player_list.splice(this.player_list.indexOf(player), 1);
            } else {
                this.io.emit('explosion', {
                    id: object.id,
                    type: object.type,
                    user_id: player.id,
                    new_shield: player.shield
                });
            }

            if (object.type === 'mine') {
                this.mine_list.splice(this.mine_list.indexOf(object), 1);
            } else if (object.type === 'grenade') {
                this.grenade_list.splice(this.grenade_list.indexOf(object), 1);
            }

            this.removable_bodies.push(objectBody);
        }
    }
}

class FoodObject {
    constructor(max_x, max_y, color, type, id) {
        this.x = UtilService.getRandomInt(10, max_x - 10);
        this.y = UtilService.getRandomInt(10, max_y - 10);
        this.type = type;
        this.id = id;
        this.color = color;
        this.size = 20;
        this.line_size = 10;
        this.powerup = false;

        this.body = null;

        this.createBody();
    }

    createBody() {
        this.body = new p2.Body({
            mass: 0,
            position: [this.x, this.y],
            fixedRotation: true,
            collisionResponse: false
        });

        this.body.addShape(new p2.Circle({
            radius: (this.size / 2)
        }));

        this.body.game = {
            id: this.id,
            type: this.type
        };

        this.body.gravityScale = 0;
        this.body.shapes[0].sensor = true;

        if (typeof this.user_id !== 'undefined') {
            this.body.game.user_id = this.user_id;
        }

        world.addBody(this.body);
    }

    toJSON() {
        return {
            x: this.x,
            y: this.y,
            type: this.type,
            id: this.id,
            color: this.color,
            size: this.size,
            line_size: this.line_size,
            powerup: this.powerup
        }
    }
}

class Player {
    constructor(id, username, startX, startY, startAngle) {
        this.id = id;
        this.username = username;
        this.x = startX;
        this.y = startY;
        this.angle = startAngle;
        this.speed = 500;
        this.shield = 10;
        this.mines = [];
        this.grenades = [];
        this.score = 0;
        this.type = 'player';

        this.body = false;

        //We need to intilaize with true.
        this.sendData = true;
        this.size = 40;
        this.dead = false;
        this.color = UtilService.getRandomColor();
        this.start_thrust = false;
        this.start_time = (new Date()).getTime();

        this.createBody();
    }

    createBody() {
        //create body for the player
        this.body = new p2.Body({
            mass: 1,
            position: [this.x, this.y],
            fixedRotation: true,
            collisionResponse: false
        });

        this.body.addShape(new p2.Circle({
            radius: (this.size + (this.shield / 2))
        }));

        this.body.game = {
            id: this.id,
            type: this.type
        };

        this.body.gravityScale = 0;
        this.body.shapes[0].sensor = true;

        world.addBody(this.body);
    }

    findMine(id) {
        for (let i = 0; i < this.mines.length; i++) {
            if (this.mines[i].id === id) {
                return this.mines[i];
            }
        }

        return false;
    }

    findGrenade(id) {
        for (let i = 0; i < this.grenades.length; i++) {
            if (this.grenades[i].id === id) {
                return this.grenades[i];
            }
        }

        return false;
    }

    removeMine(id) {
        let foundKey = -1;

        for (let i = 0; i < this.mines.length; i++) {
            if (this.mines[i].id === id) {
                foundKey = i;
            }
        }

        this.mines.splice(foundKey, 1);

        return foundKey > -1;
    }

    removeGrenade(id) {
        let foundKey = -1;

        for (let i = 0; i < this.grenades.length; i++) {
            if (this.grenades[i].id === id) {
                foundKey = i;
            }
        }

        this.grenades.splice(foundKey, 1);

        return foundKey > -1;
    }
}


//the physics world in the server. This is where all the physics happens. 
//we set gravity to 0 since we are just following mouse pointers.
let world = new p2.World({
    gravity: [0, 0]
});

// io connection
let io = require('socket.io')(server, {});

let game = new GameService(world, io);

//We call physics handler 60fps. The physics is calculated here.
setInterval(() => {
    game.heartbeat()
}, 1000 / 60);

io.sockets.on('connection', function (socket) {
    console.log("socket connected");

    socket.emit('connected');

    // listen for disconnection;
    socket.on('disconnect', function () {
        console.log('disconnect');

        let removePlayer = game.findPlayer(this.id);

        if (removePlayer) {
            game.player_list.splice(game.player_list.indexOf(removePlayer), 1);
        }

        console.log("removing player " + this.id);

        //send message to every connected client except the sender
        this.broadcast.emit('remove-player', {
            id: this.id
        });

    });

    // listen for new player
    socket.on("new_player", function (data) {
        //get some random coordinates
        let randomX = UtilService.getRandomInt(2000, (game.properties.width - 2000));
        let randomY = UtilService.getRandomInt(2000, (game.properties.width - 2000));

        //new player instance
        let newPlayer = new Player(this.id, data.username, randomX, randomY, data.angle);

        console.log("created new player with id " + this.id);

        newPlayer.id = this.id;

        this.emit('create-player', {
            id: newPlayer.id,
            username: newPlayer.username,
            x: newPlayer.x,
            y: newPlayer.y,
            size: newPlayer.size,
            color: newPlayer.color,
            shield: newPlayer.shield,
            food_color: game.properties.food_color,
            mine_color: game.properties.mine_color,
            grenade_color: game.properties.grenade_color,
            max_shield: game.properties.max_shield
        });

        //information to be sent to all clients except sender
        let currentPlayerInfo = {
            username: newPlayer.username,
            id: newPlayer.id,
            x: newPlayer.x,
            y: newPlayer.y,
            angle: newPlayer.angle,
            size: newPlayer.size,
            color: newPlayer.color,
            shield: newPlayer.shield
        };

        //send to the new player about everyone who is already connected.
        for (let i = 0; i < game.player_list.length; i++) {
            let existingPlayer = game.player_list[i];

            let existingPlayerInfo = {
                username: existingPlayer.username,
                id: existingPlayer.id,
                x: existingPlayer.x,
                y: existingPlayer.y,
                angle: existingPlayer.angle,
                size: existingPlayer.size,
                color: existingPlayer.color,
                shield: existingPlayer.shield
            };

            console.log("pushing player");

            //send message to the sender-client only
            this.emit("new-enemy", existingPlayerInfo);
        }

        this.emit('item-update', game.food_list);
        this.emit('mine-update', game.mine_list);
        this.emit('grenade-update', game.grenade_list);

        //send message to every connected client except the sender
        this.broadcast.emit('new-enemy', currentPlayerInfo);

        game.player_list.push(newPlayer);
    });

    //listen for new player inputs.
    socket.on("input_fired", function (data) {
        let movePlayer = game.findPlayer(this.id, this.room);

        if (!movePlayer || movePlayer.dead) {
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
        this.broadcast.emit('enemy-move', moveplayerData);
    });

    socket.on('drop-mine', function (data) {
        let player = game.findPlayer(this.id);

        if (!player) {
            return false;
        }

        let mine = player.findMine(data.id);

        if (!mine) {
            console.log(data);
            console.log("could not find mine");
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

        this.broadcast.emit('mine-update', [mine]);
        this.emit('mine-update', [mine]);
    });

    socket.on('throw-grenade', function (data) {
        let player = game.findPlayer(this.id);

        if (!player) {
            return false;
        }

        let grenade = player.findGrenade(data.id);

        if (!grenade) {
            console.log(data);
            console.log("could not find grenade");
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
            speed: player.speed * 3
        };

        grenade.createBody();

        grenade.self_kill = false;
        setTimeout(() => {
            grenade.self_kill = true;
        }, 3000);

        game.grenade_list.push(grenade);

        player.removeGrenade(data.id);

        this.broadcast.emit('grenade-update', [grenade]);
        this.emit('grenade-update', [grenade]);

        game.moving_grenades.push(grenade.id);
    });

    socket.on('get-leaderboard', function () {
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
            leaders: leaders
        });
    });
});

server.listen(process.env.PORT || 2000);

console.log("Server started.");
