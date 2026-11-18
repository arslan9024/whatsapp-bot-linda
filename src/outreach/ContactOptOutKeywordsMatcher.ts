const OPT_OUT = ['stop', 'unsubscribe', 'remove', 'dont message', 'لا ترسل'];
export function isOptOut(body: string): boolean {
  return OPT_OUT.some(w => body.toLowerCase().includes(w));
}
export default isOptOut;
