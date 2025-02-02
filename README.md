# Cross Device Visual Sensemaking System

This repo is for IEEE TVCG 2025 submission: Exploring Spatial Hybrid User Interface for Visual Sensemaking.

## Requirement
1. Nodejs=16

## Prerequisite
1. Create a `.env` file under `IAWeb` folder
2. Add `VITE_BASE_URL="https://YOURIPORLOCALHOST"` (e.g., https://localhost)
3. Add `VITE_VITE_SERVER_PORT=SERVERPORTNUMBER` (e.g., 8081)
4. Add `ROOT="PATHTOTHEROOTFOLDER"`

## How to run?

### Backend

1. Setup backend Proxy for bridging HTTP/2 and HTTP/1
    1. Install docker
    2. Pull envoy proxy image: `docker pull envoyproxy/envoy:v1.14-latest`
    3. Run `npm run start:proxy` (For Window machine, you need to change the command in the start.sh into Window format: `docker run --name=proxy -d --platform linux/amd64 -v PATHTOTHEROOTFOLDER/proxy/envoy.yaml:/etc/envoy/envoy.yaml:ro -v PATHTOTHEROOTFOLDER/proxy/cert.pem:/etc/server.crt:ro -v PATHTOTHEROOTFOLDER/proxy/key.pem:/etc/server.key:ro -p 8081:8081 envoyproxy/envoy:v1.14-latest`)
2. Please check the [README.md](IAWeb/server/README.md) in the `IAWeb/server` folder

### Frontend

1. Please check the [README.md](IAWeb/README.md) in the `IAWeb` folder

### Streaming tracker data
1. Please check the [README.md](triad_openvr/README.md) in the `triad_openvr` folder

## Demo (localhost)

1. Go to <https://localhost:8081/> (type “thisisunsafe” if it said it is not safe)
2. Go to <https://localhost:5173/> (type “thisisunsafe” if it said it is not safe)

## Demo (with IP)

1. Check the IP of the computer
2. Change `VITE_BASE_URL="https://YOURIP:8081"` in the .env file
3. (Re-run the server if the server has already started)
4. Go to <https://YOURIP:8081/> (type “thisisunsafe” if it said it is not safe)
5. Go to <https://YOURIP:5173/> (type “thisisunsafe” if it said it is not safe)

## Build Proto rule (if necessary)

After updating Proto rule in `proto`, we need to rebuild using the following commands:

1. `pnpm install` in the root folder (for M1 Mac, use `npm_config_target_arch=x64 pnpm install` instead) 
2. `pnpm run build` (`pnpm run build:win` if Window machine)
