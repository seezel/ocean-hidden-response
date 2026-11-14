const SVG = 'http://www.w3.org/2000/svg';
export const REGION_STYLE = {
  eep: { color: '#963e30', dash: '', trendDash: '4 4', short: 'EEP' },
  nwp: { color: '#1a6266', dash: '12 5', trendDash: '10 3 2 3', short: 'NWP' },
};
export const monthIndex = value => Number(value.slice(0, 4)) * 12 + Number(value.slice(5, 7)) - 1;
export const monthKey = index => `${String(Math.floor(index / 12)).padStart(4, '0')}-${String(index % 12 + 1).padStart(2, '0')}`;
export function monthLabel(value) {
  return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(value.slice(5,7))-1]} ${value.slice(0,4)}`;
}

export function monthlySegments(rows) {
  const segments = [];
  let current = [], previous = null;
  for (const row of rows) {
    const index = monthIndex(row.month);
    if (!Number.isFinite(row.value) || (previous !== null && index !== previous + 1)) {
      if (current.length) segments.push(current);
      current = [];
    }
    if (Number.isFinite(row.value)) current.push(row);
    previous = index;
  }
  if (current.length) segments.push(current);
  return segments;
}

export function adjustedTrend(result, variable) {
  if (!result?.eligible || !result.fitted?.length) return [];
  const origin = monthIndex(result.start);
  const byMonth = Array.from({length:12}, () => []);
  for (const row of result.fitted) {
    const time = (monthIndex(row.month) - origin) / 12;
    const response = variable === 'chlor_a' ? Math.log(row.value) : row.value;
    byMonth[monthIndex(row.month) % 12].push(response - result.slopePerYear * time);
  }
  const effects = byMonth.filter(values => values.length).map(values => values.reduce((a,b)=>a+b,0)/values.length);
  const anchor = effects.reduce((a,b)=>a+b,0) / effects.length;
  return result.fitted.map(row => {
    const value = anchor + result.slopePerYear * (monthIndex(row.month) - origin) / 12;
    return { month: row.month, value: variable === 'chlor_a' ? Math.exp(value) : value };
  });
}

export function regionBounds(region) {
  const b = region?.bounds;
  const values = Array.isArray(b) ? b : b && [b.west, b.east, b.south, b.north];
  return values?.length === 4 && values.every(Number.isFinite) ? values : null;
}

function node(name, attributes = {}, text) {
  const element = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  if (text !== undefined) element.textContent = text;
  return element;
}

export function renderLegend(container, series) {
  container.replaceChildren();
  for (const item of series) {
    const style = REGION_STYLE[item.region];
    const span = document.createElement('span');
    span.className = 'legend-item';
    const sample = node('svg', { viewBox: '0 0 32 16', 'aria-hidden': 'true' });
    sample.append(node('line', {x1:0,x2:32,y1:8,y2:8,stroke:style.color,'stroke-width':2,'stroke-dasharray':style.dash}));
    const label = document.createElement('span');
    label.textContent = `${style.short} · ${item.name}`;
    span.append(sample,label);
    container.append(span);
  }
}

export function renderChart(container, { series, variable, start, end, description }) {
  const width = Math.max(280, Math.round(container.getBoundingClientRect().width || 900));
  const narrow = width < 550;
  const height = narrow ? 310 : 360;
  const margin = {left:55,right:18,top:30,bottom:48};
  const plotWidth = width-margin.left-margin.right, plotHeight=height-margin.top-margin.bottom;
  const origin=monthIndex(start), span=monthIndex(end)-origin;
  const x = month => margin.left+(span ? (monthIndex(month)-origin)/span : .5)*plotWidth;
  const plotted = series.map(item=>({...item, trend:adjustedTrend(item.result,variable)}));
  const values = plotted.flatMap(item=>[...item.records,...item.trend].map(row=>row.value)).filter(Number.isFinite);
  const svg=node('svg',{viewBox:`0 0 ${width} ${height}`,role:'img','aria-labelledby':'observation-chart-title observation-chart-description'});
  svg.append(node('title',{id:'observation-chart-title'},`${variable==='chlor_a'?'Surface chlorophyll-a':'Sea surface temperature'}, ${monthLabel(start)} to ${monthLabel(end)}`),
    node('desc',{id:'observation-chart-description'},description));
  const unit=variable==='chlor_a'?'Chlorophyll-a (mg/m³)':'Temperature (°C)';
  svg.append(node('text',{x:margin.left,y:16,class:'axis-label'},unit));
  if (!values.length) {
    svg.append(node('text',{x:width/2,y:height/2,'text-anchor':'middle'},'No observed values in this window.'));
    container.replaceChildren(svg);
    return;
  }
  let low=Math.min(...values), high=Math.max(...values);
  const padding=(high-low)*.08 || Math.max(Math.abs(high)*.04,.01);
  low=variable==='chlor_a'?Math.max(0,low-padding):low-padding;
  high+=padding;
  const y=value=>margin.top+(high-value)/(high-low)*plotHeight;
  for(let i=0;i<=4;i++) {
    const value=low+(high-low)*i/4, position=y(value);
    svg.append(node('line',{x1:margin.left,x2:width-margin.right,y1:position,y2:position,class:'grid-line'}),
      node('text',{x:margin.left-9,y:position+4,'text-anchor':'end'},Number(value.toPrecision(3)).toLocaleString('en-US',{maximumFractionDigits:3})));
  }
  svg.append(node('line',{x1:margin.left,x2:width-margin.right,y1:height-margin.bottom,y2:height-margin.bottom,class:'axis-line'}));
  const tickCount=span===0?1:Math.min(span+1,narrow?3:7);
  const ticks=[...new Set(Array.from({length:tickCount},(_,i)=>origin+(tickCount===1?0:Math.round(span*i/(tickCount-1)))))];
  ticks.forEach((index,i)=>{
    const position=x(monthKey(index));
    svg.append(node('line',{x1:position,x2:position,y1:height-margin.bottom,y2:height-margin.bottom+5,class:'axis-line'}),
      node('text',{x:position,y:height-margin.bottom+24,'text-anchor':i===0?'start':i===ticks.length-1?'end':'middle'},monthLabel(monthKey(index))));
  });
  for (const item of plotted) {
    const style=REGION_STYLE[item.region];
    for(const segment of monthlySegments(item.records)) {
      if(segment.length===1) svg.append(node('circle',{cx:x(segment[0].month),cy:y(segment[0].value),r:2.5,fill:style.color}));
      else svg.append(node('path',{d:segment.map((row,i)=>`${i?'L':'M'}${x(row.month).toFixed(2)},${y(row.value).toFixed(2)}`).join(' '),fill:'none',stroke:style.color,'stroke-width':1.5,'stroke-dasharray':style.dash,opacity:.8}));
    }
    if(item.trend.length) svg.append(node('path',{d:item.trend.map((row,i)=>`${i?'L':'M'}${x(row.month).toFixed(2)},${y(row.value).toFixed(2)}`).join(' '),fill:'none',stroke:style.color,'stroke-width':3,'stroke-dasharray':style.trendDash}));
  }
  container.replaceChildren(svg);
}

export function renderLocator(container, regions) {
  const width=Math.max(280,Math.round(container.getBoundingClientRect().width||440)),height=205,m={left:35,right:16,top:25,bottom:30};
  const x=lon=>m.left+((lon<0?lon+360:lon)-100)/200*(width-m.left-m.right);
  const y=lat=>m.top+(35-lat)/60*(height-m.top-m.bottom);
  const svg=node('svg',{viewBox:`0 0 ${width} ${height}`,role:'img','aria-labelledby':'locator-svg-title locator-svg-description'});
  svg.append(node('title',{id:'locator-svg-title'},'Pacific analysis regions, schematic locator'),
    node('desc',{id:'locator-svg-description'},'Longitude and latitude reference with the two regional analysis boxes. No coastlines are depicted. Exact bounds follow below.'));
  for(const lon of [120,180,240,300]) {
    svg.append(node('line',{x1:x(lon),x2:x(lon),y1:y(35),y2:y(-25),stroke:'#c7cbc7','stroke-width':1}),
      node('text',{x:x(lon),y:height-8,'text-anchor':lon===300?'end':'middle'},lon===180?'180°':lon>180?`${360-lon}°W`:`${lon}°E`));
  }
  for(const lat of [-20,0,20]) {
    svg.append(node('line',{x1:x(100),x2:x(300),y1:y(lat),y2:y(lat),stroke:lat===0?'#747d79':'#c7cbc7','stroke-width':1}),
      node('text',{x:m.left-7,y:y(lat)+4,'text-anchor':'end'},lat===0?'0°':`${Math.abs(lat)}°${lat>0?'N':'S'}`));
  }
  svg.append(node('text',{x:width/2+20,y:23,'text-anchor':'middle'},'Pacific Ocean · schematic'));
  for(const key of ['eep','nwp']) {
    const bounds=regionBounds(regions[key]);
    if(!bounds) continue;
    const [west,east,south,north]=bounds,style=REGION_STYLE[key];
    svg.append(node('rect',{x:x(west),y:y(north),width:x(east)-x(west),height:y(south)-y(north),fill:'none',stroke:style.color,'stroke-width':2,'stroke-dasharray':style.dash}),
      node('text',{x:(x(west)+x(east))/2,y:y(north)-8,'text-anchor':'middle',style:`fill:${style.color};font-weight:600`},style.short));
  }
  container.replaceChildren(svg);
}
