/**
 * @file tests/integration/test_locale_consistency.cpp
 * @brief Test locale consistency between config.cpp, the web UI locale choices and the web UI locale JSON files
 */
#include "../tests_common.h"

// standard includes
#include <filesystem>
#include <format>
#include <functional>
#include <regex>
#include <set>
#include <string>
#include <vector>

// lib includes
#include <nlohmann/json.hpp>

// local includes
#include "src/file_handler.h"

namespace fs = std::filesystem;

class LocaleConsistencyTest: public ::testing::Test {
protected:
  // Extract locale options from config.cpp
  static std::set<std::string, std::less<>> extractConfigCppLocales() {
    std::set<std::string, std::less<>> locales;
    const std::string content = file_handler::read_file("src/config.cpp");

    // Find the string_restricted_f call for locale
    const std::regex localeSection(R"(string_restricted_f\s*\(\s*vars\s*,\s*"locale"[^}]*\{([^}]*)\})");

    if (std::smatch match; std::regex_search(content, match, localeSection)) {
      const std::string localeList = match[1].str();

      // Extract individual locale codes
      const std::regex localePattern(R"delimiter("([^"]+)"sv)delimiter");
      std::sregex_iterator iter(localeList.begin(), localeList.end(), localePattern);

      for (const std::sregex_iterator end; iter != end; ++iter) {
        locales.insert((*iter)[1].str());
      }
    }

    return locales;
  }

  // Extract the locales offered by the web UI language select (LOCALE_CHOICES in general-options.ts)
  static std::set<std::string, std::less<>> extractWebUiLocaleChoices() {
    std::set<std::string, std::less<>> locales;
    const std::string content = file_handler::read_file("src_assets/common/assets/web-react/src/features/config/domain/general-options.ts");

    const std::regex choicesSection(R"(LOCALE_CHOICES[^=]*=\s*\[([^\]]*)\])");

    if (std::smatch match; std::regex_search(content, match, choicesSection)) {
      const std::string choices = match[1].str();

      const std::regex valuePattern(R"delimiter(value:\s*'([^']+)')delimiter");
      std::sregex_iterator iter(choices.begin(), choices.end(), valuePattern);

      for (const std::sregex_iterator end; iter != end; ++iter) {
        locales.insert((*iter)[1].str());
      }
    }

    return locales;
  }

  // Get available locale JSON files of the web UI
  static std::set<std::string, std::less<>> getAvailableLocaleFiles() {
    std::set<std::string, std::less<>> locales;
    const std::filesystem::path localeDir = "src_assets/common/assets/web-react/public/assets/locale";

    if (!fs::exists(localeDir)) {
      return locales;
    }

    for (const auto &entry : fs::directory_iterator(localeDir)) {
      if (entry.is_regular_file() && entry.path().extension() == ".json") {
        const std::string filename = entry.path().stem().string();
        locales.insert(filename);
      }
    }

    return locales;
  }

  // Helper function to check if a locale JSON file is valid using nlohmann/json
  static bool isValidLocaleFile(const std::string &localeCode) {
    const std::string filePath = std::format("src_assets/common/assets/web-react/public/assets/locale/{}.json", localeCode);

    if (!fs::exists(filePath)) {
      return false;
    }

    try {
      const std::string content = file_handler::read_file(filePath.c_str());

      // Parse JSON using nlohmann/json to validate it's properly formatted
      const nlohmann::json localeJson = nlohmann::json::parse(content);

      // Basic validation - should be a JSON object with some content
      return localeJson.is_object() && !localeJson.empty();
    } catch (const nlohmann::json::parse_error &) {
      return false;
    }
  }
};

TEST_F(LocaleConsistencyTest, WebUiOffersAtLeastTheSourceLocales) {
  const auto localeFiles = getAvailableLocaleFiles();

  // The web UI ships its own translations; English is the source and the fallback.
  EXPECT_TRUE(localeFiles.contains("en")) << "en.json is missing from the web UI locale folder";
  EXPECT_TRUE(localeFiles.contains("pt_BR")) << "pt_BR.json is missing from the web UI locale folder";
}

TEST_F(LocaleConsistencyTest, AllLocaleFilesHaveConfigCppEntries) {
  const auto configLocales = extractConfigCppLocales();
  const auto localeFiles = getAvailableLocaleFiles();

  std::vector<std::string> missingFromConfig;

  // Check that every locale file has a corresponding entry in config.cpp
  for (const auto &localeFile : localeFiles) {
    if (!configLocales.contains(localeFile)) {
      missingFromConfig.push_back(localeFile);
    }
  }

  if (!missingFromConfig.empty()) {
    std::string errorMsg = "Locale files missing from config.cpp:\n";
    for (const auto &missing : missingFromConfig) {
      errorMsg += std::format("  {}.json\n", missing);
    }
    FAIL() << errorMsg;
  }
}

TEST_F(LocaleConsistencyTest, WebUiLocaleChoicesMatchLocaleFiles) {
  const auto choices = extractWebUiLocaleChoices();
  const auto localeFiles = getAvailableLocaleFiles();

  ASSERT_FALSE(choices.empty()) << "Could not read LOCALE_CHOICES from general-options.ts";

  std::vector<std::string> problems;

  for (const auto &choice : choices) {
    if (!localeFiles.contains(choice)) {
      problems.push_back(std::format("the language select offers '{}' but {}.json does not exist", choice, choice));
    }
  }

  for (const auto &localeFile : localeFiles) {
    if (!choices.contains(localeFile)) {
      problems.push_back(std::format("{}.json exists but the language select does not offer it", localeFile));
    }
  }

  if (!problems.empty()) {
    std::string errorMsg = "Web UI locale inconsistencies found:\n";
    for (const auto &problem : problems) {
      errorMsg += std::format("  {}\n", problem);
    }
    FAIL() << errorMsg;
  }
}

TEST_F(LocaleConsistencyTest, WebUiLocaleChoicesAreAcceptedByTheServer) {
  const auto configLocales = extractConfigCppLocales();
  const auto choices = extractWebUiLocaleChoices();

  ASSERT_FALSE(choices.empty()) << "Could not read LOCALE_CHOICES from general-options.ts";

  std::vector<std::string> rejected;

  // A locale the language select offers but config.cpp rejects would be silently dropped on save
  for (const auto &choice : choices) {
    if (!configLocales.contains(choice)) {
      rejected.push_back(choice);
    }
  }

  if (!rejected.empty()) {
    std::string errorMsg = "Web UI locales not accepted by config.cpp:\n";
    for (const auto &locale : rejected) {
      errorMsg += std::format("  {}\n", locale);
    }
    FAIL() << errorMsg;
  }
}

TEST_F(LocaleConsistencyTest, AllLocaleFilesAreValid) {
  const auto localeFiles = getAvailableLocaleFiles();
  std::vector<std::string> invalidFiles;

  // Check that all locale files are valid JSON
  for (const auto &localeFile : localeFiles) {
    if (!isValidLocaleFile(localeFile)) {
      invalidFiles.push_back(localeFile);
    }
  }

  if (!invalidFiles.empty()) {
    std::string errorMsg = "Invalid locale files found:\n";
    for (const auto &invalid : invalidFiles) {
      errorMsg += std::format("  {}.json\n", invalid);
    }
    FAIL() << errorMsg;
  }
}

TEST_F(LocaleConsistencyTest, TestFrameworkDetectsLocaleInconsistencies) {
  // Test the framework by simulating a missing locale scenario
  const std::string testLocale = "test_framework_validation_locale";

  auto choices = extractWebUiLocaleChoices();
  const auto localeFiles = getAvailableLocaleFiles();

  // Add a fake locale to the choices to simulate a missing file
  choices.insert(testLocale);

  std::vector<std::string> missingFiles;
  for (const auto &choice : choices) {
    if (!localeFiles.contains(choice)) {
      missingFiles.push_back(choice);
    }
  }

  // Verify the test framework detects the missing fake locale
  bool foundMissingTestLocale = false;
  for (const auto &missing : missingFiles) {
    if (missing == testLocale) {
      foundMissingTestLocale = true;
      break;
    }
  }

  EXPECT_TRUE(foundMissingTestLocale) << "Test framework failed to detect missing locale file";
  EXPECT_GE(missingFiles.size(), 1) << "Test framework should detect at least the fake missing locale";
}
