import { loadData, selectRecords } from './data.js';
import { fitTrend, compareTrends, MODEL_VERSION } from './trends.js';
import { createState, reduceState, visibleRegions, validateWindow } from './ui-state.js';
import { renderChart, renderLegend, renderLocator, regionBounds, monthLabel, monthIndex, monthKey } from './charts.js';

const $ = id => document.getElementById(id);
const names = { eep: 'Eastern Equatorial Pacific', nwp: 'Northwest Pacific' };
let packageData = null, state = null, chartModel = null, request = null;
let observationTableDirty = true;

function el(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined && text !== null) element.textContent = text;
  if (className) element.className = className;
  return element;
}
const number = (value, digits=2) => Number.isFinite(value) ? value.toLocaleString('en-US', {minimumFractionDigits:digits,maximumFractionDigits:digits}) : 'Unavailable';
const signed = (value,digits=2) => Number.isFinite(value) ? `${value>0?'+':''}${number(value,digits)}` : 'Unavailable';
const pValue = value => Number.isFinite(value) ? value<.001 ? '< 0.001' : number(value,3) : 'Unavailable';
const textValue = value => value == null ? 'Not recorded' : Array.isArray(value) ? value.map(textValue).join('; ') : typeof value==='object' ? JSON.stringify(value) : String(value);
const regionName = key => packageData?.observations.regions?.[key]?.name || names[key];
const concentrationUnit = variable => variable==='chlor_a' ? 'mg/m³' : '°C';
const trendUnit = variable => variable==='chlor_a' ? '%' : '°C';
const lagSensitive = result => Boolean(result?.diagnostics?.significanceChangesWithLag || result?.diagnostics?.lagSensitivityConclusionChanges);

function link(url, label) {
  try {
    const target = new URL(url);
    if (!['https:','http:'].includes(target.protocol)) return el('span', label);
    const anchor = el('a', label);
    anchor.href = target.href;
    return anchor;
  } catch { return el('span', label); }
}

function selectedRecords(region, variable=state.variable) {
  return selectRecords(packageData.observations,{variable,region,start:state.start,end:state.end});
}

function calculate() {
  if (state.phase!=='ready') return;
  const error=validateWindow(state,state.availability[state.variable]);
  if(error) { state={...state,error,phase:'invalid',results:null}; return; }
  if(state.mode==='reference') {
    const frozen=packageData.reference;
    if(frozen.modelVersion!==MODEL_VERSION) {
      state={...state,phase:'invalid',results:null,error:'The reference model version does not match this application. Reload a matching data package.'};
      return;
    }
    const results=frozen.results?.[state.variable];
    if(!results?.eep || !results?.nwp || (state.variable==='chlor_a'&&!results.comparison)) {
      state={...state,phase:'invalid',results:null,error:'The reference results are incomplete. Reload a complete data package.'};
      return;
    }
    state={...state,results};
    return;
  }
  const options={start:state.start,end:state.end};
  const eep=selectedRecords('eep'),nwp=selectedRecords('nwp');
  state={...state,results:{eep:fitTrend(eep,state.variable,options),nwp:fitTrend(nwp,state.variable,options),
    comparison:state.variable==='chlor_a'?compareTrends(eep,nwp,options):null}};
}

function dispatch(action) {
  if(!state) return;
  state=reduceState(state,action);
  calculate();
  render();
}

function render() {
  const {variable,region,start,end,phase}=state;
  $('variable').value=variable;
  $('region').value=region;
  $('start').value=start;
  $('end').value=end;
  const bounds=state.availability[variable];
  for(const id of ['start','end']) {
    $(id).min=bounds?.min || '';
    $(id).max=bounds?.max || '';
    $(id).setAttribute('aria-invalid',String(phase==='invalid'));
  }
  $('date-help').textContent=bounds ? `Available: ${monthLabel(bounds.min)} to ${monthLabel(bounds.max)} · Dates are inclusive.` : 'No observations are available for this measure.';
  $('investigation-mode').textContent=state.mode==='reference'?'Reference investigation':'Exploratory date window';
  $('investigation-mode').classList.toggle('exploratory',state.mode!=='reference');
  $('form-message').textContent=state.error || (phase==='pending'?'Dates changed. Apply dates to update the investigation.':'');
  $('chart-title').textContent=variable==='chlor_a'?'Surface chlorophyll-a':'Sea surface temperature';
  $('chart-period').textContent=start&&end?`${monthLabel(start)} to ${monthLabel(end)}`:'';
  $('trend-rows').replaceChildren();
  $('trend-notes').replaceChildren();
  $('comparison-content').replaceChildren();
  $('comparison').hidden=variable!=='chlor_a';
  observationTableDirty=true;
  $('observation-rows').replaceChildren();
  if(phase!=='ready') {
    chartModel=null;
    const message=phase==='pending'?'Apply dates to draw this window. Previous statistics have been cleared.':state.error;
    $('chart').replaceChildren(el('p',message,'notice'));
    $('chart-legend').replaceChildren();
    $('chart-summary').textContent='No chart or inference is shown for an unapplied or invalid date window.';
    $('results-context').textContent='Estimates are unavailable until a valid window is applied.';
    $('comparison-content').append(el('p','The regional comparison is unavailable until a valid window is applied.'));
    $('observations-caption').textContent='Apply a valid window to view observations.';
    $('quality-record').replaceChildren(el('p','Apply a valid date window to inspect its coverage.'));
    return;
  }
  const series=visibleRegions(region).map(key=>({region:key,name:regionName(key),records:selectedRecords(key),result:state.results?.[key]}));
  const summary=series.map(item=>{
    const valid=item.records.filter(row=>Number.isFinite(row.value));
    return valid.length ? `${item.region.toUpperCase()}: ${valid.length} observed months, ${number(Math.min(...valid.map(row=>row.value)),3)} to ${number(Math.max(...valid.map(row=>row.value)),3)} ${concentrationUnit(variable)}.` : `${item.region.toUpperCase()}: no observed values in this window.`;
  }).join(' ');
  chartModel={series,variable,start,end,description:`${summary} Monthly lines break at missing observations. Thick short-dashed lines show seasonally adjusted trends where eligible. The expandable observation table gives all numerical values.`};
  renderLegend($('chart-legend'),series);
  renderChart($('chart'),chartModel);
  $('chart-summary').textContent=summary;
  $('results-context').textContent=`${state.mode==='reference'?'Frozen reference calculation':'Exploratory recalculation'} · ${monthLabel(start)} to ${monthLabel(end)}. Intervals describe approximate model uncertainty.`;
  renderTrends(series);
  renderComparison();
  renderQuality(series);
  if($('observation-details').open) renderObservationTable();
}

function renderTrends(series) {
  for(const item of series) {
    const result=item.result;
    const row=el('tr');
    const heading=el('th');
    heading.scope='row';
    const mark=el('span',null,`region-mark ${item.region}`);
    mark.setAttribute('aria-hidden','true');
    heading.append(mark,document.createTextNode(`${item.region.toUpperCase()} · ${item.name}`));
    row.append(heading);
    if(result?.eligible) {
      row.append(el('td',`${signed(result.trendPerDecade)} ${trendUnit(state.variable)}`),
        el('td',`${signed(result.ci95[0])} to ${signed(result.ci95[1])} ${trendUnit(state.variable)}`),
        el('td',String(result.n)),el('td',pValue(result.pValue)));
      const direction=result.trendPerDecade>0?'increase':result.trendPerDecade<0?'decrease':'no change';
      const crossesZero=result.ci95[0]<=0 && result.ci95[1]>=0;
      $('trend-notes').append(el('p',`${item.region.toUpperCase()}: estimated ${direction}. ${crossesZero?'The interval includes zero; evidence for a directional trend is inconclusive under this model.':'The approximate interval excludes zero under the selected model.'}${lagSensitive(result)?' The significance conclusion changes with the HAC lag choice (6, 12 or 24 months); treat this evidence as sensitive to uncertainty assumptions.':''}`));
      if(state.variable==='chlor_a') {
        const baselineEnd=monthKey(Math.min(monthIndex(state.start)+11,monthIndex(state.end)));
        $('trend-notes').append(el('p',`${item.region.toUpperCase()} concentration context: baseline ${number(result.baseline,3)} mg/m³ (geometric mean of valid months, ${monthLabel(state.start)} to ${monthLabel(baselineEnd)}). Applying the relative rate to this baseline gives ${signed(result.absoluteChangePerDecade,3)} mg/m³ per decade. This baseline-anchored change depends on the baseline concentration.`));
      }
    } else {
      const cell=el('td',`Inference unavailable: ${result?.reason || 'No eligible result for this window.'}`);
      cell.colSpan=2;
      row.append(cell,el('td',String(result?.n??0)),el('td','Unavailable'));
    }
    $('trend-rows').append(row);
  }
}

function renderComparison() {
  if(state.variable!=='chlor_a') return;
  const target=$('comparison-content'),result=state.results?.comparison;
  target.append(el('p','Direct EEP versus NWP comparison on months valid in both regions. This always compares the two fixed regions, even when the chart displays one.'));
  if(!result?.eligible) {
    target.append(el('p',`Inference unavailable: ${result?.reason || 'No eligible comparison for this window.'}`));
    return;
  }
  const inconclusive=result.ci95[0]<=0 && result.ci95[1]>=0;
  const relativeCI=result.ci95.map(value=>100*Math.expm1(10*value));
  target.append(el('p',`${signed(result.trendPerDecade)}% relative growth-rate ratio per decade (EEP / NWP).`,'estimate'),
    el('p',`95% interval: ${signed(relativeCI[0])}% to ${signed(relativeCI[1])}% on the same per-decade relative scale. ${result.n} paired valid months; p ${result.pValue<.001?'< 0.001':`= ${pValue(result.pValue)}`}.`),
    el('p',inconclusive?'The interval includes zero: the evidence for a regional difference is inconclusive under this model.':`The EEP relative chlorophyll trend is ${result.slopePerYear>0?'higher':'lower'} than NWP under this model; the approximate interval excludes zero.`),
    el('p',`The test estimates EEP minus NWP log-chlorophyll slope: ${signed(result.slopePerYear,5)} log-ratio per year, 95% interval ${signed(result.ci95[0],5)} to ${signed(result.ci95[1],5)} log-ratio per year. This is a relative difference, not a difference in absolute mg/m³ slopes.`));
  if(lagSensitive(result)) target.append(el('p','The regional significance conclusion changes with the HAC lag choice (6, 12 or 24 months). This comparison is sensitive to uncertainty assumptions.'));
}

function renderObservationTable() {
  if(!observationTableDirty || state?.phase!=='ready') return;
  const body=document.createDocumentFragment();
  const regions=visibleRegions(state.region),lookup=new Map();
  for(const region of regions) for(const row of selectedRecords(region)) lookup.set(`${region}/${row.month}`,row);
  for(let index=monthIndex(state.start);index<=monthIndex(state.end);index++) {
    const month=monthKey(index);
    for(const region of regions) {
      const record=lookup.get(`${region}/${month}`),hasValue=Number.isFinite(record?.value);
      const row=el('tr'),heading=el('th',monthLabel(month));
      heading.scope='row';
      row.append(heading,el('td',region.toUpperCase()),el('td',hasValue?number(record.value,4):'Missing'),
        el('td',concentrationUnit(state.variable)),el('td',record?`${number(record.coverage*100,1)}%`:'Unavailable'),
        el('td',hasValue&&record.coverage>=.1?'Included':hasValue?'Excluded: coverage < 10%':'Excluded: missing'));
      body.append(row);
    }
  }
  $('observations-caption').textContent=`${state.variable==='chlor_a'?'Chlorophyll-a':'Sea surface temperature'} · ${monthLabel(state.start)} to ${monthLabel(state.end)}`;
  $('observation-rows').replaceChildren(body);
  observationTableDirty=false;
}

function renderQuality(series) {
  const target=$('quality-record');
  target.replaceChildren(el('p','Observed regional means retain source missingness. No observations are imputed. Months below 10% valid ocean-grid coverage are excluded from inference; they remain visible if an observed mean is supplied.'));
  const span=monthIndex(state.end)-monthIndex(state.start)+1;
  for(const item of series) {
    const values=item.records.filter(row=>Number.isFinite(row.value));
    const eligible=values.filter(row=>row.coverage>=.1);
    target.append(el('p',`${item.region.toUpperCase()}: ${values.length} observed of ${span} requested calendar months; ${eligible.length} months meet the inference coverage threshold. ${values.length?`Observed-month coverage ranges from ${number(Math.min(...values.map(row=>row.coverage))*100,1)}% to ${number(Math.max(...values.map(row=>row.coverage))*100,1)}%.`:'No observed-month coverage range is available.'}`));
  }
  target.append(el('p','Cloud, ice, retrieval quality and unequal sampling can affect the regional means and their trends. The product-specific processing and limitations are recorded in the source section.'));
}

function renderMetadata() {
  const {observations,provenance,reference}=packageData;
  for(const key of ['eep','nwp']) $('region').querySelector(`option[value="${key}"]`).textContent=`${regionName(key)} (${key.toUpperCase()})`;
  renderLocator($('locator-chart'),observations.regions||{});
  $('region-bounds').replaceChildren();
  const longitude=value=>`${Math.abs(value)}°${value<0?'W':'E'}`;
  const latitude=value=>value===0?'0°':`${Math.abs(value)}°${value<0?'S':'N'}`;
  for(const key of ['eep','nwp']) {
    const bounds=regionBounds(observations.regions?.[key]);
    $('region-bounds').append(el('p',bounds?`${key.toUpperCase()} · ${regionName(key)}: ${longitude(bounds[0])} to ${longitude(bounds[1])}; ${latitude(bounds[2])} to ${latitude(bounds[3])}.`:`${key.toUpperCase()}: bounds are unavailable in this data package.`));
  }
  $('model-record').textContent=`Model: ${MODEL_VERSION}. Reference window: ${reference.interval.start} to ${reference.interval.end}. The reference results are frozen in the downloadable data package. Custom windows use the same model in this browser.`;
  const target=$('source-record');
  target.replaceChildren(el('p','This is an archived data snapshot, not a real-time ocean feed. Provider refresh schedules do not update this page automatically. Downloaded product versions and processing determine the observations shown.'));
  if(provenance.generatedAt) target.append(el('p',`Package generated: ${textValue(provenance.generatedAt)}.`));
  for(const variable of ['chlor_a','sst']) {
    const meta=observations.variables?.[variable];
    const months=observations.records.filter(row=>row.variable===variable&&Number.isFinite(row.value)).map(row=>row.month).sort();
    target.append(el('p',`${meta?.label || (variable==='chlor_a'?'Chlorophyll-a':'Sea surface temperature')}: ${months.length?`${monthLabel(months[0])} to ${monthLabel(months.at(-1))}`:'no observed months'}. Source identifier: ${textValue(meta?.source)}.`));
  }
  if(!Array.isArray(provenance.sources)||!provenance.sources.length) target.append(el('p','Product provenance is unavailable in this package.'));
  for(const source of provenance.sources||[]) {
    const section=el('section',null,'source-entry');
    section.append(el('h4',source.title||source.id||'Source product'));
    const metadata=el('dl');
    for(const [label,value] of [['Producer',source.producer],['Version',source.version],['Coverage',source.temporalCoverage],['Licence',source.licence]]) metadata.append(el('dt',label),el('dd',textValue(value)));
    section.append(metadata);
    if(source.url) { const p=el('p');p.append(link(source.url,'Read the product source'));section.append(p); }
    if(source.doi) { const p=el('p');p.append(link(String(source.doi).startsWith('http')?source.doi:`https://doi.org/${source.doi}`,`DOI: ${textValue(source.doi)}`));section.append(p); }
    if(source.processing) section.append(el('p',`Processing: ${textValue(source.processing)}`));
    if(source.limitations) section.append(el('p',`Limitations: ${textValue(source.limitations)}`));
    target.append(section);
  }
  if(provenance.limitations?.length) {
    target.append(el('h4','Package limitations'));
    const list=el('ul');
    for(const limitation of provenance.limitations) list.append(el('li',textValue(limitation)));
    target.append(list);
  }
  if(reference.inputSha256) target.append(el('p',`Recorded reference input SHA-256: ${reference.inputSha256}.`));
  renderVerification(provenance.verification);
}

function renderVerification(verification) {
  const target=$('verification-record');
  target.replaceChildren();
  const complete=verification && !['blocked','unavailable','failed','pending'].includes(verification.status) &&
    ['eep','nwp'].every(key=>Number.isFinite(verification.results?.[key]?.value));
  target.append(el('p',`Status: ${verification?.status || 'unavailable'}.`));
  if(verification?.source) {
    const source=typeof verification.source==='string'
      ? packageData.provenance.sources?.find(item=>item.id===verification.source)||verification.source
      : verification.source;
    const p=el('p');
    p.append(document.createTextNode('Verification source: '));
    p.append(typeof source==='object'&&source.url?link(source.url,source.title||source.id||source.url):el('span',textValue(source)));
    target.append(p);
    if(typeof source==='object'&&source.version) target.append(el('p',`Product version: ${textValue(source.version)}.`));
  }
  if(verification?.month) target.append(el('p',`Verification month: ${textValue(verification.month)}.`));
  if(verification?.granuleProcessingVersion) target.append(el('p',`Granule processing version: ${textValue(verification.granuleProcessingVersion)}.`));
  if(complete) for(const key of ['eep','nwp']) {
    const record=verification.results[key];
    target.append(el('p',`${key.toUpperCase()}: ${number(record.value,4)} mg/m³${Number.isFinite(record.coverage)?`; coverage ${number(record.coverage*100,1)}%`:''}.`));
  }
  else target.append(el('p','Two verified regional averages are not available in this package. No independent numerical agreement is claimed.'));
  if(verification?.note) target.append(el('p',textValue(verification.note)));
  target.append(el('p','A single monthly MODIS comparison can check an aggregation example. It cannot verify agreement in long-term trends or establish NASA challenge-resource compliance by itself.'));
}

async function start() {
  request?.abort();
  request=new AbortController();
  const activeRequest=request;
  $('control-fields').disabled=true;
  $('load-state').hidden=false;
  $('load-state').querySelector('p').textContent='Loading the archived observations and source record…';
  $('retry').hidden=true;
  $('investigation-body').hidden=true;
  chartModel=null;
  try {
    const loaded=await loadData('./data/',activeRequest.signal);
    if(activeRequest!==request) return;
    if(loaded.reference?.schemaVersion!==1 || !loaded.reference.interval || loaded.provenance?.schemaVersion!==1) throw new Error('The reference or provenance file has an unsupported format.');
    packageData=loaded;
    const availability={};
    for(const variable of ['chlor_a','sst']) {
      const months=loaded.observations.records.filter(row=>row.variable===variable).map(row=>row.month).sort();
      if(months.length) availability[variable]={min:months[0],max:months.at(-1)};
    }
    state=createState(loaded.reference.interval,availability);
    renderMetadata();
    $('control-fields').disabled=false;
    $('load-state').hidden=true;
    $('investigation-body').hidden=false;
    calculate();
    render();
    if(!loaded.observations.records.length) {
      $('load-state').hidden=false;
      $('load-state').querySelector('p').textContent='The package contains no observations. Source information remains available below. Retry after replacing the data package.';
      $('retry').hidden=false;
    }
  } catch(error) {
    if(error.name==='AbortError'||activeRequest!==request) return;
    packageData=null; state=null; chartModel=null;
    $('load-state').querySelector('p').textContent=`The observation archive could not be loaded. ${error.message} Check that the complete data package is served with this page, then retry.`;
    $('retry').hidden=false;
    $('investigation-mode').textContent='Records unavailable';
    $('date-help').textContent='Date controls will be available after the archive loads.';
    $('source-record').replaceChildren(el('p','Source metadata could not be loaded. Retry the archive request above.'));
    $('verification-record').replaceChildren(el('p','Verification status is unavailable because the archive could not be loaded.'));
  }
}

$('controls').addEventListener('submit',event=>{event.preventDefault();dispatch({type:'apply'});});
$('variable').addEventListener('change',event=>dispatch({type:'variable',value:event.target.value}));
$('region').addEventListener('change',event=>dispatch({type:'region',value:event.target.value}));
for(const id of ['start','end']) $(id).addEventListener('input',()=>dispatch({type:'dates',start:$('start').value,end:$('end').value}));
$('restore').addEventListener('click',()=>dispatch({type:'reset'}));
$('retry').addEventListener('click',start);
$('observation-details').addEventListener('toggle',()=>{if($('observation-details').open) renderObservationTable();});
let lastChartWidth=0;
if(typeof ResizeObserver!=='undefined') new ResizeObserver(entries=>{
  const width=Math.round(entries[0].contentRect.width);
  if(width!==lastChartWidth && chartModel) {
    lastChartWidth=width;
    renderChart($('chart'),chartModel);
    renderLocator($('locator-chart'),packageData.observations.regions||{});
  }
}).observe($('chart'));
start();
