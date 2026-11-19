/**
 * @file src/pyrowave_encode.h
 * @brief PyroWave encode session: takes D3D11 textures, encodes them on the GPU through Vulkan interop.
 */
#pragma once

#ifdef HELIOS_ENABLE_PYROWAVE

  #include <cstddef>
  #include <cstdint>
  #include <memory>
  #include <vector>

  #include <d3d11_4.h>
  #include <wrl/client.h>

  #include <pyrowave.h>

namespace pyrowave_enc {
  struct config_t {
    int width;
    int height;
    bool yuv444 = false;
    // Size of the captured textures given to copy_from(). 0 means the same as the stream size.
    // When it differs the encoder scales the frame down (or up) to width x height.
    int source_width = 0;
    int source_height = 0;
    // VkQueueGlobalPriority of the Vulkan queue: 128 low, 256 medium, 512 high, 1024 realtime.
    // High and realtime need driver support; the session falls back to medium when the device refuses them.
    int queue_priority = 256;
  };

  struct packet_t {
    std::size_t offset;
    std::size_t size;
  };

  /**
   * One session encodes one stream size. It owns a shared BGRA texture that is imported into Vulkan once,
   * so a frame costs one GPU copy plus the encode. Not thread safe: use it from the encoding thread only.
   */
  class session_t {
  public:
    /**
     * @param device D3D11 device the captured textures belong to. The Vulkan device is picked by its adapter LUID.
     * @param context Immediate context of that device.
     * @return nullptr when the GPU, driver or interop cannot support PyroWave.
     */
    static std::unique_ptr<session_t> create(ID3D11Device *device, ID3D11DeviceContext *context, const config_t &config);

    ~session_t();
    session_t(const session_t &) = delete;
    session_t &operator=(const session_t &) = delete;

    /**
     * @brief Copy a BGRA8 texture of the configured source size (same D3D11 device) into the session.
     * The copy is queued on the immediate context, so the source can be released right after this call.
     */
    void copy_from(ID3D11Texture2D *source);

    /**
     * @brief Fill the session texture with black, so there is something to encode before the first capture.
     */
    void clear();

    /**
     * @brief Render the test picture of this frame into the session texture with a pixel shader (no CPU copy).
     * Deterministic from the frame index: moving coloured blocks on a gradient, scrolling text-like lines and a
     * noise square, the mix of the animated page used for the network measurements.
     * @return false when the shader could not be created.
     */
    bool render_test_pattern(std::uint32_t frame_index);

    /**
     * @brief Encode the last texture given to copy_from() or clear(). It can be called again to repeat a frame.
     * @param frame_budget Maximum size of the frame bitstream in bytes.
     * @param packet_size Largest packet the encoder may emit in bytes. Each packet is independently decodable.
     * @return true on success. Results are valid until the next call.
     */
    bool encode(std::size_t frame_budget, std::size_t packet_size);

    /**
     * @brief copy_from() followed by encode().
     */
    bool encode(ID3D11Texture2D *source, std::size_t frame_budget, std::size_t packet_size);

    const std::uint8_t *bitstream() const {
      return bitstream_.data();
    }

    const std::vector<packet_t> &packets() const {
      return packets_;
    }

  private:
    session_t() = default;
    bool init(ID3D11Device *device, ID3D11DeviceContext *context, const config_t &config);

    config_t config_ {};
    Microsoft::WRL::ComPtr<ID3D11DeviceContext4> context_;
    Microsoft::WRL::ComPtr<ID3D11Texture2D> shared_texture_;
    Microsoft::WRL::ComPtr<ID3D11RenderTargetView> shared_rtv_;
    Microsoft::WRL::ComPtr<ID3D11VertexShader> pattern_vs_;
    Microsoft::WRL::ComPtr<ID3D11PixelShader> pattern_ps_;
    Microsoft::WRL::ComPtr<ID3D11Buffer> pattern_cb_;
    Microsoft::WRL::ComPtr<ID3D11Fence> fence_;
    std::uint64_t timeline_ = 0;

    pyrowave_device device_ = nullptr;
    pyrowave_encoder encoder_ = nullptr;
    pyrowave_image image_ = nullptr;
    pyrowave_sync_object sync_ = nullptr;

    std::vector<std::uint8_t> bitstream_;
    std::vector<packet_t> packets_;
  };
}  // namespace pyrowave_enc

#endif  // HELIOS_ENABLE_PYROWAVE
