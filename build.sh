#!/bin/sh

npm run prod
git archive --format=zip HEAD > "$(date +%Y-%m-%d-%H-%M-%S)".zip