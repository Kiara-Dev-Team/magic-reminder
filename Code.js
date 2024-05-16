var githubToken = 'YOUR_TOKEN';
var owner = 'OWNER_NAME'; 
var repo = 'REPOSITORY_NAME'; 
var senderEmail = 'MAIL_ADDRESS';
var recipients = [];


function myFunction() {
  reset();
  getEvents();
  getComments();
  var chartFile = exportChart();
  reminder(chartFile);
}

function reminder(chartFile) {
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
        if (label.name === '$10000+') emoji += '🟥 🟥';
        if (label.name === '$1000+') emoji += '🟥';
        if (label.name === '$100+') emoji += '🟨';
        if (label.name === 'nego') emoji += '🟧';
        if (label.name === 'urgent') emoji += '🟪';
        if (label.name === 'routine') emoji += '🟩';
        if (label.name === 'idea') emoji += '💡';
        if (label.name === 'bug') emoji += '🟦';
        if (label.name === 'must do in long run') emoji += '❤️';
        if (label.name === 'typeform') emoji += '♠️';
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
  var fileList = [blob,chartFile.getAs(MimeType.PNG)];

  recipients.forEach(function (recipient) {
    sendEmail(recipient, subject, bodyEmail, senderEmail, fileList);
  });

  docFile.setTrashed(true);
  var originalDoc = DriveApp.getFileById(doc.getId());
  originalDoc.setTrashed(true);
}

function sendEmail(to, subject, body, from, fileList) {
  MailApp.sendEmail({
    to: to,
    subject: subject,
    body: body,
    from: from,
    attachments: fileList
  });
}


function reset() {
  var sheet2 = ss.getSheetByName('Sheet2');
  var lastRow = sheet2.getLastRow();

  if (lastRow > 1) {
    sheet2.getRange(2, 1, lastRow - 1, 8).clearContent();
  }
}

function exportChart() {
  var pivotSheet = ss.getSheetByName('PivotTable');
  var charts = pivotSheet.getCharts();

  var blob = charts[0].getAs('image/png'); 
  blob.setName('Chart.png');
  var file = DriveApp.createFile(blob);

  return file;
}

function getEvents() {
  var githubUrl = 'https://api.github.com/repos/' + owner + '/' + repo + '/issues/events';
  var githubOptions = {
    method: 'get',
    headers: {
      'Authorization': 'token ' + githubToken,
      'Accept': 'application/vnd.github.v3+json'
    },
    muteHttpExceptions: true
  };
  var githubResponse = UrlFetchApp.fetch(githubUrl, githubOptions);
  var events = JSON.parse(githubResponse.getContentText());

  events.forEach(function (event) {
    var issueNum = event.issue.number;
    var actor = event.actor.login;
    var action = event.event;
    var detail = "";
    if (action === "labeled") {
      detail = "label as " + event.label.name;
    } else if (action === "subscribed") {
      detail = event.issue.title;
    }
    var createdTime = convertDateString(event.created_at);
    var id = event.node_id;

    var lastRow = sheet2.getLastRow();
    var nextRow = lastRow + 1;
    setValue(nextRow, id, actor, issueNum, action, detail, createdTime);
  })
}

function getComments() {
  var githubUrl = 'https://api.github.com/repos/' + owner + '/' + repo + '/issues/comments';
  var githubOptions = {
    method: 'get',
    headers: {
      'Authorization': 'token ' + githubToken,
      'Accept': 'application/vnd.github.v3+json'
    },
    muteHttpExceptions: true
  };
  var githubResponse = UrlFetchApp.fetch(githubUrl, githubOptions);
  var comments = JSON.parse(githubResponse.getContentText());

  comments.forEach(function (comment) {
    var issueNum = comment.issue_url.split('/').pop();
    var actor = comment.user.login;
    var action = "comment";
    var detail = comment.body;
    var createdTime = convertDateString(comment.created_at);
    var id = comment.node_id;
    var lastRow = sheet2.getLastRow();
    var nextRow = lastRow + 1;
    setValue(nextRow, id, actor, issueNum, action, detail, createdTime);
  })
}

function setValue(nextRow, id, actor, issueNum, action, detail, createdTime) {
  sheet2.getRange(nextRow, 2).setValue(id);
  sheet2.getRange(nextRow, 3).setValue(repo);
  sheet2.getRange(nextRow, 4).setValue(actor);          
  sheet2.getRange(nextRow, 5).setValue(issueNum);      
  sheet2.getRange(nextRow, 6).setValue(action);        
  sheet2.getRange(nextRow, 7).setValue(detail);         
  sheet2.getRange(nextRow, 8).setValue(createdTime);    
}

function convertDateString(dateString) {
  var date = new Date(dateString);

  var year = date.getFullYear();
  var month = ('0' + (date.getMonth() + 1)).slice(-2);
  var day = ('0' + date.getDate()).slice(-2);
  var formattedDate = year + month + day;

  return formattedDate;
}