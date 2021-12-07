# Changelog

## [Unreleased][unreleased]

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

[unreleased]: https://github.com/metarhia/metalog/compare/v3.1.6...HEAD
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
