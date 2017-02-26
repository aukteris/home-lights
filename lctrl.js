var hue = require("node-hue-api"),
	HueApi = hue.HueApi,
	lightState = hue.lightState;
var Wemo = require('wemo-client');
var dateFormat = require('dateformat');

var hostname = "10.0.1.3",
	username = "pucuzePjlQkG1pblTsFrujXxVxA07C9LPXxdc-Uy",
	api;

var mqtt = require('mqtt');
var mclient  = mqtt.connect('mqtt://10.0.1.72');

// Connect to MQTT for device communication
mclient.on('connect', function () {
	loggit('MQTT client connected');
	mclient.subscribe('danDevices');
});

api = new HueApi(hostname, username);

// define some functions
function loggit(message,level) {
	var now = dateFormat();
	
	console.log(now + " " + message);
}

var displayResult = function(result) {
	//console.log(JSON.stringify(result, null, 2));
	//loggit(result);
}

// device functions
function findDevices(cb) {
	api.getFullState(function(err, config) {
		if (err) throw err;
		
		//console.log(config.lights);
		
		for (var key in config.lights) {
			try {
			    // skip loop if the property is from prototype
			    if (!config.lights.hasOwnProperty(key)) continue;
			    loggit('Hue Device Found: ' + key);
			    
			    var obj = config.lights[key];
			    var light = new Light('Hue',key);
			    
			    if (typeof(obj.state['hue']) != 'undefined') light.color = true;
			    
			    var r = [key,light];
			    cb(r);
		    } catch (err) {
			    loggit(err);
		    }
		}
		
		// setup wemo
		var wemo = new Wemo();
		wemo.discover(function(deviceInfo) {
			try {
				loggit('Wemo Device Found: ' + deviceInfo['friendlyName']);
				
				// Get the client for the found device
				var client = wemo.client(deviceInfo);
				
				switch (deviceInfo['deviceType']) {
					case "urn:Belkin:device:controllee:1":
					case "urn:Belkin:device:insight:1":
						var light = new Light('Wemo Insight Switch',deviceInfo['friendlyName']);
						light.wemoDevice = client;
						var r = [deviceInfo['friendlyName'],light];
						cb(r);
						
						break;
						
					case "urn:Belkin:device:bridge:1":
						client.getEndDevices(function(err, endDeviceInfo) {
							
							for (var key in endDeviceInfo) {
								loggit('Wemo Device Found: ' + endDeviceInfo[key]['friendlyName']);
								
								var light = new Light('Wemo Light',endDeviceInfo[key]['friendlyName']);
								light.wemoBridge = endDeviceInfo[key]['deviceId'];
								light.wemoDevice = client;
								var r = [endDeviceInfo[key]['friendlyName'],light];
								
								cb(r);
							}
							
						});
						
						break;
				}
			} catch(err) {
				loggit(err);
			}
			
		});
		
		// Setup dan lights
		var message = JSON.stringify({'mode':'find'});
		mclient.publish('danDevices', message);
		
		mclient.on('message', function (topic, message) {
			if (topic == "danDevices") {
				var data = JSON.parse(message.toString());
				
				switch (data['mode']) {
					case "findResponse":
						loggit('Dan Device Found: ' + data['name']);
						
						var light = new Light('Dan Light',data['name']);
		    			light.color = true;
		    			
		    			var r = [data['name'],light];
						cb(r);
						
						break;	
				}
			}
		});
	});
}

function appendStates(existStates,newState,cb) {
	var appended = {};
	
	var obj = existStates;
	for (var key in obj) {
	    // skip loop if the property is from prototype
	    if (!obj.hasOwnProperty(key)) continue;
	    
	    appended[key] = obj[key];
	}
	
	var obj = newState;
	for (var key in obj) {
	    // skip loop if the property is from prototype
	    if (!obj.hasOwnProperty(key)) continue;
	    
	    appended[key] = obj[key];
	}
	
	cb(appended);
}

// Animation functions
function hueFlash() {
	var tempstate = lightState.create().alertShort();
	api.setLightState(this.name, tempstate)
		.then(displayResult)
		.done();
}

function fadeWhiteTime(oWhite,oBri,cInt,bInt,frames,cb) {
	this.startWhite += oWhite > this.endWhite ? -cInt : cInt;
	this.startBright += oBri > this.endBright ? -bInt : bInt;
	this.activePreset = {'white':[this.startWhite,this.startBright]};

	
	if (this.on == true && retrn.reachable == true) {
		this.setState('white',[this.startWhite,this.startBright]);
	}
	this.tick++;
	if (frames==this.tick) {
		clearInterval(this.timeout);
		cb();
	}
}

function fadeWhite(startColor,startBri,endColor,endBright,duration,cb) {
	var self = this;
	
	colorDiff = Math.abs(startColor-endColor);
	brightDiff = Math.abs(startBri-endBright);
	var frames = duration>colorDiff ? duration : colorDiff;
	if (frames == 0) frames = duration;
	
	setTime = ((duration*1000) / frames);
	this.startWhite = startColor;
	this.startBright = startBri;
	this.endWhite = endColor;
	var colorInterval = colorDiff/frames;
	var brightInterval = brightDiff/frames;
	this.tick = 0;

	try {
		this.timeout = setInterval(function() {
			fadeWhiteTime.call(self,startColor,startBri,colorInterval,brightInterval,frames,cb);
		}, setTime);
	} catch(err) {
		loggit(err);
	}	
}

function HSVtoRGB(hi, si, vi) {
	var h = hi/360;
	
	var s = si/100;
	
	var v = vi/100;
	
    var r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

function RGBtoHSV(r, g, b) {
    if (arguments.length === 1) {
        g = r.g, b = r.b, r = r.r;
    }
    var max = Math.max(r, g, b), min = Math.min(r, g, b),
        d = max - min,
        h,
        s = (max === 0 ? 0 : d / max),
        v = max / 255;

    switch (max) {
        case min: h = 0; break;
        case r: h = (g - b) + d * (g < b ? 6: 0); h /= 6 * d; break;
        case g: h = (b - r) + d * 2; h /= 6 * d; break;
        case b: h = (r - g) + d * 4; h /= 6 * d; break;
    }

    return {
        h: h,
        s: s,
        v: v
    };
}

function rgbToHsl(r, g, b) {
  r /= 255, g /= 255, b /= 255;

  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }

    h /= 6;
  }

  return [ h, s, l ];
}

// light object
function Light(tech,name) {
	this.tech = tech;
	this.name = name;
	this.color = false;
	this.wemoBridge;
	this.wemoDevice;
	this.activePreset = null;
	this.presetName = null;
	this.on = false;

	this.hue = 360;
	this.sat = 100;
	this.bri = 100;
	this.rgb;
	
	// fade animation variables
	this.startWhite;
	this.startBright;
	this.endWhite;
	this.tick = 0;
	this.timeout;
}

Light.prototype.setState = function(state,val) {
	var onState;
	var wemoOnState = null;
	var dansState = null;
	var loadPreset = false;
	
	switch(state) {
		case "bri":
			onState = lightState.create().bri(val).on();
			this.bri = (val/255)*100;
			
			var inRGB = HSVtoRGB(this.hue,this.sat,this.bri);
			dansState = [inRGB['r'],inRGB['g'],inRGB['b']];
			this.on = true;
			this.activePreset = null;
			break;
			
		case "rgb":
			onState = this.color === true ? lightState.create().rgb(val).on() : lightState.create().on();
			this.on = true;
			dansState = val;
			break;
		
		case "hueBriSat":
			onState = this.color === true ? lightState.create().hue(val[0]).bri(val[1]).sat(val[2]).on() : lightState.create().bri(val[1]).on();
			this.hue = val[0];
			this.bri = (val[1]/255)*100;
			this.sat = val[2];

			this.on = true;
			break;


		case "hue":
			this.hue = val;
			onState = this.color === true ? lightState.create().hsb(this.hue,this.sat,this.bri).on() : lightState.create().bri(val[1]).on();
			var inRGB = HSVtoRGB(this.hue,this.sat,this.bri);
			dansState = [inRGB['r'],inRGB['g'],inRGB['b']];
			this.on = true;
			this.activePreset = null;
			break;

		case "sat":
			this.sat = val;
			onState = this.color === true ? lightState.create().hsb(this.hue,this.sat,this.bri).on() : lightState.create().bri(val[1]).on();
			var inRGB = HSVtoRGB(this.hue,this.sat,this.bri);
			dansState = [inRGB['r'],inRGB['g'],inRGB['b']];
			this.on = true;
			this.activePreset = null;
			break;
			
		case "white":
			var temp = val[1] * 2.55;
			this.bri = val[1];
			
			onState = this.color === true ? lightState.create().white(val[0],val[1]).on() : lightState.create().bri(temp).on();
			
			this.on = true;
			
			wemoOnState = 1;
			break;
		
		case "cmd":
			switch(val) {
				case "off":
					onState = lightState.create().off();
					wemoOnState = 0;
					dansState = [0,0,0];
					this.on = false;
					
					break;
					
				case "on":
					if (this.activePreset === null) {
						onState = lightState.create().on();
						var inRGB = HSVtoRGB(this.hue,this.sat,this.bri);
						dansState = [inRGB['r'],inRGB['g'],inRGB['b']];
						this.on = true;
					} else {
						loadPreset = true;
						for (var key in this.activePreset) {
							
						    // skip loop if the property is from prototype
						    if (!this.activePreset.hasOwnProperty(key)) continue;
						    
						    if (key == 'cmd' && this.activePreset[key] == 'on') {
						    	loadPreset = false;
						    	onState = lightState.create().on();
						    	this.on = true;
						    } else {
						    	Light.prototype.setState.call(this,key,this.activePreset[key]);	
						    }
						}
					}
					
					wemoOnState = 1;
					break;
			}
			break;
			
		default:
			loggit('State not recognized: '+ state);
			break;
	}
	
	if (loadPreset != true) {
		try {
			switch (this.tech) {
				case "Hue":
					api.setLightState(this.name, onState)
						.then(displayResult)
						.done();
						
					break;
					
				case "Wemo Insight Switch":
					if (wemoOnState !== null) {
						this.wemoDevice.setBinaryState(wemoOnState);
					}
					break;
					
				case "Wemo Light":
					if (wemoOnState !== null) {
						this.wemoDevice.setDeviceStatus(this.wemoBridge,"10006",wemoOnState);
					}
					break;
				
				case "Dan Light":
					if (dansState !== null) {
						var message = JSON.stringify({'mode':'changeState','name':this.name,'r':dansState[0],'g':dansState[1],'b':dansState[2]});
						mclient.publish('danDevices',message);
						loggit('dans light called');
					}
					break;
			}
		} catch(err) {
			loggit(err);
		}
	}
}

Light.prototype.getState = function(cb) {
	var self = this;
	switch (this.tech) {
		case "Hue":
			if (this.color != true) {
				api.lightStatus(this.name)
					.then(function(status){
						var result = {
							on:status.state['on'],
							reachable:status.state['reachable'],
							bri:status.state['bri'],
							preset:self.activePreset,
							color:self.color
						}
						
						self.on = result.on;
						self.bri = (result.bri/255)*100;
						cb();
					}).done();
			} else {
				api.lightStatusWithRGB(this.name)
					.then(function(status){
						var result = {
							on:status.state['on'],
							reachable:status.state['reachable'],
							hue:status.state['hue'],
							sat:status.state['sat'],
							bri:status.state['bri'],
							rgb:status.state['rgb'],
							preset:self.activePreset,
							color:self.color
						}
						
						var hsb = rgbToHsl(result.rgb[0],result.rgb[1],result.rgb[2]);
						console.log(hsb);
						self.on = result.on;
						self.bri = (result.bri/255)*100;
						self.hue = hsb[0]*360;
						self.sat = (result.sat/255)*100;
						cb();
					}).done();
			}
				
			break;
		/*
		case "Wemo Insight Switch":
			this.wemoDevice.getBinaryState(function(err, on) {
				var state = on == 1;
				
				self.on = state;
				cb();
			});
			
			break;
		*/
		case "Wemo Light":
			this.wemoDevice.getDeviceStatus(this.wemoBridge,function(err, deviceStatus) {
				var state = deviceStatus['10006'] == 1;
				
				self.on = state;
				cb();
			});
				
			break;
			
		default:
			var result = {
				on:this.on
			}
			
			this.on = result.on;
			cb();
			break;
	}
}

Light.prototype.animate = function(ani,config,cb) {
	var self = this;
	switch(ani) {
		case "flash":
			switch(this.tech) {
				case "Hue":
					var flashit = function() {hueFlash.call(self);}
					var wait = 900;
					var r = [];
					
					for (var i = 0; i < config['count']; i++) {
						var twait = wait*i;
						r[i] = setTimeout(flashit,twait);
					}
					
					break;
			}
			break;
			
		case "fadeWhite":
			fadeWhite.call(self, config['startWhite'], config['startBright'], config['endWhite'], config['endBright'], config['duration'], cb);
			break;
	}
}

function Preset(name,lConf) {
	this.name = name;
	this.lConf = lConf;
}

// group object
function Group(name,lights) {
	this.name = name;
	this.lights = lights;
	this.activePreset;
	this.presets = {};
	this.delay = null;
}

Group.prototype.createPreset = function(name,lConf) {
	this.presets[name] = new Preset(name,lConf);
}

Group.prototype.clearDelay = function() {
	clearTimeout(this.delay);
}

Group.prototype.getState = function(cb) {
	var self = this;
	var result = {
		name:this.name,
		lights:this.lights,
		activePreset:this.activePreset,
		presets:this.presets
	}
	console.log(self);
	cb(result);
}

// lightCtrl object
function lightCtrl() {
	this.lights = {};
	this.groups = {};
}

lightCtrl.prototype.init = function(cb) {;
	var self = this;
	
	findDevices(function(l) {
		self.lights[l[0]] = l[1];
	});
	
	var temp = setTimeout(cb,2000);
}

lightCtrl.prototype.createGroup = function(name,lights) {
	this.groups[name] = new Group(name,lights);
}

lightCtrl.prototype.setGroupPreset = function(group,preset) {
	try {
		var self = this;
		
		// Reset all presets for the lights in the group
		this.groups[group].lights.forEach(function(light) {
			self.lights[light].activePreset = null;
		});
		
		clearTimeout(self.groups[group].delay);
		
		this.groups[group].presets[preset].lConf.forEach(function(value) {
			var lgts;
			
			switch (value.type) {
				case "static":
					if (value.name == 'all') {
						lgts = self.groups[group].lights;
						
						lgts.forEach(function(light) {
							appendStates(self.lights[light].activePreset,value.states,function(result) {
								self.lights[light].activePreset = result;
							});
						});
					} else {
						lgts = [value.name];
						appendStates(self.lights[value.name].activePreset,value.states,function(result) {
							self.lights[value.name].activePreset = result;
						});
					}
					
					lightCtrl.prototype.setStates.call(self,lgts,value.states,function(){});
					break;
					
				case "fadeWhite":
					if (value.name == 'all') {
						lgts = self.groups[group].lights;
					} else {
						lgts = [value.name];
					}
					
					lgts.forEach(function(light) {
						self.lights[light].animate('fadeWhite',value.states,function(r) {
							loggit('fadeWhite animation completed');
						})
					});
					break;
			}
		});
		this.groups[group].activePreset = preset;
		
		clearTimeout(this.groups[group].delay);
	} catch(err) {
		loggit(err);
	}
}

lightCtrl.prototype.setStates = function(lg,states,cb) {
	var self = this;
	lts = typeof(lg) == 'string' ? self.groups[lg].lights : lg;
	
	lts.forEach(function(value) {
		for (var key in states) {
		    // skip loop if the property is from prototype
		    if (!states.hasOwnProperty(key)) continue;
		    
			self.lights[value].setState(key,states[key]);
		}
	});
	cb();
}

lightCtrl.prototype.delaySetGroupStates = function(lg,states,delay,cb) {
	try {
		var self = this;
		if (typeof(lg) != 'string') throw 'Only works for groups';
		
		var delayed = function() {
			lightCtrl.prototype.setStates.call(self,lg,states,cb);
		}
		clearTimeout(self.groups[lg].delay);
		self.groups[lg].delay = setTimeout(delayed,delay);
		
	} catch(err) {
		loggit(err);
	}
}

module.exports = new lightCtrl();