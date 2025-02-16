function fish_prompt -d "Write out the prompt"
    # This shows up as USER@HOST /home/user/ >, with the directory colored
    # $USER and $hostname are set by fish, so you can just use them
    # instead of using `whoami` and `hostname`
    printf '%s@%s %s%s%s > ' $USER $hostname \
        (set_color $fish_color_cwd) (prompt_pwd) (set_color normal)
end

if status is-interactive
    # Commands to run in interactive sessions can go here
    set fish_greeting
pokemon-colorscripts-go -s --no-title
end
starship init fish | source
if test -f ~/.cache/ags/user/generated/terminal/sequences.txt
    cat ~/.cache/ags/user/generated/terminal/sequences.txt
end

alias pamcan=pacman
alias settings="gjs ~/.config/ags/assets/settings.js"
alias bar="micro ~/.config/ags/modules/bar/main.js"
alias barmodes="vim ~/.config/ags/modules/bar/modes"
alias config="micro ~/.ags/config.json"
alias default="micro ~/.config/ags/modules/.configuration/user_options.default.json"
# function fish_prompt
#   set_color cyan; echo (pwd)
#   set_color green; echo '> '
# end
