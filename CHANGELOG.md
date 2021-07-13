# Changelog

## [Unreleased][unreleased]

- Improve code style

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

[unreleased]: https://github.com/metarhia/metalog/compare/v3.1.2...HEAD
[3.1.2]: https://github.com/metarhia/metalog/compare/v3.1.1...v3.1.2
[3.1.1]: https://github.com/metarhia/metalog/compare/v3.1.0...v3.1.1
[3.1.0]: https://github.com/metarhia/metalog/compare/v3.0.0...v3.1.0
[3.0.0]: https://github.com/metarhia/metalog/compare/v2.x...v3.0.0
[2.x]: https://github.com/metarhia/metalog/compare/v1.x...v2.x
[1.x]: https://github.com/metarhia/metalog/tree/v1.x
