#!/usr/bin/env bash
cd "$(dirname "$0")"
export base="$(pwd)"
source ./scriptdata/environment-variables
source ./scriptdata/functions
source ./scriptdata/installers
source ./scriptdata/options

# Add log file setup at the beginning
LOG_FILE="./installation_$(date +%Y%m%d_%H%M%S).log"
exec 1> >(tee -a "$LOG_FILE") 2>&1

echo "Installation started at $(date)"
echo "System information:"
uname -a

#####################################################################################
if ! command -v pacman >/dev/null 2>&1; then
	printf "\e[31m[$0]: pacman not found, it seems that the system is not ArchLinux or Arch-based distros. Aborting...\e[0m\n"
	exit 1
fi
prevent_sudo_or_root

set -e
#####################################################################################
printf "\e[36m[$0]: 1. Get packages and setup user groups/services\n\e[0m"

# Issue #363
case $SKIP_SYSUPDATE in
	true) sleep 0;;
	*) v sudo pacman -Syu;;
esac

# Use yay. Because paru do not support cleanbuild.
# Also see https://wiki.hyprland.org/FAQ/#how-do-i-update
if ! command -v yay >/dev/null 2>&1;then
	echo -e "\e[33m[$0]: \"yay\" not found.\e[0m"
	showfun install-yay
	v install-yay
fi

# Install extra packages from dependencies.conf as declared by the user
if (( ${#pkglist[@]} != 0 )); then
		if $ask; then
			# execute per element of the array $pkglist
			for i in "${pkglist[@]}";do v yay -S --needed $i;done
		else
			# execute for all elements of the array $pkglist in one line
			v yay -S --needed --noconfirm ${pkglist[*]}
		fi
fi

# Convert old dependencies to non explicit dependencies so that they can be orphaned if not in meta packages
set-explicit-to-implicit() {
	remove_bashcomments_emptylines ./scriptdata/previous_dependencies.conf ./cache/old_deps_stripped.conf
	readarray -t old_deps_list < ./cache/old_deps_stripped.conf
	pacman -Qeq > ./cache/pacman_explicit_packages
	readarray -t explicitly_installed < ./cache/pacman_explicit_packages

	echo "Attempting to set previously explicitly installed deps as implicit..."
	for i in "${explicitly_installed[@]}"; do for j in "${old_deps_list[@]}"; do
		[ "$i" = "$j" ] && yay -D --asdeps "$i"
	done; done

	return 0
}

$ask && echo "Attempt to set previously explicitly installed deps as implicit? "
$ask && showfun set-explicit-to-implicit
v set-explicit-to-implicit

# https://github.com/end-4/dots-hyprland/issues/581
# yay -Bi is kinda hit or miss, instead cd into the relevant directory and manually source and install deps
install-local-pkgbuild() {
	local location=$1
	local installflags=$2

	x pushd $location

	source ./PKGBUILD
	x yay -S $installflags --asdeps "${depends[@]}"
	x makepkg -si --noconfirm

	x popd
}

# Install core dependencies from the meta-packages
metapkgs=(./arch-packages/illogical-impulse-{audio,backlight,basic,fonts-themes,gnome,gtk,portal,python,screencapture,widgets})
metapkgs+=(./arch-packages/illogical-impulse-agsv1)
metapkgs+=(./arch-packages/illogical-impulse-microtex-git)
[[ -f /usr/share/icons/Bibata-Modern-Classic/index.theme ]] || \
	metapkgs+=(./arch-packages/illogical-impulse-bibata-modern-classic-bin)
try sudo pacman -R illogical-impulse-microtex

for i in "${metapkgs[@]}"; do
	metainstallflags="--needed"
	$ask && showfun install-local-pkgbuild || metainstallflags="$metainstallflags --noconfirm"
	v install-local-pkgbuild "$i" "$metainstallflags"
done

# https://github.com/end-4/dots-hyprland/issues/428#issuecomment-2081690658
# https://github.com/end-4/dots-hyprland/issues/428#issuecomment-2081701482
# https://github.com/end-4/dots-hyprland/issues/428#issuecomment-2081707099
case $SKIP_PYMYC_AUR in
	true) sleep 0;;
	*)
		pymycinstallflags=""
		$ask && showfun install-local-pkgbuild || pymycinstallflags="$pymycinstallflags --noconfirm"
		v install-local-pkgbuild "./arch-packages/illogical-impulse-pymyc-aur" "$pymycinstallflags"
		;;
esac


# Why need cleanbuild? see https://github.com/end-4/dots-hyprland/issues/389#issuecomment-2040671585
case $SKIP_HYPR_AUR in
	true) sleep 0;;
	*)
		hyprland_installflags="-S"
		$ask || hyprland_installflags="$hyprland_installflags --noconfirm"
		v yay $hyprland_installflags --asdeps hyprutils hyprlang hyprcursor hyprwayland-scanner
		v yay $hyprland_installflags --answerclean=a hyprland
		;;
esac


## Optional dependencies
if pacman -Qs ^plasma-browser-integration$ ;then SKIP_PLASMAINTG=true;fi
case $SKIP_PLASMAINTG in
	true) sleep 0;;
	*)
		if $ask;then
			echo -e "\e[33m[$0]: NOTE: The size of \"plasma-browser-integration\" is about 250 MiB.\e[0m"
			echo -e "\e[33mIt is needed if you want playtime of media in Firefox to be shown on the music controls widget.\e[0m"
			echo -e "\e[33mInstall it? [y/N]\e[0m"
			read -p "====> " p
		else
			p=y
		fi
		case $p in
			y) x sudo pacman -S --needed --noconfirm plasma-browser-integration ;;
			*) echo "Ok, won't install"
		esac
		;;
esac

v sudo usermod -aG video,i2c,input "$(whoami)"
v bash -c "echo i2c-dev | sudo tee /etc/modules-load.d/i2c-dev.conf"
v systemctl --user enable ydotool --now
v gsettings set org.gnome.desktop.interface font-name 'Rubik 11'

#####################################################################################
printf "\e[36m[$0]: 2. Installing parts from source repo\n\e[0m"
sleep 1

#####################################################################################
printf "\e[36m[$0]: 3. Copying + Configuring\n\e[0m"

# In case some folders does not exists
v mkdir -p $XDG_BIN_HOME $XDG_CACHE_HOME $XDG_CONFIG_HOME $XDG_DATA_HOME

# --delete' for rsync to make sure that
# original dotfiles and new ones in the SAME DIRECTORY
# (eg. in ~/.config/hypr) won't be mixed together

# CONFIG FILES (chrome-flags.conf, code-flags.conf, starship.toml, thorium-flags.conf) - Package: config-files
case $SKIP_CONFIG_FILES in
	true) sleep 0 ;;
	*)
		printf "\e[34m[$0]: Synchronizing miscellaneous config files (excluding ags, fish, hypr)...\e[0m\n"
		# Use find to iterate through top-level directories in .config, excluding 'ags', 'fish', 'hypr'
		for i in $(find "$base/.config/" -mindepth 1 -maxdepth 1 ! -name 'ags' ! -name 'fish' ! -name 'hypr' -type d -exec basename {} \;); do
			config_dir=".config/$i" # Construct the full path relative to root
			echo "[$0]: Found target config directory: $config_dir"
			if [ -d "$base/$config_dir" ]; then
				v rsync -av --delete "$base/$config_dir/" "$XDG_CONFIG_HOME/$i/"
			else
				echo -e "\e[33m[$0]: Warning: Source config directory not found: $config_dir\e[0m"
			fi
		done

		# Also handle standalone config files directly in .config (not in subdirectories)
		for i in $(find "$base/.config/" -maxdepth 1 ! -name 'ags' ! -name 'fish' ! -name 'hypr' -type f -exec basename {} \;); do
			config_file=".config/$i" # Construct the full path relative to root
			echo "[$0]: Found target config file: $config_file"
			if [ -f "$base/$config_file" ]; then
				v rsync -av "$base/$config_file" "$XDG_CONFIG_HOME/$i"
			else
				echo -e "\e[33m[$0]: Warning: Source config file not found: $config_file\e[0m"
			fi
		done
		;;
esac

# FISH - Package: fish
case $SKIP_FISH in
	true) sleep 0 ;;
	*)
		printf "\e[34m[$0]: Synchronizing fish config...\e[0m\n"
		v rsync -av --delete "$base/.config/fish/" "$XDG_CONFIG_HOME/fish/"
		;;
esac

# .local
case $SKIP_LOCAL in
	true) sleep 0 ;;
	*)
		printf "\e[34m[$0]: Synchronizing .local...\e[0m\n"
		v rsync -av "$base/.local" "$HOME"
		;;
esac

# .local
case $SKIP_FONTS in
	true) sleep 0 ;;
	*)
		printf "\e[34m[$0]: Synchronizing .fonts...\e[0m\n"
		v rsync -av "$base/.fonts" "$HOME"
		;;
esac

# AGS - Package: ags
case $SKIP_AGS in
	true) sleep 0 ;;
	*)
		# Main section for setting up AGS configurations
		printf "\e[36m[$0]: Setting up AGS configurations (no confirmation for .ags removal)...\e[0m\n"

		######################################################################
		# Part 1: Configure $XDG_CONFIG_HOME/ags/ (using rsync)
		printf "\e[34m[$0]: Synchronizing 'ags' config in $XDG_CONFIG_HOME/ags/ using rsync...\e[0m\n"

		# Define the correct source path for the "ags" folder
		rsync_ags_source_dir="$base/.config/ags" # Removed "local" here

		# 1. Check for existence of "ags" folder at /.config/ags
		if [ -d "$rsync_ags_source_dir" ]; then
			echo "[$0]: Found 'ags' folder (for rsync) at: $rsync_ags_source_dir"
		else
			echo -e "\e[33m[$0]: Warning: 'ags' folder not found at: $rsync_ags_source_dir (for rsync).\e[0m"
			echo -e "\e[33m[$0]: Skipping 'ags' config setup in $XDG_CONFIG_HOME/ags/ (rsync).\e[0m"
			SKIP_AGS_CONFIG_RSYNC=true # Flag to skip rsync part of AGS config
		fi

		if ! [[ "$SKIP_AGS_CONFIG_RSYNC" == "true" ]]; then
			v rsync -av --delete --exclude '/user_options.js' "$rsync_ags_source_dir/" "$XDG_CONFIG_HOME/ags/"

			t="$XDG_CONFIG_HOME/ags/user_options.js"
			if [ -f $t ]; then
				echo -e "\e[34m[$0]: \"$t\" already exists.\e[0m"
				existed_ags_opt=y
			else
				echo -e "\e[33m[$0]: \"$t\" does not exist yet.\e[0m"
				v cp "$rsync_ags_source_dir/user_options.js" "$t"
				existed_ags_opt=n
			fi
			v mkdir -p "$HOME/.ags"
			v cp -f "$rsync_ags_source_dir/modules/.configuration/user_options.default.json" "$HOME/.ags/config.json"

		fi # end of SKIP_AGS_CONFIG_RSYNC check

		######################################################################
		# Part 2: Root ".ags" copy to ~/.ags (using rsync -av --delete - for synchronization of /.ags to ~/.ags)
		case $SKIP_ROOT_DOT_AGS_COPY in
			true) sleep 0 ;;
			*)
				# Add section for copying root ".ags" to ~/.ags (using rsync -av --delete - NO CONFIRMATION)
				printf "\e[34m[$0]: Synchronizing '.ags' to ~/.ags (rsync -av --delete - NO CONFIRMATION)...\e[0m\n"

				# Define source and destination paths for ".ags" sync (with dot)
				source_dot_ags_dir="$base/.ags"
				dest_ags_dir="$HOME/.ags" # Removed "local" here

				# 1. Check for existence of source ".ags"
				if [ -d "$source_dot_ags_dir" ]; then
					echo "[$0]: Found source '.ags' folder at: $source_dot_ags_dir"
				else
					echo -e "\e[31m[$0]: ERROR: Source '.ags' folder not found at: $source_dot_ags_dir\e[0m" # Red color for error
					echo -e "[$0]: Skipping '.ags' folder synchronization to ~.\e[0m"
					SKIP_ROOT_DOT_AGS_COPY=true # Flag to skip ".ags" root copy due to missing source
				fi

				if ! [[ "$SKIP_ROOT_DOT_AGS_COPY" == "true" ]]; then
					# 2. Synchronize ".ags" folder using rsync -av --delete (NO CONFIRMATION)
					if [ -d "$source_dot_ags_dir" ]; then # Re-check source dir for safety
						v rsync -av --delete "$source_dot_ags_dir/" "$dest_ags_dir/" # Using rsync -av --delete for sync
						echo "[$0]: Synchronized '.ags' to ~/.ags from '$source_dot_ags_dir' (without confirmation, using rsync --delete)."
					fi
				fi # end of SKIP_ROOT_DOT_AGS_COPY check
			;;
		esac

		;;
esac

# HYPRLAND - Package: hypr
case $SKIP_HYPRLAND in
	true) sleep 0 ;;
	*)
		printf "\e[34m[$0]: Synchronizing hyprland config...\e[0m\n"
		# Source is now back to .config/hypr, rsync source path corrected:
		v rsync -av --delete --exclude '/custom' --exclude '/hyprland.conf' "$base/.config/hypr/" "$XDG_CONFIG_HOME/hypr/"

		t="$XDG_CONFIG_HOME/hypr/hyprland.conf"
		if [ -f $t ]; then
			echo -e "\e[34m[$0]: \"$t\" already exists.\e[0m"
			# Source is now back to .config/hypr, cp source path corrected:
			v cp -f "$base/.config/hypr/hyprland.conf" "$t.new"
			existed_hypr_conf=y
		else
			echo -e "\e[33m[$0]: \"$t\" does not exist yet.\e[0m"
			# Source is now back to .config/hypr, cp source path corrected:
			v cp -f "$base/.config/hypr/hyprland.conf" "$t"
			existed_hypr_conf=n
		fi
		;;
esac

# ROFI - Package: rofi
case $SKIP_ROFI in # Assuming you have a SKIP_ROFI variable
	true) sleep 0 ;;
	*)
		printf "\e[34m[$0]: Synchronizing rofi config...\e[0m\n"
		v rsync -av --delete "$base/.config/rofi/" "$HOME/.config/rofi/" # Target is now $HOME for ~/.config
		;;
esac

# Dark mode by default (keep as is)
v gsettings set org.gnome.desktop.interface color-scheme 'prefer-dark'

# Prevent hyprland from not fully loaded (keep as is)
sleep 1
try hyprctl reload

existed_zsh_conf=n
grep -q 'source ${XDG_CONFIG_HOME:-~/.config}/zshrc.d/dots-hyprland.zsh' ~/.zshrc && existed_zsh_conf=y

warn_files=()
warn_files_tests=()
warn_files_tests+=(/usr/local/bin/ags)
warn_files_tests+=(/usr/local/etc/pam.d/ags)
warn_files_tests+=(/usr/local/lib/{GUtils-1.0.typelib,Gvc-1.0.typelib,libgutils.so,libgvc.so})
warn_files_tests+=(/usr/local/share/com.github.Aylur.ags)
warn_files_tests+=(/usr/local/share/fonts/TTF/Rubik{,-Italic}'[wght]'.ttf)
warn_files_tests+=(/usr/local/share/licenses/ttf-rubik)
warn_files_tests+=(/usr/local/share/fonts/TTF/Gabarito-{Black,Bold,ExtraBold,Medium,Regular,SemiBold}.ttf)
warn_files_tests+=(/usr/local/share/licenses/ttf-gabarito)
warn_files_tests+=(/usr/local/share/icons/Bibata-Modern-Classic)
warn_files_tests+=(/usr/local/bin/{LaTeX,res})
for i in ${warn_files_tests[@]}; do
	echo $i
	test -f $i && warn_files+=($i)
	test -d $i && warn_files+=($i)
done

#####################################################################################
printf "\e[36m[$0]: Finished. See the \"Import Manually\" folder and grab anything you need.\e[0m\n"
printf "\n"
printf "for hints on launching Hyprland.\e[0m\n"
printf "\n"

case $existed_ags_opt in
	y) printf "\n\e[33m[$0]: Warning: \"$XDG_CONFIG_HOME/ags/user_options.js\" already existed before and we didn't overwrite it. \e[0m\n"
#	    printf "\e[33mPlease use \"$XDG_CONFIG_HOME/ags/user_options.js.new\" as a reference for a proper format.\e[0m\n"
;;esac
case $existed_hypr_conf in
	y) printf "\n\e[33m[$0]: Warning: \"$XDG_CONFIG_HOME/hypr/hyprland.conf\" already existed before and we didn't overwrite it. \e[0m\n"
		printf "\e[33mPlease use \"$XDG_CONFIG_HOME/hypr/hyprland.conf.new\" as a reference for a proper format.\e[0m\n"
		printf "\e[33mIf this is your first time installation, you must overwrite \"$XDG_CONFIG_HOME/hypr/hyprland.conf\" with \"$XDG_CONFIG_HOME/hypr/hyprland.conf.new\".\e[0m\n"
;;esac

if [[ ! -z "${warn_files[@]}" ]]; then
	printf "\n\e[31m[$0]: \!! Important \!! : Please delete \e[0m ${warn_files[*]} \e[31m manually as soon as possible, since we\'re now using AUR package or local PKGBUILD to install them for Arch(based) Linux distros, and they'll take precedence over our installation, or at least take up more space.\e[0m\n"
fi

echo "Installation completed at $(date)"
