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

function appointmentMutationEmail_(value) {
  var email = normalizeEmail_(requireText_(value, 'e-mail', 4, 254));
  if (!isValidEmail_(email)) throwAppError_('INVALID_LOOKUP_EMAIL', 'Informe um e-mail válido.');
  return email;
}

function appointmentMutationIdentifierHash_(email) {
  return hashWithSecret_('APPOINTMENT_MUTATION|' + email);
}

function createAppointmentMutationOtp_(email) {
  var identifierHash = appointmentMutationIdentifierHash_(email);
  getSheetRecords_(BARBER_BOOKING.sheets.OTP_CODES).forEach(function(record) {
    if (record.purpose !== 'APPOINTMENT_MUTATION' || record.identifierHash !== identifierHash || !record.verificationTokenHash) return;
    record.verificationTokenHash = '';
    record.verificationTokenExpiresAt = '';
    updateSheetRecord_(BARBER_BOOKING.sheets.OTP_CODES, record);
  });
  var expirationMinutes = asInteger_(getSetting_('OTP_EXPIRATION_MINUTES', 10), 10);
  var code = String(Math.floor(100000 + Math.random() * 900000));
  var expiresAt = new Date(now_().getTime() + expirationMinutes * 60 * 1000);
  appendSheetRecord_(BARBER_BOOKING.sheets.OTP_CODES, {
    id: generateId_('OTP'),
    identifierHash: identifierHash,
    codeHash: hashWithSecret_(code),
    purpose: 'APPOINTMENT_MUTATION',
    expiresAt: expiresAt.toISOString(),
    usedAt: '',
    attempts: 0,
    verificationTokenHash: '',
    verificationTokenExpiresAt: '',
    appointmentId: '',
    createdAt: now_().toISOString()
  });
  return { code: code, expiresAt: expiresAt };
}

function requestAppointmentMutationOtp_(payload) {
  var data = parsePayload_(payload);
  var email = appointmentMutationEmail_(data.email);
  var appointmentId = requireText_(data.appointmentId, 'agendamento', 4, 100);
  checkRateLimit_(email, 'appointment_mutation_request');
  var lock = LockService.getScriptLock();
  var otp = null;
  lock.waitLock(30000);
  try {
    var clients = appointmentLookupClientsByEmail_(email);
    var isListedAppointment = listAppointmentsForLookup_(clients).some(function(item) {
      return String(item.id) === String(appointmentId);
    });
    if (isListedAppointment) otp = createAppointmentMutationOtp_(email);
  } finally {
    lock.releaseLock();
  }
  if (!otp) return { requested: false };
  try {
    sendAppointmentMutationOtpEmail_(email, otp);
  } catch (error) {
    logTechnicalError_('APPOINTMENT_MUTATION_OTP_FAILED', error);
    throwAppError_('EMAIL_SEND_FAILED', 'Não foi possível enviar o código. Tente novamente.');
  }
  return { requested: true, expiresAt: otp.expiresAt.toISOString() };
}

function verifyAppointmentMutationOtp_(payload) {
  var data = parsePayload_(payload);
  var email = appointmentMutationEmail_(data.email);
  var code = trim_(data.code);
  if (!/^\d{6}$/.test(code)) throwAppError_('INVALID_APPOINTMENT_CODE', 'Informe o código de 6 dígitos recebido por e-mail.');
  checkRateLimit_(email, 'appointment_mutation_verify');
  var identifierHash = appointmentMutationIdentifierHash_(email);
  var records = getSheetRecords_(BARBER_BOOKING.sheets.OTP_CODES).filter(function(record) {
    return record.identifierHash === identifierHash && record.purpose === 'APPOINTMENT_MUTATION';
  }).sort(function(a, b) { return Number(a._rowNumber) - Number(b._rowNumber); });
  var otpRecord = records[records.length - 1];
  if (!otpRecord || otpRecord.usedAt || new Date(otpRecord.expiresAt).getTime() <= now_().getTime()) {
    throwAppError_('INVALID_APPOINTMENT_CODE', 'O código é inválido ou expirou. Solicite outro.');
  }
  if (asInteger_(otpRecord.attempts, 0) >= 5) {
    throwAppError_('INVALID_APPOINTMENT_CODE', 'Limite de tentativas atingido. Solicite outro código.');
  }
  otpRecord.attempts = asInteger_(otpRecord.attempts, 0) + 1;
  if (otpRecord.codeHash !== hashWithSecret_(code)) {
    updateSheetRecord_(BARBER_BOOKING.sheets.OTP_CODES, otpRecord);
    throwAppError_('INVALID_APPOINTMENT_CODE', 'O código é inválido ou expirou. Confira e tente novamente.');
  }
  var clients = appointmentLookupClientsByEmail_(email);
  if (!clients.length) {
    otpRecord.usedAt = now_().toISOString();
    updateSheetRecord_(BARBER_BOOKING.sheets.OTP_CODES, otpRecord);
    throwAppError_('INVALID_APPOINTMENT_CODE', 'O código é inválido ou expirou. Solicite outro.');
  }
  otpRecord.usedAt = now_().toISOString();
  var sessionToken = generateToken_();
  var sessionExpiresAt = new Date(now_().getTime() + 15 * 60 * 1000);
  otpRecord.verificationTokenHash = hashWithSecret_(sessionToken);
  otpRecord.verificationTokenExpiresAt = sessionExpiresAt.toISOString();
  updateSheetRecord_(BARBER_BOOKING.sheets.OTP_CODES, otpRecord);
  return {
    verified: true,
    sessionToken: sessionToken,
    expiresAt: sessionExpiresAt.toISOString()
  };
}

function appointmentLookupClientsForMutationSession_(value, sessionToken) {
  var email = appointmentMutationEmail_(value);
  var normalizedToken = trim_(sessionToken);
  var tokenHash = normalizedToken ? hashWithSecret_(normalizedToken) : '';
  var identifierHash = appointmentMutationIdentifierHash_(email);
  var isValid = getSheetRecords_(BARBER_BOOKING.sheets.OTP_CODES).some(function(record) {
    return record.identifierHash === identifierHash
      && record.purpose === 'APPOINTMENT_MUTATION'
      && Boolean(record.usedAt)
      && record.verificationTokenHash === tokenHash
      && new Date(record.verificationTokenExpiresAt).getTime() > now_().getTime();
  });
  if (!isValid) throwAppError_('INVALID_LOOKUP_SESSION', 'Sua confirmação expirou. Valide o e-mail novamente.');
  return appointmentLookupClientsByEmail_(email);
}
