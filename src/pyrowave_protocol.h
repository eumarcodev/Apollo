/**
 * @file src/pyrowave_protocol.h
 * @brief Negotiation constants for the PyroWave video format.
 *
 * PyroWave is a Helios/Selene extension on top of the GameStream protocol. The values here must stay in sync
 * with the client (Selene-Game-Streaming, moonlight-common-c Limelight.h and RtspConnection.c).
 *
 * Negotiation:
 *  - /serverinfo: `ServerCodecModeSupport` carries SCM_PYROWAVE (4:2:0) and SCM_PYROWAVE_444 (4:4:4).
 *  - RTSP DESCRIBE: the SDP carries `a=rtpmap:99 PYROWAVE/90000` and `a=fmtp:99 version=<bitstream version>`.
 *  - RTSP ANNOUNCE: the client sets `x-nv-vqos[0].bitStreamFormat` to 3 and `x-ss-video[0].chromaSamplingType`
 *    as for the other codecs. Width, height and frame rate come from the usual attributes.
 * Clients that do not know the format never see it, and the server only advertises it when it can encode it.
 */
#pragma once

#include <cstdint>

namespace pyrowave {
  // Helios extension bits of ServerCodecModeSupport. Limelight.h (moonlight-common-c) defines the same values
  // as the macros SCM_PYROWAVE and SCM_PYROWAVE_444, hence the different names here; nvhttp.cpp checks they match.
  constexpr std::uint32_t CODEC_FLAG = 0x00800000;
  constexpr std::uint32_t CODEC_FLAG_444 = 0x01000000;

  // Value of x-nv-vqos[0].bitStreamFormat (0 - H.264, 1 - HEVC, 2 - AV1).
  constexpr int BITSTREAM_FORMAT = 3;

  // Version of the PyroWave bitstream and of our framing of it. Bump when either changes incompatibly.
  constexpr int PROTOCOL_VERSION = 1;

  // Dynamic RTP payload type used in the SDP (97 is audio, 98 is AV1).
  constexpr int RTP_PAYLOAD_TYPE = 99;

  /**
   * @brief Returns the ServerCodecModeSupport bits to advertise.
   * @param available True when this host can encode PyroWave.
   * @param yuv444 True when 4:4:4 is available too.
   */
  constexpr std::uint32_t
    codec_mode_flags(bool available, bool yuv444) {
    return available ? (CODEC_FLAG | (yuv444 ? CODEC_FLAG_444 : 0)) : 0;
  }

  /**
   * @brief True when a client request for bitStreamFormat is a PyroWave request.
   */
  constexpr bool
    is_pyrowave_format(int bitstream_format) {
    return bitstream_format == BITSTREAM_FORMAT;
  }
}  // namespace pyrowave
