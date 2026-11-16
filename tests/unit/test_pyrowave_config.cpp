/**
 * @file tests/unit/test_pyrowave_config.cpp
 * @brief Test the PyroWave tuning options in src/config.h.
 */
#include "../tests_common.h"

#include <src/config.h>

// The defaults must keep the behavior PyroWave had before the options existed.
TEST(PyroWaveConfig, DefaultsKeepTheOldBehavior) {
  EXPECT_EQ(config::video.pyrowave_packet_size, 1200);
  EXPECT_EQ(config::video.pyrowave_min_frame_kb, 16);
  EXPECT_EQ(config::video.pyrowave_priority, "medium");
  EXPECT_EQ(config::video.pyrowave_simulated_loss, 0.0);
}

TEST(PyroWaveConfig, DefaultPacketSizeIsInsideTheDocumentedRange) {
  EXPECT_GE(config::video.pyrowave_packet_size, 400);
  EXPECT_LE(config::video.pyrowave_packet_size, 1300);
}
