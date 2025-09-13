// Type declarations for country-list
declare module 'country-list' {
  export function getData(): Array<{name: string, code: string}>;
  export function getCode(name: string): string | undefined;
  export function getName(code: string): string | undefined;
}