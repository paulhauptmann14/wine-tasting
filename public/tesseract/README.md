# Self-hosted tesseract.js assets

On-device OCR for the label scan (`src/components/admin/label-scan/ocr.ts`). Photos never leave the
browser and nothing is loaded from a third-party CDN. Passed to `createWorker` as
`workerPath` / `corePath` / `langPath`.

| File | Source | Size |
| --- | --- | --- |
| `worker.min.js` (+ `.LICENSE.txt`) | `tesseract.js@7.0.0` `dist/worker.min.js` | 111 KB |
| `core/tesseract-core-relaxedsimd-lstm.wasm.js` | `tesseract.js-core@7.0.0` (WASM embedded) | 3.9 MB |
| `core/tesseract-core-simd-lstm.wasm.js` | `tesseract.js-core@7.0.0` | 3.9 MB |
| `core/tesseract-core-lstm.wasm.js` | `tesseract.js-core@7.0.0` (browsers without SIMD) | 3.9 MB |
| `lang/{deu,eng,fra,ita,spa,por}.traineddata.gz` | [tessdata_fast](https://github.com/tesseract-ocr/tessdata_fast) (`main`), gzipped with `gzip -9 -n` | 0.85 (deu) + 1.97 (eng) + 0.61 (fra) + 1.27 (ita) + 1.13 (spa) + 1.0 (por) MB |

A client downloads only one core file (picked by feature detection, about 3.9 MB) plus the language
data (about 6.8 MB for all six languages, sizes in MB = 10^6 bytes). The scan uses the normal browser
cache only (no IndexedDB, `cacheMethod: 'none'`); the paths are served with
`Cache-Control: public, max-age=86400, stale-while-revalidate=604800` (`next.config.ts`). Only the LSTM
cores are included because the app uses the LSTM engine only (`oem = 1`). All of it is loaded lazily
when the scan starts, so it does not affect the normal page weight. The directory is about 18 MB in the
repo (11.7 MB cores, 6.8 MB language data, 0.1 MB worker).

## Updating

```bash
npm install --save-exact tesseract.js@<version>
cp node_modules/tesseract.js/dist/worker.min.js{,.LICENSE.txt} public/tesseract/
cp node_modules/tesseract.js-core/tesseract-core-{lstm,simd-lstm,relaxedsimd-lstm}.wasm.js public/tesseract/core/
# language data: download <lang>.traineddata from tessdata_fast, then `gzip -9 -n`
```

The `core` files must come from the `tesseract.js-core` version that the installed tesseract.js
depends on. This folder is excluded from ESLint (minified third-party code).

## Licenses

tesseract.js, tesseract.js-core and tessdata_fast are licensed under Apache-2.0
(`core/LICENSE`; upstream: <https://github.com/naptha/tesseract.js>,
<https://github.com/tesseract-ocr/tessdata_fast>). `worker.min.js` bundles MIT/BSD-licensed
packages, see `worker.min.js.LICENSE.txt`.

## Third-party notices

The code that `worker.min.js` bundles (see `worker.min.js.LICENSE.txt`): buffer (MIT, Feross
Aboukhadijeh), ieee754 (BSD-3-Clause, Feross Aboukhadijeh), regenerator-runtime (MIT, Facebook, Inc.),
zlib.js (MIT, imaya).

The WASM cores are compiled from Tesseract and, according to the build scripts of
[tesseract.js-core](https://github.com/naptha/tesseract.js-core/tree/master/build-scripts), these
libraries: Leptonica (BSD-2-Clause), libpng and zlib (their own permissive licenses), libjpeg (IJG
license), libtiff and libwebp (BSD-style licenses), giflib (MIT) and openlibm (MIT and BSD-style
licenses). The strings of the core confirm Leptonica, libpng, libtiff, libjpeg and giflib. tesseract.js-core
ships only its own Apache-2.0 `core/LICENSE`, no separate license texts of these libraries. Their
license texts are in the upstream projects.
