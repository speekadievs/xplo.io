class UtilService {

    /**
     * @returns {string}
     */
    static getRandomColor() {
        let length = 6;
        let chars = '0123456789ABCDEF';
        let hex = '0x';

        while (length--) hex += chars[(Math.random() * 16) | 0];

        return hex;
    }

    /**
     * @param min
     * @param max
     * @returns {*}
     */
    static getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * @returns {*}
     */
    static getRandomPosition() {
        return UtilService.getRandomInt(2000, (game_instance.canvas_height - 2000));
    }

    /**
     * @param s
     * @returns {string}
     */
    static formatTime(s) {
        // Convert seconds (s) to a nicely formatted and padded time string
        let minutes = "0" + Math.floor(s / 60);
        let seconds = "0" + (s - minutes * 60);
        return minutes.substr(-2) + ":" + seconds.substr(-2);
    }
}

module.exports = UtilService;