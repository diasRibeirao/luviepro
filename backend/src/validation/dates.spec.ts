import { BadRequestException } from '@nestjs/common';
import { assertDateOrder, parseDateOrThrow } from './dates';

describe('date validation', () => {
  it('parses date-only values as local calendar dates', () => {
    const date = parseDateOrThrow('2026-01-01');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(1);
  });
  it('keeps year-end date-only values stable', () => expect(parseDateOrThrow('2026-12-31').getFullYear()).toBe(2026));
  it('rejects impossible calendar dates', () => expect(() => parseDateOrThrow('2026-02-30')).toThrow(BadRequestException));
  it('rejects invalid values', () => expect(() => parseDateOrThrow('nope')).toThrow(BadRequestException));
  it('rejects inverted intervals', () => expect(() => assertDateOrder(new Date('2026-02-02'), new Date('2026-02-01'))).toThrow(BadRequestException));
});
