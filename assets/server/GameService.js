let _ = require('lodash');
let unique = require('node-uuid');

let UtilService = require('../UtilService.js');
let PositionService = require('./PositionService');
let FoodObject = require('./FoodObject.js');
let BuffObject = require('./BuffObject.js');
let FlagObject = require('./FlagObject.js');
let TeamBase = require('./TeamBase.js');

class GameService {
    constructor(world, io, redis, mode) {
        this.mode = mode;

        this.player_list = [];
        this.food_list = [];
        this.mine_list = [];
        this.grenade_list = [];
        this.buff_list = [];

        this.start_time = (new Date).getTime();
        this.last_time = null;
        this.time_step = 1 / 70;

        this.removable_bodies = [];
        this.resizable_bodies = [];
        this.creatable_bodies = [];
        this.moving_grenades = [];

        this.properties = {
            max_food: 1000,
            max_mines: 50,
            max_grenades: 100,
            max_buffs: 25,
            height: 10000,
            width: 10000,
            player_speed: 500,
            grenade_speed: 1500,
            food_color: '0x49bcff',
            mine_color: '0x2d4053',
            grenade_color: '0xd17732',
            max_shield: 100,
            mine_damage: 20,
            grenade_damage: 5,
            mine_lifetime: 45,
            max_inactive: 120,
            base_width: 1300,
            base_height: 1300
        };

        this.colors = {
            red: '0xbe0000',
            green: '0x09be00',
            blue: '0x0000FF'
        };

        this.buffs = [
            {
                type: 'shield_increase',
                color: 'green',
                time: 10
            },
            {
                type: 'shield_decrease',
                color: 'red',
                time: 10
            },
            {
                type: 'speed_increase',
                color: 'green',
                time: 10
            },
            {
                type: 'speed_decrease',
                color: 'red',
                time: 10
            },
        ];

        this.active_buffs = [];

        this.leader = {
            id: false,
            score: 0
        };

        this.highscores = [];

        this.world = world;
        this.io = io;
        this.redis = redis;

        if (this.mode === 'team_dm' || this.mode === 'ctf') {
            this.teams = {
                red: {
                    score: 0,
                    players: []
                },
                blue: {
                    score: 0,
                    players: []
                }
            };

            this.match = {
                total_time: 600,
                start_time: (new Date()).getTime()
            };

            if (this.mode === 'ctf') {
                this.teams.red.flag = new FlagObject(this.properties.width, this.properties.height, 'red', unique.v4(), this);
                this.teams.blue.flag = new FlagObject(this.properties.width, this.properties.height, 'blue', unique.v4(), this);

                this.teams.red.base = new TeamBase(this.properties.width, this.properties.height, 'red', unique.v4(), this);
                this.teams.blue.base = new TeamBase(this.properties.width, this.properties.height, 'blue', unique.v4(), this);
            }
        }

        if (this.redis) {
            this.redis.get("highscores", (err, reply) => {
                if (reply) {
                    this.highscores = JSON.parse(reply);
                }
            });
        }

        setInterval(() => {
            let currentTime = (new Date()).getTime();

            /**
             * Explode old mines
             */

            let mineCount = this.mine_list.length;
            let explodableMines = [];

            for (let i = 0; i < mineCount; i++) {
                if (((currentTime - this.mine_list[i].dropped) / 1000) >= this.properties.mine_lifetime) {
                    explodableMines.push(i);

                    this.io.to(this.mode).emit('explosion', {
                        id: this.mine_list[i].id,
                        type: 'mine'
                    });

                    this.removable_bodies.push(this.mine_list[i].body);
                }
            }

            for (let i = explodableMines.length - 1; i >= 0; i--) {
                this.mine_list.splice(explodableMines[i], 1);
            }

            /**
             * Remove old player buffs
             */

            let playerCount = this.player_list.length;
            for (let i = 0; i < playerCount; i++) {
                let player = this.player_list[i];

                let removableBuffs = [];

                let buffCount = player.buffs.length;
                for (let b = 0; b < buffCount; b++) {
                    let buff = player.buffs[b];
                    if (((currentTime - buff.start_time) / 1000) >= buff.time) {

                        let socket = this.io.sockets.connected[this.player_list[i].id];
                        if (socket) {
                            if (buff.type === 'shield_increase') {
                                player.shield = player.old_increase_shield;
                                player.old_increase_shield = false;

                                this.resizable_bodies.push(player.id);

                                socket.emit("gained", {
                                    new_size: player.size,
                                    new_shield: player.shield
                                });

                            } else if (buff.type === 'shield_decrease') {
                                player.shield = player.old_decrease_shield;
                                player.old_decrease_shield = false;

                                this.resizable_bodies.push(player.id);

                                socket.emit("gained", {
                                    new_size: player.size,
                                    new_shield: player.shield
                                });
                            } else if (buff.type === 'speed_increase' || buff.type === 'speed_decrease') {
                                player.speed = this.properties.player_speed;
                            }
                        }

                        socket.emit('hide-buff', {
                            type: buff.type
                        });

                        removableBuffs.push(b);
                    }
                }

                for (let x = removableBuffs.length - 1; x >= 0; x--) {
                    this.player_list[i].buffs.splice(removableBuffs[x], 1);
                }
            }

        }, 1500);
    }

    log(msg, type) {
        if (typeof type === 'undefined') type = 'info';

        let date = new Date();

        console.log(date.toLocaleString() + ' - ' + this.mode + ' - ' + type + ': ' + msg);
    }

    handlePhysics() {
        let currentTime = (new Date()).getTime();

        if (this.removable_bodies.length > 0) {
            let bodyCount = this.removable_bodies.length;

            for (let i = 0; i < bodyCount; i++) {
                this.world.removeBody(this.removable_bodies[i]);
            }

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

                this.io.to(this.mode).emit('grenade-move', info);

                if ((currentTime - grenade.meta.start) >= 800) {
                    removableGrenades.push(key);

                    this.io.to(this.mode).emit('explosion', {
                        id: grenade.id,
                        type: 'grenade'
                    });

                    this.removable_bodies.push(grenade.body);

                    grenade = this.findGrenade(id);
                    this.grenade_list.splice(this.grenade_list.indexOf(grenade), 1);
                }
            });

            for (let i = removableGrenades.length - 1; i >= 0; i--) {
                this.moving_grenades.splice(removableGrenades[i], 1);
            }
        }

        if (this.resizable_bodies.length > 0) {
            let removableResizingBodies = [];
            let bodyCount = this.resizable_bodies.length;

            for (let i = 0; i < bodyCount; i++) {
                let player = this.findPlayer(this.resizable_bodies[i]);

                player.resizeBody();

                removableResizingBodies.push(i);
            }

            for (let i = removableResizingBodies.length - 1; i >= 0; i--) {
                this.resizable_bodies.splice(removableResizingBodies[i], 1);
            }
        }

        if (this.creatable_bodies.length > 0) {
            let removableCreatableBodies = [];
            let bodyCount = this.creatable_bodies.length;

            for (let i = 0; i < bodyCount; i++) {
                let object = this.teams.red.flag;
                if (object.id !== this.creatable_bodies[i]) {
                    object = this.teams.blue.flag;
                }

                object.createBody();

                removableCreatableBodies.push(i);
            }

            for (let i = removableCreatableBodies.length - 1; i >= 0; i--) {
                this.creatable_bodies.splice(removableCreatableBodies[i], 1);
            }
        }
    }

    heartbeat() {
        //the number of food that needs to be generated
        let currentShieldCount = 0;
        let currentMineCount = 0;
        let currentGrenadeCount = 0;
        let currentBuffCount = this.buff_list.length;

        let foodCount = this.food_list.length;
        for (let i = 0; i < foodCount; i++) {
            if (this.food_list[i].type === 'mine-pickup') {
                currentMineCount++;
            } else if (this.food_list[i].type === 'grenade-pickup') {
                currentGrenadeCount++;
            } else {
                currentShieldCount++;
            }
        }

        let missingShieldCount = this.properties.max_food - currentShieldCount;
        let missingMineCount = this.properties.max_mines - currentMineCount;
        let missingGrenadeCount = this.properties.max_grenades - currentGrenadeCount;

        //add the food
        this.addFood(missingShieldCount, 'shield-pickup');
        this.addFood(missingMineCount, 'mine-pickup');
        this.addFood(missingGrenadeCount, 'grenade-pickup');

        this.addBuffs((this.properties.max_buffs - currentBuffCount));
    }

    addFood(n, type, x, y) {

        //return if it is not required to create food
        if (n <= 0) {
            return false;
        }

        let positionX = false;
        if (typeof x !== 'undefined') {
            positionX = x;
        }

        let positionY = false;
        if (typeof x !== 'undefined') {
            positionY = y;
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

            let foodEntity = new FoodObject(this.properties.width, this.properties.height, color, type, uniqueId, positionX, positionY, this);

            this.food_list.push(foodEntity);
            pushableItems.push(foodEntity);
        }

        //set the food data back to client
        this.io.to(this.mode).emit("item-update", pushableItems);
    }

    addBuffs(n) {
        //return if it is not required to create food
        if (n <= 0) {
            return false;
        }

        let pushableItems = [];
        //create n number of foods to the game
        for (let i = 0; i < n; i++) {
            //create the unique id using node-uuid
            let uniqueId = unique.v4();

            let randomBuff = this.buffs[Math.floor(Math.random() * this.buffs.length)];

            let buffEntity = new BuffObject(this.properties.width, this.properties.height, this.colors[randomBuff.color], randomBuff.type, uniqueId, this);

            this.buff_list.push(buffEntity);
            pushableItems.push(buffEntity);
        }

        //set the food data back to client
        this.io.to(this.mode).emit("buff-update", pushableItems);
    }

    findPlayer(id, returnKey) {
        if (typeof returnKey === 'undefined') returnKey = false;

        for (let i = 0; i < this.player_list.length; i++) {
            if (this.player_list[i].id === id) {
                if (returnKey) {
                    return i;
                }

                return this.player_list[i];
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
                } else {
                    return this.grenade_list[i];
                }
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
                } else {
                    return this.buff_list[i];
                }
            }
        }

        return false;
    }

    getLeader() {
        return _.head(_.orderBy(this.player_list, ['score'], ['desc']));
    }

    checkLeader(player) {
        if (player.id !== this.leader.id) {
            if (player.score > this.leader.score) {
                this.leader.score = player.score;
                this.leader.id = player.id;

                this.io.to(this.mode).emit('change-leader', {
                    id: player.id
                });
            }
        } else {
            this.leader.score = player.score;
        }
    }

    recalculateHighscore(player) {
        if (player.username) {
            let highScores = _.cloneDeep(this.highscores);

            let found = _.findIndex(highScores, (highscore) => {
                return highscore.username === player.username;
            });

            if (player) {
                if (found && highScores[found]) {
                    if (player.score > highScores[found].score) {
                        highScores[found].score = player.score;
                    }
                } else {
                    highScores.push({
                        username: player.username,
                        score: player.score
                    });
                }

                this.highscores = _.take(_.orderBy(highScores, ['score'], ['desc']), 5);
            }
        }
    }
}

module.exports = GameService;
