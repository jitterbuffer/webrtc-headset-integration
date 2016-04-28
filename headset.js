//Plantronics functions

//Settings requests that get sent to the device
var SETTING_DEVICE_INFO = {
		    type:"setting",
		    id:"0X0F02"};

var SETTING_USERNAME = {
		    type:"setting",
		    id:"0X0F03"};


//Events that get generated from the device
var EVENT_ACCEPT_CALL ={
	    type:"event",
	    id:"0X0E0C"};

var EVENT_CALL_TERMINATE ={
	    type:"event",
	    id:"0X0E11"};

var EVENT_BUTTON_PRESS = {
	    type:"event",
	    id:"0X0600"};

var EVENT_WEAR_STATE_CHANGED = {
	    type:"event",
	    id:"0X0200"};

var EVENT_PROXIMITY = {
	    type:"event",
	    id:"0X0100"};

//Commands that get sent to the device
var COMMAND_RING_HEADSET = {
	    type:"command",
	    id:"0X0D08",
            payload:{callId:1, offer:""}};

var COMMAND_STOP_RINGING_HEADSET = {
	    type:"command",
	    id:"0X0D09",
            payload:{offer:"", callId:1}};

var COMMAND_HANGUP_HEADSET = {
	    type:"command",
	    id:"0X000C",
            payload:{callId:1}};

var COMMAND_MUTE_HEADSET = {
	    type:"command",
	    id:"0X0D0A"};

var COMMAND_UNMUTE_HEADSET = {
	    type:"command",
	    id:"0X0D0B"};

var sfstate = "TINIT";

//one more global .. sorry BOM
plantronicsSocket = null;
plantronicsHeadset = null;

CALL_REQUEST = 102;
INIT_STATE = 103;

var spokes = new Spokes("https://127.0.0.1:32018/Spokes");
var plugin_name = "Micollab";


//Polling function, called every second to update the event lists
setInterval(function () {
   if (sfstate !== "TINIT") {
      //Show on UI that polling is happening
      //     displayPolling();

      //get events generated from the device
      spokes.Plugin.callEvents(plugin_name, function (result) {
         parsePLTMessage(result, true, "CallEvents");
      });
      //get any requests for calls from the device
      spokes.Plugin.callRequests(plugin_name, function (result) {
         parsePLTMessage(result, true, "CallRequest");
      });
   }
}
    , 1000); //1 second on the callback

function muteHeadset (isMuted) {
  if(!plantronicsSocket){
	  return;
  }

  if(isMuted) {
	  console.log("muting headset");
	  plantronicsSocket.send(JSON.stringify(COMMAND_MUTE_HEADSET));
  } else{
    console.log("unmuting headset");
    plantronicsSocket.send(JSON.stringify(COMMAND_UNMUTE_HEADSET));
    }
}

function ringHeadset (startRinging, offer) {
  if(!offer){
   return;
  }
  // if(startRinging){
	  // console.log("ringing headset");
	  // COMMAND_RING_HEADSET.payload.offer = offer;
	  // plantronicsSocket.send(JSON.stringify(COMMAND_RING_HEADSET));
  // } else{
	  // console.log("stopped ringing headset");
	  // COMMAND_STOP_RINGING_HEADSET.payload.offer = offer.from;
	  // plantronicsSocket.send(JSON.stringify(COMMAND_STOP_RINGING_HEADSET));
  // }
  
  //if (sfstate === "TIDLE") {
	  // Tell headset to ring
	  if(startRinging){
        //create call ID and contact info for incoming call
		console.log("ringing headset");
        currentCallID = new SpokesCallId({ Id: "1" });
        name = offer.from;;
        male = false;
        //send incoming call information to Hub
        spokes.Plugin.incomingCall(plugin_name, currentCallID, new SpokesContact({ Name: name }), "Unknown", "ToHeadset", function (result) {
            //fillStatus(result, false, "incomingCall");
			 if (result.isError)
			 {
				 console.log("Error in ringing headset");
			 }
        })
	  }
	  else
	  {
		  // Tell headset the incoming call is answered
		  console.log("call answered");
		  current = new SpokesCallId({ Id: "1" });
		  spokes.Plugin.answerCall(plugin_name, currentCallID, function (result) {
           if (result.isError)
			 {
				 console.log("Error in telling headset to stop ringing");
			 }
        });
	  }
    //}
}

function connectToHeadset(onOpenFcn){
////todo make this dyamic to adjust to SSL
//	var uri = 'ws://localhost:8888/plantronics';
//	plantronicsSocket = new WebSocket(uri);
//	plantronicsSocket.onopen = function (evt) {
//	    console.log("connected to Plantronics headset service");
//	    if(onOpenFcn){
//	    	    onOpenFcn();
//	    }
//	    queryHeadsetSettings();
//	};
//	plantronicsSocket.onclose = function (evt) {
//	    console.log("Plantronics headset service connection closed");
//	};
//	plantronicsSocket.onmessage = function (evt) {
//	    var pltMessage = JSON.parse(evt.data);
//	    processPLTMessage(pltMessage);
//	};
//	plantronicsSocket.onerror = function (evt) {
//	    console.log("error connecting to headset service");
//	    plantronicsSocket = null;
   //	};
   //yes means you are registering, no means no
   var yes = true;
   if (yes) {
      spokes.Plugin.register(plugin_name, function (result) {
        // fillStatus(result, false, "Register Plugin");
         //check to make sure plugin is active, otherwise no call control
         if (result.isError && result.Err.Description !== "Plugin exists")
            return;
         spokes.Plugin.isActive(plugin_name, true, function (result) {
           // fillStatus(result, false, "Is Active");
            if (result.isError)
               return;
		   console.log("connected to Plantronics headset service");
				if(onOpenFcn){
					onOpenFcn();
				}
            //you must set client as default plugin to receive device dialed call requests
            spokes.UserPreference.setDefaultSoftphone(plugin_name, function (result) {
              // fillStatus(result, false, "Default Plugin")
               if (result.isError)
                  return;
               //all is well, move to IDLE state
            softphone_state(SessionCallState.CallIdle);
            });
         });
      });
      //Get device info (verifying attached device) and display in UI
      spokes.Device.deviceInfo(function (result) {
        // fillStatus(result, false, "GetDeviceInfo")
         if (result.isError) {
            alert("No Supported Device Connected.  Please attach a supported device and re-register");
            return;
         }
         //displayDeviceInfo(result);
      });

   }
}

function softphone_state(event) {
    switch (event) {
        // case INIT_STATE:
            // sfstate = "TINIT";
      // //      handleUIDisplay("init");
            // break;
        case SessionCallState.CallIdle:
            //put your call idle handler here
            sfstate = "TIDLE";
     //       handleUIDisplay("clearpad");
    //        handleUIDisplay("unmute");
     //       handleUIDisplay("resume");
            break;
        case SessionCallState.CallEnded:
            //put your end call handler here
            sfstate = "TIDLE";
      //      handleUIAudio("stop");
            break;
        case SessionCallState.CallRinging:
            //put your call ringing handler here
            sfstate = "TRING";
      //      handleUIAudio("ringtone");
            break;
        case CALL_REQUEST:
            //put your call request handler here
            sfstate = "TDCALL";
          //  handleUIAudio("ringtone");
            break;
        case SessionCallState.RejectCall:
            //put your reject call handler here
            sfstate = "TIDLE";
          //  reject_call_function();
          //  handleUIAudio("stop");
            break;
        case SessionCallState.CallInProgress:
            //put your call in progress handler here
            sfstate = "TACTIVE";
            //handleUIAudio("play");
            break;
        case SessionCallState.AcceptCall:
            //put your accept call handler here
           sfstate = "TACTIVE";
            $("#incomingCall").modal("hide");
            ringHeadset(false, offer_global);
            acceptCall(offer_global);
            break;
        case SessionCallState.HoldCall:
            //put your hold call handler here
            sfstate = "THOLD";
          //  handleUIDisplay("hold");
          //  handleUIAudio("stop");
            break;
        case SessionCallState.Resumecall:
            //put your resume call handler here
            sfstate = "TACTIVE";
            handleUIDisplay("resume");
        //    handleUIAudio("play");
            break;
        case SessionCallState.MuteON:
            //put your mute handler here
      //      handleUIDisplay("mute");
            break;
        case SessionCallState.MuteOFF:
            //put your unmute handler here
    //        handleUIDisplay("unmute");
            break;
        case SessionCallState.TerminateCall:
            //put your terminate call handler here
           sfstate = "TIDLE";
           var params = {
              fromHeadset: true,
              remoteTerm: false
           };
           endCall(params);
  //          handleUIAudio("stop");
            break;
        default:
            break;
    }
    //update the UI state
//    highlight(sfstate);
}

function getPlantronicsHeadset(){
	return plantronicsHeadset;	
}

function queryHeadsetSettings(){
  if(plantronicsSocket == null){
    return;
  }
  plantronicsSocket.send(JSON.stringify(SETTING_DEVICE_INFO));
  
}

function queryHeadsetOwner() {
  if(plantronicsSocket == null){
    return;
  }
  plantronicsSocket.send(JSON.stringify(SETTING_USERNAME));
}

function parsePLTMessage(result, toJson, funcName) {
      //This is a handler for command results
      if (result.isError != null && result.isError) {
         //displayError(result);
      }
      else if (toJson) { //the result of the command is an object and needs to be stringified
         if (result.Result.length === 'undefined' || result.Result.length === null)
            thelen = 0;
         else thelen = result.Result.length;
         if (thelen > 0) {
            //display the event on UI
            //displayJSON(result);
            //send events to the event handler, parsing them by action
            for (i = 0; i < thelen; i++) {
               if (funcName === "CallEvents")
                  myresult = result.Result[i].Action;
               else
                  if (funcName === "CallRequest") {
                     myresult = CALL_REQUEST;
                     male = false;
                   //  dialNumber("Sally Request", result.Result[i].Phone)
                  }
               softphone_state(myresult);//the event handler
            }
         }
      }
      else { //This is a command that returns a boolean
        // displayCommandResult(funcName, result)
      }
   }

function processPLTMessage(msg) {
	//Process message from context server. If relevant to RTC server, call applicable methods.
	var messageType = msg.type;
	if ("setting" == messageType) {
	    console.log("Plantronics device settings received");
	    if(msg.id == SETTING_USERNAME.id) {
              document.getElementById('username').value = msg.payload.username;
	    }
	    else if(msg.id == SETTING_DEVICE_INFO.id){
	      plantronicsHeadset = msg.payload.device;
	    }
	} else if ("event" == messageType) {
	    if (msg.id == EVENT_ACCEPT_CALL.id) {
		      console.log("Plantronics headset has accepted the call");
		      $("#incomingCall").modal("hide");
		      //Assumes offer is being resent from the Headset service
		      acceptCall(msg.payload.offer);
	    } else if (msg.id == EVENT_CALL_TERMINATE.id) {
		      console.log("Plantronics headset is no longer on the call");
		      var params = {
                          fromHeadset: true,
                          remoteTerm : true
                          };
		      endCall(params);
	    } else if(msg.id == EVENT_BUTTON_PRESS.id) {
		      console.log("Plantronics headset button pressed" +  msg.payload.buttonName);
	    } else if(msg.id == EVENT_WEAR_STATE_CHANGED.id){
	    	      var status = "";
	    	      if(msg.payload.worn == "true") {
		        console.log("Plantronics headset worn");
		        status = " - Available (Headset On)";
		      } else {
		        console.log("Plantronics headset not worn");
		        status = " - Available (Headset Off)"
		      }
		      console.log("sending wearstate update");
		      jQuery.post("wearstate", {wearstate: status, user: document.getElementById("user").innerHTML});

	    } else if(msg.id ==  EVENT_PROXIMITY.id) {
	    	  if(msg.payload.proximity == "near") {
		        console.log("Plantronics headset is near");
		      } else {
		        console.log("Plantronics headset is far");
		      }
	    }
	    else{
	    	    console.log("Unknown event recieved: " + msg.id);
	    }
	}
}
