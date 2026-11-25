import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { formatPlace } from '../src';

describe('formatPlace', () => {
  it('zeigt nur den besten Platz mit Punkt an (Q11)', () => {
    expect(formatPlace(19)).toBe('19.');
  });

  it('formatiert jeden gültigen Platz als Zahl mit Punkt', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 64 }), (place) => {
        expect(formatPlace(place)).toBe(`${String(place)}.`);
      }),
    );
  });

  it.each([0, -1, 1.5, Number.NaN])('lehnt ungültigen Platz %s ab', (place) => {
    expect(() => formatPlace(place)).toThrow(RangeError);
  });
});
