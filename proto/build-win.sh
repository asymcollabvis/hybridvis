#!/bin/bash

# deprecated
# TODO: update the command similar to how build.sh is updated

PROTO_DIR=./proto
CLIENT_DIR=./IAWeb/src/common
SERVER_DIR=./IAWeb/server

# server
npx grpc_tools_node_protoc \
    --js_out=import_style=commonjs,binary:${SERVER_DIR} \
    --grpc_out=${SERVER_DIR} \
    --plugin=protoc-gen-grpc=.\\node_modules\\.bin\\grpc_tools_node_protoc_plugin.cmd \
    --plugin=protoc-gen-ts=.\\node_modules\\.bin\\protoc-gen-ts.cmd \
    --ts_out=${SERVER_DIR} \
    -I ${PROTO_DIR} \
    ${PROTO_DIR}/*.proto

# client
npx grpc_tools_node_protoc \
    --js_out=import_style=commonjs,binary:${CLIENT_DIR} \
    --grpc-web_out=import_style=commonjs+dts,mode=grpcwebtext:${CLIENT_DIR} \
    -I ${PROTO_DIR} \
    ${PROTO_DIR}/*.proto