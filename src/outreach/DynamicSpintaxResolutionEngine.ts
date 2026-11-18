export function parseAndResolveSpintax(template: string): string {
  let res = template;
  while (/\{([^{}]+)\}/.test(res)) {
    res = res.replace(/\{([^{}]+)\}/g, (_, choices) => {
      const parts = choices.split('|');
      return parts[Math.floor(Math.random() * parts.length)];
    });
  }
  return res;
}
export default parseAndResolveSpintax;
