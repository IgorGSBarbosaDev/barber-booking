function requestEmailVerification_(payload) {
  var customer = validateCustomerPayload_(payload);
  var client = findOrCreateClient_(customer);
  if (asBoolean_(client.emailVerified)) {
    return { required: false, alreadyVerified: true, clientId: client.id };
  }
  var otp = createEmailOtp_(customer);
  try {
    sendOtpEmail_(customer, otp);
  } catch (error) {
    logTechnicalError_('OTP_EMAIL_FAILED', error, { email: customer.email });
    throwAppError_('EMAIL_SEND_FAILED', 'Não foi possível enviar o código de confirmação.');
  }
  return {
    required: true,
    alreadyVerified: false,
    maskedEmail: customer.email.replace(/^(.{2}).+(@.*)$/, '$1••••$2'),
    expiresAt: otp.expiresAt.toISOString(),
    clientId: client.id
  };
}

function verifyEmailVerification_(payload) {
  var data = parsePayload_(payload);
  var customer = validateCustomerPayload_(data);
  var code = trim_(data.code);
  if (!/^\d{6}$/.test(code)) throwAppError_('INVALID_OTP', 'Informe um código de 6 dígitos.');
  checkRateLimit_(customer.email + '|' + customer.phone, 'otp_verify');
  var identifier = customer.email + '|' + customer.phone + '|' + customer.clientId;
  var identifierHash = hashWithSecret_(identifier);
  var records = getSheetRecords_(BARBER_BOOKING.sheets.OTP_CODES).filter(function(record) {
    return record.identifierHash === identifierHash
      && record.purpose === 'EMAIL_VERIFICATION'
      && !record.usedAt;
  }).sort(function(a, b) { return Number(a._rowNumber) - Number(b._rowNumber); });
  var otpRecord = records[records.length - 1];
  if (!otpRecord) throwAppError_('OTP_NOT_FOUND', 'Código inválido ou expirado.');
  if (new Date(otpRecord.expiresAt).getTime() < now_().getTime()) {
    throwAppError_('OTP_EXPIRED', 'Código expirado.');
  }
  if (asInteger_(otpRecord.attempts, 0) >= 5) {
    throwAppError_('OTP_LOCKED', 'Limite de tentativas atingido.');
  }
  otpRecord.attempts = asInteger_(otpRecord.attempts, 0) + 1;
  if (otpRecord.codeHash !== hashWithSecret_(code)) {
    updateSheetRecord_(BARBER_BOOKING.sheets.OTP_CODES, otpRecord);
    throwAppError_('INVALID_OTP', 'Código inválido.');
  }
  otpRecord.usedAt = now_().toISOString();
  var verificationToken = generateToken_();
  otpRecord.verificationTokenHash = hashWithSecret_(verificationToken);
  otpRecord.verificationTokenExpiresAt = new Date(now_().getTime() + 15 * 60 * 1000).toISOString();
  updateSheetRecord_(BARBER_BOOKING.sheets.OTP_CODES, otpRecord);
  var client = findOrCreateClient_(customer);
  client.emailVerified = true;
  client.updatedAt = now_().toISOString();
  updateSheetRecord_(BARBER_BOOKING.sheets.CLIENTS, client);
  logAudit_('CLIENT_EMAIL_VERIFIED', 'CLIENT', client.id, { email: customer.email });
  return { verified: true, clientId: client.id, verificationToken: verificationToken };
}
