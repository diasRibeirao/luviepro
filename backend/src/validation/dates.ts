import { BadRequestException } from '@nestjs/common';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDateOrThrow(value: string | Date, label = 'Data'): Date {
  let date: Date;
  if (value instanceof Date) {
    date = new Date(value.getTime());
  } else {
    const match = DATE_ONLY.exec(value);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      date = new Date(year, month - 1, day);
      if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        throw new BadRequestException(`${label} inválida`);
      }
    } else {
      date = new Date(value);
    }
  }
  if (Number.isNaN(date.getTime())) throw new BadRequestException(`${label} inválida`);
  return date;
}

export function assertDateOrder(start: Date, end: Date | null, label = 'O término deve ser posterior ao início') {
  if (end && end < start) throw new BadRequestException(label);
}
