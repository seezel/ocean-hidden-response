# Geographic basemap

The locally bundled `ne_110m_land.geojson` is Natural Earth's 1:110m land layer, downloaded unchanged from the [versioned v5.1.2 repository](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_land.geojson) on November 14, 2026. It contains 127 Polygon features and is 138,160 bytes, below the authorized 2 MiB acquisition limit.

SHA-256: `9e0729ee253ca7d7a5c4ae9395fb1902264c5377c52e224d13dd85010e2835d9`.

Natural Earth data are public domain under the [publisher's terms of use](https://www.naturalearthdata.com/about/terms-of-use/). Attribution is optional; this project credits Natural Earth for source transparency. Suggested credit: “Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com.” Machine-readable provenance is in `map-source.json`.

The map is geographic context, not NASA imagery, an ocean observation, or an input to the scientific calculations. It uses a Pacific-centered equirectangular view from 60°E to 60°W and 55°S to 65°N. Longitude and latitude use the same pixels per degree; distance and area are distorted, especially at higher latitudes. Coastlines are generalized for a small locator and should not be used for navigation or precise coastal interpretation.

Geometry is validated before rendering, unwrapped into continuous rings, and copied by whole turns only where it intersects the viewport. SVG clipping bounds the displayed land. No mapping service, tiles, remote fonts or external runtime requests are required. If loading or validation fails, the application retains the explicitly labelled coordinate schematic without coastlines.
