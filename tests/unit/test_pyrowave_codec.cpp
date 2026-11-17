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
  #include <cstdlib>
  #include <iostream>
  #include <algorithm>
  #include <vector>

  #include <gtest/gtest.h>
  #include <pyrowave.h>

  #include "src/pyrowave_encode.h"

  #include <d3d11_4.h>
  #include <wrl/client.h>

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

namespace {
  struct still_area_result_t {
    bool ran = false;
    long changed_pixels = 0;  ///< Pixels of the still area that differ from the previous decoded frame, summed over the frames
    int largest_change = 0;  ///< Largest difference of one pixel, in 8-bit levels
    size_t average_frame_bytes = 0;
    size_t largest_frame_bytes = 0;
  };

  /**
   * @brief Encodes frames where only a small patch changes and measures how much the rest of the picture changes.
   * @param hysteresis Value for pyrowave_encoder_set_rate_control_hysteresis, 0 is the default rate control.
   */
  still_area_result_t measure_still_area(int hysteresis) {
    constexpr int width = 1280;
    constexpr int height = 720;
    constexpr int frames = 16;
    constexpr size_t budget = 70 * 1024;  // small enough that the rate control has to cut
    constexpr int patch_size = 160;
    constexpr int still_from_x = 800;  // the patch stays left of x = 400

    still_area_result_t result;

    pyrowave_device device = nullptr;
    if (pyrowave_create_default_device(&device) != PYROWAVE_SUCCESS) {
      return result;
    }

    pyrowave_encoder_create_info encoder_info = {};
    encoder_info.device = device;
    encoder_info.width = width;
    encoder_info.height = height;
    encoder_info.chroma = PYROWAVE_CHROMA_SUBSAMPLING_420;

    pyrowave_decoder_create_info decoder_info = {};
    decoder_info.device = device;
    decoder_info.width = width;
    decoder_info.height = height;
    decoder_info.chroma = PYROWAVE_CHROMA_SUBSAMPLING_420;

    pyrowave_encoder encoder = nullptr;
    pyrowave_decoder decoder = nullptr;
    if (pyrowave_encoder_create(&encoder_info, &encoder) != PYROWAVE_SUCCESS ||
        pyrowave_decoder_create(&decoder_info, &decoder) != PYROWAVE_SUCCESS ||
        pyrowave_encoder_set_rate_control_hysteresis(encoder, hysteresis) != PYROWAVE_SUCCESS) {
      ADD_FAILURE() << "Could not create the PyroWave encoder or decoder";
      return result;
    }

    auto make_buffer = [&](std::vector<uint8_t> &y, std::vector<uint8_t> &cb, std::vector<uint8_t> &cr) {
      pyrowave_cpu_buffer b = {};
      b.format = PYROWAVE_CPU_BUFFER_FORMAT_YUV420P;
      b.width = width;
      b.height = height;
      b.data[0] = y.data();
      b.data[1] = cb.data();
      b.data[2] = cr.data();
      b.row_stride_in_bytes[0] = width;
      b.row_stride_in_bytes[1] = width / 2;
      b.row_stride_in_bytes[2] = width / 2;
      b.plane_size_in_bytes[0] = y.size();
      b.plane_size_in_bytes[1] = cb.size();
      b.plane_size_in_bytes[2] = cr.size();
      return b;
    };

    // Detailed still picture: waves plus a fixed pseudo-random texture
    std::vector<uint8_t> still(width * height);
    uint32_t seed = 12345;
    auto next_random = [&seed]() {
      seed = seed * 1664525u + 1013904223u;
      return seed >> 24;
    };
    for (int y = 0; y < height; ++y) {
      for (int x = 0; x < width; ++x) {
        const double wave = 60.0 * std::sin(x * 0.11) * std::cos(y * 0.07) + 30.0 * std::sin((x + y) * 0.31);
        still[y * width + x] = static_cast<uint8_t>(128.0 + wave + (static_cast<int>(next_random()) % 31) - 15);
      }
    }

    std::vector<uint8_t> source_y(width * height);
    std::vector<uint8_t> source_cb(width * height / 4, 128);
    std::vector<uint8_t> source_cr(width * height / 4, 128);
    std::vector<uint8_t> decoded_y(width * height);
    std::vector<uint8_t> decoded_cb(width * height / 4);
    std::vector<uint8_t> decoded_cr(width * height / 4);
    std::vector<uint8_t> previous_y;
    std::vector<uint8_t> bitstream(budget + 64 * 1024);
    size_t total_bytes = 0;

    for (int frame = 0; frame < frames; ++frame) {
      // The patch moves and its content and amount of detail change every frame
      source_y = still;
      const int patch_x = 40 + (frame * 23) % 240;
      const int patch_y = 200 + (frame * 37) % 300;
      const int detail = 1 + (frame * 7) % 5;
      for (int y = 0; y < patch_size; ++y) {
        for (int x = 0; x < patch_size; ++x) {
          // Flat on some frames and noisy on others, so the bytes the patch needs change a lot
          source_y[(patch_y + y) * width + patch_x + x] = detail == 1 ? 128 : static_cast<uint8_t>((next_random() / detail) * detail);
        }
      }

      auto input = make_buffer(source_y, source_cb, source_cr);
      const pyrowave_rate_control rate_control = {budget};
      if (pyrowave_encoder_encode_cpu(encoder, &input, &rate_control) != PYROWAVE_SUCCESS) {
        ADD_FAILURE() << "encode failed on frame " << frame;
        return result;
      }

      size_t num_packets = 0;
      pyrowave_encoder_compute_num_packets(encoder, kPacketBoundary, &num_packets);
      std::vector<pyrowave_packet> packets(num_packets);
      if (pyrowave_encoder_packetize(encoder, packets.data(), kPacketBoundary, &num_packets, bitstream.data(), bitstream.size()) != PYROWAVE_SUCCESS) {
        ADD_FAILURE() << "packetize failed on frame " << frame;
        return result;
      }

      pyrowave_decoder_clear(decoder);
      size_t frame_bytes = 0;
      for (size_t i = 0; i < num_packets; ++i) {
        frame_bytes += packets[i].size;
        pyrowave_decoder_push_packet(decoder, bitstream.data() + packets[i].offset, packets[i].size);
      }
      total_bytes += frame_bytes;
      result.largest_frame_bytes = std::max(result.largest_frame_bytes, frame_bytes);

      auto output = make_buffer(decoded_y, decoded_cb, decoded_cr);
      if (pyrowave_decoder_decode_cpu_buffer_synchronous(decoder, &output) != PYROWAVE_SUCCESS) {
        ADD_FAILURE() << "decode failed on frame " << frame;
        return result;
      }

      // The first frames are left out: the stable mode needs a frame or two to settle on a cutoff
      if (frame >= 4) {
        for (int y = 0; y < height; ++y) {
          for (int x = still_from_x; x < width; ++x) {
            const int change = std::abs(int(decoded_y[y * width + x]) - int(previous_y[y * width + x]));
            if (change != 0) {
              ++result.changed_pixels;
              result.largest_change = std::max(result.largest_change, change);
            }
          }
        }
      }
      previous_y = decoded_y;
    }

    result.average_frame_bytes = total_bytes / frames;
    result.ran = true;

    pyrowave_decoder_destroy(decoder);
    pyrowave_encoder_destroy(encoder);
    pyrowave_device_destroy(device);
    return result;
  }
}  // namespace

/**
 * A change in one part of the picture must not make the still part flicker. With the default rate control it
 * does, because which blocks are cut depends on the whole frame. The stable mode has to remove most of it.
 */
TEST(PyroWaveCodec, StableRateControlKeepsStillAreas) {
  const auto normal = measure_still_area(0);
  if (!normal.ran) {
    GTEST_SKIP() << "No Vulkan device available for PyroWave";
  }
  const auto stable = measure_still_area(16);
  ASSERT_TRUE(stable.ran);

  std::cout << "default rate control: " << normal.changed_pixels << " changed pixels, largest change " << normal.largest_change
            << ", frames of " << normal.average_frame_bytes << " bytes on average, largest " << normal.largest_frame_bytes << std::endl;
  std::cout << "stable rate control:  " << stable.changed_pixels << " changed pixels, largest change " << stable.largest_change
            << ", frames of " << stable.average_frame_bytes << " bytes on average, largest " << stable.largest_frame_bytes << std::endl;

  // The test only means something if the default rate control makes the still area change
  ASSERT_GT(normal.changed_pixels, 1000) << "the test content no longer makes the default rate control flicker";
  EXPECT_LT(stable.changed_pixels * 10, normal.changed_pixels);
  // The stable mode must still respect the frame budget, and not throw most of it away
  EXPECT_LE(stable.largest_frame_bytes, 70u * 1024u);
  EXPECT_GT(stable.average_frame_bytes * 10, normal.average_frame_bytes * 7);
}

TEST(PyroWaveEncodeSession, EncodesAD3D11Texture) {
  using Microsoft::WRL::ComPtr;

  ComPtr<ID3D11Device> d3d_device;
  ComPtr<ID3D11DeviceContext> d3d_context;
  const D3D_FEATURE_LEVEL levels[] = {D3D_FEATURE_LEVEL_11_1, D3D_FEATURE_LEVEL_11_0};
  if (FAILED(D3D11CreateDevice(nullptr, D3D_DRIVER_TYPE_HARDWARE, nullptr, D3D11_CREATE_DEVICE_BGRA_SUPPORT, levels, 2, D3D11_SDK_VERSION, &d3d_device, nullptr, &d3d_context))) {
    GTEST_SKIP() << "No D3D11 hardware device";
  }

  auto session = pyrowave_enc::session_t::create(d3d_device.Get(), d3d_context.Get(), {kWidth, kHeight, false});
  if (!session) {
    GTEST_SKIP() << "PyroWave interop is not available on this GPU";
  }

  // BGRA gradient with all three channels different so the colour conversion is exercised
  std::vector<uint8_t> bgra(kWidth * kHeight * 4);
  for (int y = 0; y < kHeight; ++y) {
    for (int x = 0; x < kWidth; ++x) {
      uint8_t *p = &bgra[(y * kWidth + x) * 4];
      p[0] = static_cast<uint8_t>(40 + y * 150 / kHeight);  // B
      p[1] = static_cast<uint8_t>(30 + x * 190 / kWidth);  // G
      p[2] = static_cast<uint8_t>(200 - x * 120 / kWidth);  // R
      p[3] = 255;
    }
  }

  D3D11_TEXTURE2D_DESC desc = {};
  desc.Width = kWidth;
  desc.Height = kHeight;
  desc.MipLevels = 1;
  desc.ArraySize = 1;
  desc.Format = DXGI_FORMAT_B8G8R8A8_UNORM;
  desc.SampleDesc.Count = 1;
  desc.Usage = D3D11_USAGE_DEFAULT;
  desc.BindFlags = D3D11_BIND_SHADER_RESOURCE;
  D3D11_SUBRESOURCE_DATA data = {bgra.data(), static_cast<UINT>(kWidth * 4), 0};
  ComPtr<ID3D11Texture2D> source;
  ASSERT_TRUE(SUCCEEDED(d3d_device->CreateTexture2D(&desc, &data, &source)));

  // Several frames in a row to exercise the fence timeline and texture reuse
  for (int frame = 0; frame < 3; ++frame) {
    ASSERT_TRUE(session->encode(source.Get(), kBudget, kPacketBoundary)) << "frame " << frame;
  }
  ASSERT_GT(session->packets().size(), 1U);

  pyrowave_device device = nullptr;
  ASSERT_EQ(pyrowave_create_default_device(&device), PYROWAVE_SUCCESS);
  pyrowave_decoder_create_info decoder_info = {};
  decoder_info.device = device;
  decoder_info.width = kWidth;
  decoder_info.height = kHeight;
  decoder_info.chroma = PYROWAVE_CHROMA_SUBSAMPLING_420;
  pyrowave_decoder decoder = nullptr;
  ASSERT_EQ(pyrowave_decoder_create(&decoder_info, &decoder), PYROWAVE_SUCCESS);

  for (const auto &packet : session->packets()) {
    EXPECT_LE(packet.size, kPacketBoundary);
    ASSERT_EQ(pyrowave_decoder_push_packet(decoder, session->bitstream() + packet.offset, packet.size), PYROWAVE_SUCCESS);
  }
  ASSERT_TRUE(pyrowave_decoder_decode_is_ready(decoder, false));

  planes_t decoded;
  auto output = decoded.buffer();
  ASSERT_EQ(pyrowave_decoder_decode_cpu_buffer_synchronous(decoder, &output), PYROWAVE_SUCCESS);

  // The encoder converts with BT.709 full range
  double sse = 0;
  for (int i = 0; i < kWidth * kHeight; ++i) {
    const uint8_t *p = &bgra[i * 4];
    const double expected = 0.2126 * p[2] + 0.7152 * p[1] + 0.0722 * p[0];
    const double d = expected - decoded.y[i];
    sse += d * d;
  }
  const double psnr = 10.0 * std::log10(255.0 * 255.0 / (sse / (kWidth * kHeight) + 1e-9));
  EXPECT_GT(psnr, 35.0) << "luma PSNR " << psnr << " dB";

  pyrowave_decoder_destroy(decoder);
  pyrowave_device_destroy(device);
}

#endif  // HELIOS_ENABLE_PYROWAVE
