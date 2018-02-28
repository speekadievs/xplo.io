class PositionService {

    /**
     * @param displayObject
     * @param speed
     * @param pointer
     * @param maxTime
     * @returns {*|number}
     */
    static moveToPointer(displayObject, speed, pointer, maxTime) {

        let angle = PositionService.angleToPointer(displayObject, pointer);

        if (maxTime > 0) {
            //  We know how many pixels we need to move, but how fast?
            speed = PositionService.distanceToPointer(displayObject, pointer) / (maxTime / 1000);
        }

        displayObject.body.velocity.x = Math.cos(angle) * speed;
        displayObject.body.velocity.y = Math.sin(angle) * speed;

        return angle;

    }

    static moveToPointerPos(pos, speed, pointer) {

    }

    /**
     * @param displayObject
     * @param pointer
     * @param world
     * @returns {number}
     */
    static distanceToPointer(displayObject, pointer, world) {

        if (world === undefined) {
            world = false;
        }

        let dx = (world) ? displayObject.world.x - pointer.worldX : displayObject.x - pointer.worldX;
        let dy = (world) ? displayObject.world.y - pointer.worldY : displayObject.y - pointer.worldY;

        return Math.sqrt(dx * dx + dy * dy);

    }

    /**
     * @param displayObject
     * @param pointer
     * @param world
     * @returns {number}
     */
    static angleToPointer(displayObject, pointer, world) {


        if (world === undefined) {
            world = false;
        }

        if (world) {
            return Math.atan2(pointer.worldY - displayObject.world.y, pointer.worldX - displayObject.world.x);
        }

        return Math.atan2(pointer.worldY - displayObject.y, pointer.worldX - displayObject.x);

    }
}

module.exports = PositionService;