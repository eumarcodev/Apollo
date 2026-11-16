# PyroWave (Vulkan compute, intra-only video codec), see docs/pyrowave-integration.md
#
# PyroWave is built as its own CMake project (it brings Granite and a number of global CMake
# settings) and Helios links the shared library it produces through the C API in pyrowave.h.
# The submodule needs its own nested submodules:
#   git submodule update --init --recursive third-party/pyrowave
if(NOT WIN32)
    message(FATAL_ERROR "HELIOS_ENABLE_PYROWAVE is only supported on Windows for now.")
endif()

set(PYROWAVE_SOURCE_DIR "${CMAKE_SOURCE_DIR}/third-party/pyrowave")
if(NOT EXISTS "${PYROWAVE_SOURCE_DIR}/Granite/CMakeLists.txt")
    message(FATAL_ERROR "PyroWave sources are missing. Run: git submodule update --init --recursive third-party/pyrowave")
endif()

include(ExternalProject)

set(PYROWAVE_BINARY_DIR "${CMAKE_BINARY_DIR}/pyrowave")
set(PYROWAVE_DLL "${PYROWAVE_BINARY_DIR}/libpyrowave-shared-1.dll")
set(PYROWAVE_IMPLIB "${PYROWAVE_BINARY_DIR}/libpyrowave-shared.dll.a")

ExternalProject_Add(pyrowave_external
        SOURCE_DIR "${PYROWAVE_SOURCE_DIR}"
        BINARY_DIR "${PYROWAVE_BINARY_DIR}"
        CMAKE_GENERATOR "${CMAKE_GENERATOR}"
        CMAKE_ARGS
        -DCMAKE_BUILD_TYPE=Release
        -DCMAKE_C_COMPILER=${CMAKE_C_COMPILER}
        -DCMAKE_CXX_COMPILER=${CMAKE_CXX_COMPILER}
        -DCMAKE_MAKE_PROGRAM=${CMAKE_MAKE_PROGRAM}
        BUILD_COMMAND ${CMAKE_COMMAND} --build <BINARY_DIR> --target pyrowave-shared
        INSTALL_COMMAND ""
        BUILD_BYPRODUCTS "${PYROWAVE_DLL}" "${PYROWAVE_IMPLIB}")

add_library(pyrowave::shared SHARED IMPORTED GLOBAL)
set_target_properties(pyrowave::shared PROPERTIES
        IMPORTED_LOCATION "${PYROWAVE_DLL}"
        IMPORTED_IMPLIB "${PYROWAVE_IMPLIB}"
        INTERFACE_INCLUDE_DIRECTORIES
        "${PYROWAVE_SOURCE_DIR};${PYROWAVE_SOURCE_DIR}/Granite/third_party/khronos/vulkan-headers/include")
add_dependencies(pyrowave::shared pyrowave_external)
