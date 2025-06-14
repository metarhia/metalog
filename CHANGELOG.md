# Changelog

## [Unreleased][unreleased]

## [3.1.16][] - 2025-06-05

- Add node.js 23 and 24 to CI
- Update dependencies

## [3.1.15][] - 2024-08-30

- Update eslint to 9.x and prettier with configs
- Add node.js 22 to CI

## [3.1.14][] - 2023-12-10

- Moved to native node test runner
- Update dependencies
- Fix package file: url and formatting
- Update Guthub actions CI config and add nodejs 21 to CI
- Add "es2020" to eslint configuration

## [3.1.13][] - 2023-10-22

- Added flush logs on buffer size condition
- Added default params toFile, toStdout in constructor
- Drop node.js 16 and 19
- Update dependencies and convert lockfileVersion 2 to 3

## [3.1.12][] - 2023-07-13

- Use `isError` from metautil
- Use private fields in `Console`
- Maintenance: update typings, dependencies, eslint rules, fix code style

## [3.1.11][] - 2023-05-01

- Drop node.js 14 support, add node.js 20
- Convert package_lock.json to lockfileVersion 2
- Update dependencies

## [3.1.10][] - 2023-03-13

- Update dependencies and fix security issues
- Add `node:` prefix in require for built-in modules

## [3.1.9][] - 2022-07-07

- Package maintenance

## [3.1.8][] - 2022-03-30

- Add support for json-only logs

## [3.1.7][] - 2022-03-17

- Fix unlink empty files
- Improve error handling
- Update dependencies and package maintenance

## [3.1.6][] - 2021-12-08

- Fix typings
- Remove useless code from tests
- Fix unlink file bug

## [3.1.5][] - 2021-10-11

- Update dependencies and npm audit fix

## [3.1.4][] - 2021-09-10

- Update dependencies

## [3.1.3][] - 2021-07-22

- Improve code style
- Move types to package root

## [3.1.2][] - 2021-05-24

- Package maintenance

## [3.1.1][] - 2021-01-15

- Remove code duplication: use metautil.replace
- Remove unneeded code and comments
- Add examples to README.md
- Add .d.ts typings

## [3.1.0][] - 2021-01-07

- Use metautil instead of metarhia/common
- Use writable factory instead of constructor
- Use fs.createWriteStream instead of metastreams

## [3.0.0][] - 2020-12-16

- Change Logger interface, use async/await
- Console interface implementation
- Create log folder if not exists
- Support windows

## [2.x][]

- New Logger class extends EventEmitter
- Refactor module to use new ES2020 syntax and features
- Rewrite code using async/await
- Truncate paths in stack traces to minimize log files
- Use metarhia eslint config
- Fix multiple bugs and optimize performance

## [1.x][]

First generation of Metarhia Logger

[unreleased]: https://github.com/metarhia/metalog/compare/v3.1.16...HEAD
[3.1.16]: https://github.com/metarhia/metalog/compare/v3.1.15...v3.1.16
[3.1.15]: https://github.com/metarhia/metalog/compare/v3.1.14...v3.1.15
[3.1.14]: https://github.com/metarhia/metalog/compare/v3.1.13...v3.1.14
[3.1.13]: https://github.com/metarhia/metalog/compare/v3.1.12...v3.1.13
[3.1.12]: https://github.com/metarhia/metalog/compare/v3.1.11...v3.1.12
[3.1.11]: https://github.com/metarhia/metalog/compare/v3.1.10...v3.1.11
[3.1.10]: https://github.com/metarhia/metalog/compare/v3.1.9...v3.1.10
[3.1.9]: https://github.com/metarhia/metalog/compare/v3.1.8...v3.1.9
[3.1.8]: https://github.com/metarhia/metalog/compare/v3.1.7...v3.1.8
[3.1.7]: https://github.com/metarhia/metalog/compare/v3.1.6...v3.1.7
[3.1.6]: https://github.com/metarhia/metalog/compare/v3.1.5...v3.1.6
[3.1.5]: https://github.com/metarhia/metalog/compare/v3.1.4...v3.1.5
[3.1.4]: https://github.com/metarhia/metalog/compare/v3.1.3...v3.1.4
[3.1.3]: https://github.com/metarhia/metalog/compare/v3.1.2...v3.1.3
[3.1.2]: https://github.com/metarhia/metalog/compare/v3.1.1...v3.1.2
[3.1.1]: https://github.com/metarhia/metalog/compare/v3.1.0...v3.1.1
[3.1.0]: https://github.com/metarhia/metalog/compare/v3.0.0...v3.1.0
[3.0.0]: https://github.com/metarhia/metalog/compare/v2.x...v3.0.0
[2.x]: https://github.com/metarhia/metalog/compare/v1.x...v2.x
[1.x]: https://github.com/metarhia/metalog/tree/v1.x
