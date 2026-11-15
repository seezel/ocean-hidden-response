# Seven-slide demo verification

Generated using bundled Artifact Tool 2.8.59 with JavaScript ES modules. No dependency installation or source-data mutation.

Final PPTX SHA-256: `4a43c09b9e832ce519830b080b94a622a8a046c3989bc3ea8bddc882a0b165a7`. Size: 38391 bytes.

## Outputs

- `artifacts/submission/demo.pptx`: seven total slides, 16:9.
- `artifacts/submission/demo.pdf`: seven-page raster preview assembled from final-PPTX renders. Edit charts and tables in the PPTX.
- `artifacts/submission/slides/slide-01.png` through `slide-07.png`: final-PPTX renders at 1920 × 1080.
- `artifacts/submission/slides/contact-sheet.png`: deck overview.
- `tools/make-deck.mjs`: reproducible generator.

## Evidence and editability

Source content: PRODUCT.md, DESIGN.md, README.md, data/observations.json, data/provenance.json and data/reference-results.json. Four native tables appear on slides 2, 4, 5 and 6. Slide 4 has a native line chart with two series and an embedded workbook. The chart shows annual geometric means of available monthly values, rounded to six decimals for portable workbook precision. Reference estimates use the original monthly model. The 2023 and 2025 annual means each use 11 months, with no imputation.

The fixed January 2013–December 2025 fits each use 154/156 months. Chlorophyll EEP −16.31%/decade (95% interval −23.66 to −8.25%), NWP −17.76%/decade (−26.26 to −8.29%). Direct aligned log-trend difference +0.00175/year (−0.01362 to +0.01712/year), p=0.822, correctly inconclusive. SST EEP −0.07°C/decade (−0.92 to +0.78), NWP +0.41°C/decade (+0.19 to +0.64). All values match the frozen reference within displayed rounding.

NASA MODIS Aqua January 2013 values match provenance: EEP 0.17995 mg/m³, NWP 0.06966 mg/m³. Giovanni catalogue, NASA CMR, granule mirror, DOI and checksums appear in speaker notes. Visible caveat states that one month verifies provenance and actual NASA data use only, not trend agreement. Honest VIIRS fallback, exploratory-window warning, approximate inference, no causal interpretation and AI disclosure remain visible. No participant identities, photos or voices, deployed URL, submission claim or award appears.

## Automated checks

Package integrity, declared seven-slide count, intended slide dimensions, heading fit, selected fonts, required native-table presence, chart cache/workbook consistency and first-party PPTX reimport passed with no geometry warnings. Native table arithmetic checks correctly skipped non-total tables. PDF page count is seven.

## Updated CDS feasibility

C3S authentication succeeded after the user configured CDS locally. The authenticated January 2013 global file is 177,604,652 bytes, above the predefined 96 MiB feasibility cap. The interface offers no regional subsetting. Slide 2 and its speaker notes now explain that the whole-file transfer budget retains the approved VIIRS fallback. Missing authentication is no longer the rationale. All numerical scientific results remain unchanged.

## Visual review and limits

The earlier full seven-slide inspection passed. For this wording update, slide 2 was inspected again from the reimported final PPTX at 1920 × 1080 and from the final PDF rendered by Poppler. Its longer fallback explanation fits without clipping or overlap. The final package was checked for seven slides, updated wording in visible text and speaker notes, and absence of the stale authentication rationale. The finalizer repeated the required structural/native-chart checks successfully. No extra broad scientific reanalysis was performed.

No native PowerPoint/LibreOffice application test has been performed. The existing runtime supplies no LibreOffice version and direct Artifact Tool PDF export is unsupported, so the PDF is explicitly a raster preview. Private intermediate build files were removed after verification.

## Detailed finalizer receipt

```json
{
  "finalPath": "C:\\Users\\DELL E6430 i5\\Downloads\\ocean_hidden_resp\\artifacts\\submission\\slides\\.build\\validated-1794625156266.pptx",
  "receiptPath": "C:\\Users\\DELL E6430 i5\\Downloads\\ocean_hidden_resp\\docs\\deck-report.md",
  "schemaVersion": "presentation-finalization.v1",
  "finalSha256": "4a43c09b9e832ce519830b080b94a622a8a046c3989bc3ea8bddc882a0b165a7",
  "byteCount": 38391,
  "packageIntegrity": {
    "chart_count": 1,
    "claim_boundary": "Structural package checks only; no slide text, notes, formulas, chart values, or native PowerPoint execution were inspected.",
    "finding_count": 0,
    "findings": [],
    "notes_parts_skipped": 7,
    "relationship_part_count": 20,
    "slide_count": 7,
    "status": "pass",
    "exitCode": 0,
    "findingCount": 0,
    "warnings": []
  },
  "presentationLayout": {
    "finding_count": 0,
    "findings": [],
    "font_policy": {
      "checked_text_script_count": 127,
      "native_font_rendering_verified": false,
      "observed_font_families": [
        "Arial",
        "Consolas",
        "Georgia"
      ],
      "observed_font_use_counts": {
        "Arial": 112,
        "Consolas": 1,
        "Georgia": 14
      },
      "passed": true,
      "performed": true
    },
    "slide_count": 7,
    "slide_size_in": [
      13.3333,
      7.5
    ],
    "warning_count": 0,
    "warnings": [],
    "exitCode": 0,
    "findingCount": 0,
    "fontPolicy": {
      "checked_text_script_count": 127,
      "native_font_rendering_verified": false,
      "observed_font_families": [
        "Arial",
        "Consolas",
        "Georgia"
      ],
      "observed_font_use_counts": {
        "Arial": 112,
        "Consolas": 1,
        "Georgia": 14
      },
      "passed": true,
      "performed": true
    }
  },
  "fontSelection": {
    "basis": "design",
    "approvedFamilies": [
      "Georgia",
      "Arial",
      "Consolas"
    ],
    "scriptFonts": {},
    "referenceSha256": null,
    "referenceFontsVerifiedInEncodedText": false,
    "checked_text_script_count": 127,
    "native_font_rendering_verified": false,
    "observed_font_families": [
      "Arial",
      "Consolas",
      "Georgia"
    ],
    "observed_font_use_counts": {
      "Arial": 112,
      "Consolas": 1,
      "Georgia": 14
    },
    "passed": true,
    "performed": true
  },
  "firstPartyImport": {
    "performed": true,
    "passed": true,
    "slideCount": 7,
    "sha256": "4a43c09b9e832ce519830b080b94a622a8a046c3989bc3ea8bddc882a0b165a7",
    "runtimeNodeModules": "C:\\Users\\DELL E6430 i5\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules",
    "nodeExecutable": "C:\\Users\\DELL E6430 i5\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin\\node.exe"
  },
  "nativeTableArithmetic": {
    "performed": true,
    "checked_column_count": 0,
    "checks": [],
    "claim_boundary": "Displayed-value arithmetic with rounding tolerance; not source-data verification.",
    "eligible_table_count": 0,
    "finding_count": 0,
    "findings": [],
    "native_table_count": 4,
    "passed": true,
    "schema_version": "presentation-native-table-arithmetic.v1",
    "skipped_tables": [
      {
        "reason": "no_numeric_amounts",
        "slide": 2,
        "table": 1
      },
      {
        "reason": "no_unambiguous_bottom_total",
        "slide": 4,
        "table": 1
      },
      {
        "reason": "no_unambiguous_bottom_total",
        "slide": 5,
        "table": 1
      },
      {
        "reason": "no_unambiguous_bottom_total",
        "slide": 6,
        "table": 1
      }
    ],
    "slide_count": 7,
    "warning_count": 0,
    "warnings": []
  },
  "nativeChartTitles": {
    "performed": true,
    "checks": [
      {
        "chart": 1,
        "slide": 4,
        "status": "absent"
      }
    ],
    "finding_count": 0,
    "findings": [],
    "native_chart_count": 1,
    "native_powerpoint_verified": false,
    "passed": true,
    "presentation_sha256": "4a43c09b9e832ce519830b080b94a622a8a046c3989bc3ea8bddc882a0b165a7",
    "schema_version": "presentation-native-chart-titles.v1",
    "slide_count": 7,
    "source_text_emitted": false,
    "unresolved_linked_title_count": 0
  },
  "sourceDerivedPolicyFlags": [
    "--expected-slide-size-emu",
    "12192000,6858000",
    "--validate-heading-fit",
    "--require-native-table-slide",
    "2",
    "--require-native-table-slide",
    "4",
    "--require-native-table-slide",
    "5",
    "--require-native-table-slide",
    "6",
    "--cover-role",
    "none",
    "--expected-slide-count",
    "7",
    "--approved-font-family",
    "Georgia",
    "--approved-font-family",
    "Arial",
    "--approved-font-family",
    "Consolas"
  ],
  "nativeChartValidation": {
    "detectedOwnerSlides": [
      4
    ],
    "detectedChartCount": 1,
    "targetApplication": "portable",
    "sourceChartOwnersExplicitlyDeclared": true,
    "validatorRan": true,
    "passed": true
  },
  "nativeQuantitativeCharts": {
    "report": {
      "claim_boundary": "OOXML/workbook structural validation only; source provenance and native PowerPoint opening remain separate checks.",
      "expected_quantitative_chart_slides": [
        4
      ],
      "failed_slide_count": 0,
      "failed_slides": [],
      "formal_human_reviewed": false,
      "native_application_open_verified": false,
      "package_sha256": "4a43c09b9e832ce519830b080b94a622a8a046c3989bc3ea8bddc882a0b165a7",
      "passed": true,
      "results": [
        {
          "approved_source_figure_exception": false,
          "charts": [
            {
              "cache_reference_ranges_verified": true,
              "embedded_workbook_count": 1,
              "embedded_workbook_sheet_count": 1,
              "native_chart_types": [
                "lineChart"
              ],
              "numeric_cache_point_count": 52,
              "series_formula_count": 4,
              "workbook_numeric_cell_count": 52
            }
          ],
          "failure_codes": [],
          "native_chart_count": 1,
          "raster_picture_count": 0,
          "required_native_chart_count": 1,
          "slide_number": 4,
          "status": "passed"
        }
      ],
      "schema_version": "owner-private.quantitative-chart-native-gate.v1",
      "slide_count": 7,
      "source_attachments_accessed": false,
      "validated_slide_count": 1
    },
    "exitCode": 0,
    "validatedSlideCount": 1,
    "requiredOwnerSlides": [
      4
    ],
    "approvedSourceFigureExceptionSlides": []
  },
  "chartDataPackaging": {
    "conversion": "chart_data_snapshot",
    "converted_chart_count": 1,
    "converted_charts": [
      {
        "chart_part": "ppt/slides/charts/chart1.xml",
        "owner_slide": 4,
        "point_count": 26,
        "series_count": 2,
        "workbook_part": "ppt/embeddings/chart-data-snapshot-001.xlsx"
      }
    ],
    "detected_chart_owner_slides": [
      4
    ],
    "experimental": true,
    "input_sha256": "79feaa7aa06f617168aa6111d56d8e5b4bf5c5cd2eb29bc10d0c31a4e324dda2",
    "new_formulas_describe_snapshot_only": true,
    "output_bytes": 38391,
    "output_sha256": "4a43c09b9e832ce519830b080b94a622a8a046c3989bc3ea8bddc882a0b165a7",
    "portable_chart_validation_passed": true,
    "portable_validated_owner_slides": [
      4
    ],
    "preserved_existing_workbook_chart_count": 0,
    "preserved_existing_workbook_charts": [],
    "schema_version": "experimental.literal-chart-workbook-snapshot.v1",
    "source_formula_required_slides": [],
    "source_formulas_preserved": false,
    "source_workbook_preserved": false,
    "source_workbook_required_slides": []
  }
}
```
