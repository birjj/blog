/** The base64 alphabet */
export const alphabet =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Utility function for converting an input string to bit-groups */
export const toBits = (value: string) => {
  return value
    .split("")
    .map((v) => v.charCodeAt(0).toString(2).padStart(8, "0").substring(0, 8))
    .join("");
};

/** Utility function for converting bit-groups to Base64 characters */
export const fromBits = (value: string) => {
  let outp = "";
  for (let i = 0; i < value.length; i += 6) {
    const bits = value.substring(i, i + 6).padEnd(6, "0");
    outp += alphabet[parseInt(bits, 2)] || "?";
  }
  return outp;
};
