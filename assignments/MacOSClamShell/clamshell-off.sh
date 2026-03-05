#!/bin/bash
# Disable clamshell mode - restore default sleep behavior
sudo pmset -b sleep 10 disablesleep 0 hibernatemode 3 standby 1 standbydelay 86400 powernap 1
sudo pmset -c sleep 30 disablesleep 0 hibernatemode 3 standby 1 standbydelay 86400 powernap 1

echo "Clamshell mode DISABLED (defaults restored)"
echo "Verify with: pmset -g | grep SleepDisabled"
