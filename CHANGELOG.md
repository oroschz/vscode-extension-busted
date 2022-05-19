# Changelog

All notable changes to the "busted-tests" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Configure path/command to use in order to run 'busted'.
- Select between 'concurrent' and 'sequential' execution modes in the configuration.
- Customize prefix and suffix patterns for test files lookup.

### Changed

- Replace extension icon for improved visibility on dark backgrounds.
- Indicate the use of 'Semantic Versioning' guidelines in the changelog.
- Now only tests inside the'spec/' folder and with the '_spec.lua' suffix will be considered.
- Use more useful messages on test output, instead of just the test traceback.
- Update README.md to include information about requirements, installation and license.
- Change screenshot included in the documentation.

### Fixed

- Fix 'test explorer' not being updated after test cases are modified.
- Fix 'test explorer' not being updated after test folder is added or removed from outside vscode.

## [0.1.0] - 2022-04-20

- Initial release
