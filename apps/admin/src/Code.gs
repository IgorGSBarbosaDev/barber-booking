function doGet() {
  return HtmlService.createTemplateFromFile('src/views/AdminApp')
    .evaluate()
    .setTitle(getScriptProperty_('BARBER_NAME', 'Barber Admin'))
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
