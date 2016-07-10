var dateFormat = require('dateformat');
var bodyParser = require("body-parser");
var express = require("express");
var schedule = require('node-schedule');
var SunCalc = require('suncalc');
var util = require('util');
var fs = require('fs');

var lctrl = require('./lctrl');
var lctrl_settings = require('./lctrl_settings');
//var home = new lctrl();

var mqtt    = require('mqtt');
var client  = mqtt.connect('mqtt://10.0.1.72');

var app = express();

var hours;
var thresh;
var disabled = false;
var hpl;
var this_hpl;

// define some functions
function loggit(message,level) {
	var now = dateFormat();
	
	console.log(now + " " + message);
}

// Connect to MQTT for device communication
client.on('connect', function () {
	loggit('MQTT client connected');
	client.subscribe('presence');
	client.subscribe('lrgroup');
});

function Scheduler() {
	this.jobs = [];
	this.jobNum = 0;
}

Scheduler.prototype.scheduleJob = function(time, cb, name) {
	var idx = typeof name == 'string' ? name : this.jobNum;
	
	this.jobs[idx] = schedule.scheduleJob(time,cb);
	this.jobNum++;
}

Scheduler.prototype.killJob = function(num) {
	this.jobs[num].cancel();
}

//variables for schedule
var rise,set,isDark = null;
var updateTimes = schedule.scheduleJob('0 0 1 * * *', function () {
	rise.cancel();
	set.cancel();
	setTimes();
});

function setTimes() {
	var now = new Date();
	var times = SunCalc.getTimes(new Date(), 37.3382, -121.8863);
	var sunrise = times.sunrise;
	var sunset = times.sunset;
	
	if (isDark === null) {
		var riseDiff = now - sunrise;
		var setDiff = now - sunset;
	
		if (riseDiff > 0 && setDiff < 0) {
			isDark = false;
		} else {
			isDark = true;
		}
	}
	
	var risecron = sunrise.getSeconds() + ' ' + sunrise.getMinutes() + ' ' + sunrise.getHours() + ' * * *';
	var setcron = sunset.getSeconds() + ' ' + sunset.getMinutes() + ' ' + sunset.getHours() + ' * * *';
	rise = schedule.scheduleJob(risecron, function () {
		if (lctrl.groups['Living Room'].activePreset == "DefaultDay" || lctrl.groups['Living Room'].activePreset == "DefaultNight" || lctrl.groups['Living Room'].activePreset == "Sunset") {
			lctrl.setGroupPreset('Living Room','Sunrise');
		}
		isDark = false;
		loggit('Sunrise');
	});
	set = schedule.scheduleJob(setcron, function () {
		if (lctrl.groups['Living Room'].activePreset == "DefaultDay" || lctrl.groups['Living Room'].activePreset == "DefaultNight" || lctrl.groups['Living Room'].activePreset == "Sunrise") {
			lctrl.setGroupPreset('Living Room','Sunset');
		}
		isDark = true;
		loggit('Sunset');
	});
	loggit('Times set. Sunrise:'+ sunrise +' Sunset:'+ sunset);
}

// Start Light Control
lctrl.init(function () {
	
	lctrl.createGroup('Master Bedroom',[1,4,5,'Night light']);
	
	var defaultDaySet = [
		{name:'all',states:{'white':[285,100]}}
	];
	var defaultNightSet = [
		{name:'all',states:{'white':[375,75]}}
	];

	lctrl.groups['Master Bedroom'].createPreset('DefaultDay','static',defaultDaySet);
	lctrl.groups['Master Bedroom'].createPreset('DefaultNight','static',defaultNightSet);
	
	var set = [
		{name:'1',states:{'hueBriSat':[49697,153,254]}},
		{name:'4',states:{'bri':1}},
		{name:'5',states:{'bri':1}},
		{name:'Night light',states:{'cmd':'on'}}
	];
	
	lctrl.groups['Master Bedroom'].createPreset('Relax','static',set);
	
	// Living room setup
	lctrl.createGroup('Living Room',[2,3,'lr_rgb']);
	
	var defaultDaySet = [
		{name:'2',states:{'white':[285,100]}},
		{name:'3',states:{'white':[285,100]}},
		{name:'lr_rgb',states:{'cmd':'off'}}
	];
	var defaultNightSet = [
		{name:'2',states:{'white':[375,75]}},
		{name:'3',states:{'white':[375,75]}},
		{name:'lr_rgb',states:{'cmd':'off'}}
	];
	
	// Default preset
	lctrl.groups['Living Room'].createPreset('DefaultDay','static',defaultDaySet);
	lctrl.groups['Living Room'].createPreset('DefaultNight','static',defaultNightSet);
	
	// Relax preset
	var set = [
		{name:'2',states:{'hueBriSat':[49697,153,254]}},
		{name:'3',states:{'hueBriSat':[14948,117,143]}},
		{name:'lr_rgb',states:{'rgb':[40,40,210]}}
	];
	lctrl.groups['Living Room'].createPreset('Relax','static',set); 
	
	// Sunrise/Sunset presets
	var fadeColorsRise = {
		startWhite:375,
		startBright:75,
		endWhite:255,
		endBright:100,
		duration:60
	}
	var fadeColorsSet = {
		startWhite:285,
		startBright:100,
		endWhite:375,
		endBright:75,
		duration:60
	}
	var setA = [
		{name:'all',states:fadeColorsRise}
	];
	lctrl.groups['Living Room'].createPreset('Sunrise','fadeWhite',setA);
	
	var setB = [
		{name:'all',states:fadeColorsSet}
	];
	lctrl.groups['Living Room'].createPreset('Sunset','fadeWhite',setB);
	
	setTimes();
	
	/* These are samples of other functionality I've built out but aren't being used directly here */
	//lctrl.setStates([1],{'hueBri':[49333,0]});
	//lctrl.setStates([1,4,5],{'hueBri':[49333,0]});
	//lctrl.setStates([4,5],{'cmd':'off'});
	
	//lctrl.setStates('Master Bedroom',{'hueBri':[49333,0]});
	//lctrl.setStates('Master Bedroom',{'cmd':'off'});
	//lctrl.setStates(['front porch'],{'cmd':'off'});
	//lctrl.setStates('Living Room',{'cmd':'on','hue':49333,'bri':50});
	
	//console.log(lctrl.groups['Living Room'].presets);
	
	//lctrl.lights['2'].getState();
	//lctrl.lights['3'].getState();
	//console.log(lctrl);
	
	//lctrl.setGroupPreset('Living Room','Relax');
		
	//lctrl.setStates(['front porch'],{'cmd':'off'});
	//lctrl.lights['2'].animate('flash',{count:2})
	//lctrl.lights['3'].animate('flash',{count:2})
	
	lctrl_settings.hours(function(h,t) {
		hours = h;thresh = t;
		
		var startDefault = isDark == true ? 'DefaultNight' : 'DefaultDay';
		
		lctrl.setGroupPreset('Living Room',startDefault);
		var temp = setTimeout(lctrl.setStates('Living Room',{'cmd':'off'},function(temp){}),2000);
		
		mqtt_listener();
		
		loggit('Light Control initialized');
		
		fs.writeFileSync('./data.json', util.inspect(lctrl.groups) , 'utf-8');
	});
	
	app.listen(3000,function () {
		loggit('HTTP service started on port 3000');
	});
});

function mqtt_listener() {
	client.on('message', function (topic, message) {
		switch (topic) {
			case "presence":				
				var data = JSON.parse(message.toString());
				
				// Living room motion detected
				if (data['entity'] == 'lr_motion') {
					loggit('Motion detected');
					
					var now = new Date();
					current_hour = now.getHours();
					hours.forEach(function(value,index) {
						if (value.indexOf(current_hour) != -1 && hpl != index) {
							hpl = index;
							this_hpl = index;
						}
					});
					
					if (disabled === false) {
						if (data['state'] == 'OPEN') {
							lctrl.setStates('Living Room',{'cmd':'on'},function(){});
							//client.publish('lrgroup','ON');
						} 
						
						var t = thresh[this_hpl]*1000;
						lctrl.delaySetGroupStates('Living Room',{'cmd':'off'},t, function(){
							//client.publish('lrgroup','OFF');	
						});
					}
				}
				break;
			
			case "lrgroup":
				console.log(message);
				if (message == "ON") {
					lctrl.setStates('Living Room',{'cmd':'on'},function(){});
				} else {
					lctrl.setStates('Living Room',{'cmd':'off'},function(){});
				}
				break;
		}
	});
}

// This stuff has to do with listening for a post request and making a change if needed from the API
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/setGroupPreset',function(req,res){
	var name;
	if (req.body.presetName == "Default") {
		name = isDark != false ? 'DefaultNight' : 'DefaultDay';
		if (req.body.groupName == "Living Room") disabled = false;
		var t = thresh[this_hpl]*1000;
		lctrl.delaySetGroupStates(req.body.groupName,{'cmd':'off'},t,function(){
			client.publish('lrgroup','OFF');
		});
	} else {
		name = req.body.presetName;
		if (req.body.groupName == "Living Room") disabled = true;
		lctrl.groups[req.body.groupName].clearDelay();
	}
	
	lctrl.setGroupPreset(req.body.groupName,name);
	res.end("{'status':'successful'}");
});

app.post('/setLightState',function(req,res) {
	lctrl.lights[req.body.light].setState(req.body.state,req.body.val);
	res.end("{'status':'successful'}");
});

app.post('/getState',function(req,res) {
	var data;
	
	if (typeof req.body.light != 'undefined') {
		lctrl.lights[req.body.light].getState(function(result) {
			data = JSON.stringify(result);
			res.end(data);
		});
	}
	
	if (typeof req.body.group != 'undefined') {
		lctrl.groups[req.body.group].getState(function(result) {
			data = JSON.stringify(result);
			res.end(data);
		});
	}
	
});

app.post('/getMotionState',function(req,res) {
	res.end(JSON.stringify(disabled));
});

app.post('/getLights',function(req,res) {
	res.end(JSON.stringify(lctrl.lights));
});

app.post('/getGroups',function(req,res) {
	var result = {}
	for (var key in lctrl.groups) {
		result[key] = lctrl.groups[key];
		result[key].delay = null;
	}
	res.end(JSON.stringify(result));
});

app.post('/findDevices',function(req,res) {
	lctrl.init(function() {
		res.end('{status:"successful"}')
	});
});

app.post('/savePreset',function(req,res) {
	
});

app.get('/', function (req,res) {
	res.sendFile('/home/aukteris/Documents/Node/home-lights/index.html');
});