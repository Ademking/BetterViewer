const originalError = console.error;
const originalWarn = console.warn;

function logError(...parameters) {
  let filter = parameters.find((parameter) => {
    return parameter.includes("Warning:");
  });
  if (!filter) originalError(...parameters);
}

function logWarn(...parameters) {
  let filter = parameters.find((parameter) => {
    return (
      parameter.includes("it looks like an unknown prop") ||
      parameter.includes("Warning:")
    );
  });
  if (!filter) originalWarn(...parameters);
}

console.error = logError;
console.warn = logWarn;
