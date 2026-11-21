# macos specific packaging

# todo - bundle doesn't produce a valid .app use cpack -G DragNDrop
set(CPACK_BUNDLE_NAME "${CMAKE_PROJECT_NAME}")
set(CPACK_BUNDLE_PLIST "${APPLE_PLIST_FILE}")
set(CPACK_BUNDLE_ICON "${PROJECT_SOURCE_DIR}/helios.icns")
# set(CPACK_BUNDLE_STARTUP_COMMAND "${INSTALL_RUNTIME_DIR}/helios")

if(HELIOS_PACKAGE_MACOS)  # todo
    set(MAC_PREFIX "${CMAKE_PROJECT_NAME}.app/Contents")
    set(INSTALL_RUNTIME_DIR "${MAC_PREFIX}/MacOS")

    install(TARGETS helios
            BUNDLE DESTINATION . COMPONENT Runtime
            RUNTIME DESTINATION ${INSTALL_RUNTIME_DIR} COMPONENT Runtime)
else()
    install(FILES "${HELIOS_SOURCE_ASSETS_DIR}/macos/misc/uninstall_pkg.sh"
            DESTINATION "${HELIOS_ASSETS_DIR}")
endif()

install(DIRECTORY "${HELIOS_SOURCE_ASSETS_DIR}/macos/assets/"
        DESTINATION "${HELIOS_ASSETS_DIR}")
# copy assets to build directory, for running without install
file(COPY "${HELIOS_SOURCE_ASSETS_DIR}/macos/assets/"
        DESTINATION "${CMAKE_BINARY_DIR}/assets")
