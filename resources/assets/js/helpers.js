function moveToPointer(displayObject, speed, pointer, maxTime) {

    let angle = angleToPointer(displayObject, pointer);

    if (maxTime > 0) {
        //  We know how many pixels we need to move, but how fast?
        speed = distanceToPointer(displayObject, pointer) / (maxTime / 1000);
    }

    displayObject.body.velocity.x = Math.cos(angle) * speed;
    displayObject.body.velocity.y = Math.sin(angle) * speed;

    return angle;
}

function distanceToPointer(displayObject, pointer, world) {
    if (world === undefined) {
        world = false;
    }

    let dx = (world) ? displayObject.world.x - pointer.worldX : displayObject.x - pointer.worldX;
    let dy = (world) ? displayObject.world.y - pointer.worldY : displayObject.y - pointer.worldY;

    return Math.sqrt(dx * dx + dy * dy);
}

function angleToPointer(displayObject, pointer, world) {
    if (world === undefined) {
        world = false;
    }

    if (world) {
        return Math.atan2(pointer.worldY - displayObject.world.y, pointer.worldX - displayObject.world.x);
    }
    else {
        return Math.atan2(pointer.worldY - displayObject.y, pointer.worldX - displayObject.x);
    }
}

module.exports = {
    moveToPointer: moveToPointer,
    distanceToPointer: distanceToPointer,
    angleToPointer: angleToPointer,
};