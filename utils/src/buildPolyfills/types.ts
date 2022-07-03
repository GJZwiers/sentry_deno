import { Primitive } from '../../../types/src/index.ts';

export type GenericObject = { [key: string]: Value };
export type GenericFunction = (...args: unknown[]) => Value;
export type Value = Primitive | GenericFunction | GenericObject;

export type RequireResult = GenericObject | (GenericFunction & GenericObject);
