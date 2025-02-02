#!/bin/bash

PROTO_DIR=./proto
CLIENT_DIR=./IAWeb/src/common
SERVER_DIR=./IAWeb/server

# server
npx protoc --ts_out ${SERVER_DIR} --proto_path ${PROTO_DIR} ${PROTO_DIR}/*.proto --ts_opt server_grpc1,client_none,optimize_code_size

# client
npx protoc --ts_out ${CLIENT_DIR} --proto_path ${PROTO_DIR} ${PROTO_DIR}/*.proto