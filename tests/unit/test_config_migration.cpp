/**
 * @file tests/unit/test_config_migration.cpp
 * @brief Test the migration of the files and options of an older Helios install in src/config.*.
 */
#include "../tests_common.h"

// standard includes
#include <filesystem>
#include <fstream>
#include <random>
#include <string>
#include <unordered_map>

// local includes
#include <src/config.h>

namespace fs = std::filesystem;

namespace {
  void write_file(const fs::path &path, const std::string &content) {
    std::ofstream file {path, std::ios::binary};
    file << content;
  }

  std::string read_file(const fs::path &path) {
    std::ifstream file {path, std::ios::binary};
    return {std::istreambuf_iterator<char> {file}, std::istreambuf_iterator<char> {}};
  }
}  // namespace

class ConfigMigrationFileTest: public testing::Test {
protected:
  void SetUp() override {
    std::random_device rd;
    dir = fs::temp_directory_path() / ("helios_config_migration_" + std::to_string(rd()));
    fs::create_directories(dir);
  }

  void TearDown() override {
    std::error_code ec;
    fs::remove_all(dir, ec);
  }

  fs::path dir;
};

TEST_F(ConfigMigrationFileTest, RenamesEachLegacyDefaultFile) {
  const std::pair<const char *, const char *> files[] = {
    {"helios.conf", "sunshine.conf"},
    {"helios_state.json", "sunshine_state.json"},
    {"helios.log", "sunshine.log"},
  };

  for (const auto &[current, legacy] : files) {
    write_file(dir / legacy, std::string {"content of "} + legacy);

    const auto message = config::migrate_legacy_file(dir / current);

    EXPECT_NE(message.find("renamed"), std::string::npos) << message;
    EXPECT_FALSE(fs::exists(dir / legacy)) << legacy;
    ASSERT_TRUE(fs::exists(dir / current)) << current;
    EXPECT_EQ(read_file(dir / current), std::string {"content of "} + legacy);
  }
}

TEST_F(ConfigMigrationFileTest, KeepsTheCurrentFileWhenBothExist) {
  write_file(dir / "helios.conf", "current");
  write_file(dir / "sunshine.conf", "legacy");

  EXPECT_TRUE(config::migrate_legacy_file(dir / "helios.conf").empty());
  EXPECT_EQ(read_file(dir / "helios.conf"), "current");
  EXPECT_EQ(read_file(dir / "sunshine.conf"), "legacy");
}

TEST_F(ConfigMigrationFileTest, DoesNothingWithoutALegacyFile) {
  EXPECT_TRUE(config::migrate_legacy_file(dir / "helios_state.json").empty());
  EXPECT_FALSE(fs::exists(dir / "helios_state.json"));
}

TEST_F(ConfigMigrationFileTest, LeavesCustomFileNamesAlone) {
  write_file(dir / "sunshine_state.json", "legacy");

  // A path chosen by the user is not one of the default names: nothing is renamed to it
  EXPECT_TRUE(config::migrate_legacy_file(dir / "my_state.json").empty());
  EXPECT_FALSE(fs::exists(dir / "my_state.json"));
  EXPECT_TRUE(fs::exists(dir / "sunshine_state.json"));
}

TEST_F(ConfigMigrationFileTest, RunsOnlyOnce) {
  write_file(dir / "sunshine.conf", "legacy");

  EXPECT_FALSE(config::migrate_legacy_file(dir / "helios.conf").empty());
  write_file(dir / "sunshine.conf", "left behind later");
  EXPECT_TRUE(config::migrate_legacy_file(dir / "helios.conf").empty());
  EXPECT_EQ(read_file(dir / "helios.conf"), "legacy");
}

TEST(ConfigMigrationOptionTest, RenamesTheLegacyHostNameKey) {
  std::unordered_map<std::string, std::string> vars {{"sunshine_name", "My PC"}, {"port", "47989"}};

  const auto found = config::migrate_legacy_options(vars);

  EXPECT_EQ(found, std::vector<std::string> {"sunshine_name"});
  EXPECT_FALSE(vars.contains("sunshine_name"));
  EXPECT_EQ(vars.at("helios_name"), "My PC");
  EXPECT_EQ(vars.at("port"), "47989");
}

TEST(ConfigMigrationOptionTest, TheCurrentKeyWinsOverTheLegacyOne) {
  std::unordered_map<std::string, std::string> vars {{"sunshine_name", "Old"}, {"helios_name", "New"}};

  config::migrate_legacy_options(vars);

  EXPECT_FALSE(vars.contains("sunshine_name"));
  EXPECT_EQ(vars.at("helios_name"), "New");
}

TEST(ConfigMigrationOptionTest, DropsTheRemovedEnvvarCompatibilityMode) {
  std::unordered_map<std::string, std::string> vars {{"envvar_compatibility_mode", "enabled"}, {"helios_name", "PC"}};

  const auto found = config::migrate_legacy_options(vars);

  EXPECT_EQ(found, std::vector<std::string> {"envvar_compatibility_mode"});
  EXPECT_FALSE(vars.contains("envvar_compatibility_mode"));
  EXPECT_EQ(vars.size(), 1);
}

TEST(ConfigMigrationOptionTest, LeavesACurrentConfigUntouched) {
  std::unordered_map<std::string, std::string> vars {{"helios_name", "PC"}, {"port", "47989"}};
  const auto before = vars;

  EXPECT_TRUE(config::migrate_legacy_options(vars).empty());
  EXPECT_EQ(vars, before);
}
