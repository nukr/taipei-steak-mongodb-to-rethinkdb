#!/bin/bash

docker run -d -p 28015:28015 -p 8080:8080 --name rethinkdb rethinkdb
