/* "नशे पर आपका सवाल" : Google Form एक बार में बना देने वाली लिपि
 *
 * चलाइए : script.google.com पर नया project, यह सब चिपकाइए, banaoSawalForm
 * चुनकर Run. नीचे Execution log में फ़ॉर्म और शीट के लिंक छप जाएँगे।
 *
 * यह लोकसंकल्प की चालू सेवा (Code.gs) से अलग रखी गई है, क्योंकि फ़ॉर्म बनाने
 * की अनुमति उसमें जोड़ने पर उसका web app दोबारा अधिकृत कराना पड़ता, यानी
 * चलती हुई सेवा छेड़नी पड़ती।
 *
 * मसौदा : docs/SAWAL-FORM.md
 */

function banaoSawalForm() {
  var form = FormApp.create('नशे पर आपका सवाल');
  form.setDescription(
    'नशे को लेकर आपके मन में जो सवाल है, वह यहाँ लिखिए।\n\n' +
    'इन सवालों के जवाब नई किरण नशा मुक्ति केंद्र के परामर्शदाता तैयार करेंगे। ' +
    'वे जवाब loksankalp.org पर सबके लिए रखे जाएँगे, ताकि जो बात आप पूछ रहे ' +
    'हैं वह और हज़ारों लोगों के काम आए।\n\n' +
    'नाम और मोबाइल नंबर नहीं पूछे जाते।'
  );

  /* पहला सवाल, अकेला ज़रूरी। कम से कम दस अक्षर की जाँच इसलिए कि बिना इसके
     शीट में "hi" और "." जैसी पंक्तियाँ भरती रहती हैं, और उन्हें छाँटने में
     जवाब लिखने से ज़्यादा समय लगता है। */
  form.addParagraphTextItem()
    .setTitle('आपका सवाल')
    .setHelpText('जैसे मन में आए वैसे लिखिए। भाषा सुंदर होना ज़रूरी नहीं है। एक-दो पंक्ति भी काफ़ी है।')
    .setRequired(true)
    .setValidation(
      FormApp.createParagraphTextValidation()
        .setHelpText('कृपया अपना सवाल थोड़ा और लिखिए।')
        .requireTextLengthGreaterThanOrEqualTo(10)
        .build()
    );

  form.addParagraphTextItem()
    .setTitle('दूसरा सवाल (अगर हो तो)')
    .setHelpText('एक से ज़्यादा सवाल हों तो यहाँ लिखिए। न हो तो छोड़ दीजिए।')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('तीसरा सवाल (अगर हो तो)')
    .setRequired(false);

  /* ईमेल न माँगना और "एक आदमी एक बार" बंद रखना, दोनों एक ही कारण से हैं :
     चालू करने पर Google लॉगिन माँगता है, और जिसके फ़ोन में Gmail नहीं है वह
     सवाल ही नहीं पूछ पाएगा। सबका जोड़ (summary) इसलिए बंद कि ये सवाल निजी
     हैं, भेजने वाले को बाकी सबके सवाल नहीं दिखने चाहिए। */
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);
  form.setAllowResponseEdits(false);
  form.setPublishingSummary(false);
  form.setProgressBar(false);
  form.setShuffleQuestions(false);
  form.setShowLinkToRespondAgain(true);
  form.setConfirmationMessage(
    'आपका सवाल मिल गया। धन्यवाद।\n\n' +
    'जवाब नई किरण नशा मुक्ति केंद्र के परामर्शदाता तैयार करेंगे और वे ' +
    'loksankalp.org पर सबके लिए रखे जाएँगे।\n\n' +
    'एक और सवाल पूछना हो तो नीचे दिए लिंक से भेज दीजिए।'
  );

  // जवाब सीधे एक नई स्प्रेडशीट में जाएँ
  var sheet = SpreadsheetApp.create('नशे पर आए सवाल');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

  Logger.log('फ़ॉर्म बन गया।');
  Logger.log('लोगों को यह लिंक भेजिए : ' + form.getPublishedUrl());
  Logger.log('बदलने के लिए यह खोलिए  : ' + form.getEditUrl());
  Logger.log('जवाब यहाँ आएँगे        : ' + sheet.getUrl());
}
