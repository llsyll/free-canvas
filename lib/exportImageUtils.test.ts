import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clampExportDimensions,
  expandExportBounds,
  getExportScale,
  hasExcludedExportClass,
  makeExportFileName,
} from './exportImageUtils.ts';

test('expandExportBounds adds padding around a flow rect', () => {
  assert.deepEqual(
    expandExportBounds({ x: 100, y: 50, width: 300, height: 120 }, 24),
    { x: 76, y: 26, width: 348, height: 168 },
  );
});

test('getExportScale preserves small exports and scales large ones down', () => {
  assert.equal(getExportScale(1000, 800, 4096), 1);
  assert.equal(getExportScale(8192, 2048, 4096), 0.5);
});

test('clampExportDimensions returns integer dimensions after scaling', () => {
  assert.deepEqual(
    clampExportDimensions({ width: 8192, height: 2048 }, 4096),
    { width: 4096, height: 1024, scale: 0.5 },
  );
});

test('makeExportFileName keeps canvas titles filesystem friendly', () => {
  assert.equal(makeExportFileName('我的/画布:草稿', 'selection'), '我的-画布-草稿-selection.png');
  assert.equal(makeExportFileName('   ', 'text'), 'canvas-text.png');
});

test('hasExcludedExportClass identifies export-only UI', () => {
  assert.equal(hasExcludedExportClass('fixed image-export-exclude bottom-4'), true);
  assert.equal(hasExcludedExportClass('react-flow__node text-node-frame'), false);
});
