#!/bin/sh

echo "${@:2}"

VAGRANTEXEC='null';
if [ $1 = 'composer' ]; then
    VAGRANTEXEC='cd /vagrant; composer '"${@:2}"';'
elif [ $1 = 'artisan' ]; then
    VAGRANTEXEC='cd /vagrant; php artisan '"${@:2}"';'
elif [ $1 = 'bower-install' ]; then
    VAGRANTEXEC='cd /vagrant/public; bower install --config.interactive=false;'
fi


if [ "$VAGRANTEXEC" != 'null' ]; then
    vagrant ssh -c "$VAGRANTEXEC"
else
    echo "No command matching $1 found"
fi
