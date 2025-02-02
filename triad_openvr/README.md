# Sending Vive Tracker Data to server

This is built on top of the [Triad OpenVR Python Wrapper](https://github.com/TriadSemi/triad_openvr) project.

## Setup Vive Tracker without HMD
### Prerequisite
* Power on the Basestation (at least one).
* Connect Vive Dongle to your Windows PC (one dongle for one tracker).
* Install SteamVR.
* Modify SteamVR settings:
  * Open file: ..\Steam\steamapps\common\SteamVR\resources\settings\default
  * Change: "requireHmd": true --> false. 
### Connet trackers to SteamVR
* Press the power button for 1s to open. Press until blink blue to enter pairing mode. 
* In SteamVR's menu, click "Pair Controller".
* Green light means connected.
## Python to track
* Install pyopenvr and numpy: `pip install openvr numpy`
* Run `python udp_emitter.py` to emit tracking data via UDP.