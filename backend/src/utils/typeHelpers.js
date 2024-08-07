export const stringToBase64 = (str) => {
    return Buffer.from(str).toString('base64');
  };

export const readUInt16LE = (bytes) => {
    var value = (bytes[1] << 8) + bytes[0];
    return value & 0xffff;
}

export const readInt16LE = (bytes) => {
   var ref = readUInt16LE(bytes);
   return ref > 0x7fff ? ref - 0x10000 : ref;
}
export const readInt32LE = (bytes) => {
  var ref = readUInt32LE(bytes);
  return ref > 0x7fffffff ? ref - 0x100000000 : ref;
}

function readUInt32LE(bytes) {
  var value = (bytes[3] << 24) + (bytes[2] << 16) + (bytes[1] << 8) + bytes[0];
  return (value & 0xffffffff) >>> 0;
}