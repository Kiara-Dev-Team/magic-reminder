function myFunction() {
  var githubToken = 'YOUR_TOKEN';
  var owner = 'OWNER_NAME'; 
  var repo = 'REPOSITORY_NAME'; 
  var senderEmail = 'MAIL_ADDRESS';
  var recipients = [];//insert recipients list

  var githubUrl = 'https://api.github.com/repos/' + owner + '/' + repo + '/issues';
  var githubOptions = {
    method: 'get',
    headers: {
      'Authorization': 'token ' + githubToken,
      'Accept': 'application/vnd.github.v3+json'
    },
    muteHttpExceptions: true
  };
  var githubResponse = UrlFetchApp.fetch(githubUrl, githubOptions);
  var issues = JSON.parse(githubResponse.getContentText());

  var date = new Date();
  var formattedDate = Utilities.formatDate(date, "JST", "YYYYMMdd");
  var title = 'GitHub Issues' + formattedDate;

  var doc = DocumentApp.create(title);
  var body = doc.getBody();

  var titleParagraph = body.appendParagraph(title);
  titleParagraph.setHeading(DocumentApp.ParagraphHeading.HEADING1);
  titleParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  var issuesByAssignee = {};

  issues.forEach(function (issue) {
    var assignees = issue.assignees;
    if (assignees.length === 0) {
      assignees = [{ login: "None" }];
    }

    assignees.forEach(function (assignee) {
      if (!issuesByAssignee[assignee.login]) {
        issuesByAssignee[assignee.login] = [];
      }
      issuesByAssignee[assignee.login].push(issue);
    });
  });

  Object.keys(issuesByAssignee).forEach(function (assignee) {
    body.appendParagraph(assignee)
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);

    issuesByAssignee[assignee].forEach(function (issue) {
      var emoji = '';
      issue.labels.forEach(function (label) {
        if (label.name === 'important') emoji += '💰';
        if (label.name === 'urgent') emoji += '🔥';
      });

      var issueNumber = issue.number;
      var paragraphText = "- " + emoji + issue.title + " #" + issueNumber;
      var paragraph = body.appendParagraph(paragraphText);

      var startPos = paragraphText.indexOf("#") + 1; 
      var endPos = paragraphText.length - 1;
      paragraph.editAsText().setLinkUrl(startPos, endPos, issue.html_url);
    });

    body.appendHorizontalRule(); 
  });
  doc.saveAndClose();

  var docFile = DriveApp.getFileById(doc.getId());
  var blob = docFile.getAs('application/pdf');
  var pdfName = title + '.pdf';
  blob.setName(pdfName);

  var subject = "Task List"; 
  var bodyEmail = "Here are the titles of the issues:\n" + "issueのリストです。";
 
  recipients.forEach(function (recipient) {
    sendEmail(recipient, subject, bodyEmail, senderEmail, blob);
  });

  docFile.setTrashed(true);
  var originalDoc = DriveApp.getFileById(doc.getId());
  originalDoc.setTrashed(true);
}

function sendEmail(to, subject, body, from, attachment) {
  MailApp.sendEmail({
    to: to,
    subject: subject,
    body: body,
    from: from,
    attachments: [attachment]
  });
}
