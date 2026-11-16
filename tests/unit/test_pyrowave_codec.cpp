/**
 * @file tests/unit/test_pyrowave_codec.cpp
 * @brief Smoke test for the PyroWave build integration: device, CPU encode, packetize, decode.
 *
 * Only compiled in when HELIOS_ENABLE_PYROWAVE is set. Needs a Vulkan 1.1 capable GPU and is skipped
 * when no device can be created.
 */
#ifdef HELIOS_ENABLE_PYROWAVE

  #include <cmath>
  #include <cstdint>
  #include <vector>

  #include <gtest/gtest.h>
  #include <pyrowave.h>

namespace {
  constexpr int kWidth = 640;
  constexpr int kHeight = 360;
  constexpr size_t kPacketBoundary = 1200;
  constexpr size_t kBudget = 200 * 1024;

  struct planes_t {
    std::vector<uint8_t> y = std::vector<uint8_t>(kWidth * kHeight);
    std::vector<uint8_t> cb = std::vector<uint8_t>(kWidth * kHeight / 4, 128);
    std::vector<uint8_t> cr = std::vector<uint8_t>(kWidth * kHeight / 4, 128);

    pyrowave_cpu_buffer buffer() {
      pyrowave_cpu_buffer b = {};
      b.format = PYROWAVE_CPU_BUFFER_FORMAT_YUV420P;
      b.width = kWidth;
      b.height = kHeight;
      b.data[0] = y.data();
      b.data[1] = cb.data();
      b.data[2] = cr.data();
      b.row_stride_in_bytes[0] = kWidth;
      b.row_stride_in_bytes[1] = kWidth / 2;
      b.row_stride_in_bytes[2] = kWidth / 2;
      b.plane_size_in_bytes[0] = y.size();
      b.plane_size_in_bytes[1] = cb.size();
      b.plane_size_in_bytes[2] = cr.size();
      return b;
    }
  };
}  // namespace

TEST(PyroWaveCodec, EncodePacketizeDecodeRoundTrip) {
  pyrowave_device device = nullptr;
  if (pyrowave_create_default_device(&device) != PYROWAVE_SUCCESS) {
    GTEST_SKIP() << "No Vulkan device available for PyroWave";
  }

  pyrowave_encoder_create_info encoder_info = {};
  encoder_info.device = device;
  encoder_info.width = kWidth;
  encoder_info.height = kHeight;
  encoder_info.chroma = PYROWAVE_CHROMA_SUBSAMPLING_420;

  pyrowave_decoder_create_info decoder_info = {};
  decoder_info.device = device;
  decoder_info.width = kWidth;
  decoder_info.height = kHeight;
  decoder_info.chroma = PYROWAVE_CHROMA_SUBSAMPLING_420;

  pyrowave_encoder encoder = nullptr;
  pyrowave_decoder decoder = nullptr;
  ASSERT_EQ(pyrowave_encoder_create(&encoder_info, &encoder), PYROWAVE_SUCCESS);
  ASSERT_EQ(pyrowave_decoder_create(&decoder_info, &decoder), PYROWAVE_SUCCESS);

  planes_t source;
  for (int y = 0; y < kHeight; ++y) {
    for (int x = 0; x < kWidth; ++x) {
      source.y[y * kWidth + x] = static_cast<uint8_t>(16 + (x * 200 / kWidth) + (y * 30 / kHeight));
    }
  }

  auto input = source.buffer();
  const pyrowave_rate_control rate_control = {kBudget};
  ASSERT_EQ(pyrowave_encoder_encode_cpu(encoder, &input, &rate_control), PYROWAVE_SUCCESS);

  size_t num_packets = 0;
  ASSERT_EQ(pyrowave_encoder_compute_num_packets(encoder, kPacketBoundary, &num_packets), PYROWAVE_SUCCESS);
  ASSERT_GT(num_packets, 1U);

  std::vector<uint8_t> bitstream(kBudget + 64 * 1024);
  std::vector<pyrowave_packet> packets(num_packets);
  ASSERT_EQ(pyrowave_encoder_packetize(encoder, packets.data(), kPacketBoundary, &num_packets, bitstream.data(), bitstream.size()), PYROWAVE_SUCCESS);

  size_t total = 0;
  for (size_t i = 0; i < num_packets; ++i) {
    EXPECT_LE(packets[i].size, kPacketBoundary) << "packet " << i;
    total += packets[i].size;
    ASSERT_EQ(pyrowave_decoder_push_packet(decoder, bitstream.data() + packets[i].offset, packets[i].size), PYROWAVE_SUCCESS);
  }
  EXPECT_LE(total, kBudget + 64 * 1024);
  ASSERT_TRUE(pyrowave_decoder_decode_is_ready(decoder, false));

  planes_t decoded;
  auto output = decoded.buffer();
  ASSERT_EQ(pyrowave_decoder_decode_cpu_buffer_synchronous(decoder, &output), PYROWAVE_SUCCESS);

  double sse = 0;
  for (size_t i = 0; i < source.y.size(); ++i) {
    const double d = double(source.y[i]) - double(decoded.y[i]);
    sse += d * d;
  }
  const double psnr = 10.0 * std::log10(255.0 * 255.0 / (sse / source.y.size() + 1e-9));
  EXPECT_GT(psnr, 35.0) << "luma PSNR " << psnr << " dB over " << total << " bytes";

  pyrowave_decoder_destroy(decoder);
  pyrowave_encoder_destroy(encoder);
  pyrowave_device_destroy(device);
}

#endif  // HELIOS_ENABLE_PYROWAVE
