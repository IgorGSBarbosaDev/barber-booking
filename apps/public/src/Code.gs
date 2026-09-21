function doGet(e) {
  var template = HtmlService.createTemplateFromFile('src/views/PublicApp');
  template.initialPage = e && e.parameter && e.parameter.page ? e.parameter.page : 'home';
  template.initialAppointmentId = e && e.parameter && e.parameter.id ? e.parameter.id : '';
  template.initialAppointmentToken = e && e.parameter && e.parameter.token ? e.parameter.token : '';
  return template.evaluate()
    .setTitle(getScriptProperty_('BARBER_NAME', 'Barbearia'))
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
