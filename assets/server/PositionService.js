class PositionService {

    /**
     * @param displayObject
     * @param speed
     * @param pointer
     * @param maxTime
     * @returns {number}
     */
    static moveToPointer(displayObject, speed, pointer, maxTime) {
        pointer = pointer;

        if (maxTime === undefined) { maxTime = 0; }

        let angle = PositionService.angleToPointer(displayObject, pointer);

        if (maxTime > 0) {
            //  We know how many pixels we need to move, but how fast?
            speed = PositionService.distanceToPointer(displayObject, pointer) / (maxTime / 1000);
        }

        displayObject.playerBody.velocity[0] = Math.cos(angle) * speed;
        displayObject.playerBody.velocity[1] = Math.sin(angle) * speed;

        return angle;
    }

    /**
     * @param displayObject
     * @param pointer
     * @param world
     * @returns {number}
     */
    static distanceToPointer (displayObject, pointer, world) {

        if (world === undefined) { world = false; }

        let dx = (world) ? displayObject.world.x - pointer.worldX : displayObject.playerBody.position[0] - pointer.worldX;
        let dy = (world) ? displayObject.world.y - pointer.worldY : displayObject.playerBody.position[1] - pointer.worldY;

        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * @param displayObject
     * @param pointer
     * @param world
     * @returns {number}
     */
    static angleToPointer (displayObject, pointer, world) {


        if (world === undefined) { world = false; }

        if (world) {
            return Math.atan2(pointer.worldY - displayObject.world.y, pointer.worldX - displayObject.world.x);
        }
        return Math.atan2(pointer.worldY - displayObject.playerBody.position[1], pointer.worldX - displayObject.playerBody.position[0]);
    }
}

module.exports = PositionService;