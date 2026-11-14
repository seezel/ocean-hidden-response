export const MODEL_VERSION = 'seasonal-ols-calendar-hac-bartlett-nk-t-v1.0.0';
const K = 13;
const POLICY = Object.freeze({minimumCalendarMonths:120, minimumValidMonths:120,
  minimumCompleteness:.85, minimumPerCalendarMonth:5, maximumMissingRun:6,
  minimumCoverage:.1, label:'Conservative project policy; not universal statistical guarantees'});
const sum = values => values.reduce((a,b) => a+b, 0);
const dot = (a,b) => sum(a.map((v,i) => v*b[i]));
const mean = values => sum(values)/values.length;
const zeros = n => Array(n).fill(0);

function parseMonth(value) {
  if (typeof value !== 'string' || !/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(value)) throw Error('Malformed month; expected YYYY-MM');
  const [year,month] = value.split('-').map(Number);
  if (year < 1) throw Error('Year must be in 0001..9999');
  return year*12+month-1;
}
const label = month => `${String(Math.floor(month/12)).padStart(4,'0')}-${String(month%12+1).padStart(2,'0')}`;

function parseRecords(records) {
  if (!Array.isArray(records)) throw Error('Records must be an array');
  const result = new Map();
  for (const row of records) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw Error('Each record must be an object');
    const month = parseMonth(row.month);
    if (result.has(month)) throw Error('Duplicate month');
    const {value,coverage} = row;
    if (value !== null && (typeof value !== 'number' || !Number.isFinite(value))) throw Error('Values must be finite numbers or null');
    if (typeof coverage !== 'number' || !Number.isFinite(coverage) || coverage < 0 || coverage > 1) throw Error('Coverage must be a finite fraction in [0, 1]');
    result.set(month, {value,coverage});
  }
  return result;
}

function blank(variable, comparison=false) {
  return {eligible:false, reason:null, n:0, start:null, end:null,
    slopePerYear:null, trendPerDecade:null, ci95:null, pValue:null, df:null,
    lag:null, baseline:null, absoluteChangePerDecade:null, fitted:[], diagnostics:{policy:{...POLICY}},
    modelVersion:MODEL_VERSION,
    estimand:comparison ? 'EEP minus NWP log-chlorophyll trend (relative growth-rate ratio)' : variable === 'chlor_a' ? 'Seasonally adjusted log-chlorophyll trend' : 'Seasonally adjusted SST trend',
    unit:comparison ? 'log ratio per year' : variable === 'chlor_a' ? 'percent per decade' : 'degrees Celsius per decade',
    slopeUnit:comparison ? 'log ratio per year' : variable === 'chlor_a' ? 'log(mg/m3) per year' : 'degrees Celsius per year',
    trendPerDecadeUnit:comparison ? 'percent relative growth-rate ratio per decade' : variable === 'chlor_a' ? 'percent per decade' : 'degrees Celsius per decade',
    ci95Unit:comparison ? 'log ratio per year' : variable === 'chlor_a' ? 'percent per decade' : 'degrees Celsius per decade'};
}

// Lanczos log-gamma and a continued fraction for regularized incomplete beta.
// Student-t tails use the beta tail directly to avoid cancellation near p=0.
function logGamma(z) {
  const coefficients = [676.5203681218851,-1259.1392167224028,771.32342877765313,
    -176.61502916214059,12.507343278686905,-.13857109526572012,
    9.9843695780195716e-6,1.5056327351493116e-7];
  if (z < .5) return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-logGamma(1-z);
  z -= 1;
  let x = .99999999999980993;
  coefficients.forEach((c,i) => { x += c/(z+i+1); });
  const t = z+7.5;
  return .5*Math.log(2*Math.PI)+(z+.5)*Math.log(t)-t+Math.log(x);
}

function betaFraction(a,b,x) {
  const tiny = 1e-300;
  let c=1, d=1-(a+b)*x/(a+1);
  if (Math.abs(d)<tiny) d=tiny;
  d=1/d;
  let h=d;
  for (let m=1;m<=400;m++) {
    let aa=m*(b-m)*x/((a+2*m-1)*(a+2*m));
    d=1+aa*d; if (Math.abs(d)<tiny) d=tiny;
    c=1+aa/c; if (Math.abs(c)<tiny) c=tiny;
    d=1/d; h*=d*c;
    aa=-(a+m)*(a+b+m)*x/((a+2*m)*(a+2*m+1));
    d=1+aa*d; if (Math.abs(d)<tiny) d=tiny;
    c=1+aa/c; if (Math.abs(c)<tiny) c=tiny;
    d=1/d;
    const delta=d*c; h*=delta;
    if (Math.abs(delta-1)<3e-14) return h;
  }
  throw Error('Student t beta fraction did not converge');
}

function regularizedBeta(x,a,b) {
  if (x<=0) return 0;
  if (x>=1) return 1;
  const front=Math.exp(logGamma(a+b)-logGamma(a)-logGamma(b)+a*Math.log(x)+b*Math.log1p(-x));
  return x<(a+1)/(a+b+2) ? front*betaFraction(a,b,x)/a : 1-front*betaFraction(b,a,1-x)/b;
}
function tPValue(value,df) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1,Math.max(0,regularizedBeta(df/(df+value*value),df/2,.5)));
}
function tQuantile975(df) {
  let lo=0, hi=16;
  for (let i=0;i<80;i++) {
    const mid=(lo+hi)/2;
    if (tPValue(mid,df)>.05) lo=mid; else hi=mid;
  }
  return (lo+hi)/2;
}

function backsolve(r,b) {
  const result=zeros(K);
  for (let i=K-1;i>=0;i--) {
    let v=b[i];
    for (let j=i+1;j<K;j++) v-=r[i][j]*result[j];
    result[i]=v/r[i][i];
  }
  return result;
}

function qr(columns) {
  // Reorthogonalized modified Gram-Schmidt; calendar time is centered/scaled.
  const q=[], r=Array.from({length:K},()=>zeros(K));
  for (let j=0;j<K;j++) {
    const v=columns[j].slice();
    for (let pass=0;pass<2;pass++) {
      for (let i=0;i<j;i++) {
        const coefficient=dot(q[i],v);
        r[i][j]+=coefficient;
        for (let row=0;row<v.length;row++) v[row]-=coefficient*q[i][row];
      }
    }
    r[j][j]=Math.sqrt(dot(v,v));
    if (r[j][j]<1e-12*Math.sqrt(v.length)) throw Error('Rank-deficient or ill-conditioned seasonal design');
    q.push(v.map(value=>value/r[j][j]));
  }
  const inverse=Array.from({length:K},()=>zeros(K));
  for (let j=0;j<K;j++) {
    const e=zeros(K); e[j]=1;
    const column=backsolve(r,e);
    for (let i=0;i<K;i++) inverse[i][j]=column[i];
  }
  const norm=matrix=>Math.max(...matrix.map(row=>sum(row.map(Math.abs))));
  return {q,r,inverse,condition:norm(r)*norm(inverse)};
}

function fit(data,variable,options={},comparison=false,invalidChlorophyll=0) {
  const out=blank(variable,comparison);
  const fail=reason=>({...out,reason});
  let lo,hi;
  try {
    const keys=[...data.keys()].sort((a,b)=>a-b);
    lo=options.start != null ? parseMonth(options.start) : keys[0];
    hi=options.end != null ? parseMonth(options.end) : keys.at(-1);
  } catch(error) { return fail(error.message); }
  if (lo === undefined || hi === undefined || lo>hi) return fail('Empty or reversed requested window');
  out.start=label(lo); out.end=label(hi);
  const selected=[...data.entries()].filter(([month,value])=>month>=lo && month<=hi && value!==null).sort((a,b)=>a[0]-b[0]);
  const n=selected.length, span=hi-lo+1, counts=zeros(12);
  let previous=lo-1, maxMissingRun=0;
  for (const [month] of selected) {
    counts[month%12]++;
    maxMissingRun=Math.max(maxMissingRun,month-previous-1);
    previous=month;
  }
  maxMissingRun=Math.max(maxMissingRun,hi-previous);
  Object.assign(out.diagnostics,{calendarMonths:span, completeness:n/span, monthCounts:counts,
    maxMissingRun,invalidChlorophyll,rank:null,conditionNumber:null});
  out.n=n;
  if (span<120) return fail('Requested span is shorter than 120 calendar months');
  if (n<120) return fail('Fewer than 120 valid months');
  if (n/span<.85) return fail('Completeness is below 0.85');
  if (Math.min(...counts)<5) return fail('Fewer than five observations for a calendar month');
  if (maxMissingRun>6) return fail('Missing run exceeds six calendar months');
  const months=selected.map(([month])=>month), y=selected.map(([,value])=>value);
  const responseOffset=y[0], centeredY=y.map(value=>value-responseOffset);
  if (!centeredY.every(Number.isFinite)) return fail('Response range exceeds finite arithmetic');
  const responseScale=Math.max(...centeredY.map(Math.abs))||1;
  const normalizedY=centeredY.map(value=>value/responseScale);
  const times=months.map(month=>(month-lo)/12), center=mean(times);
  const scale=Math.sqrt(mean(times.map(time=>(time-center)**2)));
  const columns=[Array(n).fill(1), times.map(time=>(time-center)/scale),
    ...Array.from({length:11},(_,m)=>months.map(month=>+(month%12===m+1)))];
  let decomposition;
  try { decomposition=qr(columns); } catch(error) { return fail(error.message); }
  const {q,r,inverse,condition}=decomposition;
  Object.assign(out.diagnostics,{rank:K,conditionNumber:Number.isFinite(condition)?condition:null});
  if (!Number.isFinite(condition) || condition>1e10) return fail('Rank-deficient or ill-conditioned seasonal design');
  const coefficients=backsolve(r,q.map(column=>dot(column,normalizedY)));
  const prediction=y.map((_,i)=>sum(coefficients.map((value,j)=>value*columns[j][i])));
  const residual=normalizedY.map((value,i)=>value-prediction[i]);
  const influence=y.map((_,i)=>sum(inverse[1].map((value,j)=>value*q[j][i]))/scale);
  const scores=influence.map((value,i)=>value*residual[i]);
  const normalizedBeta=coefficients[1]/scale;
  let beta=normalizedBeta*responseScale;
  const df=n-K, lag=Math.max(1,Math.floor(4*(n/100)**(2/9))), quantile=tQuantile975(df);
  const lookup=new Map(months.map((month,i)=>[month,i]));
  const exactFit=Math.max(...residual.map(Math.abs))<=64*Number.EPSILON;
  if (exactFit && Math.abs(normalizedBeta)<64*Number.EPSILON/scale) beta=0;
  const transform=value=>comparison ? value : variable==='chlor_a' ? 100*Math.expm1(10*value) : 10*value;
  function inference(bandwidth) {
    let variance=dot(scores,scores);
    for (let distance=1;distance<=bandwidth;distance++) {
      let cross=0;
      months.forEach((month,i)=>{if (lookup.has(month-distance)) cross+=scores[i]*scores[lookup.get(month-distance)];});
      variance+=2*(1-distance/(bandwidth+1))*cross;
    }
    variance*=n/df;
    if (variance < -1e-18) throw Error('Negative HAC variance');
    const slopeStandardError=exactFit ? 0 : Math.sqrt(Math.max(0,variance))*responseScale;
    const pValue=slopeStandardError>0 ? tPValue(Math.abs(beta/slopeStandardError),df) : beta===0 ? 1 : 0;
    return {lag:bandwidth,slopeStandardError,ci95:[transform(beta-quantile*slopeStandardError),transform(beta+quantile*slopeStandardError)],pValue,significant:pValue<.05};
  }
  let primary,lagSensitivity,trend,baseline,fitted,absoluteChangePerDecade;
  try {
    primary=inference(lag);
    lagSensitivity=[6,12,24].map(inference).map(result=>({...result,conclusionChanges:result.significant!==primary.significant}));
    trend=variable==='chlor_a'||comparison ? 100*Math.expm1(10*beta) : 10*beta;
    const firstYear=selected.filter(([month])=>month<lo+12).map(([,value])=>value);
    baseline=variable==='chlor_a'&&!comparison&&firstYear.length ? Math.exp(mean(firstYear)) : null;
    fitted=prediction.map((value,i)=>{
      const restored=responseOffset+value*responseScale;
      return {month:label(months[i]),value:variable==='chlor_a'&&!comparison ? Math.exp(restored) : restored};
    });
    absoluteChangePerDecade=baseline!==null ? baseline*Math.expm1(10*beta) : null;
    const numbers=[beta,trend,...primary.ci95,primary.slopeStandardError,
      ...lagSensitivity.flatMap(result=>result.ci95),...fitted.map(row=>row.value)];
    if (baseline!==null) numbers.push(baseline,absoluteChangePerDecade);
    if (!numbers.every(Number.isFinite)) throw Error('Non-finite model transformation');
  } catch(error) { return fail(error.message); }
  const adjacent=months.flatMap((month,i)=>lookup.has(month-1) ? [[residual[i],residual[lookup.get(month-1)]]] : []);
  let residualLag1=null;
  if (!exactFit && adjacent.length>=2) {
    const a=adjacent.map(pair=>pair[0]), b=adjacent.map(pair=>pair[1]);
    const ma=mean(a), mb=mean(b), ca=a.map(v=>v-ma), cb=b.map(v=>v-mb);
    const denominator=Math.sqrt(dot(ca,ca)*dot(cb,cb));
    residualLag1=denominator ? dot(ca,cb)/denominator : null;
  }
  const residualScale=Math.sqrt(dot(residual,residual)/df);
  const standardizedResidualScale=exactFit ? null : Math.sqrt(mean(residual.map((value,i)=>value**2/(residualScale**2*(1-sum(q.map(column=>column[i]**2)))))));
  const modelDiagnostics={...out.diagnostics,slopeStandardError:primary.slopeStandardError,residualLag1,
    residualScale:residualScale*responseScale,standardizedResidualScale,lagSensitivity,
    significanceChangesWithLag:lagSensitivity.some(result=>result.conclusionChanges),
    inference:'Approximate Student t inference with calendar-spaced Bartlett HAC; no causal interpretation',exactFit};
  const finiteDiagnostics=value=>typeof value==='number' ? Number.isFinite(value) :
    value && typeof value==='object' ? Object.values(value).every(finiteDiagnostics) : true;
  if (!finiteDiagnostics(modelDiagnostics)) return fail('Non-finite model diagnostic');
  out.diagnostics=modelDiagnostics;
  return {...out,eligible:true,reason:null,slopePerYear:beta,trendPerDecade:trend,
    ci95:primary.ci95,pValue:primary.pValue,df,lag,baseline,
    absoluteChangePerDecade,fitted};
}

export function fitTrend(records,variable,options={}) {
  const out=blank(variable);
  if (!['chlor_a','sst'].includes(variable)) return {...out,reason:'Unknown variable'};
  let rows;
  try { rows=parseRecords(records); } catch(error) { return {...out,reason:error.message}; }
  let invalidChlorophyll=0;
  const data=new Map();
  for (const [month,{value,coverage}] of rows) {
    if (variable==='chlor_a' && value!==null && value<=0) invalidChlorophyll++;
    data.set(month,value===null||coverage<.1||(variable==='chlor_a'&&value<=0) ? null : variable==='chlor_a' ? Math.log(value) : value);
  }
  return fit(data,variable,options,false,invalidChlorophyll);
}

export function compareTrends(eepRecords,nwpRecords,options={}) {
  const out=blank('chlor_a',true);
  let eep,nwp;
  try { eep=parseRecords(eepRecords); nwp=parseRecords(nwpRecords); } catch(error) { return {...out,reason:error.message}; }
  const data=new Map();
  let invalidChlorophyll=0;
  for (const month of new Set([...eep.keys(),...nwp.keys()])) {
    const a=eep.get(month)||{value:null,coverage:0}, b=nwp.get(month)||{value:null,coverage:0};
    invalidChlorophyll+=+(a.value!==null&&a.value<=0)+ +(b.value!==null&&b.value<=0);
    data.set(month,a.value!==null&&b.value!==null&&a.value>0&&b.value>0&&a.coverage>=.1&&b.coverage>=.1 ? Math.log(a.value)-Math.log(b.value) : null);
  }
  return fit(data,'chlor_a',options,true,invalidChlorophyll);
}
