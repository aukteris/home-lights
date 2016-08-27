var dateFormat = require('dateformat');
var bodyParser = require("body-parser");
var express = require("express");
var schedule = require('node-schedule');
var SunCalc = require('suncalc');
var util = require('util');
var fs = require('fs');
var path = require('path');
var storage = require('node-persist');
var uuid = require('./').uuid;
var Bridge = require('./').Bridge;
var Accessory = require('./').Accessory;
var Service = require('./').Service;
var Characteristic = require('./').Characteristic;
var accessoryLoader = require('./HAP-NodeJS/lib/AccessoryLoader');

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
var accObj;

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
		{name:'all',states:{'white':[285,100]},type:'static'}
	];
	var defaultNightSet = [
		{name:'all',states:{'white':[375,75]},type:'static'}
	];

	lctrl.groups['Master Bedroom'].createPreset('DefaultDay',defaultDaySet);
	lctrl.groups['Master Bedroom'].createPreset('DefaultNight',defaultNightSet);
	
	var set = [
		{name:'1',states:{'hueBriSat':[49697,153,254]},type:'static'},
		{name:'4',states:{'bri':1},type:'static'},
		{name:'5',states:{'bri':1},type:'static'},
		{name:'Night light',states:{'cmd':'on'},type:'static'}
	];
	
	lctrl.groups['Master Bedroom'].createPreset('Relax',set);
	
	// Living room setup
	lctrl.createGroup('Living Room',[2,3,'lr_rgb']);
	
	var defaultDaySet = [
		{name:'2',states:{'white':[285,100]},type:'static'},
		{name:'3',states:{'white':[285,100]},type:'static'},
		{name:'lr_rgb',states:{'cmd':'off'},type:'static'}
	];
	var defaultNightSet = [
		{name:'2',states:{'white':[375,75]},type:'static'},
		{name:'3',states:{'white':[375,75]},type:'static'},
		{name:'lr_rgb',states:{'cmd':'off'},type:'static'}
	];
	
	// Default preset
	lctrl.groups['Living Room'].createPreset('DefaultDay',defaultDaySet);
	lctrl.groups['Living Room'].createPreset('DefaultNight',defaultNightSet);
	
	// Relax preset
	var set = [
		{name:'2',states:{'hueBriSat':[49697,153,254]},type:'static'},
		{name:'3',states:{'hueBriSat':[14948,117,143]},type:'static'},
		{name:'lr_rgb',states:{'rgb':[40,40,210]},type:'static'}
	];
	lctrl.groups['Living Room'].createPreset('Relax',set); 
	
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
		{name:'all',states:fadeColorsRise,type:'fadeWhite'}
	];
	lctrl.groups['Living Room'].createPreset('Sunrise',setA);
	
	var setB = [
		{name:'all',states:fadeColorsSet,type:'fadeWhite'}
	];
	lctrl.groups['Living Room'].createPreset('Sunset',setB);
	
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
		
		loggit("HAP-NodeJS starting...");

		// Initialize our storage system
		storage.initSync();
		
		// Start by creating our Bridge which will host all loaded Accessories
		var bridge = new Bridge('Home Bridge', uuid.generate("Home Bridge"));
		
		// Listen for bridge identification event
		bridge.on('identify', function(paired, callback) {
		  console.log("Home Bridge identify");
		  callback(); // success
		});
		
		// Load up all accessories in the /accessories folder
		accObj = [];
		var accessories = [];
		
		for (var key in lctrl.lights) {
			accObj[key] = new accessory(key);
			accessories.push(accObj[key].light);
		}
		
		accessories = processAccessories(accessories);

		// Add them all to the bridge
		accessories.forEach(function(accessory) {
			//console.log(accessory);
			//console.log(accessory.services[1].characteristics[2]);
		  bridge.addBridgedAccessory(accessory);
		});
		console.log(Bridge);
		// Publish the Bridge on the local network.
		bridge.publish({
		  username: "EC:22:3C:E3:CD:F7",
		  port: 51826,
		  pincode: "031-45-154",
		  category: Accessory.Categories.BRIDGE
		});
		//fs.writeFileSync('./data.json', util.inspect(lctrl.groups) , 'utf-8');
		loggit('HAP-NodeJS started');
	});
	
	app.listen(3300,function () {
		loggit('HTTP service started on port 3000');
	});
});

function processAccessories(accessories) {
	return accessories.map(function(accessory) {
		return (accessory instanceof Accessory) ? accessory : accessoryLoader.parseAccessoryJSON(accessory);
	});
}

function accessory(lightNum) {
	
		this.lightNum = lightNum;
		
		// Generate a consistent UUID for our light Accessory that will remain the same even when
		// restarting our server. We use the `uuid.generate` helper function to create a deterministic
		// UUID based on an arbitrary "namespace" and the word "light".
		var lightUUID = uuid.generate('hap-nodejs:accessories:'+this.lightNum);
		
		// This is the Accessory that we'll return to HAP-NodeJS that represents our fake light.
		this.light = new Accessory('Light', lightUUID);

		this.light.username = "1A:2B:3C:4D:5E:FF";
		this.light.pincode = "031-45-154";

		// set some basic properties (these values are arbitrary and setting them is optional)
		this.light
		  .getService(Service.AccessoryInformation)
		  .setCharacteristic(Characteristic.Manufacturer, "Oltica")
		  .setCharacteristic(Characteristic.Model, "Rev-1")
		  .setCharacteristic(Characteristic.SerialNumber, "A1S2NASF88EW");
		
		// listen for the "identify" event for this Accessory
		this.light.on('identify', function(paired, callback) {
		  identify(this.lightNum);
		  callback(); // success
		});
		
		var name = this.lightNum;
		// Add the actual Lightbulb Service and listen for change events from iOS.
		// We can see the complete list of Services and Characteristics in `lib/gen/HomeKitTypes.js`
		this.light
		  .addService(Service.Lightbulb, this.lightNum) // services exposed to the user should have "names" like "Fake Light" for us
		  .getCharacteristic(Characteristic.On)
		  .on('set', function(value, callback) {
			loggit(name);
		    setPowerOn(value,name);
		    callback(); // Our fake Light is synchronous - this value has been successfully set
		  });
		
		// We want to intercept requests for our current power state so we can query the hardware itself instead of
		// allowing HAP-NodeJS to return the cached Characteristic.value.
		this.light
		  .getService(Service.Lightbulb)
		  .getCharacteristic(Characteristic.On)
		  .on('get', function(callback) {
		    
		    // this event is emitted when you ask Siri directly whether your light is on or not. you might query
		    // the light hardware itself to find this out, then call the callback. But if you take longer than a
		    // few seconds to respond, Siri will give up.
		    
		    var err = null; // in case there were any problems
			
			if (checkOn(name) == true) {
				loggit("Are we on? Yes.");
				callback(err, true);
			} else {
				loggit("Are we on? No.");
				callback(err, false);
			}
		  });

		if (lctrl.lights[this.lightNum].tech == "Hue" || lctrl.lights[this.lightNum].tech == "Dan Light") {
			// also add an "optional" Characteristic for Brightness
			this.light
			  .getService(Service.Lightbulb)
			  .addCharacteristic(Characteristic.Brightness)
			  .on('get', function(callback) {
			  	//var bri = (lctrl.lights[name].bri/255) * 100;
			    callback(null, lctrl.lights[name].bri);
			  })
			  .on('set', function(value, callback) {
			  	var bri = (value/100) * 255;
			    lctrl.setStates([name],{'bri':bri},function() {
		
				});
			    callback();
			  });

			if (lctrl.lights[this.lightNum].color == true) {
				this.light
				  .getService(Service.Lightbulb)
				  .addCharacteristic(Characteristic.Hue)
				  .on('get', function(callback) {
				  	//var bri = (lctrl.lights[name].hue/255) * 100;
				    callback(null, lctrl.lights[name].hue);
				  })
				  .on('set', function(value, callback) {
				  	//var hue = (value/100) * 255;
				    lctrl.setStates([name],{'hue':value},function() {
			
					});
				    callback();
				  });

				this.light
				  .getService(Service.Lightbulb)
				  .addCharacteristic(Characteristic.Saturation)
				  .on('get', function(callback) {
				  	//var bri = (lctrl.lights[name].hue/255) * 100;
				    callback(null, lctrl.lights[name].sat);
				  })
				  .on('set', function(value, callback) {
				  	//var hue = (value/100) * 255;
				    lctrl.setStates([name],{'sat':value},function() {
			
					});
				    callback();
				  });
			}
		}
		
		if (lctrl.lights[this.lightNum].tech == "Dan Light") {
				
		}
		  
}

function checkOn(name) {
	return lctrl.lights[name].on == true;
}

function setPowerOn(on,name) {
	var cmd = on ? "on" : "off";
	lctrl.setStates([name],{'cmd':cmd},function() {
		
	});
}

function identify(name) {
	console.log("Identify the light!");
}

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
							client.publish('lightupdate','{"light":2,"state":"cmd","val":"on"}');
							client.publish('lightupdate','{"light":3,"state":"cmd","val":"on"}');
						} 
						
						var t = thresh[this_hpl]*1000;
						lctrl.delaySetGroupStates('Living Room',{'cmd':'off'},t, function(){
							//client.publish('lrgroup','OFF');
							client.publish('lightupdate','{"light":2,"state":"cmd","val":"off"}');
							client.publish('lightupdate','{"light":3,"state":"cmd","val":"off"}');
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
		
		if (req.body.groupName == "Living Room") {
			disabled = false;
			var t = thresh[this_hpl]*1000;
			lctrl.delaySetGroupStates(req.body.groupName,{'cmd':'off'},t,function(){
				
			});
		}
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
	
	var data = JSON.stringify({
		"light":req.body.light,
		"state":req.body.state,
		"val":req.body.val
	});
	
	client.publish('lightupdate',data);
	loggit(data);
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
	res.end('{status:"successful"}');
});

app.post('/setMotionState',function(req,res) {
	var disVal = req.body.disabled == 'true';
	disabled = disVal;
	res.end('{status:"successful"}');
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
		res.end('{status:"successful"}');
	});
});

app.post('/savePreset',function(req,res) {
	
});

app.get('/', function (req,res) {
	res.sendFile('/home/aukteris/Documents/Node/home-lights/index.html');
});