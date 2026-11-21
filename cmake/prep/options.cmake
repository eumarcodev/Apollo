# Publisher Metadata
set(HELIOS_PUBLISHER_NAME "eumarcodev"
        CACHE STRING "The name of the publisher (or fork developer) of the application.")
set(HELIOS_PUBLISHER_WEBSITE "https://github.com/eumarcodev/Helios-Server"
        CACHE STRING "The URL of the publisher's website.")
set(HELIOS_PUBLISHER_ISSUE_URL "https://github.com/eumarcodev/Helios-Server/issues"
        CACHE STRING "The URL of the publisher's support site or issue tracker.
        If you provide a modified version of Helios, we kindly request that you use your own url.")
set(HELIOS_UPDATE_REPO "eumarcodev/Helios-Server"
        CACHE STRING "The GitHub repository (owner/name) whose releases the web UI checks for new versions.
        Forks that publish their own releases should set this to their own repository.")

option(BUILD_DOCS "Build documentation" OFF)
option(BUILD_TESTS "Build tests" OFF)
option(NPM_OFFLINE "Use offline npm packages. You must ensure packages are in your npm cache." OFF)

option(BUILD_WERROR "Enable -Werror flag." OFF)

# PyroWave is on by default on Windows (its only platform), so a local build matches the release build
if(WIN32)
    set(HELIOS_ENABLE_PYROWAVE_DEFAULT ON)
else()
    set(HELIOS_ENABLE_PYROWAVE_DEFAULT OFF)
endif()
option(HELIOS_ENABLE_PYROWAVE "Build with the PyroWave codec (Windows only). Needs the third-party/pyrowave submodule with its nested submodules." ${HELIOS_ENABLE_PYROWAVE_DEFAULT})

# if this option is set, the build will exit after configuring special package configuration files
option(HELIOS_CONFIGURE_ONLY "Configure special files only, then exit." OFF)

option(HELIOS_ENABLE_TRAY "Enable system tray icon." ON)

option(HELIOS_SYSTEM_WAYLAND_PROTOCOLS "Use system installation of wayland-protocols rather than the submodule." OFF)

if(APPLE)
    option(BOOST_USE_STATIC "Use static boost libraries." OFF)
else()
    option(BOOST_USE_STATIC "Use static boost libraries." ON)
endif()

option(CUDA_FAIL_ON_MISSING "Fail the build if CUDA is not found." ON)
option(CUDA_INHERIT_COMPILE_OPTIONS
        "When building CUDA code, inherit compile options from the the main project. You may want to disable this if
        your IDE throws errors about unknown flags after running cmake." ON)

if(UNIX)
    option(HELIOS_BUILD_HOMEBREW
            "Enable a Homebrew build." OFF)
    option(HELIOS_CONFIGURE_HOMEBREW
            "Configure Homebrew formula. Recommended to use with HELIOS_CONFIGURE_ONLY" OFF)
endif()

if(APPLE)
    option(HELIOS_CONFIGURE_PORTFILE
            "Configure macOS Portfile. Recommended to use with HELIOS_CONFIGURE_ONLY" OFF)
    option(HELIOS_PACKAGE_MACOS
            "Should only be used when creating a macOS package/dmg." OFF)
elseif(UNIX)  # Linux
    option(HELIOS_BUILD_APPIMAGE
            "Enable an AppImage build." OFF)
    option(HELIOS_BUILD_FLATPAK
            "Enable a Flatpak build." OFF)
    option(HELIOS_CONFIGURE_PKGBUILD
            "Configure files required for AUR. Recommended to use with HELIOS_CONFIGURE_ONLY" OFF)
    option(HELIOS_CONFIGURE_FLATPAK_MAN
            "Configure manifest file required for Flatpak build. Recommended to use with HELIOS_CONFIGURE_ONLY" OFF)

    # Linux capture methods
    option(HELIOS_ENABLE_CUDA
            "Enable cuda specific code." ON)
    option(HELIOS_ENABLE_DRM
            "Enable KMS grab if available." ON)
    option(HELIOS_ENABLE_VAAPI
            "Enable building vaapi specific code." ON)
    option(HELIOS_ENABLE_WAYLAND
            "Enable building wayland specific code." ON)
    option(HELIOS_ENABLE_X11
            "Enable X11 grab if available." ON)
endif()
