import test from 'node:test';
import assert from 'node:assert/strict';
import { selectionRows, selectionCsv, selectionFilename } from '../src/selection-export.js';
import { createState } from '../src/ui-state.js';

const state = { ...createState({ start:'2020-01', end:'2020-03' }, { chlor_a:{min:'2020-01',max:'2020-03'}, sst:{min:'2020-01',max:'2020-03'} }), variable:'sst' };
const row = (month, region, value, extra={}) => ({month,region,variable:'sst',value,units:'degC',coverage:1,validCells:5,oceanCells:5,provenance:'source',...extra});

test('export filters the exact selection and orders calendar months then regions without mutating input', () => {
  const records = [row('2020-03','nwp',-2), row('2020-01','eep',1), row('2020-02','eep',null),
    row('2020-01','nwp',4,{coverage:.099}),row('2019-12','eep',99),row('2020-01','eep',99,{variable:'chlor_a',units:'mg/m3'})];
  const before = structuredClone(records);
  const rows = selectionRows({records}, state);
  assert.deepEqual(rows.map(r => [r.month,r.region,r.value,r.status,r.missingKind]), [
    ['2020-01','eep',1,'included',''], ['2020-01','nwp',4,'excluded_low_coverage',''],
    ['2020-02','eep',null,'excluded_missing','explicit_null'], ['2020-02','nwp',null,'excluded_missing','calendar_gap'],
    ['2020-03','eep',null,'excluded_missing','calendar_gap'], ['2020-03','nwp',-2,'included','']
  ]);
  assert.deepEqual(rows[0], {...records[1],status:'included',missingKind:''});
  assert.equal(rows[3].provenance, null);
  assert.equal(rows[3].units,'degC');
  assert.deepEqual(records,before);
  assert.deepEqual(selectionRows({records}, {...state,region:'nwp',start:'2020-03'}).map(r => [r.month,r.region,r.value]), [['2020-03','nwp',-2]]);
});

test('status follows the 0.1 coverage boundary and excludes nonpositive chlorophyll', () => {
  const records = [row('2020-01','eep',0,{variable:'chlor_a',units:'mg/m3'}),
    row('2020-02','eep',-1,{variable:'chlor_a',units:'mg/m3'}),
    row('2020-03','eep',2,{variable:'chlor_a',units:'mg/m3',coverage:.1})];
  assert.deepEqual(selectionRows({records},{...state,variable:'chlor_a',region:'eep'}).map(r=>r.status),
    ['excluded_nonpositive_chlorophyll','excluded_nonpositive_chlorophyll','included']);
});

test('CSV retains source metadata and nulls and escapes multiline quoted text', () => {
  const csv = selectionCsv({records:[row('2020-01','eep',-2,{provenance:'product, "A"\nline'})]}, {...state,region:'eep',end:'2020-01'});
  assert.equal(csv, 'month,region,variable,value,units,coverage,validCells,oceanCells,provenance,status,missingKind\r\n2020-01,eep,sst,-2,degC,1,5,5,"product, ""A""\nline",included,\r\n');
  assert.match(selectionCsv({records:[]},{...state,region:'eep',end:'2020-01'}), /2020-01,eep,sst,null,degC,,,,,excluded_missing,calendar_gap/);
});

test('CSV neutralizes formula text including whitespace prefixes while keeping negative numbers numeric', () => {
  for (const text of ['=SUM(A1)', '+cmd', '-cmd', '@cmd', '  =SUM(A1)', '\t=SUM(A1)', '\r=SUM(A1)', '\tplain', '\rplain']) {
    const csv = selectionCsv({records:[row('2020-01','eep',-2,{provenance:text})]}, {...state,region:'eep',end:'2020-01'});
    assert.ok(csv.includes(text.includes('\r') ? `"'${text}"` : `'${text}`), JSON.stringify(text));
    assert.ok(csv.includes(',sst,-2,degC,'));
  }
});

test('exports reject unapproved or invalid selection and describe the selection in filename', () => {
  for (const override of [{phase:'pending'}, {variable:'x'}, {region:'x'}, {start:'2020-2'}, {start:'2020-03',end:'2020-01'}, {end:'2021-01'}]) {
    assert.throws(()=>selectionRows({records:[]},{...state,...override}));
    assert.throws(()=>selectionFilename({...state,...override}));
  }
  assert.equal(selectionFilename({...state,region:'eep'}),'oceans-hidden-response_sst_eep_2020-01_2020-03.csv');
});
