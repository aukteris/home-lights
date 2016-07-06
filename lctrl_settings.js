var GoogleSpreadsheet = require("google-spreadsheet");
var async = require("async");

module.exports = {
	hours: function (cb) {
		// spreadsheet key is the long id in the sheets URL
		var doc = new GoogleSpreadsheet('13NSSu_rk9H74SsmTOOHhCkC4iX9O4itaKTz2k17MFIE');
		var sheet;
		var keys;
		var values;
		var hours = [];
		var thresh = [];
			
		async.series([
		  function setAuth(step) {
		    // see notes below for authentication instructions!
		    //var creds = require('./google-generated-creds.json');
		    // OR, if you cannot save the file locally (like on heroku)
		    var creds = {
		      client_email: 'app-settings-1297@appspot.gserviceaccount.com',
		      private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC1EZvvjddRoEp8\nXI5y6Ta9a0fOh+2Sme5K2DTvMELePbZ0/R8Ailguwa++TH8ld8XC1Ze02qng8Nij\nyYrpe0Q03jo9wkv8qn+wzwb2XXHnVdYH4FxX5j9ma68gThjHysE8aAuetGbsIgJq\ni7EFwjP2Da7TsGyCHp9wxomcn63zu3r5AXQcdavvBPcrsJKBu/Z1ZcBl82vwofpX\nt1pmiNhSb5GlmeqLxug5vm99Yu3reimX3l9o9S+EdIlUI7Au9awyJC0HKqz+xYxy\nfdYs9J+Z8UP0XxGjItiG8w8WJG9BFZmaNstxsUP8WrvfO71AYCVkZAyTHtFMufr4\nHOvsXbRPAgMBAAECggEAZ4eKAY64bpOYA0Nor4tpISUWCaDu1cPt3B2DJsARe8EN\nchbIgyaXBST5t3VFvcad7Kjz9RSRzWvocr3qD1XLye7GnklZ6T4ThKTa9kK3ve32\nUsqWAixEU+t+VppQ0Ou9USyseDHuJ1XKy+DTdtdznlx0edWGNWANCg564HLso062\nQK3l8xbt1KfKQIS2Vgk0r8BqKCZYQJvHpr2tmfHWGmOvZVTA0wAzb3oABwRy6yhi\nxgz/L/A+Sty8oaHYA+K4CC2qeyA1/oObBln5q7uu24XAYzC4sYjPq4Ojsz9oyKmG\nygjiVnWkqFR90J77Ish7f8qbRmg9mJ27lzNznRrnAQKBgQD5cIvAHNs/W3g033wq\nDW4fPd6FYx4oOzr+tlK+97IzU+npiwRRlLX+M5vxST/DG+KfS+wCs55AC/K9VElq\nzsv6XZKUg5wG7Qq0+UvSfGfy0YaaG7YxojzF7VRLWoO62IMdlK1eqCRHcEhgiu01\n9zDOerbyglwLVIgoScX5hgT/kwKBgQC51LqFpR4GZz3YijCJEGZAo2FzkwHcCW7L\n9G5OUYw0irKf9BRaY0Y2bsKiDMF8r3zGGVar3lWGyW3aAITV15BA8yLZKhHrmRjk\nFczLd1g+cQw/wZaKEmC1VJ/A9AJ0FH+T75Ft4oceAmPb10eryGUhg4pgIAo7zEjb\nuEsRVIoV1QKBgDqm3hV0M5F4PpGgIx/4PHaYI6SVo9et5bdSw64nq/0ptAy4JXHR\nV+HH3Nklchq8idMPFRWlioZgyNj/4qt8qLXcHsVRFPUD88qN++goXIDaB55g+bw9\n+7BGl9WIGQVsN5hTB1kEjFNH8ZzRzekskItci3wGbwIzBDkE78o2WyKFAoGBAJgh\ngyFt74qmcocXemx7NHquRlVrgBY20rG9xZ/wOqu48Erqcs8cfpqJSmWHs87zi15R\n2BaTyciylm/mBNlbxAioA1ttiYYqq6nt/t6DMYbM3Y5EWY1nRiysvqwkFu4Y6eie\nM5yV2q/CnSWYtF/5inFJUrsm/7m8n9jgovPpFbKRAoGATTJD8qLgCYhgnLnVGj9x\n84r9TU8FRljUGI3vm1IEhZkLXddORFIhPmV0vXnRkHpwUfKvBKTn9q+2blnliMo0\nGoiKw7h5YTyw5EdcYdh4FLFBkfYDorkSV2v9fsAjzP37pQ1/+mgWNwJD+SLXfztU\ng+9cLn5/gK+5bodxbzuBvLE=\n-----END PRIVATE KEY-----\n'
		    }
		 
		    doc.useServiceAccountAuth(creds, step);
		  },
		  function getInfoAndWorksheets(step) {
		    doc.getInfo(function(err, info) {
		      sheet = info.worksheets[1];
		      step();
		    });
		  },
		  function workingWithCells(step) {
			
		    sheet.getCells({
		      'min-row': 3,
		      'max-row': 20,
		      'min-col': 1,
		      'max-col': 1,
		      'return-empty': false
		    }, function(err, cells) {
		    	keys = cells;
		    	for (var i = 0, len = keys.length; i < len; i++) {
			    	hours[i] = [];
			    	thresh[i] = parseInt(keys[i].value);
		    	}
		    	step();
		    });
		  },
		  function workingWithCells(step) {
			var max = keys.length+2;
		    sheet.getCells({
		      'min-row': 3,
		      'max-row': max,
		      'min-col': 2,
		      'max-col': 25,
		      'return-empty': true
		    }, function(err, cells) {
		    	values = cells;
		    	hour = 0;
		    	keycount = 0;
		    	for (var i = 0, len = values.length; i < len; i++) {
			    	if (values[i].value == 'X') {
			    		hours[keycount].push(hour);
			    	}
			    	hour++;
			    	if (hour == 24) {
				    	keycount++;
				    	hour = 0;
			    	}
		    	}
		    	//var result = [hours,thresh];
		    	cb(hours,thresh);
		    	step();
		    });
		  }
		]);
	}
}