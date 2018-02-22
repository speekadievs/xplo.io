#!/bin/sh

npm install

systemctl stop game

cp deploy/game.service /lib/systemd/system/

systemctl daemon-reload

systemctl enable game

systemctl start game