# unix specific compile definitions
# put anything here that applies to both linux and macos

list(APPEND HELIOS_EXTERNAL_LIBRARIES
        ${CURL_LIBRARIES})

# add install prefix to assets path if not already there
if(NOT HELIOS_ASSETS_DIR MATCHES "^${CMAKE_INSTALL_PREFIX}")
    set(HELIOS_ASSETS_DIR "${CMAKE_INSTALL_PREFIX}/${HELIOS_ASSETS_DIR}")
endif()
