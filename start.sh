#!/bin/sh

stop game

cp deploy/game.conf /etc/init

npm install

start game