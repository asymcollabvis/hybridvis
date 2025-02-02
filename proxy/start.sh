#!/bin/bash
source IAWeb/.env

docker run --name=proxy -d --platform linux/amd64 \
        -v $ROOT/proxy/envoy.yaml:/etc/envoy/envoy.yaml:ro \
        -v $ROOT/proxy/cert.pem:/etc/server.crt:ro \
        -v $ROOT/proxy/key.pem:/etc/server.key:ro \
        -p 8081:8081 \
        envoyproxy/envoy:v1.14-latest

        
# docker run --name=proxy -d --platform linux/amd64 -v $ROOT/proxy/envoy.yaml:/etc/envoy/envoy.yaml:ro -v $ROOT/proxy/cert.pem:/etc/server.crt:ro -v $ROOT/proxy/key.pem:/etc/server.key:ro -p 8081:8081 envoyproxy/envoy:v1.14-latest 