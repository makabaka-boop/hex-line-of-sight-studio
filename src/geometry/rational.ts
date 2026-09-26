export type Rational = readonly [bigint, bigint]

export function rat(n: number | bigint, d: number | bigint = 1n): Rational {
  const num = BigInt(n)
  const den = BigInt(d)
  if (den === 0n) throw new Error('zero denominator')
  return normalize([num, den])
}

export function isRational(value: unknown): value is Rational {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'bigint' &&
    typeof value[1] === 'bigint'
  )
}

export function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a
  let y = b < 0n ? -b : b
  while (y !== 0n) {
    const next = x % y
    x = y
    y = next
  }
  return x
}

export function normalize(value: Rational): Rational {
  let [n, d] = value
  if (d === 0n) throw new Error('zero denominator')
  if (d < 0n) {
    n = -n
    d = -d
  }
  if (n === 0n) return [0n, 1n]
  const divisor = gcd(n, d)
  return [n / divisor, d / divisor]
}

export function add(a: Rational, b: Rational): Rational {
  return normalize([a[0] * b[1] + b[0] * a[1], a[1] * b[1]])
}

export function sub(a: Rational, b: Rational): Rational {
  return normalize([a[0] * b[1] - b[0] * a[1], a[1] * b[1]])
}

export function mul(a: Rational, b: Rational): Rational {
  return normalize([a[0] * b[0], a[1] * b[1]])
}

export function div(a: Rational, b: Rational): Rational {
  if (b[0] === 0n) throw new Error('division by zero')
  return normalize([a[0] * b[1], a[1] * b[0]])
}

export function neg(a: Rational): Rational {
  return [-a[0], a[1]]
}

export function compare(a: Rational, b: Rational): -1 | 0 | 1 {
  const left = a[0] * b[1]
  const right = b[0] * a[1]
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

export const lessThan = (a: Rational, b: Rational): boolean => compare(a, b) < 0
export const equalTo = (a: Rational, b: Rational): boolean => compare(a, b) === 0

export function minRational(...values: Rational[]): Rational {
  return values.reduce((a, b) => (compare(a, b) <= 0 ? a : b))
}

export function maxRational(...values: Rational[]): Rational {
  return values.reduce((a, b) => (compare(a, b) >= 0 ? a : b))
}

const integerPattern = /^[+-]?\d+$/
const fractionPattern = /^([+-]?\d+)\s*\/\s*([+-]?\d+)$/

export function parseRational(text: string): Rational | null {
  const trimmed = text.trim()
  if (integerPattern.test(trimmed)) return rat(BigInt(trimmed))

  const fraction = fractionPattern.exec(trimmed)
  if (!fraction) return null

  const denominator = BigInt(fraction[2])
  if (denominator === 0n) return null
  return normalize([BigInt(fraction[1]), denominator])
}

export function rationalToString(value: Rational): string {
  const [n, d] = normalize(value)
  return d === 1n ? n.toString() : `${n}/${d}`
}

export function rationalMixedString(value: Rational): string {
  const [n, d] = normalize(value)
  if (d === 1n) return n.toString()
  const sign = n < 0n ? '-' : ''
  const absolute = n < 0n ? -n : n
  const whole = absolute / d
  const remainder = absolute % d
  if (whole === 0n) return `${sign}${remainder}/${d}`
  return `${sign}${whole} ${remainder}/${d}`
}

export function rationalToNumber(value: Rational): number {
  return Number(value[0]) / Number(value[1])
}
