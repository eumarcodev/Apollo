/**
 * @file src/pyrowave_encode.cpp
 * @brief PyroWave encode session, see pyrowave_encode.h.
 */
#ifdef HELIOS_ENABLE_PYROWAVE

  #include "pyrowave_encode.h"

  #include <algorithm>
  #include <cstdlib>
  #include <cstring>

  #include <d3dcompiler.h>
  #include <dxgi1_2.h>

  #include "logging.h"

using Microsoft::WRL::ComPtr;

namespace pyrowave_enc {
  namespace {
    // See pyrowave_encoder_set_rate_control_hysteresis. 16 of the 2048 rate control steps.
    constexpr int default_rate_control_hysteresis = 16;

    bool check(pyrowave_result result, const char *what) {
      if (result != PYROWAVE_SUCCESS) {
        BOOST_LOG(error) << "PyroWave: " << what << " failed with result " << static_cast<int>(result);
        return false;
      }
      return true;
    }

    bool check(HRESULT hr, const char *what) {
      if (FAILED(hr)) {
        BOOST_LOG(error) << "PyroWave: " << what << " failed with HRESULT 0x" << std::hex << static_cast<unsigned long>(hr);
        return false;
      }
      return true;
    }
  }  // namespace

  std::unique_ptr<session_t> session_t::create(ID3D11Device *device, ID3D11DeviceContext *context, const config_t &config) {
    std::unique_ptr<session_t> session {new session_t()};
    if (!session->init(device, context, config)) {
      return nullptr;
    }
    return session;
  }

  bool session_t::init(ID3D11Device *device, ID3D11DeviceContext *context, const config_t &config) {
    config_ = config;
    if (config_.source_width <= 0 || config_.source_height <= 0) {
      config_.source_width = config.width;
      config_.source_height = config.height;
    }
    if (config.width <= 0 || config.height <= 0 || (!config.yuv444 && ((config.width | config.height) & 1))) {
      BOOST_LOG(error) << "PyroWave: unsupported size " << config.width << "x" << config.height;
      return false;
    }

    ComPtr<ID3D11Device5> device5;
    if (!check(device->QueryInterface(IID_PPV_ARGS(&device5)), "ID3D11Device5") ||
        !check(context->QueryInterface(IID_PPV_ARGS(&context_)), "ID3D11DeviceContext4")) {
      return false;
    }

    // The Vulkan device has to be the same GPU as the D3D11 one for the interop to work.
    ComPtr<IDXGIDevice> dxgi_device;
    ComPtr<IDXGIAdapter> adapter;
    DXGI_ADAPTER_DESC adapter_desc {};
    if (!check(device->QueryInterface(IID_PPV_ARGS(&dxgi_device)), "IDXGIDevice") ||
        !check(dxgi_device->GetAdapter(&adapter), "GetAdapter") ||
        !check(adapter->GetDesc(&adapter_desc), "adapter GetDesc")) {
      return false;
    }

    const auto *luid = reinterpret_cast<const pyrowave_luid *>(&adapter_desc.AdapterLuid);
    auto priority = static_cast<VkQueueGlobalPriority>(config.queue_priority);
    pyrowave_result device_result = pyrowave_create_device_by_compat(0, 0, nullptr, nullptr, luid, priority, &device_);
    if (device_result != PYROWAVE_SUCCESS && priority != VK_QUEUE_GLOBAL_PRIORITY_MEDIUM) {
      BOOST_LOG(warning) << "PyroWave: the GPU refused queue priority " << config.queue_priority << ", using medium";
      device_result = pyrowave_create_device_by_compat(0, 0, nullptr, nullptr, luid, VK_QUEUE_GLOBAL_PRIORITY_MEDIUM, &device_);
    }
    if (!check(device_result, "create device")) {
      return false;
    }

    pyrowave_encoder_create_info encoder_info = {};
    encoder_info.device = device_;
    encoder_info.width = config.width;
    encoder_info.height = config.height;
    encoder_info.chroma = config.yuv444 ? PYROWAVE_CHROMA_SUBSAMPLING_444 : PYROWAVE_CHROMA_SUBSAMPLING_420;
    if (!check(pyrowave_encoder_create(&encoder_info, &encoder_), "create encoder")) {
      return false;
    }

    // Stable rate control: keep the same quantization for blocks that did not change, so a still part of the
    // screen does not flicker when something else moves. It costs a few percent of the frame budget.
    // HELIOS_PYROWAVE_RATE_HYSTERESIS overrides the value for testing, 0 turns it off.
    int hysteresis = default_rate_control_hysteresis;
    if (const char *value = std::getenv("HELIOS_PYROWAVE_RATE_HYSTERESIS")) {
      hysteresis = std::clamp(std::atoi(value), 0, 2048);
    }
    if (!check(pyrowave_encoder_set_rate_control_hysteresis(encoder_, hysteresis), "set rate control hysteresis")) {
      return false;
    }
    BOOST_LOG(info) << "PyroWave: rate control hysteresis " << hysteresis;

    // Texture shared with Vulkan. Captured frames are copied into it.
    D3D11_TEXTURE2D_DESC texture_desc = {};
    texture_desc.Width = config_.source_width;
    texture_desc.Height = config_.source_height;
    texture_desc.MipLevels = 1;
    texture_desc.ArraySize = 1;
    texture_desc.Format = DXGI_FORMAT_B8G8R8A8_UNORM;
    texture_desc.SampleDesc.Count = 1;
    texture_desc.Usage = D3D11_USAGE_DEFAULT;
    texture_desc.BindFlags = D3D11_BIND_RENDER_TARGET | D3D11_BIND_SHADER_RESOURCE;
    texture_desc.MiscFlags = D3D11_RESOURCE_MISC_SHARED | D3D11_RESOURCE_MISC_SHARED_NTHANDLE;
    if (!check(device->CreateTexture2D(&texture_desc, nullptr, &shared_texture_), "create shared texture")) {
      return false;
    }

    ComPtr<IDXGIResource1> resource;
    HANDLE texture_handle = nullptr;
    if (!check(shared_texture_->QueryInterface(IID_PPV_ARGS(&resource)), "IDXGIResource1") ||
        !check(resource->CreateSharedHandle(nullptr, GENERIC_ALL, nullptr, &texture_handle), "texture CreateSharedHandle")) {
      return false;
    }

    VkImageCreateInfo image_create_info = {VK_STRUCTURE_TYPE_IMAGE_CREATE_INFO};
    image_create_info.imageType = VK_IMAGE_TYPE_2D;
    image_create_info.extent = {static_cast<uint32_t>(config_.source_width), static_cast<uint32_t>(config_.source_height), 1};
    image_create_info.format = VK_FORMAT_B8G8R8A8_UNORM;
    image_create_info.mipLevels = 1;
    image_create_info.arrayLayers = 1;
    image_create_info.samples = VK_SAMPLE_COUNT_1_BIT;
    image_create_info.usage = VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT | VK_IMAGE_USAGE_SAMPLED_BIT;
    image_create_info.tiling = VK_IMAGE_TILING_OPTIMAL;
    image_create_info.sharingMode = VK_SHARING_MODE_EXCLUSIVE;

    pyrowave_image_create_info image_info = {};
    image_info.device = device_;
    image_info.external_handle = reinterpret_cast<pyrowave_os_handle>(texture_handle);  // ownership moves to PyroWave
    image_info.handle_type = VK_EXTERNAL_MEMORY_HANDLE_TYPE_D3D11_TEXTURE_BIT;
    image_info.image_create_info = &image_create_info;
    if (!check(pyrowave_image_create(&image_info, &image_), "import texture")) {
      return false;
    }

    // Fence shared with Vulkan as a timeline semaphore: D3D11 signals when the copy is done,
    // Vulkan signals when the encode is done.
    HANDLE fence_handle = nullptr;
    if (!check(device5->CreateFence(0, D3D11_FENCE_FLAG_SHARED, IID_PPV_ARGS(&fence_)), "create fence") ||
        !check(fence_->CreateSharedHandle(nullptr, GENERIC_ALL, nullptr, &fence_handle), "fence CreateSharedHandle")) {
      return false;
    }

    pyrowave_sync_object_create_info sync_info = {};
    sync_info.device = device_;
    sync_info.external_handle = reinterpret_cast<pyrowave_os_handle>(fence_handle);  // ownership moves to PyroWave
    sync_info.handle_type = VK_EXTERNAL_SEMAPHORE_HANDLE_TYPE_D3D11_FENCE_BIT;
    sync_info.semaphore_type = VK_SEMAPHORE_TYPE_TIMELINE;
    return check(pyrowave_sync_object_create(&sync_info, &sync_), "import fence");
  }

  session_t::~session_t() {
    if (image_) {
      pyrowave_image_destroy(image_);
    }
    if (sync_) {
      pyrowave_sync_object_destroy(sync_);
    }
    if (encoder_) {
      pyrowave_encoder_destroy(encoder_);
    }
    if (device_) {
      pyrowave_device_destroy(device_);
    }
  }

  void session_t::copy_from(ID3D11Texture2D *source) {
    context_->CopyResource(shared_texture_.Get(), source);
  }

  void session_t::clear() {
    if (!shared_rtv_) {
      ComPtr<ID3D11Device> device;
      context_->GetDevice(&device);
      if (FAILED(device->CreateRenderTargetView(shared_texture_.Get(), nullptr, &shared_rtv_))) {
        BOOST_LOG(error) << "PyroWave: could not create a render target view to clear the frame";
        return;
      }
    }
    const float black[4] = {0.0f, 0.0f, 0.0f, 1.0f};
    context_->ClearRenderTargetView(shared_rtv_.Get(), black);
  }

  namespace {
    // Full-screen triangle, no vertex buffer.
    constexpr const char *pattern_vs_hlsl = R"(
float4 main(uint id : SV_VertexID) : SV_Position {
  float2 uv = float2((id << 1) & 2, id & 2);
  return float4(uv * float2(2, -2) + float2(-1, 1), 0, 1);
}
)";

    // Same mix as the page used for the bitrate measurements (eumarcodev/Helios-Server#62), all derived from the
    // frame index: a moving colour gradient, 40 moving blocks, twelve lines of text-like stripes that change
    // every frame and a 256x256 noise square (sizes scale with the height, 1080p reference).
    constexpr const char *pattern_ps_hlsl = R"(
cbuffer params : register(b0) { uint frame; uint width; uint height; uint pad; };

uint hash(uint x) { x ^= x >> 16; x *= 0x7feb352d; x ^= x >> 15; x *= 0x846ca68b; x ^= x >> 16; return x; }

float3 hsv(float h, float s, float v) {
  float3 k = saturate(abs(frac(h + float3(0, 2.0 / 3, 1.0 / 3)) * 6 - 3) - 1);
  return v * lerp(float3(1, 1, 1), k, s);
}

float4 main(float4 pos : SV_Position) : SV_Target {
  float2 p = pos.xy;
  float w = width, h = height, t = frame;
  float scale = h / 1080.0;
  float g = (p.x / w + p.y / h) * 0.5;
  float3 c = lerp(hsv(frac(t / 360.0), 0.7, 0.4), hsv(frac(t / 360.0 + 0.5), 0.7, 0.6), g);
  float block = 60 * scale;
  for (uint i = 0; i < 40; i++) {
    float2 center = float2((sin(t / 30 + i) * 0.45 + 0.5) * w, (cos(t / 23 + i * 1.7) * 0.45 + 0.5) * h);
    if (all(abs(p - center) < block)) {
      c = hsv(frac((i * 37 + t * 3) / 360.0), 0.8, 0.85);
    }
  }
  float lineH = h / 36, textTop = h * 0.55;
  float row = floor((p.y - textTop) / lineH);
  if (row >= 0 && row < 12 && p.x > 20 * scale && p.x < w * 0.4 && frac((p.y - textTop) / lineH) < 0.7) {
    uint glyph = (uint)(p.x / (lineH * 0.55));
    if ((hash(glyph * 131 + (uint)row * 7919 + frame * 104729) & 3) != 0 &&
        frac(p.x / (lineH * 0.55)) < 0.75) {
      c = float3(1, 1, 1);
    }
  }
  float noise = 256 * scale;
  float nx = fmod(t * 5 * scale, max(w - noise, 1)), ny = h - noise - 44 * scale;
  if (p.x >= nx && p.x < nx + noise && p.y >= ny && p.y < ny + noise) {
    c = (hash((uint)p.x + (uint)p.y * 4099 + frame * 2654435761) & 255) / 255.0;
  }
  return float4(c, 1);
}
)";

    ComPtr<ID3DBlob> compile_shader(const char *source, const char *profile) {
      ComPtr<ID3DBlob> code, errors;
      HRESULT hr = D3DCompile(source, std::strlen(source), "test_pattern", nullptr, nullptr, "main", profile,
                              D3DCOMPILE_OPTIMIZATION_LEVEL3, 0, &code, &errors);
      if (FAILED(hr)) {
        BOOST_LOG(error) << "PyroWave: test pattern shader: "
                         << (errors ? static_cast<const char *>(errors->GetBufferPointer()) : "compile failed");
        return nullptr;
      }
      return code;
    }
  }  // namespace

  bool session_t::render_test_pattern(std::uint32_t frame_index) {
    ComPtr<ID3D11Device> device;
    context_->GetDevice(&device);
    if (!shared_rtv_ && FAILED(device->CreateRenderTargetView(shared_texture_.Get(), nullptr, &shared_rtv_))) {
      BOOST_LOG(error) << "PyroWave: could not create a render target view for the test pattern";
      return false;
    }
    if (!pattern_ps_) {
      auto vs = compile_shader(pattern_vs_hlsl, "vs_5_0");
      auto ps = compile_shader(pattern_ps_hlsl, "ps_5_0");
      D3D11_BUFFER_DESC desc = {};
      desc.ByteWidth = 16;
      desc.Usage = D3D11_USAGE_DEFAULT;
      desc.BindFlags = D3D11_BIND_CONSTANT_BUFFER;
      if (!vs || !ps ||
          !check(device->CreateVertexShader(vs->GetBufferPointer(), vs->GetBufferSize(), nullptr, &pattern_vs_), "test pattern vertex shader") ||
          !check(device->CreatePixelShader(ps->GetBufferPointer(), ps->GetBufferSize(), nullptr, &pattern_ps_), "test pattern pixel shader") ||
          !check(device->CreateBuffer(&desc, nullptr, &pattern_cb_), "test pattern constants")) {
        pattern_ps_.Reset();
        return false;
      }
    }

    const std::uint32_t params[4] = {frame_index, static_cast<std::uint32_t>(config_.source_width), static_cast<std::uint32_t>(config_.source_height), 0};
    context_->UpdateSubresource(pattern_cb_.Get(), 0, nullptr, params, 0, 0);

    D3D11_VIEWPORT viewport = {0.0f, 0.0f, static_cast<float>(config_.source_width), static_cast<float>(config_.source_height), 0.0f, 1.0f};
    ID3D11RenderTargetView *rtv = shared_rtv_.Get();
    ID3D11Buffer *cb = pattern_cb_.Get();
    context_->OMSetRenderTargets(1, &rtv, nullptr);
    context_->OMSetBlendState(nullptr, nullptr, 0xFFFFFFFF);
    context_->RSSetViewports(1, &viewport);
    context_->RSSetState(nullptr);
    context_->IASetInputLayout(nullptr);
    context_->IASetPrimitiveTopology(D3D11_PRIMITIVE_TOPOLOGY_TRIANGLELIST);
    context_->VSSetShader(pattern_vs_.Get(), nullptr, 0);
    context_->PSSetShader(pattern_ps_.Get(), nullptr, 0);
    context_->PSSetConstantBuffers(0, 1, &cb);
    context_->Draw(3, 0);
    // Leave no binding behind for the other users of the immediate context
    ID3D11RenderTargetView *none = nullptr;
    context_->OMSetRenderTargets(1, &none, nullptr);
    // Submit now: encode() waits on the fence signal queued after this draw, and the immediate context would
    // otherwise hold the work until it flushes on its own (about 1 ms of host latency per frame)
    context_->Flush();
    return true;
  }

  bool session_t::encode(ID3D11Texture2D *source, std::size_t frame_budget, std::size_t packet_size) {
    copy_from(source);
    return encode(frame_budget, packet_size);
  }

  bool session_t::encode(std::size_t frame_budget, std::size_t packet_size) {
    packets_.clear();

    context_->Signal(fence_.Get(), ++timeline_);

    pyrowave_gpu_external_reference external_ref = {};
    external_ref.image = image_;
    external_ref.queue_family_index = VK_QUEUE_FAMILY_EXTERNAL;

    pyrowave_gpu_sync_operation acquire = {};
    acquire.sync.semaphore = pyrowave_sync_object_get_semaphore(sync_);
    acquire.sync.value = timeline_;
    acquire.num_images = 1;
    acquire.images = &external_ref;

    pyrowave_gpu_sync_operation release = {};
    release.sync.semaphore = pyrowave_sync_object_get_semaphore(sync_);
    release.sync.value = ++timeline_;

    pyrowave_scaled_encode_info info = {};
    if (!check(pyrowave_image_get_image_view(image_, VK_IMAGE_ASPECT_COLOR_BIT, VK_IMAGE_USAGE_SAMPLED_BIT, &info.view), "image view")) {
      return false;
    }
    info.input_color_space = VK_COLOR_SPACE_SRGB_NONLINEAR_KHR;
    info.output_color_space = VK_COLOR_SPACE_SRGB_NONLINEAR_KHR;
    info.ycbcr_chroma_midpoint = 128.0f / 255.0f;
    info.intermediate_plane_format = VK_FORMAT_R8_UNORM;

    const pyrowave_rate_control rate_control = {frame_budget};
    if (!check(pyrowave_encoder_encode_gpu_scaled(encoder_, &acquire, &release, &info, &rate_control), "encode")) {
      return false;
    }

    std::size_t num_packets = 0;
    if (!check(pyrowave_encoder_compute_num_packets(encoder_, packet_size, &num_packets), "count packets")) {
      return false;
    }

    // Packetizing waits for the GPU work, so the shared texture is free again afterwards.
    bitstream_.resize(frame_budget + 64 * 1024);
    std::vector<pyrowave_packet> raw(num_packets);
    if (!check(pyrowave_encoder_packetize(encoder_, raw.data(), packet_size, &num_packets, bitstream_.data(), bitstream_.size()), "packetize")) {
      return false;
    }

    packets_.reserve(num_packets);
    for (std::size_t i = 0; i < num_packets; ++i) {
      packets_.push_back({raw[i].offset, raw[i].size});
    }

    // Keep the next CopyResource behind the encode on the GPU timeline.
    context_->Wait(fence_.Get(), timeline_);
    return true;
  }
}  // namespace pyrowave_enc

#endif  // HELIOS_ENABLE_PYROWAVE
