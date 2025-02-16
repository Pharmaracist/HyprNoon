#!/bin/bash

# Get the command to run
cmd="$1"

# If no command provided, use default app menu
if [ -z "$cmd" ]; then
    cmd="rofi -show drun"
fi

# Check if rofi is already running
if pgrep -x rofi > /dev/null; then
    # If rofi is running, kill it and exit
    killall rofi
    exit 0
else
    # If rofi is not running, run the command
    eval "$cmd"
fi
