#!/bin/bash

docker run -it --rm -v $1:/taipei_steak --link mongo:mongo mongo mongorestore -h mongo -d taipei_steak /taipei_steak
