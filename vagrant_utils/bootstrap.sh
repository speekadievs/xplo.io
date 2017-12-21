#!/usr/bin/env bash

# Update the box
# --------------
# Downloads the package lists from the repositories
# and "updates" them to get information on the newest
# versions of packages and their dependencies
apt-get update

# Install Vim
apt-get install -y vim

# Apache
# ------
# Install
apt-get install -y apache2
# Remove /var/www default
rm -rf /var/www
# Symlink /vagrant to /var/www
ln -fs /vagrant /var/www


# Enable mod_rewrite
a2enmod rewrite
# Restart apache
service apache2 restart

apt-get install nfs-common portmap

# PHP 7
# -------

add-apt-repository ppa:ondrej/php

apt-get update

apt-get --assume-yes install php7.1 php7.1-cli php7.1-common libapache2-mod-php7.1 php7.1-mysql php7.1-fpm php7.1-curl php7.1-gd php7.1-bz2 php7.1-mcrypt php7.1-json php7.1-tidy php7.1-mbstring php-redis php-memcached php-xml

service apache2 restart

# cURL
# ----
apt-get install -y curl

# Mysql
# -----
ROOT_PASSWORD="root"
# set options
echo "mysql-apt-config mysql-apt-config/unsupported-platform select abort" | /usr/bin/debconf-set-selections
echo "mysql-apt-config mysql-apt-config/repo-codename   select trusty" | /usr/bin/debconf-set-selections
echo "mysql-apt-config mysql-apt-config/select-tools select" | /usr/bin/debconf-set-selections
echo "mysql-apt-config mysql-apt-config/repo-distro select ubuntu" | /usr/bin/debconf-set-selections
echo "mysql-apt-config mysql-apt-config/select-server select mysql-5.7" | /usr/bin/debconf-set-selections
echo "mysql-apt-config mysql-apt-config/select-product select Apply" | /usr/bin/debconf-set-selections

echo "mysql-community-server mysql-community-server/root-pass password $ROOT_PASSWORD" | /usr/bin/debconf-set-selections
echo "mysql-community-server mysql-community-server/re-root-pass password $ROOT_PASSWORD" | /usr/bin/debconf-set-selections
echo "mysql-community-server mysql-community-server/remove-data-dir boolean false" | /usr/bin/debconf-set-selections
echo "mysql-community-server mysql-community-server/data-dir note" | /usr/bin/debconf-set-selections

export DEBIAN_FRONTEND=noninteractive
wget http://dev.mysql.com/get/mysql-apt-config_0.6.0-1_all.deb
dpkg --install mysql-apt-config_0.6.0-1_all.deb
apt-get update
apt-get --yes --force-yes install mysql-server

sudo grep -v bind-address /etc/mysql/my.cnf > /tmp/copy_buffer.txt
mv /tmp/copy_buffer.txt /etc/mysql/my.cnf

touch /tmp/mysql_setup.txt

# create databases
echo "grant all privileges on *.* to 'root'@'10.0.2.2' with grant option" | mysql -u root -proot
echo "create database homestead" | mysql -u root -proot

# import databases
mysql mysql --user=root --password=root < /tmp/mysql_setup.txt
mysql homestead --user=root --password=root < /tmp/mysql_setup.txt

# sed -i "/[mysqld]/[mysqld]\
# sql_mode=NO_ENGINE_SUBSTITUTION\
# " /etc/mysql/mysql.conf.d/mysqld.cnf

# starting with 5.6, default config changed, which our app is not happy with
perl -i -pe "BEGIN{undef $/;} s/^\[mysqld\]$/[mysqld]\n\sql_mode=NO_ENGINE_SUBSTITUTION\n/sgm" /etc/mysql/mysql.conf.d/mysqld.cnf

rm /tmp/mysql_setup.txt
service mysql restart

# Library dependencies
cd /vagrant
composer install
composer dump-autoload -o


