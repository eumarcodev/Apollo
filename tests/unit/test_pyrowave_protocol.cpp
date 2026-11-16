/**
 * @file tests/unit/test_pyrowave_protocol.cpp
 * @brief Test src/pyrowave_protocol.h.
 */
#include "../tests_common.h"

#include <src/pyrowave_protocol.h>
#include <src/video.h>

TEST(PyroWaveProtocol, ScmFlagsDoNotCollideWithKnownCodecs) {
  // Highest bit used by the other codecs is SCM_AV1_HIGH10_444 (0x00400000).
  EXPECT_GT(pyrowave::CODEC_FLAG, 0x00400000u);
  EXPECT_NE(pyrowave::CODEC_FLAG, pyrowave::CODEC_FLAG_444);
  EXPECT_EQ(pyrowave::CODEC_FLAG & pyrowave::CODEC_FLAG_444, 0u);
}

TEST(PyroWaveProtocol, AdvertisesNothingWhenUnavailable) {
  EXPECT_EQ(pyrowave::codec_mode_flags(false, false), 0u);
  EXPECT_EQ(pyrowave::codec_mode_flags(false, true), 0u);
}

TEST(PyroWaveProtocol, AdvertisesChromaModesWhenAvailable) {
  EXPECT_EQ(pyrowave::codec_mode_flags(true, false), pyrowave::CODEC_FLAG);
  EXPECT_EQ(pyrowave::codec_mode_flags(true, true), pyrowave::CODEC_FLAG | pyrowave::CODEC_FLAG_444);
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

TEST(PyroWaveProtocol, PacketSizePreferenceNeverExceedsTheHostLimit) {
  EXPECT_EQ(pyrowave::clamp_packet_size(0, 1200), 0);  // no preference
  EXPECT_EQ(pyrowave::clamp_packet_size(-5, 1200), 0);
  EXPECT_EQ(pyrowave::clamp_packet_size(1000, 1200), 1000);
  EXPECT_EQ(pyrowave::clamp_packet_size(1200, 1200), 1200);
  EXPECT_EQ(pyrowave::clamp_packet_size(2000, 1200), 1200);  // host limit wins
  EXPECT_EQ(pyrowave::clamp_packet_size(100, 1200), 400);  // lower bound
  EXPECT_EQ(pyrowave::clamp_packet_size(1000, 200), 400);  // a host limit below the bound still gives a valid size
}

TEST(PyroWaveProtocol, MaxFramePreferenceKeepsTheHostFloor) {
  EXPECT_EQ(pyrowave::clamp_max_frame_kb(0, 16), 0);  // no cap
  EXPECT_EQ(pyrowave::clamp_max_frame_kb(128, 16), 128);
  EXPECT_EQ(pyrowave::clamp_max_frame_kb(4, 16), 16);  // never below the host floor
  EXPECT_EQ(pyrowave::clamp_max_frame_kb(99999, 16), 4096);
}
