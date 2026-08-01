/**
 * cn — küçük className birleştirici.
 * Falsy değerleri (undefined/false/null/'') atar, kalanları boşlukla birleştirir.
 * Harici bağımlılık (clsx/tailwind-merge) eklemeden basit koşullu sınıf birleştirme sağlar.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
