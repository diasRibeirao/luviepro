export type Success<T> = { ok: true; value: T };
export type Failure<E extends string = string> = { ok: false; error: E };
export type Result<T, E extends string = string> = Success<T> | Failure<E>;
export const success = <T>(value: T): Success<T> => ({ ok: true, value });
export const failure = <E extends string>(error: E): Failure<E> => ({ ok: false, error });
