#!/usr/bin/env bash

getdate() {
    date '+%Y%m%d_%H%M%S'
}
getaudiooutput() {
    pactl list short sources | grep monitor | head -n1 | cut -f1
}
getactivemonitor() {
    hyprctl monitors -j | jq -r '.[] | select(.focused == true) | .name'
}

videos_dir="$(xdg-user-dir VIDEOS)"
mkdir -p "$videos_dir"
cd "$videos_dir" || exit

if pidof wf-recorder > /dev/null; then
    notify-send "Recording stopped" -a 'record-script.sh' &
    killall -SIGINT wf-recorder &
else
    output_file="./rec_$(getdate).mp4"
    notify-send "Recording started" "$output_file" -a 'record-script.sh'
    if [[ "$1" == "--fullscreen" ]]; then
        wf-recorder -c h264_vaapi -d /dev/dri/renderD128 \
            -o "$(getactivemonitor)" \
            -f "$output_file" \
            --audio="$(getaudiooutput)" & disown
    else
        wf-recorder -c h264_vaapi -d /dev/dri/renderD128 \
            -g "$(slurp)" \
            -f "$output_file" \
            --audio="$(getaudiooutput)" & disown
    fi
fi
