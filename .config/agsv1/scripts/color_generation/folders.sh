#!/usr/bin/env bash

# Function to convert hex to RGB and calculate saturation
calculate_color_saturation() {
    local hex_color="$1"
    # Remove # if present
    hex_color="${hex_color#\#}"
    
    # Convert hex to RGB
    local r=$((16#${hex_color:0:2}))
    local g=$((16#${hex_color:2:2}))
    local b=$((16#${hex_color:4:2}))
    
    # Calculate max and min values
    local max_val=$(( r > g ? (r > b ? r : b) : (g > b ? g : b) ))
    local min_val=$(( r < g ? (r < b ? r : b) : (g < b ? g : b) ))
    local diff=$((max_val - min_val))
    
    # Calculate saturation (0-100)
    local sat=0
    if [ $max_val -ne 0 ]; then
        sat=$((diff * 100 / max_val))
    fi
    
    echo "$sat $hex_color"
}

# Get the most saturated color from pywal's colors
get_most_saturated_color() {
    local colors_json="$HOME/.cache/wal/colors.json"
    local max_sat=0
    local selected_color=""
    
    if [ -f "$colors_json" ]; then
        # Check colors 0 through 7
        for i in {0..7}; do
            local color=$(jq -r ".colors.color$i" "$colors_json")
            echo "Debug: Checking color$i: $color" >&2
            
            # Calculate saturation and compare
            read sat hex_color <<< $(calculate_color_saturation "$color")
            echo "Debug: Color$i saturation: $sat" >&2
            
            if [ "$sat" -gt "$max_sat" ]; then
                max_sat=$sat
                selected_color=$color
            fi
        done
        
        echo "Debug: Selected most saturated color: $selected_color (saturation: $max_sat)" >&2
        echo "$selected_color"
    else
        echo "#0000FF"  # Default blue if no colors.json
    fi
}

# Get the color name from current wallpaper
get_color_name() {
    local wal_color=$(get_most_saturated_color)
    echo "Debug: Using most saturated color: $wal_color" >&2
    
    if [[ "$wal_color" == "#"* ]]; then
        # Convert hex to RGB
        local r=$((16#${wal_color:1:2}))
        local g=$((16#${wal_color:3:2}))
        local b=$((16#${wal_color:5:2}))
        echo "Debug: RGB values: R:$r G:$g B:$b" >&2
        
        # Calculate max and min for HSV conversion
        local max_val=$(( r > g ? (r > b ? r : b) : (g > b ? g : b) ))
        local min_val=$(( r < g ? (r < b ? r : b) : (g < b ? g : b) ))
        local diff=$((max_val - min_val))
        
        # Calculate HSV values
        local hue=0
        local sat=0
        local val=$max_val
        
        if [ $diff -ne 0 ]; then
            # Calculate saturation (0-100)
            sat=$((diff * 100 / max_val))
            
            # Calculate hue (0-360)
            if [ $r -eq $max_val ]; then
                hue=$(( (g - b) * 60 / diff ))
            elif [ $g -eq $max_val ]; then
                hue=$(( 120 + (b - r) * 60 / diff ))
            else
                hue=$(( 240 + (r - g) * 60 / diff ))
            fi
            
            # Ensure hue is positive
            if [ $hue -lt 0 ]; then
                hue=$((hue + 360))
            fi
        fi
        
        echo "Debug: HSV values - H:$hue S:$sat V:$((val * 100 / 255))" >&2
        
        # Determine color based on HSV
        if [ $sat -lt 20 ]; then
            if [ $val -lt 128 ]; then
                echo "black"
            elif [ $val -gt 200 ]; then
                echo "white"
            else
                echo "grey"
            fi
        else
            # Hue-based color selection with better thresholds
            if [ $hue -lt 10 ]; then
                echo "red"
            elif [ $hue -lt 20 ]; then
                if [ $sat -gt 80 ]; then
                    echo "deeporange"
                else
                    echo "brown"
                fi
            elif [ $hue -lt 45 ]; then
                echo "orange"
            elif [ $hue -lt 65 ]; then
                echo "yellow"
            elif [ $hue -lt 150 ]; then
                if [ $sat -lt 60 ]; then
                    echo "yaru"  # More muted green
                else
                    echo "green"
                fi
            elif [ $hue -lt 190 ]; then
                echo "teal"
            elif [ $hue -lt 210 ]; then
                echo "cyan"
            elif [ $hue -lt 240 ]; then
                if [ $sat -lt 60 ]; then
                    echo "bluegrey"
                else
                    echo "blue"
                fi
            elif [ $hue -lt 260 ]; then
                echo "indigo"
            elif [ $hue -lt 290 ]; then
                echo "purple"
            elif [ $hue -lt 330 ]; then
                if [ $val -gt 200 ]; then
                    echo "pink"
                else
                    echo "magenta"
                fi
            elif [ $hue -lt 345 ]; then
                echo "breeze"
            else
                echo "red"
            fi
            return
        fi
        echo "blue"  # Default fallback
    fi
    echo "blue"  # Default fallback
}

# Convert color name to papirus-folders color
convert_to_papirus_color() {
    local color_name="$1"
    echo "Debug: Received color $color_name" >&2
    
    # Direct mapping to papirus-folders supported colors
    case "$color_name" in
        "adwaita") echo "adwaita" ;;
        "black") echo "black" ;;
        "blue") echo "blue" ;;
        "bluegrey") echo "bluegrey" ;;
        "breeze") echo "breeze" ;;
        "brown") echo "brown" ;;
        "cyan") echo "cyan" ;;
        "deeporange") echo "deeporange" ;;
        "green") echo "green" ;;
        "grey") echo "grey" ;;
        "indigo") echo "indigo" ;;
        "magenta") echo "magenta" ;;
        "orange") echo "orange" ;;
        "pink") echo "pink" ;;
        "purple") echo "purple" ;;
        "red") echo "red" ;;
        "teal") echo "teal" ;;
        "white") echo "white" ;;
        "yaru") echo "yaru" ;;
        "yellow") echo "yellow" ;;
        *) 
            # If no direct match, try to find closest match based on description
            case "$color_name" in
                *red*) echo "red" ;;
                *blue*) echo "blue" ;;
                *green*) echo "green" ;;
                *yellow*) echo "yellow" ;;
                *orange*) echo "orange" ;;
                *purple*|*violet*) echo "purple" ;;
                *pink*) echo "pink" ;;
                *brown*) echo "brown" ;;
                *grey*|*gray*) echo "grey" ;;
                *teal*) echo "teal" ;;
                *indigo*) echo "indigo" ;;
                *magenta*) echo "magenta" ;;
                *) echo "blue" ;;
            esac
            ;;
    esac
}

# Main execution
color_name=$(get_color_name)
echo "Debug: Got color name: $color_name" >&2
papirus_color=$(convert_to_papirus_color "$color_name")
echo "Debug: Converted to papirus color: $papirus_color" >&2

# Update folder color using papirus-folders without password
if [ "$papirus_color" != "" ]; then
    papirus-folders -C "$papirus_color" -u
fi
