const fs = require('fs');

let superFiles = [];

fs.readdirSync('./public/images/skins/').forEach(file => {
    superFiles.push(file.slice(0, -4))
});

fs.writeFile(

    './skins.json',

    JSON.stringify(superFiles),

    function (err) {
        if (err) {
            console.error('Crap happens');
        }
    }
);