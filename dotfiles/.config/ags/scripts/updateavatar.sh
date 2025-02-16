#!/bin/bash

# Get user's avatar from accountsservice and cache it
AVATAR_CACHE="$HOME/.cache/avatar.png"
DBUS_USER_PATH=$(dbus-send --system --dest=org.freedesktop.Accounts --type=method_call --print-reply /org/freedesktop/Accounts org.freedesktop.Accounts.FindUserByName string:"$USER" | grep -o "/org/freedesktop/Accounts/User.*")

if [ -n "$DBUS_USER_PATH" ]; then
    ICON_FILE=$(dbus-send --system --dest=org.freedesktop.Accounts --type=method_call --print-reply "$DBUS_USER_PATH" org.freedesktop.DBus.Properties.Get string:org.freedesktop.Accounts.User string:IconFile | grep -o '".*"' | tr -d '"')
    
    if [ -f "$ICON_FILE" ]; then
        cp "$ICON_FILE" "$AVATAR_CACHE"
    else
        # If no avatar is set, create a default one with user's initials
        INITIALS=$(echo $USER | cut -c1-2 | tr '[:lower:]' '[:upper:]')
        convert -size 256x256 xc:"#1e1e2e" -pointsize 120 -gravity center -fill white -font "DejaVu-Sans-Bold" -draw "text 0,0 '$INITIALS'" "$AVATAR_CACHE"
    fi
fi
