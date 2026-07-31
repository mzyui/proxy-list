'use strict';

const {
  safeArithmetic,
  parseObfuscatedIp,
  parseSpysVars,
  decodeSpysPort,
  decodeBase64Proxy,
  parseProxyLines,
} = require('../src/utils/safe-parse');

describe('safeArithmetic', () => {
  test('evaluates arithmetic', () => {
    expect(safeArithmetic('1+2*3')).toBe(7);
    expect(safeArithmetic('(1+2)*3')).toBe(9);
    expect(safeArithmetic('-4 + 10')).toBe(6);
    expect(safeArithmetic('10 % 3')).toBe(1);
  });

  test('refuses non-arithmetic / code injection', () => {
    expect(safeArithmetic('process.exit(1)')).toBeNull();
    expect(safeArithmetic('require("fs")')).toBeNull();
    expect(safeArithmetic('1;console.log(1)')).toBeNull();
    expect(safeArithmetic('alert(1)')).toBeNull();
    expect(safeArithmetic('')).toBeNull();
    expect(safeArithmetic(null)).toBeNull();
  });

  test('refuses division by zero and malformed input', () => {
    expect(safeArithmetic('1/0')).toBeNull();
    expect(safeArithmetic('1+')).toBeNull();
    expect(safeArithmetic('(1+2')).toBeNull();
  });
});

describe('parseObfuscatedIp', () => {
  test('plain address passthrough', () => {
    expect(parseObfuscatedIp('8.8.8.8')).toBe('8.8.8.8');
  });
  test('concatenated literals', () => {
    expect(parseObfuscatedIp("'12.34.' + '56.78'")).toBe('12.34.56.78');
  });
  test('falls back to embedded address', () => {
    expect(parseObfuscatedIp('foo 9.9.9.9 bar')).toBe('9.9.9.9');
  });
  test('returns null for junk', () => {
    expect(parseObfuscatedIp('nothing here')).toBeNull();
    expect(parseObfuscatedIp(42)).toBeNull();
  });
});

describe('spys.one decoding', () => {
  const script = 'a=1;b=2;c=a^b;d=48';

  test('parses variables including xor', () => {
    const vars = parseSpysVars(script);
    expect(vars.a).toBe(1);
    expect(vars.b).toBe(2);
    expect(vars.c).toBe(3);
    expect(vars.d).toBe(48);
  });

  test('decodes a port expression', () => {
    const vars = parseSpysVars('a=1;b=2;z=0;n=8');
    expect(decodeSpysPort('+(n^z)+(a^z)+(b^z)', vars)).toBe('812');
  });

  test('returns null when a variable is unknown', () => {
    expect(decodeSpysPort('+(q^w)', {})).toBeNull();
    expect(decodeSpysPort('no groups', {})).toBeNull();
  });
});

describe('decodeBase64Proxy', () => {
  test('decodes ip:port', () => {
    const b64 = Buffer.from('1.2.3.4:8080').toString('base64');
    expect(decodeBase64Proxy(b64)).toEqual({ ip: '1.2.3.4', port: '8080' });
  });
  test('rejects garbage', () => {
    expect(decodeBase64Proxy('!!!')).toBeNull();
    expect(decodeBase64Proxy(Buffer.from('hello').toString('base64'))).toBeNull();
  });
});

describe('parseProxyLines', () => {
  test('extracts pairs from mixed text', () => {
    const text = '1.2.3.4:80\nnoise\n5.6.7.8 : 3128\nbad:port';
    expect(parseProxyLines(text)).toEqual([
      { ip: '1.2.3.4', port: '80' },
      { ip: '5.6.7.8', port: '3128' },
    ]);
  });
  test('handles non-strings', () => {
    expect(parseProxyLines(undefined)).toEqual([]);
  });
});
