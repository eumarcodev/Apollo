/**
 * @file src/session_policy.h
 * @brief One device at a time: a client owns the host from the moment it opens the host (app list) until it leaves.
 */
#pragma once

// standard includes
#include <chrono>
#include <string>
#include <string_view>
#include <vector>

namespace session_policy {
  /// Message shown to a client that is refused because another device is using the host.
  constexpr std::string_view BUSY_MESSAGE = "The host is in use by another device. Quit or leave the host on that device first.";

  /// HTTP status sent with BUSY_MESSAGE.
  constexpr int BUSY_STATUS = 503;

  /// A claim not renewed for this long is released (the owner closed the app without releasing it).
  constexpr std::chrono::seconds CLAIM_TTL {6};

  using clock = std::chrono::steady_clock;

  /// The client that owns the host while it browses the app list or streams.
  struct host_claim_t {
    std::string owner;  ///< Unique id of the owning client, empty when free.
    clock::time_point expires {};  ///< The claim is released after this instant unless renewed.
  };

  /**
   * @brief Whether another client is streaming.
   * @param streaming_clients Unique ids of the clients that stream video now or have a launch pending
   *                          (input-only sessions and stopping sessions are not listed).
   * @param requester Unique id of the client asking.
   */
  inline bool other_client_streaming(const std::vector<std::string> &streaming_clients, std::string_view requester) {
    for (const auto &client : streaming_clients) {
      if (client != requester) {
        return true;
      }
    }
    return false;
  }

  /**
   * @brief Whether the host is in use by another client: it streams, or it holds a live claim.
   */
  inline bool busy_for(const std::vector<std::string> &streaming_clients, const host_claim_t &claim, std::string_view requester, clock::time_point now) {
    if (other_client_streaming(streaming_clients, requester)) {
      return true;
    }
    return !claim.owner.empty() && claim.owner != requester && now < claim.expires;
  }

  /**
   * @brief Claims (or renews) the host for the requester when no other client uses it.
   * @return True when the requester owns the host afterwards.
   */
  inline bool try_claim(host_claim_t &claim, const std::vector<std::string> &streaming_clients, std::string_view requester, clock::time_point now) {
    if (busy_for(streaming_clients, claim, requester, now)) {
      return false;
    }
    claim.owner = requester;
    claim.expires = now + CLAIM_TTL;
    return true;
  }

  /**
   * @brief Releases the claim if the requester owns it (another client's claim is left alone).
   */
  inline void release(host_claim_t &claim, std::string_view requester) {
    if (claim.owner == requester) {
      claim.owner.clear();
    }
  }

}  // namespace session_policy
