export function resolveSpintax(template: string): string {
  return template.replace(/\{([^{}]+)\}/g, (_, choices) => {
    const parts = choices.split('|');
    return parts[Math.floor(Math.random() * parts.length)];
  });
}
export default resolveSpintax;
