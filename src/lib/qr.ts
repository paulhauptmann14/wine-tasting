import QRCode from 'qrcode'

/** Join QR code as inline SVG. Only path data from our own URL – safe for dangerouslySetInnerHTML. */
export function joinQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#17141BFF', light: '#FFFFFFFF' },
  })
}
