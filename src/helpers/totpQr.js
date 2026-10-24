import QRCode from 'qrcode';

export async function totpQrDataUrl(otpauthUrl) {
  if (!otpauthUrl) return '';
  return QRCode.toDataURL(otpauthUrl, {
    width: 168,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
}
