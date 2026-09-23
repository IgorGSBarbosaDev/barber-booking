function getBarberEmail_() {
  var configured = normalizeEmail_(getSetting_('BARBER_EMAIL', ''));
  if (configured) return configured;
  try {
    return normalizeEmail_(Session.getEffectiveUser().getEmail());
  } catch (ignored) {
    return '';
  }
}

function sendEmail_(recipient, subject, plainBody, htmlBody) {
  if (!recipient || !isValidEmail_(recipient)) return false;
  MailApp.sendEmail(recipient, subject, plainBody, { htmlBody: htmlBody || plainBody });
  return true;
}

function appointmentEmailData_(appointment, client) {
  return {
    clientName: appointment.clientNameSnapshot || client.name,
    clientEmail: client.email,
    serviceName: appointment.serviceNameSnapshot,
    price: formatCurrency_(appointment.servicePriceSnapshot),
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    id: appointment.id
  };
}

function sendBookingNotifications_(appointment, client, managementToken) {
  var data = appointmentEmailData_(appointment, client);
  var publicUrl = getSetting_('PUBLIC_APP_URL', '');
  var manageUrl = publicUrl
    ? publicUrl + '?page=appointment&id=' + encodeURIComponent(appointment.id) + '&token=' + encodeURIComponent(managementToken)
    : 'Acesse o Public Web App e informe o identificador ' + appointment.id + ' e o token ' + managementToken;
  var barberEmail = getBarberEmail_();
  var clientSubject = 'Agendamento confirmado — ' + data.date + ' às ' + data.startTime;
  var clientBody = [
    'Agendamento confirmado',
    '',
    data.date + ' às ' + data.startTime,
    data.serviceName,
    data.price,
    '',
    'Consultar ou cancelar: ' + manageUrl
  ].join('\n');
  var barberBody = [
    'Novo agendamento',
    '',
    'Cliente: ' + data.clientName,
    'Telefone: ' + client.phone,
    'E-mail: ' + data.clientEmail,
    'Serviço: ' + data.serviceName,
    'Data: ' + data.date,
    'Horário: ' + data.startTime + '–' + data.endTime,
    'Valor: ' + data.price,
    'ID: ' + data.id
  ].join('\n');
  var status = { client: 'SKIPPED', barber: 'SKIPPED', errors: [] };
  try {
    if (sendEmail_(data.clientEmail, clientSubject, clientBody)) status.client = 'SENT';
  } catch (clientError) {
    status.client = 'ERROR';
    status.errors.push('client: ' + clientError.message);
  }
  try {
    if (sendEmail_(barberEmail, 'Novo agendamento — ' + data.date + ' às ' + data.startTime, barberBody)) status.barber = 'SENT';
  } catch (barberError) {
    status.barber = 'ERROR';
    status.errors.push('barber: ' + barberError.message);
  }
  return status;
}

function sendAppointmentCancellationNotification_(appointment, client, cancelledBy) {
  var data = appointmentEmailData_(appointment, client);
  var body = [
    'Agendamento cancelado',
    '',
    'Cliente: ' + data.clientName,
    data.date + ' às ' + data.startTime,
    data.serviceName,
    'Cancelado por: ' + cancelledBy
  ].join('\n');
  var status = { client: 'SKIPPED', barber: 'SKIPPED', errors: [] };
  try {
    if (sendEmail_(data.clientEmail, 'Agendamento cancelado — ' + data.date, body)) status.client = 'SENT';
  } catch (clientError) {
    status.client = 'ERROR';
    status.errors.push('client: ' + clientError.message);
  }
  try {
    if (sendEmail_(getBarberEmail_(), 'Agendamento cancelado — ' + data.date, body)) status.barber = 'SENT';
  } catch (barberError) {
    status.barber = 'ERROR';
    status.errors.push('barber: ' + barberError.message);
  }
  return status;
}

function sendOtpEmail_(customer, otp) {
  var subject = 'Código de confirmação do agendamento';
  var body = [
    'Seu código de confirmação é: ' + otp.code,
    '',
    'Ele expira em ' + asInteger_(getSetting_('OTP_EXPIRATION_MINUTES', 10), 10) + ' minutos.',
    'Se você não solicitou um agendamento, ignore este e-mail.'
  ].join('\n');
  sendEmail_(customer.email, subject, body);
}

function sendAppointmentMutationOtpEmail_(email, otp) {
  var subject = 'Código para alterar seu agendamento';
  var body = [
    'Seu código de verificação é: ' + otp.code,
    '',
    'Ele expira em ' + asInteger_(getSetting_('OTP_EXPIRATION_MINUTES', 10), 10) + ' minutos.',
    'Se você não solicitou uma alteração, ignore este e-mail.'
  ].join('\n');
  sendEmail_(email, subject, body);
}
