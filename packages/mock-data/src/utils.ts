export function cloneData<Value>(value: Value): Value
{
  return structuredClone(value);
}
