/**
 * @file tests/unit/test_session_policy.cpp
 * @brief Test src/session_policy.h.
 */
#include "../tests_common.h"

#include <src/session_policy.h>

using namespace session_policy;
using namespace std::chrono_literals;

namespace {
  const clock::time_point t0 {};
}

TEST(SessionPolicy, FreeHostIsClaimedByTheFirstClient) {
  host_claim_t claim;
  EXPECT_TRUE(try_claim(claim, {}, "tablet", t0));
  EXPECT_EQ(claim.owner, "tablet");
  EXPECT_EQ(claim.expires, t0 + CLAIM_TTL);
}

TEST(SessionPolicy, OwnerRenewsItsClaim) {
  host_claim_t claim;
  ASSERT_TRUE(try_claim(claim, {}, "tablet", t0));
  EXPECT_TRUE(try_claim(claim, {}, "tablet", t0 + 2s));
  EXPECT_EQ(claim.expires, t0 + 2s + CLAIM_TTL);
}

TEST(SessionPolicy, SecondClientCannotClaimWhileTheFirstBrowses) {
  host_claim_t claim;
  ASSERT_TRUE(try_claim(claim, {}, "tablet", t0));
  EXPECT_FALSE(try_claim(claim, {}, "phone", t0 + 1s));
  EXPECT_EQ(claim.owner, "tablet");
  EXPECT_TRUE(busy_for({}, claim, "phone", t0 + 1s));
  EXPECT_FALSE(busy_for({}, claim, "tablet", t0 + 1s));
}

TEST(SessionPolicy, ExpiredClaimIsTakenOver) {
  host_claim_t claim;
  ASSERT_TRUE(try_claim(claim, {}, "tablet", t0));
  EXPECT_TRUE(try_claim(claim, {}, "phone", t0 + CLAIM_TTL));
  EXPECT_EQ(claim.owner, "phone");
}

TEST(SessionPolicy, ReleaseFreesTheHostOnlyForTheOwner) {
  host_claim_t claim;
  ASSERT_TRUE(try_claim(claim, {}, "tablet", t0));
  release(claim, "phone");
  EXPECT_TRUE(busy_for({}, claim, "phone", t0 + 1s));
  release(claim, "tablet");
  EXPECT_FALSE(busy_for({}, claim, "phone", t0 + 1s));
}

TEST(SessionPolicy, StreamingClientKeepsTheHostAfterItsClaimExpires) {
  host_claim_t claim;
  ASSERT_TRUE(try_claim(claim, {"tablet"}, "tablet", t0));
  EXPECT_FALSE(try_claim(claim, {"tablet"}, "phone", t0 + 1min));
  EXPECT_TRUE(busy_for({"tablet"}, claim, "phone", t0 + 1min));
}

TEST(SessionPolicy, StreamingClientCanBrowseAgain) {
  host_claim_t claim;
  EXPECT_TRUE(try_claim(claim, {"tablet"}, "tablet", t0));
}

TEST(SessionPolicy, BusyReplyIsAServerError) {
  EXPECT_EQ(BUSY_STATUS, 503);
  EXPECT_FALSE(BUSY_MESSAGE.empty());
}
