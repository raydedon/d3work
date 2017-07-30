/**
 * Created by Ray on 07-11-2016.
 */
module.exports = {
    processIssuesJSON: function(issuesJSON) {
        var result = [];
        for(var issueJSON in issuesJSON.issues) {
            var priorityName = issuesJSON.issues[issueJSON].fields.priority.name;
            var versionID = '15.9';
            for (var i = issuesJSON.issues[issueJSON].fields.versions.length; i > 0; i--) {
                if (parseFloat(issuesJSON.issues[issueJSON].fields.versions[i - 1].name) >= 15.9) {
                    versionID = issuesJSON.issues[issueJSON].fields.versions[i - 1].name;
                } else {
                    break;
                }
            }
            console.log("issueId: " + issuesJSON.issues[issueJSON].id + ", priorityName: " + priorityName + ", versionID: " + versionID);
            result.push({ 'priorityName' : priorityName, 'versionID' : versionID, 'issueId': issuesJSON.issues[issueJSON].id });
        }
        console.log('inner data: ' + JSON.stringify(result));
        return { 'startAt': issuesJSON.startAt, 'maxResults': issuesJSON.maxResults, 'total': issuesJSON.total, 'result': result };
    }
}
