/** A single mailbox, without header injection, display names or address lists. */
export function validRecipient(value: string): boolean {
  if (value.length > 254 || /[\s,;<>]/.test(value)) return false;
  const parts = value.split("@"); if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (local.length > 64 || !/^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/.test(local)) return false;
  const labels = domain.split(".");
  return labels.length >= 2 && labels.every(label => label.length <= 63 && /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(label)) && /^[A-Za-z]{2,}$/.test(labels.at(-1) ?? "");
}
export function validFrom(value: string): boolean {
  if (/[\r\n,;]/.test(value)) return false;
  if (validRecipient(value)) return true;
  const match = value.match(/^[^<>]+ <([^<>]+)>$/);
  return !!match && validRecipient(match[1]);
}
