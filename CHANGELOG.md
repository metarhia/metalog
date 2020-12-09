# Changelog

## [Unreleased][unreleased]

To be released in 3.0.0

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

[unreleased]: https://github.com/metarhia/metalog/compare/v2.x...HEAD
[2.x]: https://github.com/metarhia/metalog/compare/v1.x...v2.x
[1.x]: https://github.com/metarhia/metalog/tree/v1.x
