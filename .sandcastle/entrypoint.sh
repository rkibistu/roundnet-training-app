#!/bin/sh
set -e

sudo service postgresql start

until pg_isready -h 127.0.0.1 -p 5432 -U roundnet -q; do
  sleep 1
done

exec sleep infinity
