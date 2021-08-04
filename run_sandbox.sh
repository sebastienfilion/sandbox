#!/bin/sh

deno run --allow-net --allow-read https://deno.land/std/http/file_server.ts --port 8080 $1
