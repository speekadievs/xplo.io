class UtilService {

    /**
     * @returns {string}
     */
    static getRandomColor() {
        let colorArray = [
            '0xFF6633', '0xFFB399', '0xFF33FF', '0xFFFF99', '0x00B3E6',
            '0xE6B333', '0x3366E6', '0x999966', '0x99FF99', '0xB34D4D',
            '0x80B300', '0x809900', '0xE6B3B3', '0x6680B3', '0x66991A',
            '0xFF99E6', '0xCCFF1A', '0xFF1A66', '0xE6331A', '0x33FFCC',
            '0x66994D', '0xB366CC', '0x4D8000', '0xB33300', '0xCC80CC',
            '0x66664D', '0x991AFF', '0xE666FF', '0x4DB3FF', '0x1AB399',
            '0xE666B3', '0x33991A', '0xCC9999', '0xB3B31A', '0x00E680',
            '0x4D8066', '0x809980', '0xE6FF80', '0x1AFF33', '0x999933',
            '0xFF3380', '0xCCCC00', '0x66E64D', '0x4D80CC', '0x9900B3',
            '0xE64D66', '0x4DB380', '0xFF4D4D', '0x99E6E6', '0x6666FF'
        ];

        return colorArray[Math.floor(Math.random() * colorArray.length)];
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