import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

// The bundled runtime is used without installing or modifying dependencies.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = process.env.CODEX_PRESENTATION_RUNTIME || 'C:/Users/DELL E6430 i5/.cache/codex-runtimes/codex-primary-runtime/dependencies';
const SKILL = process.env.PRESENTATIONS_SKILL_DIR || 'C:/Users/DELL E6430 i5/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.61513/skills/presentations';
process.env.RUNTIME_NODE_MODULES = path.join(CACHE, 'node/node_modules');
const requireRuntime = createRequire(path.join(process.env.RUNTIME_NODE_MODULES, '__runtime__.cjs'));
const { Presentation, PresentationFile, FileBlob } = await import(pathToFileURL(requireRuntime.resolve('@oai/artifact-tool')).href);
const { finalizePresentation, applyPresentationChartFont } = await import(pathToFileURL(path.join(SKILL, 'container_tools/artifact_tool_utils.mjs')).href);
const OUT = path.join(ROOT, 'artifacts/submission');
const IMAGES = path.join(OUT, 'slides');
const BUILD = path.join(IMAGES, '.build');
await fs.mkdir(BUILD, { recursive: true });
const read = async name => JSON.parse(await fs.readFile(path.join(ROOT, name), 'utf8'));
const [ref, provenance, observations] = await Promise.all(['data/reference-results.json', 'data/provenance.json', 'data/observations.json'].map(read));
const P = { paper: '#f7f6f1', ink: '#242b2c', secondary: '#4c5556', rule: '#c7cbc7', eep: '#963e30', nwp: '#1a6266', white: '#ffffff' };
const FONT = 'Arial';
const TITLE = 'Georgia';
const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });
let index = 0;
function text(slide, value, left, top, width, height, size = 27, extra = {}) {
  const shape = slide.shapes.add({ geometry: 'textbox', position: { left, top, width, height }, fill: 'none', line: { fill: 'none', width: 0 } });
  shape.text = value;
  shape.text.style = { typeface: FONT, fontSize: size, color: P.ink, autoFit: 'none', ...extra };
  return shape;
}
function slide(title, notes, subtitle = '') {
  const s = presentation.slides.add();
  s.background.fill = P.paper;
  index++;
  text(s, title, 64, 40, 1152, 88, 43, { typeface: TITLE });
  if (subtitle) text(s, subtitle, 64, 126, 1152, 48, 23, { color: P.secondary });
  text(s, `The Ocean's Hidden Response     ${String(index).padStart(2, '0')} / 07`, 64, 672, 1152, 25, 16, { color: P.secondary });
  s.speakerNotes.textFrame.setText(notes);
  return s;
}
function table(slide, values, top, heights, widths, size = 24) {
  const rows = values.length;
  const columns = values[0].length;
  const t = slide.tables.add({ rows, columns, left: 64, top, width: 1152, height: heights.reduce((a, b) => a + b, 0), columnWidths: widths, values });
  t.styleOptions = { headerRow: true, bandedRows: false };
  t.borders.assign({ fill: P.rule, width: 0.7, style: 'solid' });
  for (let r = 0; r < rows; r++) {
    t.rows[r].height = heights[r];
    for (let c = 0; c < columns; c++) {
      const cell = t.getCell(r, c);
      cell.fill = r === 0 ? P.ink : P.paper;
      cell.text.style = { typeface: FONT, fontSize: size, color: r === 0 ? P.white : P.ink, bold: r === 0 };
    }
  }
  return t;
}
const fmt = (v, d = 2) => v.toFixed(d).replace('-', '−');
const range = (a, d = 2) => `${fmt(a[0], d)} to ${fmt(a[1], d)}`;
const ch = ref.results.chlor_a;
const st = ref.results.sst;
const urls = provenance.sources.map(s => `${s.title}: ${s.url}`).join('\n');
{
  const s = slide("The Ocean's Hidden Response", `Project source: PRODUCT.md and README.md. NASA Space Apps Challenge 2026, Yogyakarta. Challenge: Be An Earth System Trend Detective!\n${provenance.nasaResourceEvidence.challengeResources}`);
  text(s, 'Historical ocean change, with the uncertainty visible', 64, 174, 1100, 92, 39, { typeface: TITLE });
  text(s, 'How did surface chlorophyll-a change in two Pacific regions, and do their relative trends differ?', 64, 305, 1075, 115, 32);
  text(s, 'An English-language investigation tool for NASA Space Apps 2026, Yogyakarta', 64, 465, 1050, 64, 25, { color: P.secondary });
  text(s, 'Fixed reference: January 2013–December 2025\nLocal demonstration draft • AI assistance disclosed on slide 7', 64, 565, 1120, 64, 22, { color: P.secondary });
}
{
  const s = slide('Reference regions and source records', `Sources: data/observations.json regions; data/provenance.json.\n${urls}\nUpdated authenticated CDS probe: C3S authentication succeeded after local configuration. The January 2013 global file is 177,604,652 bytes, above the predefined 96 MiB feasibility cap. The interface offers no regional subsetting. The approved VIIRS fallback remains in use because of the whole-file transfer budget, not missing authentication. No products are spliced.`, 'The packaged historical record spans 2012–2025. The fixed analysis begins in 2013.');
  table(s, [['Reference area', 'Longitude', 'Latitude'], ['Eastern equatorial Pacific (EEP)', '120°W–90°W', '5°S–5°N'], ['Northwestern tropical Pacific (NWP)', '125°E–150°E', '2°N–10°N']], 199, [52, 66, 66], [620, 270, 262], 24);
  text(s, 'Chlorophyll-a', 64, 420, 310, 40, 28, { bold: true });
  text(s, 'NOAA Suomi-NPP VIIRS, monthly 0.0375° grid.\nC3S authentication succeeded. Its global-only file (177,604,652 bytes) exceeded the 96 MiB cap.\nApproved fallback. No product splicing.', 64, 467, 548, 180, 23);
  text(s, 'Sea surface temperature', 668, 420, 548, 40, 28, { bold: true });
  text(s, 'NASA JPL MUR fv04.1 via NOAA monthly composites.\nArea-weighted regional means use a 0.1° spatial sample. Six native-grid checks differed by ≤0.0133°C.', 668, 467, 548, 145, 24);
}
{
  const s = slide('The investigation flow', 'Source: PRODUCT.md; README.md; data/provenance.json; docs/statistics-report.md. Custom windows trigger full browser recomputation. At least 120 eligible and calendar months, 85% completeness, five observations per calendar month, maximum missing run six months, acceptable spatial coverage and full design rank are project inference rules.', 'Visitors work with real observations and a reproducible reference investigation.');
  const items = [
    ['01', 'Choose a variable and region', 'Monthly observations remain primary. Source gaps stay visible.'],
    ['02', 'Inspect the fixed reference', 'January 2013–December 2025. Each reference fit uses 154 of 156 months.'],
    ['03', 'Read the trend and its interval', 'Seasonal model with uncertainty that accounts for temporal dependence.'],
    ['04', 'Compare regions directly', 'Aligned log(EEP) minus log(NWP) tests relative chlorophyll trends.'],
    ['05', 'Explore a custom window', 'Exploratory label, full recalculation, and a reason when inference is unavailable.'],
  ];
  items.forEach((x, i) => {
    const y = 196 + i * 88;
    text(s, x[0], 64, y, 72, 42, 29, { color: P.secondary, typeface: TITLE });
    text(s, x[1], 157, y, 1030, 37, 27, { bold: true });
    text(s, x[2], 157, y + 39, 1030, 40, 23, { color: P.secondary });
  });
}
{
  const s = slide('Chlorophyll declined in both reference areas', `Sources: data/observations.json and data/reference-results.json. Plot: annual geometric means of available monthly regional geometric chlorophyll concentrations, for visual context only. Reference trend estimates fit individual eligible months, not annual aggregates. No missing value is imputed. ${provenance.sources[0].url}\nModel: log chlorophyll, linear calendar trend and eleven month indicators; calendar-spaced Bartlett HAC, n/(n−13), Student t. Automatic lag 4.`, 'Reference estimates use monthly log chlorophyll, seasonal adjustment and approximate HAC 95% intervals.');
  const years = Array.from({ length: 13 }, (_, i) => String(2013 + i));
  const annual = region => years.map(year => {
    const a = observations.records.filter(r => r.variable === 'chlor_a' && r.region === region && r.month.startsWith(year) && Number.isFinite(r.value));
    return Number(Math.exp(a.reduce((sum, r) => sum + Math.log(r.value), 0) / a.length).toFixed(6));
  });
  const chart = s.charts.add('line', {
    position: { left: 64, top: 193, width: 1152, height: 285 },
    categories: years,
    series: [
      { name: 'EEP', values: annual('eep'), line: { fill: P.eep, width: 3 }, marker: { symbol: 'circle', size: 5 } },
      { name: 'NWP', values: annual('nwp'), line: { fill: P.nwp, width: 3, style: 'dashed' }, marker: { symbol: 'square', size: 5 } },
    ],
    hasLegend: true,
    lineOptions: { smooth: false },
    legend: { position: 'right', textStyle: { typeface: FONT, fontSize: 20, fill: P.ink } },
    xAxis: { textStyle: { typeface: FONT, fontSize: 17, fill: P.ink }, line: { fill: P.rule, width: 1 } },
    yAxis: { title: 'Chlorophyll-a (mg/m³)', min: 0, max: 0.3, majorUnit: 0.1, numberFormatCode: '0.00', textStyle: { typeface: FONT, fontSize: 18, fill: P.ink }, majorGridlines: { fill: P.rule, width: 0.5 } },
    chartFill: P.white, plotAreaFill: P.white, chartLine: { fill: 'none', width: 0 },
  });
  applyPresentationChartFont(chart, { fontFamily: FONT });
  table(s, [['Region', 'Relative change / decade', '95% interval', 'p-value'], ['EEP', `${fmt(ch.eep.trendPerDecade)}%`, `${range(ch.eep.ci95)}%`, '0.00019'], ['NWP', `${fmt(ch.nwp.trendPerDecade)}%`, `${range(ch.nwp.ci95)}%`, '0.00053']], 495, [40, 43, 43], [210, 345, 360, 237], 22);
  text(s, 'Plot: annual geometric means of available months. Fits use 154/156 months. No imputation.', 64, 635, 1152, 28, 18, { color: P.secondary });
}
{
  const s = slide('The regional trend contrast is inconclusive', `Source: data/reference-results.json. Paired model: log(EEP) minus log(NWP), 154 aligned months, January 2013–December 2025. Direct comparison slope per year ${ch.comparison.slopePerYear}, CI ${JSON.stringify(ch.comparison.ci95)}, p ${ch.comparison.pValue}. CI is in log ratio per year; trendPerDecade is a different transformed unit and must not be paired with untransformed CI. SST source: ${provenance.sources[1].url}. Alternative HAC lags 6, 12, 24 do not change significance conclusions in these reference fits.`, 'A direct paired test compares relative chlorophyll trends. Separate p-values cannot answer this question.');
  text(s, `EEP − NWP log-trend difference: +${ch.comparison.slopePerYear.toFixed(5)} per year`, 64, 195, 1152, 50, 31, { bold: true });
  text(s, `95% interval ${range(ch.comparison.ci95, 5)} per year     p = 0.822`, 64, 255, 1152, 50, 28);
  text(s, 'The interval includes zero. This record does not resolve a regional difference.', 64, 320, 1152, 63, 29, { typeface: TITLE });
  table(s, [['SST context', 'Change / decade', '95% interval (°C)', 'p-value'], ['EEP', `${fmt(st.eep.trendPerDecade)}°C`, range(st.eep.ci95), '0.869'], ['NWP', `+${fmt(st.nwp.trendPerDecade)}°C`, range(st.nwp.ci95), '0.00039']], 409, [46, 52, 52], [260, 325, 330, 237], 24);
  text(s, 'All fits: 154/156 months. Lags 6, 12 and 24 preserve these significance conclusions.\nSST supplies context. These regional observations cannot establish a cause of chlorophyll change.', 64, 584, 1152, 71, 22, { color: P.secondary });
}
{
  const v = provenance.verification.results;
  const s = slide('Traceable NASA data and reproducibility', `Sources: data/provenance.json; README.md.\nNASA product DOI: ${provenance.sources[2].doi}\nChallenge: ${provenance.nasaResourceEvidence.challengeResources}\nGiovanni field: ${provenance.nasaResourceEvidence.field}\nGiovanni catalogue: ${provenance.nasaResourceEvidence.catalogue}\nNASA CMR granule: ${provenance.nasaResourceEvidence.granule}\nPublic mirror: ${provenance.nasaResourceEvidence.mirror}\nGranule SHA-256: ${provenance.verification.sha256}\nReference processed-data SHA-256: ${ref.inputSha256}\nThe granule filename and 58,198,505-byte size match CMR. One source month establishes provenance and actual NASA-data use, not trend agreement or a judging eligibility decision.`, 'The application displays a separate January 2013 NASA MODIS Aqua R2022 chlorophyll record.');
  table(s, [['NASA verification', 'Regional mean (mg/m³)', 'Valid ocean-area coverage'], ['EEP', v.eep.value.toFixed(5), `${(v.eep.coverage * 100).toFixed(2)}%`], ['NWP', v.nwp.value.toFixed(5), `${(v.nwp.coverage * 100).toFixed(2)}%`]], 195, [48, 51, 51], [345, 382, 425], 24);
  text(s, 'Challenge resource: Giovanni', 64, 378, 560, 45, 28, { bold: true });
  text(s, 'Its catalogue supports this exact MODIS field.\nThe downloaded public mirror granule matches NASA CMR identity and file size.', 64, 428, 550, 108, 24);
  text(s, 'Reproduction from packaged data', 668, 378, 548, 45, 28, { bold: true });
  text(s, 'python -m science.export --verify', 668, 433, 548, 45, 23, { typeface: 'Consolas' });
  text(s, 'Input SHA-256 check and five independent Python reference fits at 1e−8 tolerance. Browser/Python parity covers custom windows.', 668, 489, 548, 100, 23);
  text(s, 'One NASA month verifies source use and provenance only. It does not validate trend agreement.', 64, 610, 1152, 45, 23, { color: P.eep });
}
{
  const s = slide('Practical uses, limits and AI disclosure', 'Sources: PRODUCT.md; README.md; data/provenance.json limitations; docs/statistics-report.md. The tool is historical and descriptive, with no forecasting or causal claim. AI assistance includes code, data-processing scripts, statistical checks, interface construction, documentation and draft submission materials. Human participants retain responsibility for scientific claims, rights, final review, publication and submission. Local draft only; no participant names, photos, likenesses or voices.', 'A local, reproducible investigation for students, educators and scientific reviewers.');
  text(s, 'Use the evidence', 64, 202, 540, 45, 30, { bold: true });
  text(s, 'Teach how seasonality and uncertainty affect trend interpretation.\n\nInspect sources and reproduce calculations.\n\nExplore dates while preserving the fixed reference result.', 64, 261, 535, 275, 27);
  text(s, 'Interpret within limits', 668, 202, 548, 45, 30, { bold: true });
  text(s, 'Satellite chlorophyll estimates surface optical properties.\n\nThe frozen record and two rectangles do not support forecasting or causal attribution.\n\nExploratory windows can produce chance significance. Approximate intervals depend on model assumptions.', 668, 261, 548, 300, 26);
  text(s, 'AI assistance: Codex supported code, processing, statistical checks, interface and draft materials.\nHuman review governs the scientific claims and any publication or submission.', 64, 582, 1152, 74, 22, { color: P.secondary });
}

const candidatePath = path.join(BUILD, 'candidate.pptx');
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);
const validatedPath = path.join(BUILD, `validated-${Date.now()}.pptx`);
await fs.rm(path.join(ROOT, 'docs/deck-report.md'), { force: true });
const result = await finalizePresentation({
  workspaceDir: ROOT,
  candidatePath,
  finalPath: validatedPath,
  explicitTotalSlideCount: 7,
  requiredNativeTableOwnerSlides: [2, 4, 5, 6],
  requiredNativeChartOwnerSlides: [4],
  materializeLiteralChartWorkbooks: true,
  pythonExecutable: path.join(CACHE, 'python/python.exe'),
  integrityValidatorPath: path.join(SKILL, 'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath: path.join(SKILL, 'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs: ['--expected-slide-size-emu', '12192000,6858000', '--validate-heading-fit', ...[2, 4, 5, 6].flatMap(n => ['--require-native-table-slide', String(n)])],
  fontPolicy: { basis: 'design', families: [TITLE, FONT, 'Consolas'] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(ROOT, 'docs/deck-report.md'),
});
await fs.copyFile(validatedPath, path.join(OUT, 'demo.pptx'));
console.log(JSON.stringify({ finalPath: path.join(OUT, 'demo.pptx'), sha256: result.finalSha256, byteCount: result.byteCount, validation: 'passed' }));
const checked = await PresentationFile.importPptx(await FileBlob.load(path.join(OUT, 'demo.pptx')));
for (let i = 0; i < checked.slides.items.length; i++) {
  const blob = await checked.export({ slide: checked.slides.items[i], format: 'png', scale: 1.5 });
  await fs.writeFile(path.join(IMAGES, `slide-${String(i + 1).padStart(2, '0')}.png`), new Uint8Array(await blob.arrayBuffer()));
}
const python = path.join(CACHE, 'python/python.exe');
const pdfPreview = spawnSync(python, ['-c', `from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from pathlib import Path
from pypdf import PdfReader
out = Path(${JSON.stringify(OUT)})
c = canvas.Canvas(str(out / 'demo.pdf'), pagesize=(960,540))
c.setTitle("The Ocean's Hidden Response")
c.setSubject('Seven-slide raster preview; editable charts and tables are in demo.pptx')
for n in range(1,8):
    c.drawImage(ImageReader(str(out / 'slides' / f'slide-{n:02d}.png')),0,0,width=960,height=540)
    c.showPage()
c.save()
assert len(PdfReader(str(out / 'demo.pdf')).pages) == 7
print('PDF raster preview: seven pages verified')`], { encoding: 'utf8' });
if (pdfPreview.status !== 0) throw new Error(pdfPreview.stderr || 'PDF preview failed');
console.log(pdfPreview.stdout.trim());
const montage = spawnSync(python, [path.join(SKILL, 'container_tools/create_montage.py'), '--input_files', ...Array.from({ length: 7 }, (_, i) => path.join(IMAGES, `slide-${String(i + 1).padStart(2, '0')}.png`)), '--output_file', path.join(IMAGES, 'contact-sheet.png'), '--num_col', '2', '--cell_width', '640', '--cell_height', '360', '--label_mode', 'number'], { encoding: 'utf8' });
if (montage.status !== 0) throw new Error(montage.stderr || 'Contact sheet failed');
await fs.writeFile(path.join(ROOT, 'docs/deck-report.md'), `# Seven-slide demo verification\n\nGenerated using bundled Artifact Tool 2.8.59 with JavaScript ES modules. No dependency installation or source-data mutation.\n\nFinal PPTX SHA-256: \`${result.finalSha256}\`. Size: ${result.byteCount} bytes.\n\n## Outputs\n\n- \`artifacts/submission/demo.pptx\`: seven total slides, 16:9.\n- \`artifacts/submission/demo.pdf\`: seven-page raster preview assembled from final-PPTX renders. Edit charts and tables in the PPTX.\n- \`artifacts/submission/slides/slide-01.png\` through \`slide-07.png\`: final-PPTX renders at 1920 × 1080.\n- \`artifacts/submission/slides/contact-sheet.png\`: deck overview.\n- \`tools/make-deck.mjs\`: reproducible generator.\n\n## Evidence and editability\n\nSource content: PRODUCT.md, DESIGN.md, README.md, data/observations.json, data/provenance.json and data/reference-results.json. Four native tables appear on slides 2, 4, 5 and 6. Slide 4 has a native line chart with two series and an embedded workbook. The chart shows annual geometric means of available monthly values, rounded to six decimals for portable workbook precision. Reference estimates use the original monthly model. The 2023 and 2025 annual means each use 11 months, with no imputation.\n\nThe fixed January 2013–December 2025 fits each use 154/156 months. Chlorophyll EEP −16.31%/decade (95% interval −23.66 to −8.25%), NWP −17.76%/decade (−26.26 to −8.29%). Direct aligned log-trend difference +0.00175/year (−0.01362 to +0.01712/year), p=0.822, correctly inconclusive. SST EEP −0.07°C/decade (−0.92 to +0.78), NWP +0.41°C/decade (+0.19 to +0.64). All values match the frozen reference within displayed rounding.\n\nNASA MODIS Aqua January 2013 values match provenance: EEP 0.17995 mg/m³, NWP 0.06966 mg/m³. Giovanni catalogue, NASA CMR, granule mirror, DOI and checksums appear in speaker notes. Visible caveat states that one month verifies provenance and actual NASA data use only, not trend agreement. Honest VIIRS fallback, exploratory-window warning, approximate inference, no causal interpretation and AI disclosure remain visible. No participant identities, photos or voices, deployed URL, submission claim or award appears.\n\n## Automated checks\n\nPackage integrity, declared seven-slide count, intended slide dimensions, heading fit, selected fonts, required native-table presence, chart cache/workbook consistency and first-party PPTX reimport passed with no geometry warnings. Native table arithmetic checks correctly skipped non-total tables. PDF page count is seven.\n\n## Visual review and limits\n\nFinal-PPTX renders require individual visual inspection before delivery. No native PowerPoint/LibreOffice application test has been performed. The existing runtime supplies no LibreOffice version and direct Artifact Tool PDF export is unsupported, so the PDF is explicitly a raster preview.\n\n## Detailed finalizer receipt\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n`);
