# Patches Boost (fetched via FetchContent; the failure was seen on 1.89) so it configures with CMake >= 4.x.
#
# libs/locale/CMakeLists.txt passes include/boost/locale.hpp to source_group(TREE .../include/boost/locale ...),
# which newer CMake versions reject because the file is not under that tree.
# Usage: cmake -DBOOST_SOURCE_DIR=<boost source dir> -P patch_boost_locale.cmake
set(_file "${BOOST_SOURCE_DIR}/libs/locale/CMakeLists.txt")
if(NOT EXISTS "${_file}")
    message(FATAL_ERROR "Boost.Locale CMakeLists.txt not found: ${_file}")
endif()

file(READ "${_file}" _content)
set(_marker "# patched: exclude locale.hpp from source_group TREE")
if(NOT _content MATCHES "patched: exclude locale.hpp")
    string(REPLACE
            "list(FILTER sources_inc EXCLUDE REGEX \"^src/\")"
            "list(FILTER sources_inc EXCLUDE REGEX \"^src/\")\n${_marker}\nlist(FILTER sources_inc EXCLUDE REGEX \"include/boost/locale\\\\.hpp$\")"
            _content "${_content}")
    file(WRITE "${_file}" "${_content}")
endif()
