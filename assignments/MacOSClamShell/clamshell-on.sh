#!/bin/bash
# Enable clamshell mode - keep Mac running when lid is closed
sudo pmset -b sleep 0 disablesleep 1 hibernatemode 0 standby 0 standbydelay 0 powernap 0
sudo pmset -c sleep 0 disablesleep 1 hibernatemode 0 standby 0 standbydelay 0 powernap 0

echo "Clamshell mode ENABLED"
echo "Verify with: pmset -g | grep SleepDisabled"
