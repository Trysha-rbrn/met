import { Request } from 'express'

export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'CAD', 'RUB', 'RSD', 'TRY',
  'GBP', 'JPY', 'CNY', 'INR', 'AUD', 'CHF', 'BRL', 'MXN', 'KRW', 'HKD',
  'SGD', 'NZD', 'NOK', 'SEK', 'DKK', 'AED', 'SAR', 'ZAR', 'PLN', 'IDR'
] as const

type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]

const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  US: 'USD',
  GB: 'GBP',
  JP: 'JPY',
  CN: 'CNY',
  IN: 'INR',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  IE: 'EUR',
  PT: 'EUR',
  GR: 'EUR',
  FI: 'EUR',
  SK: 'EUR',
  SI: 'EUR',
  EE: 'EUR',
  LV: 'EUR',
  LT: 'EUR',
  CY: 'EUR',
  MT: 'EUR',
  CA: 'CAD',
  RU: 'RUB',
  RS: 'RSD',
  TR: 'TRY',
  AU: 'AUD',
  CH: 'CHF',
  BR: 'BRL',
  MX: 'MXN',
  KR: 'KRW',
  HK: 'HKD',
  SG: 'SGD',
  NZ: 'NZD',
  NO: 'NOK',
  SE: 'SEK',
  DK: 'DKK',
  AE: 'AED',
  SA: 'SAR',
  ZA: 'ZAR',
  PL: 'PLN',
  ID: 'IDR'
}

const COUNTRY_HEADER_KEYS = [
  'cf-ipcountry',
  'x-vercel-ip-country',
  'x-country-code',
  'cloudfront-viewer-country'
] as const

const toCountryCode = (value: unknown) => {
  if (typeof value !== 'string') return ''
  return value.trim().toUpperCase().slice(0, 2)
}

const extractCountryFromAcceptLanguage = (value: unknown) => {
  if (typeof value !== 'string') return ''
  const firstPart = value.split(',')[0]?.trim() || ''
  const localeBits = firstPart.split('-')
  if (localeBits.length < 2) return ''
  return toCountryCode(localeBits[1])
}

export const resolveRequestCountryCode = (req: Request) => {
  for (const key of COUNTRY_HEADER_KEYS) {
    const candidate = toCountryCode(req.header(key))
    if (candidate) return candidate
  }

  const acceptLanguageCountry = extractCountryFromAcceptLanguage(req.header('accept-language'))
  if (acceptLanguageCountry) return acceptLanguageCountry

  return ''
}

export const resolveDefaultCurrencyForRequest = (req: Request): CurrencyCode => {
  const countryCode = resolveRequestCountryCode(req)
  return COUNTRY_TO_CURRENCY[countryCode] || 'USD'
}
