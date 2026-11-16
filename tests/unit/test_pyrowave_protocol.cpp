/**
 * @file tests/unit/test_pyrowave_protocol.cpp
 * @brief Test src/pyrowave_protocol.h.
 */
#include "../tests_common.h"

#include <src/pyrowave_protocol.h>
#include <src/video.h>

TEST(PyroWaveProtocol, ScmFlagsDoNotCollideWithKnownCodecs) {
  // Highest bit used by the other codecs is SCM_AV1_HIGH10_444 (0x00400000).
  EXPECT_GT(pyrowave::SCM_PYROWAVE, 0x00400000u);
  EXPECT_NE(pyrowave::SCM_PYROWAVE, pyrowave::SCM_PYROWAVE_444);
  EXPECT_EQ(pyrowave::SCM_PYROWAVE & pyrowave::SCM_PYROWAVE_444, 0u);
}

TEST(PyroWaveProtocol, AdvertisesNothingWhenUnavailable) {
  EXPECT_EQ(pyrowave::codec_mode_flags(false, false), 0u);
  EXPECT_EQ(pyrowave::codec_mode_flags(false, true), 0u);
}

TEST(PyroWaveProtocol, AdvertisesChromaModesWhenAvailable) {
  EXPECT_EQ(pyrowave::codec_mode_flags(true, false), pyrowave::SCM_PYROWAVE);
  EXPECT_EQ(pyrowave::codec_mode_flags(true, true), pyrowave::SCM_PYROWAVE | pyrowave::SCM_PYROWAVE_444);
}

TEST(PyroWaveProtocol, BitstreamFormatIsDistinctFromOtherCodecs) {
  EXPECT_FALSE(pyrowave::is_pyrowave_format(0));  // H.264
  EXPECT_FALSE(pyrowave::is_pyrowave_format(1));  // HEVC
  EXPECT_FALSE(pyrowave::is_pyrowave_format(2));  // AV1
  EXPECT_TRUE(pyrowave::is_pyrowave_format(3));
}

TEST(PyroWaveProtocol, HostDoesNotAdvertiseUntilItCanEncode) {
  EXPECT_FALSE(video::pyrowave_available());
}
